import mongoose, { Schema, Document } from 'mongoose';

export interface ICallLog extends Document {
  callerId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
  type: 'audio' | 'video';
  status: 'missed' | 'rejected' | 'completed';
  duration: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const CallLogSchema: Schema = new Schema(
  {
    callerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
    },
    type: {
      type: String,
      enum: ['audio', 'video'],
      required: true,
    },
    status: {
      type: String,
      enum: ['missed', 'rejected', 'completed'],
      required: true,
    },
    duration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const CallLog = mongoose.model<ICallLog>('CallLog', CallLogSchema);
