'use client'

import { useEffect } from 'react'

interface ClientLayoutProps {
  children: React.ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  useEffect(() => {
    // Code qui doit s'exécuter côté client uniquement
    console.log('Application initialisée côté client')
  }, [])

  return <>{children}</>
}