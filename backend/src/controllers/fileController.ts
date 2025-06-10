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
    }

    // Use type assertion to tell TypeScript about the user shape
    const user = req.user as { email?: string };

    // Get user email from token
    if (!user.email) {
       res.status(401).json({ error: "User email not found in token" });
    }

    // Extract data from the form
    const projectId = req.body.projectId;
    if (!user.email) {
       res.status(401).json({ error: "Unauthorized" });
    }
    const userEmail = user.email;
    const files = req.files as Express.Multer.File[]; // You'll need to setup multer middleware

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
    }

    if (!projectId) {
      res.status(400).json({ error: "ProjectId is required" });
    }

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ error: `Project with ID ${projectId} not found` });
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

    // Process each file
    for (const file of files) {
      // Check if file is IFC format
      if (!file.originalname.toLowerCase().endsWith(".ifc")) {
        res.status(400).json({ error: "All files must be in IFC format" });
      }

      try {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.originalname}`
          .replace(/[^\w.]/g, "_") // Sanitize filename
          .replace(/\s+/g, "_");
        const storagePath = `projects/${projectId}/${fileName}`;

        try {
          // Create storage reference
          const storageRef = ref(storage, `projects/${projectId}/${fileName}`);

          // Standard metadata for Firebase Storage
          const metadata = {
            contentType: "application/octet-stream",
            customMetadata: {
              firebaseStorageDownloadTokens: uuidv4(),
            },
          };

          const snapshot = await Promise.race([
            uploadBytes(storageRef, file.buffer, metadata),
            new Promise((_, reject) => {
              setTimeout(
                () => reject(new Error("Upload timeout after 60s")),
                60000
              );
            }),
          ]);

          // Get download URL
          const downloadURL = await getDownloadURL(
            (snapshot as import("firebase/storage").UploadResult).ref
          );

          if (downloadURL) {
            downloadURLs.push(downloadURL);

            // Create a new File document in MongoDB
            const newFile = new File({
              name: file.originalname,
              file_url: downloadURL,
              file_size: file.size,
              fileType: file.originalname.toLowerCase().endsWith(".ifc")
                ? "IFC"
                : "other",

              project: new mongoose.Types.ObjectId(projectId),
              firebasePath: storagePath,
              // Use the user ID if found, otherwise store the email as string
              uploadedBy: userId || userEmail || "unknown",
            });

            // Save the file in MongoDB
            await newFile.save();
            console.log("File saved with ID:", newFile._id);

            fileMetadata.push({
              id: (newFile._id as mongoose.Types.ObjectId).toString(),
              name: file.originalname,
              url: downloadURL,
            });

            newFileIds.push(newFile._id);
          } else {
            console.error("Failed to get URL for", file.originalname);
          }
        } catch (firebaseError) {
          console.error(
            `Firebase upload error for ${fileName}:`,
            firebaseError
          );

          // Check for specific Firebase errors
          if (
            typeof firebaseError === "object" &&
            firebaseError !== null &&
            "code" in firebaseError
          ) {
            const code = (firebaseError as { code: string }).code;
            if (code === "storage/unauthorized") {
              res.status(403).json({
                error: "Firebase Storage permission denied",
                details:
                  "Your application doesn't have permission to access Firebase Storage",
              });
            } else if (code === "storage/unknown") {
              // Handle possible connectivity issues
              res.status(500).json({
                error: "Firebase Storage connectivity issue",
                details:
                  "Could not connect to Firebase Storage. Check your project configuration.",
              });
            }
          }

          throw firebaseError; // re-throw if not handled
        }
      } catch (fileError) {
        console.error("Error processing file", file.originalname, fileError);
        res.status(500).json({
          error: "File upload failed",
          details:
            fileError instanceof Error ? fileError.message : String(fileError),
        });
      }
    }

    // Update project with new files
    if (newFileIds.length > 0) {
      try {
        const updatedProject = await Project.findByIdAndUpdate(
          projectId,
          { $push: { files: { $each: newFileIds } } },
          { new: true }
        ).populate("files");

        if (!updatedProject) {
          console.error(
            `Project with ID ${projectId} not found during update.`
          );
        } else {
          console.log(
            "Project update completed. Files in project:",
            updatedProject.files.length
          );
        }
      } catch (updateError) {
        console.error("Error updating project with files:", updateError);
        // Continue since files are already uploaded
      }
    }

    res.status(200).json({
      downloadURLs,
      files: fileMetadata,
      success: downloadURLs.length > 0,
      message: `${downloadURLs.length} file(s) uploaded successfully`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res
      .status(500)
      .json({
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