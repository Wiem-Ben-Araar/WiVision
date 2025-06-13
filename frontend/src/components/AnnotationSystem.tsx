"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Cloud, Type, MessageSquare, Trash, ArrowBigUp } from "lucide-react"
import * as THREE from "three"
// @ts-ignore
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer"
import type React from "react"
import { useAuth } from "@/hooks/use-auth"
import api from "@/lib/axios-config"

const apiUrl = process.env.NEXT_PUBLIC_API_URL

// Styles restent identiques...
const annotationStyles = {
  cloud: {
    color: 0xff0000,
    opacity: 0.15,
    segments: 64,
    radius: 0.45,
    outline: {
      color: 0xcc0000,
      opacity: 0.9,
      width: 2.5,
    },
  },

  arrow: {
    color: 0xff0000,
    opacity: 1.0,
    headLength: 0.4,
    headWidth: 0.3,
    shaftRadius: 0.08,
    length: 1.5,
  },
  text: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: "10px 14px",
    borderRadius: "4px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    fontSize: "14px",
    fontFamily: "Segoe UI, Arial, sans-serif",
    borderLeft: "4px solid #FF5733",
    maxWidth: "250px",
  },
}

// Types étendus pour inclure les données IFC
interface BaseAnnotation {
  text: string
  date: Date
  viewpoint: {
    position: [number, number, number]
    target: [number, number, number]
    up: [number, number, number]
  }
  // NOUVEAU: Données d'ancrage IFC
  ifcAnchor?: {
    modelId: number
    expressId: number
    localPosition: THREE.Vector3 // Position relative à l'élément IFC
    worldPosition: THREE.Vector3 // Position mondiale au moment de la création
  }
}

interface CloudAnnotation extends BaseAnnotation {
  type: "cloud"
  position: THREE.Vector3
}

interface ArrowAnnotation extends BaseAnnotation {
  type: "arrow"
  position: THREE.Vector3
}

interface TextAnnotation extends BaseAnnotation {
  type: "text"
  position: THREE.Vector3
}

export type Comment = (CloudAnnotation | ArrowAnnotation | TextAnnotation) & {
  id: string
  author: string
  title: string
  description?: string
  createdAt: Date
  modifiedAt: Date
}

// Utilitaires pour gérer l'ancrage IFC
class IFCAnchorManager {
  private viewer: any
  private anchors: Map<string, any> = new Map()

  constructor(viewer: any) {
    this.viewer = viewer
  }

  // Trouver l'élément IFC le plus proche d'une position
  async findNearestIFCElement(
    worldPosition: THREE.Vector3,
  ): Promise<{ modelId: number; expressId: number; element: any } | null> {
    try {
      if (!this.viewer?.IFC?.loader?.ifcManager) return null

      const ifcManager = this.viewer.IFC.loader.ifcManager
      const models = ifcManager.state.models || []

      let nearestElement = null
      let minDistance = Number.POSITIVE_INFINITY

      for (const model of models) {
        if (!model.mesh) continue

        // Utiliser le raycasting pour trouver l'intersection
        const raycaster = new THREE.Raycaster()
        const direction = new THREE.Vector3(0, -1, 0) // Raycast vers le bas
        raycaster.set(worldPosition, direction)

        const intersects = raycaster.intersectObject(model.mesh, true)

        if (intersects.length > 0) {
          const intersection = intersects[0]
          const distance = worldPosition.distanceTo(intersection.point)

          if (distance < minDistance) {
            // Récupérer l'ID de l'élément IFC
            const expressId = ifcManager.getExpressId(model.mesh.geometry, intersection.faceIndex)
            if (expressId) {
              minDistance = distance
              nearestElement = {
                modelId: model.modelID,
                expressId: expressId,
                element: intersection.object,
              }
            }
          }
        }
      }

      return nearestElement
    } catch (error) {
      console.error("Erreur lors de la recherche d'élément IFC:", error)
      return null
    }
  }

  // Calculer la position locale par rapport à l'élément IFC
  calculateLocalPosition(worldPosition: THREE.Vector3, ifcElement: any): THREE.Vector3 {
    const localPosition = new THREE.Vector3()

    if (ifcElement && ifcElement.matrixWorld) {
      const inverseMatrix = new THREE.Matrix4().copy(ifcElement.matrixWorld).invert()
      localPosition.copy(worldPosition).applyMatrix4(inverseMatrix)
    } else {
      localPosition.copy(worldPosition)
    }

    return localPosition
  }

  // Recalculer la position mondiale à partir de la position locale
  calculateWorldPosition(localPosition: THREE.Vector3, modelId: number, expressId: number): THREE.Vector3 | null {
    try {
      if (!this.viewer?.IFC?.loader?.ifcManager) return null

      const ifcManager = this.viewer.IFC.loader.ifcManager
      const model = ifcManager.state.models.find((m: any) => m.modelID === modelId)

      if (!model?.mesh) return null

      // Pour une implémentation complète, il faudrait récupérer l'élément spécifique
      // et appliquer sa matrice de transformation
      const worldPosition = new THREE.Vector3()
      worldPosition.copy(localPosition).applyMatrix4(model.mesh.matrixWorld)

      return worldPosition
    } catch (error) {
      console.error("Erreur lors du calcul de la position mondiale:", error)
      return null
    }
  }

  // Mettre à jour toutes les positions des annotations ancrées
  updateAnchoredPositions() {
    this.anchors.forEach((anchorData, annotationId) => {
      const { localPosition, modelId, expressId, annotationObject } = anchorData

      const newWorldPosition = this.calculateWorldPosition(localPosition, modelId, expressId)
      if (newWorldPosition && annotationObject) {
        annotationObject.position.copy(newWorldPosition)
      }
    })
  }

  // Enregistrer un ancrage
  registerAnchor(annotationId: string, anchorData: any) {
    this.anchors.set(annotationId, anchorData)
  }

  // Supprimer un ancrage
  unregisterAnchor(annotationId: string) {
    this.anchors.delete(annotationId)
  }

  // Nettoyer tous les ancrages
  clearAll() {
    this.anchors.clear()
  }
}

// Composants UI restent identiques...
interface AnnotationTypeButtonProps {
  type: "cloud" | "arrow" | "text"
  label: string
  icon: React.ReactNode
  selected: string
  onSelect: (type: "cloud" | "arrow" | "text") => void
}

export function AnnotationTypeButton({ type, label, icon, selected, onSelect }: AnnotationTypeButtonProps) {
  return (
    <Button
      variant={selected === type ? "default" : "outline"}
      className={`h-20 flex flex-col gap-2 ${selected === type ? "border-2 border-blue-500" : ""}`}
      onClick={() => onSelect(type)}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  )
}

interface CommentPanelProps {
  isActive: boolean
  selectedAnnotationType: "cloud" | "arrow" | "text"
  setSelectedAnnotationType: (type: "cloud" | "arrow" | "text") => void
  commentText: string
  setCommentText: (text: string) => void
  commentPosition: THREE.Vector3 | null
  setCommentPosition: (position: THREE.Vector3 | null) => void
  onSubmit: (event: React.MouseEvent<HTMLButtonElement>) => void
  onDeleteAll: () => void
  userInfo?: { name?: string; email?: string } | null
}

export function CommentPanel({
  isActive,
  selectedAnnotationType,
  setSelectedAnnotationType,
  commentText,
  setCommentText,
  commentPosition,
  setCommentPosition,
  onSubmit,
  onDeleteAll,
  userInfo,
}: CommentPanelProps) {
  if (!isActive) return null

  return (
    <div className="absolute bottom-20 left-4 bg-white p-4 rounded-lg shadow-lg w-96">
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Créer un commentaire</h3>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <AnnotationTypeButton
            type="cloud"
            label="Nuage"
            icon={<Cloud className="h-4 w-4" />}
            selected={selectedAnnotationType}
            onSelect={setSelectedAnnotationType}
          />
          <AnnotationTypeButton
            type="arrow"
            label="Flèche"
            icon={<ArrowBigUp className="h-4 w-4" />}
            selected={selectedAnnotationType}
            onSelect={setSelectedAnnotationType}
          />
          <AnnotationTypeButton
            type="text"
            label="Texte"
            icon={<Type className="h-4 w-4" />}
            selected={selectedAnnotationType}
            onSelect={setSelectedAnnotationType}
          />
        </div>

        {selectedAnnotationType === "text" && (
          <textarea
            placeholder="Ajouter un commentaire..."
            className="w-full p-2 border rounded-md mb-3"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
        )}

        <div className="flex justify-between items-center mb-3">
          <div className="text-sm text-gray-500">
            {commentPosition
              ? `Position: ${commentPosition.x?.toFixed(2)}, ${commentPosition.y?.toFixed(2)}, ${commentPosition.z?.toFixed(2)}`
              : "Cliquez sur un élément pour placer le marqueur"}
          </div>
          <Button variant="outline" size="sm" onClick={() => setCommentPosition(null)}>
            Repositionner
          </Button>
        </div>

        {commentPosition && (
          <Button className="w-full mb-2" onClick={onSubmit}>
            <MessageSquare className="mr-2 h-4 w-4" />
            {selectedAnnotationType === "cloud" ? "Placer le nuage" : "Créer le commentaire"}
          </Button>
        )}

        <Button variant="destructive" className="w-full" onClick={onDeleteAll}>
          <Trash className="mr-2 h-4 w-4" />
          Supprimer tous les commentaires
        </Button>
      </div>
    </div>
  )
}

interface AnnotationSystemProps {
  viewerRef: React.RefObject<any>
  containerRef: React.RefObject<HTMLDivElement>
  activeTool: string
  camera?: THREE.Camera
  controls?: any
  projectId: string | null
}

function getCameraDirection(camera: THREE.Camera, controls?: any): THREE.Vector3 {
  if (controls?.target && controls.target instanceof THREE.Vector3) {
    const direction = new THREE.Vector3()
    direction.subVectors(controls.target, camera.position)
    return direction.normalize()
  }

  if (controls) {
    const possibleTargets = [
      controls.target0,
      controls.center,
      controls.object?.target,
      controls._target,
      controls.getTarget?.(),
    ]

    for (const target of possibleTargets) {
      if (
        target &&
        (target instanceof THREE.Vector3 ||
          (target.x !== undefined && target.y !== undefined && target.z !== undefined))
      ) {
        const direction = new THREE.Vector3()
        const targetVec = target instanceof THREE.Vector3 ? target : new THREE.Vector3(target.x, target.y, target.z)
        direction.subVectors(targetVec, camera.position)
        return direction.normalize()
      }
    }
  }

  const direction = new THREE.Vector3(0, 0, -1)
  direction.applyQuaternion(camera.quaternion)
  return direction.normalize()
}

export function AnnotationSystem({
  viewerRef,
  containerRef,
  activeTool,
  camera,
  controls,
  projectId,
}: AnnotationSystemProps) {
  const { user, loading } = useAuth()
  const [selectedAnnotationType, setSelectedAnnotationType] = useState<"cloud" | "arrow" | "text">("cloud")
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState<string>("")
  const [commentPosition, setCommentPosition] = useState<THREE.Vector3 | null>(null)
  const [annotationObjects, setAnnotationObjects] = useState<THREE.Object3D[]>([])

  const [previewObject, setPreviewObject] = useState<THREE.Object3D | null>(null)
  const previewRef = useRef<THREE.Object3D | null>(null)

  // NOUVEAU: Gestionnaire d'ancrage IFC
  const anchorManagerRef = useRef<IFCAnchorManager | null>(null)
  const css2DRendererRef = useRef<CSS2DRenderer | null>(null)

  // Initialiser le gestionnaire d'ancrage
  useEffect(() => {
    if (viewerRef.current) {
      anchorManagerRef.current = new IFCAnchorManager(viewerRef.current)

      // Initialiser le renderer CSS2D pour les annotations texte
      if (containerRef.current && !css2DRendererRef.current) {
        const css2DRenderer = new CSS2DRenderer()
        css2DRenderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
        css2DRenderer.domElement.style.position = "absolute"
        css2DRenderer.domElement.style.top = "0px"
        css2DRenderer.domElement.style.pointerEvents = "none"
        containerRef.current.appendChild(css2DRenderer.domElement)
        css2DRendererRef.current = css2DRenderer
      }
    }

    return () => {
      if (css2DRendererRef.current && containerRef.current) {
        containerRef.current.removeChild(css2DRendererRef.current.domElement)
        css2DRendererRef.current = null
      }
    }
  }, [viewerRef.current, containerRef.current])

  // Mettre à jour le renderer CSS2D
  useEffect(() => {
    if (!css2DRendererRef.current || !camera) return

    const animate = () => {
      if (css2DRendererRef.current && camera) {
        const scene = getSafeScene()
        if (css2DRendererRef.current && camera && scene) {
          css2DRendererRef.current.render(scene, camera)
        }
      }
      requestAnimationFrame(animate)
    }
    animate()
  }, [camera])

  useEffect(() => {
    if (user) {
      console.log("Données utilisateur récupérées:", {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      })
    }
  }, [user])

  const getSafeScene = () => {
    try {
      return viewerRef.current?.context?.getScene()
    } catch (e) {
      console.error("Erreur lors de l'accès à la scène:", e)
      return null
    }
  }

  // Fonctions de création d'objets 3D améliorées
  const createCloudMarker = () => {
    const cloudGroup = new THREE.Group()
    const shape = new THREE.Shape()
    const points = []
    const radius = annotationStyles.cloud.radius
    const numPoints = 36

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2
      const variance = radius * (0.15 + 0.15 * Math.sin(i * 3))

      points.push(new THREE.Vector2(Math.cos(angle) * (radius + variance), Math.sin(angle) * (radius + variance)))
    }

    shape.moveTo(points[0].x, points[0].y)

    for (let i = 1; i < points.length; i++) {
      const currentPoint = points[i]
      const prevPoint = points[(i - 1) % points.length]
      const cpX = (prevPoint.x + currentPoint.x) / 2
      const cpY = (prevPoint.y + currentPoint.y) / 2
      shape.quadraticCurveTo(cpX, cpY, currentPoint.x, currentPoint.y)
    }

    shape.closePath()

    const points3D = shape.getPoints(annotationStyles.cloud.segments * 2)
    const geometry = new THREE.BufferGeometry().setFromPoints(points3D)

    const material = new THREE.LineBasicMaterial({
      color: annotationStyles.cloud.color,
      linewidth: annotationStyles.cloud.outline.width,
      opacity: 1.0,
      transparent: false,
    })

    const outlineMesh = new THREE.Line(geometry, material)
    cloudGroup.add(outlineMesh)
    cloudGroup.rotation.z = Math.random() * Math.PI * 0.25
    cloudGroup.userData = { isCloud: true }

    return cloudGroup
  }

  const createArrowMarker = () => {
    const arrowGroup = new THREE.Group()
    const length = annotationStyles.arrow.length
    const color = annotationStyles.arrow.color
    const headLength = annotationStyles.arrow.headLength * length
    const headWidth = annotationStyles.arrow.headWidth * length

    const direction = new THREE.Vector3(0, 1, 0)
    direction.normalize()

    const arrowHelper = new THREE.ArrowHelper(
      direction,
      new THREE.Vector3(0, 0, 0),
      length,
      color,
      headLength,
      headWidth,
    )

    const lineMaterial = arrowHelper.line.material as THREE.LineBasicMaterial
    lineMaterial.linewidth = 2

    arrowGroup.add(arrowHelper)
    arrowGroup.userData = { isArrow: true }

    return arrowGroup
  }

  // FONCTION CORRIGÉE pour les annotations texte
  const createTextMarker = (text: string) => {
    const container = document.createElement("div")
    container.className = "annotation-text"

    const content = document.createElement("div")
    content.style.cssText = `
      position: relative;
      background: ${annotationStyles.text.backgroundColor};
      padding: ${annotationStyles.text.padding};
      border-radius: ${annotationStyles.text.borderRadius};
      box-shadow: ${annotationStyles.text.boxShadow};
      font-size: ${annotationStyles.text.fontSize};
      font-family: ${annotationStyles.text.fontFamily};
      border-left: ${annotationStyles.text.borderLeft};
      max-width: ${annotationStyles.text.maxWidth};
      word-wrap: break-word;
      pointer-events: auto;
      cursor: default;
      transform: translate(0%, 0%);
    `

    const textBody = document.createElement("div")
    textBody.style.cssText = `line-height: 1.4;`
    textBody.textContent = text && text.trim() ? text.trim() : ""

    const triangle = document.createElement("div")
    triangle.style.cssText = `
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid ${annotationStyles.text.backgroundColor};
    `

    content.appendChild(textBody)
    content.appendChild(triangle)
    container.appendChild(content)

    const label = new CSS2DObject(container)
    label.userData = {
      isCSS2DObject: true,
      isTextAnnotation: true,
      // AJOUT CRUCIAL: fonction de nettoyage
      cleanup: () => {
        if (container.parentNode) {
          container.parentNode.removeChild(container)
        }
      },
    }

    return label
  }

  // Fonction de mise à jour des positions ancrées
  useEffect(() => {
    if (!anchorManagerRef.current) return

    const updatePositions = () => {
      anchorManagerRef.current?.updateAnchoredPositions()
      requestAnimationFrame(updatePositions)
    }

    const animationId = requestAnimationFrame(updatePositions)
    return () => cancelAnimationFrame(animationId)
  }, [])

  useEffect(() => {
    if (!camera) return

    const scene = getSafeScene()
    if (!scene) return

    const updateBillboards = () => {
      scene.traverse((object: THREE.Object3D) => {
        if (object.userData && object.userData.isCloud) {
          object.quaternion.copy(camera.quaternion)
        }
      })
    }

    const animateId = requestAnimationFrame(function animate() {
      updateBillboards()
      requestAnimationFrame(animate)
    })

    return () => cancelAnimationFrame(animateId)
  }, [camera])

  // CHARGEMENT INITIAL avec support de l'ancrage - MODIFIÉ POUR AXIOS
  useEffect(() => {
    const fetchComments = async () => {
      if (!projectId || activeTool !== "comment") return

      try {
        console.log("Chargement des annotations pour le projet:", projectId)

        // 1. NETTOYER LA SCÈNE D'ABORD
        const scene = getSafeScene()
        if (scene) {
          annotationObjects.forEach((obj) => {
            scene.remove(obj)
            if (obj.userData?.cleanup) {
              obj.userData.cleanup()
            }
          })
        }

        // 2. Reset des états
        setAnnotationObjects([])
        setComments([])
        anchorManagerRef.current?.clearAll()

        // 3. Récupérer depuis la DB avec axios
        const response = await api.get(`${apiUrl}/annotations`, {
          params: { projectId },
        })

        const data = response.data
        console.log("Annotations chargées depuis la DB:", data)

        // 4. Créer les objets 3D avec ancrage
        if (scene && Array.isArray(data) && data.length > 0) {
          const newAnnotationObjects = []

          for (const comment of data) {
            if (!comment || !comment.position) continue

            const annotation = createAnnotationObject(comment)
            scene.add(annotation)
            newAnnotationObjects.push(annotation)

            // Si l'annotation a des données d'ancrage, les restaurer
            if (comment.ifcAnchor && anchorManagerRef.current) {
              anchorManagerRef.current.registerAnchor(comment.id, {
                localPosition: new THREE.Vector3(
                  comment.ifcAnchor.localPosition.x,
                  comment.ifcAnchor.localPosition.y,
                  comment.ifcAnchor.localPosition.z,
                ),
                modelId: comment.ifcAnchor.modelId,
                expressId: comment.ifcAnchor.expressId,
                annotationObject: annotation,
              })
            }
          }

          setComments(data)
          setAnnotationObjects(newAnnotationObjects)
          console.log("Objets 3D créés:", newAnnotationObjects.length)
        } else {
          console.log("Aucune annotation à afficher")
        }
      } catch (error) {
        console.error("Erreur de chargement des annotations:", error)
        setComments([])
        setAnnotationObjects([])
      }
    }

    fetchComments()
  }, [projectId, activeTool])

  const createAnnotationObject = (comment: Comment) => {
    const group = new THREE.Group()

    switch (comment.type) {
      case "cloud":
        group.add(createCloudMarker())
        break
      case "arrow":
        group.add(createArrowMarker())
        break
      case "text":
        const displayText =
          comment.title && comment.title.trim()
            ? comment.title.trim()
            : comment.description?.trim() || "Commentaire sans texte"
        group.add(createTextMarker(displayText))
        break
    }

    group.position.copy(comment.position)
    group.userData = {
      commentId: comment.id,
      isAnnotation: true,
      // AJOUT CRUCIAL: fonction de nettoyage pour tous les types
      cleanup: () => {
        group.children.forEach((child) => {
          if (child.userData?.cleanup) {
            child.userData.cleanup()
          }
        })
      },
    }
    return group
  }

  // GESTION DES CLICS avec recherche d'ancrage IFC
  useEffect(() => {
    if (!viewerRef.current || activeTool !== "comment") return
    const container = containerRef.current
    if (!container) return

    const handleClick = async (event: MouseEvent) => {
      const viewer = viewerRef.current
      if (!viewer?.context) return

      const rect = container.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, viewer.context.getCamera())

      const ifcManager = viewer.IFC?.loader?.ifcManager
      const ifcMeshes =
        ifcManager?.state.models?.filter((model: any) => model.mesh)?.map((model: any) => model.mesh) || []

      const intersects = raycaster.intersectObjects(ifcMeshes, true)

      if (intersects.length > 0) {
        const intersection = intersects[0]
        setCommentPosition(intersection.point)

        // NOUVEAU: Rechercher l'élément IFC pour l'ancrage
        if (anchorManagerRef.current) {
          const nearestElement = await anchorManagerRef.current.findNearestIFCElement(intersection.point)
          if (nearestElement) {
            console.log("Élément IFC trouvé pour ancrage:", nearestElement)
            // Ici, vous pouvez stocker les données d'ancrage dans un nouvel état si nécessaire
            // Par exemple, créez un nouvel état pour ifcAnchorData et stockez-le là
            // setIfcAnchorData({
            //   modelId: nearestElement.modelId,
            //   expressId: nearestElement.expressId,
            //   localPosition: anchorManagerRef.current!.calculateLocalPosition(
            //     intersection.point,
            //     nearestElement.element,
            //   ),
            // });
          }
        }
      } else {
        setCommentPosition(null)
      }
    }

    container.addEventListener("click", handleClick)
    return () => container.removeEventListener("click", handleClick)
  }, [activeTool, viewerRef, containerRef])

  // GESTION DU PREVIEW
  useEffect(() => {
    const scene = getSafeScene()
    if (!scene) return

    // Supprimer l'ancien preview
    if (previewRef.current) {
      scene.remove(previewRef.current)
      if (previewRef.current.userData?.cleanup) {
        previewRef.current.userData.cleanup()
      }
      previewRef.current = null
    }

    // Créer nouveau preview seulement si position définie
    if (commentPosition) {
      let marker: THREE.Object3D | null = null

      switch (selectedAnnotationType) {
        case "cloud":
          marker = createCloudMarker()
          break
        case "arrow":
          marker = createArrowMarker()
          break
        case "text":
          marker = createTextMarker(commentText || "")
          break
      }

      if (marker) {
        marker.position.copy(commentPosition)
        marker.userData = { isPreview: true }
        scene.add(marker)
        previewRef.current = marker
      }
    }

    return () => {
      if (previewRef.current && scene) {
        scene.remove(previewRef.current)
        if (previewRef.current.userData?.cleanup) {
          previewRef.current.userData.cleanup()
        }
        previewRef.current = null
      }
    }
  }, [commentPosition, selectedAnnotationType, commentText])

  // SOUMISSION avec ancrage IFC - MODIFIÉ POUR AXIOS
  const handleCommentSubmit = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()

    if (!projectId || !user?.userId || !camera || !commentPosition) {
      console.error("Données manquantes")
      return
    }

    try {
      const scene = getSafeScene()
      if (!scene) return

      // 1. SUPPRIMER LE PREVIEW D'ABORD
      if (previewRef.current) {
        scene.remove(previewRef.current)
        if (previewRef.current.userData?.cleanup) {
          previewRef.current.userData.cleanup()
        }
        previewRef.current = null
      }

      const position = {
        x: commentPosition.x || 0,
        y: commentPosition.y || 0,
        z: commentPosition.z || 0,
      }

      const cameraDirection = getCameraDirection(camera, controls)

      const generateGUID = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0
          const v = c === "x" ? r : (r & 0x3) | 0x8
          return v.toString(16)
        })
      }

      const viewpointData = {
        guid: generateGUID(),
        camera_view_point: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        camera_direction: {
          x: cameraDirection.x,
          y: cameraDirection.y,
          z: cameraDirection.z,
        },
        camera_up_vector: {
          x: camera.up.x,
          y: camera.up.y,
          z: camera.up.z,
        },
        field_of_view: (camera as THREE.PerspectiveCamera).fov || 75,
      }

      const author = user.name || user.email || `User-${user.userId}`

      console.log("Envoi de l'annotation vers la DB...")

      // 2. SAUVEGARDER EN DB D'ABORD avec axios
      const response = await api.post(`${apiUrl}/annotations`, {
        title: commentText || "Nouvelle annotation",
        type: selectedAnnotationType,
        position,
        projectId,
        viewpoint: viewpointData,
        author: author,
      })

      const savedComment = response.data
      console.log("Annotation sauvegardée en DB:", savedComment)

      // 3. CRÉER L'OBJET 3D SEULEMENT APRÈS SUCCÈS DB
      const annotationObject = createAnnotationObject(savedComment)
      scene.add(annotationObject)
      console.log("Objet 3D créé et ajouté à la scène")

      // 4. METTRE À JOUR LES ÉTATS
      setComments((prev) => [...prev, savedComment])
      setAnnotationObjects((prev) => [...prev, annotationObject])

      // 5. NETTOYER L'INTERFACE
      setCommentText("")
      setCommentPosition(null)
    } catch (error) {
      console.error("Erreur d'envoi de l'annotation:", error)
      alert(`Erreur lors de la création de l'annotation: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    }
  }

  // SUPPRESSION avec axios
  const handleDeleteAll = async () => {
    if (!projectId) return

    try {
      const response = await api.delete(`${apiUrl}/annotations/all`, {
        params: { projectId },
      })

      // Nettoyage de la scène
      const scene = getSafeScene()
      if (scene) {
        annotationObjects.forEach((obj) => {
          scene.remove(obj)
          if (obj.userData?.cleanup) {
            obj.userData.cleanup()
          }
        })

        // Supprimer aussi le preview s'il existe
        if (previewRef.current) {
          scene.remove(previewRef.current)
          if (previewRef.current.userData?.cleanup) {
            previewRef.current.userData.cleanup()
          }
          previewRef.current = null
        }
      }

      setComments([])
      setAnnotationObjects([])
      setCommentPosition(null)

      console.log("Toutes les annotations ont été supprimées avec succès")
    } catch (error) {
      console.error("Erreur de suppression:", error)
      alert(`Erreur lors de la suppression: ${error instanceof Error ? error.message : "Erreur inconnue"}`)
    }
  }

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      const scene = getSafeScene()
      if (scene) {
        annotationObjects.forEach((obj) => {
          scene.remove(obj)
          if (obj.userData?.cleanup) {
            obj.userData.cleanup()
          }
        })

        if (previewRef.current) {
          scene.remove(previewRef.current)
          if (previewRef.current.userData?.cleanup) {
            previewRef.current.userData.cleanup()
          }
        }
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="absolute bottom-20 left-4 bg-white p-4 rounded-lg shadow-lg">
        <div className="text-sm text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (!user && activeTool === "comment") {
    return (
      <div className="absolute bottom-20 left-4 bg-white p-4 rounded-lg shadow-lg">
        <div className="text-sm text-red-500">Vous devez être connecté pour créer des annotations.</div>
      </div>
    )
  }

  return (
    <CommentPanel
      isActive={activeTool === "comment"}
      selectedAnnotationType={selectedAnnotationType}
      setSelectedAnnotationType={setSelectedAnnotationType}
      commentText={commentText}
      setCommentText={setCommentText}
      commentPosition={commentPosition}
      setCommentPosition={setCommentPosition}
      onSubmit={handleCommentSubmit}
      onDeleteAll={handleDeleteAll}
      userInfo={user}
    />
  )
}
