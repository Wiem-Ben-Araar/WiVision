"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Info, FileStack, CrosshairIcon, Loader2, AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getClashToleranceError, getModelCountError, validateClashConfig } from "@/lib/validators"

interface Model {
  id: string
  name: string
  url: string
}

interface ClashConfigModalProps {
  models: Model[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetect: (config: { modelUrls: string[]; tolerance: number; useAI: boolean }) => Promise<void>
  onDetectIntra: (config: { modelUrl: string; tolerance: number; useAI: boolean }) => Promise<void>
  intraMode: boolean
  setIntraMode: (mode: boolean) => void
}

export default function ClashConfigModal({
  models,
  open,
  onOpenChange,
  onDetect,
  onDetectIntra,
  intraMode,
  setIntraMode,
}: ClashConfigModalProps) {
  const [tolerance, setTolerance] = useState(0.01)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [useAI, setUseAI] = useState(true)
  const [aiExplanationOpen, setAiExplanationOpen] = useState(false)
  const [selectedIntraModel, setSelectedIntraModel] = useState<string | null>(null)

  // Validation states
  const [toleranceError, setToleranceError] = useState<string | null>(null)
  const [modelCountError, setModelCountError] = useState<string | null>(null)
  const [configErrors, setConfigErrors] = useState<string[]>([])

  useEffect(() => {
    const initialSelection: Record<string, boolean> = {}
    models.forEach((m) => {
      initialSelection[m.id] = false
    })
    setSelected(initialSelection)
  }, [models])

  // Validate tolerance in real-time
  useEffect(() => {
    setToleranceError(getClashToleranceError(tolerance))
  }, [tolerance])

  // Validate model count for inter-model detection
  useEffect(() => {
    if (!intraMode) {
      const selectedCount = Object.values(selected).filter(Boolean).length
      setModelCountError(getModelCountError(selectedCount))
    } else {
      setModelCountError(null)
    }
  }, [selected, intraMode])

  const handleToleranceChange = (value: string) => {
    const numValue = Number.parseFloat(value)
    setTolerance(numValue)
  }

  const handleSubmit = async () => {
    // Clear previous errors
    setConfigErrors([])

    if (intraMode) {
      if (!selectedIntraModel) {
        setConfigErrors(["Sélectionnez un modèle pour la détection intra-modèle"])
        return
      }

      // Validate intra-model configuration
      const validation = validateClashConfig({
        tolerance,
        modelUrl: selectedIntraModel,
        useAI,
      })

      if (!validation.isValid) {
        setConfigErrors(validation.errors)
        return
      }

      setLoading(true)
      try {
        await onDetectIntra({
          modelUrl: selectedIntraModel,
          tolerance,
          useAI,
        })
      } catch (error) {
        console.error("Intra-model detection error:", error)
        setConfigErrors(["Erreur lors de la détection intra-modèle"])
      } finally {
        setLoading(false)
      }
    } else {
      const selectedModels = models.filter((m) => selected[m.id])

      // Validate inter-model configuration
      const validation = validateClashConfig({
        tolerance,
        modelUrls: selectedModels.map((m) => m.url),
        useAI,
      })

      if (!validation.isValid) {
        setConfigErrors(validation.errors)
        return
      }

      setLoading(true)
      try {
        await onDetect({
          modelUrls: selectedModels.map((m) => m.url),
          tolerance,
          useAI,
        })
      } catch (error) {
        console.error("Inter-model detection error:", error)
        setConfigErrors(["Erreur lors de la détection inter-modèles"])
      } finally {
        setLoading(false)
      }
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length
  const isFormValid = !toleranceError && !modelCountError && configErrors.length === 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {intraMode ? (
                <div className="flex items-center gap-2">
                  <FileStack className="h-5 w-5 text-blue-500" />
                  <span>Détection Intra-Modèle</span>
                </div>
              ) : (
                "Configuration de détection de clash"
              )}
            </DialogTitle>
            <DialogDescription>
              {intraMode ? "Analysez les conflits au sein d'un même modèle" : "Sélectionnez les modèles à comparer"}
            </DialogDescription>
          </DialogHeader>

          {/* Display validation errors */}
          {configErrors.length > 0 && (
            <Alert className="border-red-500 bg-red-50 text-red-900">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {configErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Mode Sélecteur */}
          <div className="flex gap-4 border-b pb-4 mb-4">
            <Button variant={intraMode ? "outline" : "default"} onClick={() => setIntraMode(false)} className="flex-1">
              Entre modèles
            </Button>
            <Button variant={intraMode ? "default" : "outline"} onClick={() => setIntraMode(true)} className="flex-1">
              <FileStack className="mr-2 h-4 w-4" />
              Au sein d'un modèle
            </Button>
          </div>

          {intraMode ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Sélectionnez un modèle à analyser</Label>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  {models.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Aucun modèle chargé. Chargez d'abord un modèle.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {models.map((model) => (
                        <div
                          key={model.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedIntraModel === model.url ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                          }`}
                          onClick={() => setSelectedIntraModel(model.url)}
                        >
                          <div className="font-medium">{model.name}</div>
                          <div className="text-xs text-gray-500 truncate">{model.url}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  Tolérance de détection (mètres)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Pour la détection intra-modèle, une tolérance plus petite est recommandée pour détecter les
                          conflits entre éléments proches.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max="1.0"
                    value={tolerance}
                    onChange={(e) => handleToleranceChange(e.target.value)}
                    className={`w-32 ${toleranceError ? "border-red-500" : ""}`}
                  />
                  <span className="text-sm text-gray-500">Valeur recommandée: 0.005 - 0.02 m</span>
                </div>
                {toleranceError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {toleranceError}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-start gap-3">
                  <Checkbox id="use-ai-intra" checked={useAI} onCheckedChange={() => setUseAI(!useAI)} />
                  <div>
                    <label htmlFor="use-ai-intra" className="font-medium cursor-pointer">
                      Utiliser l'intelligence artificielle
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      L'IA est particulièrement efficace pour la détection intra-modèle, permettant d'identifier
                      rapidement les conflits entre éléments de même discipline.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="tolerance" className="flex items-center gap-2">
                  Tolérance de détection (mètres)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Distance minimale entre les éléments pour considérer un clash. Une valeur plus petite
                          détectera plus de conflits mais prendra plus de temps.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="tolerance"
                    type="number"
                    step="0.001"
                    min="0.001"
                    max="1.0"
                    value={tolerance}
                    onChange={(e) => handleToleranceChange(e.target.value)}
                    className={`w-32 ${toleranceError ? "border-red-500" : ""}`}
                  />
                  <span className="text-sm text-gray-500">Valeur recommandée: 0.01 - 0.05 m</span>
                </div>
                {toleranceError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {toleranceError}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Modèles à comparer</Label>
                  <span className="text-sm text-gray-500">
                    {selectedCount} modèle{selectedCount !== 1 ? "s" : ""} sélectionné{selectedCount !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                  {models.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Aucun modèle chargé. Chargez d'abord des modèles.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {models.map((model) => (
                        <div
                          key={model.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selected[model.id] ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                          }`}
                          onClick={() =>
                            setSelected((prev) => ({
                              ...prev,
                              [model.id]: !prev[model.id],
                            }))
                          }
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={model.id}
                              checked={selected[model.id]}
                              onCheckedChange={(checked) => setSelected((prev) => ({ ...prev, [model.id]: !!checked }))}
                            />
                            <div>
                              <label htmlFor={model.id} className="font-medium cursor-pointer">
                                {model.name}
                              </label>
                              <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{model.url}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {modelCountError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {modelCountError}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    Optimisation par IA
                    <button
                      type="button"
                      onClick={() => setAiExplanationOpen(true)}
                      className="text-blue-600 text-sm font-normal"
                    >
                      (en savoir plus)
                    </button>
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${useAI ? "bg-green-500" : "bg-gray-300"}`}></div>
                    <span className="text-sm">{useAI ? "Activée" : "Désactivée"}</span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start gap-3">
                    <Checkbox id="use-ai" checked={useAI} onCheckedChange={() => setUseAI(!useAI)} />
                    <div>
                      <label htmlFor="use-ai" className="font-medium cursor-pointer">
                        Utiliser l'intelligence artificielle
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        Accélère la détection en utilisant un modèle prédictif pour éliminer rapidement les paires
                        d'éléments sans conflit.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                loading || !isFormValid || (intraMode && !selectedIntraModel) || (!intraMode && selectedCount < 2)
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {intraMode ? "Analyse en cours..." : "Détection en cours..."}
                </>
              ) : (
                <>
                  {intraMode ? <FileStack className="h-4 w-4 mr-2" /> : <CrosshairIcon className="h-4 w-4 mr-2" />}
                  {intraMode ? "Lancer l'analyse intra-modèle" : "Lancer la détection"}
                  {useAI && <span className="ml-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">IA</span>}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup d'explication IA */}
      <Dialog open={aiExplanationOpen} onOpenChange={setAiExplanationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Optimisation par IA</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-bold text-blue-700 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Comment fonctionne l'optimisation IA ?
              </h3>
              <p className="mt-2 text-gray-700">
                Notre système utilise un modèle d'apprentissage automatique entraîné sur des milliers de cas de clashs
                pour prédire rapidement quelles paires d'éléments ont une forte probabilité d'être en conflit.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Avantages :</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-800 rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                    ✓
                  </span>
                  <span>Réduction jusqu'à 70% du temps de calcul</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-800 rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                    ✓
                  </span>
                  <span>Détection plus rapide sur les grands projets</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-800 rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">
                    ✓
                  </span>
                  <span>Précision maintenue grâce à une vérification traditionnelle des cas limites</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-700">Note importante :</h4>
              <p className="text-sm text-yellow-600 mt-1">
                L'IA agit comme un filtre préliminaire. Tous les conflits potentiels détectés par l'IA sont ensuite
                vérifiés par la méthode traditionnelle pour garantir une précision de 100%.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setAiExplanationOpen(false)}>Compris</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
