import multer from "multer";
import type { Request } from "express";

// ⚡ CONFIGURATION HAUTE PERFORMANCE
const storage = multer.memoryStorage();

export const uploadMultiple = multer({
  storage,
  limits: {
    fileSize: 250 * 1024 * 1024, // 250MB par fichier
    files: 20, // Jusqu'à 20 fichiers
    fieldSize: 500 * 1024 * 1024, // 500MB pour les autres champs
  },
  fileFilter: (req: Request, file, cb) => {
    if (file.originalname.toLowerCase().endsWith(".ifc")) {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers IFC sont autorisés") as any, false);
    }
  },
}).any(); // ⚡ Accepte tous les fichiers sous n'importe quel nom

// Middleware pour gérer les erreurs Multer
export const handleMulterError = (error: any, req: any, res: any, next: any) => {
  if (error) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "Fichier trop volumineux",
        details: "Taille maximum: 250MB par fichier",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(413).json({
        error: "Trop de fichiers",
        details: "Maximum 20 fichiers simultanés",
      });
    }
    if (error.message === "Seuls les fichiers IFC sont autorisés") {
      return res.status(415).json({
        error: "Format non supporté",
        details: "Seuls les fichiers .ifc sont acceptés",
      });
    }
  }
  next(error);
};