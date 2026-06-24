import mongoose from 'mongoose';
import { Chat } from '../models/chat';
import { User } from '../models/user';
import { Message } from '../models/message';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const listChats = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chitchat';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    // Force register schemas
    const _u = User.modelName;
    const _m = Message.modelName;

    const chats = await Chat.find().populate('participants');
    console.log('Chats in DB count:', chats.length);
    for (const chat of chats) {
      console.log('Chat ID:', chat._id);
      console.log('Is Group:', chat.isGroup);
      console.log('Group Name:', chat.groupName);
      console.log('Participants:');
      for (const p of chat.participants as any[]) {
        console.log(`  - ID: ${p._id}, Name: ${p.displayName}, Mobile: ${p.mobileNumber}`);
      }
      console.log('--------------------------------------------------');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error listing chats:', error);
    process.exit(1);
  }
};

listChats();
