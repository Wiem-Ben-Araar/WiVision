// utils/ifc-config.ts
export const configureIFCLoader = async (loader: any) => {
  // Force tous les chemins possibles vers notre API
  const possiblePaths = [
    '/api/wasm/',
    '/_next/static/chunks/wasm/',
    '/_next/static/chunks/api/wasm/',
    '/wasm/',
    '/static/wasm/'
  ];

  // Essayer chaque chemin jusqu'à ce qu'un fonctionne
  for (const wasmPath of possiblePaths) {
    try {
      await loader.setWasmPath(wasmPath);
      console.log(`✅ WASM configuré avec: ${wasmPath}`);
      break;
    } catch (error) {
      console.warn(`❌ Échec avec: ${wasmPath}`, error);
      continue;
    }
  }
};