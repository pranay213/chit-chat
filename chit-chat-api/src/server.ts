import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './config/database';
import apiRoutes from './routes';
import { setupSockets } from './sockets';
import logger from './utils/logger';
// Load environment variables
dotenv.config();
// Connect to Database
connectDB();
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
// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Routes
app.use('/api/v1', apiRoutes);
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
