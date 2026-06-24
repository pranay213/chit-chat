import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/user';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedUser = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chitchat';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    const mobileNumber = '8125695499';
    const existing = await User.findOne({ mobileNumber });
    if (existing) {
      console.log(`User with number ${mobileNumber} already exists.`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    const newUser = await User.create({
      displayName: 'Pranay Second',
      mobileNumber,
      password: passwordHash,
      status: 'offline',
      accountStatus: 'active'
    });

    console.log('Successfully created user:', newUser);
    process.exit(0);
  } catch (error) {
    console.error('Failed to create user:', error);
    process.exit(1);
  }
};

seedUser();
