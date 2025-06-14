// src/routes/clash.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import path from 'path';
import fs from 'fs';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
});
const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:5001';
// Route pour la détection inter-modèles
router.post(
  '/detect',
  upload.array('models'),
  async (req, res): Promise<void> => {
    try {
      const tolerance = req.body.tolerance || 0.01;
      const files = req.files as Express.Multer.File[];

      // Validation
      if (!files || files.length < 2) {
        res.status(400).json({ 
          error: "Au moins 2 fichiers IFC requis",
          received: files?.length || 0
        });
        return;
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
        `${FLASK_API_URL}/api/clash/detect`,
        flaskFormData,
        { headers: flaskFormData.getHeaders() }
      );

      res.json(response.data);

    } catch (error: any) {
      console.error('Erreur complète:', error);
      res.status(500).json({
        error: 'Échec de la détection',
        details: error.response?.data || error.message
      });
    }
  }
);

// Nouvelle route pour la détection intra-modèle
router.post(
  '/detect_intra',
  upload.single('model'), // Notez le changement ici pour un seul fichier
  async (req, res): Promise<void> => {
    try {
      const tolerance = req.body.tolerance || 0.01;
      const use_ai = req.body.use_ai || 'true';
      const file = req.file;

      // Validation
      if (!file) {
        res.status(400).json({ 
          error: "Un fichier IFC est requis pour la détection intra-modèle"
        });
        return;
      }

      // Préparation pour Flask
      const flaskFormData = new FormData();
      flaskFormData.append('model', file.buffer, {
        filename: file.originalname,
        contentType: 'application/octet-stream'
      });
      flaskFormData.append('tolerance', tolerance);
      flaskFormData.append('use_ai', use_ai);

      // Envoi à Flask
      const response = await axios.post(
        `${FLASK_API_URL}/api/clash/detect_intra`, // Nouvelle endpoint Flask
        flaskFormData,
        { headers: flaskFormData.getHeaders() }
      );

      res.json(response.data);

    } catch (error: any) {
      console.error('Erreur détection intra-modèle:', error);
      res.status(500).json({
        error: 'Échec de la détection intra-modèle',
        details: error.response?.data || error.message
      });
    }
  }
);

router.get('/status/:sessionId', async (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  const reportsFolder = 'C:\\Users\\wiemb\\Desktop\\flask-ifc-clashdetection\\app\\static\\reports';
  const reportPath = path.join(reportsFolder, sessionId, 'report.json');
  const errorPath = path.join(reportsFolder, sessionId, 'error.json');

  try {
    if (fs.existsSync(reportPath)) {
      const data = fs.readFileSync(reportPath, 'utf-8');
      const report = JSON.parse(data);
      res.json(report);
    } else if (fs.existsSync(errorPath)) {
      const data = fs.readFileSync(errorPath, 'utf-8');
      res.status(500).json(JSON.parse(data));
    } else {
      res.status(202).json({ status: 'processing' });
    }
  } catch (err) {
    console.error("Erreur de lecture de statut:", err);
    res.status(500).json({ error: 'Erreur de lecture du statut' });
  }
});

router.get('/report/:sessionId', async (req, res) => {
  try {
    const response = await axios.get(
     `${FLASK_API_URL}/api/report/${req.params.sessionId}`
    );
    res.json(response.data);
  } catch (error) {
    console.error('Erreur de communication avec Flask:', error);
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Erreur de communication avec Flask' });
    }
  }
});

router.get('/report/html/:sessionId', async (req, res) => {
  try {
    const response = await axios.get(
     `${FLASK_API_URL}/api/report/html/${req.params.sessionId}`,
      { responseType: 'stream' }
    );
    response.data.pipe(res);
  } catch (error) {
    console.error('Erreur de communication avec Flask:', error);
    if (axios.isAxiosError(error) && error.response) {
      res.status(error.response.status).send('Rapport HTML non trouvé');
    } else {
      res.status(500).send('Erreur lors de la récupération du rapport HTML');
    }
  }
});

export default router;