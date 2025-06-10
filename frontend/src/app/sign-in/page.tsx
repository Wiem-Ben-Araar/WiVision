"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { FcGoogle } from "react-icons/fc"
import { FaGithub } from "react-icons/fa"
import { validateEmail, validatePassword } from "@/lib/validators"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"

export default function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const { refreshAuth, setUser } = useAuth()
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Validation en temps réel
    const newErrors: { email?: string; password?: string } = {}

    if (email) {
      if (!validateEmail(email)) {
        newErrors.email = "Email invalide"
      }
    }

    if (password) {
      if (!validatePassword(password)) {
        newErrors.password = "8 caractères minimum, une majuscule et un chiffre"
      }
    }

    setErrors(newErrors)
  }, [email, password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation finale avant soumission
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs")
      return
    }

    if (!validateEmail(email) || !validatePassword(password)) {
      toast.error("Veuillez corriger les erreurs dans le formulaire")
      return
    }

    setLoading(true)

    try {
      console.log("🚀 Tentative de connexion pour:", email); // Debug
      
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
        { email, password }
      )

      console.log("✅ Réponse de connexion reçue:", response.data); // Debug

      if (response.data.user) {
        console.log("👤 Utilisateur reçu:", response.data.user); // Debug
        
        // Mettre à jour l'utilisateur immédiatement
        setUser(response.data.user);
        
        toast.success("Connexion réussie !")
        
        // Attendre un court délai puis rafraîchir l'auth pour s'assurer que tout est synchronisé
        setTimeout(async () => {
          try {
            await refreshAuth()
            console.log("🔄 Auth refresh terminé"); // Debug
            
            // Redirection après rafraîchissement
            const pendingInvitation = sessionStorage.getItem("pendingInvitation")
            if (pendingInvitation) {
              router.push(`/invitation/${pendingInvitation}`)
            } else {
              router.push("/")
            }
          } catch (refreshError) {
            console.error("❌ Erreur lors du refresh:", refreshError);
            // Même si le refresh échoue, on peut continuer car on a déjà l'utilisateur
            const pendingInvitation = sessionStorage.getItem("pendingInvitation")
            if (pendingInvitation) {
              router.push(`/invitation/${pendingInvitation}`)
            } else {
              router.push("/")
            }
          }
        }, 500); // Délai plus long pour laisser le temps aux cookies de se propager
      } else {
        console.error("❌ Pas d'utilisateur dans la réponse");
        toast.error("Erreur lors de la connexion - données utilisateur manquantes")
      }
    } catch (error: any) {
      console.error("❌ Erreur de connexion:", error); // Debug
      const errorMessage = error.response?.data?.message || "Échec de la connexion. Vérifiez vos identifiants."
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: "google" | "github") => {
    setOauthLoading(provider)
    try {
      // Redirection vers le fournisseur OAuth
      window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/${provider}`
    } catch (error) {
      toast.error(`Erreur lors de la connexion avec ${provider}`)
      setOauthLoading(null)
    }
  }

  if (!mounted) return null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center text-gray-600 dark:text-gray-300 hover:text-[#005CA9] dark:hover:text-blue-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        <span className="text-sm font-medium">Retour à l'accueil</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {/* Logo here */}
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#005CA9] to-[#0070CC] bg-clip-text text-transparent">
            Connexion
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Accédez à votre espace personnel</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  required
                  placeholder="exemple@email.com"
                  className={`${
                    errors.email ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-red-500 dark:text-red-400 text-sm mt-1">
                    {errors.email}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="********"
                  className={`${
                    errors.password ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  minLength={8}
                />
                {errors.password && (
                  <p id="password-error" className="text-red-500 dark:text-red-400 text-sm mt-1">
                    {errors.password}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#005CA9] hover:bg-[#004A87] dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-transform duration-200 hover:scale-[1.02]"
              disabled={loading || Object.keys(errors).length > 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Ou continuez avec
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                <span>Google</span>
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
                <span>GitHub</span>
              </Button>
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Pas de compte ?{" "}
              <Link
                href="/sign-up"
                className="font-medium text-[#005CA9] hover:text-[#004A87] dark:text-blue-400 dark:hover:text-blue-300"
              >
                Créer un compte
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  )
}