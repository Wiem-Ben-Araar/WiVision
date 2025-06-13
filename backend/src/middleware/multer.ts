import multer from "multer"

// ✅ CONFIGURATION MULTER POUR UPLOAD MULTIPLE
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // ✅ 100MB par fichier (au lieu de 50MB)
    files: 10, // ✅ MAXIMUM 10 FICHIERS SIMULTANÉS
  },
  fileFilter: (req, file, cb) => {
    // Vérifier que c'est un fichier IFC
    if (file.originalname.toLowerCase().endsWith(".ifc")) {
      cb(null, true)
    } else {
      cb(new Error("Seuls les fichiers IFC sont autorisés") as any, false)
    }
  },
})

export const uploadMultiple = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB par fichier
    files: 10 // Maximum 10 fichiers
  }
}).array('files');

// Middleware pour gérer les erreurs Multer
export const handleMulterError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "Fichier trop volumineux",
        details: "Taille maximum: 100MB par fichier",
      })
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: "Trop de fichiers",
        details: "Maximum 10 fichiers simultanés",
      })
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Champ de fichier inattendu",
        details: 'Utilisez le champ "file" pour les uploads',
      })
    }
  }

  if (error.message === "Seuls les fichiers IFC sont autorisés") {
    return res.status(400).json({
      error: "Format de fichier non autorisé",
      details: "Seuls les fichiers .ifc sont acceptés",
    })
  }

  next(error)
}

export default upload
