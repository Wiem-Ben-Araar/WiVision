"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { 
  Plus, 
  FolderOpen, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  CuboidIcon, 
  Clock, 
  Shield, 
  FileBox, 
  Eye 
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Feature type for better type safety
type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false)
  const [auth, setAuth] = useState<{ authenticated: boolean; name?: string }>({
    authenticated: false,
  })

  useEffect(() => {
    setIsMounted(true)

    // Authentication check
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/status`, {
      method: "GET",
      credentials: "include",
    })
    .then((res) => res.json())
    .then((data) => {
      setAuth({ authenticated: data.authenticated, name: data.user?.name })
    })
    .catch(() => {
      setAuth({ authenticated: false })
    })
  }, [])

  if (!isMounted) return null

  // Features array for better maintainability
  const features: Feature[] = [
    {
      icon: CuboidIcon,
      title: "Visualisation 3D",
      description: "Explorez vos modèles BIM en 3D avec des outils de navigation intuitifs et performants.",
    },
    {
      icon: Users,
      title: "Collaboration en équipe",
      description: "Travaillez en équipe sur vos projets avec des outils de partage et d'annotation en temps réel.",
    },
    {
      icon: FileBox,
      title: "Gestion de fichiers IFC",
      description: "Importez, organisez et gérez facilement vos fichiers IFC dans un espace sécurisé.",
    },
    {
      icon: Clock,
      title: "Suivi des versions",
      description: "Gardez une trace de toutes les modifications avec un historique complet des versions.",
    },
    {
      icon: Shield,
      title: "Sécurité des données",
      description: "Vos données sont protégées avec des protocoles de sécurité avancés et des sauvegardes régulières.",
    },
    {
      icon: Eye,
      title: "Analyse de modèles",
      description: "Analysez vos modèles BIM pour détecter les conflits et optimiser votre conception.",
    },
  ]

  return (
    <div className="overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 w-full">
  {/* Decorative Background */}
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full 
      bg-gradient-to-b from-blue-50/50 via-white/50 to-white/30 
      dark:from-blue-950/20 dark:via-gray-950/30 dark:to-gray-950/10 
      opacity-100 dark:opacity-100">
    </div>
  </div>

  <div className="w-full max-w-none relative z-10 px-4 md:px-16">

        
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 text-center md:text-left"
            >
              <Badge 
                variant="secondary" 
                className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-none"
              >
                Plateforme BIM Professionnelle
              </Badge>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold 
                text-gray-900 dark:text-white leading-tight">
                <span className="text-blue-600 dark:text-blue-400">WiVision</span> - 
                Votre Solution BIM Complète
              </h1>

              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto md:mx-0">
                Découvrez une plateforme puissante pour gérer, visualiser et collaborer 
                sur vos modèles BIM en toute simplicité.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                {auth.authenticated ? (
                  <>
                    <Button 
                      asChild 
                      size="lg" 
                      className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 rounded-full px-8"
                    >
                      <Link href="/projects/create">
                        <Plus className="mr-2 h-5 w-5" />
                        Créer un projet
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50 
                        dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950/30 
                        rounded-full px-8"
                    >
                      <Link href="/projects">
                        <FolderOpen className="mr-2 h-5 w-5" />
                        Mes projets
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      asChild 
                      size="lg" 
                      className="bg-blue-600 hover:bg-blue-700 text-white 
                        dark:bg-blue-500 dark:hover:bg-blue-600 rounded-full px-8"
                    >
                      <Link href="/sign-in">Se connecter</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="border-blue-600 text-blue-600 hover:bg-blue-50 
                        dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950/30 
                        rounded-full px-8"
                    >
                      <Link href="/sign-up">Créer un compte</Link>
                    </Button>
                  </>
                )}
              </div>

              {/* Feature Highlights */}
              <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Visualisation 3D
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Collaboration en temps réel
                  </span>
                </div>
              </div>
            </motion.div>

          
    
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/30">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge 
              variant="secondary" 
              className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-none mb-4"
            >
              Fonctionnalités
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Tout ce dont vous avez besoin pour vos projets BIM
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Notre plateforme offre des outils puissants pour gérer efficacement vos projets de modélisation BIM
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`
                  bg-white dark:bg-gray-800 
                  p-6 rounded-xl 
                  border border-gray-200 dark:border-gray-700 
                  shadow-sm hover:shadow-md 
                  transition-all duration-300 
                  group
                `}
              >
                <div className={`
                  bg-blue-100 dark:bg-blue-900/30 
                  w-16 h-16 rounded-lg 
                  flex items-center justify-center 
                  mb-4 
                  group-hover:scale-105 transition-transform
                `}>
                  <feature.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white dark:bg-gray-950">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-600/10 dark:bg-blue-400/5 blur-3xl"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl text-center md:text-left">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Commencez à utiliser WiVision dès aujourd'hui
                </h2>
                <p className="text-blue-100">
                  Créez un compte gratuit et découvrez comment notre plateforme peut transformer votre façon de travailler.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 rounded-full px-8 whitespace-nowrap"
              >
                <Link href={auth.authenticated ? "/projects" : "/sign-up"} className="flex items-center">
                  {auth.authenticated ? "Accéder à mes projets" : "Créer un compte gratuit"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}