import type { Request, Response } from "express"
import mongoose from "mongoose"
import { supabase } from "../config/supabase"
import File, { type IFile } from "../models/file"
import Project from "../models/project"
import User from "../models/user"
import { v4 as uuidv4 } from "uuid"

// ✅ FONCTION POUR VÉRIFIER/CRÉER LE BUCKET
const ensureBucketExists = async (): Promise<boolean> => {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error("❌ Erreur vérification buckets:", listError.message)
      return false
    }

    const ifcBucket = buckets?.find((b) => b.name === "ifc-files")

    if (!ifcBucket) {
      console.log("🔄 Création bucket ifc-files en cours...")

      const { error: createError } = await supabase.storage.createBucket("ifc-files", {
        public: false,
        allowedMimeTypes: ["application/octet-stream"],
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
      })

      if (createError) {
        console.error("❌ Impossible de créer le bucket:", createError.message)
        return false
      }

      console.log("✅ Bucket ifc-files créé !")
    }

    return true
  } catch (error: any) {
    console.error("❌ Erreur vérification bucket:", error.message)
    return false
  }
}

export const uploadFiles = async (req: Request, res: Response): Promise<void> => {
  const uploadId = uuidv4().substring(0, 8)
  console.log(`[${uploadId}] 🚀 Démarrage upload SUPABASE`)

  try {
    // ✅ VÉRIFIER QUE LE BUCKET EXISTE AVANT L'UPLOAD
    const bucketExists = await ensureBucketExists()
    if (!bucketExists) {
      console.error(`[${uploadId}] ❌ Bucket ifc-files non disponible`)
      res.status(500).json({
        error: "Bucket Supabase non disponible",
        solution: "Créez manuellement le bucket 'ifc-files' dans Supabase Console",
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
    const files = req.files as Express.Multer.File[]

    console.log(
      `[${uploadId}] 📦 Données reçues: projectId=${projectId}, fichiers=${files?.length}, email=${userEmail}`,
    )

    // Validation
    if (!files || files.length === 0) {
      console.error(`[${uploadId}] ❌ Aucun fichier fourni`)
      res.status(400).json({ error: "Aucun fichier fourni" })
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

    const downloadURLs: string[] = []
    const fileMetadata: any[] = []
    const newFileIds: mongoose.Types.ObjectId[] = []
    const errors: string[] = []

    // Traitement de chaque fichier
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileId: string = `${uploadId}-file-${i}`

      console.log(`[${fileId}] 📄 Traitement fichier: ${file.originalname} (${file.size} octets)`)

      // Validation format IFC
      if (!file.originalname.toLowerCase().endsWith(".ifc")) {
        const error: string = `Le fichier ${file.originalname} n'est pas au format IFC`
        console.error(`[${fileId}] ❌ ${error}`)
        errors.push(error)
        continue
      }

      // Validation taille fichier (50MB max)
      const maxFileSize: number = 50 * 1024 * 1024 // 50MB
      if (file.size > maxFileSize) {
        const error: string = `Le fichier ${file.originalname} est trop volumineux (${Math.round(file.size / 1024 / 1024)}MB). Taille maximum: 50MB.`
        console.error(`[${fileId}] ❌ ${error}`)
        errors.push(error)
        continue
      }

      try {
        // Génération du chemin Supabase
        const timestamp: number = Date.now()
        const sanitizedName: string = file.originalname
          .replace(/[^a-zA-Z0-9.-]/g, "_")
          .replace(/_{2,}/g, "_")
          .toLowerCase()

        const fileName: string = `${timestamp}_${sanitizedName}`
        const supabasePath: string = `projects/${projectId}/${fileName}`

        console.log(`[${fileId}] 📂 Chemin Supabase généré: ${supabasePath}`)

        // ✅ UPLOAD VERS SUPABASE STORAGE AVEC GESTION D'ERREUR AMÉLIORÉE
        console.log(`[${fileId}] 🔄 Démarrage upload Supabase...`)
        const uploadStartTime: number = Date.now()

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("ifc-files")
          .upload(supabasePath, file.buffer, {
            contentType: "application/octet-stream",
            metadata: {
              originalName: file.originalname,
              uploadId: uploadId,
              projectId: projectId,
              userEmail: userEmail,
              uploadTimestamp: new Date().toISOString(),
            },
            upsert: false,
          })

        if (uploadError) {
          console.error(`[${fileId}] ❌ Échec upload Supabase:`, uploadError.message)

          let userFriendlyError = `Erreur upload ${file.originalname}: `

          if (uploadError.message.includes("Bucket not found")) {
            userFriendlyError += "Bucket Supabase non trouvé. Vérifiez la configuration."
            console.error(`[${fileId}] 🔧 SOLUTION: Créez le bucket 'ifc-files' dans Supabase Console`)
          } else if (uploadError.message.includes("Duplicate")) {
            userFriendlyError += "Fichier déjà existant."
          } else if (uploadError.message.includes("size")) {
            userFriendlyError += "Fichier trop volumineux."
          } else {
            userFriendlyError += uploadError.message
          }

          errors.push(userFriendlyError)
          continue
        }

        const uploadDuration: number = Date.now() - uploadStartTime
        console.log(`[${fileId}] ✅ Upload Supabase réussi en ${uploadDuration}ms`)

        // Récupération URL publique
        const { data: urlData } = supabase.storage.from("ifc-files").getPublicUrl(supabasePath)

        if (!urlData?.publicUrl) {
          console.error(`[${fileId}] ❌ Échec récupération URL publique`)
          errors.push(`Échec récupération URL pour ${file.originalname}`)
          continue
        }

        console.log(`[${fileId}] ✅ URL publique Supabase obtenue`)
        downloadURLs.push(urlData.publicUrl)

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

        fileMetadata.push({
          id: (newFile._id as mongoose.Types.ObjectId).toString(),
          name: file.originalname,
          url: urlData.publicUrl,
          size: file.size,
          fileType: "IFC",
        })

        newFileIds.push(newFile._id as mongoose.Types.ObjectId)
      } catch (fileError: any) {
        console.error(`[${fileId}] ❌ Échec traitement fichier:`, fileError.message)
        errors.push(`Erreur traitement ${file.originalname}: ${fileError.message}`)
      }
    }

    // Mise à jour du projet
    if (newFileIds.length > 0) {
      try {
        await Project.findByIdAndUpdate(projectId, { $push: { files: { $each: newFileIds } } }, { new: true })
        console.log(`[${uploadId}] ✅ Projet mis à jour avec ${newFileIds.length} nouveaux fichiers`)
      } catch (updateError: any) {
        console.error(`[${uploadId}] ❌ Échec mise à jour projet:`, updateError.message)
        errors.push("Échec mise à jour projet avec nouveaux fichiers")
      }
    }

    // Réponse
    const successCount: number = downloadURLs.length
    const totalCount: number = files.length

    const responseData = {
      downloadURLs,
      files: fileMetadata,
      success: successCount > 0,
      message: `${successCount}/${totalCount} fichier(s) uploadé(s) avec succès vers Supabase Storage`,
      errors: errors.length > 0 ? errors : undefined,
    }

    if (successCount === 0) {
      console.error(`[${uploadId}] ❌ Aucun fichier uploadé avec succès`, { errors })
      res.status(400).json({
        error: "Aucun fichier n'a été uploadé avec succès",
        ...responseData,
      })
      return
    }

    console.log(`[${uploadId}] ✅ Processus d'upload terminé avec succès vers SUPABASE`)
    res.status(200).json(responseData)
  } catch (error: any) {
    console.error(`[${uploadId}] ❌ Échec processus d'upload:`, error.message)
    res.status(500).json({
      error: "Échec upload",
      details: error.message || String(error),
      uploadId,
      storageProvider: "Supabase",
    })
  }
}

// Garder les autres fonctions...
export const getProjectFiles = async (req: Request, res: Response): Promise<void> => {
  // Même code qu'avant
}

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  // Même code qu'avant
}

export const getFileById = async (req: Request, res: Response): Promise<void> => {
  // Même code qu'avant
}
