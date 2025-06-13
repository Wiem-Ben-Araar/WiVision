import type { Request, Response } from "express";
import mongoose from "mongoose";
import { supabase } from "../config/supabase";
import File, { type IFile } from "../models/file";
import Project from "../models/project";
import User from "../models/user";
import { v4 as uuidv4 } from "uuid";
import pLimit from "p-limit";

// ✅ FONCTION POUR VÉRIFIER LE BUCKET (OPTIMISÉE)
const ensureBucketExists = async (): Promise<boolean> => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const ifcBucket = buckets?.find((b) => b.name === "ifc-files");
    return !!ifcBucket;
  } catch (error: any) {
    console.error("❌ Erreur vérification bucket:", error.message);
    return false;
  }
};

// ✅ FONCTION D'UPLOAD PARALLELE
async function uploadToSupabase(
  file: Express.Multer.File,
  supabasePath: string
): Promise<{ success: boolean; error?: any }> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // Timeout après 30s

    supabase.storage
      .from("ifc-files")
      .upload(supabasePath, file.buffer, {
        contentType: "application/octet-stream",
        upsert: true,
        duplex: "half",
        cacheControl: "3600",
      })
      .then(({ error }) => {
        clearTimeout(timeout);
        resolve({ success: !error, error });
      })
      .catch((err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: err });
      });
  });
}

// ⚡ UPLOAD MULTIPLE HAUTE PERFORMANCE
export const uploadFiles = async (req: Request, res: Response): Promise<void> => {
  const uploadId = uuidv4().substring(0, 8);
  console.log(`[${uploadId}] 🚀 Démarrage upload MULTIPLE vers Supabase`);

  try {
    if (!(await ensureBucketExists())) {
       res.status(500).json({ error: "Bucket Supabase non disponible" });
    }

    if (!req.user)  res.status(401).json({ error: "Non autorisé" });
    
    const user = req.user as { email?: string };
    const userEmail = user.email || "unknown@example.com";
    const projectId: string = req.body.projectId;

    // Récupération des fichiers
    const files: Express.Multer.File[] = Array.isArray(req.files)
      ? req.files
      : req.files?.file
        ? Array.isArray(req.files.file)
          ? req.files.file
          : [req.files.file]
        : req.file
          ? [req.file]
          : [];

    if (!files.length) {
       res.status(400).json({ error: "Aucun fichier fourni" });
    }

    if (!projectId) {
       res.status(400).json({ error: "ProjectId requis" });
    }

    // Vérification projet
    const project = await Project.findById(projectId);
    if (!project) {
       res.status(404).json({ error: `Projet non trouvé` });
    }

    // Recherche utilisateur
    const userDoc = await User.findOne({ email: userEmail });
    const userId = userDoc?._id || userEmail;

    // ⚡ PARALLÉLISME CONTRÔLÉ
    const limit = pLimit(10); // 10 uploads simultanés
    const startTime = Date.now();
    
    const uploadPromises = files.map((file, index) =>
      limit(async () => {
        const fileId = `${uploadId}-file-${index}`;
        
        try {
          // Validation format et taille
          if (!file.originalname.toLowerCase().endsWith(".ifc")) {
            throw new Error("Format non IFC");
          }

          if (file.size > 200 * 1024 * 1024) {
            throw new Error("Fichier trop volumineux");
          }

          // Génération chemin unique
          const timestamp = Date.now();
          const sanitizedName = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, "_")
            .replace(/_+/g, "_")
            .toLowerCase();
            
          const fileName = `${timestamp}_${index}_${sanitizedName}`;
          const supabasePath = `projects/${projectId}/${fileName}`;

          // ⚡ UPLOAD DIRECT AVEC TIMEOUT
          const uploadResult = await uploadToSupabase(file, supabasePath);
          if (!uploadResult.success) {
            throw uploadResult.error || "Échec upload";
          }

          // Récupération URL
          const { data: urlData } = supabase.storage
            .from("ifc-files")
            .getPublicUrl(supabasePath);

          if (!urlData?.publicUrl) {
            throw new Error("Échec récupération URL");
          }

          // Création document
          const newFile = new File({
            name: file.originalname,
            file_url: urlData.publicUrl,
            file_size: file.size,
            fileType: "IFC",
            project: new mongoose.Types.ObjectId(projectId),
            supabasePath,
            uploadedBy: userId,
            uploadedAt: new Date(),
          } as IFile);

          await newFile.save();

          // Explicitly cast _id to mongoose.Types.ObjectId
          const fileId =
            typeof newFile._id === "object" && newFile._id instanceof mongoose.Types.ObjectId
              ? newFile._id.toString()
              : String(newFile._id);

          return {
            success: true,
            file: {
              id: fileId,
              name: file.originalname,
              url: urlData.publicUrl,
              size: file.size,
              fileType: "IFC",
              supabasePath,
            },
          };
        } catch (error: any) {
          return {
            success: false,
            fileName: file.originalname,
            error: error.message || String(error),
          };
        }
      })
    );

    const results = await Promise.all(uploadPromises);

    // Mise à jour projet
    const successfulUploads = results.filter((r) => r.success);
    const newFileIds = successfulUploads
      .filter((r) => r.file && r.file.id)
      .map((r) => r.file && r.file.id ? new mongoose.Types.ObjectId(r.file.id) : null)
      .filter((id) => id !== null);

    if (newFileIds.length) {
      await Project.findByIdAndUpdate(
        projectId,
        { $push: { files: { $each: newFileIds } } },
        { new: true }
      );
    }

    // Préparation réponse
    const successCount = successfulUploads.length;
    const failedCount = results.length - successCount;
    const duration = Date.now() - startTime;

    const responseData = {
      uploadId,
      success: successCount > 0,
      message: `${successCount}/${results.length} fichiers uploadés en ${duration}ms`,
      files: successfulUploads.map((r) => r.file),
      stats: {
        total: results.length,
        successful: successCount,
        failed: failedCount,
        successRate: Math.round((successCount / results.length) * 100),
      },
      errors: results
        .filter((r) => !r.success)
        .map((r) => ({
          fileName: r.fileName,
          error: r.error,
        })),
      timestamp: new Date().toISOString(),
      storageProvider: "Supabase",
      durationMs: duration,
    };

    console.log(
      `[${uploadId}] ⚡ Upload terminé en ${duration}ms - ${successCount} succès`
    );

    res.status(failedCount ? 207 : 200).json(responseData);
  } catch (error: any) {
    console.error(`[${uploadId}] ❌ Échec global:`, error.message);
    res.status(500).json({
      error: "Échec traitement global",
      details: error.message || String(error),
      uploadId,
    });
  }
};



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