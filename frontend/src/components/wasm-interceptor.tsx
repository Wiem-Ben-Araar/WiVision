"use client"
import { useEffect } from "react"

export function WasmInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch
    const originalWebAssemblyInstantiate = WebAssembly.instantiate

    // Override fetch for WASM files
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
        
        return originalFetch.call(this, newUrl, newInit).then(async (response) => {
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer()
            console.log(`✅ [WASM-DEBUG] Fichier WASM chargé:`, {
              size: arrayBuffer.byteLength,
              url: newUrl
            })
            
            return new Response(arrayBuffer, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            })
          }
          console.error(`❌ [WASM-DEBUG] Échec du chargement WASM:`, response.status, response.statusText)
          return response
        }).catch((error) => {
          console.error(`❌ [WASM-DEBUG] Erreur réseau WASM:`, error)
          throw error
        })
      }
      
      return originalFetch.call(this, input, init)
    }

    // Override WebAssembly.instantiate to provide proper imports
    WebAssembly.instantiate = function(
      this: any,
      bytes: BufferSource | WebAssembly.Module, 
      importObject?: WebAssembly.Imports
    ): Promise<WebAssembly.WebAssemblyInstantiatedSource | WebAssembly.Instance> {
      // Provide default imports if none are provided
      const defaultImports: WebAssembly.Imports = {
        env: {
          memory: new WebAssembly.Memory({ initial: 256, maximum: 65536 }),
          __memory_base: 0,
          __table_base: 0,
          table: new WebAssembly.Table({ initial: 0, element: "anyfunc" }),
          abort: () => {
            console.error("[WASM] Abort called")
          },
          // Common C++ runtime functions
          _ZdlPv: () => {}, // delete
          _Znwj: (size: number) => 0, // new
          _Znwm: (size: number) => 0, // new (64-bit)
          // Math functions
          cos: Math.cos,
          sin: Math.sin,
          exp: Math.exp,
          log: Math.log,
          sqrt: Math.sqrt,
          floor: Math.floor,
          ceil: Math.ceil,
          fabs: Math.abs,
          // Memory functions
          memset: () => 0,
          memcpy: () => 0,
          memmove: () => 0,
          // Standard library functions
          printf: () => 0,
          puts: () => 0,
          // Emscripten-specific
          emscripten_memcpy_big: () => 0,
          emscripten_resize_heap: () => 0,
          fd_write: () => 0,
          fd_close: () => 0,
          fd_seek: () => 0,
          proc_exit: () => {},
        },
        wasi_snapshot_preview1: {
          fd_write: () => 0,
          fd_close: () => 0,
          fd_seek: () => 0,
          proc_exit: () => {},
        }
      }

      // Merge provided imports with defaults
      const mergedImports = importObject ? {
        ...defaultImports,
        ...importObject,
        env: {
          ...defaultImports.env,
          ...(importObject.env || {})
        }
      } : defaultImports

      console.log(`🔧 [WASM-DEBUG] Tentative d'instantiation avec imports:`, Object.keys(mergedImports))

      // Handle both overloads of WebAssembly.instantiate
      if (bytes instanceof WebAssembly.Module) {
        // Module overload - returns Promise<Instance>
        return originalWebAssemblyInstantiate.call(this, bytes, mergedImports)
          .then((instance: WebAssembly.Instance) => {
            console.log(`✅ [WASM-DEBUG] Module instantié avec succès`)
            console.log(`🔍 [WASM-DEBUG] Exports disponibles:`, Object.keys(instance.exports))
            return instance
          })
          .catch((error) => {
            console.error(`❌ [WASM-DEBUG] Erreur d'instantiation:`, error)
            // Try with minimal imports as fallback
            const minimalImports = {
              env: {
                memory: new WebAssembly.Memory({ initial: 256 }),
              }
            }
            console.log(`🔄 [WASM-DEBUG] Tentative avec imports minimaux...`)
            return originalWebAssemblyInstantiate.call(this, bytes, minimalImports) as Promise<WebAssembly.Instance>
          })
      } else {
        // BufferSource overload - returns Promise<WebAssemblyInstantiatedSource>
        return (originalWebAssemblyInstantiate as (
          bytes: BufferSource,
          importObject?: WebAssembly.Imports
        ) => Promise<WebAssembly.WebAssemblyInstantiatedSource>).call(this, bytes, mergedImports)
          .then((result: WebAssembly.WebAssemblyInstantiatedSource) => {
            console.log(`✅ [WASM-DEBUG] Module instantié avec succès`)
            console.log(`🔍 [WASM-DEBUG] Exports disponibles:`, Object.keys(result.instance.exports))
            return result
          })
          .catch((error) => {
            console.error(`❌ [WASM-DEBUG] Erreur d'instantiation:`, error)
            // Try with minimal imports as fallback
            const minimalImports = {
              env: {
                memory: new WebAssembly.Memory({ initial: 256 }),
              }
            }
            console.log(`🔄 [WASM-DEBUG] Tentative avec imports minimaux...`)
            return (originalWebAssemblyInstantiate as (
              bytes: BufferSource,
              importObject?: WebAssembly.Imports
            ) => Promise<WebAssembly.WebAssemblyInstantiatedSource>).call(this, bytes, minimalImports)
          })
      }
    } as typeof WebAssembly.instantiate

    // Cleanup function
    return () => {
      window.fetch = originalFetch
      WebAssembly.instantiate = originalWebAssemblyInstantiate
    }
  }, [])

  return null
}