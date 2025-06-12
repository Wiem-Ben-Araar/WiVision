import type { Request, Response } from "express"
import mongoose from "mongoose"
import { supabase } from "../config/supabase"
import File, { type IFile } from "../models/file"
import Project from "../models/project"
import User from "../models/user"
import { v4 as uuidv4 } from "uuid"

// Interface pour l'utilisateur authentifié
interface AuthenticatedUser {
  email?: string
  id?: string
}

// Interface pour les fichiers uploadés
interface UploadedFile {
  originalname: string
  buffer: Buffer
  size: number
  mimetype: string
}

/**
 * ✅ UPLOAD FILES VERS SUPABASE STORAGE
 */
export const uploadFiles = async (req: Request, res: Response): Promise<void> => {
  const uploadId = uuidv4().substring(0, 8)
  console.log(`[${uploadId}] 🚀 Démarrage upload SUPABASE`)

  try {
    // Vérification authentification
    if (!req.user) {
      console.error(`[${uploadId}] ❌ Authentification échouée`)
      res.status(401).json({ error: "Non autorisé" })
      return
    }

    const user = req.user as AuthenticatedUser
    if (!user.email) {
      console.error(`[${uploadId}] ❌ Email utilisateur non trouvé`)
      res.status(401).json({ error: "Email utilisateur non trouvé" })
      return
    }

    // Extraction des données
    const projectId: string = req.body.projectId
    const userEmail: string = user.email
    const files: UploadedFile[] = req.files as UploadedFile[]

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
      const file: UploadedFile = files[i]
      const fileId: string = `${uploadId}-file-${i}`

      console.log(`[${fileId}] 📄 Traitement fichier: ${file.originalname} (${file.size} octets)`)

      // Validation format IFC
      if (!file.originalname.toLowerCase().endsWith(".ifc")) {
        const error: string = `Le fichier ${file.originalname} n'est pas au format IFC`
        console.error(`[${fileId}] ❌ ${error}`)
        errors.push(error)
        continue
      }

      // Validation taille fichier (50MB max pour Supabase gratuit)
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

        // ✅ UPLOAD VERS SUPABASE STORAGE
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
            upsert: false, // Ne pas écraser les fichiers existants
          })

        if (uploadError) {
          console.error(`[${fileId}] ❌ Échec upload Supabase:`, uploadError.message)

          let userFriendlyError = `Erreur upload ${file.originalname}: `
          if (uploadError.message.includes("Duplicate")) {
            userFriendlyError += "Fichier déjà existant. Essayez de renommer le fichier."
          } else if (uploadError.message.includes("size")) {
            userFriendlyError += "Fichier trop volumineux."
          } else if (uploadError.message.includes("bucket")) {
            userFriendlyError += "Bucket Supabase non accessible. Vérifiez la configuration."
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

        // ✅ SAUVEGARDE DANS MONGODB AVEC SUPABASE PATH
        const newFile = new File({
          name: file.originalname,
          file_url: urlData.publicUrl,
          file_size: file.size,
          fileType: "IFC",
          project: new mongoose.Types.ObjectId(projectId),
          supabasePath: supabasePath, // ✅ SUPABASE PATH (pas firebasePath !)
          uploadedBy: userId || userEmail,
          ifcMetadata: {
            schema: "IFC2x3",
            application: "Supabase Upload",
            creator: userEmail,
            timestamp: new Date(),
            coordinates: {
              x: 0,
              y: 0,
              z: 0,
            },
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

    // Mise à jour du projet avec les nouveaux fichiers
    if (newFileIds.length > 0) {
      try {
        await Project.findByIdAndUpdate(projectId, { $push: { files: { $each: newFileIds } } }, { new: true })
        console.log(`[${uploadId}] ✅ Projet mis à jour avec ${newFileIds.length} nouveaux fichiers`)
      } catch (updateError: any) {
        console.error(`[${uploadId}] ❌ Échec mise à jour projet:`, updateError.message)
        errors.push("Échec mise à jour projet avec nouveaux fichiers")
      }
    }

    // Préparation de la réponse
    const successCount: number = downloadURLs.length
    const totalCount: number = files.length

    const responseData = {
      downloadURLs,
      files: fileMetadata,
      success: successCount > 0,
      message: `${successCount}/${totalCount} fichier(s) uploadé(s) avec succès vers Supabase Storage`,
      errors: errors.length > 0 ? errors : undefined,
      debug: {
        processedFiles: totalCount,
        successfulUploads: successCount,
        failedUploads: totalCount - successCount,
        timestamp: new Date().toISOString(),
        storageProvider: "Supabase",
      },
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
      timestamp: new Date().toISOString(),
      storageProvider: "Supabase",
    })
  }
}

/**
 * ✅ RÉCUPÉRATION DES FICHIERS D'UN PROJET
 */
export const getProjectFiles = async (req: Request, res: Response): Promise<void> => {
  const requestId = uuidv4().substring(0, 8)
  console.log(`[${requestId}] 🔍 Récupération fichiers projet`)

  try {
    if (!req.user) {
      console.error(`[${requestId}] ❌ Authentification échouée`)
      res.status(401).json({ error: "Non autorisé" })
      return
    }

    const id: string = req.params.id as string
    console.log(`[${requestId}] 📝 ID projet: ${id}`)

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`[${requestId}] ❌ ID projet invalide`)
      res.status(400).json({ error: "ID projet invalide" })
      return
    }

    // Récupération du projet avec ses fichiers
    const project = await Project.findById(id).populate({
      path: "files",
      select: "name file_url file_size uploadedBy supabasePath uploadedAt fileType ifcMetadata",
    })

    if (!project) {
      console.error(`[${requestId}] ❌ Projet non trouvé: ${id}`)
      res.status(404).json({ error: "Projet non trouvé" })
      return
    }

    console.log(`[${requestId}] ✅ Projet trouvé avec ${project.files?.length || 0} fichiers`)

    // Population des informations utilisateur pour chaque fichier
    const files = await Promise.all(
      (project.files || []).map(async (file: any) => {
        if (file.uploadedBy && mongoose.Types.ObjectId.isValid(file.uploadedBy)) {
          try {
            const user = await User.findById(file.uploadedBy).select("email name")
            if (user) {
              return {
                ...file.toObject(),
                uploadedByEmail: user.email,
                uploadedByName: user.name,
                uploadedBy: user._id,
              }
            }
          } catch (e: any) {
            console.error(`[${requestId}] Erreur population utilisateur pour fichier ${file._id}:`, e)
          }
        }
        return file.toObject()
      }),
    )

    console.log(`[${requestId}] ✅ Fichiers récupérés avec succès`)
    res.status(200).json(files)
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Erreur récupération fichiers projet:`, error)
    res.status(500).json({
      error: "Échec récupération fichiers projet",
      details: error.message || String(error),
      requestId,
    })
  }
}

/**
 * ✅ SUPPRESSION D'UN FICHIER DE SUPABASE ET MONGODB
 */
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  const requestId = uuidv4().substring(0, 8)
  console.log(`[${requestId}] 🗑️ Démarrage suppression fichier`)

  try {
    if (!req.user) {
      console.error(`[${requestId}] ❌ Authentification échouée`)
      res.status(401).json({ error: "Non autorisé" })
      return
    }

    const { fileId, projectId, supabasePath }: { fileId: string; projectId?: string; supabasePath?: string } = req.body
    console.log(`[${requestId}] 📝 Demande suppression: fileId=${fileId}, projectId=${projectId}`)

    if (!fileId) {
      console.error(`[${requestId}] ❌ ID fichier manquant`)
      res.status(400).json({ error: "ID fichier requis" })
      return
    }

    // Gestion des fichiers temporaires
    if (fileId.startsWith("temp-")) {
      if (supabasePath) {
        try {
          const { error: deleteError } = await supabase.storage.from("ifc-files").remove([supabasePath])

          if (deleteError) {
            console.error(`[${requestId}] ❌ Échec suppression Supabase pour fichier temp:`, deleteError.message)
          } else {
            console.log(`[${requestId}] ✅ Fichier temporaire supprimé de Supabase: ${supabasePath}`)
          }
        } catch (storageError: any) {
          console.error(`[${requestId}] ❌ Erreur suppression Supabase pour fichier temp:`, storageError.message)
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

    // Gestion des fichiers MongoDB
    const fileToDelete = await File.findById(fileId)
    if (!fileToDelete) {
      console.error(`[${requestId}] ❌ Fichier non trouvé en base: ${fileId}`)
      res.status(404).json({ error: "Fichier non trouvé" })
      return
    }

    console.log(`[${requestId}] ✅ Fichier trouvé en base: ${fileToDelete.name}`)

    const pathToDelete: string = fileToDelete.supabasePath || supabasePath || ""
    console.log(`[${requestId}] 📂 Chemin Supabase à supprimer: ${pathToDelete}`)

    // ✅ SUPPRESSION DE SUPABASE STORAGE
    if (pathToDelete) {
      try {
        const { error: deleteError } = await supabase.storage.from("ifc-files").remove([pathToDelete])

        if (deleteError) {
          console.error(`[${requestId}] ❌ Échec suppression Supabase:`, deleteError.message)
        } else {
          console.log(`[${requestId}] ✅ Fichier supprimé de Supabase Storage`)
        }
      } catch (storageError: any) {
        console.error(`[${requestId}] ❌ Erreur suppression Supabase:`, storageError.message)
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
    const projectToUpdate: string = projectId || (fileToDelete.project ? fileToDelete.project.toString() : "")
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
      message: "Fichier supprimé avec succès de Supabase Storage et MongoDB",
      deletedFile: {
        id: fileId,
        name: fileToDelete.name,
        supabasePath: pathToDelete,
      },
      requestId,
    })
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Échec suppression fichier:`, error.message)
    res.status(500).json({
      error: "Échec suppression",
      details: error.message || String(error),
      requestId,
      storageProvider: "Supabase",
    })
  }
}

/**
 * ✅ RÉCUPÉRATION D'UN FICHIER PAR ID
 */
export const getFileById = async (req: Request, res: Response): Promise<void> => {
  const requestId = uuidv4().substring(0, 8)
  console.log(`[${requestId}] 🔍 Récupération fichier par ID`)

  try {
    if (!req.user) {
      console.error(`[${requestId}] ❌ Authentification échouée`)
      res.status(401).json({ error: "Non autorisé" })
      return
    }

    const id = req.params.id as string
    console.log(`[${requestId}] 📝 ID fichier: ${id}`)

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.error(`[${requestId}] ❌ ID fichier invalide`)
      res.status(400).json({ error: "ID fichier invalide" })
      return
    }

    const file = await File.findById(id).populate("project", "name").populate("uploadedBy", "email name")

    if (!file) {
      console.error(`[${requestId}] ❌ Fichier non trouvé: ${id}`)
      res.status(404).json({ error: "Fichier non trouvé" })
      return
    }

    console.log(`[${requestId}] ✅ Fichier récupéré: ${file.name}`)
    res.status(200).json(file)
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Erreur récupération fichier:`, error)
    res.status(500).json({
      error: "Échec récupération fichier",
      details: error.message || String(error),
      requestId,
    })
  }
}

/**
 * ✅ DIAGNOSTIC SUPABASE STORAGE
 */
export const diagnosticStorage = async (req: Request, res: Response): Promise<void> => {
  const requestId = uuidv4().substring(0, 8)
  console.log(`[${requestId}] 🔧 Diagnostic Supabase Storage`)

  try {
    // Test de connexion
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error(`[${requestId}] ❌ Erreur liste buckets:`, listError.message)
      res.status(500).json({
        error: "Erreur connexion Supabase",
        details: listError.message,
        requestId,
      })
      return
    }

    console.log(`[${requestId}] ✅ Connexion Supabase réussie`)

    // Vérification bucket ifc-files
    const ifcBucket = buckets?.find((b) => b.name === "ifc-files")

    if (!ifcBucket) {
      console.log(`[${requestId}] ⚠️ Bucket ifc-files non trouvé, création...`)

      const { error: createError } = await supabase.storage.createBucket("ifc-files", {
        public: false,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
      })

      if (createError) {
        console.error(`[${requestId}] ❌ Erreur création bucket:`, createError.message)
        res.status(500).json({
          error: "Erreur création bucket",
          details: createError.message,
          requestId,
        })
        return
      }

      console.log(`[${requestId}] ✅ Bucket ifc-files créé`)
    }

    // Test upload/suppression
    const testPath = `test/diagnostic-${requestId}.txt`
    const testData = new TextEncoder().encode("Test diagnostic Supabase")

    const { error: uploadError } = await supabase.storage.from("ifc-files").upload(testPath, testData)

    if (uploadError) {
      console.error(`[${requestId}] ❌ Erreur test upload:`, uploadError.message)
      res.status(500).json({
        error: "Erreur test upload",
        details: uploadError.message,
        requestId,
      })
      return
    }

    console.log(`[${requestId}] ✅ Test upload réussi`)

    // Nettoyage du fichier test
    const { error: deleteError } = await supabase.storage.from("ifc-files").remove([testPath])

    if (deleteError) {
      console.error(`[${requestId}] ⚠️ Erreur nettoyage fichier test:`, deleteError.message)
    } else {
      console.log(`[${requestId}] ✅ Fichier test nettoyé`)
    }

    res.status(200).json({
      success: true,
      message: "Diagnostic Supabase Storage réussi",
      details: {
        bucketsCount: buckets?.length || 0,
        ifcBucketExists: !!ifcBucket,
        uploadTest: "OK",
        deleteTest: deleteError ? "FAILED" : "OK",
      },
      requestId,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error(`[${requestId}] ❌ Erreur diagnostic:`, error.message)
    res.status(500).json({
      error: "Diagnostic échoué",
      details: error.message,
      requestId,
    })
  }
}
