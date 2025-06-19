// components/WasmChecker.tsx
"use client";

import { useEffect } from "react";

export default function WasmChecker() {
  useEffect(() => {
    const checkWasmSupport = async () => {
      try {
        if (typeof WebAssembly === "undefined") {
          throw new Error("WebAssembly non supporté par le navigateur");
        }

        const response = await fetch("/static/wasm/web-ifc.wasm");
        if (!response.ok) throw new Error("Fichier WASM introuvable");
        
        const buffer = await response.arrayBuffer();
        const module = await WebAssembly.compile(buffer);
        const instance = await WebAssembly.instantiate(module);
        
        if (!instance) throw new Error("Échec d'instanciation WASM");
      } catch (error) {
        console.error("Erreur WASM:", error);
        alert(`Erreur WASM: ${error instanceof Error ? error.message : "Problème technique"}`);
      }
    };

    checkWasmSupport();
  }, []);

  return null;
}