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
