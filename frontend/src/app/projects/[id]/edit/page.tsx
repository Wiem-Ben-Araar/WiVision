"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Save, CuboidIcon, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import axios from "axios"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { getProjectNameError, getProjectDescriptionError } from "@/lib/validators"

interface Project {
  _id?: string
  name: string
  description?: string
}

type FormErrors = {
  name?: string
  description?: string
}

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const projectId = params.id
  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const [project, setProject] = useState<Project>({
    name: "",
    description: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [touched, setTouched] = useState<{ name: boolean; description: boolean }>({
    name: false,
    description: false,
  })

  useEffect(() => {
    const fetchProject = async () => {
      try {
        if (!projectId || projectId === "undefined") {
          throw new Error("ID de projet invalide")
        }

        const { data } = await axios.get(`${apiUrl}/projects/${projectId}`, {
          withCredentials: true,
        })
        setProject(data)
      } catch (error) {
        console.error("Erreur de chargement:", error)
        toast.error(error instanceof Error ? error.message : "Projet introuvable")
        router.push("/projects")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [projectId, router, apiUrl])

  // Validation en temps réel
  useEffect(() => {
    const newErrors: FormErrors = {}

    if (touched.name) {
      const nameError = getProjectNameError(project.name)
      if (nameError) {
        newErrors.name = nameError
      }
    }

    if (touched.description) {
      const descriptionError = getProjectDescriptionError(project.description || "")
      if (descriptionError) {
        newErrors.description = descriptionError
      }
    }

    setErrors(newErrors)
  }, [project, touched])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    const nameError = getProjectNameError(project.name)
    if (nameError) {
      newErrors.name = nameError
    }

    const descriptionError = getProjectDescriptionError(project.description || "")
    if (descriptionError) {
      newErrors.description = descriptionError
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProject((prev) => ({ ...prev, [name]: value }))
  }

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Marquer tous les champs comme touchés
    setTouched({ name: true, description: true })

    if (!validateForm()) {
      toast.error("Veuillez corriger les erreurs dans le formulaire")
      return
    }

    setIsSubmitting(true)

    try {
      await axios.put(`${apiUrl}/projects/${projectId}`, project, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
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

  const getInputClassName = (field: keyof FormErrors) => {
    const baseClass =
      "w-full border rounded-md focus:outline-none focus:ring-2 transition-colors dark:bg-gray-800 dark:text-gray-100"

    if (errors[field]) {
      return `${baseClass} border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500 dark:focus:border-red-400 dark:focus:ring-red-400`
    }

    if (touched[field] && !errors[field] && (field === "name" ? project.name.trim() : project.description?.trim())) {
      return `${baseClass} border-green-300 dark:border-green-600 focus:border-green-500 focus:ring-green-500 dark:focus:border-green-400 dark:focus:ring-green-400`
    }

    return `${baseClass} border-gray-300 dark:border-gray-700 focus:border-[#005CA9] focus:ring-[#005CA9] dark:focus:border-[#3b82f6] dark:focus:ring-[#3b82f6]`
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link
          href="/projects"
          className="inline-flex items-center text-gray-600 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-[#3b82f6] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="text-sm font-medium">Retour aux projets</span>
        </Link>

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
                    <div className="relative">
                      <Input
                        id="name"
                        name="name"
                        value={project.name}
                        onChange={handleChange}
                        onBlur={() => handleBlur("name")}
                        required
                        placeholder="Entrez le nom du projet"
                        className={getInputClassName("name")}
                      />
                      {touched.name && !errors.name && project.name.trim() && (
                        <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500" />
                      )}
                      {errors.name && (
                        <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-red-500" />
                      )}
                    </div>
                    {errors.name && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-red-500 dark:text-red-400 mt-1 flex items-center gap-1"
                      >
                        <AlertCircle className="h-4 w-4" />
                        {errors.name}
                      </motion.p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      2-50 caractères, lettres, chiffres, espaces, tirets et underscores autorisés
                    </p>
                  </div>

                  <div>
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1"
                    >
                      Description
                    </Label>
                    <div className="relative">
                      <textarea
                        id="description"
                        name="description"
                        value={project.description || ""}
                        onChange={handleChange}
                        onBlur={() => handleBlur("description")}
                        placeholder="Description du projet (optionnel)"
                        rows={4}
                        className={`${getInputClassName("description")} p-3 resize-none`}
                      />
                      {touched.description && !errors.description && (
                        <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-green-500" />
                      )}
                      {errors.description && <AlertCircle className="absolute right-3 top-3 h-5 w-5 text-red-500" />}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      {errors.description && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1"
                        >
                          <AlertCircle className="h-4 w-4" />
                          {errors.description}
                        </motion.p>
                      )}
                      <span
                        className={`text-sm ml-auto ${
                          (project.description?.length || 0) > 500
                            ? "text-red-500 dark:text-red-400"
                            : (project.description?.length || 0) > 400
                              ? "text-orange-500 dark:text-orange-400"
                              : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {project.description?.length || 0}/500
                      </span>
                    </div>
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
                      disabled={isSubmitting || Object.keys(errors).length > 0}
                      className="bg-[#005CA9] hover:bg-[#004A87] text-white dark:bg-[#3b82f6] dark:hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed"
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
