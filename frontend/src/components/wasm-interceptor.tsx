"use client"

import { useEffect } from "react"

export function WasmInterceptor() {
  useEffect(() => {
    // Sauvegarder la fonction fetch originale
    const originalFetch = window.fetch

    // Intercepter toutes les requêtes fetch
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url

      // Rediriger les requêtes WASM
      if (url.includes(".wasm")) {
        const filename = url.split("/").pop()
        const newUrl = `/wasm/${filename}`

        console.log(`🔄 [WASM-INTERCEPT] Redirection: ${url} -> ${newUrl}`)

        return originalFetch.call(this, newUrl, init)
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
