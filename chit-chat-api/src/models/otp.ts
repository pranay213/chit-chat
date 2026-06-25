import mongoose, { Document, Schema } from 'mongoose';
export interface IOtp extends Document {
  identifier: string; // email or mobileNumber
  otp: string;
  failedAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
}
const OtpSchema: Schema = new Schema({
  identifier: { type: String, required: true },
  otp: { type: String, required: true },
  failedAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Expires in 5 minutes (300 seconds)
});
export const Otp = mongoose.model<IOtp>('Otp', OtpSchema);
