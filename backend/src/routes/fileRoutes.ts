import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import {
  uploadFiles,
  getProjectFiles,
  deleteFile,
  getFileById
} from '../controllers/fileController';

const router = express.Router();

// Configuration optimisée pour la mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB max
    files: 2 // Max 2 fichiers par requête
  }
});

router.post('/upload', authenticate, upload.array('file'), uploadFiles);
router.get('/project/:id', authenticate, getProjectFiles);
router.get('/:id', authenticate, getFileById);
router.delete('/', authenticate, deleteFile);

export default router;