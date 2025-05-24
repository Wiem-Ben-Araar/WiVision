'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { CrosshairIcon, Loader2, FileIcon, DownloadIcon } from 'lucide-react';
import ClashConfigModal from '@/components/ClashConfigModal';
import { ClashReport } from '@/components/ClashReport';

// URL de base du serveur Flask
const API_BASE_URL = 'http://localhost:5001'; // IMPORTANT: Ajustez ce port à celui de votre serveur Flask

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

export default function ClashButton({ loadedModels }: { loadedModels: any[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ClashResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState('');

  const handleDetect = async (config: { modelUrls: string[]; tolerance: number }) => {
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

      setPollingStatus('Envoi des modèles au serveur...');
      
      // Utiliser l'URL complète avec le bon port du serveur Flask
      const { data } = await axios.post<{ session_id: string }>(`${API_BASE_URL}/api/clash/detect`, formData);
      
      setSessionId(data.session_id);
      
      // Polling pour les résultats
      setPollingStatus('Analyse des clashs en cours...');
      const result = await pollResults(data.session_id);
      setResults(result.clashes);
      setModalOpen(false);
    } catch (err) {
      console.error('Détail de l\'erreur:', err);
      if (axios.isAxiosError(err)) {
        setError(`Erreur de connexion: ${err.message}. Vérifiez que le serveur Flask fonctionne sur le port correct.`);
      } else {
        setError('Erreur lors de la détection des clashs');
      }
    } finally {
      setLoading(false);
      setPollingStatus('');
    }
  };

  const pollResults = async (sessionId: string): Promise<any> => {
    const MAX_ATTEMPTS = 120; // 6 minutes maximum (à 3s par intervalle)
    const DELAY = 3000;
  
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      try {
        setPollingStatus(`Analyse en cours... ${Math.round((i/MAX_ATTEMPTS) * 100)}%`);
        
        // Utiliser l'URL correcte avec le port du serveur Flask
        const { data } = await axios.get(`${API_BASE_URL}/api/status/${sessionId}`);
        
        if (data.status === 'failed') {
          throw new Error(data.error || 'Erreur serveur');
        }
        
        if (data.status === 'completed') {
          setPollingStatus('Récupération du rapport...');
          // Utiliser l'URL correcte pour le rapport
          const reportRes = await axios.get(`${API_BASE_URL}/api/report/${sessionId}`);
          return reportRes.data;
        }
        
        await new Promise(resolve => setTimeout(resolve, DELAY));
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          // Si le rapport n'est pas encore prêt, continuez à attendre
          await new Promise(resolve => setTimeout(resolve, DELAY));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Délai dépassé pour la détection des clashs');
  };
  
  const openHtmlReport = () => {
    if (sessionId) {
      window.open(`${API_BASE_URL}/api/report/html/${sessionId}`, '_blank');
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setModalOpen(true)}
        disabled={loadedModels.length < 2 || loading}
        title="Détection de clash"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CrosshairIcon className="h-5 w-5" />
        )}
      </Button>

      <ClashConfigModal
        models={loadedModels}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          setError(null);
        }}
        onDetect={handleDetect}
      />

      {loading && pollingStatus && (
        <div className="fixed top-4 right-4 bg-blue-100 text-blue-800 p-4 rounded-lg shadow-lg z-50">
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>{pollingStatus}</span>
          </div>
        </div>
      )}

      {results && (
        <>
          <ClashReport 
            data={results} 
            onClose={() => setResults(null)}
          />
          {sessionId && (
            <div className="fixed bottom-16 right-4 bg-blue-100 p-2 rounded-md shadow-md">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={openHtmlReport} 
                className="flex items-center gap-2 text-blue-700"
              >
                <FileIcon className="h-4 w-4" />
                Voir rapport HTML
              </Button>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 text-red-700 p-4 rounded-lg shadow-lg z-50">
          {error}
          <button 
            className="ml-4 text-red-700 hover:text-red-900"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}