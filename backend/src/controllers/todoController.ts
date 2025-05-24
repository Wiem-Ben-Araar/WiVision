// src/controllers/todocontroller.ts
import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import Todo from '../models/todo';
import Viewpoint from '../models/viewpoint';


// Interface pour les requêtes authentifiées
export interface AuthenticatedRequest extends Request {
    user: {
        userId: string;    // Correspond au champ "userId" du payload
        email: string;
        role: string;
        iat?: number;
        exp?: number;
      };
}

// Helper pour la gestion des erreurs
const handleError = (res: Response, error: unknown, message: string = 'Internal server error', status: number = 500) => {
  console.error(message, error);
  return res.status(status).json({ error: message });
};

// GET /todos?projectId=:projectId
export const getTodos = async (req: AuthenticatedRequest, res: Response) => {
  try {

    
    const { projectId } = req.query;
    const query: Record<string, any> = {};

    if (projectId) {
      query.project = new mongoose.Types.ObjectId(projectId as string);
    }

    const todos = await Todo.find(query)
      .populate({
        path: 'viewpoint',
        model: 'Viewpoint',
        select: '-__v'
      })
      .select('-__v')
      .lean();

    return res.json(todos);

  } catch (error) {
    return handleError(res, error, 'Failed to fetch todos');
  }
};

// POST /todos
// src/controllers/todocontroller.ts (version corrigée)
export const createTodo = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { body } = req;
      const todoData = body;
      let viewpointId: Types.ObjectId | null = null;
  
      // Gestion du viewpoint
      if (body.viewpoint && typeof body.viewpoint === 'object') {
        const requiredViewpointFields = [
          'camera_view_point',
          'camera_direction', 
          'camera_up_vector',
          'field_of_view'
        ];
  
        const isValidViewpoint = requiredViewpointFields.every(field => body.viewpoint[field]);
  
        if (isValidViewpoint) {
          try {
            const viewpointData = {
              ...body.viewpoint,
              guid: body.viewpoint.guid || `vp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              createdBy: new mongoose.Types.ObjectId(req.user.userId),
              project: new mongoose.Types.ObjectId(todoData.project) // Utiliser le projet du Todo
            };
  
            const viewpoint = new Viewpoint(viewpointData);
            const savedViewpoint = await viewpoint.save();
            viewpointId = savedViewpoint._id;
          } catch (viewpointError) {
            console.error('Viewpoint creation failed:', viewpointError);
            return handleError(res, viewpointError, 'Invalid viewpoint data', 400);
          }
        }
      }
  
      // Création du Todo
      const newTodo = new Todo({
        ...todoData,
          status: 'actif',
        viewpoint: viewpointId,
        createdBy: new mongoose.Types.ObjectId(req.user.userId),
        project: new mongoose.Types.ObjectId(todoData.project)
      });
  
      const savedTodo = await newTodo.save();
      
      const populatedTodo = await Todo.findById(savedTodo._id)
        .populate({
          path: 'viewpoint',
          model: 'Viewpoint',
          select: '-__v'
        })
        .select('-__v')
        .lean();
  
      return res.status(201).json(populatedTodo);
  
    } catch (error) {
      return handleError(res, error, 'Failed to create todo');
    }
  };
// PUT /todos/:id
export const updateTodo = async (req: AuthenticatedRequest, res: Response) => {
  try {

    const { id } = req.params;
    const updateData = req.body;
    
    // Vérification ID valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid todo ID' });
    }

    // Mise à jour viewpoint
    let viewpointId: Types.ObjectId | null = null;
    if (updateData.viewpoint) {
      try {
        const existingTodo = await Todo.findById(id).select('viewpoint project'); 
        
        if (existingTodo?.viewpoint) {
          await Viewpoint.findByIdAndUpdate(
            existingTodo.viewpoint,
            updateData.viewpoint,
            { new: true, runValidators: true }
          );
          viewpointId = existingTodo.viewpoint;
        } else {
            const newViewpoint = new Viewpoint({
                ...updateData.viewpoint,
                guid: updateData.viewpoint.guid || `vp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                createdBy: req.user.userId, // Utilisation de userId au lieu de id
                project: existingTodo.project // Ajout du projet depuis le Todo existant
              });
          const savedViewpoint = await newViewpoint.save();
          viewpointId = savedViewpoint._id;
        }
        updateData.viewpoint = viewpointId;
      } catch (viewpointError) {
        console.error('Viewpoint update failed:', viewpointError);
        delete updateData.viewpoint;
      }
    }

    // Mise à jour du Todo
    const updatedTodo = await Todo.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate('viewpoint')
      .select('-__v')
      .lean();

    if (!updatedTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    return res.json(updatedTodo);

  } catch (error) {
    return handleError(res, error, 'Failed to update todo');
  }
};

// DELETE /todos/:id
export const deleteTodo = async (req: AuthenticatedRequest, res: Response) => {
  try {

    
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid todo ID' });
    }

    const todo = await Todo.findById(id).select('viewpoint');
    
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    // Suppression viewpoint associé
    if (todo.viewpoint) {
      await Viewpoint.findByIdAndDelete(todo.viewpoint).catch(error => 
        console.error('Viewpoint deletion failed:', error)
      );
    }

    // Suppression du Todo
    await Todo.deleteOne({ _id: id });

    return res.sendStatus(204);

  } catch (error) {
    return handleError(res, error, 'Failed to delete todo');
  }
};