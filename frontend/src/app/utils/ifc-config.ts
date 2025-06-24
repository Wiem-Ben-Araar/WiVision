interface IFCLoader {
  setWasmPath: (path: string) => Promise<void> | void;
  ifcManager?: {
    setWasmPath: (path: string) => Promise<void> | void;
    applyWebIfcConfig?: (config: Record<string, unknown>) => void;
  };
}

interface WebIFCViewer {
  IFC?: {
    setWasmPath: (path: string) => Promise<void> | void;
    loader?: IFCLoader;
  };
}

export const configureIFCLoader = async (loader: IFCLoader | WebIFCViewer): Promise<void> => {
  // Force tous les chemins possibles vers notre API
  const possiblePaths = [
    '/api/wasm/',
    '/_next/static/chunks/wasm/',
    '/_next/static/chunks/api/wasm/',
    '/wasm/',
    '/static/wasm/'
  ];

  // Déterminer le type de loader
  const isViewer = 'IFC' in loader;
  const actualLoader = isViewer ? (loader as WebIFCViewer).IFC : (loader as IFCLoader);

  if (!actualLoader) {
    throw new Error('Loader IFC non disponible');
  }

  // Essayer chaque chemin jusqu'à ce qu'un fonctionne
  for (const wasmPath of possiblePaths) {
    try {
      await actualLoader.setWasmPath(wasmPath);
      console.log(`✅ WASM configuré avec: ${wasmPath}`);
      
      // Configuration supplémentaire si disponible
      if ('ifcManager' in actualLoader && actualLoader.ifcManager?.applyWebIfcConfig) {
        actualLoader.ifcManager.applyWebIfcConfig({
          COORDINATE_TO_ORIGIN: true,
          USE_FAST_BOOLS: false,
        });
      }
      
      return; // Succès, sortir de la boucle
    } catch (error) {
      console.warn(`❌ Échec avec: ${wasmPath}`, error);
      continue;
    }
  }
  
  throw new Error('Impossible de configurer le chemin WASM');
};
