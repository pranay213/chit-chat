import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/database';
import { seedDefaultAdmins, seedCountries, seedChatBotUser } from './utils/seeder';
import apiRoutes from './routes';
import { setupSockets } from './sockets';
import logger from './utils/logger';
import { setupSwagger } from './utils/swagger';
import { LoggerMessages } from "./constants/loggerMessages";

// Load environment variables
dotenv.config();
// Connect to Database
connectDB().then(() => {
  seedDefaultAdmins();
  seedCountries();
  seedChatBotUser();
});
const app = express();
const server = http.createServer(app);
// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
setupSockets(io);
app.set('io', io);
// Middleware
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
// Swagger API Docs
setupSwagger(app);
// Routes
app.use('/api/v1', apiRoutes);
// Start server
const PORT = process.env.PORT as string;
server.listen(PORT, () => {
  logger.info(LoggerMessages.SERVER_IS_RUNNING_IN_MODE_ON_PORT(process.env.NODE_ENV, PORT));
});
// Hot reload triggered for new env vars
