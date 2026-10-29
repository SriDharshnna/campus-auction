import mongoose from 'mongoose';

/**
 * Mask student identity for public bid history
 * Example: '22ADR142' -> 'Student ***42'
 */
export function maskBidderIdentity(name, rollNumber) {
  if (rollNumber && rollNumber.length >= 2) {
    const suffix = rollNumber.slice(-2);
    return `Student ***${suffix}`;
  }
  if (name && name.length > 2) {
    return `${name.charAt(0)}***${name.slice(-1)}`;
  }
  return 'Student ***';
}

const bidSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: [true, 'Auction reference is required'],
      index: true
    },
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Bidder reference is required'],
      index: true
    },
    // Private audit records (retained for backend verification & dispute resolution)
    bidderName: {
      type: String,
      required: true,
      trim: true
    },
    bidderRoll: {
      type: String,
      trim: true
    },
    // Public sanitized representation (strictly no emails, passwords, or full roll numbers)
    bidderMasked: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Bid amount is required'],
      min: [1, 'Bid amount must be at least ₹1']
    }
  },
  {
    timestamps: true
  }
);

// High performance compound indexes
bidSchema.index({ auction: 1, amount: -1 });
bidSchema.index({ auction: 1, createdAt: -1 });
bidSchema.index({ bidder: 1, createdAt: -1 });

// Sanitize output to never expose private account data to the public
bidSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    delete ret.bidderRoll;
    delete ret.bidder; // Exclude internal user reference from public JSON
    return ret;
  }
});

const Bid = mongoose.model('Bid', bidSchema);
export default Bid;
