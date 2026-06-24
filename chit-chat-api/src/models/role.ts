import mongoose, { Document, Schema } from 'mongoose';
import { PermissionAction } from '../constants/permissions';

export interface IPermission {
  module: string; // e.g., 'chats', 'settings', 'admins', 'logs'
  actions: PermissionAction[];
}

export interface IRole extends Document {
  name: string; // Name of the custom role, e.g., 'Manager'
  permissions: IPermission[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema({
  module: { type: String, required: true },
  actions: [{ type: String, enum: Object.values(PermissionAction) }]
}, { _id: false });

const RoleSchema = new Schema<IRole>({
  name: { type: String, required: true, unique: true },
  permissions: [PermissionSchema],
  description: { type: String }
}, { timestamps: true });

export const Role = mongoose.model<IRole>('Role', RoleSchema);
