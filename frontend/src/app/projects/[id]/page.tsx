"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, FileBox, Loader2, Calendar, User, CuboidIcon } from "lucide-react"
import Link from "next/link"
import ProjectFiles from "@/components/ProjectFiles"
import ProjectMembers from "@/components/ProjectMembers"
import axios from "axios"
import { motion } from "framer-motion"


interface Project {
  _id: string
  name: string
  description: string
  createdAt: string
  createdBy: {
    _id: string
    name?: string
    email: string
  }
  currentUserId?: string // Ajouté depuis la réponse API
}

interface ProjectFile {
  id: string
  file_url: string
  name: string
  fileSize: number
  createdAt: string
}

interface ProjectMember {
  _id: string
  user: {
    _id: string
    name: string
    email: string
    image?: string
  }
  role: string
}

export default function ProjectDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<"BIM Manager" | "BIM Coordinateur" | "BIM Modeleur" | "none">("none");
 

  // Configuration de l'URL API
  const apiUrl = process.env.NEXT_PUBLIC_API_URL 

  // Configuration Axios avec intercepteur pour les erreurs 401
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.log("Session expirée, redirection vers la page de connexion")
          document.cookie = "token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;"
          router.push("/sign-in")
        }
        return Promise.reject(error)
      },
    )

    return () => axios.interceptors.response.eject(interceptor)
  }, [router])

  // Fetch project details and role
  useEffect(() => {
    if (!projectId) return

    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch project data
        const projectUrl = `${apiUrl}/projects/${projectId}`
        console.log('Fetching project from:', projectUrl)
        
        const projectResponse = await axios.get(projectUrl, {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        })
        
        setProject(projectResponse.data)

        // Determine user role
        const isOwner = projectResponse.data.createdBy?._id === projectResponse.data.currentUserId
        setUserRole(isOwner ? "BIM Manager" : "BIM Modeleur");
      } catch (error) {
        console.error("Error fetching project:", error)
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            console.log("Projet non trouvé")
          } else if (error.response?.status === 401) {
            console.log("Non autorisé - redirection vers connexion")
            router.push("/sign-in")
            return
          }
        }
        router.push("/projects")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [projectId, router, apiUrl])

  // Fetch project files
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const filesUrl = `${apiUrl}/projects/${projectId}/files`
        console.log('Fetching files from:', filesUrl)
        
        const response = await axios.get(filesUrl, {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        })
        
        setFiles(
          response.data.map((file: { _id: string; url: string; name: string; fileSize: number; createdAt: string }) => ({
            id: file._id,
            file_url: file.url,
            name: file.name,
            fileSize: file.fileSize,
            createdAt: file.createdAt,
          })),
        )
      } catch (error) {
        console.error("Error fetching files:", error)
      }
    }

    if (projectId) fetchFiles()
  }, [projectId, apiUrl])

  // Fetch project members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const membersUrl = `${apiUrl}/projects/${projectId}/members`
        console.log('Fetching members from:', membersUrl)
        
        const response = await axios.get(membersUrl, {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        })
        
        setMembers(response.data.members || [])
      } catch (error) {
        console.error("Error fetching members:", error)
      }
    }

    if (projectId) fetchMembers()
  }, [projectId, apiUrl])

  // Format date
  const formattedDate = project
    ? new Date(project.createdAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : ""

  // Get creator info
  const createdByUser = project?.createdBy

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#005CA9] dark:text-[#3b82f6] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Chargement du projet...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Projet non trouvé</h1>
        <Button
          asChild
          className="bg-[#005CA9] hover:bg-[#004A87] dark:bg-[#3b82f6] dark:hover:bg-[#2563eb] text-white"
        >
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 pt-24 pb-12">
      {/* Ajout d'un padding-top plus important (pt-24) pour éviter que la navbar ne cache le contenu */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="mb-6">
         
        </div>

        <div>
          {/* En-tête de projet */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200 dark:border-gray-800"
          >
            <div className="h-2 bg-gradient-to-r from-[#005CA9] to-[#0070CC] dark:from-[#3b82f6] dark:to-[#60a5fa]"></div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6">
                <div className="flex items-start">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg mr-4 hidden sm:block">
                    <CuboidIcon className="h-8 w-8 text-[#005CA9] dark:text-blue-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{project.name}</h1>
                    {project.description && (
                      <p className="text-gray-600 dark:text-gray-300 mb-4">{project.description}</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center text-gray-600 dark:text-gray-300">
                        <Calendar className="h-4 w-4 mr-2 text-[#005CA9] dark:text-blue-400" />
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-200">Créé le :</span>{" "}
                          {formattedDate}
                        </div>
                      </div>

                      <div className="flex items-center text-gray-600 dark:text-gray-300">
                        <User className="h-4 w-4 mr-2 text-[#005CA9] dark:text-blue-400" />
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-200">Par :</span>{" "}
                          {createdByUser && createdByUser.name ? (
                            <span className="flex items-center">
                              <span className="inline-block h-5 w-5 rounded-full bg-[#005CA9] dark:bg-blue-700 text-white text-xs flex items-center justify-center mr-2">
                                {createdByUser.name.charAt(0).toUpperCase()}
                              </span>
                              {createdByUser.name}
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <span className="inline-block h-5 w-5 rounded-full bg-[#005CA9] dark:bg-blue-700 text-white text-xs flex items-center justify-center mr-2">
                                U
                              </span>
                              Utilisateur {project.createdBy?._id.substring(0, 5)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center text-gray-600 dark:text-gray-300">
                        <Users className="h-4 w-4 mr-2 text-[#005CA9] dark:text-blue-400" />
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-200">Membres :</span>{" "}
                          {members.length}
                        </div>
                      </div>

                      <div className="flex items-center text-gray-600 dark:text-gray-300">
                        <FileBox className="h-4 w-4 mr-2 text-[#005CA9] dark:text-blue-400" />
                        <div>
                          <span className="font-medium text-gray-700 dark:text-gray-200">Fichiers :</span>{" "}
                          {files.length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#005CA9] data-[state=active]:text-white dark:data-[state=active]:bg-[#3b82f6]"
            >
              Vue d&apos;ensemble
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="data-[state=active]:bg-[#005CA9] data-[state=active]:text-white dark:data-[state=active]:bg-[#3b82f6]"
            >
              Fichiers ({files.length})
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="data-[state=active]:bg-[#005CA9] data-[state=active]:text-white dark:data-[state=active]:bg-[#3b82f6]"
            >
              Membres ({members.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card className="border-0 shadow-md overflow-hidden dark:bg-gray-800 dark:border-gray-700 h-full">
                  <div className="h-2 bg-gradient-to-r from-[#005CA9] to-[#0070CC] dark:from-[#3b82f6] dark:to-[#60a5fa]"></div>
                  <CardHeader>
                    <CardTitle className="flex items-center text-[#005CA9] dark:text-[#3b82f6]">
                      <FileBox className="h-5 w-5 mr-2" />
                      Fichiers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{files.length}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fichiers IFC téléchargés</p>

                 
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card className="border-0 shadow-md overflow-hidden dark:bg-gray-800 dark:border-gray-700 h-full">
                  <div className="h-2 bg-gradient-to-r from-[#005CA9] to-[#0070CC] dark:from-[#3b82f6] dark:to-[#60a5fa]"></div>
                  <CardHeader>
                    <CardTitle className="flex items-center text-[#005CA9] dark:text-[#3b82f6]">
                      <Users className="h-5 w-5 mr-2" />
                      Membres de l&apos;équipe
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{members.length}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Membres actifs</p>

     
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="files">
            <Card className="border-0 shadow-md overflow-hidden dark:bg-gray-800 dark:border-gray-700">
              <div className="h-2 bg-gradient-to-r from-[#005CA9] to-[#0070CC] dark:from-[#3b82f6] dark:to-[#60a5fa]"></div>
              {userRole !== "none" && (
                <ProjectFiles projectId={projectId} files={files} userRole={userRole} />
              )}
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <Card className="border-0 shadow-md overflow-hidden dark:bg-gray-800 dark:border-gray-700">
              <div className="h-2 bg-gradient-to-r from-[#005CA9] to-[#0070CC] dark:from-[#3b82f6] dark:to-[#60a5fa]"></div>
              {userRole !== "none" && (
                <ProjectMembers
                  projectId={projectId}
                  projectName={project.name}
                  userRole={userRole as "BIM Manager" | "BIM Coordinateur" | "BIM Modeleur"}
                />
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

