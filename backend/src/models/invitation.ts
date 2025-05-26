// models/invitation.ts
import mongoose from 'mongoose';
import { noTrueLogging } from 'sequelize/lib/utils/deprecations';

const InvitationSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
   role: {
    type: String,
    enum: ["BIM Manager", "BIM Coordinateur", "BIM Modeleur"],
    required: false
  },
  invitedBy: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
     role: {
    type: String,
    enum: ["BIM Manager", "BIM Coordinateur", "BIM Modeleur"],
    required: noTrueLogging
  },
    name: {
      type: String,
      required: true
    }
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000) // 30 jours
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userExists: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

const Invitation = mongoose.models.Invitation || mongoose.model('Invitation', InvitationSchema);

export default Invitation;