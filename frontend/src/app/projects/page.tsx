"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import axios from "axios"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
  Users,
  User,
  Filter,
  ArrowUpDown,
  CuboidIcon as Cube,
  AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Project = {
  _id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  createdBy: {
    _id: string
    name: string
    email: string
  }
  members: Array<{
    userId: string
    role: string
  }>
}

export default function ProjectsPage() {
  const { user, loading } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  // Wrap fetchProjects in useCallback to memoize it
  const fetchProjects = useCallback(() => {
    setIsLoading(true)
    axios
      .get(`${apiUrl}/projects`, {
        withCredentials: true,
      })
      .then((response) => {
        if (Array.isArray(response.data)) {
          const formattedProjects = response.data.map((project) => ({
            ...project,
            createdAt: new Date(project.createdAt).toLocaleDateString("fr-FR"),
            createdBy: {
              ...project.createdBy,
              _id: project.createdBy._id.toString(),
            },
          }))
          setProjects(formattedProjects)
          setFilteredProjects(formattedProjects)
        }
      })
      .catch((error) => {
        console.error("Erreur:", error)
        setError(error.response?.data?.error || "Erreur de chargement")
      })
      .finally(() => setIsLoading(false))
  }, [apiUrl])

  useEffect(() => {
    if (!loading && user) {
      fetchProjects()
    } else if (!loading && !user) {
      router.push("/sign-in")
    }
  }, [loading, user, fetchProjects, router]) // Added missing dependencies

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProjects(projects)
    } else {
      const filtered = projects.filter(
        (project) =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredProjects(filtered)
    }
  }, [searchQuery, projects])

  const openDeleteDialog = (project: Project) => {
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    setDeleting(true)
    try {
      await axios.delete(`${apiUrl}/projects/${projectToDelete._id}`, { withCredentials: true })
      setProjects((prev) => prev.filter((p) => p._id !== projectToDelete._id))
      setFilteredProjects((prev) => prev.filter((p) => p._id !== projectToDelete._id))
      toast.success("Projet supprimé avec succès")
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Échec de la suppression")
      } else {
        toast.error("Une erreur inconnue s'est produite")
      }
    } finally {
      setDeleting(false)
    }
  }

  const canModifyProject = (project: Project) => {
    return user?.userId && project.createdBy?._id === user.userId
  }

  const sortProjects = (type: "name" | "date") => {
    const sorted = [...projects]
    if (type === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt.split("/").reverse().join("-"))
        const dateB = new Date(b.createdAt.split("/").reverse().join("-"))
        return dateB.getTime() - dateA.getTime()
      })
    }
    setFilteredProjects(sorted)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#005CA9] dark:text-[#3b82f6] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Chargement de vos projets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header avec gradient et effet visuel */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-xl bg-gradient-to-r from-[#004A87] to-[#0070CC] dark:from-[#2563eb] dark:to-[#60a5fa] p-8 mb-8 overflow-hidden shadow-lg"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mt-20 -mr-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full -mb-10 -ml-10 blur-2xl"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Cube className="h-8 w-8 mr-3 text-blue-200" />
                Mes Projets BIM
              </h1>
              <p className="text-blue-100 max-w-2xl">
                Gérez vos projets de modélisation BIM, visualisez vos fichiers IFC et collaborez avec votre équipe en
                temps réel.
              </p>
            </div>
            <Button
              asChild
              className="bg-white text-[#005CA9] hover:bg-blue-50 dark:hover:bg-white/90 shadow-md transition-all duration-300 hover:scale-105"
            >
              <Link href="/projects/create" className="gap-2">
                <Plus className="h-4 w-4" />
                Créer un projet
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Barre de recherche et filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-8 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Rechercher un projet..."
              className="pl-10 border-gray-200 dark:border-gray-700 focus:border-[#005CA9] dark:focus:border-[#3b82f6] focus:ring-[#005CA9] dark:focus:ring-[#3b82f6] dark:bg-gray-800 dark:text-gray-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 self-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-gray-200 dark:border-gray-700 dark:text-gray-300">
                  <Filter className="h-4 w-4 text-[#005CA9] dark:text-[#3b82f6]" />
                  <span className="hidden sm:inline">Filtrer</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilteredProjects(projects)}>Tous les projets</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilteredProjects(projects.filter((p) => canModifyProject(p)))}>
                  Mes projets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilteredProjects(projects.filter((p) => !canModifyProject(p)))}>
                  Projets partagés
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-gray-200 dark:border-gray-700 dark:text-gray-300">
                  <ArrowUpDown className="h-4 w-4 text-[#005CA9] dark:text-[#3b82f6]" />
                  <span className="hidden sm:inline">Trier</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => sortProjects("name")}>Par nom</DropdownMenuItem>
                <DropdownMenuItem onClick={() => sortProjects("date")}>Par date</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Boîte de dialogue de confirmation de suppression */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Confirmer la suppression
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300 pt-2">
                Êtes-vous sûr de vouloir supprimer le projet{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  &quot;{projectToDelete?.name}&quot;
                </span> ?
                <span className="block mt-2 text-red-500 dark:text-red-400 text-sm font-medium">
                  Cette action est irréversible et supprimera tous les fichiers associés.
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
                className="dark:border-gray-700 dark:text-gray-300"
              >
                Annuler
              </Button>
              <Button
                onClick={handleDeleteProject}
                variant="destructive"
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800"
              >
                {deleting ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Suppression...</span>
                  </div>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer définitivement
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-[#005CA9] dark:text-[#3b82f6]" />
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800 text-center"
          >
            <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
            <p className="text-red-500 dark:text-red-300 mt-2">Veuillez réessayer ou contacter le support technique.</p>
          </motion.div>
        ) : filteredProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-12 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm"
          >
            <div className="bg-blue-50 dark:bg-blue-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cube className="h-10 w-10 text-[#005CA9] dark:text-[#3b82f6]" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Aucun projet trouvé</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              Commencez votre premier projet BIM en quelques clics et invitez votre équipe à collaborer.
            </p>
            <Button
              asChild
              className="bg-[#005CA9] hover:bg-[#004A87] dark:bg-[#3b82f6] dark:hover:bg-[#2563eb] text-white"
            >
              <Link href="/projects/create">
                <Plus className="h-4 w-4 mr-2" />
                Créer un nouveau projet
              </Link>
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="h-full"
              >
                <Card className="overflow-hidden border-0 bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                  <div className="h-3 bg-gradient-to-r from-[#005CA9] to-[#0070CC] dark:from-[#3b82f6] dark:to-[#60a5fa]"></div>
                  <div className="p-5 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 hover:text-[#005CA9] dark:hover:text-[#3b82f6] transition-colors">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{project.description}</p>
                        )}
                      </div>
                      {canModifyProject(project) && (
                        <div className="inline-flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-medium text-[#005CA9] dark:text-blue-400 ml-2 flex-shrink-0">
                          Propriétaire
                        </div>
                      )}
                    </div>

                    <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-1.5 text-[#005CA9] dark:text-[#3b82f6]" />
                      <span>Créé le {project.createdAt}</span>
                    </div>

                    <div className="flex-grow"></div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Users className="h-4 w-4 mr-1.5 text-[#005CA9] dark:text-[#3b82f6]" />
                        <span>
                          {project.members?.length || 1} membre{(project.members?.length || 1) > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4 mr-1.5 text-[#005CA9] dark:text-[#3b82f6]" />
                        <span className="truncate max-w-[120px]">
                          {project.createdBy?.name || "Information non disponible"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <CardFooter className="flex gap-2 p-5 pt-0 mt-auto">
                    <Button
                      asChild
                      variant="default"
                      className="flex-1 bg-[#005CA9] hover:bg-[#004A87] dark:bg-[#3b82f6] dark:hover:bg-[#2563eb] text-white"
                    >
                      <Link href={`/projects/${project._id}`}>
                        Ouvrir
                      </Link>
                    </Button>

                    {canModifyProject(project) && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-[#005CA9] dark:hover:text-[#3b82f6] hover:border-[#005CA9] dark:hover:border-[#3b82f6]"
                          onClick={() => router.push(`/projects/${project._id}/edit`)}
                        >
                          <Pencil className="h-4 w-4 text-[#005CA9] dark:text-[#3b82f6]" />
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          className="border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300 hover:border-red-300 dark:hover:border-red-800"
                          onClick={() => openDeleteDialog(project)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}