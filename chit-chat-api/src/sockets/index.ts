import { Server, Socket } from 'socket.io';
export const setupSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
    socket.on('chatMessage', (msg) => {
      console.log(`Message from ${socket.id}: ${msg}`);
      // Broadcast to everyone else
      socket.broadcast.emit('chatMessage', msg);
    });
  });
};
