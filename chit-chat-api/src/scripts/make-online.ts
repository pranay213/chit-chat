import mongoose from 'mongoose';
import { User } from '../models/user';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const makeOnline = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chitchat';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    const mobileNumber = '8125695499';
    const user = await User.findOneAndUpdate(
      { mobileNumber },
      { status: 'online' },
      { new: true }
    );

    if (user) {
      console.log(`Successfully updated user ${mobileNumber} to online:`, user);
    } else {
      console.log(`User with number ${mobileNumber} not found.`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Error updating status:', error);
    process.exit(1);
  }
};

makeOnline();
