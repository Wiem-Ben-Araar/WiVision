'use client';

import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { CrosshairIcon, Loader2, FileIcon, FileStack } from 'lucide-react';
import ClashConfigModal from '@/components/ClashConfigModal';
import { ClashReport } from '@/components/ClashReport';

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

interface ClashResponse {
  clashes: ClashResult[];
  status?: string;
  error?: string;
  session_id?: string;
  clash_count?: number;
  settings?: any;
  model_stats?: any;
  debug_stats?: any;
}

interface IntraClashResponse {
  clashes: ClashResult[];
  clash_count: number;
  status?: string;
  error?: string;
  session_id?: string;
  settings?: any;
  model_stats?: any;
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState('');
  const [aiMetrics, setAiMetrics] = useState<{used: boolean; accuracy?: string}>({used: false});
  const [intraResults, setIntraResults] = useState<IntraClashResponse | null>(null);
  const [intraMode, setIntraMode] = useState(false);

  const handleDetect = async (config: { 
    modelUrls: string[]; 
    tolerance: number;
    useAI: boolean;
  }) => {
    setLoading(true);
    setError(null);
    setPollingStatus('Préparation des modèles...');

    try {
      const formData = new FormData();
      const files = await Promise.all(
        config.modelUrls.map(async (url, index) => {
          setPollingStatus(`Chargement du modèle ${index + 1}/${config.modelUrls.length}...`);
          const response = await fetch(url);
          return await response.blob();
        })
      );

      files.forEach((file, index) => {
        formData.append('models', file, `model${index + 1}.ifc`);
      });
      formData.append('tolerance', config.tolerance.toString());
      formData.append('use_ai', config.useAI.toString());

      setPollingStatus('Envoi des modèles au serveur...');
      
      const { data } = await axios.post<ClashResponse>(
        `${API_BASE_URL}/api/clash/detect`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 300000 // 5 minutes
        }
      );
      
      setSessionId(data.session_id || null);
      setAiMetrics({used: config.useAI});
      
      if (data.session_id) {
        setPollingStatus('Analyse des clashs en cours...');
        const result = await pollResults(data.session_id);
        setResults(result.clashes ?? null);
        setModalOpen(false);
        
        // Ouvrir le rapport HTML si disponible
        if (data.session_id) {
          window.open(`${API_BASE_URL}/api/report/html/${data.session_id}`, '_blank');
        }
      } else if (data.clashes) {
        // Résultat immédiat
        setResults(data.clashes);
        setModalOpen(false);
      } else {
        throw new Error('Aucun résultat ou session ID dans la réponse');
      }
    } catch (err) {
      console.error('Erreur détectée:', err);
      let errorMsg = 'Erreur lors de la détection des clashs';
      
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

  const handleDetectIntra = async (config: { 
    modelUrl: string; 
    tolerance: number;
    useAI: boolean;
  }) => {
    setLoading(true);
    setError(null);
    setPollingStatus('Préparation du modèle...');

    try {
      const formData = new FormData();
      
      setPollingStatus('Téléchargement du modèle...');
      const response = await fetch(config.modelUrl);
      const fileBlob = await response.blob();
      
      // Utiliser 'file' comme nom de champ pour correspondre au backend
      formData.append('file', fileBlob, 'model.ifc');
      formData.append('tolerance', config.tolerance.toString());
      formData.append('use_ai', config.useAI.toString());
      formData.append('debug', 'false'); // Ajouter le paramètre debug

      setPollingStatus('Analyse intra-modèle en cours...');
      
      const { data } = await axios.post<IntraClashResponse>(
        `${API_BASE_URL}/api/clash/detect_intra_ultra`, 
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 300000 // 5 minutes timeout
        }
      );
      
      setSessionId(data.session_id || null);
      setAiMetrics({used: config.useAI});
      
      if (data.session_id) {
        setPollingStatus('Récupération des résultats...');
        const result = await pollResults(data.session_id);
        setIntraResults({
          clashes: result.clashes ?? [],
          clash_count: result.clash_count ?? 0,
          status: result.status,
          error: result.error,
          session_id: data.session_id
        });
        setIntraMode(true);
        setModalOpen(false);
        
        // Ouvrir le rapport HTML si disponible
        if (data.session_id) {
          window.open(`${API_BASE_URL}/api/report/html/${data.session_id}`, '_blank');
        }
      } else if (data.clashes) {
        // Résultat immédiat
        setIntraResults({
          clashes: data.clashes,
          clash_count: data.clash_count,
          status: data.status,
          session_id: undefined
        });
        setIntraMode(true);
        setModalOpen(false);
      } else {
        throw new Error('Aucun résultat dans la réponse');
      }
    } catch (err) {
      console.error('Erreur détectée:', err);
      let errorMsg = "Erreur lors de l'analyse intra-modèle";
      
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
    const MAX_ATTEMPTS = 60; // 60 tentatives (3 minutes max)
    const DELAY = 3000; // 3 secondes entre les requêtes

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const progress = Math.min(100, Math.round((attempt / MAX_ATTEMPTS) * 100));
        setPollingStatus(`Analyse en cours... ${progress}%`);
        
        const { data } = await axios.get<StatusResponse>(
          `${API_BASE_URL}/api/clash/status_ultra/${sessionId}`,
          { timeout: 10000 } // 10s timeout
        );
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (data.status === 'completed' || data.clashes || data.from_cache) {
          return data;
        }
        
        // Attendre avant la prochaine tentative
        await new Promise(resolve => setTimeout(resolve, DELAY));
        
      } catch (err) {
        if (axios.isAxiosError(err)) {
          if (err.code === 'ECONNABORTED') {
            // Timeout - continuer le polling
            continue;
          }
          if (err.response?.status === 404) {
            // Session non trouvée, attendre un peu plus
            await new Promise(resolve => setTimeout(resolve, DELAY));
            continue;
          }
        }
        
        // Pour les autres erreurs, attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, DELAY));
      }
    }
    
    throw new Error('Délai dépassé pour la détection');
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setModalOpen(true)}
        disabled={loadedModels.length < 1 || loading}
        title="Détection de clash"
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

      <ClashConfigModal
        models={loadedModels}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          setError(null);
          setIntraMode(false);
        }}
        onDetect={handleDetect}
        onDetectIntra={handleDetectIntra}
        intraMode={intraMode}
        setIntraMode={setIntraMode}
      />

      {loading && pollingStatus && (
        <div className="fixed top-4 right-4 bg-blue-100 text-blue-800 p-4 rounded-lg shadow-lg z-50 flex items-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>{pollingStatus}</span>
          {aiMetrics.used && (
            <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              IA activée
            </span>
          )}
        </div>
      )}

      {results && (
        <ClashReport 
          data={results} 
          onClose={() => setResults(null)}
          aiUsed={aiMetrics.used}
          reportTitle="Rapport de Clashs Inter-Modèles"
          reportSubtitle={`${results.length} conflits détectés`}
        />
      )}

      {intraResults && (
        <ClashReport 
          data={intraResults.clashes} 
          onClose={() => setIntraResults(null)}
          aiUsed={aiMetrics.used}
          reportTitle="Détection Intra-Modèle"
          reportSubtitle={`${intraResults.clash_count} conflits détectés`}
        />
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