"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { IFCLoader } from "web-ifc-three/IFCLoader"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Home } from "lucide-react"
import { useRouter } from "next/navigation"

interface IFCViewerProps {
  files: string[]
  projectId: string
}

export function IFCViewer({ files, projectId }: IFCViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null!)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<any>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState("Initialisation...")
  const [loadedModels, setLoadedModels] = useState<THREE.Object3D[]>([])
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    const initViewer = async () => {
      if (!containerRef.current) return

      try {
        console.log("🚀 [IFC-ALTERNATIVE] Initialisation avec web-ifc-three...")
        setLoadingStatus("Création de la scène 3D...")

        // Créer la scène
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf5f5f5)
        sceneRef.current = scene

        // Créer la caméra
        const camera = new THREE.PerspectiveCamera(
          75,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          1000,
        )
        camera.position.set(10, 10, 10)
        cameraRef.current = camera

        // Créer le renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        containerRef.current.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // Éclairage
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(10, 10, 10)
        directionalLight.castShadow = true
        scene.add(ambientLight, directionalLight)

        // Contrôles de caméra (OrbitControls)
        const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js")
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.25
        controlsRef.current = controls

        // Chargement des fichiers IFC
        if (files.length > 0) {
          setLoadingStatus("Chargement des fichiers IFC...")
          const loader = new IFCLoader()

          // Configuration du chemin WASM
          await loader.ifcManager.setWasmPath("/wasm/")

          const models: THREE.Object3D[] = []

          for (let i = 0; i < files.length; i++) {
            const url = files[i]
            const fileName =
              url
                .split("/")
                .pop()
                ?.replace(/\.ifc$/, "") || `Modèle-${i}`

            setLoadingStatus(`Chargement: ${fileName} (${i + 1}/${files.length})`)
            console.log(`📄 [IFC-ALTERNATIVE] Chargement: ${fileName}`)

            try {
              const model = await new Promise<THREE.Object3D>((resolve, reject) => {
                loader.load(
                  url,
                  (geometry) => {
                    console.log(`✅ [IFC-ALTERNATIVE] Modèle chargé: ${fileName}`)
                    resolve(geometry)
                  },
                  (progress) => {
                    console.log(`📊 [IFC-ALTERNATIVE] Progression: ${(progress.loaded / progress.total) * 100}%`)
                  },
                  (error) => {
                    console.error(`❌ [IFC-ALTERNATIVE] Erreur: ${fileName}`, error)
                    reject(error)
                  },
                )
              })

              scene.add(model)
              models.push(model)
            } catch (loadError) {
              console.error(`❌ [IFC-ALTERNATIVE] Échec du chargement: ${fileName}`, loadError)
            }
          }

          setLoadedModels(models)

          // Ajuster la caméra pour voir tous les modèles
          if (models.length > 0) {
            setLoadingStatus("Configuration de la vue...")
            const box = new THREE.Box3()
            models.forEach((model) => box.expandByObject(model))

            if (!box.isEmpty()) {
              const center = box.getCenter(new THREE.Vector3())
              const size = box.getSize(new THREE.Vector3())
              const maxDim = Math.max(size.x, size.y, size.z)

              camera.position.set(center.x + maxDim, center.y + maxDim, center.z + maxDim)
              controls.target.copy(center)
              controls.update()
            }
          }
        }

        // Boucle de rendu
        const animate = () => {
          requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        // Gestion du redimensionnement
        const handleResize = () => {
          if (!containerRef.current || !camera || !renderer) return
          camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
          camera.updateProjectionMatrix()
          renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
        }
        window.addEventListener("resize", handleResize)

        setIsLoading(false)
        setLoadingStatus("Terminé")
        console.log("✅ [IFC-ALTERNATIVE] Visualiseur initialisé avec succès!")

        return () => {
          window.removeEventListener("resize", handleResize)
        }
      } catch (initError) {
        console.error("❌ [IFC-ALTERNATIVE] Erreur d'initialisation:", initError)
        setError(initError instanceof Error ? initError.message : "Erreur inconnue")
        setIsLoading(false)
      }
    }

    initViewer()

    return () => {
      // Nettoyage
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
    }
  }, [files])

  const handleGoBack = () => {
    router.back()
  }

  const handleIsoView = () => {
    if (!cameraRef.current || !controlsRef.current || loadedModels.length === 0) return

    const box = new THREE.Box3()
    loadedModels.forEach((model) => box.expandByObject(model))

    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)

      cameraRef.current.position.set(center.x + maxDim * 0.7, center.y + maxDim * 0.7, center.z + maxDim * 0.7)
      controlsRef.current.target.copy(center)
      controlsRef.current.update()
    }
  }

  return (
    <div className="flex h-screen pt-20">
      {/* Barre latérale */}
      <div className="w-16 bg-white shadow-lg flex flex-col items-center py-4 gap-4 border-r">
        <Button variant="ghost" size="sm" onClick={handleGoBack} className="w-full flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Zone principale */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0 bg-gray-50" />

        <div className="absolute top-4 right-4 z-20">
          <Button variant="outline" size="sm" onClick={handleIsoView} className="bg-white/90 backdrop-blur">
            <Home className="h-5 w-5" />
          </Button>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-30">
            <div className="text-center max-w-md">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#005CA9] mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold mb-2">Chargement du visualiseur IFC</h3>
              <p className="text-gray-600 mb-4">{loadingStatus}</p>
              <div className="bg-gray-200 rounded-full h-2 w-full">
                <div
                  className="bg-[#005CA9] h-2 rounded-full transition-all duration-300"
                  style={{ width: isLoading ? "75%" : "100%" }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Architecture: web-ifc-three (stable)</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute bottom-4 left-4 bg-red-50 border border-red-200 rounded-lg p-4 z-10">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loadedModels.length > 0 && !isLoading && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur p-3 rounded-lg shadow-md z-20">
            <p className="text-sm font-medium text-[#005CA9]">✅ {loadedModels.length} modèle(s) chargé(s)</p>
            <p className="text-xs text-gray-500">Architecture: web-ifc-three</p>
          </div>
        )}
      </div>
    </div>
  )
}
