import mongoose, { type Document, Schema } from "mongoose"

export interface IFile extends Document {
  name: string
  file_url: string
  file_size: number
  fileType: "IFC" | "BCF" | "PDF" | "other"
  project: mongoose.Types.ObjectId
  supabasePath?: string // ✅ SUPABASE au lieu de firebasePath
  ifcMetadata?: {
    schema: string
    application: string
    creator: string
    timestamp: Date
    coordinates: {
      x: number
      y: number
      z: number
    }
  }
  uploadedAt: Date
  uploadedBy: mongoose.Types.ObjectId | string
}

const FileSchema: Schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  file_url: {
    type: String,
    required: true,
  },
  file_size: Number,
  fileType: {
    type: String,
    enum: ["IFC", "BCF", "PDF", "other"],
    default: "other",
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  supabasePath: String, // ✅ SUPABASE PATH
  ifcMetadata: {
    schema: String,
    application: String,
    creator: String,
    timestamp: Date,
    coordinates: {
      x: Number,
      y: Number,
      z: Number,
    },
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  uploadedBy: {
    type: Schema.Types.Mixed,
    ref: "User",
    required: true,
  },
})

const FileModel = mongoose.model<IFile>("File", FileSchema)
export default FileModel
