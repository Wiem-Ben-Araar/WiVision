"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import axios, { AxiosError } from "axios"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { TriangleAlert, Loader2, ArrowLeft } from "lucide-react"
import { FcGoogle } from "react-icons/fc"
import { FaGithub } from "react-icons/fa"
import { validateEmail, validatePassword, validateName, passwordsMatch } from "@/lib/validators"

import { motion } from "framer-motion"

axios.defaults.withCredentials = true

export default function SignUpForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [serverError, setServerError] = useState("")
  const router = useRouter()

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Validation en temps réel
  useEffect(() => {
    const newErrors: Record<string, string> = {}

    // Validation du nom seulement si le champ n'est pas vide
    if (form.name) {
      if (!validateName(form.name)) {
        newErrors.name = "Minimum 2 caractères"
      }
    }

    // Validation de l'email seulement si le champ n'est pas vide
    if (form.email) {
      if (!validateEmail(form.email)) {
        newErrors.email = "Format email invalide"
      }
    }

    // Validation du mot de passe seulement si le champ n'est pas vide
    if (form.password) {
      if (!validatePassword(form.password)) {
        newErrors.password = "8 caractères, 1 majuscule et 1 chiffre"
      }
    }

    // Validation de la confirmation seulement si les deux champs ne sont pas vides
    if (form.password && form.confirm) {
      if (!passwordsMatch(form.password, form.confirm)) {
        newErrors.confirm = "Les mots de passe ne correspondent pas"
      }
    }

    setErrors(newErrors)
  }, [form])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation finale avant soumission
    if (!form.name || !form.email || !form.password || !form.confirm) {
      return setServerError("Veuillez remplir tous les champs")
    }

    if (Object.keys(errors).length > 0) {
      return setServerError("Veuillez corriger les erreurs dans le formulaire")
    }

    setIsSubmitting(true)
    setServerError("")

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/signup`, {
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirm,
      })

      if (response.status === 201) {
        toast.success("Compte créé avec succès !")
        router.push("/sign-in")
      }
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>
      const errorMessage = error.response?.data?.message || "Erreur lors de la création du compte"
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuth = (provider: "google" | "github") => {
    setOauthLoading(provider)
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/${provider}`
    } catch  {
      toast.error(`Erreur lors de la connexion avec ${provider}`)
      setOauthLoading(null)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 py-12 px-4">
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center text-gray-600 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-blue-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium">Retour à l&apos;accueil</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
         
        </div>

        <Card className="border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl bg-white dark:bg-gray-800">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-[#005CA9] to-[#0070CC] bg-clip-text text-transparent">
              Création de compte
            </CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-400">
              Commencez votre aventure dès maintenant
            </CardDescription>
          </CardHeader>

          <CardContent>
            {serverError && (
              <div className="mb-4 p-3 bg-red-100/90 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md flex items-center gap-2 text-sm">
                <TriangleAlert className="w-4 h-4" />
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Nom complet"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={isSubmitting}
                  className={`${
                    errors.name ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="text-red-500 dark:text-red-400 text-sm">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value.trim() })}
                  disabled={isSubmitting}
                  className={`${
                    errors.email ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-red-500 dark:text-red-400 text-sm">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Mot de passe"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  disabled={isSubmitting}
                  className={`${
                    errors.password ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
                {errors.password && (
                  <p id="password-error" className="text-red-500 dark:text-red-400 text-sm">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Confirmation du mot de passe"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  disabled={isSubmitting}
                  className={`${
                    errors.confirm ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                  aria-invalid={!!errors.confirm}
                  aria-describedby={errors.confirm ? "confirm-error" : undefined}
                />
                {errors.confirm && (
                  <p id="confirm-error" className="text-red-500 dark:text-red-400 text-sm">
                    {errors.confirm}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-[#005CA9] hover:bg-[#004A87] dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-transform duration-200 hover:scale-[1.02]"
                disabled={isSubmitting || Object.keys(errors).length > 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  "Créer mon compte"
                )}
              </Button>
            </form>

            <Separator className="my-6 bg-gray-200 dark:bg-gray-700" />

            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={() => handleOAuth("google")}
                disabled={!!oauthLoading}
                className="flex items-center justify-center gap-2 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FcGoogle className="w-5 h-5" />
                )}
                <span>Continuer avec Google</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuth("github")}
                disabled={!!oauthLoading}
                className="flex items-center justify-center gap-2 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {oauthLoading === "github" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FaGithub className="w-5 h-5" />
                )}
                <span>Continuer avec GitHub</span>
              </Button>
            </div>

            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Déjà un compte ?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-[#005CA9] hover:text-[#004A87] dark:text-blue-400 dark:hover:text-blue-300"
              >
                Se connecter
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
