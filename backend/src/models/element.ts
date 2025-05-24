// element.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IElement extends Document {
  guid: string;
  ifcId: string;
  name: string;
  type: number;
  typeName: string;
  category: string;
  file: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  properties: Record<string, any>;
  position: { x: number; y: number; z: number };
  dimensions: { x: number; y: number; z: number };
  clashes: mongoose.Types.ObjectId[];
}

const ElementSchema: Schema<IElement> = new mongoose.Schema({
  guid: {
    type: String,
    required: true,
    unique: true
  },
  ifcId: {
    type: String,
    required: true
  },
  name: String,
  type: Number,
  typeName: String,
  category: String,
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  properties: {
    type: Map,
    of: Schema.Types.Mixed
  },
  position: {
    x: Number,
    y: Number,
    z: Number
  },
  dimensions: {
    x: Number,
    y: Number,
    z: Number
  },
  clashes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clash'
  }]
});

// Méthodes statiques
ElementSchema.statics = {
  async findByProject(projectId: string): Promise<IElement[]> {
    return this.find({ project: projectId }).exec();
  },
  
  async findByType(type: number): Promise<IElement[]> {
    return this.find({ type }).exec();
  },
  
  async findByCategory(category: string): Promise<IElement[]> {
    return this.find({ category }).exec();
  }
};

const Element: Model<IElement> = 
  mongoose.models.Element || mongoose.model<IElement>("Element", ElementSchema);

export default Element;