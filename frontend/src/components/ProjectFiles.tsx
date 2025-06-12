"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/hooks/use-auth"
import axios from "axios"
import { motion } from "framer-motion"

interface ProjectFile {
  id: string
  name: string
  file_size?: number
  file_url: string
  supabasePath?: string
  uploadedBy?: string
  uploadedByEmail?: string
}

interface ProjectFilesProps {
  projectId: string
  files: ProjectFile[]
  userRole: "BIM Manager" | "BIM Coordinateur" | "BIM Modeleur"
  onFileUpload?: (file: ProjectFile) => void
  setFiles?: (files: ProjectFile[]) => void
}

// ✅ INTERFACE POUR RÉSULTATS UPLOAD MULTIPLE
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

  const isBIMManager = userRole === "BIM Manager"
  const isBIMCoordinateur = userRole === "BIM Coordinateur"
  const isBIMModeleur = userRole === "BIM Modeleur"
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  const currentUserEmail = user?.email
  const currentUserId = user?.id
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewAllUrl, setViewAllUrl] = useState("#")
  const [hasValidFiles, setHasValidFiles] = useState(false)
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([])

  // ✅ NOUVEAUX ÉTATS POUR UPLOAD MULTIPLE
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [showUploadResult, setShowUploadResult] = useState(false)

  // Listen for external trigger to open upload dialog
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

  const adaptFiles = (inputFiles: any[]): ProjectFile[] => {
    return inputFiles.map((file) => ({
      id: file._id || `temp-${Math.random()}`,
      name: file.name,
      file_size: file.file_size,
      file_url: file.file_url,
      supabasePath: file.supabasePath || file.firebasePath,
      uploadedBy: file.uploadedBy?.toString(),
      uploadedByEmail: file.uploadedByEmail,
    }))
  }

  const updateViewAllUrl = () => {
    const validFiles = projectFiles.filter((file) => isValidFileUrl(file.file_url))

    const validUrls = validFiles.map((file) => {
      let url = file.file_url

      if (url.includes("supabase.co")) {
        return url
      }

      if (url.includes("127.0.0.1:4001")) {
        url = url.replace(/%252F/g, "%2F")
      }

      return url
    })

    const valid = validUrls.length > 0
    setHasValidFiles(valid)

    if (valid) {
      sessionStorage.setItem(`valid_urls_${projectId}`, JSON.stringify(validUrls))
      sessionStorage.setItem(`current_project_id`, projectId)

      const urlStr = JSON.stringify(validUrls)
      const newViewAllUrl = `/viewer?files=${encodeURIComponent(urlStr)}&projectId=${encodeURIComponent(projectId)}`
      setViewAllUrl(newViewAllUrl)
    } else {
      setViewAllUrl("#")
      sessionStorage.removeItem(`valid_urls_${projectId}`)
    }
  }

  const handleVisualizerClick = (e: React.MouseEvent) => {
    if (!hasValidFiles) return

    setVisualizerLoading(true)

    setTimeout(() => {
      window.location.href = viewAllUrl
    }, 500)
  }

  const canDeleteFile = (file: ProjectFile) => {
    if (userRole === "BIM Manager") return true

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
      if (setParentFiles) {
        setParentFiles(updatedFiles)
      }

      updateViewAllUrl()
      setDeleteDialogOpen(false)
      setFileToDelete(null)
    } catch (error) {
      console.error("Error during deletion:", error)
      setError("Échec de la suppression du fichier")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const adaptedFiles = adaptFiles(files)
    setProjectFiles(adaptedFiles)
  }, [projectId, files])

  // ✅ FONCTION UPLOAD MULTIPLE AMÉLIORÉE
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return setError("Veuillez sélectionner des fichiers")

    setUploading(true)
    setError(null)
    setUploadProgress(0)
    setUploadResult(null)
    setShowUploadResult(false)

    try {
      const formData = new FormData()

      // ✅ AJOUTER TOUS LES FICHIERS SÉLECTIONNÉS
      selectedFiles.forEach((file, index) => {
        formData.append("file", file) // Même nom de champ pour tous
        console.log(`📎 Ajout fichier ${index + 1}/${selectedFiles.length}: ${file.name}`)
      })

      formData.append("projectId", projectId)

      console.log(`🚀 Upload de ${selectedFiles.length} fichier(s) vers Supabase Storage...`)

      // ✅ SIMULATION PROGRESS (optionnel)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const { data } = await axios.post(`${apiUrl}/files/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      console.log("✅ Upload multiple réussi:", data)

      // ✅ TRAITEMENT RÉSULTAT UPLOAD MULTIPLE
      const result: UploadResult = {
        success: data.success,
        message: data.message,
        stats: data.stats,
        files: data.files || [],
        errors: data.errors,
      }

      setUploadResult(result)
      setShowUploadResult(true)

      // Refresh files list
      await fetchFiles()

      // Notify parent component about successful uploads
      if (onFileUpload && result.files && result.files.length > 0) {
        result.files.forEach((file: ProjectFile) => {
          onFileUpload({
            ...file,
            uploadedBy: currentUserId,
            uploadedByEmail: currentUserEmail,
          })
        })
      }

      // ✅ FERMER LE DIALOG SEULEMENT SI TOUS LES FICHIERS ONT RÉUSSI
      if (result.stats.failed === 0) {
        setTimeout(() => {
          setUploadDialogOpen(false)
          setSelectedFiles([])
          setShowUploadResult(false)
        }, 3000) // Fermer après 3 secondes
      }
    } catch (error) {
      console.error("Upload failed:", error)

      let errorMessage = "Échec du téléchargement des fichiers."

      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data
        if (responseData?.error) {
          errorMessage = responseData.error
        } else if (responseData?.errors && Array.isArray(responseData.errors)) {
          errorMessage = responseData.errors.map((e: any) => `${e.fileName}: ${e.error}`).join(", ")
        } else if (responseData?.message) {
          errorMessage = responseData.message
        }

        if (errorMessage.includes("Bucket not found")) {
          errorMessage = "Erreur de configuration Supabase. Contactez l'administrateur."
        } else if (errorMessage.includes("row-level security")) {
          errorMessage = "Permissions Supabase insuffisantes. Contactez l'administrateur."
        }
      }

      setError(errorMessage)
    } finally {
      setUploading(false)
      setUploadProgress(0)
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
          sessionStorage.setItem(`current_project_id`, projectId)
        }
      } catch (e) {
        console.error("Error retrieving URLs:", e)
      }
    }
  }, [projectId])

  useEffect(() => {
    if (projectFiles.length > 0) {
      updateViewAllUrl()
    }
  }, [projectFiles])

  function formatFileSize(size: number): string {
    if (!size) return "0 B"
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const fetchFiles = async () => {
    try {
      console.log("🔄 Récupération fichiers depuis Supabase...")
      const { data } = await axios.get(`${apiUrl}/projects/${projectId}/files`, {
        withCredentials: true,
      })
      console.log("✅ Fichiers récupérés:", data.length)

      const adaptedFiles = adaptFiles(data)
      setProjectFiles(adaptedFiles)
      if (setParentFiles) {
        setParentFiles(adaptedFiles)
      }
      return data
    } catch (error) {
      console.error("Loading error:", error)
      return []
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [projectId])

  const truncateFileName = (fileName: string, maxLength = 35) => {
    if (!fileName) return "Sans nom"
    if (fileName.length <= maxLength) return fileName

    const extension = fileName.split(".").pop() || ""
    const nameWithoutExt = fileName.substring(0, fileName.length - extension.length - 1)

    if (nameWithoutExt.length <= maxLength - 3 - extension.length) {
      return fileName
    }

    return `${nameWithoutExt.substring(0, maxLength - 3 - extension.length)}...${extension ? `.${extension}` : ""}`
  }

  const extractUsername = (email?: string) => {
    if (!email) return "Inconnu"

    if (email.includes("@")) {
      return email.split("@")[0]
    }

    if (typeof email === "string" && /^[0-9a-f]{24}$/.test(email)) {
      return `Utilisateur ${email.slice(0, 5)}`
    }

    return email
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
        <h2 className="font-semibold text-[#005CA9] dark:text-blue-400 flex items-center gap-2">
          <FileBox className="h-5 w-5" />
          Fichiers du projet (Supabase Storage)
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2 border-gray-300 dark:border-gray-700 dark:text-gray-300"
            onClick={handleVisualizerClick}
            disabled={!hasValidFiles || visualizerLoading}
          >
            {visualizerLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#005CA9] dark:text-blue-400" />
                Chargement...
              </>
            ) : (
              <>
                <CuboidIcon className="h-4 w-4 text-[#005CA9] dark:text-blue-400" />
                Visualiser
              </>
            )}
          </Button>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#005CA9] hover:bg-[#004A87] text-white dark:bg-blue-600 dark:hover:bg-blue-700 gap-2">
                <Download className="h-4 w-4" />
                Upload Multiple
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg dark:bg-gray-900 dark:border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-[#005CA9] dark:text-blue-400">
                  Upload Multiple vers Supabase Storage
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {error && (
                  <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <AlertDescription>
                        <span className="text-red-600 dark:text-red-400">{error}</span>
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                {/* ✅ RÉSULTAT UPLOAD MULTIPLE */}
                {showUploadResult && uploadResult && (
                  <Alert
                    className={
                      uploadResult.stats.failed === 0
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                    }
                  >
                    <div className="flex items-start gap-2">
                      {uploadResult.stats.failed === 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <AlertDescription>
                          <div
                            className={
                              uploadResult.stats.failed === 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-yellow-600 dark:text-yellow-400"
                            }
                          >
                            <strong>{uploadResult.message}</strong>
                          </div>
                          <div className="mt-2 text-sm">
                            <div>✅ Réussis: {uploadResult.stats.successful}</div>
                            {uploadResult.stats.failed > 0 && <div>❌ Échoués: {uploadResult.stats.failed}</div>}
                            <div>📊 Taux de réussite: {uploadResult.stats.successRate}%</div>
                          </div>
                          {uploadResult.errors && uploadResult.errors.length > 0 && (
                            <div className="mt-2 text-sm">
                              <div className="font-medium">Erreurs:</div>
                              {uploadResult.errors.map((error, index) => (
                                <div key={index} className="text-red-600 dark:text-red-400">
                                  • {error.fileName}: {error.error}
                                </div>
                              ))}
                            </div>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}

                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                  <Input
                    type="file"
                    accept=".ifc"
                    multiple // ✅ PERMETTRE SÉLECTION MULTIPLE
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : []
                      setSelectedFiles(files)
                      setError(null)
                      setShowUploadResult(false)
                    }}
                    className="cursor-pointer dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    disabled={uploading}
                  />
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Formats acceptés : .ifc (sélectionnez plusieurs fichiers avec Ctrl/Cmd)
                    <br />
                    <span className="text-green-600 dark:text-green-400">
                      ✅ Supabase Storage (1GB gratuit, max 10 fichiers simultanés)
                    </span>
                  </div>
                </div>

                {/* ✅ PROGRESS BAR POUR UPLOAD */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Upload en cours...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="w-full" />
                  </div>
                )}

                {/* ✅ LISTE DES FICHIERS SÉLECTIONNÉS */}
                {selectedFiles.length > 0 && (
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <div className="font-medium mb-2">
                      {selectedFiles.length} fichier(s) sélectionné(s) (
                      {formatFileSize(selectedFiles.reduce((total, file) => total + file.size, 0))})
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={`selected-file-${index}`}
                          className="flex justify-between items-center text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded"
                        >
                          <span className="truncate flex-1 mr-2">{file.name}</span>
                          <span className="text-gray-500">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadDialogOpen(false)
                      setSelectedFiles([])
                      setShowUploadResult(false)
                      setError(null)
                    }}
                    disabled={uploading}
                    className="dark:border-gray-700 dark:text-gray-300"
                  >
                    {showUploadResult && uploadResult?.stats.failed === 0 ? "Fermer" : "Annuler"}
                  </Button>
                  {(!showUploadResult || (uploadResult && uploadResult.stats.failed > 0)) && (
                    <Button
                      onClick={handleUpload}
                      disabled={uploading || selectedFiles.length === 0}
                      className="bg-[#005CA9] hover:bg-[#004A87] text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                      {uploading ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span>Upload {selectedFiles.length} fichier(s)...</span>
                        </div>
                      ) : (
                        `Upload ${selectedFiles.length} fichier(s)`
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Boîte de dialogue de confirmation de suppression */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300 pt-2">
              Êtes-vous sûr de vouloir supprimer le fichier <span className="font-medium">{fileToDelete?.name}</span> ?
              <span className="block mt-2 text-red-500 dark:text-red-400 text-sm">
                Cette action supprimera le fichier de Supabase Storage et est irréversible.
              </span>
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
                  Supprimer de Supabase
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {projectFiles.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="p-8 text-center border-gray-200 dark:border-gray-800 dark:bg-gray-900">
            <FileBox className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Aucun fichier importé</h3>
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              Importez des fichiers IFC vers Supabase Storage pour commencer
            </div>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="bg-[#005CA9] hover:bg-[#004A87] text-white dark:bg-blue-600 dark:hover:bg-blue-700 gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Multiple
            </Button>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectFiles.map((file, index) => {
            const validUrl = isValidFileUrl(file.file_url)
            const canDelete = canDeleteFile(file)
            const displayName = truncateFileName(file.name)
            const username = file.uploadedByEmail
              ? extractUsername(file.uploadedByEmail)
              : file.uploadedBy
                ? extractUsername(file.uploadedBy)
                : "Inconnu"

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="p-4 border-gray-200 dark:border-gray-800 dark:bg-gray-900 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg mr-3 flex-shrink-0">
                        <FileBox className="h-5 w-5 text-[#005CA9] dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          className="font-medium text-sm break-words whitespace-normal max-w-xs text-gray-800 dark:text-gray-200"
                          title={file.name}
                        >
                          {displayName}
                        </h3>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.file_size || 0)}
                        </div>

                        {(file.uploadedByEmail || file.uploadedBy) && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Créé par <span className="font-medium">{username}</span>
                          </div>
                        )}

                        {file.supabasePath && (
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">📦 Supabase Storage</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-300 dark:border-gray-700 dark:text-gray-300"
                      onClick={() => window.open(file.file_url)}
                      disabled={!validUrl || isBIMModeleur}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {validUrl ? "Télécharger" : "Téléchargement indisponible"}
                    </Button>

                    {canDelete && (
                      <Button
                        onClick={() => openDeleteDialog(file)}
                        variant="destructive"
                        size="sm"
                        className="ml-2 bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800"
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
