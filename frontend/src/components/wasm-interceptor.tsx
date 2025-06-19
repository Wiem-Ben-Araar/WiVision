"use client"

import { useEffect } from "react"

export function WasmInterceptor() {
  useEffect(() => {
    // Sauvegarder la fonction fetch originale
    const originalFetch = window.fetch

    // Intercepter toutes les requêtes fetch
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url

      // Rediriger les requêtes WASM avec version compatible
      if (url.includes(".wasm")) {
        const filename = url.split("/").pop()

        // Utiliser une version stable et compatible
        const newUrl = `https://unpkg.com/web-ifc@0.0.44/${filename}`

        console.log(`🔄 [WASM-INTERCEPT] ${url} -> ${newUrl}`)

        // Headers optimisés pour WASM
        const newInit = {
          ...init,
          headers: {
            ...init?.headers,
            "Cache-Control": "no-cache",
            Accept: "application/wasm,*/*",
            "Content-Type": "application/wasm",
          },
          mode: "cors" as RequestMode,
          credentials: "omit" as RequestCredentials,
        }

        return originalFetch.call(this, newUrl, newInit)
      }

      // Requête normale
      return originalFetch.call(this, input, init)
    }

    // Cleanup au démontage
    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
