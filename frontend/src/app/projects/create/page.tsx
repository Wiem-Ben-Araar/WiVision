"use client"

import type React from "react"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Plus, Loader2, CuboidIcon as Cube, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { motion } from "framer-motion"
import axios from "axios"
import { toast } from "sonner"

type FormData = {
  name: string
  description: string
}

type FormErrors = {
  name?: string
  description?: string
}

export default function CreateProjectPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Configuration de l'URL API
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in")
    }
  }, [user, loading, router])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Le nom du projet est obligatoire"
    } else if (formData.name.length > 40) {
      newErrors.name = "Le nom ne doit pas dépasser 40 caractères"
    }

    if (formData.description.length > 200) {
      newErrors.description = "La description ne doit pas dépasser 200 caractères"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Construction de l'URL complète pour l'API
      const projectsUrl = `${apiUrl}/projects`
      
      console.log('Tentative de création du projet sur:', projectsUrl)
      console.log('Données envoyées:', formData)

      const response = await axios.post(projectsUrl, formData, {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.status === 201) {
        toast.success("Projet créé avec succès !", {
          description: "Redirection vers le tableau de bord...",
        })
        setTimeout(() => router.push(`/projects/${response.data._id}`), 1500)
      }
    } catch (error) {
      console.error("Erreur création projet:", error)
      console.error("URL utilisée:", `${apiUrl}/projects`)

      if (axios.isAxiosError(error)) {
        const serverError = error.response?.data

        if (error.response?.status === 401) {
          toast.error("Session expirée", {
            description: "Veuillez vous reconnecter",
          })
          // Rediriger vers la page de connexion après un délai
          setTimeout(() => router.push("/sign-in"), 2000)
        } else if (error.response?.status === 400) {
          // Gestion des erreurs de validation du serveur
          setErrors(serverError.errors || {})
          toast.error("Validation échouée", {
            description: "Veuillez vérifier les champs du formulaire",
          })
        } else {
          toast.error(`Erreur serveur: ${serverError?.error || "Erreur inconnue"}`)
        }
      } else {
        toast.error("Erreur de connexion", {
          description: "Impossible de joindre le serveur. Vérifiez votre connexion.",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Reset l'erreur quand l'utilisateur modifie le champ
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#005CA9] dark:text-[#3b82f6] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 pt-24 pb-12">
      {/* Ajout d'un padding-top plus important (pt-24) pour éviter que la navbar ne cache le contenu */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
         
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid gap-8 md:grid-cols-5"
        >
          <div className="md:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border-0">
              <div className="h-2 bg-gradient-to-r from-[#005CA9] to-[#0070CC] dark:from-[#3b82f6] dark:to-[#60a5fa]"></div>
              <div className="p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg mr-4">
                    <Cube className="h-6 w-6 text-[#005CA9] dark:text-[#3b82f6]" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Créer un nouveau projet BIM</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                        Nom du projet <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Ex: Tour Résidentielle Phase 2"
                        className="w-full border-gray-300 dark:border-gray-700 focus:border-[#005CA9] focus:ring-[#005CA9] dark:focus:border-[#3b82f6] dark:focus:ring-[#3b82f6] transition-colors dark:bg-gray-800 dark:text-gray-100"
                        disabled={isSubmitting}
                      />
                      {errors.name && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-red-500 dark:text-red-400 mt-1"
                        >
                          {errors.name}
                        </motion.p>
                      )}
                    </div>

                    <div>
                      <Label
                        htmlFor="description"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1"
                      >
                        Description du projet
                      </Label>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Décrivez votre projet, ses objectifs et ses caractéristiques principales..."
                        rows={5}
                        className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-[#005CA9] dark:focus:ring-[#3b82f6] focus:border-transparent transition-colors resize-none dark:bg-gray-800 dark:text-gray-100"
                        disabled={isSubmitting}
                      />
                      <div className="flex justify-between items-center mt-1">
                        {errors.description && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-red-500 dark:text-red-400"
                          >
                            {errors.description}
                          </motion.p>
                        )}
                        <span
                          className={`text-sm ml-auto ${
                            formData.description.length > 200
                              ? "text-red-500 dark:text-red-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {formData.description.length}/200
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-[#005CA9] to-[#0070CC] hover:from-[#004A87] hover:to-[#005CA9] dark:from-[#3b82f6] dark:to-[#60a5fa] dark:hover:from-[#2563eb] dark:hover:to-[#3b82f6] text-white py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Création en cours...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Plus className="h-5 w-5 mr-2" />
                          Créer le projet
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="bg-gradient-to-br from-[#004A87] to-[#0070CC] dark:from-[#2563eb] dark:to-[#60a5fa] rounded-xl shadow-lg overflow-hidden text-white h-full">
              <div className="p-8">
                <h2 className="text-xl font-bold mb-6 flex items-center">
                  <div className="bg-white/20 p-2 rounded-lg mr-3">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  Fonctionnalités BIM
                </h2>

                <ul className="space-y-4">
                  {[
                    "Importation de fichiers IFC et modèles 3D",
                    "Visualisation interactive des maquettes BIM",
                    "Détection automatique des conflits",
                    "Collaboration en temps réel avec votre équipe",
                    "Annotations et commentaires sur les modèles",
                    "Gestion des versions et historique des modifications",
                    "Extraction de données et métrés",
                  ].map((feature, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start"
                    >
                      <div className="bg-white/20 p-1 rounded-full mr-3 mt-0.5 flex-shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <span>{feature}</span>
                    </motion.li>
                  ))}
                </ul>

                <div className="mt-8 pt-6 border-t border-white/20">
                  <p className="text-blue-100 text-sm">
                    Créez votre projet en quelques secondes et commencez immédiatement à collaborer avec votre équipe
                    sur vos modèles BIM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}