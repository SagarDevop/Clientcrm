import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/db.js';

let ioInstance = null;

export function initializeSockets(server) {
  const io = new Server(server, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
  });

  // Socket Auth Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    const tenantRoom = `tenant_${user.tenantId || 'org_default'}`;
    const userRoom = `user_${user.userId}`;

    socket.join(tenantRoom);
    socket.join(userRoom);

    console.log(`[Socket.IO] User ${user.email} connected to ${tenantRoom}`);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] User ${user.email} disconnected`);
    });
  });

  ioInstance = io;
  return io;
}

export function emitEvent(tenantId, event, data) {
  if (!ioInstance) return;
  const room = `tenant_${tenantId || 'org_default'}`;
  ioInstance.to(room).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}
