"use client"

import { useEffect, useRef, useState, useCallback, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { IFCLoader } from "web-ifc-three/IFCLoader"
import { ArrowLeft, Home, Eye, EyeOff, ZoomIn, ZoomOut, RotateCw, Grid3X3, Sun, Moon } from "lucide-react"

// Types
interface LoadedModel {
  id: string
  name: string
  object: THREE.Object3D
  visible: boolean
  bbox?: THREE.Box3
}

interface LoadingState {
  isLoading: boolean
  currentFile: string
  progress: number
  currentIndex: number
  totalFiles: number
}

// Composant principal unifié
function UnifiedIFCViewer() {
  // Références
  const containerRef = useRef<HTMLDivElement>(null!)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const loaderRef = useRef<IFCLoader | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // États
  const [loadedModels, setLoadedModels] = useState<LoadedModel[]>([])
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    currentFile: "",
    progress: 0,
    currentIndex: 0,
    totalFiles: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const [showModelList, setShowModelList] = useState(false)
  const [isAutoRotating, setIsAutoRotating] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Navigation
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = searchParams.get("projectId")
  const filesParam = searchParams.get("files")

  // Initialisation de la scène 3D
  useEffect(() => {
    const initScene = async () => {
      if (!containerRef.current) return

      try {
        console.log("🚀 [UNIFIED-VIEWER] Initialisation avec web-ifc-three...")

        // Créer la scène
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(isDarkMode ? 0x1a1a1a : 0xf5f5f5)
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
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        containerRef.current.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // Éclairage optimisé
        const ambientLight = new THREE.AmbientLight(0xffffff, isDarkMode ? 0.4 : 0.6)
        const directionalLight = new THREE.DirectionalLight(0xffffff, isDarkMode ? 0.6 : 0.8)
        directionalLight.position.set(10, 10, 10)
        directionalLight.castShadow = true
        directionalLight.shadow.mapSize.width = 2048
        directionalLight.shadow.mapSize.height = 2048
        scene.add(ambientLight, directionalLight)

        // Grille
        if (showGrid) {
          const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0xcccccc)
          gridHelper.name = "grid"
          scene.add(gridHelper)
        }

        // Contrôles de caméra
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.25
        controls.enableZoom = true
        controls.enablePan = true
        controls.enableRotate = true
        controls.maxDistance = 1000
        controls.minDistance = 0.1
        controlsRef.current = controls

        // Initialiser le loader IFC
        const loader = new IFCLoader()
        loaderRef.current = loader

        // Configuration WASM
        try {
          await loader.ifcManager.setWasmPath("/wasm/")
          console.log("✅ [UNIFIED-VIEWER] WASM configuré")
        } catch (wasmError) {
          console.error("❌ [UNIFIED-VIEWER] Erreur WASM:", wasmError)
          throw new Error("Configuration WASM échouée")
        }

        // Boucle d'animation
        const animate = () => {
          animationFrameRef.current = requestAnimationFrame(animate)
          controls.update()
          renderer.render(scene, camera)
        }
        animate()

        console.log("✅ [UNIFIED-VIEWER] Scène initialisée")
      } catch (initError) {
        console.error("❌ [UNIFIED-VIEWER] Erreur d'initialisation:", initError)
        setError(initError instanceof Error ? initError.message : "Erreur d'initialisation")
      }
    }

    initScene()

    return () => {
      // Nettoyage
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
    }
  }, [isDarkMode, showGrid])

  // Chargement des fichiers IFC
  useEffect(() => {
    const loadFiles = async () => {
      if (!filesParam || !loaderRef.current || !sceneRef.current) return

      try {
        const files: string[] = JSON.parse(filesParam)
        if (files.length === 0) return

        console.log(`📁 [UNIFIED-VIEWER] Chargement de ${files.length} fichiers...`)

        setLoadingState({
          isLoading: true,
          currentFile: "",
          progress: 0,
          currentIndex: 0,
          totalFiles: files.length,
        })

        const models: LoadedModel[] = []
        const loader = loaderRef.current
        const scene = sceneRef.current

        for (let i = 0; i < files.length; i++) {
          const url = files[i]
          const fileName =
            url
              .split("/")
              .pop()
              ?.replace(/\.ifc$/, "")
              .replace(/^\d+_/, "") || `Modèle-${i}`

          setLoadingState((prev) => ({
            ...prev,
            currentFile: fileName,
            currentIndex: i,
            progress: 0,
          }))

          console.log(`📄 [UNIFIED-VIEWER] Chargement: ${fileName}`)

          try {
            const model = await new Promise<THREE.Object3D>((resolve, reject) => {
              loader.load(
                url,
                (geometry) => {
                  console.log(`✅ [UNIFIED-VIEWER] Modèle chargé: ${fileName}`)
                  resolve(geometry)
                },
                (progress) => {
                  const percent = progress.total > 0 ? (progress.loaded / progress.total) * 100 : 0
                  setLoadingState((prev) => ({ ...prev, progress: percent }))
                },
                (error) => {
                  console.error(`❌ [UNIFIED-VIEWER] Erreur: ${fileName}`, error)
                  reject(error)
                },
              )
            })

            // Calculer la bounding box
            const bbox = new THREE.Box3().setFromObject(model)

            const modelData: LoadedModel = {
              id: `model-${i}`,
              name: fileName,
              object: model,
              visible: true,
              bbox,
            }

            scene.add(model)
            models.push(modelData)

            setLoadingState((prev) => ({ ...prev, progress: 100 }))
            await new Promise((resolve) => setTimeout(resolve, 200))
          } catch (loadError) {
            console.error(`❌ [UNIFIED-VIEWER] Échec: ${fileName}`, loadError)
          }
        }

        setLoadedModels(models)

        // Ajuster la caméra pour voir tous les modèles
        if (models.length > 0 && cameraRef.current && controlsRef.current) {
          const globalBbox = new THREE.Box3()
          models.forEach((model) => {
            if (model.bbox) globalBbox.union(model.bbox)
          })

          if (!globalBbox.isEmpty()) {
            const center = globalBbox.getCenter(new THREE.Vector3())
            const size = globalBbox.getSize(new THREE.Vector3())
            const maxDim = Math.max(size.x, size.y, size.z)

            // Position caméra isométrique
            cameraRef.current.position.set(center.x + maxDim * 0.7, center.y + maxDim * 0.7, center.z + maxDim * 0.7)
            controlsRef.current.target.copy(center)
            controlsRef.current.update()

            // Ajuster les limites
            controlsRef.current.maxDistance = maxDim * 5
            controlsRef.current.minDistance = maxDim * 0.01
          }
        }

        setLoadingState((prev) => ({ ...prev, isLoading: false }))
        console.log(`✅ [UNIFIED-VIEWER] ${models.length} modèles chargés`)
      } catch (parseError) {
        console.error("❌ [UNIFIED-VIEWER] Erreur parsing files:", parseError)
        setError("Erreur lors du parsing des fichiers")
        setLoadingState((prev) => ({ ...prev, isLoading: false }))
      }
    }

    loadFiles()
  }, [filesParam])

  // Gestion du redimensionnement
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return

      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(width, height)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Fonctions de contrôle
  const handleGoBack = useCallback(() => {
    router.back()
  }, [router])

  const handleIsoView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current || loadedModels.length === 0) return

    const globalBbox = new THREE.Box3()
    loadedModels.forEach((model) => {
      if (model.bbox) globalBbox.union(model.bbox)
    })

    if (!globalBbox.isEmpty()) {
      const center = globalBbox.getCenter(new THREE.Vector3())
      const size = globalBbox.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)

      cameraRef.current.position.set(center.x + maxDim * 0.7, center.y + maxDim * 0.7, center.z + maxDim * 0.7)
      controlsRef.current.target.copy(center)
      controlsRef.current.update()
    }
  }, [loadedModels])

  const toggleModelVisibility = useCallback((modelId: string) => {
    setLoadedModels((prev) =>
      prev.map((model) => {
        if (model.id === modelId) {
          model.object.visible = !model.visible
          return { ...model, visible: !model.visible }
        }
        return model
      }),
    )
  }, [])

  const toggleAutoRotate = useCallback(() => {
    if (!controlsRef.current) return
    const newAutoRotate = !isAutoRotating
    controlsRef.current.autoRotate = newAutoRotate
    controlsRef.current.autoRotateSpeed = 1.0
    setIsAutoRotating(newAutoRotate)
  }, [isAutoRotating])

  const zoomIn = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return
    const direction = new THREE.Vector3()
    direction.subVectors(controlsRef.current.target, cameraRef.current.position).normalize()
    cameraRef.current.position.addScaledVector(direction, 2)
    controlsRef.current.update()
  }, [])

  const zoomOut = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return
    const direction = new THREE.Vector3()
    direction.subVectors(controlsRef.current.target, cameraRef.current.position).normalize()
    cameraRef.current.position.addScaledVector(direction, -2)
    controlsRef.current.update()
  }, [])

  const toggleGrid = useCallback(() => {
    if (!sceneRef.current) return
    const grid = sceneRef.current.getObjectByName("grid")
    if (grid) {
      grid.visible = !showGrid
      setShowGrid(!showGrid)
    }
  }, [showGrid])

  const toggleDarkMode = useCallback(() => {
    if (!sceneRef.current) return
    const newDarkMode = !isDarkMode
    sceneRef.current.background = new THREE.Color(newDarkMode ? 0x1a1a1a : 0xf5f5f5)
    setIsDarkMode(newDarkMode)
  }, [isDarkMode])

  // Vérification du projectId
  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertDescription>Project ID manquant</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex h-screen pt-20">
      {/* Barre latérale gauche */}
      <div className="w-16 bg-white shadow-lg flex flex-col items-center py-4 gap-4 border-r">
        <Button variant="ghost" size="sm" onClick={handleGoBack} className="w-full flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Button
          variant={showModelList ? "default" : "ghost"}
          size="icon"
          onClick={() => setShowModelList(!showModelList)}
          title="Liste des modèles"
        >
          <Eye className="h-5 w-5" />
        </Button>

        <div className="border-t border-gray-200 w-full my-2" />

        <Button variant="ghost" size="icon" onClick={zoomIn} title="Zoom avant">
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={zoomOut} title="Zoom arrière">
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Button
          variant={isAutoRotating ? "default" : "ghost"}
          size="icon"
          onClick={toggleAutoRotate}
          title="Rotation automatique"
        >
          <RotateCw className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleGrid} title="Grille">
          <Grid3X3 className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleDarkMode} title="Mode sombre">
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Zone principale */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0 bg-gray-50" />

        {/* Bouton vue isométrique */}
        <div className="absolute top-4 right-4 z-20">
          <Button variant="outline" size="sm" onClick={handleIsoView} className="bg-white/90 backdrop-blur">
            <Home className="h-5 w-5" />
          </Button>
        </div>

        {/* Liste des modèles */}
        {showModelList && loadedModels.length > 0 && (
          <div className="absolute right-0 top-0 h-full w-64 bg-white p-4 shadow-lg z-20 border-l">
            <h3 className="font-bold mb-2 text-[#005CA9]">Modèles chargés</h3>
            {loadedModels.map((model) => (
              <div key={model.id} className="flex items-center gap-2 mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleModelVisibility(model.id)}
                  title={model.visible ? "Masquer" : "Afficher"}
                  className="flex-shrink-0"
                >
                  {model.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <span className="text-sm flex-1 break-words">{model.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Indicateur de chargement */}
        {loadingState.isLoading && (
          <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-30">
            <div className="text-center max-w-md">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#005CA9] mx-auto mb-6"></div>
              <h3 className="text-xl font-semibold mb-2">Chargement du visualiseur IFC</h3>
              <p className="text-gray-600 mb-4">
                {loadingState.currentFile} ({loadingState.currentIndex + 1}/{loadingState.totalFiles})
              </p>
              <div className="bg-gray-200 rounded-full h-2 w-full">
                <div
                  className="bg-[#005CA9] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingState.progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Architecture: web-ifc-three (stable)</p>
            </div>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="absolute bottom-4 left-4 bg-red-50 border border-red-200 rounded-lg p-4 z-10">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Statut */}
        {loadedModels.length > 0 && !loadingState.isLoading && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur p-3 rounded-lg shadow-md z-20">
            <p className="text-sm font-medium text-[#005CA9]">✅ {loadedModels.length} modèle(s) chargé(s)</p>
            <p className="text-xs text-gray-500">web-ifc-three + web-ifc 0.0.44</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Page principale avec Suspense
function ViewerPageContent() {
  return <UnifiedIFCViewer />
}

export default function ViewerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
      <ViewerPageContent />
    </Suspense>
  )
}
