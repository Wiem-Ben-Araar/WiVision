"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { IFCLoader } from "web-ifc-three/IFCLoader"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RotateCw, Home, AlertCircle } from "lucide-react"

export default function IFCViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null)
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null)
  const [controls, setControls] = useState<OrbitControls | null>(null)
  const [isAutoRotating, setIsAutoRotating] = useState(false)
  const [wasmStatus, setWasmStatus] = useState<string>("Initialisation...")
  const [error, setError] = useState<string | null>(null)
  const animationFrameId = useRef<number | null>(null)

  useEffect(() => {
    const initViewer = async () => {
      const currentContainer = containerRef.current

      if (!currentContainer) return

      try {
        console.log("🚀 Initialisation du viewer IFC...")
        setWasmStatus("Vérification des chemins WASM...")

        // 🔍 DEBUGGING: Tester tous les chemins WASM possibles
        const wasmPaths = [
          "/wasm/web-ifc.wasm",
          "/_next/static/chunks/wasm/web-ifc.wasm",
          "/_next/static/chunks/app/viewer/wasm/web-ifc.wasm",
          "/viewer/wasm/web-ifc.wasm",
        ]

        console.log("🔍 Test des chemins WASM disponibles:")
        let workingPath = null

        for (const path of wasmPaths) {
          try {
            console.log(`   Tentative: ${path}`)
            const response = await fetch(path, { method: "HEAD" })
            if (response.ok) {
              console.log(`   ✅ TROUVÉ: ${path}`)
              workingPath = path
              break
            } else {
              console.log(`   ❌ 404: ${path}`)
            }
          } catch (e) {
            console.log(`   ❌ ERREUR: ${path}`)
          }
        }

        if (!workingPath) {
          throw new Error("Aucun fichier WASM accessible trouvé")
        }

        setWasmStatus(`WASM trouvé: ${workingPath}`)

        // Scene setup
        console.log("🎬 Configuration de la scène...")
        const newScene = new THREE.Scene()
        newScene.background = new THREE.Color(0xf0f0f0)

        // Camera setup
        const newCamera = new THREE.PerspectiveCamera(
          75,
          currentContainer.clientWidth / currentContainer.clientHeight,
          0.1,
          1000,
        )
        newCamera.position.set(5, 5, 5)

        // Renderer setup
        const newRenderer = new THREE.WebGLRenderer({ antialias: true })
        newRenderer.setSize(currentContainer.clientWidth, currentContainer.clientHeight)
        newRenderer.setPixelRatio(window.devicePixelRatio)
        currentContainer.appendChild(newRenderer.domElement)

        // Controls setup
        const newControls = new OrbitControls(newCamera, newRenderer.domElement)
        newControls.enableDamping = true
        newControls.dampingFactor = 0.05

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.set(5, 10, 7.5)
        newScene.add(ambientLight, directionalLight)

        // Grid helper
        const grid = new THREE.GridHelper(50, 50)
        newScene.add(grid)

        // 🔧 IFC Loader setup avec debugging avancé
        console.log("🔧 Configuration de l'IFC Loader...")
        setWasmStatus("Configuration IFC Loader...")

        const newIfcLoader = new IFCLoader()

        // 🎯 SOLUTION: Essayer plusieurs configurations WASM
        const wasmConfigs = [
          "/wasm/", // Chemin absolu standard
          `${window.location.origin}/wasm/`, // URL complète
          workingPath.replace("web-ifc.wasm", ""), // Chemin basé sur le fichier trouvé
        ]

        let wasmConfigured = false

        for (const wasmPath of wasmConfigs) {
          try {
            console.log(`🔧 Tentative de configuration WASM: ${wasmPath}`)
            await newIfcLoader.ifcManager.setWasmPath(wasmPath)
            console.log(`✅ WASM configuré avec succès: ${wasmPath}`)
            setWasmStatus(`WASM configuré: ${wasmPath}`)
            wasmConfigured = true
            break
          } catch (wasmError) {
            console.log(`❌ Échec configuration WASM: ${wasmPath}`, wasmError)
          }
        }

        if (!wasmConfigured) {
          console.warn("⚠️ Aucune configuration WASM réussie, continuons sans IFC...")
          setWasmStatus("WASM non configuré - Viewer basique actif")
        }

        setCamera(newCamera)
        setRenderer(newRenderer)
        setControls(newControls)

        // Animation loop
        const animate = () => {
          animationFrameId.current = requestAnimationFrame(animate)
          newControls.update()
          newRenderer.render(newScene, newCamera)
        }
        animate()

        console.log("✅ Viewer IFC initialisé avec succès!")
        setWasmStatus("Viewer actif")
      } catch (initError) {
        console.error("❌ Erreur d'initialisation:", initError)
        setError(initError instanceof Error ? initError.message : "Erreur inconnue")
        setWasmStatus("Erreur d'initialisation")
      }
    }

    initViewer()

    // Cleanup
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
      if (renderer && containerRef.current) {
        renderer.dispose()
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return

      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [camera, renderer])

  const toggleAutoRotate = () => {
    if (controls) {
      const newAutoRotate = !isAutoRotating
      controls.autoRotate = newAutoRotate
      controls.autoRotateSpeed = 2.0
      setIsAutoRotating(newAutoRotate)
    }
  }

  const resetCamera = () => {
    if (camera && controls) {
      camera.position.set(5, 5, 5)
      controls.target.set(0, 0, 0)
      controls.update()
    }
  }

  const zoomIn = () => {
    if (camera) {
      camera.position.multiplyScalar(0.9)
      if (controls) controls.update()
    }
  }

  const zoomOut = () => {
    if (camera) {
      camera.position.multiplyScalar(1.1)
      if (controls) controls.update()
    }
  }

  if (error) {
    return (
      <div className="relative w-full h-full min-h-[600px] bg-red-50 rounded-lg shadow-lg flex items-center justify-center">
        <div className="text-center p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Erreur du viewer</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <p className="text-xs text-gray-600">Status: {wasmStatus}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* Status WASM en haut à gauche */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1 rounded-lg shadow-md">
        <p className="text-xs text-gray-600">{wasmStatus}</p>
      </div>

      <div className="absolute left-4 top-16 z-10 flex flex-col gap-2">
        <Button variant="secondary" size="icon" onClick={zoomIn} title="Zoom avant">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={zoomOut} title="Zoom arrière">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={toggleAutoRotate}
          title="Rotation automatique"
          className={isAutoRotating ? "bg-primary text-primary-foreground" : ""}
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={resetCamera} title="Réinitialiser la vue">
          <Home className="h-4 w-4" />
        </Button>
      </div>
      <div ref={containerRef} className="w-full h-full min-h-[600px] bg-white rounded-lg shadow-lg" />
    </div>
  )
}
