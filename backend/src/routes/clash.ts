import { Router, type Request, type Response } from "express"
import multer from "multer"
import axios from "axios"
import FormData from "form-data"

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
})

const FLASK_API_URL = process.env.FLASK_API_URL || ""
const ULTRA_FAST_TIMEOUT = 60000 // 60 secondes pour correspondre aux timeouts Flask

// Cache local pour éviter les appels répétés
const localCache = new Map<string, any>()

// Route principale compatible avec votre Flask /api/fast_clash
router.post("/detect_intra_ultra", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now()

  try {
    const file = req.file
    if (!file) {
      res.status(400).json({ error: "Fichier IFC requis (champ 'file')" })
      return
    }

    if (!file.originalname?.toLowerCase().endsWith('.ifc')) {
      res.status(400).json({ error: "Type de fichier invalide. Seuls les fichiers .ifc sont acceptés" })
      return
    }

    console.log(`🚀 ULTRA-FAST: Début traitement ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)

    // Paramètres compatibles avec votre Flask backend
    const tolerance = Number.parseFloat(req.body.tolerance) || 0.1  // Correspond à votre défaut Flask
    const use_ai = req.body.use_ai === 'true' || req.body.use_ai === true || false
    const debug = req.body.debug === 'true' || req.body.debug === true || false

    const formData = new FormData()
    
    // Utiliser 'file' comme nom de champ pour correspondre à Flask
    formData.append("file", file.buffer, {
      filename: file.originalname,
      contentType: "application/octet-stream",
    })
    formData.append("tolerance", tolerance.toString())
    formData.append("use_ai", use_ai.toString())
    formData.append("debug", debug.toString())

    console.log(`📤 Envoi vers Flask: tolerance=${tolerance}, use_ai=${use_ai}, debug=${debug}`)

    // Appel à votre endpoint Flask /api/fast_clash
    const response = await axios.post(`${FLASK_API_URL}/api/fast_clash`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Accept': 'application/json',
      },
      timeout: ULTRA_FAST_TIMEOUT,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })

    const processingTime = Date.now() - startTime
    console.log(`⚡ ULTRA-FAST: Terminé en ${processingTime}ms - ${response.data.clash_count} clashes détectés`)

    // Générer un session_id pour la compatibilité
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Structure de réponse enrichie
    const responseData = {
      session_id: sessionId,
      status: response.data.status,
      clash_count: response.data.clash_count,
      clashes: response.data.clashes,
      settings: response.data.settings,
      model_stats: response.data.model_stats,
      debug_stats: response.data.debug_stats,
      express_processing_time: processingTime,
      timestamp: new Date().toISOString(),
    }

    // Cache immédiat du résultat
    localCache.set(sessionId, {
      ...responseData,
      cached_at: Date.now(),
    })

    res.json(responseData)

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error(`❌ ULTRA-FAST: Erreur après ${processingTime}ms:`, error.message)
    
    let errorMessage = "Erreur de traitement ultra-rapide"
    let errorDetails = error.message

    if (error.response) {
      // Erreur de réponse du serveur Flask
      console.error("Flask response error:", error.response.data)
      errorDetails = error.response.data?.message || error.response.data?.error || error.message
      
      if (error.response.data?.hint) {
        errorDetails += ` (${error.response.data.hint})`
      }
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = "Impossible de se connecter au service Flask"
      errorDetails = "Vérifiez que le service Flask est démarré et accessible"
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = "Service Flask introuvable"
      errorDetails = `URL Flask: ${FLASK_API_URL}`
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = "Timeout lors du traitement"
      errorDetails = "Le traitement du fichier a pris trop de temps"
    }

    res.status(error.response?.status || 500).json({
      error: errorMessage,
      details: errorDetails,
      processing_time: processingTime,
      flask_url: FLASK_API_URL,
      timestamp: new Date().toISOString(),
    })
  }
})

// Route debug qui utilise votre endpoint Flask /api/debug_clash
router.post("/detect_debug", upload.single("file"), async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now()

  try {
    const file = req.file
    if (!file) {
      res.status(400).json({ error: "Fichier IFC requis (champ 'file')" })
      return
    }

    console.log(`🔍 DEBUG: Début traitement debug ${file.originalname}`)

    const formData = new FormData()
    formData.append("file", file.buffer, {
      filename: file.originalname,
      contentType: "application/octet-stream",
    })

    // Utiliser votre route debug Flask optimisée
    const response = await axios.post(`${FLASK_API_URL}/api/debug_clash`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Accept': 'application/json',
      },
      timeout: ULTRA_FAST_TIMEOUT,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })

    const processingTime = Date.now() - startTime
    console.log(`🔍 DEBUG: Terminé en ${processingTime}ms`)

    const sessionId = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const responseData = {
      session_id: sessionId,
      ...response.data,
      express_processing_time: processingTime,
      timestamp: new Date().toISOString(),
    }

    localCache.set(sessionId, {
      ...responseData,
      cached_at: Date.now(),
    })

    res.json(responseData)

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error(`❌ DEBUG: Erreur après ${processingTime}ms:`, error.message)

    res.status(error.response?.status || 500).json({
      error: "Erreur de traitement debug",
      details: error.response?.data?.message || error.message,
      processing_time: processingTime,
      timestamp: new Date().toISOString(),
    })
  }
})

// Route de statut (utilise le cache local)
router.get("/status_ultra/:sessionId", async (req: Request, res: Response) => {
  const { sessionId } = req.params

  // Cache local en premier
  if (localCache.has(sessionId)) {
    const cached = localCache.get(sessionId)
    console.log(`📋 STATUS: Session ${sessionId} trouvée dans le cache`)
    res.json({
      ...cached,
      from_cache: true,
      cache_age: Date.now() - cached.cached_at,
    })
    return
  }

  // Si pas en cache, retourner une erreur 404
  console.log(`📋 STATUS: Session ${sessionId} non trouvée`)
  res.status(404).json({
    error: "Session non trouvée",
    session_id: sessionId,
    message: "La session a peut-être expiré ou n'existe pas",
    timestamp: new Date().toISOString(),
  })
})

// Route de santé pour vérifier la connexion Flask
router.get("/health", async (req: Request, res: Response) => {
  try {
    const response = await axios.get(`${FLASK_API_URL}/`, {
      timeout: 5000,
    })
    
    res.json({
      status: "healthy",
      flask_status: "connected",
      flask_url: FLASK_API_URL,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    res.status(503).json({
      status: "unhealthy",
      flask_status: "disconnected",
      flask_url: FLASK_API_URL,
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
})

// Nettoyage du cache local (plus fréquent)
setInterval(() => {
  const now = Date.now()
  const maxAge = 5 * 60 * 1000 // 5 minutes pour éviter l'accumulation

  let cleanedCount = 0
  for (const [key, value] of localCache.entries()) {
    if (now - value.cached_at > maxAge) {
      localCache.delete(key)
      cleanedCount++
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cache nettoyé: ${cleanedCount} sessions supprimées`)
  }
}, 60000) // Nettoyer chaque minute
// Ajoutez cette route à votre router Express pour gérer le cache temporaire

// Route pour cache temporaire (pour les résultats immédiats)
router.post("/temp_cache", async (req: Request, res: Response) => {
  try {
    const tempData = req.body;
    
    if (!tempData.session_id) {
      res.status(400).json({ error: "session_id requis" });
      return;
    }
    
    // Sauvegarder temporairement dans le cache local
    localCache.set(tempData.session_id, {
      ...tempData,
      cached_at: Date.now()
    });
    
    console.log(`💾 Cache temporaire créé pour session: ${tempData.session_id}`);
    
    res.json({
      success: true,
      session_id: tempData.session_id,
      message: "Données mises en cache temporairement"
    });
    
  } catch (error: any) {
    console.error("❌ Erreur cache temporaire:", error.message);
    res.status(500).json({
      error: "Erreur lors de la mise en cache temporaire",
      details: error.message
    });
  }
});

// Route pour télécharger le rapport PDF
router.get("/report/pdf/:sessionId", async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  try {
    // Récupérer les données du cache
    if (!localCache.has(sessionId)) {
      res.status(404).json({
        error: "Session non trouvée",
        session_id: sessionId
      });
      return;
    }

    const cachedData = localCache.get(sessionId);
    
    // Ici vous pourriez utiliser une bibliothèque comme Puppeteer 
    // pour générer un PDF depuis le HTML, ou créer le PDF directement
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-clash-${sessionId}.pdf"`);
    
    // Pour l'instant, rediriger vers le HTML (à adapter selon vos besoins)
    res.redirect(`/api/clash/report/html/${sessionId}`);
    
  } catch (error: any) {
    console.error(`❌ Erreur génération rapport PDF:`, error.message);
    res.status(500).json({
      error: "Erreur lors de la génération du rapport PDF",
      details: error.message
    });
  }
});
export default router