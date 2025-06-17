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

// Route pour la détection intra-modèle - FIXED
router.post(
  '/detect_intra',
  upload.single('model'), // Un seul fichier pour intra-modèle
  async (req, res): Promise<void> => {
    try {
      console.log('=== DEBUG INTRA ROUTE ===');
      console.log('Request body:', req.body);
      console.log('Request file:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file');
      console.log('========================');

      const tolerance = req.body.tolerance || 0.01;
      const use_ai = req.body.use_ai || 'true';
      const file = req.file;

      // Validation améliorée
      if (!file) {
        console.error('ERROR: No file received');
        res.status(400).json({ 
          error: "Un fichier IFC est requis pour la détection intra-modèle",
          debug: {
            hasFile: !!file,
            bodyKeys: Object.keys(req.body),
            contentType: req.headers['content-type']
          }
        });
        return;
      }

      console.log(`Processing file: ${file.originalname}, size: ${file.size} bytes`);

      // Préparation pour Flask
      const flaskFormData = new FormData();
      flaskFormData.append('model', file.buffer, {
        filename: file.originalname,
        contentType: 'application/octet-stream'
      });
      flaskFormData.append('tolerance', tolerance.toString());
      flaskFormData.append('use_ai', use_ai.toString());

      console.log('Sending to Flask with params:', {
        tolerance,
        use_ai,
        filename: file.originalname
      });

      // Configuration Axios améliorée
      const config: AxiosRequestConfig = {
        method: 'post',
        url: `${FLASK_API_URL}/api/clash/detect_intra`,
        data: flaskFormData,
        headers: {
          ...flaskFormData.getHeaders(),
        },
        timeout: FLASK_TIMEOUT,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      };

      const response = await axios(config);
      
      console.log('Flask response received, status:', response.status);
      
      // FIXED: Remove duplicate res.json() call
      res.json(response.data);

    } catch (error: any) {
      console.error('Erreur détection intra-modèle:', error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('Flask error response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      
      res.status(500).json({
        error: 'Échec de la détection intra-modèle',
        details: error.response?.data || error.message,
        debug: {
          flaskUrl: `${FLASK_API_URL}/api/clash/detect_intra`,
          hasFlaskUrl: !!FLASK_API_URL
        }
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