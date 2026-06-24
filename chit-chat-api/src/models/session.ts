import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  userId?: mongoose.Types.ObjectId; // Reference to mobile user
  adminId?: mongoose.Types.ObjectId; // Reference to admin user
  userType: 'admin' | 'user';
  token: string;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  adminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
  userType: { type: String, enum: ['admin', 'user'], required: true },
  token: { type: String, required: true },
  userAgent: { type: String },
  ipAddress: { type: String },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

// Create indexes for efficient queries
SessionSchema.index({ userId: 1 });
SessionSchema.index({ adminId: 1 });
SessionSchema.index({ token: 1 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);
