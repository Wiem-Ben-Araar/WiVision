// src/routes/clash.ts
import { Router } from 'express';
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
router.get('/status/:sessionId', async (req, res) => {
  const sessionId = req.params.sessionId;
  // CORRECTION: Utiliser le chemin absolu vers le dossier Flask
  const reportsFolder = 'C:\\Users\\wiemb\\Desktop\\flask-ifc-clashdetection\\app\\static\\reports';
  const reportPath = path.join(reportsFolder, sessionId, 'report.json');
  const errorPath = path.join(reportsFolder, sessionId, 'error.json');

  try {
    if (fs.existsSync(reportPath)) {
      // Le rapport est prêt, le retourner directement
      const data = fs.readFileSync(reportPath, 'utf-8');
      const report = JSON.parse(data);
      return res.json(report); // Retourne directement le rapport avec les clashes
    } else if (fs.existsSync(errorPath)) {
      const data = fs.readFileSync(errorPath, 'utf-8');
      return res.status(500).json(JSON.parse(data));
    } else {
      // Le traitement est en cours
      return res.status(202).json({ status: 'processing' });
    }
  } catch (err) {
    console.error("Erreur de lecture de statut:", err);
    return res.status(500).json({ error: 'Erreur de lecture du statut' });
  }
});
router.get('/report/:sessionId', async (req, res) => {
  try {
    // Communiquer avec Flask pour obtenir le rapport
    const response = await axios.get(
      `http://localhost:5001/api/report/${req.params.sessionId}`
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
    // Communiquer avec Flask pour obtenir le rapport HTML
    const response = await axios.get(
      `http://localhost:5001/api/report/html/${req.params.sessionId}`,
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