import { Request, Response } from 'express';

import mongoose from 'mongoose';
import Project from '../models/project';
import { AuthenticatedRequest } from '../middleware/auth';
import File from '../models/file';
import Invitation from '../models/invitation';

export const createProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Vérifier si l'utilisateur est authentifié (middleware auth déjà appliqué)
    if (!req.user) {
      return res.status(401).json({ error: "Non autorisé" });
    }
    
    // Extraire les données de la requête
    const data = req.body;
    
    // Valider les données
    if (!data.name || data.name.trim() === "") {
      return res.status(400).json({ error: "Le nom du projet est requis" });
    }
    
    // Récupérer l'ID de l'utilisateur
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
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
      members: [{
        userId: userId,
        role: "BIM Manager" // Le créateur devient BIM Manager
      }]
    });
    
    console.log("Projet avant sauvegarde:", project);
    
    // Sauvegarder le projet dans la base de données
    const savedProject = await project.save();
    console.log("Projet sauvegardé:", savedProject);
    
    return res.status(201).json(savedProject);
  } catch (error) {
    // Log détaillé de l'erreur
    console.error("Erreur création projet (détaillée):", error);
    
    // Retourner un message d'erreur plus descriptif
    return res.status(500).json({
      error: "Erreur création projet",
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getProjects = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Non autorisé" });

    const projects = await Project.find({
      $or: [
        { createdBy: req.user.userId },
        { 'members.userId': req.user.userId }
      ]
    })
    .populate('createdBy', 'name email')
    .lean()
    .then(projects => 
      // **FIX: Filtrer les projets corrompus**
      projects.filter(p => 
        p.createdBy && 
        p.members.every(m => m.userId)
      )
    );

    return res.status(200).json(projects);
  } catch (error) {
    console.error("Erreur récupération projets:", error);
    return res.status(500).json({
      error: "Erreur serveur",
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
export const getProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de projet invalide' });
    }

    const project = await Project.findById(id) .populate('createdBy', 'name email'); 

    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    res.json(project);
  } catch (error) {
    handleDBError(res, error);
  }
};

// Supprimer un projet
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de projet invalide' });
    }

    const deletedProject = await Project.findByIdAndDelete(id);

    if (!deletedProject) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    res.json({ message: 'Projet supprimé avec succès' });
  } catch (error) {
    handleDBError(res, error);
  }
};

// Mettre à jour un projet
export const updateProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de projet invalide' });
    }

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Le nom du projet est requis' });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        description: description?.trim() || '',
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    res.json(updatedProject);
  } catch (error) {
    handleDBError(res, error);
  }
};
export const getProjectMembers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    const projectId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: "ID de projet invalide" });
    }

    const project = await Project.findById(projectId)
      .populate('createdBy', 'name email image')
      .populate('members.userId', 'name email image')
      .lean();

    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    const members = [];

    // Ajout du créateur
    if (project.createdBy) {
      const creator = project.createdBy as any;
      members.push({
        id: creator._id.toString(),
        name: creator.name || "BIM Manager",
        email: creator.email || "",
        image: creator.image || "",
        role: "BIM Manager"
      });
    }

    // Ajout des autres membres
    if (project.members) {
      for (const member of project.members) {
        // Vérification renforcée
        if (!member || !member.userId) {
          console.error(`Membre corrompu dans le projet ${projectId}:`, JSON.stringify(member));
          continue;
        }

        const user = member.userId as any;
        
        // Vérification de la structure des données
        if (!user?._id || typeof user !== 'object') {
          console.error(`Structure utilisateur invalide pour le membre:`, JSON.stringify(user));
          continue;
        }

        // Conversion sécurisée de l'ID
        const userId = user?._id?.toString();
        if (!userId) {
          console.error(`ID utilisateur manquant pour le membre:`, JSON.stringify(user));
          continue;
        }

        // Vérification des doublons
        const exists = members.some(m => m.id === userId);
        if (!exists) {
          members.push({
            id: userId,
            name: user.name || "Team Member",
            email: user.email || "",
            image: user.image || "",
            role: member.role || "Member"
          });
        }
      }
    }

    console.log(`Membres trouvés pour le projet ${projectId}: ${members.length}`);
    res.status(200).json({ members });

  } catch (error) {
    console.error("Erreur récupération membres:", error);
    res.status(500).json({
      error: "Erreur récupération membres",
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
export const getUserRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Vérification d'authentification via middleware
    if (!req.user) {
      return res.status(401).json({ 
        error: "Non autorisé",
        details: "Utilisateur non authentifié" 
      });
    }

    // 2. Validation de l'ID du projet
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: "ID de projet invalide",
        details: "Le format de l'ID est incorrect" 
      });
    }

    // 3. Récupération du projet
    const project = await Project.findById(id)
      .populate('createdBy', 'email')
      .populate('members.userId', 'email');

    if (!project) {
      return res.status(404).json({ 
        error: "Projet non trouvé",
        details: "Aucun projet correspondant à cet ID" 
      });
    }

    // 4. Détermination du rôle
    const userEmail = req.user.email;
   let role: 'BIM Manager' | 'BIM Coordinateur' | 'BIM Modeleur' | 'none' = 'none';

    // Vérification du propriétaire
    if (project.createdBy?.email === userEmail) {
      role = 'BIM Manager'; 
    } 
    // Vérification des membres
    else {
      const member = project.members.find(m => 
        (m.userId as any)?.email === userEmail
      );
       if (member) role = member.role as 'BIM Coordinateur' | 'BIM Modeleur';
    }

    // 5. Réponse selon le rôle
    if (role === 'none') {
      return res.status(403).json({ 
        error: "Accès refusé",
        details: "Vous n'avez pas accès à ce projet" 
      });
    }

    res.json({ role });

  } catch (error) {
    handleDBError(res, error, "rôle utilisateur");
  }
};
export const getProjectFiles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Vérification de l'authentification
    if (!req.user) {
      return res.status(401).json({ 
        error: "Non autorisé",
        details: "Utilisateur non authentifié" 
      });
    }

    // 2. Validation de l'ID du projet
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        error: "ID de projet invalide",
        details: "Format d'ID non reconnu" 
      });
    }

    const projectId = new mongoose.Types.ObjectId(id);

    // 3. Vérification de l'existence du projet
    const projectExists = await Project.exists({ _id: projectId });
    if (!projectExists) {
      return res.status(404).json({
        error: "Projet introuvable",
        details: "Ce projet n'existe pas dans la base de données"
      });
    }

    // 4. Récupération des fichiers avec population optimisée
    const files = await File.find({ project: projectId })
      .populate('uploadedBy', 'email') // Population directe
      .sort({ uploadedAt: -1 })
      .lean();

    console.log(`Fichiers récupérés pour le projet ${id}: ${files.length}`);

    // 5. Formatage sécurisé des résultats
    const formattedFiles = files.map(file => ({
      ...file,
      _id: file._id.toString(),
      uploadedBy: (file.uploadedBy as any)?._id?.toString() || 'unknown',
      uploadedByEmail: (file.uploadedBy as any)?.email || 'non spécifié',
      uploadedAt: file.uploadedAt?.toISOString() || new Date().toISOString()
    }));

    res.json(formattedFiles);

  } catch (error) {
    handleDBError(res, error, "récupération des fichiers");
  }
};
export const getProjectInvitations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Vérification d'authentification
    if (!req.user) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    // 2. Validation de l'ID du projet
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de projet invalide" });
    }

    // 3. Vérification de l'existence du projet
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    // 4. Récupération des invitations en attente
    const invitations = await Invitation.find({
      projectId: id,
      status: "pending"
    }).sort({ createdAt: -1 });

    res.status(200).json({ invitations });

  } catch (error) {
    handleDBError(res, error, "récupération des invitations");
  }
};
const handleDBError = (res: Response, error: Error) => {
  console.error('Erreur base de données:', error);
  res.status(500).json({ 
    error: 'Erreur interne du serveur',
    details: error.message 
  });
};
