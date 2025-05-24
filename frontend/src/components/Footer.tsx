import Link from "next/link"
import { Building, Github, Twitter, Linkedin } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Building className="h-6 w-6 text-revit-blue" />
              <span className="font-bold text-lg bg-gradient-to-r from-revit-blue to-blue-600 bg-clip-text text-transparent">
                BIM Platform
              </span>
            </div>
            <p className="text-sm text-gray-600 max-w-xs">
              Une plateforme moderne pour visualiser, collaborer et gérer vos modèles BIM en toute simplicité.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-gray-500 hover:text-revit-blue transition-colors">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
              <Link href="#" className="text-gray-500 hover:text-revit-blue transition-colors">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
              <Link href="#" className="text-gray-500 hover:text-revit-blue transition-colors">
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Produit</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-600 hover:text-revit-blue text-sm">
                  Fonctionnalités
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-revit-blue text-sm">
                  Tarifs
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-revit-blue text-sm">
                  Témoignages
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-revit-blue text-sm">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Ressources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-600 hover:text-revit-blue text-sm">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-revit-blue text-sm">
                  Tutoriels
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-revit-blue text-sm">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-revit-blue text-sm">
                  Communauté
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Entreprise</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-gray-600 hover:text-revit-blue text-sm">
                  À propos
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-revit-blue text-sm">
                  Carrières
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-revit-blue text-sm">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-revit-blue text-sm">
                  Mentions légales
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-600">&copy; {new Date().getFullYear()} BIM Platform. Tous droits réservés.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="#" className="text-sm text-gray-600 hover:text-revit-blue">
              Confidentialité
            </Link>
            <Link href="#" className="text-sm text-gray-600 hover:text-revit-blue">
              Conditions d'utilisation
            </Link>
            <Link href="#" className="text-sm text-gray-600 hover:text-revit-blue">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
