"use client"
import { useEffect, useRef, useState, useCallback, Suspense } from "react"
import type React from "react"

import { IfcViewerAPI } from "web-ifc-viewer"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js"
import { ArrowLeft, ClipboardList, Home } from "lucide-react"
import PropertySidebar from "@/components/PropertySidebar"
import { Scissors, Ruler, Eye, EyeOff, MessageSquare, Download } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import * as THREE from "three"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import CameraControls from "camera-controls"
import SectionTool from "@/components/SectionTool"
import { MeasurementTool, type Measurement } from "@/components/MeasurementTool"
import { AnnotationSystem } from "@/components/AnnotationSystem"
import { getTodosCount, TodoManager } from "@/components/TodoManager"
import { useAuth } from "@/hooks/use-auth"
import ClashButton from "@/components/ClashButton"
import axios from "axios"
import { LoadingProgress } from "@/components/LoadingProgress"
import Image from "next/image"


type ViewStyle = "shaded" | "wireframe" | "hidden-line"
type ViewDirection = "top" | "bottom" | "front" | "back" | "left" | "right" | "iso"
type MeasurementMode = "none" | "distance" | "perpendicular" | "angle"

interface LoadedModel {
  id: string
  name: string
  url: string
  visible: boolean
  bbox?: THREE.Box3
}

interface LoadingProgressState {
  isVisible: boolean
  currentFile: string
  currentFileIndex: number
  totalFiles: number
  progress: number
  loadedModels: string[]
}

interface IfcModel {
  modelID: number
  mesh?: THREE.Mesh
}

function ViewerPageContent() {
  // États pour les propriétés des éléments
  const [selectedElement, setSelectedElement] = useState<number | null>(null)
  const [selectedModelID, setSelectedModelID] = useState<number | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)

  // États pour les outils
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const activeToolRef = useRef(activeTool)
  const { user } = useAuth()
  const userRole = user?.role
  const isBIMModeleur = userRole === "BIM Modeleur"

  // États pour les styles et modèles
  const [activeStyle, setActiveStyle] = useState<ViewStyle | null>(null)
  const [loadedModels, setLoadedModels] = useState<LoadedModel[]>([])

  // Références
  const containerRef = useRef<HTMLDivElement>(null!)
  const viewerRef = useRef<IfcViewerAPI | null>(null)
  const initializedRef = useRef(false)

  // États pour les erreurs et le chargement
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // États pour les mesures
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>("none")

  // États pour l'isolation
  const [isIsolationActive, setIsIsolationActive] = useState(false)

  // États pour la caméra
  const [camera, setCamera] = useState<THREE.Camera | null>(null)
  const [controls, setControls] = useState<unknown>(null)

  const router = useRouter()

  // États pour le TodoManager
  const [todosCount, setTodosCount] = useState(0)

  // État pour la progression du chargement
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgressState>({
    isVisible: false,
    currentFile: "",
    currentFileIndex: 0,
    totalFiles: 0,
    progress: 0,
    loadedModels: [],
  })

  // Configuration anti-vibration
  useEffect(() => {
    if (!viewerRef.current?.context) return

    const viewer = viewerRef.current
    const controls = viewer.context.ifcCamera.cameraControls

    controls.dampingFactor = 0.25
    controls.draggingDampingFactor = 0.25
    controls.azimuthRotateSpeed = 0.5
    controls.polarRotateSpeed = 0.5
    controls.truckSpeed = 1.0
    controls.maxDistance = 1000
    controls.minDistance = 0.1

    const renderer = viewer.context.getRenderer()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
  }, [])

  // Configuration d'Axios
  useEffect(() => {
    axios.defaults.withCredentials = true

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          document.cookie = "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;"
          router.push("/sign-in")
        }
        return Promise.reject(error)
      },
    )

    return () => axios.interceptors.response.eject(interceptor)
  }, [router])

  // Surveillance des modifications du TodoManager
  useEffect(() => {
    if (isBIMModeleur) return

    const interval = setInterval(() => {
      const count = getTodosCount()
      setTodosCount(count)
    }, 500)

    return () => clearInterval(interval)
  }, [isBIMModeleur])

  // Mise à jour de la référence de l'outil actif
  useEffect(() => {
    activeToolRef.current = activeTool
  }, [activeTool])

  // Initialisation du visualiseur
  useEffect(() => {
    const initViewer = async () => {
      if (!containerRef.current || initializedRef.current) return

      try {
        initializedRef.current = true
        const viewer = new IfcViewerAPI({
          container: containerRef.current,
          backgroundColor: new THREE.Color(0xeeeeee),
        })

        // Configuration de la scène
        const scene = viewer.context.getScene()
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        scene.add(ambientLight)

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight1.position.set(1, 2, 3)
        scene.add(directionalLight1)

        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
        directionalLight2.position.set(-1, 1, -2)
        scene.add(directionalLight2)

        const renderer = viewer.context.getRenderer()
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap

        await viewer.IFC.setWasmPath("wasm/")
        viewer.clipper.active = true
        viewer.IFC.loader.ifcManager.applyWebIfcConfig({
          COORDINATE_TO_ORIGIN: true,
          USE_FAST_BOOLS: false,
        })

        // Gestionnaire de clic
        if (containerRef.current) {
          containerRef.current.onclick = async () => {
            if (isBIMModeleur) return
            if (
              activeToolRef.current === "section" ||
              activeToolRef.current === "hide" ||
              activeToolRef.current === "comment" ||
              activeToolRef.current === "notes"
            )
              return

            try {
              const result = await viewer.IFC.selector.pickIfcItem(false)

              if (!result) {
                viewer.IFC.selector.unpickIfcItems()
                setSelectedElement(null)
                setSelectedModelID(null)
                setIsSidebarOpen(false)
                return
              }

              const modelID = result.modelID
              const ifcManager = viewer.IFC.loader.ifcManager

              if (!ifcManager || !ifcManager.state || !ifcManager.state.models) {
                console.warn("IFC Manager ou son état n'est pas disponible")
                return
              }

              const model = ifcManager.state.models[modelID] as IfcModel

              if (model && model.mesh && model.mesh.visible) {
                setSelectedElement(result.id)
                setSelectedModelID(modelID)
                setIsSidebarOpen(true)
              } else {
                viewer.IFC.selector.unpickIfcItems()
                console.log("Sélection ignorée: le modèle est masqué ou invalide")
              }
            } catch (err) {
              console.error("Erreur lors de la sélection:", err)
              setSelectedElement(null)
              setSelectedModelID(null)
              setIsSidebarOpen(false)
            }
          }
        }

        // Chargement des fichiers avec progression
        const filesParam = searchParams.get("files")
        if (filesParam) {
          const fileURLs = JSON.parse(filesParam) as string[]
          const totalFiles = fileURLs.length

          setLoadingProgress({
            isVisible: true,
            currentFile: "",
            currentFileIndex: 0,
            totalFiles: totalFiles,
            progress: 0,
            loadedModels: [],
          })

          const newModels = []
          const loadedModelNames: string[] = []

          for (let i = 0; i < fileURLs.length; i++) {
            const url = fileURLs[i]

            const decodedUrl = decodeURIComponent(decodeURIComponent(url))
            const filenamePart = decodedUrl.split("/").pop() || ""
            const displayName = filenamePart
              .replace(/(\d+_)/, "")
              .replace(/\?.*/, "")
              .replace(/\.ifc$/, "")
              .replace(/_/g, " ")

            setLoadingProgress((prev) => ({
              ...prev,
              currentFile: displayName,
              currentFileIndex: i,
              progress: 0,
            }))

            try {
              const progressInterval = setInterval(() => {
                setLoadingProgress((prev) => ({
                  ...prev,
                  progress: Math.min(prev.progress + Math.random() * 15, 90),
                }))
              }, 200)

              const model = await viewer.IFC.loadIfcUrl(url)

              clearInterval(progressInterval)

              if (model?.mesh && model.modelID !== undefined) {
                const cleanName = displayName || `Modèle-${model.modelID}`

                newModels.push({
                  id: String(model.modelID),
                  name: cleanName,
                  url: url,
                  visible: true,
                })

                loadedModelNames.push(cleanName)

                setLoadingProgress((prev) => ({
                  ...prev,
                  progress: 100,
                  loadedModels: [...loadedModelNames],
                }))

                await new Promise((resolve) => setTimeout(resolve, 300))
              }
            } catch (loadError) {
              console.error(`Échec du chargement: ${url}`, loadError)
            }
          }

          setLoadingProgress((prev) => ({
            ...prev,
            currentFileIndex: totalFiles,
            progress: 100,
          }))

          setTimeout(() => {
            setLoadingProgress((prev) => ({
              ...prev,
              isVisible: false,
            }))
          }, 1000)

          setLoadedModels(newModels)

          // Configuration de la caméra
          if (newModels.length > 0) {
            try {
              scene.updateMatrixWorld(true)
              const bbox = new THREE.Box3()

              scene.traverse((object) => {
                if (object instanceof THREE.Mesh && object.geometry) {
                  bbox.expandByObject(object)
                }
              })

              if (bbox.isEmpty()) {
                bbox.set(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
              }

              const center = new THREE.Vector3()
              const size = new THREE.Vector3()
              bbox.getCenter(center)
              bbox.getSize(size)
              const maxDim = Math.max(size.x, size.y, size.z)

              const camera = viewer.context.getCamera()
              if (camera instanceof THREE.PerspectiveCamera) {
                camera.near = Math.max(0.1, maxDim * 0.001)
                camera.far = Math.max(1000, maxDim * 10)
                camera.updateProjectionMatrix()
              }

              const cameraOffsetX = center.x + maxDim
              const cameraOffsetY = center.y + maxDim * 0.5
              const cameraOffsetZ = center.z + maxDim

              if (
                isFinite(cameraOffsetX) &&
                isFinite(cameraOffsetY) &&
                isFinite(cameraOffsetZ) &&
                isFinite(center.x) &&
                isFinite(center.y) &&
                isFinite(center.z)
              ) {
                viewer.context.ifcCamera.cameraControls.setLookAt(
                  cameraOffsetX,
                  cameraOffsetY,
                  cameraOffsetZ,
                  center.x,
                  center.y,
                  center.z,
                  true,
                )
              } else {
                viewer.context.ifcCamera.cameraControls.setLookAt(10, 10, 10, 0, 0, 0, true)
              }
            } catch (cameraError) {
              console.error("Error setting up camera:", cameraError)
              viewer.context.ifcCamera.cameraControls.setLookAt(10, 10, 10, 0, 0, 0, true)
            }
          } else {
            setError("Aucun modèle n'a pu être chargé")
            setLoadingProgress((prev) => ({ ...prev, isVisible: false }))
          }
        }

        viewerRef.current = viewer
      } catch (initError) {
        console.error("Erreur d'initialisation:", initError)
        setError(
          "Échec de l'initialisation du visualiseur: " +
            (initError instanceof Error ? initError.message : String(initError)),
        )
        initializedRef.current = false
        setLoadingProgress((prev) => ({ ...prev, isVisible: false }))
      }
    }

    initViewer()

    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.dispose()
        } catch (cleanupError) {
          console.error("Erreur lors du nettoyage:", cleanupError)
        }
        viewerRef.current = null
        initializedRef.current = false
      }
    }
  }, [searchParams, isBIMModeleur])

  // Configuration des contrôles de caméra
  useEffect(() => {
    if (!viewerRef.current?.context) return

    const viewer = viewerRef.current
    const controls = viewer.context.ifcCamera.cameraControls

    controls.maxDistance = 1000
    controls.minDistance = 0.1
    controls.infinityDolly = false
    controls.dollyToCursor = true
    controls.dollySpeed = 1.0
    controls.truckSpeed = 2.0

    controls.mouseButtons = {
      left: CameraControls.ACTION.TRUCK,
      middle: CameraControls.ACTION.DOLLY,
      right: CameraControls.ACTION.ROTATE,
      wheel: CameraControls.ACTION.DOLLY,
    }

    let lastTime = 0
    const targetFPS = 60
    const minFrameTime = 1000 / targetFPS

    const updateControls = (time: number) => {
      const delta = time - lastTime
      if (delta >= minFrameTime) {
        controls.update(delta / 1000)
        lastTime = time
      }
      requestAnimationFrame(updateControls)
    }

    requestAnimationFrame(updateControls)
  }, [])

  // Configuration de la caméra et des contrôles
  useEffect(() => {
    if (!viewerRef.current?.context) return

    const viewer = viewerRef.current
    const camera = viewer.context.getCamera()
    setCamera(camera)

    const cameraControls = viewer.context?.ifcCamera?.cameraControls
    if (cameraControls) {
      setControls(cameraControls as unknown)

      cameraControls.mouseButtons.left = CameraControls.ACTION.TRUCK
      cameraControls.mouseButtons.right = CameraControls.ACTION.ROTATE
    }
  }, [])

  // Réinitialisation des mesures quand l'outil change
  useEffect(() => {
    if (activeTool !== "measure") {
      setMeasurementMode("none")
    }
  }, [activeTool])

  // Fonction pour revenir en arrière
  const handleGoBack = useCallback(() => {
    router.back()
  }, [router])

  // Fonction pour basculer l'outil actif
  const toggleTool = useCallback(
    (tool: string) => {
      setActiveTool(activeTool === tool ? null : tool)
    },
    [activeTool],
  )

  // Fonction pour basculer la visibilité des modèles
  const toggleModelVisibility = useCallback((modelId: string, visible: boolean) => {
    if (!viewerRef.current) return

    const ifcManager = viewerRef.current.IFC.loader.ifcManager
    const model = Object.values(ifcManager.state.models).find((m: IfcModel) => String(m.modelID) === modelId)

    if (model?.mesh) {
      model.mesh.visible = visible
      setLoadedModels((prev) => prev.map((m) => (m.id === modelId ? { ...m, visible } : m)))

      const scene = viewerRef.current.context.getScene()
      const camera = viewerRef.current.context.getCamera()
      viewerRef.current.context.getRenderer().render(scene, camera)
    }
  }, [])

  // Composant de liste des modèles
  const ModelList = useCallback(
    () => (
      <div className="absolute right-0 top-0 h-full w-64 bg-white dark:bg-gray-800 p-4 shadow-lg z-20 border-l border-gray-200 dark:border-gray-700">
        <h3 className="font-bold mb-2 text-gray-900 dark:text-gray-100">Modèles chargés</h3>
        {loadedModels.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Aucun modèle disponible</p>
        ) : (
          loadedModels.map((model) => (
            <div key={model.id} className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleModelVisibility(model.id, !model.visible)}
                title={model.visible ? "Masquer" : "Afficher"}
                className="flex-shrink-0 text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
              >
                {model.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <span className="text-sm flex-1 break-words text-xs text-gray-700 dark:text-gray-300">{model.name}</span>
            </div>
          ))
        )}
      </div>
    ),
    [loadedModels, toggleModelVisibility],
  )

  // Fonction pour calculer la distance de la caméra
  const calculateCameraDistance = useCallback((bbox: THREE.Box3) => {
    const size = bbox.getSize(new THREE.Vector3())
    return Math.max(size.x, size.y, size.z) * 2.5
  }, [])

  // Fonction pour définir la vue
  const setView = useCallback(
    (direction: ViewDirection) => {
      const viewer = viewerRef.current
      if (!viewer) return

      viewer.clipper.deleteAllPlanes()

      const controls = viewer.context.ifcCamera.cameraControls
      const bbox = new THREE.Box3()

      Object.values(viewer.IFC.loader.ifcManager.state.models).forEach((model: IfcModel) => {
        if (model.mesh) {
          model.mesh.updateMatrixWorld(true)
          const modelBBox = new THREE.Box3().setFromObject(model.mesh)
          bbox.union(modelBBox)
        }
      })

      const distance = bbox.isEmpty() ? 50 : calculateCameraDistance(bbox)
      const center = bbox.isEmpty() ? new THREE.Vector3() : bbox.getCenter(new THREE.Vector3())

      const size = bbox.getSize(new THREE.Vector3())
      center.z = bbox.min.z + size.z / 2

      const position = new THREE.Vector3()
      const up = new THREE.Vector3(0, 0, 1)

      switch (direction) {
        case "top":
          position.set(center.x, center.y + distance, center.z)
          up.set(0, 0, 1)
          break
        case "bottom":
          position.set(center.x, center.y - distance, center.z)
          up.set(0, 0, 1)
          break
        case "front":
          position.set(center.x, center.y, center.z + distance)
          up.set(0, 1, 0)
          break
        case "back":
          position.set(center.x, center.y, center.z - distance)
          up.set(0, 1, 0)
          break
        case "left":
          position.set(center.x - distance, center.y, center.z)
          up.set(0, 1, 0)
          break
        case "right":
          position.set(center.x + distance, center.y, center.z)
          up.set(0, 1, 0)
          break
        case "iso":
          position.set(center.x + distance * 0.7, center.y + distance * 0.7, center.z + distance * 0.7)
          up.set(0, 1, 0)
          break
      }

      controls.setLookAt(position.x, position.y, position.z, center.x, center.y, center.z, true)

      controls.update(0)
      viewer.context.getRenderer().render(viewer.context.getScene(), viewer.context.getCamera())
    },
    [calculateCameraDistance],
  )

  // Fonction pour réinitialiser l'isolation
  const resetIsolation = useCallback(() => {
    if (!viewerRef.current) return
    const scene = viewerRef.current.context.getScene()
    scene.traverse((object) => {
      object.visible = true
    })
    setIsIsolationActive(false)
  }, [])

  // Référence pour les matériaux initiaux
  const initialMaterials = useRef(new WeakMap<THREE.Object3D, THREE.Material | THREE.Material[]>())

  // Fonction pour définir le style de vue
  const setViewStyleMode = useCallback(
    (style: "shaded" | "wireframe" | "hidden-line" | null) => {
      if (!viewerRef.current) return

      const scene = viewerRef.current.context.getScene()

      if (activeStyle === style) {
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            const original = initialMaterials.current.get(object)

            if (original) {
              object.material = original
              object.material.needsUpdate = true
              if (Array.isArray(object.material)) {
                object.material.forEach((m) => (m.needsUpdate = true))
              }
            }

            const edges = object.children.filter((child) => child instanceof THREE.LineSegments)
            edges.forEach((edge) => object.remove(edge))
          }
        })
        setActiveStyle(null)
        return
      }

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (!initialMaterials.current.has(object)) {
            initialMaterials.current.set(object, object.material)
          }

          const edges = object.children.filter((child) => child instanceof THREE.LineSegments)
          edges.forEach((edge) => object.remove(edge))

          const createNewMaterial = () => {
            switch (style) {
              case "shaded":
                return new THREE.MeshPhongMaterial({
                  color: 0xffffff,
                  flatShading: false,
                })
              case "wireframe":
                return new THREE.MeshBasicMaterial({
                  wireframe: true,
                  color: 0x000000,
                })
              case "hidden-line":
                return new THREE.MeshBasicMaterial({ color: 0xffffff })
              default:
                return null
            }
          }

          const newMaterial = createNewMaterial()
          if (!newMaterial) return

          if (Array.isArray(object.material)) {
            object.material = object.material.map(() => newMaterial.clone())
          } else {
            object.material = newMaterial.clone()
          }

          if (style === "hidden-line") {
            const edgesGeometry = new THREE.EdgesGeometry(object.geometry)
            const edgesMaterial = new THREE.LineBasicMaterial({
              color: 0x000000,
            })
            const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial)
            object.add(edges)
          }
        }
      })

      setActiveStyle(style)
    },
    [activeStyle],
  )

  // Gestionnaire pour les mesures complétées
  const handleMeasurementComplete = (measurement: Measurement) => {
    console.log("Measurement completed:", measurement)
  }

  // Gestionnaire pour effacer toutes les mesures
  const handleClearMeasurements = useCallback(() => {
    if (!viewerRef.current) return

    const scene = viewerRef.current.context.getScene()
    const renderer = viewerRef.current.context.getRenderer()

    const toRemove: (THREE.Object3D | CSS2DObject)[] = []

    scene.traverse((object) => {
      if (object instanceof THREE.Line || object instanceof CSS2DObject) {
        toRemove.push(object)

        if (object instanceof CSS2DObject && object.element.parentNode) {
          object.element.parentNode.removeChild(object.element)
        }
      }
    })

    toRemove.forEach((obj) => scene.remove(obj))

    if (renderer) {
      renderer.domElement.innerHTML = ""
    }
  }, [])

  // Gestionnaire pour la vue isométrique
  const handleIsoView = useCallback(() => {
    setView("iso")
  }, [setView])

  // Vérification du projectId
  const projectId = searchParams.get("projectId")
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
    <div className="flex h-screen dark:bg-gray-900 pt-20">
      {/* Barre latérale gauche */}
      <div className="w-16 bg-white dark:bg-gray-800 shadow-lg flex flex-col items-center py-4 gap-4 border-r border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGoBack}
          className="w-full flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Retour</span>
        </Button>

        <Button
          variant={activeTool === "section" ? "default" : "ghost"}
          size="icon"
          disabled={isBIMModeleur}
          onClick={() => {
            if (!isBIMModeleur) {
              setActiveTool(activeTool === "section" ? null : "section")
            }
          }}
          title="Plan de coupe"
          className={
            isBIMModeleur
              ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50"
              : activeTool === "section"
                ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
                : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
          }
        >
          <Scissors className="h-5 w-5" />
        </Button>

        <Button
          variant={activeTool === "measure" ? "default" : "ghost"}
          size="icon"
          onClick={() => {
            if (activeTool === "measure") {
              setActiveTool(null)
              setMeasurementMode("none")
            } else {
              setActiveTool("measure")
              setMeasurementMode("distance")
            }
          }}
          title="Mesurer"
          className={
            activeTool === "measure"
              ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
              : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
          }
        >
          <Ruler className="h-5 w-5" />
        </Button>

        <Button
          variant={activeTool === "hide" ? "default" : "ghost"}
          size="icon"
          onClick={() => toggleTool("hide")}
          title="Masquer/Afficher"
          className={
            activeTool === "hide"
              ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
              : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
          }
        >
          <Eye className="h-5 w-5" />
        </Button>

        <Button
          variant={activeTool === "notes" ? "default" : "ghost"}
          size="icon"
          onClick={() => toggleTool("notes")}
          title="Notes"
          className={`relative ${
            activeTool === "notes"
              ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
              : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
          }`}
        >
          <ClipboardList className="h-5 w-5" />
          {!isBIMModeleur && todosCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#005CA9] dark:bg-[#3b82f6] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {todosCount}
            </span>
          )}
        </Button>

        <Button
          variant={activeTool === "comment" ? "default" : "ghost"}
          size="icon"
          onClick={() => toggleTool("comment")}
          title="Commentaire"
          className={
            activeTool === "comment"
              ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
              : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
          }
        >
          <MessageSquare className="h-5 w-5" />
        </Button>

        <Button
          variant={activeStyle === "shaded" ? "default" : "ghost"}
          size="icon"
          onClick={() => setViewStyleMode("shaded")}
          title="Ombré"
          className={
            activeStyle === "shaded"
              ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
              : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
          }
        >
          <Image src="/images/LigneCaché.png" alt="Icône ombrée" width={24} height={24} className="h-6 w-6" />
        </Button>

        <Button
          variant={activeStyle === "wireframe" ? "default" : "ghost"}
          size="icon"
          onClick={() => setViewStyleMode("wireframe")}
          title="Image filaire"
          className={
            activeStyle === "wireframe"
              ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
              : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
          }
        >
          <Image src="/images/Image-Filaire.png" alt="Image filaire" width={24} height={24} className="h-6 w-6" />
        </Button>

        <Button
          variant={activeStyle === "hidden-line" ? "default" : "ghost"}
          size="icon"
          onClick={() => setViewStyleMode("hidden-line")}
          title="Ligne cachée"
          className={
            activeStyle === "hidden-line"
              ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
              : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
          }
        >
          <Image src="/images/Ligne cachée.png" alt="Ligne cachée" width={24} height={24} className="h-6 w-6" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          disabled={isBIMModeleur}
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              (window as { todoManager?: { exportBCF?: () => void } }).todoManager?.exportBCF
            ) {
              ;(window as { todoManager: { exportBCF: () => void } }).todoManager.exportBCF()
            } else {
              console.error("exportBCF function not available")
              alert("BCF Export functionality is not available.")
            }
          }}
          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:text-[#005CA9] dark:hover:border-[#3b82f6] hover:border-[#005CA9] dark:hover:border-[#3b82f6]"
        >
          <Download className="h-4 w-4" />
        </Button>

        <ClashButton loadedModels={loadedModels} />

        {isIsolationActive && (
          <Button
            variant="destructive"
            size="icon"
            disabled={isBIMModeleur}
            onClick={resetIsolation}
            title="Réinitialiser l&apos;isolation"
            className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
          >
            <EyeOff className="h-5 w-5" />
          </Button>
        )}
      </div>

      <LoadingProgress
        isVisible={loadingProgress.isVisible}
        currentFile={loadingProgress.currentFile}
        currentFileIndex={loadingProgress.currentFileIndex}
        totalFiles={loadingProgress.totalFiles}
        progress={loadingProgress.progress}
        loadedModels={loadingProgress.loadedModels}
      />

      {/* Zone principale du visualiseur */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0 bg-white dark:bg-gray-800" />

        <div className="absolute top-4 right-4 flex flex-col gap-3 z-20">
          <Button
            variant="outline"
            size="sm"
            onClick={handleIsoView}
            className="aspect-square rounded-xl p-2 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:border-[#3b82f6] hover:border-[#005CA9] dark:hover:border-[#3b82f6]"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>

        {/* Panneau de propriété flottant */}
        {isSidebarOpen && selectedElement && (
          <div
            className="absolute top-4 right-4 bottom-4 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col z-10 border border-gray-200 dark:border-gray-700"
            style={{ maxHeight: "calc(100% - 2rem)" }}
          >
            <PropertySidebar
              viewer={viewerRef.current}
              selectedElement={selectedElement}
              modelID={selectedModelID}
              onClose={() => setIsSidebarOpen(false)}
            />
          </div>
        )}

        {/* Panneau Section */}
        {userRole !== "BIM Modeleur" && viewerRef.current && (
          <SectionTool
            viewer={viewerRef.current}
            containerRef={containerRef as React.RefObject<HTMLDivElement>}
            isActive={activeTool === "section"}
            onSectionCreated={(plane) => {
              console.log("Nouveau plan de coupe créé:", plane)
            }}
          />
        )}

        {/* Panneau Mesure */}
        {activeTool === "measure" && (
          <div className="absolute bottom-20 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-2">
              <Button
                variant={measurementMode === "distance" ? "default" : "ghost"}
                onClick={() => setMeasurementMode("distance")}
                className={
                  measurementMode === "distance"
                    ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
                    : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
                }
              >
                Distance simple
              </Button>
              <Button
                variant={measurementMode === "angle" ? "default" : "ghost"}
                onClick={() => setMeasurementMode("angle")}
                className={
                  measurementMode === "angle"
                    ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
                    : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
                }
              >
                Mesure d&apos;angle
              </Button>
              <Button
                variant={measurementMode === "perpendicular" ? "default" : "ghost"}
                onClick={() => setMeasurementMode("perpendicular")}
                className={
                  measurementMode === "perpendicular"
                    ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
                    : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
                }
              >
                Distance perpendiculaire
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearMeasurements}
                className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white"
              >
                Effacer toutes les mesures
              </Button>
            </div>
          </div>
        )}

        {/* Composant de mesure */}
        {viewerRef.current && (
          <MeasurementTool
            viewer={viewerRef.current}
            containerRef={containerRef}
            active={activeTool === "measure"}
            measurementMode={measurementMode}
            onMeasurementComplete={handleMeasurementComplete}
            onClearMeasurements={handleClearMeasurements}
          />
        )}

        <TodoManager viewerRef={viewerRef} toast={toast} activeTool={activeTool} setActiveTool={setActiveTool} />

        <AnnotationSystem
          viewerRef={viewerRef}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          activeTool={activeTool ?? ""}
          camera={camera ?? undefined}
          controls={
            controls as
              | {
                  target?: THREE.Vector3
                  target0?: THREE.Vector3
                  center?: THREE.Vector3
                  object?: { target?: THREE.Vector3 }
                  _target?: THREE.Vector3
                  getTarget?: () => THREE.Vector3
                }
              | undefined
          }
          projectId={projectId}
        />

        {/* Panneau Masquer/Afficher pour les modèles chargés */}
        {activeTool === "hide" && <ModelList />}

        {error && (
          <Alert className="absolute bottom-4 left-4 w-auto z-10 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
export default function ViewerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
      <ViewerPageContent />
    </Suspense>
  )
}