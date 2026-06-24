import mongoose, { Document, Schema } from 'mongoose';
export interface IOtp extends Document {
  identifier: string; // email or mobileNumber
  otp: string;
  createdAt: Date;
}
const OtpSchema: Schema = new Schema({
  identifier: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Expires in 5 minutes (300 seconds)
});
export const Otp = mongoose.model<IOtp>('Otp', OtpSchema);
