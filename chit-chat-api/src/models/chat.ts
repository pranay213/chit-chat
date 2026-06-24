import mongoose, { Document, Schema, Types } from 'mongoose';
export interface IChat extends Document {
  isGroup: boolean;
  groupName?: string;
  groupPhoto?: string;
  participants: Types.ObjectId[];
  admins?: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
}
const chatSchema = new Schema<IChat>(
  {
    isGroup: { type: Boolean, default: false },
    groupName: { type: String },
    groupPhoto: { type: String },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true }
);
export const Chat = mongoose.model<IChat>('Chat', chatSchema);
