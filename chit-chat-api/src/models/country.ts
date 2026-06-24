import mongoose, { Document, Schema } from 'mongoose';
export interface ICountry extends Document {
  name: string;
  code: string;
  dialCode: string;
  flagUrl?: string;
  isActive: boolean;
}
const countrySchema = new Schema<ICountry>(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true }, // e.g., "IN", "US"
    dialCode: { type: String, required: true }, // e.g., "+91", "+1"
    flagUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
export const Country = mongoose.model<ICountry>('Country', countrySchema);
