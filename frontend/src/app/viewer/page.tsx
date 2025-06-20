"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { IFCViewer } from "@/components/IfcViewer"

function ViewerPageContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get("projectId")
  const filesParam = searchParams.get("files")

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertDescription>Project ID manquant</AlertDescription>
        </Alert>
      </div>
    )
  }

  let files: string[] = []
  if (filesParam) {
    try {
      files = JSON.parse(filesParam)
    } catch (e) {
      console.error("Erreur parsing files:", e)
    }
  }

  return <IFCViewer files={files} projectId={projectId} />
}

export default function ViewerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Chargement...</div>}>
      <ViewerPageContent />
    </Suspense>
  )
}
