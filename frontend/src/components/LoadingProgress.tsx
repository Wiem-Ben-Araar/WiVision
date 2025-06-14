
import { Progress } from "@/components/ui/progress"
import { Loader2, FileText, CheckCircle } from "lucide-react"

interface LoadingProgressProps {
  isVisible: boolean
  currentFile: string
  currentFileIndex: number
  totalFiles: number
  progress: number
  loadedModels: string[]
}

export const LoadingProgress: React.FC<LoadingProgressProps> = ({
  isVisible,
  currentFile,
  currentFileIndex,
  totalFiles,
  progress,
  loadedModels
}) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
        {/* En-tête */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-[#005CA9] dark:text-[#3b82f6]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="h-6 w-6 text-[#005CA9] dark:text-[#3b82f6]" />
              </div>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Chargement des modèles IFC
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {currentFileIndex} sur {totalFiles} fichiers
          </p>
        </div>

        {/* Barre de progression globale */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Progression globale</span>
            <span>{Math.round((currentFileIndex / totalFiles) * 100)}%</span>
          </div>
          <Progress 
            value={(currentFileIndex / totalFiles) * 100} 
            className="h-2 bg-gray-200 dark:bg-gray-700"
          />
        </div>

        {/* Fichier en cours */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Fichier actuel</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress 
            value={progress} 
            className="h-2 bg-gray-200 dark:bg-gray-700"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 truncate">
            {currentFile}
          </p>
        </div>

        {/* Liste des modèles chargés */}
        {loadedModels.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
              Modèles chargés ({loadedModels.length})
            </h3>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {loadedModels.map((modelName, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400 truncate">
                    {modelName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message d'état */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Veuillez patienter pendant le chargement...
          </p>
        </div>
      </div>
    </div>
  )
}