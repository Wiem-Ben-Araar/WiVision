"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User2, Trash2, X, Plus } from "lucide-react"
import * as THREE from "three"
import JSZip from "jszip"
import axios from "axios"
import { useAuth } from "@/hooks/use-auth"
// Modifié: Nous n'importons plus ProjectMembers comme un composant
// import ProjectMembers from "./ProjectMembers"

// Interface Todo
export interface Todo {
  _id: string
  id?: string
  title: string
  description?: string
  status: "new" | "in-progress" | "waiting" | "done" | "closed"
  priority: "Critical" | "Normal" | "Minor" | "On hold" | "Undefined" | "Medium";
  createdBy: string
  userId?: string
  assignedTo?: string
  project: string
  createdAt: Date
  updatedAt?: Date
  screenshot?: string
  viewpoint?: {
    _id: string
    guid: string
    camera_view_point: { x: number; y: number; z: number }
    camera_direction: { x: number; y: number; z: number }
    camera_up_vector: { x: number; y: number; z: number }
    field_of_view: number
    project: string
    createdBy: string
  } | null
}

// Fonction utilitaire pour obtenir le nom d'utilisateur à partir de son ID
// Modifié: Cette fonction utilise maintenant projectMembers passé en paramètre
const getUserNameById = (userId: string, members: any[] = []) => {
  if (!userId) return "Unassigned"

  // Chercher le membre dans la liste des membres du projet
  const member = members.find((m) => m._id === userId || m.id === userId || m.userId === userId)

  // Retourner le nom du membre s'il existe, sinon retourner l'ID
  if (member) {
    return member.name || member.username || member.email?.split("@")[0] || userId
  }

  // Si aucun membre ne correspond, retourner l'ID tel quel
  return userId
}

// Sous-composant TodoPanel
function TodoPanel({
  todos,
  onTodoSelect,
  onTodoDelete,
  onTodoStatusChange,
  onTodoAssign,
  activeTool,
  onCreateNote,
  projectMembers,
}: {
  todos: Todo[]
  onTodoSelect: (todo: Todo) => void
  onTodoDelete: (id: string) => void
  onTodoStatusChange: (id: string, status: Todo["status"]) => void
  onTodoAssign: (id: string, userId: string) => void
  activeTool: string | null
  onCreateNote: () => void
  projectMembers: any[]
}) {
  if (activeTool !== "todos") return null

  return (
    <div className="absolute right-4 top-20 w-96 bg-white rounded-lg shadow-lg p-4 max-h-[80vh] overflow-auto z-10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Notes</h3>
        <div className="flex gap-2 items-center">
          <Badge variant="outline">{todos.length}</Badge>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              console.log("Create Note button clicked")
              onCreateNote()
            }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle Note
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {todos.map((todo) => (
          <div
            key={todo._id || todo.id}
            className="border rounded-lg p-3 hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => onTodoSelect(todo)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-medium">{todo.title}</h4>
                <p className="text-sm text-gray-600 line-clamp-2">{todo.description}</p>
              </div>
             <Badge
  className={
    todo.status === "actif"
      ? "bg-blue-100 text-blue-800"
      : todo.status === "résolu"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800"
  }
>
  {todo.status}
</Badge>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <User2 className="h-4 w-4" />
                <Select
                  value={todo.assignedTo || ""}
                  onValueChange={(value) => onTodoAssign(todo._id || todo.id || "", value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Assigner à..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {projectMembers && projectMembers.length > 0 ? (
                        projectMembers.map((member) => (
                          <SelectItem key={member.id || member._id} value={member.id || member._id}>
                            {member.name || member.email || "Utilisateur sans nom"}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none">Aucun membre disponible</SelectItem>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={todo.status}
                  onValueChange={(value: Todo["status"]) => onTodoStatusChange(todo._id || todo.id || "", value)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
               <SelectContent>
  <SelectGroup>
    <SelectItem value="actif">Actif</SelectItem>
    <SelectItem value="résolu">Résolu</SelectItem>
    <SelectItem value="fermé">Fermé</SelectItem>
  </SelectGroup>
</SelectContent>
                </Select>

                <button
                  onClick={(e) => {
                    e.stopPropagation() // Empêche le déclenchement du onClick du parent
                    onTodoSelect(todo) // Cette ligne appelle déjà restoreTodoView
                  }}
                  className="text-blue-500 hover:text-blue-700"
                  title="Restaurer la vue"
                >
                  {/* Icône de caméra au lieu de Eye */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path>
                    <circle cx="12" cy="13" r="3"></circle>
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onTodoDelete(todo._id || todo.id || "")
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-400">
              Créé par {getUserNameById(todo.createdBy, projectMembers)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Sous-composant TodoCreationModal
function TodoCreationModal({
  isOpen,
  onClose,
  newTodo,
  setNewTodo,
  onCreateTodo,
}: {
  isOpen: boolean
  onClose: () => void
  newTodo: {
    title: string
    description: string
    priority: "Critical" | "Normal" | "Minor" | "On hold" | "Undefined" | "Medium"
  }
  setNewTodo: React.Dispatch<
    React.SetStateAction<{
      title: string
      description: string
      priority: "Critical" | "Normal" | "Minor" | "On hold" | "Undefined" | "Medium"
    }>
  >
  onCreateTodo: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Créer une Note</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                placeholder="Entrez le titre de la note"
                value={newTodo.title}
                onChange={(e) => setNewTodo((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full min-h-[100px] p-2 border rounded-md"
                placeholder="Entrez la description de la note"
                value={newTodo.description}
                onChange={(e) => setNewTodo((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="priority">Priorité</Label>
              <Select
                value={newTodo.priority}
                onValueChange={(value: "Critical" | "Normal" | "Minor" | "On hold" | "Undefined" | "Medium") =>
                  setNewTodo((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la priorité" />
                </SelectTrigger>
               <SelectContent>
  <SelectGroup>
    <SelectItem value="Critical">Critique</SelectItem>
    <SelectItem value="Normal">Normal</SelectItem>
    <SelectItem value="Medium">Moyen</SelectItem>
    <SelectItem value="Minor">Mineur</SelectItem>
    <SelectItem value="On hold">En attente</SelectItem>
    <SelectItem value="Undefined">Non défini</SelectItem>
  </SelectGroup>
</SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                console.log("Create Todo button clicked")
                onCreateTodo()
              }}
              disabled={!newTodo.title}
            >
             Créer la Note
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Composant principal TodoManager
interface TodoManagerProps {
  viewerRef: React.RefObject<any>
  session?: any
  toast: any
  activeTool?: string | null
  setActiveTool?: (tool: string | null) => void
}

// Configuration de l'API avec axios
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

export function TodoManager({ viewerRef, toast, activeTool = null, setActiveTool }: TodoManagerProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const { user, loading } = useAuth()
  const [isCreatingTodo, setIsCreatingTodo] = useState(false)
  const [projectMembers, setProjectMembers] = useState([])
  const [localActiveTool, setLocalActiveTool] = useState<string | null>(activeTool)
  const [newTodo, setNewTodo] = useState({
    title: "",
    description: "",
    priority: "Medium" as const,
  })

  // Utiliser l'état local si aucun état externe n'est fourni
  const effectiveActiveTool = activeTool !== undefined ? activeTool : localActiveTool
  const effectiveSetActiveTool = setActiveTool || setLocalActiveTool

  // Chargement initial des todos et des membres du projet
  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectId = new URLSearchParams(window.location.search).get("projectId")
        if (!projectId) {
          console.error("Project ID is missing")
          return
        }

        console.log("Fetching data for project:", projectId)

        try {
          const todosRes = await api.get(`/todos?projectId=${projectId}`)
          console.log("Todos response:", todosRes)
          setTodos(todosRes.data)
        } catch (todoError) {
          console.error("Failed to fetch todos:", todoError)
        }

        try {
          const membersRes = await api.get(`/projects/${projectId}/members`)
          console.log("Members response:", membersRes)
          setProjectMembers(membersRes.data.members || [])
        } catch (memberError) {
          console.error("Failed to fetch members:", memberError)
        }
      } catch (error) {
        console.error("Data loading error:", error)
      }
    }

    fetchData()
  }, [])

  // Fonction pour créer un nouveau todo
  const createTodo = async () => {
    if (!viewerRef.current || !newTodo.title || loading) {
      console.log("Cannot create todo:", {
        viewerExists: !!viewerRef.current,
        titleExists: !!newTodo.title,
        isLoading: loading,
      })
      return
    }

    console.log("Creating todo...")

    try {
      // Récupérer la caméra et les contrôles de la vue
      console.log("1. Getting camera and controls...")
      const camera = viewerRef.current.context.getCamera()
      console.log("Camera:", camera)

      const controls = viewerRef.current.context.ifcCamera.cameraControls
      console.log("Controls:", controls)

      // Calculer le point cible à partir des contrôles de caméra
      console.log("2. Calculating target point...")
      const target = new THREE.Vector3()
      controls.getTarget(target)
      console.log("Target:", target)

      // Vérifier l'authentification de l'utilisateur
      console.log("3. User object:", user)

      // Utiliser _id au lieu de userId si disponible
      const userId = user?._id || user?.userId || "temp-user-id"
      console.log("Using userId:", userId)

      const urlParams = new URLSearchParams(window.location.search)
      const projectId = urlParams.get("projectId")
      console.log("4. Project ID:", projectId)

      if (!projectId) {
        console.error("Project ID is missing")
        toast.error("Project ID is required. Please open a project first.")
        return
      }

      const fieldOfView = camera.fov || 45
      console.log("5. Field of view:", fieldOfView)

      const direction = {
        x: target.x - camera.position.x,
        y: target.y - camera.position.y,
        z: target.z - camera.position.z,
      }
      console.log("6. Initial direction:", direction)

      // Normaliser la direction pour une visualisation précise
      const dirLength = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z)
      console.log("7. Direction length:", dirLength)

      if (dirLength > 0) {
        direction.x /= dirLength
        direction.y /= dirLength
        direction.z /= dirLength
      }
      console.log("8. Normalized direction:", direction)

      // Préparer l'objet viewpoint
      console.log("9. Creating viewpoint object...")
      const viewpoint = {
        guid: `viewpoint-${Date.now()}`,
        camera_view_point: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        camera_direction: {
          x: direction.x,
          y: direction.y,
          z: direction.z,
        },
        camera_up_vector: {
          x: camera.up.x,
          y: camera.up.y,
          z: camera.up.z,
        },
        field_of_view: fieldOfView,
        project: projectId,
        createdBy: userId,
        createdAt: new Date(),
      }
      console.log("10. Viewpoint object:", viewpoint)

      // Capturer une image de la vue actuelle
      console.log("11. Capturing screenshot...")
      let screenshot = null

      try {
        const renderer = viewerRef.current.context.getRenderer()
        console.log("12. Renderer:", renderer)

        renderer.render(viewerRef.current.context.getScene(), camera)
        console.log("13. Render completed")

        // Vérifier si la méthode getScreenShot existe
        if (typeof viewerRef.current.context.getScreenShot === "function") {
          screenshot = viewerRef.current.context.getScreenShot(undefined, true)
          console.log("14. Screenshot captured:", screenshot ? "Success" : "Failed")
        } else {
          console.log("14. getScreenShot method not available, using alternative method")

          // Méthode alternative pour capturer une capture d'écran
          try {
            // Essayer d'utiliser toDataURL du renderer
            screenshot = renderer.domElement.toDataURL("image/png")
            console.log("15. Alternative screenshot method succeeded")
          } catch (altScreenshotError) {
            console.error("15. Alternative screenshot method failed:", altScreenshotError)
            screenshot = null
          }
        }
      } catch (screenshotError) {
        console.error("Screenshot error:", screenshotError)
        screenshot = null
      }

      // Créer directement le todo avec l'objet viewpoint intégré
      console.log("16. Preparing todo data...")
      const todoData = {
        title: newTodo.title,
        description: newTodo.description,
        status: "new",
        priority: newTodo.priority,
        userId: userId,
        createdBy: userId,
        project: projectId,
        createdAt: new Date(),
        viewpoint: viewpoint,
        screenshot: screenshot,
      }

      console.log("17. Todo data prepared:", todoData)

      try {
        console.log("18. Sending POST request to /todos")
        const response = await api.post("/todos", todoData)
        console.log("19. Todo creation response:", response)

        const savedTodo = response.data

        if (!savedTodo) {
          throw new Error("No data returned from API")
        }

        console.log("20. Todo saved successfully:", savedTodo)

        // Update the todos list with the new todo
        setTodos((prevTodos) => [...prevTodos, savedTodo])

        setIsCreatingTodo(false)
        setNewTodo({ title: "", description: "", priority: "Medium" })

        toast.success("Todo created successfully")
      } catch (apiError) {
        console.error("21. API Error:", apiError)

        if (apiError.response) {
          console.error("Response status:", apiError.response.status)
          console.error("Response data:", apiError.response.data)
        } else if (apiError.request) {
          console.error("22. No response received:", apiError.request)
        } else {
          console.error("23. Error setting up request:", apiError.message)
        }

        toast.error(`Failed to save todo: ${apiError.response?.data?.message || apiError.message}`)
      }
    } catch (error) {
      console.error("24. General error:", error)
      toast.error(`Failed to save todo: ${error.message}`)
    }
  }

  const restoreTodoView = (todo: Todo) => {
    if (!todo.viewpoint) {
      toast.error("No viewpoint data available for this todo")
      return
    }

    const { camera_view_point, camera_direction, camera_up_vector, field_of_view } = todo.viewpoint

    // Validation des données
    if (!camera_view_point || !camera_direction || !camera_up_vector) {
      toast.error("Invalid viewpoint data")
      return
    }

    // Conversion des coordonnées
    const position = new THREE.Vector3(camera_view_point.x, camera_view_point.y, camera_view_point.z)

    const direction = new THREE.Vector3(camera_direction.x, camera_direction.y, camera_direction.z)

    const up = new THREE.Vector3(camera_up_vector.x, camera_up_vector.y, camera_up_vector.z)

    // Calcul de la cible
    const target = position.clone().add(direction)

    // Animation de la caméra
    viewerRef.current.context.ifcCamera.cameraControls.setLookAt(
      position.x,
      position.y,
      position.z,
      target.x,
      target.y,
      target.z,
      true,
      1.2,
    )
  }

  // Mise à jour de handleTodoSelect pour utiliser la nouvelle fonction restoreTodoView
  const handleTodoSelect = (todo: Todo) => {
    restoreTodoView(todo)
  }

  const handleTodoStatusChange = async (todoId: string, newStatus: Todo["status"]) => {
    try {
      console.log(`Updating todo ${todoId} status to ${newStatus}`)
      const response = await api.put(`/todos/${todoId}`, { status: newStatus })
      console.log("Status update response:", response)

      setTodos((prev) => prev.map((todo) => (todo._id === todoId ? response.data : todo)))
      toast.success(`Status changed to ${newStatus}`)
    } catch (error: any) {
      console.error("Failed to update todo status:", error)
      toast.error(`Failed to update status: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleTodoAssign = async (todoId: string, userId: string) => {
    try {
      console.log(`Assigning todo ${todoId} to user ${userId}`)
      const response = await api.put(`/todos/${todoId}`, { assignedTo: userId })
      console.log("Assignment response:", response)

      setTodos((prev) => prev.map((todo) => (todo._id === todoId ? response.data : todo)))
      toast.success("Assigné avec succès")
    } catch (error: any) {
      console.error("Failed to assign todo:", error)
      toast.error(`Échec de l'assignation: ${error.response?.data?.message || error.message}`)
    }
  }

  const handleTodoDelete = async (todoId: string) => {
    const originalTodos = todos

    // Optimistic update
    setTodos((prev) => prev.filter((t) => t._id !== todoId))

    try {
      console.log(`Deleting todo ${todoId}`)
      await api.delete(`/todos/${todoId}`)
      console.log("Todo deleted successfully")

      toast.success("Supprimé avec succès !")
    } catch (error: any) {
      console.error("Failed to delete todo:", error)

      // Restore original todos on error
      setTodos(originalTodos)
      toast.error("Échec de la suppression")
    }
  }

  const exportBCF = () => {
    const zip = new JSZip();

    // Génération UUID conforme BCF
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16).toUpperCase();
        });
    };
  const mapStatusToBCF = (status: Todo["status"]) => {
    switch(status.toLowerCase()) {
      case 'actif': return 'Active';
      case 'résolu': return 'Resolved';
      case 'fermé': return 'Closed';
      default: return 'Active';
    }
  };

    // Conversion des priorités
const mapPriority = (priority: string) => {
    switch(priority) {
      case 'Critical': return 'Critical';
      case 'Normal': return 'Normal';
      case 'Medium': return 'Medium'; 
      case 'Minor': return 'Minor';
      case 'On hold': return 'On hold';
      case 'Undefined': return 'Undefined';
      default: return 'Medium';
    }
  };

    // Conversion du système de coordonnées Three.js → Revit
    const threeToRevit = (vec: THREE.Vector3) => new THREE.Vector3(
        vec.x,     // X inchangé
        -vec.z,    // Y = -Z (axe vertical inversé)
        vec.y      // Z = Y (profondeur)
    );

    // Calcul des vecteurs orthogonaux garantis
    const getOrthogonalVectors = (direction: THREE.Vector3) => {
        const revitUp = new THREE.Vector3(0, 0, 1); // Z-up dans Revit
        const right = new THREE.Vector3()
            .crossVectors(direction, revitUp)
            .normalize();
        return {
            direction: direction.normalize(),
            up: new THREE.Vector3().crossVectors(right, direction).normalize()
        };
    };

    // Fichiers obligatoires BCF
    zip.file(
        "bcf.version",
        `<?xml version="1.0" encoding="UTF-8"?>
<Version VersionId="2.1" xmlns="http://www.buildingsmart-tech.org/bcf/version_2_1/xsd">
  <DetailedVersion>2.1</DetailedVersion>
</Version>`
    );

    const projectId = generateUUID();
    zip.file(
        "project.bcfp",
        `<?xml version="1.0" encoding="UTF-8"?>
<ProjectExtension xmlns="http://www.buildingsmart-tech.org/bcf/version_2_1/xsd">
  <Project ProjectId="${projectId}">
    <Name>${projectMembers?.[0]?.project?.name || "Revit Project"}</Name>
  </Project>
</ProjectExtension>`
    );

    // Génération des topics
    todos.slice(0, 10).forEach((todo) => {
        const topicGuid = generateUUID();
        const topicFolder = zip.folder(topicGuid);
        if (!topicFolder) return;

        // Données de vue
        const position = threeToRevit(new THREE.Vector3(
            todo.viewpoint?.camera_view_point.x || 0,
            todo.viewpoint?.camera_view_point.y || 0,
            todo.viewpoint?.camera_view_point.z || 0
        ));

        const direction = threeToRevit(new THREE.Vector3(
            todo.viewpoint?.camera_direction.x || 0,
            todo.viewpoint?.camera_direction.y || 0,
            todo.viewpoint?.camera_direction.z || 0
        ));

        // Calcul automatique du point cible central
        const targetDistance = Math.max(position.length() * 0.7, 2.0);
        const target = position.clone().add(direction.normalize().multiplyScalar(targetDistance));

        // Vecteurs orthogonaux
        const { direction: finalDirection, up: finalUp } = getOrthogonalVectors(
            target.clone().sub(position).normalize()
        );

        // Viewpoint BCF
        topicFolder.file(
            "viewpoint.bcfv",
            `<?xml version="1.0" encoding="UTF-8"?>
<VisualizationInfo Guid="${generateUUID()}" xmlns="http://www.buildingsmart-tech.org/bcf/version_2_1/xsd">
  <PerspectiveCamera>
    <CameraViewPoint>
      <X>${position.x.toFixed(3)}</X>
      <Y>${position.y.toFixed(3)}</Y>
      <Z>${position.z.toFixed(3)}</Z>
    </CameraViewPoint>
    <CameraDirection>
      <X>${finalDirection.x.toFixed(6)}</X>
      <Y>${finalDirection.y.toFixed(6)}</Y>
      <Z>${finalDirection.z.toFixed(6)}</Z>
    </CameraDirection>
    <CameraUpVector>
      <X>${finalUp.x.toFixed(6)}</X>
      <Y>${finalUp.y.toFixed(6)}</Y>
      <Z>${finalUp.z.toFixed(6)}</Z>
    </CameraUpVector>
    <FieldOfView>60</FieldOfView>
  </PerspectiveCamera>
  <Components>
    <Visibility DefaultVisibility="true">
      <Exceptions/>
    </Visibility>
    <ViewSetupHints SpacesVisible="false" SpaceBoundariesVisible="false" OpeningsVisible="false"/>
  </Components>
</VisualizationInfo>`
        );

        // Fichier markup avec valeurs par défaut
        topicFolder.file(
            "markup.bcf",
            `<?xml version="1.0" encoding="UTF-8"?>
<Markup xmlns="http://www.buildingsmart-tech.org/bcf/version_2_1/xsd">
  <Topic Guid="${topicGuid}" TopicType="Issue" TopicStatus="${mapStatusToBCF(todo.status)}">
    <Title>${todo.title || "New Issue"}</Title>
    <Description>${todo.description || "No description provided"}</Description>
    <CreationDate>${new Date(todo.createdAt).toISOString()}</CreationDate>
    <Priority>${mapPriority(todo.priority)}</Priority>
    <AssignedTo>${getUserNameById(todo.assignedTo, projectMembers) || "Unassigned"}</AssignedTo>
  </Topic>
</Markup>`
        );

        // Gestion des captures d'écran
        if (todo.screenshot) {
            try {
                const base64Data = todo.screenshot.split('base64,')[1];
                const binary = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                topicFolder.file("snapshot.png", binary, {
                    binary: true,
                    compression: "DEFLATE",
                    compressionOptions: { level: 9 }
                });
            } catch (error) {
                console.error("Error processing screenshot:", error);
            }
        }
    });

    // Génération et téléchargement
    zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 9 }
    }).then(content => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `Revit_BCF_${new Date().toISOString().slice(0, 10)}.bcf`;
        link.click();
    }).catch(error => {
        console.error("BCF Export Error:", error);
        toast.error("Failed to generate BCF file");
    });
};

  const handleCreateNote = useCallback(() => {
    console.log("handleCreateNote called")
    setIsCreatingTodo(true)
  }, [])

  // Corriger la fonction toggleTodosTool avec useCallback
  const toggleTodosTool = useCallback(() => {
    effectiveSetActiveTool((current) => (current === "todos" ? null : "todos"))
  }, [effectiveSetActiveTool])

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.todoManager = {
        createTodo: () => {
          console.log("createTodo called from window.todoManager")
          setIsCreatingTodo(true)
        },
        toggleTodoPanel: toggleTodosTool,
        restoreView: restoreTodoView,
        getTodos: () => todos,
        getActiveTool: () => effectiveActiveTool,
        exportBCF: exportBCF,
      }
    }

    return () => {
      if (typeof window !== "undefined") {
        delete window.todoManager
      }
    }
  }, [todos, effectiveActiveTool, toggleTodosTool])

  return (
    <>
      {/* Panneau des Todos */}
      <TodoPanel
        todos={todos}
        onTodoSelect={handleTodoSelect}
        onTodoDelete={handleTodoDelete}
        onTodoStatusChange={handleTodoStatusChange}
        onTodoAssign={handleTodoAssign}
        activeTool={effectiveActiveTool}
        onCreateNote={handleCreateNote}
        projectMembers={projectMembers}
      />

      {/* Modal de création de Todo */}
      <TodoCreationModal
        isOpen={isCreatingTodo}
        onClose={() => setIsCreatingTodo(false)}
        newTodo={newTodo}
        setNewTodo={setNewTodo}
        onCreateTodo={createTodo}
      />
    </>
  )
}

// Fonctions exportées pour être utilisées par les boutons externes
export const openTodoCreation = () => {
  if (window && window.todoManager) {
    console.log("openTodoCreation called")
    window.todoManager.createTodo()
  }
}

export const toggleTodoPanel = () => {
  if (window && window.todoManager) {
    console.log("toggleTodoPanel called")
    window.todoManager.toggleTodoPanel()
  }
}

export const restoreTodoView = (todo: Todo) => {
  if (window && window.todoManager) {
    window.todoManager.restoreView(todo)
  }
}

export const getTodosCount = () => {
  if (window && window.todoManager) {
    const todos = window.todoManager.getTodos()
    return todos ? todos.length : 0
  }
  return 0
}

export const isActiveTool = () => {
  if (window && window.todoManager) {
    return window.todoManager.getActiveTool() === "todos"
  }
  return false
}
