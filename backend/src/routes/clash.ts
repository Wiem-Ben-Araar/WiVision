// src/routes/clash.ts - Fixed version
import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios, { AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import path from 'path';
import fs from 'fs';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
});

const FLASK_API_URL = process.env.FLASK_API_URL || '';
const FLASK_TIMEOUT = 300000; // 5 minutes
const sessionCache = new Map<string, any>();

router.post(
  '/detect_intra',
  upload.single('model'),
  async (req, res): Promise<void> => {
    try {
      const tolerance = req.body.tolerance || 0.01;
      const use_ai = req.body.use_ai || 'true';
      const file = req.file;

      if (!file) {
        res.status(400).json({ 
          error: "Un fichier IFC est requis pour la détection intra-modèle"
        });
        return;
      }

      const flaskFormData = new FormData();
      flaskFormData.append('model', file.buffer, {
        filename: file.originalname,
        contentType: 'application/octet-stream'
      });
      flaskFormData.append('tolerance', tolerance.toString());
      flaskFormData.append('use_ai', use_ai.toString());

      const { data } = await axios.post(
        `${FLASK_API_URL}/api/clash/detect_intra`, 
        flaskFormData,
        {
          headers: flaskFormData.getHeaders(),
          timeout: FLASK_TIMEOUT
        }
      );
      
      // Stocker les résultats dans le cache immédiatement
      if (data.session_id) {
        sessionCache.set(data.session_id, {
          status: 'completed',
          ...data
        });
      }

      res.json(data);

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

  // 1. Vérifier le cache en premier
  if (sessionCache.has(sessionId)) {
    res.json(sessionCache.get(sessionId));
    return;
  }

  // 2. Vérifier le système de fichiers
  const reportsFolder = '/opt/render/project/src/app/static/reports';
  const reportPath = path.join(reportsFolder, sessionId, 'report.json');
  const errorPath = path.join(reportsFolder, sessionId, 'error.json');

  try {
    if (fs.existsSync(reportPath)) {
      const data = fs.readFileSync(reportPath, 'utf-8');
      const report = JSON.parse(data);

      // Mettre en cache pour les prochaines requêtes
      sessionCache.set(sessionId, report);

      res.json(report);
      return;
    }

    if (fs.existsSync(errorPath)) {
      const data = fs.readFileSync(errorPath, 'utf-8');
      const errorReport = JSON.parse(data);

      // Mettre en cache pour les prochaines requêtes
      sessionCache.set(sessionId, errorReport);

      res.status(500).json(errorReport);
      return;
    }

    // 3. Vérifier si le traitement est en cours dans Flask
    try {
      const flaskStatus = await axios.get(
        `${FLASK_API_URL}/api/status/${sessionId}`,
        { timeout: 5000 }
      );

      if (flaskStatus.data.status === 'completed') {
        // Si Flask a terminé mais qu'on n'a pas encore le fichier
        res.status(202).json({ status: 'processing' });
        return;
      }

      res.json(flaskStatus.data);
      return;
    } catch (flaskErr) {
      res.status(202).json({
        status: 'processing',
        message: "L'analyse est en cours..."
      });
      return;
    }

  } catch (err) {
    console.error("Erreur de lecture de statut:", err);
    res.status(500).json({ error: 'Erreur de lecture du statut' });
    return;
  }
});
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
        { 
          headers: flaskFormData.getHeaders(),
          timeout: FLASK_TIMEOUT,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
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