// annotation.ts
import mongoose, { Document, Model, Schema } from "mongoose";
import Viewpoint, { IViewpoint } from "./viewpoint";

export interface IAnnotation extends Document {
  guid: string;
  type: 'cloud' | 'arrow' | 'text';
  title: string;
  description?: string;
  author: string;
  createdAt: Date;
  modifiedAt: Date;
  viewpoint: mongoose.Types.ObjectId | IViewpoint; // Référence au modèle Viewpoint
  position: {
    x: number;
    y: number;
    z: number;
  };
  project: mongoose.Types.ObjectId | string;
}

const AnnotationSchema: Schema<IAnnotation> = new mongoose.Schema({
  guid: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['cloud', 'arrow', 'text'] },
  title: { type: String, required: true },
  description: String,
  author: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
  viewpoint: { 
    type: Schema.Types.ObjectId, 
    ref: 'Viewpoint',
    required: true 
  },
  position: {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    z: { type: Number, required: true, default: 0 }
  },
  project: { 
    type: Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  }
});

// Middleware pour mettre à jour la date de modification
AnnotationSchema.pre<IAnnotation>('save', function(next) {
  this.modifiedAt = new Date();
  next();
});

// Méthode pour créer une annotation avec viewpoint
AnnotationSchema.statics.createAnnotationWithViewpoint = async function(annotationData: Partial<IAnnotation>, viewpointData: Partial<IViewpoint>) {
  const viewpoint = new Viewpoint(viewpointData);
  await viewpoint.save();
  
  return this.create({
    ...annotationData,
    viewpoint: viewpoint._id
  });
};

const Annotation: Model<IAnnotation> = 
  mongoose.models.Annotation || mongoose.model<IAnnotation>("Annotation", AnnotationSchema);

export default Annotation;