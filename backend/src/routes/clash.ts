// src/routes/clash.ts
import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
  });
  
  router.post(
    '/detect',
    upload.array('models'),
    async (req, res) => {
      try {
        const tolerance = req.body.tolerance || 0.01;
        const files = req.files as Express.Multer.File[];
  
        // Validation
        if (!files || files.length < 2) {
          return res.status(400).json({ 
            error: "Au moins 2 fichiers IFC requis",
            received: files?.length || 0
          });
        }
  
        // Préparation pour Flask
        const flaskFormData = new FormData();
        files.forEach(file => {
          flaskFormData.append('models', file.buffer, {
            filename: file.originalname,
            contentType: 'application/octet-stream'
          });
        });
        flaskFormData.append('tolerance', tolerance);
  
        // Envoi à Flask
        const response = await axios.post(
          'http://localhost:5001/api/clash/detect',
          flaskFormData,
          { headers: flaskFormData.getHeaders() }
        );
  
        res.json(response.data);
  
      } catch (error) {
        console.error('Erreur complète:', error);
        res.status(500).json({
          error: 'Échec de la détection',
          details: error.response?.data || error.message
        });
      }
    }
  );

export default router;