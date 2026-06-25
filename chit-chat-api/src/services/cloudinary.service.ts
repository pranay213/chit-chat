import { v2 as cloudinary } from 'cloudinary';
import { Setting } from '../models/setting';

export const configureCloudinary = async () => {
  const settings = await Setting.findOne().lean();
  if (settings && settings.cloudinaryCloudName) {
    cloudinary.config({
      cloud_name: settings.cloudinaryCloudName,
      api_key: settings.cloudinaryApiKey,
      api_secret: settings.cloudinaryApiSecret
    });
    return true;
  }
  return false;
};

export const uploadToCloudinary = async (fileBuffer: Buffer, mimetype: string): Promise<string> => {
  const isConfigured = await configureCloudinary();
  if (!isConfigured) throw new Error("Cloudinary not configured");

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else if (result) resolve(result.secure_url);
        else reject(new Error("Unknown upload error"));
      }
    );
    uploadStream.end(fileBuffer);
  });
};
