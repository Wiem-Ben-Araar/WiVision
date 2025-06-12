import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import storage, { firebaseConfig } from "../config/firebase";
import File from "../models/file";
import Project from "../models/project";
import User from "../models/user";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload a file or multiple files to a project
 */
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ error: "Not authorized" });
      return;
    }

    const user = req.user as { email?: string };
    if (!user.email) {
      res.status(401).json({ error: "User email not found in token" });
      return;
    }

    // Extract data from the form
    const projectId = req.body.projectId;
    const userEmail = user.email;
    const files = req.files as Express.Multer.File[];

    console.log('📤 Upload Request Details:', {
      projectId,
      userEmail,
      filesCount: files?.length || 0,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      storageBucket: firebaseConfig.storageBucket
    });

    // Validate inputs
    if (!files || files.length === 0) {
      console.error('❌ No files provided in request');
      res.status(400).json({ error: "No file provided" });
      return;
    }

    if (!projectId) {
      console.error('❌ No projectId provided');
      res.status(400).json({ error: "ProjectId is required" });
      return;
    }

    // Find the project
    console.log('🔍 Recherche du projet:', projectId);
    const project = await Project.findById(projectId);
    if (!project) {
      console.error('❌ Projet non trouvé:', projectId);
      res.status(404).json({ error: `Project with ID ${projectId} not found` });
      return;
    }
    console.log('✅ Projet trouvé:', project.name || project._id);

    // Try to find the user by email
    let userId = null;
    if (userEmail) {
      const foundUser = await User.findOne({ email: userEmail });
      if (foundUser) {
        userId = foundUser._id;
        console.log('✅ Utilisateur trouvé:', userEmail);
      } else {
        console.log('⚠️ Utilisateur non trouvé, utilisation de l\'email:', userEmail);
      }
    }

    const downloadURLs: string[] = [];
    const fileMetadata: any[] = [];
    const newFileIds: mongoose.Types.ObjectId[] = [];
    const errors: string[] = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n📁 Traitement du fichier ${i + 1}/${files.length}:`, {
        name: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        bufferLength: file.buffer?.length
      });

      // Check if file is IFC format
      if (!file.originalname.toLowerCase().endsWith(".ifc")) {
        const error = `File ${file.originalname} is not in IFC format`;
        console.error('❌', error);
        errors.push(error);
        continue;
      }

      try {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.originalname}`
          .replace(/[^\w.]/g, "_")
          .replace(/\s+/g, "_");
        const storagePath = `projects/${projectId}/${fileName}`;

        console.log('📍 Chemin de stockage:', storagePath);

        // Create storage reference
        const storageRef = ref(storage, storagePath);
        console.log('📋 Référence créée:', {
          bucket: firebaseConfig.storageBucket,
          fullPath: storagePath,
          name: fileName
        });

        // Metadata for Firebase
        const metadata = {
          contentType: file.mimetype || "application/octet-stream",
          customMetadata: {
            originalName: file.originalname,
            projectId: projectId,
            uploadedBy: userEmail,
            uploadedAt: new Date().toISOString(),
            firebaseStorageDownloadTokens: uuidv4()
          },
        };

        console.log('📤 Début de l\'upload vers Firebase Storage...');
        
        // Upload with detailed error handling
        let snapshot;
        try {
          snapshot = await Promise.race([
            uploadBytes(storageRef, file.buffer, metadata),
            new Promise<never>((_, reject) => {
              setTimeout(
                () => reject(new Error("Upload timeout after 60s")),
                60000
              );
            }),
          ]);
          
          console.log('✅ Upload réussi:', {
            name: snapshot.ref.name,
            fullPath: snapshot.ref.fullPath,
            size: snapshot.metadata.size,
            contentType: snapshot.metadata.contentType,
            timeCreated: snapshot.metadata.timeCreated
          });
          
        } catch (uploadError: any) {
          console.error('❌ Erreur détaillée lors de l\'upload:', {
            fileName: file.originalname,
            error: uploadError.message,
            code: uploadError.code,
            name: uploadError.name,
            serverResponse: uploadError.serverResponse,
            customData: uploadError.customData,
            stack: uploadError.stack?.split('\n').slice(0, 5).join('\n')
          });
          
          // Messages d'erreur plus spécifiques
          let errorMessage = `Error uploading ${file.originalname}`;
          if (uploadError.code === 'storage/unauthorized') {
            errorMessage += ': Permission denied - check Firebase Storage rules';
          } else if (uploadError.code === 'storage/unknown') {
            errorMessage += ': Connection issue - check Firebase configuration';
          } else if (uploadError.code === 'storage/quota-exceeded') {
            errorMessage += ': Storage quota exceeded';
          } else if (uploadError.message?.includes('timeout')) {
            errorMessage += ': Upload timeout (file too large or slow connection)';
          } else {
            errorMessage += `: ${uploadError.message}`;
          }
          
          errors.push(errorMessage);
          continue;
        }

        // Get download URL
        console.log('🔗 Récupération de l\'URL de téléchargement...');
        let downloadURL;
        try {
          downloadURL = await getDownloadURL(snapshot.ref);
          console.log('✅ URL générée:', downloadURL.substring(0, 100) + '...');
        } catch (urlError: any) {
          console.error('❌ Erreur lors de la génération de l\'URL:', urlError);
          errors.push(`Failed to get download URL for ${file.originalname}: ${urlError.message}`);
          continue;
        }

        if (downloadURL) {
          downloadURLs.push(downloadURL);

          // Create a new File document in MongoDB
          console.log('💾 Sauvegarde en base de données...');
          const newFile = new File({
            name: file.originalname,
            file_url: downloadURL,
            file_size: file.size,
            fileType: "IFC",
            project: new mongoose.Types.ObjectId(projectId),
            firebasePath: storagePath,
            uploadedBy: userId || userEmail || "unknown",
          });

          await newFile.save();
          console.log('✅ Fichier sauvegardé avec ID:', newFile._id);

          fileMetadata.push({
            id: (newFile._id as mongoose.Types.ObjectId).toString(),
            name: file.originalname,
            url: downloadURL,
            size: file.size,
          });

          newFileIds.push(newFile._id as mongoose.Types.ObjectId);
        }

      } catch (fileError: any) {
        console.error('❌ Erreur générale lors du traitement du fichier:', {
          fileName: file.originalname,
          error: fileError.message,
          code: fileError.code,
          stack: fileError.stack?.split('\n').slice(0, 3).join('\n')
        });
        
        errors.push(`Error processing ${file.originalname}: ${fileError.message}`);
      }
    }

    // Update project with new files if any were successfully uploaded
    if (newFileIds.length > 0) {
      try {
        console.log('🔄 Mise à jour du projet avec les nouveaux fichiers...');
        const updatedProject = await Project.findByIdAndUpdate(
          projectId,
          { $push: { files: { $each: newFileIds } } },
          { new: true }
        ).populate("files");

        if (updatedProject) {
          console.log('✅ Projet mis à jour. Nombre total de fichiers:', updatedProject.files.length);
        }
      } catch (updateError: any) {
        console.error('❌ Erreur lors de la mise à jour du projet:', updateError);
        errors.push("Failed to update project with new files");
      }
    }

    // Return response based on results
    const successCount = downloadURLs.length;
    const totalCount = files.length;

    console.log(`\n📊 Résumé de l'upload:`, {
      totalFiles: totalCount,
      successfulUploads: successCount,
      errors: errors.length,
      timestamp: new Date().toISOString()
    });

    if (successCount === 0) {
      console.error('❌ Aucun fichier n\'a été uploadé avec succès');
      res.status(400).json({
        error: "No files were uploaded successfully",
        errors: errors,
        success: false,
      });
      return;
    }

    res.status(200).json({
      downloadURLs,
      files: fileMetadata,
      success: true,
      message: `${successCount}/${totalCount} file(s) uploaded successfully`,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('❌ Erreur générale de l\'upload:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      error: "Upload failed",
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get files for a specific project
 */
export const getProjectFiles = async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ error: "Not authorized" });
      return;
    }

    // Extract project ID from params
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    // Find the project with populated files
    const project = await Project.findById(id).populate({
      path: "files",
      select: "name file_url file_size uploadedBy firebasePath uploadedAt fileType",
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Populate uploadedBy if it's an ObjectId
    const files = await Promise.all(
      (project.files || []).map(async (file: any) => {
        if (
          file.uploadedBy &&
          mongoose.Types.ObjectId.isValid(file.uploadedBy)
        ) {
          try {
            const user = await User.findById(file.uploadedBy).select(
              "email name"
            );
            if (user) {
              return {
                ...file.toObject(),
                uploadedByEmail: user.email,
                uploadedBy: user._id,
              };
            }
          } catch (e) {
            console.error(`Error populating user for file ${file._id}:`, e);
          }
        }
        return file;
      })
    );

    res.status(200).json(files);
  } catch (error) {
    console.error("Error retrieving project files:", error);
    res.status(500).json({
      error: "Failed to retrieve project files",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Delete a file
 */
export const deleteFile = async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ error: "Not authorized" });
      return;
    }

    const { fileId, projectId, firebasePath } = req.body;

    if (!fileId) {
      res.status(400).json({ error: "File ID is required" });
      return;
    }

    // Check if this is a temporary ID (starts with "temp-")
    if (fileId.startsWith("temp-")) {
      // For temporary files, just delete from Firebase if path exists
      if (firebasePath) {
        try {
          const storageRef = ref(storage, firebasePath);
          await deleteObject(storageRef);
          console.log(`Temporary file deleted from Firebase: ${firebasePath}`);
        } catch (storageError) {
          console.error("Firebase Storage error:", storageError);
          // Don't fail if Firebase deletion fails for temp files
        }
      }

      res.status(200).json({
        success: true,
        message: "Temporary file deleted successfully",
        deletedFile: {
          id: fileId,
          firebasePath,
        },
      });
      return;
    }

    // Regular MongoDB ObjectID handling
    const fileToDelete = await File.findById(fileId);
    if (!fileToDelete) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Check consistency between provided firebasePath and document
    if (
      firebasePath &&
      fileToDelete.firebasePath !== firebasePath
    ) {
      console.warn("Provided Firebase path doesn't match the one in database");
    }

    // Use the Firebase path from the document if available
    const pathToDelete = fileToDelete.firebasePath || firebasePath;

    // Delete from Firebase Storage
    if (pathToDelete) {
      try {
        const storageRef = ref(storage, pathToDelete);
        await deleteObject(storageRef);
        console.log(`File deleted from Firebase: ${pathToDelete}`);
      } catch (storageError) {
        console.error("Firebase Storage error:", storageError);
        // Don't completely fail if Firebase deletion fails
      }
    }

    // Delete from MongoDB
    const deleteResult = await File.findByIdAndDelete(fileId);
    if (!deleteResult) {
      res.status(404).json({ error: "File already deleted" });
      return;
    }

    // Remove reference from the project
    if (projectId) {
      await Project.findByIdAndUpdate(
        projectId,
        { $pull: { files: new mongoose.Types.ObjectId(fileId) } },
        { new: true }
      );
    } else if (fileToDelete.project) {
      // If projectId is not provided, use the one from the document
      await Project.findByIdAndUpdate(
        fileToDelete.project,
        { $pull: { files: new mongoose.Types.ObjectId(fileId) } },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
      deletedFile: {
        id: fileId,
        name: fileToDelete.name,
        firebasePath: pathToDelete,
      },
    });
  } catch (error) {
    console.error("Error during deletion:", error);
    res.status(500).json({
      error: "Deletion failed",
      details: error instanceof Error ? error.message : String(error),
      stack:
        process.env.NODE_ENV === "development"
          ? error instanceof Error && error.stack
          : undefined,
    });
  }
};

/**
 * Get a single file by ID
 */
export const getFileById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authorized" });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid file ID" });
      return;
    }

    const file = await File.findById(id);

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    res.status(200).json(file);
  } catch (error) {
    console.error("Error retrieving file:", error);
    res.status(500).json({
      error: "Failed to retrieve file",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};