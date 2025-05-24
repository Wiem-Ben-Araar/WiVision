import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Annotation, { IAnnotation } from '../models/annotation';
import Viewpoint from '../models/viewpoint';

// Déclaration de type étendue pour Request
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    // Ajouter d'autres propriétés utilisateur si nécessaire
  };
}

// Types de requêtes
interface CreateAnnotationRequest {
  type: 'cloud' | 'arrow' | 'text';
  title: string;
  description?: string;
  position: { x: number; y: number; z: number };
  viewpoint: {
    guid: string; // Ajout du GUID dans le viewpoint
    camera_view_point: { x: number; y: number; z: number };
    camera_direction: { x: number; y: number; z: number };
    camera_up_vector: { x: number; y: number; z: number };
    field_of_view: number;
  };
  projectId: string;
  author: string; // IMPORTANT: Ajouter le champ author dans l'interface
}

interface UpdateAnnotationRequest {
  title?: string;
  description?: string;
  type?: 'cloud' | 'arrow' | 'text';
}

// Helper pour la gestion des erreurs
const handleError = (res: Response, error: unknown, message: string = 'Internal Server Error', status: number = 500) => {
  console.error(message, error);
  return res.status(status).json({ error: message });
};

// GET /api/annotations?projectId=:projectId
export const getAnnotations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.query;
    const annotations = await Annotation.find({ project: projectId })
      .populate('viewpoint')
      .exec();
    res.json(annotations);
  } catch (error) {
    handleError(res, error, 'Error fetching annotations');
  }
};

// POST /api/annotations
export const createAnnotation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as CreateAnnotationRequest;
    const user = req.user;

    console.log('Received annotation data:', body);
    console.log('Author from request:', body.author); // Debug: vérifier l'author reçu

    // Validation des données requises
    if (!body.title || !body.viewpoint || !body.projectId) {
      return res.status(400).json({ 
        error: 'Title, viewpoint, and projectId are required',
        received: {
          title: !!body.title,
          viewpoint: !!body.viewpoint,
          projectId: !!body.projectId
        }
      });
    }

    if (!body.position || typeof body.position.x !== 'number' || typeof body.position.y !== 'number' || typeof body.position.z !== 'number') {
      return res.status(400).json({ 
        error: 'Valid position coordinates (x, y, z) are required',
        received: body.position
      });
    }

    // Déterminer l'auteur - PRIORITÉ à l'author envoyé depuis le frontend
    const authorToUse = body.author || user?.id || 'anonymous';
    console.log('Final author to save:', authorToUse); // Debug: vérifier l'author final

    // Création du viewpoint avec le GUID s'il est fourni
    const viewpoint = new Viewpoint({
      ...body.viewpoint,
      createdBy: authorToUse, // Utiliser le même author pour cohérence
      project: body.projectId
    });
    await viewpoint.save();

    // Création de l'annotation avec GUID généré
    const newAnnotation = new Annotation({
      guid: uuidv4(), // Générer un GUID unique
      title: body.title,
      description: body.description,
      author: authorToUse, // UTILISER L'AUTHOR CORRECT ICI
      type: body.type || 'cloud',
      position: body.position,
      viewpoint: viewpoint._id,
      project: body.projectId
    });

    console.log('Annotation before save:', {
      guid: newAnnotation.guid,
      title: newAnnotation.title,
      author: newAnnotation.author,
      type: newAnnotation.type
    }); // Debug: vérifier les données avant sauvegarde

    await newAnnotation.save();
    
    console.log('Annotation after save:', {
      id: newAnnotation._id,
      author: newAnnotation.author
    }); // Debug: vérifier les données après sauvegarde
    
    // Retourner l'annotation avec le viewpoint populé
    const populatedAnnotation = await Annotation.findById(newAnnotation._id).populate('viewpoint');
    res.status(201).json(populatedAnnotation);
    
  } catch (error) {
    console.error('Error creating annotation:', error);
    handleError(res, error, 'Error creating annotation');
  }
};

// PUT /api/annotations?id=:id
export const updateAnnotation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.query;
    const body = req.body as UpdateAnnotationRequest;

    if (!id) {
      return res.status(400).json({ error: 'Annotation ID is required' });
    }

    const updatedAnnotation = await Annotation.findByIdAndUpdate(
      id as string,
      { $set: body },
      { new: true }
    );

    if (!updatedAnnotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }

    res.json(updatedAnnotation);
  } catch (error) {
    handleError(res, error, 'Error updating annotation');
  }
};

// DELETE /api/annotations?id=:id
export const deleteAllAnnotations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.query;
    
    // Trouver toutes les annotations
    const annotations = await Annotation.find({ project: projectId });
    
    // Récupérer les IDs des viewpoints
    const viewpointIds = annotations.map(a => a.viewpoint);
    
    // Supprimer en cascade
    await Promise.all([
      Annotation.deleteMany({ project: projectId }),
      Viewpoint.deleteMany({ _id: { $in: viewpointIds } })
    ]);
    
    res.status(204).json({ success: true });
  } catch (error) {
    handleError(res, error, 'Error deleting annotations');
  }
};