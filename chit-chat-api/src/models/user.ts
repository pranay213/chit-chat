import mongoose, { Document, Schema, Types } from 'mongoose';
export interface IUser extends Document {
  mobileNumber?: string;
  email?: string;
  password?: string;
  gender?: string;
  username?: string;
  displayName?: string;
  profileImage?: string;
  slogan?: string;
  country?: Types.ObjectId;
  defaultLanguage?: string;
  status: 'online' | 'offline';
  accountStatus: 'active' | 'inactive' | 'blocked';
  lastSeen: Date;
}
const userSchema = new Schema<IUser>(
  {
    mobileNumber: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String },
    gender: { type: String },
    username: { type: String, unique: true, sparse: true, minlength: 3, maxlength: 20 },
    displayName: { type: String },
    profileImage: { type: String },
    slogan: { type: String, maxlength: 60 },
    country: { type: Schema.Types.ObjectId, ref: 'Country' },
    defaultLanguage: { type: String, default: 'en' },
    status: { type: String, enum: ['online', 'offline'], default: 'offline' },
    accountStatus: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
export const User = mongoose.model<IUser>('User', userSchema);
