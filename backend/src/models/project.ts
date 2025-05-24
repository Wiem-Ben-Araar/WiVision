// models/project.ts
import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  name: String,
  description: String,
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Mise à jour de la structure des membres
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['Owner', 'Admin', 'Member'], default: 'Member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
}, { timestamps: true });

const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);

export default Project;