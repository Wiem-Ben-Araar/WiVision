import type { Request, Response } from "express"
import mongoose from "mongoose"
import { supabase } from "../config/supabase"
import File, { type IFile } from "../models/file"
import Project from "../models/project"
import User from "../models/user"
import { v4 as uuidv4 } from "uuid"

// ✅ FONCTION POUR VÉRIFIER/CRÉER LE BUCKET AVEC PLUS DE DÉTAILS
const ensureBucketExists = async (): Promise<boolean> => {
  try {
    console.log("🔍 Vérification du bucket Supabase...")
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error("❌ Erreur vérification buckets:", listError.message)
      return false
    }

    console.log(`📊 Buckets disponibles: ${buckets?.length || 0}`)

    // Afficher tous les buckets pour debug
    buckets?.forEach((bucket) => {
      console.log(`📦 Bucket: ${bucket.name} (${bucket.public ? "public" : "privé"})`)
    })

    const ifcBucket = buckets?.find((b) => b.name === "ifc-files")

    if (!ifcBucket) {
      console.log("⚠️ Bucket 'ifc-files' non trouvé, tentative de création...")

      try {
        const { data: newBucket, error: createError } = await supabase.storage.createBucket("ifc-files", {
          public: false,
          fileSizeLimit: 100 * 1024 * 1024, // 100MB
        })

        if (createError) {
          console.error("❌ Erreur création bucket:", createError.message)
          console.log("📋 SOLUTION: Créez manuellement le bucket dans Supabase Console:")
          console.log("   1. Allez sur votre projet Supabase")
          console.log("   2. Storage → New bucket")
          console.log("   3. Nom: 'ifc-files'")
          console.log("   4. Public: NON (décoché)")
          return false
        }

        console.log("✅ Bucket 'ifc-files' créé avec succès!")
        return true
      } catch (createErr: any) {
        console.error("❌ Exception création bucket:", createErr.message)
        return false
      }
    }

    console.log("✅ Bucket 'ifc-files' trouvé et disponible")
    return true
  } catch (error: any) {
    console.error("❌ Erreur vérification bucket:", error.message)
    return false
  }
}

// ✅ UPLOAD MULTIPLE AMÉLIORÉ
export const uploadFiles = async (req: Request, res: Response): Promise<void> => {
  const uploadId = uuidv4().substring(0, 8)
  console.log(`[${uploadId}] 🚀 Démarrage upload MULTIPLE vers Supabase`)

  // ✅ AUGMENTER LE TIMEOUT DE LA REQUÊTE
  // @ts-ignore - Ajouter un timeout plus long pour les gros fichiers
  req.setTimeout(600000) // 10 minutes
  // @ts-ignore - Augmenter aussi le timeout de la réponse
  res.setTimeout(600000) // 10 minutes

  try {
    // ✅ VÉRIFIER QUE LE BUCKET EXISTE AVANT L'UPLOAD
    const bucketExists = await ensureBucketExists()
    if (!bucketExists) {
      console.error(`[${uploadId}] ❌ Bucket ifc-files non disponible`)
      res.status(500).json({
        error: "Bucket Supabase non disponible",
        solution: "Créez manuellement le bucket dans Supabase Console",
      })
      return
    }

    // Vérification authentification
    if (!req.user) {
      console.error(`[${uploadId}] ❌ Authentification échouée`)
      res.status(401).json({ error: "Non autorisé" })
      return
    }

    const user = req.user as { email?: string }
    if (!user.email) {
      console.error(`[${uploadId}] ❌ Email utilisateur non trouvé`)
      res.status(401).json({ error: "Email utilisateur non trouvé" })
      return
    }

    // Extraction des données
    const projectId: string = req.body.projectId
    const userEmail: string = user.email

    // ✅ GESTION MULTIPLE FILES - req.files peut être un array ou un objet
    let files: Express.Multer.File[] = []

    if (Array.isArray(req.files)) {
      // Si req.files est un array (upload multiple avec même nom de champ)
      files = req.files
      console.log(`[${uploadId}] 📦 Fichiers trouvés (array): ${files.length}`)
    } else if (req.files && typeof req.files === "object") {
      // Si req.files est un objet avec différents champs
      files = Object.values(req.files).flat()
      console.log(`[${uploadId}] 📦 Fichiers trouvés (object): ${files.length}`)
    } else if (req.file) {
      // Si un seul fichier
      files = [req.file]
      console.log(`[${uploadId}] 📦 Fichier unique trouvé`)
    }

    console.log(`[${uploadId}] 📦 Données reçues: projectId=${projectId}, fichiers=${files.length}, email=${userEmail}`)

    // Validation
    if (!files || files.length === 0) {
      console.error(`[${uploadId}] ❌ Aucun fichier fourni`)
      res.status(400).json({
        error: "Aucun fichier fourni",
        debug: {
          reqFiles: !!req.files,
          reqFile: !!req.file,
          filesType: typeof req.files,
          filesLength: Array.isArray(req.files) ? req.files.length : 0,
          body: req.body,
        },
      })
      return
    }

    if (!projectId) {
      console.error(`[${uploadId}] ❌ ProjectId manquant`)
      res.status(400).json({ error: "ProjectId requis" })
      return
    }

    // Vérification projet
    const project = await Project.findById(projectId)
    if (!project) {
      console.error(`[${uploadId}] ❌ Projet non trouvé: ${projectId}`)
      res.status(404).json({ error: `Projet avec ID ${projectId} non trouvé` })
      return
    }
    console.log(`[${uploadId}] ✅ Projet trouvé: ${project.name || projectId}`)

    // Recherche utilisateur
    let userId: mongoose.Types.ObjectId | null = null
    if (userEmail) {
      const userDoc = await User.findOne({ email: userEmail })
      if (userDoc) {
        userId = userDoc._id
        console.log(`[${uploadId}] ✅ Utilisateur trouvé: ${userId}`)
      }
    }

    // ✅ VARIABLES POUR TRACKING MULTIPLE UPLOADS
    const uploadResults = {
      successful: [] as any[],
      failed: [] as any[],
      downloadURLs: [] as string[],
      fileMetadata: [] as any[],
      newFileIds: [] as mongoose.Types.ObjectId[],
    }

    console.log(`[${uploadId}] 🔄 Traitement de ${files.length} fichier(s) en séquentiel...`)

    // ✅ TRAITEMENT SÉQUENTIEL POUR LES GROS FICHIERS
    // Traiter les fichiers un par un pour éviter les timeouts
    for (let index = 0; index < files.length; index++) {
      const file = files[index]
      const fileId = `${uploadId}-file-${index}`

      console.log(
        `[${fileId}] 📄 Début traitement: ${file.originalname} (${Math.round((file.size / 1024 / 1024) * 100) / 100} MB)`,
      )

      try {
        // Validation format IFC
        if (!file.originalname.toLowerCase().endsWith(".ifc")) {
          const error = `Le fichier ${file.originalname} n'est pas au format IFC`
          console.error(`[${fileId}] ❌ ${error}`)
          uploadResults.failed.push({ success: false, error, fileName: file.originalname })
          continue
        }

        // Validation taille fichier (100MB max)
        const maxFileSize = 100 * 1024 * 1024 // 100MB
        if (file.size > maxFileSize) {
          const error = `Le fichier ${file.originalname} est trop volumineux (${Math.round(file.size / 1024 / 1024)}MB). Taille maximum: 100MB.`
          console.error(`[${fileId}] ❌ ${error}`)
          uploadResults.failed.push({ success: false, error, fileName: file.originalname })
          continue
        }

        // Génération du chemin Supabase
        const timestamp = Date.now() + index // Éviter les collisions
        const sanitizedName = file.originalname
          .replace(/[^a-zA-Z0-9.-]/g, "_")
          .replace(/_{2,}/g, "_")
          .toLowerCase()

        const fileName = `${timestamp}_${sanitizedName}`
        const supabasePath = `projects/${projectId}/${fileName}`

        console.log(`[${fileId}] 📂 Chemin Supabase: ${supabasePath}`)

        // ✅ UPLOAD VERS SUPABASE STORAGE AVEC RETRY
        const uploadStartTime = Date.now()
        let uploadSuccess = false
        let uploadError = null
        let uploadData = null

        // Tentatives multiples en cas d'échec
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (attempt > 1) {
            console.log(`[${fileId}] 🔄 Tentative ${attempt}/3...`)
            // Attendre 2 secondes entre les tentatives
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }

          try {
            const result = await supabase.storage.from("ifc-files").upload(supabasePath, file.buffer, {
              contentType: "application/octet-stream",
              upsert: true, // Écraser si existe déjà
            })

            if (result.error) {
              console.error(`[${fileId}] ❌ Tentative ${attempt} échouée:`, result.error.message)
              uploadError = result.error
            } else {
              uploadData = result.data
              uploadSuccess = true
              console.log(`[${fileId}] ✅ Upload réussi à la tentative ${attempt}`)
              break
            }
          } catch (err: any) {
            console.error(`[${fileId}] ❌ Exception tentative ${attempt}:`, err.message)
            uploadError = err
          }
        }

        if (!uploadSuccess) {
          console.error(`[${fileId}] ❌ Échec upload après 3 tentatives`)
          uploadResults.failed.push({
            success: false,
            error: `Upload failed: ${uploadError?.message || "Unknown error"}`,
            fileName: file.originalname,
          })
          continue
        }

        const uploadDuration = Date.now() - uploadStartTime
        console.log(`[${fileId}] ✅ Upload Supabase réussi en ${uploadDuration}ms`)

        // Récupération URL publique
        const { data: urlData } = supabase.storage.from("ifc-files").getPublicUrl(supabasePath)

        if (!urlData?.publicUrl) {
          console.error(`[${fileId}] ❌ Échec récupération URL publique`)
          uploadResults.failed.push({
            success: false,
            error: "Failed to get public URL",
            fileName: file.originalname,
          })
          continue
        }

        console.log(`[${fileId}] ✅ URL publique obtenue`)

        // Sauvegarde dans MongoDB
        const newFile = new File({
          name: file.originalname,
          file_url: urlData.publicUrl,
          file_size: file.size,
          fileType: "IFC",
          project: new mongoose.Types.ObjectId(projectId),
          supabasePath: supabasePath,
          uploadedBy: userId || userEmail,
          ifcMetadata: {
            schema: "IFC2x3",
            application: "Supabase Upload",
            creator: userEmail,
            timestamp: new Date(),
            coordinates: { x: 0, y: 0, z: 0 },
          },
          uploadedAt: new Date(),
        } as IFile)

        await newFile.save()
        console.log(`[${fileId}] ✅ Sauvegarde MongoDB réussie: ${newFile._id}`)

        const result = {
          success: true,
          file: {
            id: (newFile._id as mongoose.Types.ObjectId).toString(),
            name: file.originalname,
            url: urlData.publicUrl,
            size: file.size,
            fileType: "IFC",
            supabasePath: supabasePath,
          },
          fileId: newFile._id,
          downloadUrl: urlData.publicUrl,
        }

        uploadResults.successful.push(result)
        uploadResults.downloadURLs.push(result.downloadUrl)
        uploadResults.fileMetadata.push(result.file)
        uploadResults.newFileIds.push(result.fileId as mongoose.Types.ObjectId)
      } catch (fileError: any) {
        console.error(`[${fileId}] ❌ Erreur traitement:`, fileError.message)
        uploadResults.failed.push({
          success: false,
          error: fileError.message,
          fileName: file.originalname,
        })
      }
    }

    console.log(
      `[${uploadId}] 📊 Résultats: ${uploadResults.successful.length} réussis, ${uploadResults.failed.length} échoués`,
    )

    // Mise à jour du projet avec les nouveaux fichiers
    if (uploadResults.newFileIds.length > 0) {
      try {
        await Project.findByIdAndUpdate(
          projectId,
          { $push: { files: { $each: uploadResults.newFileIds } } },
          { new: true },
        )
        console.log(`[${uploadId}] ✅ Projet mis à jour avec ${uploadResults.newFileIds.length} nouveaux fichiers`)
      } catch (updateError: any) {
        console.error(`[${uploadId}] ❌ Échec mise à jour projet:`, updateError.message)
      }
    }

    // ✅ RÉPONSE DÉTAILLÉE POUR UPLOAD MULTIPLE
    const successCount = uploadResults.successful.length
    const totalCount = files.length
    const failedCount = uploadResults.failed.length

    const responseData = {
      uploadId,
      success: successCount > 0,
      message: `${successCount}/${totalCount} fichier(s) uploadé(s) avec succès vers Supabase Storage`,

      // Données des fichiers réussis
      downloadURLs: uploadResults.downloadURLs,
      files: uploadResults.fileMetadata,

      // Statistiques détaillées
      stats: {
        total: totalCount,
        successful: successCount,
        failed: failedCount,
        successRate: Math.round((successCount / totalCount) * 100),
      },

      // Erreurs détaillées si il y en a
      errors:
        uploadResults.failed.length > 0
          ? uploadResults.failed.map((f) => ({
              fileName: f.fileName,
              error: f.error,
            }))
          : undefined,

      timestamp: new Date().toISOString(),
      storageProvider: "Supabase",
    }

    if (successCount === 0) {
      console.error(`[${uploadId}] ❌ Aucun fichier uploadé avec succès`)
      res.status(400).json({
        error: "Aucun fichier n'a été uploadé avec succès",
        ...responseData,
      })
      return
    }

    // ✅ SUCCÈS PARTIEL OU TOTAL
    const statusCode = failedCount > 0 ? 207 : 200 // 207 = Multi-Status pour succès partiel
    console.log(`[${uploadId}] ✅ Upload multiple terminé - Status: ${statusCode}`)

    res.status(statusCode).json(responseData)
  } catch (error: any) {
    console.error(`[${uploadId}] ❌ Échec processus d'upload multiple:`, error.message)
    res.status(500).json({
      error: "Échec upload multiple",
      details: error.message || String(error),
      uploadId,
      storageProvider: "Supabase",
      timestamp: new Date().toISOString(),
    })
  }
}


export const getProjectFiles = async (req: Request, res: Response): Promise<void> => {
  const requestId = uuidv4().substring(0, 8)
  console.log(`[${requestId}] 🔍 Récupération fichiers projet`)

  try {
    if (!req.user) {
      console.error(`[${requestId}] ❌ Authentification échouée`)
      res.status(401).json({ error: "Non autorisé" })
      return
    }

    const { id } = req.params
    console.log(`[${requestId}] 📂 Project ID: ${id}`)

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`[${requestId}] ❌ Format ID projet invalide`)
      res.status(400).json({ error: "ID projet invalide" })
      return
    }

    const project = await Project.findById(id).populate({
      path: "files",
      select: "name file_url file_size uploadedBy supabasePath uploadedAt fileType",
    })

    if (!project) {
      console.error(`[${requestId}] ❌ Projet non trouvé: ${id}`)
      res.status(404).json({ error: "Projet non trouvé" })
      return
    }

    console.log(`[${requestId}] ✅ Projet trouvé avec ${project.files?.length || 0} fichiers`)

    const files = await Promise.all(
      (project.files || []).map(async (file: any) => {
        if (file.uploadedBy && mongoose.Types.ObjectId.isValid(file.uploadedBy)) {
          try {
            const user = await User.findById(file.uploadedBy).select("email name")
            if (user) {
              return {
                ...file.toObject(),
                uploadedByEmail: user.email,
                uploadedBy: user._id,
              }
            }
          } catch (e) {
            console.error(`[${requestId}] ❌ Erreur population utilisateur pour fichier ${file._id}`, e)
          }
        }
        return file
      }),
    )

    console.log(`[${requestId}] ✅ Fichiers récupérés avec succès`)
    res.status(200).json(files)
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Échec récupération fichiers projet`, error)
    res.status(500).json({
      error: "Échec récupération fichiers projet",
      details: error?.message || String(error),
      requestId,
    })
  }
}

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  const requestId = uuidv4().substring(0, 8)
  console.log(`[${requestId}] 🗑️ Début suppression fichier`)

  try {
    if (!req.user) {
      console.error(`[${requestId}] ❌ Authentification échouée`)
      res.status(401).json({ error: "Non autorisé" })
      return
    }

    const { fileId, projectId, supabasePath } = req.body
    console.log(`[${requestId}] 🗑️ Suppression`, { fileId, projectId, supabasePath })

    if (!fileId) {
      console.error(`[${requestId}] ❌ File ID manquant`)
      res.status(400).json({ error: "File ID requis" })
      return
    }

    // Gestion fichiers temporaires
    if (fileId.startsWith("temp-")) {
      if (supabasePath) {
        try {
          const { error: deleteError } = await supabase.storage.from("ifc-files").remove([supabasePath])

          if (deleteError) {
            console.error(`[${requestId}] ❌ Suppression Supabase échouée pour fichier temp`, deleteError)
          } else {
            console.log(`[${requestId}] ✅ Fichier temporaire supprimé de Supabase: ${supabasePath}`)
          }
        } catch (storageError) {
          console.error(`[${requestId}] ❌ Erreur suppression Supabase pour fichier temp`, storageError)
        }
      }

      res.status(200).json({
        success: true,
        message: "Fichier temporaire supprimé avec succès",
        deletedFile: { id: fileId, supabasePath },
        requestId,
      })
      return
    }

    // Gestion fichiers MongoDB normaux
    const fileToDelete = await File.findById(fileId)
    if (!fileToDelete) {
      console.error(`[${requestId}] ❌ Fichier non trouvé en base: ${fileId}`)
      res.status(404).json({ error: "Fichier non trouvé" })
      return
    }

    console.log(`[${requestId}] ✅ Fichier trouvé en base: ${fileToDelete.name}`)

    const pathToDelete = fileToDelete.supabasePath || supabasePath
    console.log(`[${requestId}] 🗑️ Chemin Supabase à supprimer: ${pathToDelete}`)

    // Suppression de Supabase Storage
    if (pathToDelete) {
      try {
        const { error: deleteError } = await supabase.storage.from("ifc-files").remove([pathToDelete])

        if (deleteError) {
          console.error(`[${requestId}] ❌ Suppression Supabase Storage échouée`, deleteError)
        } else {
          console.log(`[${requestId}] ✅ Fichier supprimé de Supabase Storage`)
        }
      } catch (storageError) {
        console.error(`[${requestId}] ❌ Erreur suppression Supabase Storage`, storageError)
      }
    }

    // Suppression de MongoDB
    const deleteResult = await File.findByIdAndDelete(fileId)
    if (!deleteResult) {
      console.error(`[${requestId}] ❌ Fichier déjà supprimé de la base`)
      res.status(404).json({ error: "Fichier déjà supprimé" })
      return
    }

    console.log(`[${requestId}] ✅ Fichier supprimé de MongoDB`)

    // Suppression de la référence dans le projet
    const projectToUpdate = projectId || fileToDelete.project
    if (projectToUpdate) {
      await Project.findByIdAndUpdate(
        projectToUpdate,
        { $pull: { files: new mongoose.Types.ObjectId(fileId) } },
        { new: true },
      )
      console.log(`[${requestId}] ✅ Référence fichier supprimée du projet`)
    }

    res.status(200).json({
      success: true,
      message: "Fichier supprimé avec succès de Supabase Storage",
      deletedFile: {
        id: fileId,
        name: fileToDelete.name,
        supabasePath: pathToDelete,
      },
      requestId,
    })
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Suppression fichier échouée`, error)
    res.status(500).json({
      error: "Suppression échouée",
      details: error?.message || String(error),
      requestId,
      storageProvider: "Supabase",
    })
  }
}

export const getFileById = async (req: Request, res: Response): Promise<void> => {
  const requestId = uuidv4().substring(0, 8)
  console.log(`[${requestId}] 🔍 Récupération fichier par ID`)

  try {
    if (!req.user) {
      console.error(`[${requestId}] ❌ Authentification échouée`)
      res.status(401).json({ error: "Non autorisé" })
      return
    }

    const { id } = req.params
    console.log(`[${requestId}] 📄 File ID: ${id}`)

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`[${requestId}] ❌ Format ID fichier invalide`)
      res.status(400).json({ error: "ID fichier invalide" })
      return
    }

    const file = await File.findById(id)

    if (!file) {
      console.error(`[${requestId}] ❌ Fichier non trouvé: ${id}`)
      res.status(404).json({ error: "Fichier non trouvé" })
      return
    }

    console.log(`[${requestId}] ✅ Fichier récupéré: ${file.name}`)
    res.status(200).json(file)
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Échec récupération fichier`, error)
    res.status(500).json({
      error: "Échec récupération fichier",
      details: error?.message || String(error),
      requestId,
    })
  }
}