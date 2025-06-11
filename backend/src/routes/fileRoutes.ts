// routes/fileRoutes.ts
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

// Configure multer for memory storage (we'll send to Firebase from memory)
const storage = multer.memoryStorage();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
  });
  

// File routes
router.post('/upload', authenticate, upload.array('file'), uploadFiles);
router.get('/project/:id', authenticate, getProjectFiles);
router.get('/:id', authenticate, getFileById);
router.delete('/', authenticate, deleteFile);

export default router;