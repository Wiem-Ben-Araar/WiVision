"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"
import { Menu, X, Home, CuboidIcon, Sun, Moon } from "lucide-react"

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

  // Close mobile menu when clicking outside or on link
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isMenuOpen && !target.closest('.mobile-menu-container')) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

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
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50 
          transition-all duration-300 
          bg-white/95 dark:bg-gray-950/95 
          backdrop-blur-md 
          ${scrolled ? 'shadow-md border-b border-gray-200/50 dark:border-gray-800/50' : 'border-b border-gray-200 dark:border-gray-800'}
        `}
      >
        <div className="container mx-auto max-w-6xl px-3 sm:px-4 lg:px-6">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <Link href="/" className="flex items-center space-x-2 group">
                <WiVisionLogo className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-105" />
                <span className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 hidden xs:block">
                  WiVision
                </span>
              </Link>
            </div>

            {/* Navigation - Center - Hidden on mobile */}
            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center px-3 xl:px-4 py-2 rounded-full text-sm font-medium 
                    transition-all duration-300 hover:scale-105
                    ${isActive(item.href) 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}
                  `}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`
                  h-9 w-9 sm:h-10 sm:w-10
                  text-gray-600 dark:text-gray-300 
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  transition-all duration-300 hover:scale-105
                  rounded-full
                `}
                aria-label={theme === "dark" ? "Passer au mode clair" : "Passer au mode sombre"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>

              {/* User avatar - only show when logged in */}
              {user && <UserButton />}

              {/* Login/Signup buttons - Hidden on small screens when not logged in */}
              {!user && !loading && (
                <div className="hidden sm:flex items-center space-x-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className={`
                      border-blue-600 text-blue-600 
                      hover:bg-blue-50 hover:scale-105
                      dark:border-blue-400 dark:text-blue-400 
                      dark:hover:bg-blue-950/30
                      rounded-full transition-all duration-300
                      text-xs sm:text-sm px-3 sm:px-4
                    `}
                  >
                    <Link href="/sign-in">Se connecter</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className={`
                      bg-blue-600 hover:bg-blue-700 hover:scale-105
                      text-white 
                      dark:bg-blue-500 dark:hover:bg-blue-600 
                      rounded-full transition-all duration-300
                      text-xs sm:text-sm px-3 sm:px-4
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
                className="lg:hidden text-gray-600 dark:text-gray-300 h-9 w-9 sm:h-10 sm:w-10 rounded-full transition-all duration-300 hover:scale-105 mobile-menu-container"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menu principal"
              >
                <motion.div
                  animate={{ rotate: isMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </motion.div>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 lg:hidden backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Mobile Menu */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed top-14 sm:top-16 left-0 right-0 z-50 lg:hidden mobile-menu-container"
            >
              <div className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-lg">
                <div className="container mx-auto max-w-6xl px-3 sm:px-4 py-4 space-y-2">
                  {/* Navigation Items */}
                  {filteredNavItems.map((item, index) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                    >
                      <Link
                        href={item.href}
                        className={`
                          flex items-center px-4 py-3 rounded-xl text-sm font-medium 
                          transition-all duration-300 hover:scale-[1.02]
                          ${isActive(item.href) 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm' 
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}
                        `}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {item.icon}
                        {item.name}
                      </Link>
                    </motion.div>
                  ))}

                  {/* Auth buttons for mobile */}
                  {!user && !loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                      className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3"
                    >
                      <Button
                        asChild
                        variant="outline"
                        className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950/30 rounded-xl h-12 transition-all duration-300 hover:scale-[1.02]"
                      >
                        <Link href="/sign-in" onClick={() => setIsMenuOpen(false)}>
                          Se connecter
                        </Link>
                      </Button>
                      <Button
                        asChild
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl h-12 transition-all duration-300 hover:scale-[1.02]"
                      >
                        <Link href="/sign-up" onClick={() => setIsMenuOpen(false)}>
                          Créer un compte
                        </Link>
                      </Button>
                    </motion.div>
                  )}

                  {/* Brand name for very small screens */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className="xs:hidden pt-4 border-t border-gray-200 dark:border-gray-800"
                  >
                    <div className="text-center">
                      <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        WiVision
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add custom CSS for xs breakpoint */}
      <style jsx>{`
        @media (min-width: 475px) {
          .xs\\:block {
            display: block !important;
          }
          .xs\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}