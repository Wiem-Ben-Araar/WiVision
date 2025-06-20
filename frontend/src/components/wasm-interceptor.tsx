"use client"

import { useEffect } from "react"

export function WasmInterceptor() {
  useEffect(() => {
    console.log("🔧 [WASM-INTERCEPTOR] Initialisation de l'intercepteur ultime...")

    // Sauvegarder les fonctions originales
    const originalFetch = window.fetch
    const originalWebAssemblyInstantiate = WebAssembly.instantiate

    // Intercepteur fetch amélioré
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url

      if (url.includes("web-ifc") && url.includes(".wasm")) {
        const newUrl = "/wasm/web-ifc.wasm"
        console.log(`🔄 [WASM-INTERCEPT] ${url} -> ${newUrl}`)

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
              console.log(`✅ [WASM-DEBUG] Fichier WASM chargé:`, {
                size: arrayBuffer.byteLength,
                url: newUrl,
              })

              return new Response(arrayBuffer, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              })
            }
            throw new Error(`Échec du chargement WASM: ${response.status}`)
          })
      }

      return originalFetch.call(this, input, init)
    }

    // Override WebAssembly.instantiate avec imports complets
    WebAssembly.instantiate = function (
      this: any,
      bytes: BufferSource | WebAssembly.Module,
      importObject?: WebAssembly.Imports,
    ): Promise<WebAssembly.WebAssemblyInstantiatedSource | WebAssembly.Instance> {
      // Imports complets pour web-ifc
      const completeImports: WebAssembly.Imports = {
        env: {
          memory: new WebAssembly.Memory({ initial: 256, maximum: 65536 }),
          __memory_base: 0,
          __table_base: 0,
          table: new WebAssembly.Table({ initial: 0, element: "anyfunc" }),

          // Fonctions C++ runtime
          _ZdlPv: () => {}, // delete
          _Znwj: (size: number) => 0, // new
          _Znwm: (size: number) => 0, // new (64-bit)

          // Fonctions mathématiques
          cos: Math.cos,
          sin: Math.sin,
          exp: Math.exp,
          log: Math.log,
          sqrt: Math.sqrt,
          floor: Math.floor,
          ceil: Math.ceil,
          fabs: Math.abs,
          pow: Math.pow,
          atan2: Math.atan2,

          // Fonctions mémoire
          memset: () => 0,
          memcpy: () => 0,
          memmove: () => 0,
          malloc: (size: number) => 0,
          free: () => {},

          // Fonctions standard
          printf: () => 0,
          puts: () => 0,
          abort: () => {
            console.error("[WASM] Abort appelé")
          },

          // Emscripten spécifique
          emscripten_memcpy_big: () => 0,
          emscripten_resize_heap: () => 0,
          emscripten_get_heap_size: () => 16777216,

          // Fonctions I/O
          fd_write: () => 0,
          fd_close: () => 0,
          fd_seek: () => 0,
          proc_exit: () => {},

          // Fonctions de temps
          clock_time_get: () => 0,

          // Fonctions spécifiques web-ifc
          __cxa_allocate_exception: () => 0,
          __cxa_throw: () => {},
          __gxx_personality_v0: () => 0,

          // Fonctions de debug
          __assert_fail: () => {
            console.error("[WASM] Assertion failed")
          },
        },
        wasi_snapshot_preview1: {
          fd_write: () => 0,
          fd_close: () => 0,
          fd_seek: () => 0,
          proc_exit: () => {},
          clock_time_get: () => 0,
          random_get: () => 0,
        },
      }

      // Fusionner avec les imports fournis
      const mergedImports = importObject
        ? {
            ...completeImports,
            ...importObject,
            env: {
              ...completeImports.env,
              ...(importObject.env || {}),
            },
          }
        : completeImports

      console.log(`🔧 [WASM-DEBUG] Instantiation avec imports complets`)

      if (bytes instanceof WebAssembly.Module) {
        return originalWebAssemblyInstantiate
          .call(this, bytes, mergedImports)
          .then((instance: WebAssembly.Instance) => {
            console.log(`✅ [WASM-DEBUG] Module instantié avec succès`)
            console.log(`🔍 [WASM-DEBUG] Exports:`, Object.keys(instance.exports).slice(0, 10))
            return instance
          })
          .catch((error) => {
            console.error(`❌ [WASM-DEBUG] Erreur instantiation:`, error)
            throw error
          })
      } else {
        return (
          originalWebAssemblyInstantiate as (
            bytes: BufferSource,
            importObject?: WebAssembly.Imports,
          ) => Promise<WebAssembly.WebAssemblyInstantiatedSource>
        )
          .call(this, bytes, mergedImports)
          .then((result: WebAssembly.WebAssemblyInstantiatedSource) => {
            console.log(`✅ [WASM-DEBUG] Module instantié avec succès`)
            console.log(`🔍 [WASM-DEBUG] Exports:`, Object.keys(result.instance.exports).slice(0, 10))
            return result
          })
          .catch((error) => {
            console.error(`❌ [WASM-DEBUG] Erreur instantiation:`, error)
            throw error
          })
      }
    } as typeof WebAssembly.instantiate

    console.log("✅ [WASM-INTERCEPTOR] Intercepteur ultime activé")

    return () => {
      window.fetch = originalFetch
      WebAssembly.instantiate = originalWebAssemblyInstantiate
      console.log("🧹 [WASM-INTERCEPTOR] Intercepteur désactivé")
    }
  }, [])

  return null
}
