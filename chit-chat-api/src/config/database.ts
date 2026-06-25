import mongoose from 'mongoose';
import logger from '../utils/logger';
import { LoggerMessages } from "../constants/loggerMessages";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    logger.info(LoggerMessages.MONGODB_CONNECTED(conn.connection.host));
  } catch (error) {
    logger.error(LoggerMessages.ERROR_CONNECTING_TO_MONGODB(error));
    process.exit(1);
  }
};
