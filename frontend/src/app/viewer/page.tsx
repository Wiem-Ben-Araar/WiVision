"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { IfcViewerAPI } from "web-ifc-viewer"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js"
import { ClipboardList, ArrowLeft, Loader2, Home, CrosshairIcon } from "lucide-react"

import PropertySidebar from "@/components/PropertySidebar"

import {
  Scissors,
  Ruler,
  Eye,
  EyeOff,
  MessageSquare,
  Download,
  Sun,
  Paintbrush,
  SplitSquareHorizontal,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import * as THREE from "three"

import { toast } from "sonner"
import { useRouter } from "next/navigation"

import CameraControls from "camera-controls"
import SectionTool from "@/components/SectionTool"
import { MeasurementTool } from "@/components/MeasurementTool"
import { AnnotationSystem } from "@/components/AnnotationSystem"
import { getTodosCount, isActiveTool, TodoManager, toggleTodoPanel } from "@/components/TodoManager"
import { useAuth } from "@/hooks/use-auth"
import ClashButton from "@/components/ClashButton"
import axios from "axios"

type ViewStyle = "shaded" | "wireframe" | "hidden-line"
type ViewDirection = "top" | "bottom" | "front" | "back" | "left" | "right" | "iso"
type MeasurementMode = "none" | "distance" | "perpendicular" | "angle"
interface Measurement {
  id: string
  type: MeasurementMode // Ajoutez ce champ
  lines: THREE.Line[] // Au lieu d'un seul line
  points: THREE.Vector3[]
  distance?: number
  angle?: number
  labels: CSS2DObject[]
}

interface LoadedModel {
  id: number
  name: string
  url: string
  visible: boolean
  bbox?: THREE.Box3
}

export default function ViewerPage() {
  ///////////details property
  const [selectedElement, setSelectedElement] = useState<number | null>(null)
  const [selectedModelID, setSelectedModelID] = useState<number | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false)
  ///////////details property
const [activeTool, setActiveTool] = useState<string | null>(null);
const activeToolRef = useRef(activeTool);
  const { user } = useAuth()
  const [activeStyle, setActiveStyle] = useState<ViewStyle | null>(null)
  const [loadedModels, setLoadedModels] = useState<LoadedModel[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<IfcViewerAPI | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>("none")
  const [measurements, setMeasurements] = useState<Measurement[]>([])

  const [currentPoints, setCurrentPoints] = useState<THREE.Vector3[]>([])

  const [jobPollingInterval, setJobPollingInterval] = useState(null)

  const [isIsolationActive, setIsIsolationActive] = useState(false)
  const [clashReport, setClashReport] = useState<any>(null)
  const [isClashModalOpen, setIsClashModalOpen] = useState(false)
  const [camera, setCamera] = useState<THREE.Camera | null>(null)
  const [controls, setControls] = useState<any>(null)
  const initializedRef = useRef(false)

  const [cameraPosition, setCameraPosition] = useState<THREE.Vector3 | null>(null)
  const [cameraTarget, setCameraTarget] = useState<THREE.Vector3 | null>(null)
  const [cameraUp, setCameraUp] = useState<THREE.Vector3 | null>(null)

  const router = useRouter()

  // États locaux pour suivre les informations du TodoManager
  const [todosCount, setTodosCount] = useState(0)
  const [isToolActive, setIsToolActive] = useState(false)
  // const handleClashDetection = async () => {
  //   try {
  //     setLoading(true)

  //     // Récupère les URLs des 2 premiers modèles
  //     const modelUrls = loadedModels.slice(0, 2).map((model) => model.url)

  //     const response = await fetch("/api/clash-detection", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ urls: modelUrls }),
  //     })

  //     const report = await response.json()
  //     setClashReport(report)
  //     setIsClashModalOpen(true)
  //   } catch (error) {
  //     toast.error("Erreur lors de la détection des clashs")
  //   } finally {
  //     setLoading(false)
  //   }
  // }
  // Surveiller les modifications des données du TodoManager
  useEffect(() => {
    const interval = setInterval(() => {
      const count = getTodosCount()
      const active = isActiveTool()

      setTodosCount(count)
      setIsToolActive(active)
    }, 500)

    return () => clearInterval(interval)
  }, [])
useEffect(() => {
  activeToolRef.current = activeTool;
}, [activeTool]);
  // Gestionnaire de clic pour le bouton externe
  const handleTodoButtonClick = () => {
    toggleTodoPanel()
  }

  const toggleTool = (tool: string) => {
    if (activeTool === tool) {
      // Si l'outil cliqué est déjà actif, le désactiver
      setActiveTool(null)
    } else {
      // Sinon, activer cet outil (désactivant tout autre outil)
      setActiveTool(tool)
    }
  }

  useEffect(() => {
    axios.defaults.withCredentials = true

    // Intercepteur pour les erreurs 401
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

  const handleGoBack = () => {
    router.back()
  }

  const ModelList = () => (
    <div className="absolute right-0 top-0 h-full w-64 bg-white dark:bg-gray-800 p-4 shadow-lg z-20 border-l border-gray-200 dark:border-gray-700">
      <h3 className="font-bold mb-2 text-gray-900 dark:text-gray-100">Modèles chargés</h3>
      {loadedModels.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">Aucun modèle disponible</p>
      ) : (
        loadedModels.map((model) => (
          <div key={model.id} className="flex items-center gap-2 mb-2">
            {/* Bouton avec l'icône d'œil */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleModelVisibility(model.id, !model.visible)}
              title={model.visible ? "Masquer" : "Afficher"}
              className="flex-shrink-0 text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
            >
              {model.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>

            {/* Nom du modèle sans troncature */}
            <span className="text-sm flex-1 break-words text-xs text-gray-700 dark:text-gray-300">{model.name}</span>
          </div>
        ))
      )}
    </div>
  )
  // Récupération (ou mise à jour) de la position de la caméra dans un useEffect
  useEffect(() => {
    if (viewerRef.current?.context) {
      const camera = viewerRef.current.context.getCamera()
      setCameraPosition(camera.position.clone())
      setCameraTarget(new THREE.Vector3(0, 0, 0))
      setCameraUp(camera.up.clone())
    }
  }, [])
  useEffect(() => {
    const initViewer = async () => {
      if (!containerRef.current || initializedRef.current) return
    
      try {
        initializedRef.current = true
        const viewer = new IfcViewerAPI({
          container: containerRef.current,
          backgroundColor: new THREE.Color(0xeeeeee),
        })
    
        // Add proper lighting to the scene
        const scene = viewer.context.getScene()
    
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        scene.add(ambientLight)
    
        // Add directional lights from multiple angles
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight1.position.set(1, 2, 3)
        scene.add(directionalLight1)
    
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
        directionalLight2.position.set(-1, 1, -2)
        scene.add(directionalLight2)
    
        // Configuration avancée du renderer
        const renderer = viewer.context.getRenderer()
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.physicallyCorrectLights = true
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
    
        // Configuration WASM - make sure the path is correct
        await viewer.IFC.setWasmPath("wasm/")
        viewer.clipper.active = true
        viewer.IFC.loader.ifcManager.applyWebIfcConfig({
          COORDINATE_TO_ORIGIN: true,
          USE_FAST_BOOLS: false,
        })
    

        containerRef.current.onclick = async () => {
 if (activeToolRef.current === "section" || activeToolRef.current === "hide" || activeToolRef.current === "comment" || activeToolRef.current === "notes") return;
          try {
      

            const result = await viewer.IFC.selector.pickIfcItem(false)
            console.log("Résultat de la sélection:", result)
    
            if (!result) {
              viewer.IFC.selector.unpickIfcItems()
              setSelectedElement(null)
              setSelectedModelID(null)
              setIsSidebarOpen(false)
              return
            }
            
            // Vérifier correctement si le modèle existe et est visible
            const modelID = result.modelID
            const ifcManager = viewer.IFC.loader.ifcManager
            
            // Vérification plus sûre avec null checks
            if (!ifcManager || !ifcManager.state || !ifcManager.state.models) {
              console.warn("IFC Manager ou son état n'est pas disponible");
              return;
            }
            
            const model = ifcManager.state.models[modelID];
            
            // Vérification plus robuste du modèle et sa visibilité
            if (model && model.mesh && model.mesh.visible) {
              setSelectedElement(result.id)
              setSelectedModelID(modelID)
              setIsSidebarOpen(true)
            } else {
              // Le modèle est invisible ou invalide, annuler la sélection
              viewer.IFC.selector.unpickIfcItems()
              console.log("Sélection ignorée: le modèle est masqué ou invalide")
            }
          } catch (error) {
            console.error("Erreur lors de la sélection:", error)
            // Réinitialiser l'état de sélection en cas d'erreur
            setSelectedElement(null)
            setSelectedModelID(null)
            setIsSidebarOpen(false)
          }
        }
        ///////////details property
        const filesParam = searchParams.get("files")
        if (filesParam) {
          const fileURLs = JSON.parse(filesParam) as string[]
          const newModels = []

          for (const url of fileURLs) {
            try {
              const model = await viewer.IFC.loadIfcUrl(url, {
                applyMaterials: true,
                coerceMaterials: false,
              })

              if (model?.mesh && model.modelID !== undefined) {
                const decodedUrl = decodeURIComponent(decodeURIComponent(url)) // Double décodage pour les URLs encodées 2 fois
                const filenamePart = decodedUrl.split("/").pop() || "" // Prendre la dernière partie de l'URL
                const cleanFilename = filenamePart
                  .replace(/(\d+_)/, "") // Enlever le timestamp au début
                  .replace(/\?.*/, "") // Supprimer les paramètres après le ?
                  .replace(/\.ifc$/, "") // Enlever l'extension .ifc
                  .replace(/_/g, " ") // Remplacer les underscores par des espaces

                const cleanName = cleanFilename || `Modèle-${model.modelID}`
                newModels.push({
                  id: model.modelID,
                  name: cleanName, 
                  url: url,
                  visible: true,
                })
              }
            } catch (error) {
              console.error(`Échec du chargement: ${url}`, error)
            }
          }

          setLoadedModels(newModels)

          // Ajustement automatique de la caméra only if models were loaded
          if (newModels.length > 0) {
            console.log(`Adjusting camera for ${newModels.length} models`)

            try {
              // Force scene update to ensure bounding box is correct
              scene.updateMatrixWorld(true)

              // Créer une boîte englobante
              const bbox = new THREE.Box3()

              // Ajouter tous les objets à la boîte englobante
              scene.traverse((object) => {
                if (object.isMesh && object.geometry) {
                  bbox.expandByObject(object)
                }
              })

              // Vérifier que la boîte englobante est valide
              if (bbox.isEmpty()) {
                console.warn("Bounding box is empty, using fallback values")
                bbox.set(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
              }

              // Créer des vecteurs pour le centre et la taille
              const center = new THREE.Vector3()
              const size = new THREE.Vector3()

              // Calculer le centre et la taille
              bbox.getCenter(center)
              bbox.getSize(size)

              const maxDim = Math.max(size.x, size.y, size.z)

              // Configuration caméra
              const camera = viewer.context.getCamera()
              camera.near = Math.max(0.1, maxDim * 0.001)
              camera.far = Math.max(1000, maxDim * 10)
              camera.updateProjectionMatrix()

              // Position initiale avec des valeurs sécurisées
              const cameraOffsetX = center.x + maxDim
              const cameraOffsetY = center.y + maxDim * 0.5
              const cameraOffsetZ = center.z + maxDim

              // S'assurer que tous les paramètres sont des nombres
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

                console.log("Camera positioned successfully", {
                  from: [cameraOffsetX, cameraOffsetY, cameraOffsetZ],
                  to: [center.x, center.y, center.z],
                })
              } else {
                console.warn("Invalid camera position values, using default positioning")
                viewer.context.ifcCamera.cameraControls.setLookAt(10, 10, 10, 0, 0, 0, true)
              }
            } catch (cameraError) {
              console.error("Error setting up camera:", cameraError)
              // Fallback camera positioning
              viewer.context.ifcCamera.cameraControls.setLookAt(10, 10, 10, 0, 0, 0, true)
            }
          } else {
            console.warn("No models were successfully loaded")
            setError("No models were successfully loaded")
          }
        }

        viewerRef.current = viewer
      } catch (error) {
        console.error("Initialization error:", error)
        setError("Failed to initialize viewer: " + (error instanceof Error ? error.message : String(error)))
        initializedRef.current = false
      }
    }

    initViewer()

    // Cleanup avec vérification complète
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
  }, [searchParams])

  useEffect(() => {
    if (!viewerRef.current?.context) return

    const viewer = viewerRef.current
    const controls = viewer.context.ifcCamera.cameraControls

    // Paramètres avancés pour une navigation fluide
    controls.smoothTime = 0.25
    controls.maxDistance = 1000
    controls.minDistance = 0.1
    controls.infinityDolly = false
    controls.dollyToCursor = true
    controls.dollySpeed = 1.0
    controls.truckSpeed = 2.0
    controls.rotateSpeed = 1.0

    // Configuration des touches
    controls.mouseButtons = {
      left: CameraControls.ACTION.TRUCK,
      middle: CameraControls.ACTION.DOLLY,
      right: CameraControls.ACTION.ROTATE,
      wheel: CameraControls.ACTION.DOLLY,
    }

    // Gestion des FPS
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

    return () => {
      // Cleanup
    }
  }, [])
  const updateCamera = (viewer: IfcViewerAPI, models: LoadedModel[]) => {
    const bbox = new THREE.Box3()

    // Calculer la bounding box globale
    models.forEach((model) => {
      const mesh = viewer.IFC.loader.ifcManager.state.models[model.id]?.mesh
      if (mesh) {
        mesh.updateMatrixWorld(true)
        bbox.expandByObject(mesh)
      }
    })

    if (bbox.isEmpty()) return

    const center = bbox.getCenter(new THREE.Vector3())
    const size = bbox.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const distance = maxDim * 2.5

    const controls = viewer.context.ifcCamera.cameraControls
    const direction = new THREE.Vector3(1, 1, 1).normalize()
    const position = center.clone().add(direction.multiplyScalar(distance))

    controls.setLookAt(position.x, position.y, position.z, center.x, center.y, center.z, true)
  }
  useEffect(() => {
    if (viewerRef.current && activeTool === "select") {
      const viewer = viewerRef.current

      const handleClick = (event: MouseEvent) => {
        try {
          if (!containerRef.current) {
            console.warn("Conteneur non disponible")
            return
          }

          console.log("Événement de clic capturé")

          // Méthode alternative de sélection
          const rect = containerRef.current.getBoundingClientRect()
          const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
          const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

          console.log("Coordonnées normalisées:", { x, y })

          // Vérifier les méthodes disponibles
          console.log(
            "Méthodes disponibles dans viewer:",
            Object.keys(viewer).filter((key) => typeof viewer[key] === "function"),
          )

          // Tentative de sélection avec différentes approches
          if (viewer.IFC && viewer.IFC.selector) {
            console.log("Tentative de sélection avec IFC.selector")
            try {
              const result = viewer.IFC.selector.pickIfcItem()
              console.log("Résultat de la sélection:", result)
            } catch (ifcError) {
              console.error("Erreur avec IFC.selector:", ifcError)
            }
          }

          // Méthode alternative de ray casting
          if (viewer.context && viewer.context.castRay) {
            console.log("Tentative de ray casting")
            try {
              const result = viewer.context.castRay(x, y)
              console.log("Résultat du ray casting:", result)
            } catch (rayError) {
              console.error("Erreur de ray casting:", rayError)
            }
          }
        } catch (error) {
          console.error("Erreur globale lors de la sélection:", error)
        }
      }

      // Ajouter l'écouteur d'événements
      containerRef.current?.addEventListener("click", handleClick)

      // Nettoyage
      return () => {
        containerRef.current?.removeEventListener("click", handleClick)
      }
    }
  }, [activeTool, containerRef, viewerRef])

  // Correction 4 : Vérification de l'état de chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 pt-20">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#005CA9] dark:text-[#3b82f6] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Chargement du visualiseur...</p>
        </div>
      </div>
    )
  }

  const AnnotationTypeButton = ({
    type,
    label,
    icon,
    selected,
    onSelect,
  }: {
    type: "cloud" | "arrow" | "text"
    label: string
    icon: React.ReactNode
    selected: string
    onSelect: (type: "cloud" | "arrow" | "text") => void
  }) => (
    <Button
      variant={selected === type ? "default" : "outline"}
      className={`h-24 flex flex-col gap-2 ${selected === type ? "border-2 border-[#005CA9] dark:border-[#3b82f6]" : ""}`}
      onClick={() => onSelect(type)}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  )

  const calculateCameraDistance = (bbox: THREE.Box3) => {
    const size = bbox.getSize(new THREE.Vector3())
    return Math.max(size.x, size.y, size.z) * 2.5
  }

  const setView = (direction: ViewDirection) => {
    const viewer = viewerRef.current
    if (!viewer) return

    viewer.clipper.deleteAllPlanes()

    const controls = viewer.context.ifcCamera.cameraControls
    const scene = viewer.context.getScene()

    const bbox = new THREE.Box3()
    viewer.IFC.loader.ifcManager.state.models.forEach((model: any) => {
      if (model.mesh) {
        model.mesh.updateMatrixWorld(true)
        const modelBBox = new THREE.Box3().setFromObject(model.mesh)
        bbox.union(modelBBox)
      }
    })

    const distance = bbox.isEmpty() ? 50 : calculateCameraDistance(bbox)
    const center = bbox.isEmpty() ? new THREE.Vector3() : bbox.getCenter(new THREE.Vector3())

    // ✅ Décalage vertical du centre
    const size = bbox.getSize(new THREE.Vector3())
    center.z = bbox.min.z + size.z / 2 // centre vertical (au milieu de la hauteur)

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

    controls.update(true)
    viewer.context.getRenderer().render(scene, viewer.context.getCamera())
  }

  useEffect(() => {
    // Si l'outil n'est plus 'measure', réinitialiser les points et le mode
    if (activeTool !== "measure") {
      setMeasurementMode("none")
      setCurrentPoints([])

      // Nettoyer les indicateurs visuels temporaires si nécessaire
      if (viewerRef.current) {
        const scene = viewerRef.current.context.getScene()
        // Si vous avez des marqueurs temporaires pour les points en cours, vous pouvez les supprimer ici
      }
    }
  }, [activeTool])

  // Dans le useEffect qui configure les contrôles :
  useEffect(() => {
    if (!viewerRef.current?.context) return

    const viewer = viewerRef.current
    const controls = viewer.context.ifcCamera.cameraControls

    // Paramètres anti-vibration
    controls.dampingFactor = 0.25 // Plus élevé = plus stable
    controls.draggingDampingFactor = 0.25
    controls.azimuthRotateSpeed = 0.5 // Réduire la vitesse
    controls.polarRotateSpeed = 0.5
    controls.truckSpeed = 1.0
    controls.maxDistance = 1000
    controls.minDistance = 0.1

    // Activer le damping
    controls.enableDamping = true
    controls.dampingInertia = 0.95

    // Configurer le renderer pour de meilleures performances
    const renderer = viewer.context.getRenderer()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)) // Limiter le pixel ratio
    renderer.outputColorSpace = THREE.SRGBColorSpace
  }, [])

  const resetIsolation = () => {
    if (!viewerRef.current) return
    const scene = viewerRef.current.context.getScene()
    scene.traverse((object) => {
      object.visible = true
    })
    setIsIsolationActive(false)
  }

  // --- Panneau Masquer/Afficher pour les modèles chargés ---
  const toggleModelVisibility = (modelId: number, visible: boolean) => {
    if (!viewerRef.current) return

    const ifcManager = viewerRef.current.IFC.loader.ifcManager
    const model = Object.values(ifcManager.state.models).find((m) => m.modelID === modelId)

    if (model?.mesh) {
      model.mesh.visible = visible
      setLoadedModels((prev) => prev.map((m) => (m.id === modelId ? { ...m, visible } : m)))
      console.log(
        "Model URLs:",
        loadedModels.map((m) => m.url),
      )
      const scene = viewerRef.current.context.getScene()
      const camera = viewerRef.current.context.getCamera()
      viewerRef.current.context.getRenderer().render(scene, camera)
    }
  }
  const viewCubeRef = useRef<any>(null)

  useEffect(() => {
    if (!viewerRef.current?.context) return

    const viewer = viewerRef.current
    const camera = viewer.context.getCamera()
    setCamera(camera)

    const cameraControls = viewer.context?.ifcCamera?.cameraControls
    if (cameraControls) {
      setControls(cameraControls)

      cameraControls.mouseButtons.left = CameraControls.ACTION.TRUCK
      cameraControls.mouseButtons.right = CameraControls.ACTION.ROTATE

      const updateViewCube = () => {
        if (!viewCubeRef.current) return

        // Synchroniser la rotation du ViewCube avec celle de la caméra
        viewCubeRef.current.setQuaternion(camera.quaternion)
      }

      // Ajouter l'écouteur d'événements
      cameraControls.addEventListener("control", updateViewCube)
      cameraControls.addEventListener("update", updateViewCube)

      return () => {
        cameraControls.removeEventListener("control", updateViewCube)
        cameraControls.removeEventListener("update", updateViewCube)
      }
    }
  }, [viewerRef.current])

  // --- Changement de style d'affichage ---
  const initialMaterials = useRef(new WeakMap<THREE.Object3D, THREE.Material | THREE.Material[]>())
  const mainCameraRef = useRef<any>(null)

  // Fonction pour gérer les changements de vue

  const setViewStyleMode = (style: "shaded" | "wireframe" | "hidden-line" | null) => {
    if (!viewerRef.current) return

    const scene = viewerRef.current.context.getScene()

    // Réinitialisation si le style est déjà actif
    if (activeStyle === style) {
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const original = initialMaterials.current.get(object)

          if (original) {
            // Restauration directe du matériau original
            object.material = original

            // Important: pour les modèles IFC, parfois besoin de forcer la mise à jour
            object.material.needsUpdate = true
            if (Array.isArray(object.material)) {
              object.material.forEach((m) => (m.needsUpdate = true))
            }
          }

          // Nettoyage des lignes
          const edges = object.children.filter((child) => child instanceof THREE.LineSegments)
          edges.forEach((edge) => object.remove(edge))
        }
      })
      setActiveStyle(null)
      return
    }

    // Application du nouveau style
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Sauvegarde du matériau original seulement si pas déjà fait
        if (!initialMaterials.current.has(object)) {
          initialMaterials.current.set(object, object.material)
        }

        // Nettoyage des anciennes lignes
        const edges = object.children.filter((child) => child instanceof THREE.LineSegments)
        edges.forEach((edge) => object.remove(edge))

        // Création du nouveau matériau
        const createNewMaterial = () => {
          switch (style) {
            case "shaded":
              return new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: false })
            case "wireframe":
              return new THREE.MeshBasicMaterial({ wireframe: true, color: 0x000000 })
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

        // Ajout des edges pour le mode hidden-line
        if (style === "hidden-line") {
          const edgesGeometry = new THREE.EdgesGeometry(object.geometry)
          const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 })
          const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial)
          object.add(edges)
        }
      }
    })

    setActiveStyle(style)
  }

  // Gestionnaire pour les mesures complétées
  const handleMeasurementComplete = (measurement: Measurement) => {
    setMeasurements((prev) => [...prev, measurement])
  }

  // Gestionnaire pour effacer toutes les mesures
  const handleClearMeasurements = () => {
    if (!viewerRef.current) return

    const scene = viewerRef.current.context.getScene()
    const renderer = viewerRef.current.context.getRenderer("css2d")

    // Nettoyage en une seule passe
    const toRemove = []

    scene.traverse((object) => {
      if (object instanceof THREE.Line || object instanceof CSS2DObject) {
        toRemove.push(object)

        // Suppression spécifique pour CSS2D
        if (object instanceof CSS2DObject && object.element.parentNode) {
          object.element.parentNode.removeChild(object.element)
        }
      }
    })

    toRemove.forEach((obj) => scene.remove(obj))

    // Nettoyage forcé du renderer CSS2D
    if (renderer) {
      renderer.domElement.innerHTML = ""
    }

    setMeasurements([])
  }

  const object3D = new THREE.Object3D() // Exemple d'objet 3D, remplace-le par ton objet réel
  const bbox = new THREE.Box3().setFromObject(object3D) // Calcule la boîte de délimitation autour de l'objet

  // Définir la position de la caméra (initialisation si pas déjà défini)
  const position = new THREE.Vector3() // Assurer que `position` est défini
  const up = new THREE.Vector3(0, 1, 0) // Axe "up" de la caméra

  const handleIsoView = () => {
    setView("iso") // Changer la vue

    // Calculer la distance et le centre de la boîte de délimitation
    const distance = bbox.isEmpty() ? 50 : calculateCameraDistance(bbox)
    const center = bbox.isEmpty() ? new THREE.Vector3() : bbox.getCenter(new THREE.Vector3())

    // Définir la position de la caméra pour la vue iso
    position.set(center.x + distance * 0.7, center.y + distance * 0.7, center.z + distance * 0.7)
    up.set(0, 1, 0) // L'axe "up" reste inchangé
  }

  useEffect(() => {
    return () => {
      if (jobPollingInterval) {
        clearInterval(jobPollingInterval)
      }
    }
  }, [jobPollingInterval])

  const projectId = searchParams.get("projectId")
  if (!projectId) {
    setError("Project ID manquant")
    return
  }

  return (
    <div className="flex h-screen  dark:bg-gray-900 pt-20">
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
          onClick={() => {
            setActiveTool(activeTool === "section" ? null : "section")
          }}
          title="Plan de coupe"
          className={
            activeTool === "section"
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
              // Si déjà actif, désactiver
              setActiveTool(null)
              setMeasurementMode("none")
            } else {
              // Sinon, activer l'outil de mesure
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
  variant={activeTool =="notes" ? "default" : "ghost"}
  size="icon"
   onClick={() => toggleTool("notes")}
  title="Notes"
  className={`relative ${
    activeTool =="notes"
         ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
              : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
  }`}
>
  <ClipboardList className="h-5 w-5" />
  {todosCount > 0 && (
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
   className={`relative ${
    activeTool =="comment"
         ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white"
              : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
  }`}
>
  <MessageSquare className="h-5 w-5" />
</Button>
        <Button
          variant={activeStyle === "shaded" ? "default" : "ghost"}
          size="icon"
          onClick={() => setViewStyleMode("shaded")}
          title="Ombré"
          className={`relative ${activeStyle === "shaded" ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white" : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"}`}
        >
         <img 
    src="/images/LigneCaché.png" 
    alt="Icône ombrée" 
    className="h-6 w-6"
  />
        </Button>

        <Button
          variant={activeStyle === "wireframe" ? "default" : "ghost"}
          size="icon"
          onClick={() => setViewStyleMode("wireframe")}
          title="Image filaire"
          className={`relative ${activeStyle === "wireframe" ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white" : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"}`}
        >
          <img 
    src="/images/Image-Filaire.png" 
    alt="Image filaire" 
    className="h-6 w-6"
  />
        </Button>

        <Button
          variant={activeStyle === "hidden-line" ? "default" : "ghost"}
          size="icon"
          onClick={() => setViewStyleMode("hidden-line")}
          title="Ligne cachée"
          className={`relative ${activeStyle === "hidden-line" ? "bg-[#005CA9] dark:bg-[#3b82f6] text-white" : "text-gray-700 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"}`}
        >
             <img 
    src="/images/Ligne cachée.png" 
    alt="Ligne cachée" 
    className="h-6 w-6"
  />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            if (typeof window.todoManager?.exportBCF === "function") {
              window.todoManager.exportBCF()
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
            onClick={resetIsolation}
            title="Réinitialiser l'isolation"
            className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
          >
            <EyeOff className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Zone principale du visualiseur */}
      <div className="flex-1 relative">
        <div
          ref={containerRef}
          className="absolute inset-0 bg-white dark:bg-gray-800"
          style={{ pointerEvents: loading ? "none" : "auto" }}
        />
        <div className="absolute top-4 right-4 flex flex-col gap-3 z-20">
          {/* Bouton Iso View */}
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
        {viewerRef.current && (
          <SectionTool
            viewer={viewerRef.current}
            containerRef={containerRef}
            isActive={activeTool === "section"}
            onSectionCreated={(plane) => {
              console.log("Nouveau plan de coupe créé:", plane)
              // Vous pouvez faire des actions supplémentaires ici
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
                Mesure d'angle
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

        <TodoManager
          viewerRef={viewerRef}
          user={user}
          toast={toast}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
        />

        <AnnotationSystem
          viewerRef={viewerRef}
          containerRef={containerRef}
          activeTool={activeTool}
          camera={camera}
          controls={controls}
          user={user}
          projectId={projectId}
        />

        {/* Panneau Masquer/Afficher pour les modèles chargés */}
        {activeTool === "hide" && <ModelList />}
        {error && (
          <Alert className="absolute bottom-4 left-4 w-auto z-10 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <AlertDescription className="text-red-600 dark:text-red-400">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
