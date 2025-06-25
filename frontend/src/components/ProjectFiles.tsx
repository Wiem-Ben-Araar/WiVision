"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  FileBox,
  Download,
  Trash2,
  Upload,
  AlertCircle,
  Loader2,
  CuboidIcon,
  AlertTriangle,
  CheckCircle,
  X,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/hooks/use-auth"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"

interface ProjectFile {
  id: string
  name: string
  file_size?: number
  file_url: string
  supabasePath?: string
  uploadedBy?: string
  uploadedByEmail?: string
}

// Interface pour les membres du projet
interface Member {
  id: string
  name?: string
  email?: string
  role?: string
  image?: string
}

interface ProjectFilesProps {
  projectId: string
  files: ProjectFile[]
  userRole: "BIM Manager" | "BIM Coordinateur" | "BIM Modeleur"
  onFileUpload?: (files: ProjectFile[]) => void
  setFiles?: (files: ProjectFile[]) => void
}

interface UploadResult {
  success: boolean
  message: string
  stats: {
    total: number
    successful: number
    failed: number
    successRate: number
  }
  files: ProjectFile[]
  errors?: Array<{
    fileName: string
    error: string
  }>
}

interface FileData {
  _id?: string
  name: string
  file_size?: number
  file_url: string
  supabasePath?: string
  uploadedBy?: string | number
  uploadedByEmail?: string
}

export default function ProjectFiles({
  projectId,
  files = [],
  userRole,
  onFileUpload,
  setFiles: setParentFiles,
}: ProjectFilesProps) {
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [visualizerLoading, setVisualizerLoading] = useState(false)
  
  // Ajouter l'état pour les membres du projet
  const [projectMembers, setProjectMembers] = useState<Member[]>([])

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const currentUserEmail = user?.email
  const currentUserId = user?.id

  // Récupérer le rôle réel de l'utilisateur depuis les membres du projet
  const currentUserMember = projectMembers.find(member => member.email === user?.email)
  const actualUserRole = currentUserMember?.role || userRole
  const isBIMModeleur = actualUserRole === "BIM Modeleur"

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewAllUrl, setViewAllUrl] = useState("#")
  const [hasValidFiles, setHasValidFiles] = useState(false)
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([])

  // États pour l'upload avec notification discrète
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)

  // Fonction pour récupérer les membres du projet
  const fetchProjectMembers = useCallback(async () => {
    if (!apiUrl || !projectId) return

    try {
      const response = await axios.get(`${apiUrl}/projects/${projectId}/members`, {
        withCredentials: true
      })
      setProjectMembers(response.data.members || [])
    } catch (error) {
      console.error("Erreur lors de la récupération des membres:", error)
      // En cas d'erreur, on garde les membres vides, le rôle de props sera utilisé
    }
  }, [apiUrl, projectId])

  // Récupérer les membres au montage du composant
  useEffect(() => {
    fetchProjectMembers()
  }, [fetchProjectMembers])

  useEffect(() => {
    const uploadTrigger = document.getElementById("upload-file-trigger")
    if (uploadTrigger) {
      const handleClick = () => setUploadDialogOpen(true)
      uploadTrigger.addEventListener("click", handleClick)
      return () => uploadTrigger.removeEventListener("click", handleClick)
    }
  }, [])

  const isValidFileUrl = (url: string | undefined): boolean => {
    return !!url && typeof url === "string" && url.trim() !== ""
  }

  const adaptFiles = (inputFiles: FileData[]): ProjectFile[] => {
    return inputFiles.map((file) => ({
      id: file._id || `temp-${Math.random()}`,
      name: file.name,
      file_size: file.file_size,
      file_url: file.file_url,
      supabasePath: file.supabasePath,
      uploadedBy: file.uploadedBy?.toString(),
      uploadedByEmail: file.uploadedByEmail,
    }))
  }

  const updateViewAllUrl = useCallback(() => {
    const validFiles = projectFiles.filter((file) => isValidFileUrl(file.file_url))
    const valid = validFiles.length > 0
    setHasValidFiles(valid)

    if (valid) {
      const validUrls = validFiles.map((file) => file.file_url)
      sessionStorage.setItem(`valid_urls_${projectId}`, JSON.stringify(validUrls))
      sessionStorage.setItem(`current_project_id`, projectId)

      const urlStr = JSON.stringify(validUrls)
      const newViewAllUrl = `/viewer?files=${encodeURIComponent(urlStr)}&projectId=${encodeURIComponent(projectId)}`
      setViewAllUrl(newViewAllUrl)
      console.log("Valid URLs:", validUrls)
      console.log("Generated viewAllUrl:", newViewAllUrl)

    } else {
      setViewAllUrl("#")
      sessionStorage.removeItem(`valid_urls_${projectId}`)
    }
  }, [projectFiles, projectId])

  const handleVisualizerClick = () => {
    if (!hasValidFiles) return
    setVisualizerLoading(true)
    window.location.href = viewAllUrl
  }

  const canDeleteFile = (file: ProjectFile) => {
    // Utiliser le rôle réel au lieu du rôle de props
    if (actualUserRole === "BIM Manager") return true
    const isUploader = file.uploadedBy === currentUserId || file.uploadedByEmail === currentUserEmail
    return isUploader
  }

  const openDeleteDialog = (file: ProjectFile) => {
    setFileToDelete(file)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!fileToDelete) return

    setLoading(true)
    try {
      await axios.delete(`${apiUrl}/files`, {
        data: {
          fileId: fileToDelete.id,
          projectId,
          supabasePath: fileToDelete.supabasePath,
        },
        withCredentials: true,
      })

      const updatedFiles = projectFiles.filter((file) => file.id !== fileToDelete.id)
      setProjectFiles(updatedFiles)
      if (setParentFiles) setParentFiles(updatedFiles)
      updateViewAllUrl()
      setDeleteDialogOpen(false)
      setFileToDelete(null)

      toast.success("Fichier supprimé avec succès")
    } catch {
      toast.error("Échec de la suppression du fichier")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const adaptedFiles = adaptFiles(files)
    setProjectFiles(adaptedFiles)
  }, [projectId, files])

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError("Veuillez sélectionner des fichiers")
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)
    setUploadResult(null)

    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => formData.append("files", file))
      formData.append("projectId", projectId)

      const { data } = await axios.post(`${apiUrl}/files/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setUploadProgress(percentCompleted)
          }
        },
      })

      setUploadProgress(100)

      const result: UploadResult = {
        success: data.success,
        message: data.message,
        stats: data.stats,
        files: data.files || [],
        errors: data.errors,
      }

      setUploadResult(result)

      // Notification discrète avec toast
      if (result.stats.failed === 0) {
        toast.success(`${result.stats.successful} fichier(s) importé(s) avec succès`, {
          description: "Les fichiers sont maintenant disponibles dans le projet",
        })
        setShowSuccessNotification(true)
        setTimeout(() => setShowSuccessNotification(false), 4000)
      } else {
        toast.warning(`${result.stats.successful} fichier(s) importé(s), ${result.stats.failed} échec(s)`, {
          description: "Certains fichiers n'ont pas pu être importés",
        })
      }

      // Rafraîchir la liste
      await fetchFiles()

      // Notifier le parent
      if (onFileUpload && result.files?.length > 0) {
        onFileUpload(
          result.files.map((file) => ({
            ...file,
            uploadedBy: currentUserId,
            uploadedByEmail: currentUserEmail,
          })),
        )
      }

      // Fermer automatiquement si succès complet
      if (result.stats.failed === 0) {
        setTimeout(() => {
          setUploadDialogOpen(false)
          setSelectedFiles([])
          setUploadResult(null)
        }, 2000)
      }
    } catch (error) {
      let errorMessage = "Échec de l'importation des fichiers"

      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data
        if (responseData?.error) errorMessage = responseData.error
        else if (responseData?.errors) {
          errorMessage = responseData.errors.map((e: { error: string }) => e.error).join(", ")
        }
      }

      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    const savedUrls = sessionStorage.getItem(`valid_urls_${projectId}`)
    if (savedUrls) {
      try {
        const validUrls = JSON.parse(savedUrls)
        if (Array.isArray(validUrls) && validUrls.length > 0) {
          setHasValidFiles(true)
          const urlStr = JSON.stringify(validUrls)
          setViewAllUrl(`/viewer?files=${encodeURIComponent(urlStr)}&projectId=${encodeURIComponent(projectId)}`)
        }
      } catch {
        // Gestion silencieuse des erreurs de parsing
      }
    }
  }, [projectId])

  useEffect(() => {
    if (projectFiles.length > 0) updateViewAllUrl()
  }, [projectFiles, updateViewAllUrl])

  function formatFileSize(size: number): string {
    if (!size) return "0 o"
    const units = ["o", "Ko", "Mo", "Go"]
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  const fetchFiles = useCallback(async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/projects/${projectId}/files`, {
        withCredentials: true,
      })
      const adaptedFiles = adaptFiles(data)
      setProjectFiles(adaptedFiles)
      if (setParentFiles) setParentFiles(adaptedFiles)
    } catch {
      // Gestion silencieuse des erreurs de récupération
    }
  }, [apiUrl, projectId, setParentFiles])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const truncateFileName = (fileName: string, maxLength = 35) => {
    if (!fileName) return "Sans nom"
    if (fileName.length <= maxLength) return fileName
    const extension = fileName.split(".").pop() || ""
    const nameWithoutExt = fileName.substring(0, fileName.length - extension.length - 1)
    const truncated = nameWithoutExt.substring(0, maxLength - 3 - extension.length)
    return `${truncated}...${extension ? `.${extension}` : ""}`
  }

  const extractUsername = (email?: string) => {
    if (!email) return "Inconnu"
    if (email.includes("@")) return email.split("@")[0]
    if (/^[0-9a-f]{24}$/.test(email)) return `Utilisateur ${email.slice(0, 5)}`
    return email
  }

  const handleDownloadClick = (file: ProjectFile) => {
    if (file.file_url) {
      window.open(file.file_url, "_blank")
    } else {
      toast.error("URL du fichier non disponible")
    }
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Notification de succès discrète */}
      <AnimatePresence>
        {showSuccessNotification && uploadResult && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-4 right-4 z-50 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 shadow-lg max-w-sm"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Importation réussie</p>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                  {uploadResult.stats.successful} fichier(s) ajouté(s) au projet
                </p>
              </div>
              <button
                onClick={() => setShowSuccessNotification(false)}
                className="text-green-400 hover:text-green-600 dark:text-green-500 dark:hover:text-green-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
        <h2 className="font-semibold text-[#005CA9] dark:text-blue-400 flex items-center gap-2">
          <FileBox className="h-5 w-5" />
          Fichiers du projet
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2 border-gray-300 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={handleVisualizerClick}
            disabled={!hasValidFiles || visualizerLoading}
          >
            {visualizerLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#005CA9] dark:text-blue-400" />
            ) : (
              <CuboidIcon className="h-4 w-4 text-[#005CA9] dark:text-blue-400" />
            )}
            Visualiser
          </Button>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#005CA9] hover:bg-[#004A87] text-white dark:bg-blue-600 dark:hover:bg-blue-700 gap-2">
                <Upload className="h-4 w-4" />
                Importer des fichiers
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg dark:bg-gray-900 dark:border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-[#005CA9] dark:text-blue-400">
                  Importer des fichiers IFC
                </DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-300">
                  Sélectionnez un ou plusieurs fichiers IFC à ajouter au projet
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                  </motion.div>
                )}

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <Input
                    type="file"
                    accept=".ifc"
                    multiple
                    onChange={(e) => {
                      setSelectedFiles(e.target.files ? Array.from(e.target.files) : [])
                      setError(null)
                    }}
                    className="cursor-pointer dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    disabled={uploading}
                  />
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                    <p>Formats acceptés : .ifc</p>
                    <p className="text-xs">Maximum 20 fichiers simultanés</p>
                  </div>
                </div>

                {uploading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                      <span>Importation en cours...</span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </motion.div>
                )}

                {selectedFiles.length > 0 && !uploading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
                  >
                    <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      {selectedFiles.length} fichier(s) sélectionné(s)
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-300 mb-3">
                      Taille totale : {formatFileSize(selectedFiles.reduce((total, file) => total + file.size, 0))}
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-xs bg-white dark:bg-gray-800 p-2 rounded border"
                        >
                          <span className="truncate flex-1 mr-2 text-gray-700 dark:text-gray-300">{file.name}</span>
                          <span className="text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {uploadResult && uploadResult.stats.failed > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">Importation partielle</p>
                        <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                          {uploadResult.stats.successful} réussis, {uploadResult.stats.failed} échoués
                        </p>
                        {uploadResult.errors && uploadResult.errors.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {uploadResult.errors.map((error, index) => (
                              <div key={index} className="text-xs text-yellow-600 dark:text-yellow-400">
                                • {error.fileName}: {error.error}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadDialogOpen(false)
                      setSelectedFiles([])
                      setUploadResult(null)
                      setError(null)
                    }}
                    disabled={uploading}
                    className="dark:border-gray-700 dark:text-gray-300"
                  >
                    {uploadResult && uploadResult.stats.failed === 0 ? "Fermer" : "Annuler"}
                  </Button>
                  {(!uploadResult || uploadResult.stats.failed > 0) && (
                    <Button
                      onClick={handleUpload}
                      disabled={uploading || selectedFiles.length === 0}
                      className="bg-[#005CA9] hover:bg-[#004A87] text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      {uploading ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Importation...</span>
                        </div>
                      ) : (
                        `Importer ${selectedFiles.length} fichier(s)`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300 pt-2">
              Êtes-vous sûr de vouloir supprimer le fichier{" "}
              <span className="font-medium text-gray-900 dark:text-gray-100">&ldquo;{fileToDelete?.name}&rdquo;</span> ?
              <span className="block mt-2 text-red-500 dark:text-red-400 text-sm">Cette action est irréversible.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
              className="dark:border-gray-700 dark:text-gray-300"
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {loading ? (
                <div className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Suppression...</span>
                </div>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {projectFiles.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8 text-center border-gray-200 dark:border-gray-800 dark:bg-gray-900">
            <div className="bg-blue-50 dark:bg-blue-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileBox className="h-8 w-8 text-[#005CA9] dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Aucun fichier importé</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Importez des fichiers IFC pour commencer à travailler sur votre projet
            </p>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="bg-[#005CA9] hover:bg-[#004A87] text-white dark:bg-blue-600 dark:hover:bg-blue-700 gap-2"
            >
              <Upload className="h-4 w-4" />
              Importer des fichiers
            </Button>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectFiles.map((file, index) => {
            const canDelete = canDeleteFile(file)
            const displayName = truncateFileName(file.name)
            const username = file.uploadedByEmail
              ? extractUsername(file.uploadedByEmail)
              : extractUsername(file.uploadedBy)

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4 hover:shadow-md transition-all duration-200 border-gray-200 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center flex-1">
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg mr-3 flex-shrink-0">
                        <FileBox className="h-5 w-5 text-[#005CA9] dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="font-medium text-sm break-words text-gray-800 dark:text-gray-200"
                          title={file.name}
                        >
                          {displayName}
                        </h3>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {formatFileSize(file.file_size || 0)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Créé par <span className="font-medium">{username}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => handleDownloadClick(file)}
                      disabled={isBIMModeleur}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger
                    </Button>

                    {canDelete && (
                      <Button
                        onClick={() => openDeleteDialog(file)}
                        variant="destructive"
                        size="sm"
                        className="bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}