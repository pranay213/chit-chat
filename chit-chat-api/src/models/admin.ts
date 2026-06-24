import mongoose, { Document, Schema } from 'mongoose';
import { AdminRole } from '../constants/roles';
export interface IAdmin extends Document {
  email: string;
  passwordHash: string;
  role: string; // Can be predefined AdminRole or custom role name
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const AdminSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: AdminRole.ADMIN },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
