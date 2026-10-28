import Notification from '../models/Notification.js';
import { getIo } from './socket.js';

/**
 * Creates a persistent notification for a user and emits a real-time socket event.
 *
 * @param {string|ObjectId} userId Recipient user ID
 * @param {object} payload Notification details
 * @param {string} payload.title
 * @param {string} payload.message
 * @param {string} payload.type
 * @param {string|ObjectId} [payload.auctionId]
 * @param {string|ObjectId} [payload.transactionId]
 * @returns {Promise<Notification>}
 */
export async function createNotification(userId, payload) {
  try {
    const notification = await Notification.create({
      user: userId,
      title: payload.title,
      message: payload.message,
      type: payload.type || 'general',
      auction: payload.auctionId || null,
      transaction: payload.transactionId || null
    });

    // Attempt Socket.IO real-time emission
    try {
      const io = getIo();
      if (io) {
        io.emit(`notification:${userId.toString()}`, notification);
        io.emit('notification:new', {
          userId: userId.toString(),
          notification
        });
      }
    } catch {
      // Socket emission non-fatal
    }

    return notification;
  } catch (err) {
    console.error('[Notification Service Error]:', err.message);
    return null;
  }
}
