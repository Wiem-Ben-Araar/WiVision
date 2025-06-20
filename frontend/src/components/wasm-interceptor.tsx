"use client"

import { useEffect } from "react"

export function WasmInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch

    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url

      if (url.includes("web-ifc") && url.includes(".wasm")) {
        const newUrl = "/wasm/web-ifc.wasm"
        console.log(`🔄 [WASM-INTERCEPT] ${url} -> ${newUrl}`)

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

        // Intercepter la réponse pour déboguer
        return originalFetch.call(this, newUrl, newInit).then(async (response) => {
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer()
            console.log(`✅ [WASM-DEBUG] Fichier WASM chargé:`, {
              size: arrayBuffer.byteLength,
              url: newUrl
            })

            // Essayer d'instancier le module pour voir les fonctions disponibles
            try {
              const module = await WebAssembly.instantiate(arrayBuffer)
              console.log(`🔍 [WASM-DEBUG] Fonctions exportées:`, Object.keys(module.instance.exports))
            } catch (e) {
              console.error(`❌ [WASM-DEBUG] Erreur instantiation:`, e)
            }

            // Retourner une nouvelle Response avec le même contenu
            return new Response(arrayBuffer, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            })
          }
          return response
        })
      }

      return originalFetch.call(this, input, init)
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}