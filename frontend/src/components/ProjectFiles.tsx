"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileBox, Download, Trash2, Upload, AlertCircle, Loader2, CuboidIcon } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
  userRole: "BIM Manager" | "BIM Coordinateur" | "BIM Modeleur";
  onFileUpload?: (file: ProjectFile) => void
}

export default function ProjectFiles({ projectId, files = [], userRole, onFileUpload }: ProjectFilesProps) {
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
   
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

  const canDeleteFile = (file: ProjectFile) => {
    // Allow owners to delete any file
    if (userRole === "BIM Manager") return true

    // Allow uploaders to delete their own files
    const isUploader = file.uploadedBy === currentUserId || file.uploadedByEmail === currentUserEmail
    return isUploader
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce fichier ?")) return

    setLoading(true)
    try {
      await axios.delete(`/api/files`, {
        data: { fileId, projectId },
        withCredentials: true,
      })
      fetchFiles()
      const updatedFiles = projectFiles.filter((file) => file.id !== fileId)
      setProjectFiles(updatedFiles)
      updateViewAllUrl()
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
      setProjectFiles(adaptFiles(data))
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
            asChild={hasValidFiles}
            disabled={!hasValidFiles}
          >
            {hasValidFiles ? (
              <Link href={viewAllUrl}>
                <CuboidIcon className="h-4 w-4 text-[#005CA9] dark:text-blue-400" /> Visualiser
              </Link>
            ) : (
              <>
                <CuboidIcon className="h-4 w-4" />
                Visualiser
              </>
            )}
          </Button>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#005CA9] hover:bg-[#004A87] text-white dark:bg-blue-600 dark:hover:bg-blue-700 gap-2">
                <Upload className="h-4 w-4" />
                Téléverser
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md dark:bg-gray-900 dark:border-gray-800">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-[#005CA9] dark:text-blue-400">
                  Téléverser des fichiers IFC
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
                        <span>Téléversement...</span>
                      </div>
                    ) : (
                      "Téléverser"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {projectFiles.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="p-8 text-center border-gray-200 dark:border-gray-800 dark:bg-gray-900">
            <FileBox className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium mb-2 text-gray-800 dark:text-gray-200">Aucun fichier téléversé</h3>
            <div className="text-gray-500 dark:text-gray-400 mb-4">Téléversez un fichier IFC pour commencer</div>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="bg-[#005CA9] hover:bg-[#004A87] text-white dark:bg-blue-600 dark:hover:bg-blue-700 gap-2"
            >
              <Upload className="h-4 w-4" />
              Téléverser un fichier
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
  disabled={!validUrl || isBIMModeleur} // ✅ Seul BIM Modeleur est désactivé
>
  <Download className="h-4 w-4 mr-2" />
  {validUrl ? "Télécharger" : "Téléchargement indisponible"}
</Button>

                    {canDelete && (
                      <Button
                        onClick={() => handleDelete(file.id)}
                        variant="destructive"
                        size="sm"
                        disabled={loading}
                        className="ml-2 bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
