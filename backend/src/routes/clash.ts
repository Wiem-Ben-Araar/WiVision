// src/routes/clash.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
});

// URL de base du serveur Flask déployé sur Render
const FLASK_API_URL = 'https://wivisionflask.onrender.com';

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

// Route pour la détection intra-modèle
router.post(
  '/detect_intra',
  upload.single('model'),
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
        `${FLASK_API_URL}/api/clash/detect_intra`,
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

// Proxy pour toutes les autres routes
router.all('/*', async (req: Request, res: Response) => {
  try {
    const method = req.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
    const url = `${FLASK_API_URL}${req.originalUrl}`;
    
    const config: any = {
      method,
      url,
      responseType: 'stream',
      headers: { ...req.headers, host: new URL(FLASK_API_URL).host }
    };

    // Gérer les données de requête
    if (['post', 'put', 'patch'].includes(method)) {
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // Gérer FormData
        const formData = new FormData();
        for (const [key, value] of Object.entries(req.body)) {
          formData.append(key, value);
        }
        config.data = formData;
        config.headers = {
          ...config.headers,
          ...formData.getHeaders()
        };
      } else {
        // Gérer JSON
        config.data = req.body;
      }
    }

    const response = await axios(config);
    
    // Transférer les en-têtes
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value as string);
    });
    
    // Transférer le statut
    res.status(response.status);
    
    // Transférer le corps de la réponse
    response.data.pipe(res);
  } catch (error: any) {
    console.error('Erreur de proxy:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        res.status(error.response.status)
           .json(error.response.data);
      } else {
        res.status(500).json({
          error: 'Erreur de communication avec le serveur de détection'
        });
      }
    } else {
      res.status(500).json({
        error: 'Erreur interne du proxy'
      });
    }
  }
});

export default router;