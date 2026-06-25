import mongoose, { Document, Schema } from 'mongoose';
export interface ISetting extends Document {
  // SMTP settings
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFromEmail?: string;
  // SMS Gateway settings
  smsGatewayApiKey?: string;
  // Cloudinary settings
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
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
  smsGatewayApiKey: { type: String },
  cloudinaryCloudName: { type: String },
  cloudinaryApiKey: { type: String },
  cloudinaryApiSecret: { type: String },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });
export const Setting = mongoose.model<ISetting>('Setting', SettingSchema);
