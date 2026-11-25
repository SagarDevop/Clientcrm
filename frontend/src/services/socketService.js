import { io } from 'socket.io-client';
import { getAuthToken } from './saasApi.js';
import { db } from '../db/database.js';

let socket = null;

export function initSocket() {
  const token = getAuthToken();
  if (!token) return null;

  if (socket && socket.connected) return socket;

  const socketUrl = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? 'https://crm.jugarr.in' : 'http://localhost:5000');

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected to real-time sync server');
  });

  socket.on('client:created', async (data) => {
    if (data.client) {
      const item = { ...data.client };
      delete item._id;
      await db.clients.put(item);
    }
  });

  socket.on('client:updated', async (data) => {
    if (data.client) {
      const item = { ...data.client };
      delete item._id;
      await db.clients.put(item);
    }
  });

  socket.on('client:deleted', async (data) => {
    if (data.id) {
      await db.clients.delete(data.id);
    }
  });

  socket.on('payment:created', async (data) => {
    if (data.payment) {
      const item = { ...data.payment };
      delete item._id;
      await db.payments.put(item);
    }
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
