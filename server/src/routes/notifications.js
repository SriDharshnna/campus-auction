import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for authenticated user
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const query = { user: req.user._id };

    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate('auction', 'title imageUrl status currentPrice')
      .populate('transaction', 'status finalPrice pickupLocation')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });

    return res.status(200).json({
      count: notifications.length,
      unreadCount,
      notifications
    });
  } catch (err) {
    console.error('[Notifications GET Error]:', err);
    return res.status(500).json({ message: 'Server error retrieving notifications.' });
  }
});

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a specific notification as read
 * @access  Private
 */
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true } },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    return res.status(200).json({ notification: notif });
  } catch (err) {
    console.error('[Notification Read Error]:', err);
    return res.status(500).json({ message: 'Server error marking notification read.' });
  }
});

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications for authenticated user as read
 * @access  Private
 */
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({
      message: 'All notifications marked as read.',
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error('[Notification Mark All Read Error]:', err);
    return res.status(500).json({ message: 'Server error marking notifications read.' });
  }
});

export default router;
