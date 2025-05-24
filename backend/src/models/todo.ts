

import mongoose, { Document, Schema } from 'mongoose';

export interface ITodo extends Document {
  title: string;
  description?: string;
  status: "actif" | "résolu" | "fermé";
  priority: 'Critical' | 'Normal' | 'Minor' | 'On hold' | 'Undefined' | 'Medium';
  createdBy: string;
  userId?: string;
  assignedTo?: string;
  project: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt?: Date;
  screenshot?: string;
  viewpoint?: mongoose.Types.ObjectId;
}

const TodoSchema: Schema = new Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['actif', 'résolu', 'fermé'], // Statuts en français
    default: 'actif'
  },
  priority: {
    type: String,
    enum: ['Critical', 'Normal', 'Minor', 'On hold', 'Undefined', 'Medium'],
    default: 'Normal'

  },
  createdBy: {
    type: String,
    required: true
  },
  userId: {
    type: String
  },
  assignedTo: {
    type: String
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  },
  screenshot: {
    type: String
  },
  viewpoint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Viewpoint'
  }
});

// Pré-middleware pour mettre à jour "updatedAt" lors des modifications
TodoSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

const Todo = mongoose.models.Todo || mongoose.model<ITodo>('Todo', TodoSchema);

export default Todo;