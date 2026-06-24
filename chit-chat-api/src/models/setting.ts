import mongoose, { Document, Schema } from 'mongoose';
export interface ISetting extends Document {
  // SMTP settings
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFromEmail?: string;
  // Fast2SMS settings
  fast2smsApiKey?: string;
  updatedBy?: mongoose.Types.ObjectId; // Reference to Admin
  createdAt: Date;
  updatedAt: Date;
}
const SettingSchema: Schema = new Schema({
  smtpHost: { type: String },
  smtpPort: { type: Number },
  smtpUser: { type: String },
  smtpPass: { type: String },
  smtpFromEmail: { type: String },
  fast2smsApiKey: { type: String },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });
export const Setting = mongoose.model<ISetting>('Setting', SettingSchema);
