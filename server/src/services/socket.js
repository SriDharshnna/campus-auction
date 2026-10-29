import { Server } from 'socket.io';

let io = null;

export function initSocket(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
          return callback(null, true);
        }
        return callback(null, true); // Dev-friendly fallback
      },
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    // Client joins room for specific auction live updates
    socket.on('join:auction', (auctionId) => {
      if (auctionId) {
        socket.join(`auction:${auctionId}`);
      }
    });

    socket.on('leave:auction', (auctionId) => {
      if (auctionId) {
        socket.leave(`auction:${auctionId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export const getIo = getIO;

/**
 * Real-time event broadcasters
 */
export function broadcastBidPlaced(auctionId, payload) {
  if (!io) return;
  io.to(`auction:${auctionId}`).emit('auction:bid', payload);
  // Also notify browse/marketplace lists
  io.emit('marketplace:update', {
    auctionId,
    currentPrice: payload.currentPrice,
    bidsCount: payload.bidsCount,
    closingAt: payload.closingAt,
    highestBidderName: payload.highestBidderName,
    highestBidder: payload.highestBidder
  });
}

export function broadcastDeadlineExtended(auctionId, payload) {
  if (!io) return;
  io.to(`auction:${auctionId}`).emit('auction:extended', payload);
  io.emit('marketplace:update', {
    auctionId,
    closingAt: payload.closingAt,
    extended: true
  });
}

export function broadcastAuctionClosed(auctionId, payload) {
  if (!io) return;
  io.to(`auction:${auctionId}`).emit('auction:closed', payload);
  io.emit('marketplace:update', {
    auctionId,
    status: payload.status,
    winningAmount: payload.winningAmount
  });
}

export function broadcastAuctionCancelled(auctionId, payload) {
  if (!io) return;
  io.to(`auction:${auctionId}`).emit('auction:cancelled', payload);
  io.emit('marketplace:update', {
    auctionId,
    status: 'cancelled',
    cancellationReason: payload.cancellationReason
  });
}
