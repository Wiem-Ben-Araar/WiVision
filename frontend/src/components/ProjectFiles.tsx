"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileBox, Download, Trash2, Upload, AlertCircle, Loader2, CuboidIcon, AlertTriangle } from "lucide-react"
import Link from "next/link"
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
import { useAuth } from "@/hooks/use-auth"
import axios from "axios"
import { motion } from "framer-motion"

interface ProjectFile {
  id: string
  name: string
  file_size?: number
  file_url: string
  firebasePath?: string
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
  const [visualizerLoading, setVisualizerLoading] = useState(false) // Nouveau state pour le loading du visualiser

  const isBIMManager = userRole === "BIM Manager"
  const isBIMCoordinateur = userRole === "BIM Coordinateur"
  const isBIMModeleur = userRole === "BIM Modeleur"

  const currentUserEmail = user?.email
  const currentUserId = user?.id
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewAllUrl, setViewAllUrl] = useState("#")
  const [hasValidFiles, setHasValidFiles] = useState(false)
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([])

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
      firebasePath: file.firebasePath,
      uploadedBy: file.uploadedBy?.toString(),
      uploadedByEmail: file.uploadedByEmail,
    }))
  }

  const updateViewAllUrl = () => {
    const validFiles = projectFiles.filter((file) => isValidFileUrl(file.file_url))

    const validUrls = validFiles.map((file) => {
      let url = file.file_url

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

  // Fonction pour gérer le clic sur Visualiser avec loading
  const handleVisualizerClick = (e: React.MouseEvent) => {
    if (!hasValidFiles) return
    
    setVisualizerLoading(true)
    
    // Simuler un délai de redirection réaliste
    setTimeout(() => {
      window.location.href = viewAllUrl
    }, 500) // 500ms de délai pour montrer le loading
  }

  const canDeleteFile = (file: ProjectFile) => {
    // Allow owners to delete any file
    if (userRole === "BIM Manager") return true

    // Allow uploaders to delete their own files
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
      await axios.delete(`/api/files`, {
        data: { fileId: fileToDelete.id, projectId },
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

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return setError("Veuillez sélectionner des fichiers")

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => formData.append("file", file))
      formData.append("projectId", projectId)

      const { data } = await axios.post(`/api/files/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      })

      // Refresh files list
      await fetchFiles()

      // Notify parent component about the upload
      if (onFileUpload && data.files && data.files.length > 0) {
        data.files.forEach((file: any) => {
          onFileUpload({
            id: file._id,
            name: file.name,
            file_size: file.fileSize,
            file_url: file.url,
            uploadedBy: currentUserId,
            uploadedByEmail: currentUserEmail,
          })
        })
      }

      setUploadDialogOpen(false)
      setSelectedFiles([])
    } catch (error) {
      console.error("Upload failed:", error)

      const errorMessage =
        (axios.isAxiosError(error) && error.response?.data?.error) ||
        (axios.isAxiosError(error) && error.response?.data?.message) ||
        "Échec du téléchargement des fichiers. Veuillez vérifier votre statut de connexion."

      setError(errorMessage)
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
      const { data } = await axios.get(`/api/projects/${projectId}/files`, {
        withCredentials: true,
      })
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
          Fichiers du projet
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
                Importer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-[#005CA9] dark:text-blue-400">
                  Importer des fichiers IFC
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
                <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                  <Input
                    type="file"
                    accept=".ifc"
                    multiple
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : []
                      setSelectedFiles(files)
                      setError(null)
                    }}
                    className="cursor-pointer dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Formats acceptés : .ifc (plusieurs fichiers peuvent être sélectionnés)
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <div>{selectedFiles.length} fichier(s) sélectionné(s)</div>
                    <ul className="list-disc pl-5 mt-1">
                      {selectedFiles.slice(0, 3).map((file, index) => (
                        <li key={`selected-file-${index}`}>
                          {file.name} ({formatFileSize(file.size)})
                        </li>
                      ))}
                      {selectedFiles.length > 3 && <li key="more-files">...et {selectedFiles.length - 3} de plus</li>}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setUploadDialogOpen(false)}
                    disabled={uploading}
                    className="dark:border-gray-700 dark:text-gray-300"
                  >
                    Annuler
                  </Button>
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
                      "Importer"
                    )}
                  </Button>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="p-8 text-center border-gray-200 dark:border-gray-800 dark:bg-gray-900">
            <FileBox className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Aucun fichier importé</h3>
            <div className="text-gray-500 dark:text-gray-400 mb-4">Importez un fichier IFC pour commencer</div>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="bg-[#005CA9] hover:bg-[#004A87] text-white dark:bg-blue-600 dark:hover:bg-blue-700 gap-2"
            >
              <Upload className="h-4 w-4" />
              Importer un fichier
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