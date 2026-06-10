import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/config';

let socket = null;

/**
 * Connect to the Socket.io server.
 */
export const connectSocket = () => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: true,
  });

  return socket;
};

/**
 * Disconnect and clean up the socket instance.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Get the current socket instance (may be null if not connected).
 */
export const getSocket = () => socket;
