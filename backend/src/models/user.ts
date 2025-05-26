// models/user.ts
import mongoose, { Document, Model, Schema } from "mongoose";

interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role?: "BIM Manager" | "BIM Coordinateur" | "BIM Modeleur"; 
  annotations: mongoose.Types.ObjectId[];
  image?: string; // Ajout optionnel pour les providers OAuth
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
  default: undefined 
},
  image: {
    type: String,
    required: false
  }
});

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;