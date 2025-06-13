import express from "express";
import { uploadFiles, getProjectFiles, deleteFile, getFileById } from "../controllers/fileController";
import { authenticate } from "../middleware/auth";
import { uploadMultiple, handleMulterError } from "../middleware/multer";

const router = express.Router();

// ⚡ ROUTE UPLOAD HAUTE PERFORMANCE
router.post(
  "/upload",
  authenticate,
  uploadMultiple,
  handleMulterError,
  uploadFiles
);

router.get("/projects/:id/files", authenticate, getProjectFiles);
router.delete("/", authenticate, deleteFile);
router.get("/:id", authenticate, getFileById);

export default router;