import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import storage from "../config/firebase";
import File from "../models/file";
import Project from "../models/project";
import User from "../models/user";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload a file or multiple files to a project
 */
export const uploadFiles = async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated (auth middleware should be applied)
    if (!req.user) {
      res.status(401).json({ error: "Not authorized" });
      return;
    }

    // Use type assertion to tell TypeScript about the user shape
    const user = req.user as { email?: string };

    // Get user email from token
    if (!user.email) {
      res.status(401).json({ error: "User email not found in token" });
      return;
    }

    // Extract data from the form
    const projectId = req.body.projectId;
    const userEmail = user.email;
    const files = req.files as Express.Multer.File[];

    console.log(
      "FormData received -> projectId:",
      projectId,
      "files count:",
      files?.length,
      "userEmail:",
      userEmail
    );

    // Validate inputs
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    if (!projectId) {
      res.status(400).json({ error: "ProjectId is required" });
      return;
    }

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ error: `Project with ID ${projectId} not found` });
      return;
    }

    // Try to find the user by email if provided
    let userId = null;
    if (userEmail) {
      const user = await User.findOne({ email: userEmail });
      if (user) {
        userId = user._id;
      }
    }

    const downloadURLs = [];
    const fileMetadata = [];
    const newFileIds = [];
    const errors = [];

    // Process each file
    for (const file of files) {
      // Check if file is IFC format
      if (!file.originalname.toLowerCase().endsWith(".ifc")) {
        errors.push(`File ${file.originalname} is not in IFC format`);
        continue;
      }

      try {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.originalname}`
          .replace(/[^\w.]/g, "_") // Sanitize filename
          .replace(/\s+/g, "_");
        const storagePath = `projects/${projectId}/${fileName}`;

        // Create storage reference
        const storageRef = ref(storage, storagePath);

        // Metadata for Firebase
        const metadata = {
          contentType: "application/octet-stream",
          customMetadata: {
            firebaseStorageDownloadTokens: uuidv4(),
            emulator: process.env.NODE_ENV !== 'production' ? "true" : "false",
          },
        };

        // Upload with timeout
        const snapshot = await Promise.race([
          uploadBytes(storageRef, file.buffer, metadata),
          new Promise<never>((_, reject) => {
            setTimeout(
              () => reject(new Error("Upload timeout after 60s")),
              60000
            );
          }),
        ]);

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        if (downloadURL) {
          downloadURLs.push(downloadURL);

          // Create a new File document in MongoDB
          const newFile = new File({
            name: file.originalname,
            file_url: downloadURL,
            file_size: file.size,
            fileType: "IFC",
            project: new mongoose.Types.ObjectId(projectId),
            firebasePath: storagePath,
            uploadedBy: userId || userEmail || "unknown",
          });

          // Save the file in MongoDB
          await newFile.save();
          console.log("File saved with ID:", newFile._id);

          fileMetadata.push({
            id: (newFile._id as mongoose.Types.ObjectId).toString(),
            name: file.originalname,
            url: downloadURL,
            size: file.size,
          });

          newFileIds.push(newFile._id);
        } else {
          console.error("Failed to get URL for", file.originalname);
          errors.push(`Failed to get download URL for ${file.originalname}`);
        }
      } catch (fileError) {
        console.error("Error processing file", file.originalname, fileError);
        errors.push(`Error processing ${file.originalname}: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
        
        // Handle specific Firebase errors
        if (
          typeof fileError === "object" &&
          fileError !== null &&
          "code" in fileError
        ) {
          const code = (fileError as { code: string }).code;
          if (code === "storage/unauthorized") {
            errors.push("Firebase Storage permission denied");
          } else if (code === "storage/unknown") {
            errors.push("Firebase Storage connectivity issue");
          }
        }
      }
    }

    // Update project with new files if any were successfully uploaded
    if (newFileIds.length > 0) {
      try {
        const updatedProject = await Project.findByIdAndUpdate(
          projectId,
          { $push: { files: { $each: newFileIds } } },
          { new: true }
        ).populate("files");

        if (!updatedProject) {
          console.error(`Project with ID ${projectId} not found during update.`);
        } else {
          console.log(
            "Project update completed. Files in project:",
            updatedProject.files.length
          );
        }
      } catch (updateError) {
        console.error("Error updating project with files:", updateError);
        errors.push("Failed to update project with new files");
      }
    }

    // Return response based on results
    const successCount = downloadURLs.length;
    const totalCount = files.length;

    if (successCount === 0) {
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

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: "Upload failed",
      details: error instanceof Error ? error.message : String(error),
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