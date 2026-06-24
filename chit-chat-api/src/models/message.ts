import mongoose, { Document, Schema, Types } from 'mongoose';
import { MessageAttachmentType } from '../constants/messages';
interface Attachment {
  type: MessageAttachmentType;
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
  createdAt: Date;
  updatedAt: Date;
}
const messageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    attachments: [
      {
        type: { type: String, enum: Object.values(MessageAttachmentType) },
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

messageSchema.index({ chatId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
