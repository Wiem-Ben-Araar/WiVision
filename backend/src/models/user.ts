import mongoose, { Document, Model, Schema } from "mongoose";

interface IUser extends Document {
  _id: mongoose.Types.ObjectId; // Déclarer explicitement _id
  name: string;
  email: string;
  password?: string;
  role?: "BIM Manager" | "BIM Coordinateur" | "BIM Modeleur"; 
  annotations: mongoose.Types.ObjectId[];
  image?: string;
  googleId?: string;
  githubId?: string;
}

const UserSchema: Schema<IUser> = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    enum: ["BIM Manager", "BIM Coordinateur", "BIM Modeleur"],
    required: false 
  },
  annotations: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Annotation',
    }],
    required: false,
    default: [] 
  },
  image: {
    type: String,
    required: false
  }
});

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;