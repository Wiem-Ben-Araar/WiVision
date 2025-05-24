"use client"

import { useRef } from "react"
import { useInView } from "framer-motion"
import { Building, FolderOpen, Users, Layers, FileText, Share2 } from "lucide-react"
import { useTheme } from "next-themes"

export default function FeaturesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const { theme } = useTheme()

  const features = [
    {
      icon: <Building className="h-10 w-10 text-primary mb-4" />,
      title: "Visualisation 3D",
      description: "Explorez vos modèles BIM en 3D avec des outils de navigation intuitifs et performants.",
    },
    {
      icon: <Users className="h-10 w-10 text-primary mb-4" />,
      title: "Collaboration",
      description: "Travaillez en équipe sur vos projets avec des outils de partage et d'annotation en temps réel.",
    },
    {
      icon: <FolderOpen className="h-10 w-10 text-primary mb-4" />,
      title: "Gestion de projets",
      description: "Organisez et suivez l'avancement de vos projets BIM de manière efficace et centralisée.",
    },
    {
      icon: <Layers className="h-10 w-10 text-primary mb-4" />,
      title: "Multi-formats",
      description: "Compatible avec les principaux formats BIM du marché (IFC, Revit, etc.).",
    },
    {
      icon: <FileText className="h-10 w-10 text-primary mb-4" />,
      title: "Documentation",
      description: "Générez automatiquement des rapports et de la documentation à partir de vos modèles.",
    },
    {
      icon: <Share2 className="h-10 w-10 text-primary mb-4" />,
      title: "Partage sécurisé",
      description: "Partagez vos modèles en toute sécurité avec vos clients et partenaires.",
    },
  ]

  return (
    <section className="py-16 relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-muted/20 dark:to-muted/10" />

      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Fonctionnalités avancées</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Notre plateforme BIM offre tous les outils dont vous avez besoin pour gérer efficacement vos projets de
            construction
          </p>
        </div>

        <div
          className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
          style={{
            transform: isInView ? "none" : "translateY(50px)",
            opacity: isInView ? 1 : 0,
            transition: "all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.2s",
          }}
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card p-6 rounded-lg border shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-5px]"
              style={{
                transitionDelay: `${index * 0.1}s`,
              }}
            >
              {feature.icon}
              <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
