import mongoose, { Document, Schema } from 'mongoose';

export interface IStatus extends Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image';
  mediaUrl?: string;
  backgroundColor?: string;
  createdAt: Date;
}

const statusSchema = new Schema<IStatus>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'image'], default: 'text' },
    mediaUrl: { type: String },
    backgroundColor: { type: String, default: '#7E57C2' },
    createdAt: { type: Date, default: Date.now, expires: 86400 } // TTL index: auto-deletes after 24 hours (86400 seconds)
  },
  { timestamps: true }
);

export const Status = mongoose.model<IStatus>('Status', statusSchema);
