import { Request, Response } from "express";

import mongoose from "mongoose";
import Project from "../models/project";
import File from "../models/file";
import Invitation from "../models/invitation";
import User from "../models/user";


const getUserId = (user: any): string => {
  // Essayer différentes propriétés possibles
  const id = user._id || user.id || user.userId;
  
  if (!id) {
    throw new Error("ID utilisateur introuvable");
  }
  
  // Convertir en string si c'est un ObjectId
  return id.toString();
};

export const createProject = async (req: Request, res: Response) => {
  try {
    // ✅ AJOUTER RETURN
    if (!req.user) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    // Extraire les données de la requête
    const data = req.body;

    // Valider les données - ✅ AJOUTER RETURN
    if (!data.name || data.name.trim() === "") {
      return res.status(400).json({ error: "Le nom du projet est requis" });
    }

    const userIdString = getUserId(req.user);
    const userId = new mongoose.Types.ObjectId(userIdString);

    // **FIX 1: Mettre à jour le rôle de l'utilisateur à "BIM Manager"**
    await User.findByIdAndUpdate(
      userId,
      { role: "BIM Manager" },
      { new: true }
    );

    // Créer l'objet projet avec des valeurs par défaut pour les champs optionnels
    const project = new Project({
      name: data.name.trim(),
      description: data.description ? data.description.trim() : "",
      createdBy: userId,
      members: [
        {
          userId: userId,
          role: "BIM Manager", // Le créateur devient BIM Manager
        },
      ],
    });

    console.log("Projet avant sauvegarde:", project);

    // Sauvegarder le projet dans la base de données
    const savedProject = await project.save();
    console.log("Projet sauvegardé:", savedProject);

    res.status(201).json(savedProject);
  } catch (error) {
    // Log détaillé de l'erreur
    console.error("Erreur création projet (détaillée):", error);

    // Retourner un message d'erreur plus descriptif
    res.status(500).json({
      error: "Erreur création projet",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    // ✅ AJOUTER RETURN
    if (!req.user) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    const projects = await Project.find({
      $or: [
        { createdBy: (req.user as any)._id || (req.user as any).userId },
        { "members.userId": (req.user as any)._id || (req.user as any).userId },
      ],
    })
      .populate("createdBy", "name email")
      .lean()
      .then((projects) =>
        // **FIX: Filtrer les projets corrompus**
        projects.filter(
          (p) => p.createdBy && p.members.every((m: any) => m.userId)
        )
      );

    res.status(200).json(projects);
  } catch (error) {
    console.error("Erreur récupération projets:", error);
    res.status(500).json({
      error: "Erreur serveur",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ AJOUTER RETURN
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de projet invalide" });
    }

    const project = await Project.findById(id).populate(
      "createdBy",
      "name email"
    );

    // ✅ AJOUTER RETURN
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    res.json(project);
  } catch (error) {
    handleDBError(res, error as Error);
  }
};

// Supprimer un projet
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ AJOUTER RETURN
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de projet invalide" });
    }

    const deletedProject = await Project.findByIdAndDelete(id);

    // ✅ AJOUTER RETURN
    if (!deletedProject) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    res.json({ message: "Projet supprimé avec succès" });
  } catch (error) {
    handleDBError(res, error as Error);
  }
};

// Mettre à jour un projet
export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // ✅ AJOUTER RETURN
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de projet invalide" });
    }

    // ✅ AJOUTER RETURN
    if (!name?.trim()) {
      return res.status(400).json({ error: "Le nom du projet est requis" });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description?.trim() || "",
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    // ✅ AJOUTER RETURN
    if (!updatedProject) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    res.json(updatedProject);
  } catch (error) {
    handleDBError(res, error as Error);
  }
};

export const getProjectMembers = async (req: Request, res: Response) => {
  try {
    // ✅ AJOUTER RETURN
    if (!req.user) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    const projectId = req.params.id;

    // ✅ AJOUTER RETURN
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: "ID de projet invalide" });
    }

    const project = await Project.findById(projectId)
      .populate("createdBy", "name email image")
      .populate("members.userId", "name email image")
      .lean();

    // ✅ AJOUTER RETURN
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    const members = [];
    const seenUserIds = new Set<string>(); // Pour éviter les doublons

    // Ajout du créateur en premier
    if (
      project &&
      typeof project === "object" &&
      !Array.isArray(project) &&
      project.createdBy
    ) {
      const creator = project.createdBy as any;
      const creatorId = creator._id.toString();
      
      members.push({
        id: creatorId,
        name: creator.name || "BIM Manager",
        email: creator.email || "",
        image: creator.image || "",
        role: "BIM Manager",
      });
      
      seenUserIds.add(creatorId); // Marquer comme vu
    }

    // Ajout des autres membres (en évitant les doublons)
    if (project && !Array.isArray(project) && project.members) {
      for (const member of project.members) {
        // Vérification renforcée
        if (!member || !member.userId) {
          console.error(
            `Membre corrompu dans le projet ${projectId}:`,
            JSON.stringify(member)
          );
          continue;
        }

        const user = member.userId as any;

        // Vérification de la structure des données
        if (!user?._id || typeof user !== "object") {
          console.error(
            `Structure utilisateur invalide pour le membre:`,
            JSON.stringify(user)
          );
          continue;
        }

        const userId = user._id.toString();

        if (!userId) {
          console.error(
            `ID utilisateur manquant pour le membre:`,
            JSON.stringify(user)
          );
          continue;
        }

        // Vérification des doublons avec Set
        if (!seenUserIds.has(userId)) {
          members.push({
            id: userId,
            name: user.name || "Team Member",
            email: user.email || "",
            image: user.image || "",
            role: member.role || "Member",
          });
          
          seenUserIds.add(userId); // Marquer comme vu
        }
      }
    }

    console.log(
      `Membres uniques trouvés pour le projet ${projectId}: ${members.length}`
    );
    res.status(200).json({ members });
  } catch (error) {
    console.error("Erreur récupération membres:", error);
    res.status(500).json({
      error: "Erreur récupération membres",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getUserRole = async (req: Request, res: Response) => {
  try {
    // 1. Vérification d'authentification via middleware - ✅ AJOUTER RETURN
    if (!req.user) {
      return res.status(401).json({
        error: "Non autorisé",
        details: "Utilisateur non authentifié",
      });
    }

    // 2. Validation de l'ID du projet - ✅ AJOUTER RETURN
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "ID de projet invalide",
        details: "Le format de l'ID est incorrect",
      });
    }

    // 3. Récupération du projet
    const project = await Project.findById(id)
      .populate("createdBy", "email")
      .populate("members.userId", "email");

    // ✅ AJOUTER RETURN
    if (!project) {
      return res.status(404).json({
        error: "Projet non trouvé",
        details: "Aucun projet correspondant à cet ID",
      });
    }

    // 4. Détermination du rôle - ✅ SUPPRIMER LA VÉRIFICATION DUPLIQUÉE
    const userEmail = ((req.user as unknown) as { email: string }).email;
    let role: "BIM Manager" | "BIM Coordinateur" | "BIM Modeleur" | "none" =
      "none";

    // Vérification du propriétaire
    if (project.createdBy?.email === userEmail) {
      role = "BIM Manager";
    }
    // Vérification des membres
    else {
      const member = project.members.find(
        (m: any) => (m.userId as any)?.email === userEmail
      );
      if (member) role = member.role as "BIM Coordinateur" | "BIM Modeleur";
    }

    // 5. Réponse selon le rôle - ✅ AJOUTER RETURN
    if (role === "none") {
      return res.status(403).json({
        error: "Accès refusé",
        details: "Vous n'avez pas accès à ce projet",
      });
    }

    res.json({ role });
  } catch (error) {
    handleDBError(res, error as Error);
  }
};

export const getProjectFiles = async (req: Request, res: Response) => {
  try {
    // 1. Vérification de l'authentification - ✅ AJOUTER RETURN
    if (!req.user) {
      return res.status(401).json({
        error: "Non autorisé",
        details: "Utilisateur non authentifié",
      });
    }

    // 2. Validation de l'ID du projet - ✅ AJOUTER RETURN
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "ID de projet invalide",
        details: "Format d'ID non reconnu",
      });
    }

    const projectId = new mongoose.Types.ObjectId(id);

    // 3. Vérification de l'existence du projet - ✅ AJOUTER RETURN
    const projectExists = await Project.exists({ _id: projectId });
    if (!projectExists) {
      return res.status(404).json({
        error: "Projet introuvable",
        details: "Ce projet n'existe pas dans la base de données",
      });
    }

    // 4. Récupération des fichiers avec population optimisée
    const files = await File.find({ project: projectId })
      .populate("uploadedBy", "email") // Population directe
      .sort({ uploadedAt: -1 })
      .lean();

    console.log(`Fichiers récupérés pour le projet ${id}: ${files.length}`);

    // 5. Formatage sécurisé des résultats
    const formattedFiles = files.map((file) => ({
      ...file,
      _id: (file._id as mongoose.Types.ObjectId | string).toString(),
      uploadedBy: (file.uploadedBy as any)?._id?.toString() || "unknown",
      uploadedByEmail: (file.uploadedBy as any)?.email || "non spécifié",
      uploadedAt: file.uploadedAt
        ? new Date(String(file.uploadedAt)).toISOString()
        : new Date().toISOString(),
    }));

    res.json(formattedFiles);
  } catch (error) {
    handleDBError(res, error as Error);
  }
};

export const getProjectInvitations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Vérification d'authentification - ✅ AJOUTER RETURN
    if (!req.user) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    // 2. Validation de l'ID du projet - ✅ AJOUTER RETURN
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de projet invalide" });
    }

    // 3. Vérification de l'existence du projet - ✅ AJOUTER RETURN
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    // 4. Récupération des invitations en attente
    const invitations = await Invitation.find({
      projectId: id,
      status: "pending",
    }).sort({ createdAt: -1 });

    res.status(200).json({ invitations });
  } catch (error) {
    handleDBError(res, error as Error);
  }
};

const handleDBError = (res: Response, error: Error) => {
  console.error("Erreur base de données:", error);
  res.status(500).json({
    error: "Erreur interne du serveur",
    details: error.message,
  });
};