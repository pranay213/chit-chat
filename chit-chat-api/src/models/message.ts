import mongoose, { Document, Schema, Types } from 'mongoose';
interface Attachment {
  type: 'image' | 'video' | 'document' | 'audio';
  url: string;
  name?: string;
  size?: number;
}
export interface IMessage extends Document {
  chatId: Types.ObjectId;
  senderId: Types.ObjectId;
  text?: string;
  attachments?: Attachment[];
  readBy: Types.ObjectId[];
  deliveredTo: Types.ObjectId[];
}
const messageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    attachments: [
      {
        type: { type: String, enum: ['image', 'video', 'document', 'audio'] },
        url: { type: String },
        name: { type: String },
        size: { type: Number },
      },
    ],
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);
export const Message = mongoose.model<IMessage>('Message', messageSchema);
