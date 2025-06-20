"use client"

import { useEffect } from "react"

export function WasmInterceptor() {
  useEffect(() => {
    console.log("🔧 [WASM-COMPATIBLE] Initialisation intercepteur compatible...")

    const originalFetch = window.fetch

    // Intercepteur pour forcer la version 0.0.57 compatible
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url

      if (url.includes("web-ifc") && url.includes(".wasm")) {
        const newUrl = "/wasm/web-ifc.wasm"
        console.log(`🔄 [WASM-COMPATIBLE] ${url} -> ${newUrl} (v0.0.57)`)

        return originalFetch
          .call(this, newUrl, {
            ...init,
            headers: {
              ...init?.headers,
              "Cache-Control": "no-cache",
              Accept: "application/wasm,*/*",
            },
            mode: "cors" as RequestMode,
            credentials: "omit" as RequestCredentials,
          })
          .then(async (response) => {
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer()
              console.log(`✅ [WASM-COMPATIBLE] WASM 0.0.57 chargé:`, {
                size: arrayBuffer.byteLength,
                url: newUrl,
              })
              return new Response(arrayBuffer, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              })
            }
            throw new Error(`Échec chargement WASM: ${response.status}`)
          })
      }

      return originalFetch.call(this, input, init)
    }

    console.log("✅ [WASM-COMPATIBLE] Intercepteur v0.0.57 activé")

    return () => {
      window.fetch = originalFetch
      console.log("🧹 [WASM-COMPATIBLE] Intercepteur désactivé")
    }
  }, [])

  return null
}
