import express from "express"
import { uploadFiles, getProjectFiles, deleteFile, getFileById } from "../controllers/fileController"
import { authenticate } from "../middleware/auth"
import { uploadMultiple, handleMulterError } from "../middleware/multer"

const router = express.Router()

// ✅ ROUTE UPLOAD MULTIPLE AVEC MIDDLEWARE ADAPTÉ
router.post(
  "/upload",
  authenticate,
  uploadMultiple, // ✅ Middleware pour upload multiple
  handleMulterError, // ✅ Gestion erreurs Multer
  uploadFiles,
)

router.get("/projects/:id/files", authenticate, getProjectFiles)
router.delete("/", authenticate, deleteFile)
router.get("/:id", authenticate, getFileById)

export default router
