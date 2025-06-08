import { Request, Response } from "express";

import mongoose from "mongoose";
import Project from "../models/project";
import File from "../models/file";
import Invitation from "../models/invitation";
import User from "../models/user";

// Fonction utilitaire pour extraire l'ID utilisateur de manière sécurisée
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
    // Vérifier si l'utilisateur est authentifié
    if (!req.user) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    // Extraire les données de la requête
    const data = req.body;

    // Valider les données
    if (!data.name || data.name.trim() === "") {
      return res.status(400).json({ error: "Le nom du projet est requis" });
    }

    // Récupérer l'ID de l'utilisateur de manière sécurisée
    const userIdString = getUserId(req.user);
    const userId = new mongoose.Types.ObjectId(userIdString);

    // Vérifier que l'utilisateur existe réellement dans la base
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      console.error(`Utilisateur avec l'ID ${userId} introuvable dans la base`);
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    console.log(`Création de projet par l'utilisateur: ${existingUser.email} (ID: ${userId})`);

    // Mettre à jour le rôle de l'utilisateur à "BIM Manager"
    await User.findByIdAndUpdate(
      userId,
      { role: "BIM Manager" },
      { new: true }
    );

    // Créer l'objet projet
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

    console.log("Projet avant sauvegarde:", {
      name: project.name,
      createdBy: project.createdBy,
      createdByString: project.createdBy.toString()
    });

    // Sauvegarder le projet dans la base de données
    const savedProject = await project.save();
    console.log("Projet sauvegardé avec succès:", savedProject._id);

    return res.status(201).json(savedProject);
  } catch (error) {
    console.error("Erreur création projet (détaillée):", error);
    return res.status(500).json({
      error: "Erreur création projet",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    const userIdString = getUserId(req.user);
    const userId = new mongoose.Types.ObjectId(userIdString);

    console.log(`Récupération des projets pour l'utilisateur: ${userId}`);

    const projects = await Project.find({
      $or: [
        { createdBy: userId },
        { "members.userId": userId },
      ],
    })
      .populate("createdBy", "name email")
      .lean();

    // Filtrer les projets corrompus
    const validProjects = projects.filter((p) => {
      if (!p.createdBy) {
        console.warn(`Projet ${p._id} a un createdBy manquant`);
        return false;
      }
      if (!p.members.every((m: any) => m.userId)) {
        console.warn(`Projet ${p._id} a des membres corrompus`);
        return false;
      }
      return true;
    });

    console.log(`Projets valides trouvés: ${validProjects.length}/${projects.length}`);

    return res.status(200).json(validProjects);
  } catch (error) {
    console.error("Erreur récupération projets:", error);
    return res.status(500).json({
      error: "Erreur serveur",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de projet invalide" });
    }

    const project = await Project.findById(id).populate(
      "createdBy",
      "name email"
    );

    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    return res.json(project);
  } catch (error) {
    return handleDBError(res, error as Error);
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de projet invalide" });
    }

    const deletedProject = await Project.findByIdAndDelete(id);

    if (!deletedProject) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    return res.json({ message: "Projet supprimé avec succès" });
  } catch (error) {
    return handleDBError(res, error as Error);
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de projet invalide" });
    }

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

    if (!updatedProject) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    return res.json(updatedProject);
  } catch (error) {
    return handleDBError(res, error as Error);
  }
};

export const getProjectMembers = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    const projectId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: "ID de projet invalide" });
    }

    const project = await Project.findById(projectId)
      .populate("createdBy", "name email image")
      .populate("members.userId", "name email image")
      .lean();

    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    // Type assertion to inform TypeScript about the members property
    const typedProject = project as typeof project & { members: any[]; createdBy?: any };

    const members = [];

    // Ajout du créateur
    if (typedProject.createdBy) {
      const creator = typedProject.createdBy;
      members.push({
        id: creator._id.toString(),
        name: creator.name || "BIM Manager",
        email: creator.email || "",
        image: creator.image || "",
        role: "BIM Manager",
      });
    }

    // Ajout des autres membres
    if (typedProject.members) {
      for (const member of typedProject.members) {
        if (!member || !member.userId) {
          console.error(
            `Membre corrompu dans le projet ${projectId}:`,
            JSON.stringify(member)
          );
          continue;
        }

        const user = member.userId as any;

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

        // Vérification des doublons
        const exists = members.some((m) => m.id === userId);
        if (!exists) {
          members.push({
            id: userId,
            name: user.name || "Team Member",
            email: user.email || "",
            image: user.image || "",
            role: member.role || "Member",
          });
        }
      }
    }

    console.log(
      `Membres trouvés pour le projet ${projectId}: ${members.length}`
    );
    return res.status(200).json({ members });
  } catch (error) {
    console.error("Erreur récupération membres:", error);
    return res.status(500).json({
      error: "Erreur récupération membres",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getUserRole = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Non autorisé",
        details: "Utilisateur non authentifié",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "ID de projet invalide",
        details: "Le format de l'ID est incorrect",
      });
    }

    const project = await Project.findById(id)
      .populate("createdBy", "email")
      .populate("members.userId", "email");

    if (!project) {
      return res.status(404).json({
        error: "Projet non trouvé",
        details: "Aucun projet correspondant à cet ID",
      });
    }

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

    if (role === "none") {
      return res.status(403).json({
        error: "Accès refusé",
        details: "Vous n'avez pas accès à ce projet",
      });
    }

    return res.json({ role });
  } catch (error) {
    return handleDBError(res, error as Error);
  }
};

export const getProjectFiles = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Non autorisé",
        details: "Utilisateur non authentifié",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "ID de projet invalide",
        details: "Format d'ID non reconnu",
      });
    }

    const projectId = new mongoose.Types.ObjectId(id);

    const projectExists = await Project.exists({ _id: projectId });
    if (!projectExists) {
      return res.status(404).json({
        error: "Projet introuvable",
        details: "Ce projet n'existe pas dans la base de données",
      });
    }

    const files = await File.find({ project: projectId })
      .populate("uploadedBy", "email")
      .sort({ uploadedAt: -1 })
      .lean();

    console.log(`Fichiers récupérés pour le projet ${id}: ${files.length}`);

    const formattedFiles = files.map((file) => ({
      ...file,
      _id: (file._id as mongoose.Types.ObjectId | string).toString(),
      uploadedBy: (file.uploadedBy as any)?._id?.toString() || "unknown",
      uploadedByEmail: (file.uploadedBy as any)?.email || "non spécifié",
      uploadedAt: file.uploadedAt
        ? new Date(String(file.uploadedAt)).toISOString()
        : new Date().toISOString(),
    }));

    return res.json(formattedFiles);
  } catch (error) {
    return handleDBError(res, error as Error);
  }
};

export const getProjectInvitations = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de projet invalide" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    const invitations = await Invitation.find({
      projectId: id,
      status: "pending",
    }).sort({ createdAt: -1 });

    return res.status(200).json({ invitations });
  } catch (error) {
    return handleDBError(res, error as Error);
  }
};

const handleDBError = (res: Response, error: Error) => {
  console.error("Erreur base de données:", error);
  res.status(500).json({
    error: "Erreur interne du serveur",
    details: error.message,
  });
};