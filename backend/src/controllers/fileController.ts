import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import storage from "../config/firebase";
import File from "../models/file";
import Project from "../models/project";
import User from "../models/user";
import { v4 as uuidv4 } from "uuid";

// Fonction utilitaire pour gérer les erreurs de réponse
const handleErrorResponse = (res: Response, status: number, error: string, details?: any) => {
  if (!res.headersSent) {
    res.status(status).json({ error, details });
  } else {
    console.error('Cannot send response, headers already sent:', { status, error, details });
  }
};

export const uploadFiles = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return handleErrorResponse(res, 401, "Not authorized");
    }

    const user = req.user as { email?: string };
    if (!user.email) {
      return handleErrorResponse(res, 401, "User email not found in token");
    }

    const projectId = req.body.projectId;
    if (!projectId) {
      return handleErrorResponse(res, 400, "ProjectId is required");
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return handleErrorResponse(res, 400, "No file provided");
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return handleErrorResponse(res, 404, `Project with ID ${projectId} not found`);
    }

    const userEmail = user.email;
    let userId = null;
    const dbUser = await User.findOne({ email: userEmail });
    if (dbUser) userId = dbUser._id;

    const downloadURLs = [];
    const fileMetadata = [];
    const newFileIds = [];

    for (const file of files) {
      if (!file.originalname.toLowerCase().endsWith(".ifc")) {
        return handleErrorResponse(res, 400, "All files must be in IFC format");
      }

      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.originalname}`
        .replace(/[^\w.]/g, "_")
        .replace(/\s+/g, "_");
      const storagePath = `projects/${projectId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      try {
        // Métadonnées avec token d'accès
        const metadata = {
          contentType: "application/octet-stream",
          customMetadata: {
            firebaseStorageDownloadTokens: uuidv4(),
          },
        };

        // Upload avec gestion de progression et timeout augmenté
        const uploadTask = uploadBytesResumable(storageRef, file.buffer, metadata);
        
        // Attendre la complétion avec timeout de 5 minutes
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            uploadTask.cancel();
            reject(new Error("Upload timeout after 5 minutes"));
          }, 300000); // 5 minutes

          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Upload ${fileName}: ${progress.toFixed(1)}%`);
            },
            (error) => {
              clearTimeout(timeout);
              reject(error);
            },
            async () => {
              clearTimeout(timeout);
              resolve();
            }
          );
        });

        const downloadURL = await getDownloadURL(storageRef);

        const newFile = new File({
          name: file.originalname,
          file_url: downloadURL,
          file_size: file.size,
          fileType: "IFC",
          project: new mongoose.Types.ObjectId(projectId),
          firebasePath: storagePath,
          uploadedBy: userId || userEmail,
        });

        await newFile.save();
        console.log(`File saved: ${fileName} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

        fileMetadata.push({
          id: (newFile._id as mongoose.Types.ObjectId).toString(),
          name: file.originalname,
          url: downloadURL,
        });

        newFileIds.push(newFile._id);
        downloadURLs.push(downloadURL);

      } catch (firebaseError) {
        console.error(`Firebase upload error for ${fileName}:`, firebaseError);
        
        let errorMessage = "File upload failed";
        let statusCode = 500;

        if (firebaseError instanceof Error) {
          if (firebaseError.message.includes("permission") || firebaseError.message.includes("unauthorized")) {
            errorMessage = "Firebase Storage permission denied";
            statusCode = 403;
          } else if (firebaseError.message.includes("quota")) {
            errorMessage = "Firebase Storage quota exceeded";
            statusCode = 507;
          }
        }

        return handleErrorResponse(
          res, 
          statusCode, 
          errorMessage, 
          firebaseError instanceof Error ? firebaseError.message : String(firebaseError)
        );
      }
    }

    // Mise à jour du projet
    await Project.findByIdAndUpdate(
      projectId,
      { $push: { files: { $each: newFileIds } } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: `${files.length} file(s) uploaded successfully`,
      files: fileMetadata
    });

  } catch (error) {
    console.error("Upload error:", error);
    return handleErrorResponse(
      res, 
      500, 
      "Upload failed", 
      error instanceof Error ? error.message : String(error)
    );
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
    }

    // Extract project ID from params
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid project ID" });
    }

    // Find the project with populated files
    const project = await Project.findById(id).populate({
      path: "files",
      select: "name file_url file_size uploadedBy firebasePath uploadedAt",
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
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
    }

    const { fileId, projectId, firebasePath } = req.body;

    if (!fileId) {
      res.status(400).json({ error: "File ID is required" });
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

      // For temporary IDs, we DON'T try to update the project in MongoDB
      // since temp IDs aren't stored in the database
      res.status(200).json({
        success: true,
        message: "Temporary file deleted successfully",
        deletedFile: {
          id: fileId,
          firebasePath,
        },
      });
    }

    // Regular MongoDB ObjectID handling
    const fileToDelete = await File.findById(fileId);
    if (!fileToDelete) {
      res.status(404).json({ error: "File not found" });
    }

    // Check consistency between provided firebasePath and document
    if (
      firebasePath &&
      fileToDelete &&
      fileToDelete.firebasePath !== firebasePath
    ) {
      console.warn("Provided Firebase path doesn't match the one in database");
    }

    // Use the Firebase path from the document if available
    const pathToDelete =
      fileToDelete && fileToDelete.firebasePath
        ? fileToDelete.firebasePath
        : firebasePath;

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
    }

    // Remove reference from the project
    if (projectId) {
      await Project.findByIdAndUpdate(
        projectId,
        { $pull: { files: new mongoose.Types.ObjectId(fileId) } },
        { new: true }
      );
    } else if (fileToDelete && fileToDelete.project) {
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
        name: fileToDelete ? fileToDelete.name : undefined,
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
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid file ID" });
    }

    const file = await File.findById(id);

    if (!file) {
      res.status(404).json({ error: "File not found" });
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