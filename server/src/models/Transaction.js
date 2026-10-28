import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auction',
      required: [true, 'Auction reference is required']
    },
    auctionTitle: {
      type: String,
      required: true,
      trim: true
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller reference is required']
    },
    sellerName: {
      type: String,
      trim: true
    },
    sellerRoll: {
      type: String,
      trim: true
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer reference is required']
    },
    buyerName: {
      type: String,
      trim: true
    },
    buyerRoll: {
      type: String,
      trim: true
    },
    finalPrice: {
      type: Number,
      required: [true, 'Final winning price is required'],
      min: [1, 'Final price must be a positive number']
    },
    pickupLocation: {
      type: String,
      required: [true, 'Campus pickup location is required'],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: [
          'pending_seller_approval', // Awaiting seller to accept/reject provisional winning price
          'approved',                // Seller approved price; item is reserved for buyer for campus pickup
          'completed',               // Handover confirmed; goods and payment exchanged
          'rejected',                // Seller rejected winning price
          'failed_pickup',           // Campus pickup failed (no-show or inspection rejection)
          'cancelled'                // Cancelled prior to handover
        ],
        message: 'Invalid transaction status: {VALUE}'
      },
      default: 'pending_seller_approval',
      index: true
    },
    sellerDecision: {
      decision: {
        type: String,
        enum: ['approved', 'rejected', null],
        default: null
      },
      decidedAt: {
        type: Date,
        default: null
      },
      rejectionReason: {
        type: String,
        trim: true,
        default: null
      }
    },
    handover: {
      confirmedBySeller: {
        type: Boolean,
        default: false
      },
      confirmedByBuyer: {
        type: Boolean,
        default: false
      },
      confirmedAt: {
        type: Date,
        default: null
      },
      confirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      notes: {
        type: String,
        trim: true,
        default: null
      }
    },
    failure: {
      reason: {
        type: String,
        trim: true,
        default: null
      },
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      reportedAt: {
        type: Date,
        default: null
      }
    },
    cancellation: {
      reason: {
        type: String,
        trim: true,
        default: null
      },
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      cancelledAt: {
        type: Date,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast dashboard and user role queries
transactionSchema.index({ seller: 1, status: 1 });
transactionSchema.index({ buyer: 1, status: 1 });
transactionSchema.index({ auction: 1 });

// Helper to normalize JSON output
transactionSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
