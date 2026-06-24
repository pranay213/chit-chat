import mongoose, { Document, Schema } from 'mongoose';
export interface ICountry extends Document {
  name: string;
  code: string;
  code3: string;
  dialCode: string;
  flagUrl?: string;
  emoji?: string;
  isActive: boolean;
}
const countrySchema = new Schema<ICountry>(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true, uppercase: true }, // e.g., "IN"
    code3: { type: String, required: true, unique: true, uppercase: true }, // e.g., "IND"
    dialCode: { type: String, required: true }, // e.g., "+91"
    flagUrl: { type: String },
    emoji: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const Country = mongoose.model<ICountry>('Country', countrySchema);
