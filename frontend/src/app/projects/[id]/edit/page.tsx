"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Save, CuboidIcon } from "lucide-react"
import Link from "next/link"
import axios from "axios"
import { toast } from "sonner"
import { motion } from "framer-motion"

interface Project {
  _id?: string
  name: string
  description?: string
}

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const projectId = params.id

  const [project, setProject] = useState<Project>({
    name: "",
    description: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        // Vérification initiale de l'ID
        if (!projectId || projectId === "undefined") {
          throw new Error("ID de projet invalide")
        }

        const { data } = await axios.get(`/api/projects/${projectId}`)
        setProject(data)
      } catch (error) {
        console.error("Erreur de chargement:", error)
        toast.error(error instanceof Error ? error.message : "Projet introuvable")
        router.push("/projects")
      } finally {
        setIsLoading(false) // Toujours mettre à jour l'état de chargement
      }
    }

    fetchProject()
  }, [projectId, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProject((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!project.name.trim()) {
      toast.error("Le nom du projet est requis")
      return
    }

    setIsSubmitting(true)

    try {
      await axios.put(`/api/projects/${projectId}`, project, {
        headers: { "Content-Type": "application/json" },
      })

      toast.success("Projet mis à jour avec succès")
      router.push("/projects")
    } catch (error) {
      console.error("Erreur de mise à jour:", error)
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.error || "Échec de la mise à jour")
      } else {
        toast.error("Une erreur inconnue s'est produite")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#005CA9] dark:text-[#3b82f6] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Chargement du projet...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 pt-24 pb-12">
      {/* Ajout d'un padding-top plus important (pt-24) pour éviter que la navbar ne cache le contenu */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
         
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="border-0 shadow-md overflow-hidden dark:bg-gray-800 dark:border-gray-700">
            <div className="h-2 bg-gradient-to-r from-[#005CA9] to-[#0070CC] dark:from-[#3b82f6] dark:to-[#60a5fa]"></div>
            <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
                  <CuboidIcon className="h-5 w-5 text-[#005CA9] dark:text-[#3b82f6]" />
                </div>
                <CardTitle className="text-xl text-gray-800 dark:text-gray-100">Modifier le projet</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      Nom du projet <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={project.name}
                      onChange={handleChange}
                      required
                      placeholder="Entrez le nom du projet"
                      className="border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:border-[#005CA9] focus:ring-[#005CA9] dark:focus:border-[#3b82f6] dark:focus:ring-[#3b82f6]"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1"
                    >
                      Description
                    </Label>
                    <textarea
                      id="description"
                      name="description"
                      value={project.description || ""}
                      onChange={handleChange}
                      placeholder="Description du projet (optionnel)"
                      rows={4}
                      className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005CA9] dark:focus:ring-[#3b82f6] focus:border-transparent dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`/projects/${projectId}`)}
                      className="border-gray-300 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-[#005CA9] dark:hover:text-[#3b82f6]"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#005CA9] hover:bg-[#004A87] text-white dark:bg-[#3b82f6] dark:hover:bg-[#2563eb]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Mise à jour en cours...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Mettre à jour le projet
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
