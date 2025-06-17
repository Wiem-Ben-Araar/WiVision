"use client"

import { useState } from "react"
import axios, { type AxiosError } from "axios"
import { Button } from "@/components/ui/button"
import { CrosshairIcon, Loader2, FileStack, AlertCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { validateClashConfig, getSessionIdError, validateClashReport } from "@/lib/validators"
import ClashConfigModal from "./ClashConfigModal"
import { ClashReport } from "./ClashReport"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

interface LoadedModel {
  id: string
  name: string
  url: string
}

interface ClashResult {
  element_a: {
    name: string
    type: string
    guid: string
    model: string
  }
  element_b: {
    name: string
    type: string
    guid: string
    model: string
  }
  distance: number
  position: number[]
  overlap_volume?: number
}

interface ClashResponse {
  clashes: ClashResult[]
  status?: string
  error?: string
  session_id?: string
}

interface IntraClashResponse {
  clashes: ClashResult[]
  model_name: string
  element_count: number
  clashing_element_count: number
  ai_used: boolean
  status?: string
  error?: string
  session_id?: string
}

interface ApiErrorResponse {
  error?: string
}

interface StatusResponse {
  clashes?: ClashResult[]
  model_name?: string
  element_count?: number
  clashing_element_count?: number
  ai_used?: boolean
  status?: string
  error?: string
}

export default function ClashButton({ loadedModels }: { loadedModels: LoadedModel[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ClashResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pollingStatus, setPollingStatus] = useState("")
  const [aiMetrics, setAiMetrics] = useState<{ used: boolean; accuracy?: string }>({ used: false })
  const [intraResults, setIntraResults] = useState<IntraClashResponse | null>(null)
  const [intraMode, setIntraMode] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const handleDetect = async (config: {
    modelUrls: string[]
    tolerance: number
    useAI: boolean
  }) => {
    setLoading(true)
    setError(null)
    setValidationErrors([])
    setPollingStatus("Validation des paramètres...")

    try {
      // Validate configuration
      const validation = validateClashConfig({
        tolerance: config.tolerance,
        modelUrls: config.modelUrls,
        useAI: config.useAI,
      })

      if (!validation.isValid) {
        setValidationErrors(validation.errors)
        setLoading(false)
        return
      }

      const formData = new FormData()
      const files = await Promise.all(
        config.modelUrls.map(async (url, index) => {
          setPollingStatus(`Chargement du modèle ${index + 1}/${config.modelUrls.length}...`)
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`Erreur lors du chargement du modèle ${index + 1}: ${response.statusText}`)
          }
          return await response.blob()
        }),
      )

      files.forEach((file, index) => {
        formData.append("models", file, `model${index + 1}.ifc`)
      })
      formData.append("tolerance", config.tolerance.toString())
      formData.append("use_ai", config.useAI.toString())

      setPollingStatus("Envoi des modèles au serveur...")

      const { data } = await axios.post<ClashResponse>(`${API_BASE_URL}/clash/detect`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 300000, // 5 minutes timeout
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setPollingStatus(`Upload en cours... ${percentCompleted}%`)
          }
        },
      })

      // Validate session ID
      if (data.session_id) {
        const sessionError = getSessionIdError(data.session_id)
        if (sessionError) {
          throw new Error(sessionError)
        }
        setSessionId(data.session_id)
      }

      setAiMetrics({ used: config.useAI })

      if (data.session_id) {
        setPollingStatus("Analyse des clashs en cours...")
        const result = await pollResults(data.session_id)

        // Validate clash report data
        if (result.clashes) {
          const reportValidation = validateClashReport(result.clashes)
          if (!reportValidation.isValid) {
            console.warn("Données de clash invalides:", reportValidation.errors)
          }
        }

        setResults(result.clashes ?? null)
        setModalOpen(false)

        // Open HTML report in new tab
        if (data.session_id) {
          window.open(`${API_BASE_URL}/clash/report/html/${data.session_id}`, "_blank")
        }
      } else {
        throw new Error("Session ID manquant dans la réponse")
      }
    } catch (err) {
      console.error("Erreur détectée:", err)
      let errorMsg = "Erreur lors de la détection des clashs"

      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ApiErrorResponse>
        if (axiosError.code === "ECONNABORTED") {
          errorMsg = "Timeout: La détection prend trop de temps. Essayez avec une tolérance plus grande."
        } else if (axiosError.response?.status === 502) {
          errorMsg =
            "Erreur serveur (502): Le service de détection est temporairement indisponible. Veuillez réessayer dans quelques minutes."
        } else if (axiosError.response?.data?.error) {
          errorMsg = axiosError.response.data.error
        } else {
          errorMsg = `Erreur de connexion: ${axiosError.message}`
        }
      } else if (err instanceof Error && err.message) {
        errorMsg = err.message
      }

      setError(errorMsg)
    } finally {
      setLoading(false)
      setPollingStatus("")
    }
  }

  const handleDetectIntra = async (config: {
    modelUrl: string
    tolerance: number
    useAI: boolean
  }) => {
    setLoading(true)
    setError(null)
    setValidationErrors([])
    setPollingStatus("Validation des paramètres...")

    try {
      // Validate configuration
      const validation = validateClashConfig({
        tolerance: config.tolerance,
        modelUrl: config.modelUrl,
        useAI: config.useAI,
      })

      if (!validation.isValid) {
        setValidationErrors(validation.errors)
        setLoading(false)
        return
      }

      const formData = new FormData()

      setPollingStatus("Téléchargement du modèle...")
      const response = await fetch(config.modelUrl)
      if (!response.ok) {
        throw new Error(`Erreur lors du chargement du modèle: ${response.statusText}`)
      }
      const fileBlob = await response.blob()

      formData.append("model", fileBlob, "model.ifc")
      formData.append("tolerance", config.tolerance.toString())
      formData.append("use_ai", config.useAI.toString())

      setPollingStatus("Analyse intra-modèle en cours...")

      const { data } = await axios.post<IntraClashResponse>(`${API_BASE_URL}/clash/detect_intra`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 300000, // 5 minutes timeout
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setPollingStatus(`Upload en cours... ${percentCompleted}%`)
          }
        },
      })

      // Validate session ID
      if (data.session_id) {
        const sessionError = getSessionIdError(data.session_id)
        if (sessionError) {
          throw new Error(sessionError)
        }
        setSessionId(data.session_id)

        setPollingStatus("Analyse intra-modèle en cours...")
        const result = await pollResults(data.session_id)

        // Validate clash report data
        if (result.clashes) {
          const reportValidation = validateClashReport(result.clashes)
          if (!reportValidation.isValid) {
            console.warn("Données de clash invalides:", reportValidation.errors)
          }
        }

        setIntraResults({
          clashes: result.clashes ?? [],
          model_name: result.model_name ?? "",
          element_count: result.element_count ?? 0,
          clashing_element_count: result.clashing_element_count ?? 0,
          ai_used: result.ai_used ?? false,
          status: result.status,
          error: result.error,
          session_id: data.session_id,
        })
        setIntraMode(true)
        setModalOpen(false)

        // Open HTML report in new tab
        window.open(`${API_BASE_URL}/clash/report/html/${data.session_id}`, "_blank")
      } else {
        throw new Error("Session ID manquant dans la réponse")
      }
    } catch (err) {
      console.error("Erreur détectée:", err)
      let errorMsg = "Erreur lors de l'analyse intra-modèle"

      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ApiErrorResponse>
        if (axiosError.code === "ECONNABORTED") {
          errorMsg = "Timeout: L'analyse prend trop de temps. Essayez avec une tolérance plus grande."
        } else if (axiosError.response?.status === 502) {
          errorMsg =
            "Erreur serveur (502): Le service d'analyse est temporairement indisponible. Veuillez réessayer dans quelques minutes."
        } else if (axiosError.response?.data?.error) {
          errorMsg = axiosError.response.data.error
        } else {
          errorMsg = `Erreur de connexion: ${axiosError.message}`
        }
      } else if (err instanceof Error && err.message) {
        errorMsg = err.message
      }

      setError(errorMsg)
    } finally {
      setLoading(false)
      setPollingStatus("")
    }
  }

  const pollResults = async (sessionId: string): Promise<StatusResponse> => {
    const MAX_ATTEMPTS = 300 // 300 tentatives (15 minutes)
    const DELAY = 3000

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const progress = Math.min(100, Math.round((attempt / MAX_ATTEMPTS) * 100))
        setPollingStatus(`Analyse en cours... ${progress}%`)

        const { data } = await axios.get<StatusResponse>(
          `${API_BASE_URL}/clash/status/${sessionId}`,
          { timeout: 10000 }, // 10s timeout par requête
        )

        if (data.error) {
          throw new Error(data.error)
        }

        if (data.status === "completed" || data.clashes) {
          return data
        }

        await new Promise((resolve) => setTimeout(resolve, DELAY))
      } catch (err) {
        // Ignorer les erreurs de timeout et continuer
        if (axios.isAxiosError(err) && err.code === "ECONNABORTED") {
          await new Promise((resolve) => setTimeout(resolve, DELAY))
          continue
        }

        throw err
      }
    }
    throw new Error("Délai dépassé pour la détection")
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setModalOpen(true)}
        disabled={loadedModels.length < 1 || loading}
        title="Détection de clash"
        className="relative group"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <div className="relative">
            <CrosshairIcon className="h-5 w-5" />
            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-[8px] rounded-full h-4 w-4 flex items-center justify-center">
              <FileStack className="h-3 w-3" />
            </div>
          </div>
        )}
      </Button>

      <ClashConfigModal
        models={loadedModels}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          setError(null)
          setValidationErrors([])
          setIntraMode(false)
        }}
        onDetect={handleDetect}
        onDetectIntra={handleDetectIntra}
        intraMode={intraMode}
        setIntraMode={setIntraMode}
      />

      {/* Validation Errors Display */}
      {validationErrors.length > 0 && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg shadow-lg z-50 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Erreurs de validation :</div>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {loading && pollingStatus && (
        <div className="fixed top-4 right-4 bg-blue-100 text-blue-800 p-4 rounded-lg shadow-lg z-50 flex items-center">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span>{pollingStatus}</span>
          {aiMetrics.used && (
            <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">IA activée</span>
          )}
        </div>
      )}

      {results && (
        <ClashReport
          data={results}
          onClose={() => setResults(null)}
          aiUsed={aiMetrics.used}
          reportTitle="Rapport de Clashs Inter-Modèles"
          reportSubtitle={`${results.length} conflits détectés`}
        />
      )}

      {intraResults && (
        <ClashReport
          data={intraResults.clashes}
          onClose={() => setIntraResults(null)}
          aiUsed={intraResults.ai_used}
          reportTitle={`Détection Intra-Modèle: ${intraResults.model_name}`}
          reportSubtitle={`${intraResults.clashing_element_count} éléments en conflit sur ${intraResults.element_count}`}
        />
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 text-red-700 p-4 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex justify-between items-start">
            <div>
              <strong className="font-medium">Erreur de détection</strong>
              <p className="mt-1 text-sm">{error}</p>
            </div>
            <button className="ml-4 text-red-700 hover:text-red-900 text-lg" onClick={() => setError(null)}>
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  )
}
