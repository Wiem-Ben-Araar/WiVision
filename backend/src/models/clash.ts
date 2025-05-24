import mongoose, { Schema } from 'mongoose';

const elementDataSchema = new Schema({
  id: String,
  modelID: String,
  type: Number,
  typeName: String,
  name: String
});

const clashSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  guid: {
    type: String,
    required: true,
    unique: true
  },
  job: {
    type: Schema.Types.ObjectId,
    ref: 'ClashDetectionJob',
    required: true
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  description: String,
  status: {
    type: String,
    enum: ['open', 'resolved', 'reviewing'],
    default: 'open'
  },
  detectedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: Date,
  elementData: {
    element1: elementDataSchema,
    element2: elementDataSchema
  },
  distance: Number,
  severity: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  category: String,
  resolution: String,
  snapshot: String
});

export default mongoose.models.Clash || mongoose.model('Clash', clashSchema);