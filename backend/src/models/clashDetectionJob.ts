import mongoose, { Schema } from 'mongoose';

const clashDetectionJobSchema = new Schema({
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  files: [{
    type: Schema.Types.ObjectId,
    ref: 'File'
  }],
  parameters: {
    tolerance: {
      type: Number,
      default: 0.05
    },
    types: [Number],
    limitResults: {
      type: Number,
      default: 100
    },
    automaticGrouping: {
      type: Boolean,
      default: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  progress: {
    type: Number,
    default: 0
  },
  totalElementsAnalyzed: {
    type: Number,
    default: 0
  },
  results: {
    totalClashes: {
      type: Number,
      default: 0
    },
    resolvedClashes: {
      type: Number,
      default: 0
    }
  },
  startedAt: Date,
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
});

export default mongoose.models.ClashDetectionJob || 
  mongoose.model('ClashDetectionJob', clashDetectionJobSchema);