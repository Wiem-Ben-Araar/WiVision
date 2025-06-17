/**
 * Validates an email address format
 */
export const validateEmail = (email: string): boolean => {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return re.test(email)
}

/**
 * Validates a password (min 8 chars, at least 1 uppercase, 1 number)
 */
export const validatePassword = (password: string): boolean => {
  const re = /^(?=.*[A-Z])(?=.*\d).{8,}$/
  return re.test(password)
}

/**
 * Validates a name (minimum 2 characters)
 */
export const validateName = (name: string): boolean => {
  return name.trim().length >= 2
}

/**
 * Checks if passwords match
 */
export const passwordsMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword
}

/**
 * Validates a project name (2-50 characters, no special chars except spaces, hyphens, underscores)
 */
export const validateProjectName = (name: string): boolean => {
  const trimmedName = name.trim()
  if (trimmedName.length < 2 || trimmedName.length > 50) {
    return false
  }
  // Allow letters, numbers, spaces, hyphens, and underscores
  const re = /^[a-zA-Z0-9\s\-_]+$/
  return re.test(trimmedName)
}

/**
 * Validates a project description (max 500 characters)
 */
export const validateProjectDescription = (description: string): boolean => {
  return description.trim().length <= 500
}

/**
 * Get project name validation error message
 */
export const getProjectNameError = (name: string): string | null => {
  const trimmedName = name.trim()
  if (trimmedName.length === 0) {
    return "Le nom du projet est obligatoire"
  }
  if (trimmedName.length < 2) {
    return "Le nom doit contenir au moins 2 caractères"
  }
  if (trimmedName.length > 50) {
    return "Le nom ne doit pas dépasser 50 caractères"
  }
  const re = /^[a-zA-Z0-9\s\-_]+$/
  if (!re.test(trimmedName)) {
    return "Le nom ne peut contenir que des lettres, chiffres, espaces, tirets et underscores"
  }
  return null
}

/**
 * Get project description validation error message
 */
export const getProjectDescriptionError = (description: string): string | null => {
  if (description.trim().length > 500) {
    return "La description ne doit pas dépasser 500 caractères"
  }
  return null
}

/**
 * Validates a todo title (2-100 characters)
 */
export const validateTodoTitle = (title: string): boolean => {
  const trimmedTitle = title.trim()
  return trimmedTitle.length >= 2 && trimmedTitle.length <= 100
}

/**
 * Validates a todo description (max 1000 characters)
 */
export const validateTodoDescription = (description: string): boolean => {
  return description.trim().length <= 1000
}

/**
 * Get todo title validation error message
 */
export const getTodoTitleError = (title: string): string | null => {
  const trimmedTitle = title.trim()
  if (trimmedTitle.length === 0) {
    return "Le titre est obligatoire"
  }
  if (trimmedTitle.length < 2) {
    return "Le titre doit contenir au moins 2 caractères"
  }
  if (trimmedTitle.length > 100) {
    return "Le titre ne doit pas dépasser 100 caractères"
  }
  return null
}

/**
 * Get todo description validation error message
 */
export const getTodoDescriptionError = (description: string): string | null => {
  if (description.trim().length > 1000) {
    return "La description ne doit pas dépasser 1000 caractères"
  }
  return null
}

/**
 * Validates todo priority
 */
export const validateTodoPriority = (priority: string): boolean => {
  const validPriorities = ["Critical", "Normal", "Minor", "On hold", "Undefined", "Medium"]
  return validPriorities.includes(priority)
}

/**
 * Validates todo status
 */
export const validateTodoStatus = (status: string): boolean => {
  const validStatuses = ["new", "in-progress", "waiting", "done", "closed", "actif", "résolu", "fermé"]
  return validStatuses.includes(status)
}
// ===== CLASH DETECTION VALIDATORS =====

/**
 * Validates clash detection tolerance value
 */
export const validateClashTolerance = (tolerance: number): boolean => {
  return tolerance > 0 && tolerance <= 1.0 && !isNaN(tolerance)
}

/**
 * Get clash tolerance validation error message
 */
export const getClashToleranceError = (tolerance: number): string | null => {
  if (isNaN(tolerance)) {
    return "La tolérance doit être un nombre valide"
  }
  if (tolerance <= 0) {
    return "La tolérance doit être supérieure à 0"
  }
  if (tolerance > 1.0) {
    return "La tolérance ne doit pas dépasser 1.0 mètre"
  }
  return null
}

/**
 * Validates IFC file extension
 */
export const validateIFCFile = (filename: string): boolean => {
  if (!filename || typeof filename !== "string") {
    return false
  }
  return filename.toLowerCase().endsWith(".ifc")
}

/**
 * Get IFC file validation error message
 */
export const getIFCFileError = (filename: string): string | null => {
  if (!filename || typeof filename !== "string") {
    return "Le nom de fichier est requis"
  }
  if (!filename.toLowerCase().endsWith(".ifc")) {
    return "Le fichier doit avoir l'extension .ifc"
  }
  return null
}

/**
 * Validates file size (max 2GB for IFC files)
 */
export const validateFileSize = (size: number, maxSizeGB = 2): boolean => {
  const maxSizeBytes = maxSizeGB * 1024 * 1024 * 1024
  return size > 0 && size <= maxSizeBytes
}

/**
 * Get file size validation error message
 */
export const getFileSizeError = (size: number, maxSizeGB = 2): string | null => {
  if (size <= 0) {
    return "Le fichier ne peut pas être vide"
  }
  const maxSizeBytes = maxSizeGB * 1024 * 1024 * 1024
  if (size > maxSizeBytes) {
    return `Le fichier ne doit pas dépasser ${maxSizeGB}GB`
  }
  return null
}

/**
 * Validates minimum number of models for inter-model clash detection
 */
export const validateModelCount = (count: number, minCount = 2): boolean => {
  return count >= minCount
}

/**
 * Get model count validation error message
 */
export const getModelCountError = (count: number, minCount = 2): string | null => {
  if (count < minCount) {
    return `Au moins ${minCount} modèles sont requis pour la détection inter-modèles`
  }
  return null
}

/**
 * Validates session ID format (UUID)
 */
export const validateSessionId = (sessionId: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(sessionId)
}

/**
 * Get session ID validation error message
 */
export const getSessionIdError = (sessionId: string): string | null => {
  if (!sessionId) {
    return "L'ID de session est requis"
  }
  if (!validateSessionId(sessionId)) {
    return "L'ID de session n'est pas valide"
  }
  return null
}

/**
 * Validates clash detection configuration
 */
export const validateClashConfig = (config: {
  tolerance: number
  modelUrls?: string[]
  modelUrl?: string
  useAI?: boolean
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Validate tolerance
  const toleranceError = getClashToleranceError(config.tolerance)
  if (toleranceError) {
    errors.push(toleranceError)
  }

  // Validate models for inter-model detection
  if (config.modelUrls) {
    const modelCountError = getModelCountError(config.modelUrls.length)
    if (modelCountError) {
      errors.push(modelCountError)
    }

    // Validate each model URL
    config.modelUrls.forEach((url, index) => {
      if (!url || typeof url !== "string") {
        errors.push(`L'URL du modèle ${index + 1} est invalide`)
      }
    })
  }

  // Validate single model for intra-model detection
  if (config.modelUrl && (!config.modelUrl || typeof config.modelUrl !== "string")) {
    errors.push("L'URL du modèle est invalide")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Validates clash report data
 */
export const validateClashReport = (clashes: any[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!Array.isArray(clashes)) {
    errors.push("Les données de clash doivent être un tableau")
    return { isValid: false, errors }
  }

  clashes.forEach((clash, index) => {
    if (!clash.element_a || !clash.element_b) {
      errors.push(`Le clash ${index + 1} doit contenir les éléments A et B`)
    }

    if (typeof clash.distance !== "number" || clash.distance < 0) {
      errors.push(`La distance du clash ${index + 1} doit être un nombre positif`)
    }

    if (!Array.isArray(clash.position) || clash.position.length !== 3) {
      errors.push(`La position du clash ${index + 1} doit être un tableau de 3 coordonnées`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}
