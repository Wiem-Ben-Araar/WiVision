'use client';

import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { CrosshairIcon, Loader2, FileStack, Download } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface LoadedModel {
  id: string;
  name: string;
  url: string;
}

interface ClashResult {
  element_a: {
    name: string;
    type: string;
    guid: string;
    model: string;
  };
  element_b: {
    name: string;
    type: string;
    guid: string;
    model: string;
  };
  distance: number;
  position: number[];
  overlap_volume?: number;
}

interface ClashSettings {
  tolerance?: number;
  use_ai?: boolean;
  debug?: boolean;
  [key: string]: unknown;
}

interface ModelStats {
  elements_count?: number;
  models_processed?: number;
  processing_time?: number;
  [key: string]: unknown;
}

interface IntraClashResponse {
  clashes: ClashResult[];
  clash_count: number;
  status?: string;
  error?: string;
  session_id?: string;
  settings?: ClashSettings;
  model_stats?: ModelStats;
}

interface ApiErrorResponse {
  error?: string;
  details?: string;
}

interface StatusResponse {
  clashes?: ClashResult[];
  clash_count?: number;
  status?: string;
  error?: string;
  from_cache?: boolean;
}

export default function ClashButton({ loadedModels }: { loadedModels: LoadedModel[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ClashResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [tolerance, setTolerance] = useState(0.01);

  const handleDetect = async () => {
    if (!selectedModel) {
      setError('Sélectionnez un modèle');
      return;
    }

    const useAI = true; // Toujours activé

    setLoading(true);
    setError(null);
    setPollingStatus('Préparation du modèle...');
    setModalOpen(false);

    try {
      const formData = new FormData();
      
      setPollingStatus('Téléchargement du modèle...');
      const response = await fetch(selectedModel);
      const fileBlob = await response.blob();
      
      formData.append('file', fileBlob, 'model.ifc');
      formData.append('tolerance', tolerance.toString());
      formData.append('use_ai', useAI.toString());
      formData.append('debug', 'false');

      setPollingStatus('Analyse des conflits en cours...');
      
      const { data } = await axios.post<IntraClashResponse>(
        `${API_BASE_URL}/clash/detect_intra_ultra`, 
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 300000
        }
      );
      
      if (data.session_id) {
        setPollingStatus('Récupération des résultats...');
        const result = await pollResults(data.session_id);
        setResults(result.clashes ?? []);
      } else if (data.clashes) {
        setResults(data.clashes);
      } else {
        throw new Error('Aucun résultat dans la réponse');
      }
    } catch (err) {
      console.error('Erreur détectée:', err);
      let errorMsg = "Erreur lors de l'analyse du modèle";
      
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ApiErrorResponse>;
        if (axiosError.response?.data?.error) {
          errorMsg = axiosError.response.data.error;
          if (axiosError.response.data.details) {
            errorMsg += `: ${axiosError.response.data.details}`;
          }
        } else {
          errorMsg = `Erreur de connexion: ${axiosError.message}`;
        }
      } else if (err instanceof Error && err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
      setPollingStatus('');
    }
  };

  const pollResults = async (sessionId: string): Promise<StatusResponse> => {
    const MAX_ATTEMPTS = 60;
    const DELAY = 3000;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const progress = Math.min(100, Math.round((attempt / MAX_ATTEMPTS) * 100));
        setPollingStatus(`Analyse en cours... ${progress}%`);
        
        const { data } = await axios.get<StatusResponse>(
          `${API_BASE_URL}/clash/status_ultra/${sessionId}`,
          { timeout: 10000 }
        );
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (data.status === 'completed' || data.clashes || data.from_cache) {
          return data;
        }
        
        await new Promise(resolve => setTimeout(resolve, DELAY));
        
      } catch (err) {
        if (axios.isAxiosError(err)) {
          if (err.code === 'ECONNABORTED') {
            continue;
          }
          if (err.response?.status === 404) {
            await new Promise(resolve => setTimeout(resolve, DELAY));
            continue;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, DELAY));
      }
    }
    
    throw new Error('Délai dépassé pour la détection');
  };

  const downloadReport = () => {
    if (!results) return;
    
    const reportData = {
      date: new Date().toISOString(),
      clash_count: results.length,
      tolerance: tolerance,
      clashes: results.map((clash, index) => ({
        id: index + 1,
        element_a: clash.element_a,
        element_b: clash.element_b,
        distance: clash.distance,
        position: clash.position,
        overlap_volume: clash.overlap_volume
      }))
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-conflits-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCancel = () => {
    setModalOpen(false);
    setSelectedModel('');
    setTolerance(0.01);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setModalOpen(true)}
        disabled={loadedModels.length === 0 || loading}
        title="Détecter les conflits"
        className="relative group"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <div className="relative">
            <CrosshairIcon className="h-5 w-5" />
            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[8px] rounded-full h-4 w-4 flex items-center justify-center">
              <FileStack className="h-3 w-3" />
            </div>
          </div>
        )}
      </Button>

      {/* Modal de sélection */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Détection des Conflits</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Modèle à analyser</label>
                  <select 
                    value={selectedModel} 
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Sélectionnez un modèle</option>
                    {loadedModels.map((model) => (
                      <option key={model.id} value={model.url}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Tolérance (mètres)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Valeur recommandée: 0.005 - 0.02 m</p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button 
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button 
                  onClick={handleDetect}
                  disabled={!selectedModel}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <CrosshairIcon className="h-4 w-4 mr-2" />
                  Analyser
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && pollingStatus && (
        <div className="fixed top-4 right-4 bg-blue-100 text-blue-800 p-4 rounded-lg shadow-lg z-50 flex items-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>{pollingStatus}</span>
        </div>
      )}

      {results && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
          <div className="fixed right-0 top-0 h-screen w-full max-w-4xl bg-white shadow-lg overflow-auto">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold">Détection des Conflits</h1>
                  <p className="text-gray-600 mt-1">{results.length} conflits détectés</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={downloadReport}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger le rapport
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setResults(null)}>
                    <span className="text-xl">&times;</span>
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-4">
                {results.map((clash, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-white">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded bg-green-50 border border-green-200">
                        <h3 className="font-semibold text-green-700 mb-2">Élément A</h3>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">Type:</span> {clash.element_a.type}</p>
                          <p><span className="font-medium">Nom:</span> {clash.element_a.name}</p>
                          <p><span className="font-medium">GUID:</span> {clash.element_a.guid}</p>
                        </div>
                      </div>
                      
                      <div className="p-4 rounded bg-red-50 border border-red-200">
                        <h3 className="font-semibold text-red-700 mb-2">Élément B</h3>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">Type:</span> {clash.element_b.type}</p>
                          <p><span className="font-medium">Nom:</span> {clash.element_b.name}</p>
                          <p><span className="font-medium">GUID:</span> {clash.element_b.guid}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Distance:</span> {clash.distance.toFixed(3)} m
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Position:</span>
                        {clash.position.map((coord, i) => (
                          <span key={i} className="ml-2">
                            {['X', 'Y', 'Z'][i]}: {coord.toFixed(3)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 text-red-700 p-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex justify-between items-start">
            <div>
              <strong className="font-medium">Erreur de détection</strong>
              <p className="mt-1 text-sm">{error}</p>
            </div>
            <button 
              className="ml-4 text-red-700 hover:text-red-900 text-lg"
              onClick={() => setError(null)}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}