import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: true,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  // console.log('[Socket] Connected to real-time server');
});

socket.on('disconnect', () => {
  // console.log('[Socket] Disconnected from server');
});

export function joinAuctionRoom(auctionId) {
  if (socket.connected) {
    socket.emit('join:auction', auctionId);
  } else {
    socket.once('connect', () => {
      socket.emit('join:auction', auctionId);
    });
  }
}

export function leaveAuctionRoom(auctionId) {
  if (socket.connected) {
    socket.emit('leave:auction', auctionId);
  }
}
