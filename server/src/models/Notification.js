import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user is required'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    type: {
      type: String,
      enum: [
        'approval_needed',
        'sale_approved',
        'sale_rejected',
        'handover_confirmed',
        'handover_failed',
        'sale_cancelled',
        'auction_won',
        'outbid',
        'general'
      ],
      default: 'general'
    },
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      default: null
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

notificationSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
