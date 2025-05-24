// viewpoint.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IViewpoint extends Document {
  guid: string;
  camera_view_point: { x: number; y: number; z: number };
  camera_direction: { x: number; y: number; z: number };
  camera_up_vector: { x: number; y: number; z: number };
  field_of_view: number;
  components?: {
    selection: string[];
    visibility?: {
      default_visibility: boolean;
      exceptions: string[];
      view_setup_hints?: {
        spaces_visible: boolean;
        space_boundaries_visible: boolean;
        openings_visible: boolean;
      };
    };
  };
  snapshot?: string;
  project: mongoose.Types.ObjectId | string;
  createdBy?: string; // Changé en string simple
  createdAt: Date;
}

const ViewpointSchema: Schema<IViewpoint> = new mongoose.Schema({
  guid: {
    type: String,
    required: true,
    unique: true
  },
  camera_view_point: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true }
  },
  camera_direction: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true }
  },
  camera_up_vector: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true }
  },
  field_of_view: {
    type: Number,
    required: true
  },
  components: {
    selection: [String],
    visibility: {
      default_visibility: Boolean,
      exceptions: [String],
      view_setup_hints: {
        spaces_visible: Boolean,
        space_boundaries_visible: Boolean,
        openings_visible: Boolean
      }
    }
  },
  snapshot: String,
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  // Changé pour accepter les identifiants au format chaîne de caractères 
  createdBy: {
    type: String, // Changé de ObjectId à String
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Méthodes statiques
ViewpointSchema.statics = {
  async findByProject(projectId: string): Promise<IViewpoint[]> {
    return this.find({ project: projectId }).exec();
  },
    
  async findByCreator(userId: string): Promise<IViewpoint[]> {
    return this.find({ createdBy: userId }).exec();
  }
};

const Viewpoint: Model<IViewpoint> = 
  mongoose.models.Viewpoint || mongoose.model<IViewpoint>("Viewpoint", ViewpointSchema);

export default Viewpoint;