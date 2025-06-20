"use client"

import { useEffect } from "react"

export function WasmInterceptor() {
  useEffect(() => {
    // Sauvegarder la fonction fetch originale
    const originalFetch = window.fetch

    // Intercepter toutes les requêtes fetch
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url

      // Intercepter TOUTES les requêtes web-ifc et forcer la version 0.0.44
      if (url.includes("web-ifc") && url.includes(".wasm")) {
        // FORCER la version 0.0.44 qui est 100% compatible
        const newUrl = "/wasm/web-ifc.wasm"

        console.log(`🔄 [WASM-INTERCEPT] ${url} -> ${newUrl}`)

        // Headers optimisés pour WASM local
        const newInit = {
          ...init,
          headers: {
            ...init?.headers,
            "Cache-Control": "no-cache",
            Accept: "application/wasm,*/*",
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
