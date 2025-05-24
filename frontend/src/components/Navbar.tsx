"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Menu, X, Home, CuboidIcon, Sun, Moon } from "lucide-react"

// WiVision Logo Component
// WiVision Logo Component
const WiVisionLogo = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 48 48" 
    className={className}
  >
    <path 
      d="M24 16c-6.627 0-12 5.373-12 8s5.373 8 12 8 12-5.373 12-8-5.373-8-12-8zm0 14c-6.075 0-11-2.91-11-6s4.925-6 11-6 11 2.91 11 6-4.925 6-11 6z" 
      fill="currentColor"
    />
    <path 
      d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm0 36c-8.82 0-16-7.18-16-16S15.18 8 24 8s16 7.18 16 16-7.18 16-16 16z" 
      fill="currentColor"
    />
    <ellipse 
      cx="24" 
      cy="24" 
      rx="4" 
      ry="2.5" 
      fill="currentColor"
    />
  </svg>
)
import { useAuth } from "@/hooks/use-auth"
import { UserButton } from "./user-button"

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const { user, loading } = useAuth()

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(path)
  }

  if (!mounted) return null

  const navItems = [
    {
      name: "Accueil",
      href: "/",
      icon: <Home className="h-4 w-4 mr-2" />,
      showAlways: true,
    },
    {
      name: "Projets",
      href: "/projects",
      icon: <CuboidIcon className="h-4 w-4 mr-2" />,
      showWhenLoggedIn: true,
    },
  ]

  // Filter navigation items based on authentication state
  const filteredNavItems = navItems.filter(
    (item) => item.showAlways || (item.showWhenLoggedIn && user) || (!item.showWhenLoggedIn && !user)
  )

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50 
        transition-all duration-300 
        bg-white/90 dark:bg-gray-950/90 
        backdrop-blur-md 
        ${scrolled ? 'shadow-md' : 'border-b border-gray-200 dark:border-gray-800'}
      `}
    >
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center items-center space-x-2">
              <WiVisionLogo className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                WiVision
              </span>
            </Link>
          </div>

          {/* Navigation - Center */}
          <nav className="hidden md:flex items-center space-x-2">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center px-4 py-2 rounded-full text-sm font-medium 
                  transition-colors duration-300
                  ${isActive(item.href) 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}
                `}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`
                text-gray-600 dark:text-gray-300 
                hover:bg-gray-100 dark:hover:bg-gray-800
                transition-colors
              `}
              aria-label={theme === "dark" ? "Passer au mode clair" : "Passer au mode sombre"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {/* User avatar - only show when logged in */}
            {user && <UserButton />}

            {/* Login/Signup buttons */}
            {!user && !loading && (
              <div className="flex items-center space-x-2">
                <Button
                  asChild
                  variant="outline"
                  className={`
                    border-blue-600 text-blue-600 
                    hover:bg-blue-50 
                    dark:border-blue-400 dark:text-blue-400 
                    dark:hover:bg-blue-950/30
                    rounded-full
                  `}
                >
                  <Link href="/sign-in">Se connecter</Link>
                </Button>
                <Button
                  asChild
                  className={`
                    bg-blue-600 hover:bg-blue-700 
                    text-white 
                    dark:bg-blue-500 dark:hover:bg-blue-600 
                    rounded-full
                  `}
                >
                  <Link href="/sign-up">Créer un compte</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-600 dark:text-gray-300"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu principal"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-white dark:bg-gray-950 border-t dark:border-gray-800"
          >
            <div className="container mx-auto max-w-6xl px-4 py-4 space-y-2">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 rounded-md text-sm font-medium 
                    transition-colors
                    ${isActive(item.href) 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}
                  `}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}

              {!user && !loading && (
                <div className="pt-2 space-y-2">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950/30 rounded-md"
                  >
                    <Link href="/sign-in" onClick={() => setIsMenuOpen(false)}>
                      Se connecter
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md"
                  >
                    <Link href="/sign-up" onClick={() => setIsMenuOpen(false)}>
                      Créer un compte
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}