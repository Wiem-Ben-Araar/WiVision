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
// Ajoutez cette route dans votre router Express (à ajouter dans votre fichier de routes)

// Route pour générer et servir le rapport HTML
router.get("/report/html/:sessionId", async (req: Request, res: Response) => {
  const { sessionId } = req.params

  try {
    // Récupérer les données du cache
    if (!localCache.has(sessionId)) {
      res.status(404).json({
        error: "Session non trouvée",
        session_id: sessionId,
        message: "La session a peut-être expiré ou n'existe pas"
      })
      return
    }

    const cachedData = localCache.get(sessionId)
    const clashes = cachedData.clashes || []
    
    // Générer le HTML du rapport
    const htmlContent = generateClashReportHTML({
      sessionId,
      clashes,
      settings: cachedData.settings,
      model_stats: cachedData.model_stats,
      clash_count: cachedData.clash_count,
      processing_time: cachedData.express_processing_time,
      ai_used: cachedData.settings?.use_ai || false,
      timestamp: cachedData.timestamp
    })

    // Servir le HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Disposition', `inline; filename="rapport-clash-${sessionId}.html"`)
    res.send(htmlContent)

  } catch (error: any) {
    console.error(`❌ Erreur génération rapport HTML:`, error.message)
    res.status(500).json({
      error: "Erreur lors de la génération du rapport HTML",
      details: error.message,
      session_id: sessionId
    })
  }
})

// Fonction pour générer le HTML du rapport
function generateClashReportHTML(data: {
  sessionId: string
  clashes: any[]
  settings?: any
  model_stats?: any
  clash_count: number
  processing_time: number
  ai_used: boolean
  timestamp: string
}): string {
  const { sessionId, clashes, settings, model_stats, clash_count, processing_time, ai_used, timestamp } = data

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Clash - ${sessionId}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .header-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .info-card {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
            backdrop-filter: blur(10px);
        }
        
        .info-card h3 {
            font-size: 0.9em;
            opacity: 0.8;
            margin-bottom: 5px;
        }
        
        .info-card p {
            font-size: 1.2em;
            font-weight: bold;
        }
        
        .ai-badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            margin-left: 10px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }
        
        .stat-card h3 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 1.1em;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        
        .clash-grid {
            display: grid;
            gap: 25px;
        }
        
        .clash-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            transition: transform 0.2s ease;
        }
        
        .clash-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        
        .clash-header {
            background: #f8fafc;
            padding: 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .clash-title {
            font-size: 1.3em;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 10px;
        }
        
        .clash-distance {
            background: #fef2f2;
            color: #dc2626;
            padding: 6px 12px;
            border-radius: 6px;
            display: inline-block;
            font-weight: bold;
            font-size: 0.9em;
        }
        
        .elements-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
        }
        
        .element {
            padding: 25px;
        }
        
        .element-a {
            background: #f0fdf4;
            border-right: 1px solid #e2e8f0;
        }
        
        .element-b {
            background: #fef2f2;
        }
        
        .element-title {
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 15px;
            padding: 8px 12px;
            border-radius: 6px;
        }
        
        .element-a .element-title {
            background: #dcfce7;
            color: #166534;
        }
        
        .element-b .element-title {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .element-info {
            display: grid;
            gap: 8px;
        }
        
        .info-row {
            display: grid;
            grid-template-columns: 80px 1fr;
            gap: 10px;
            align-items: start;
        }
        
        .info-label {
            font-weight: 600;
            color: #64748b;
            font-size: 0.9em;
        }
        
        .info-value {
            font-family: 'Courier New', monospace;
            background: #f8fafc;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            word-break: break-all;
        }
        
        .position-info {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            border-left: 3px solid #667eea;
        }
        
        .position-coords {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 10px;
        }
        
        .coord {
            text-align: center;
            padding: 8px;
            background: white;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
        }
        
        .no-clashes {
            text-align: center;
            padding: 60px 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        
        .no-clashes h2 {
            color: #10b981;
            font-size: 2em;
            margin-bottom: 15px;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #64748b;
            font-size: 0.9em;
            padding: 20px;
            background: white;
            border-radius: 12px;
        }
        
        @media (max-width: 768px) {
            .elements-container {
                grid-template-columns: 1fr;
            }
            
            .element-a {
                border-right: none;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .header-info {
                grid-template-columns: 1fr;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
        
        @media print {
            body {
                background: white;
            }
            
            .clash-card {
                box-shadow: none;
                border: 1px solid #e2e8f0;
                page-break-inside: avoid;
                margin-bottom: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Rapport de Détection de Clash</h1>
            <p>Session: ${sessionId}</p>
            ${ai_used ? '<span class="ai-badge">IA Activée</span>' : ''}
            
            <div class="header-info">
                <div class="info-card">
                    <h3>Conflits Détectés</h3>
                    <p>${clash_count}</p>
                </div>
                <div class="info-card">
                    <h3>Temps de Traitement</h3>
                    <p>${(processing_time / 1000).toFixed(2)}s</p>
                </div>
                <div class="info-card">
                    <h3>Tolérance</h3>
                    <p>${settings?.tolerance || 'N/A'} m</p>
                </div>
                <div class="info-card">
                    <h3>Généré le</h3>
                    <p>${new Date(timestamp).toLocaleString('fr-FR')}</p>
                </div>
            </div>
        </div>
        
        ${model_stats ? `
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Éléments Analysés</h3>
                <div class="stat-value">${model_stats.total_elements || 'N/A'}</div>
            </div>
            <div class="stat-card">
                <h3>Éléments Valides</h3>
                <div class="stat-value">${model_stats.valid_elements || 'N/A'}</div>
            </div>
            <div class="stat-card">
                <h3>Comparaisons</h3>
                <div class="stat-value">${model_stats.comparisons || 'N/A'}</div>
            </div>
        </div>
        ` : ''}
        
        ${clashes.length > 0 ? `
        <div class="clash-grid">
            ${clashes.map((clash, index) => `
            <div class="clash-card">
                <div class="clash-header">
                    <div class="clash-title">Conflit #${index + 1}</div>
                    <div class="clash-distance">Distance: ${clash.distance.toFixed(3)} m</div>
                </div>
                <div class="elements-container">
                    <div class="element element-a">
                        <div class="element-title">Élément A</div>
                        <div class="element-info">
                            <div class="info-row">
                                <span class="info-label">Modèle:</span>
                                <span class="info-value">${clash.element_a.model || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Type:</span>
                                <span class="info-value">${clash.element_a.type || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Nom:</span>
                                <span class="info-value">${clash.element_a.name || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">GUID:</span>
                                <span class="info-value">${clash.element_a.guid || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                    <div class="element element-b">
                        <div class="element-title">Élément B</div>
                        <div class="element-info">
                            <div class="info-row">
                                <span class="info-label">Modèle:</span>
                                <span class="info-value">${clash.element_b.model || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Type:</span>
                                <span class="info-value">${clash.element_b.type || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Nom:</span>
                                <span class="info-value">${clash.element_b.name || 'N/A'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">GUID:</span>
                                <span class="info-value">${clash.element_b.guid || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="position-info">
                    <strong>Position du conflit:</strong>
                    <div class="position-coords">
                        <div class="coord">X: ${clash.position[0].toFixed(3)}</div>
                        <div class="coord">Y: ${clash.position[1].toFixed(3)}</div>
                        <div class="coord">Z: ${clash.position[2].toFixed(3)}</div>
                    </div>
                </div>
            </div>
            `).join('')}
        </div>
        ` : `
        <div class="no-clashes">
            <h2>🎉 Aucun conflit détecté</h2>
            <p>Tous les éléments respectent la tolérance définie de ${settings?.tolerance || 'N/A'} m</p>
        </div>
        `}
        
        <div class="footer">
            <p>Rapport généré automatiquement • ${new Date().toLocaleString('fr-FR')}</p>
            <p>Session ID: ${sessionId}</p>
        </div>
    </div>
</body>
</html>
  `
}
export default router