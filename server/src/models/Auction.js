import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    askerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    askerName: {
      type: String,
      required: true,
      trim: true
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [500, 'Question cannot exceed 500 characters']
    },
    answer: {
      type: String,
      trim: true,
      default: null,
      maxlength: [1000, 'Answer cannot exceed 1000 characters']
    },
    answeredAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const auctionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ['cycles', 'electronics', 'textbooks', 'calculators', 'dorm', 'lab', 'other'],
        message: 'Invalid category: {VALUE}'
      },
      lowercase: true,
      trim: true
    },
    condition: {
      type: String,
      required: [true, 'Item condition is required'],
      enum: ['Like New', 'Excellent', 'Good Condition', 'Fair / Functional'],
      default: 'Good Condition'
    },
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    imageUrl: {
      type: String,
      trim: true,
      default: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80'
    },
    imageUrls: {
      type: [String],
      default: []
    },
    startingPrice: {
      type: Number,
      required: [true, 'Starting price is required'],
      min: [1, 'Starting price must be at least ₹1']
    },
    minIncrement: {
      type: Number,
      required: [true, 'Minimum increment is required'],
      min: [10, 'Minimum increment must be at least ₹10'],
      default: 50
    },
    currentPrice: {
      type: Number,
      required: true,
      min: [1, 'Current price must be at least ₹1'],
      default: function () {
        return this.startingPrice;
      }
    },
    startTime: {
      type: Date,
      default: Date.now
    },
    closingAt: {
      type: Date,
      required: [true, 'Closing date and time is required']
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Seller ID is required']
    },
    sellerName: {
      type: String,
      trim: true
    },
    sellerDepartment: {
      type: String,
      trim: true
    },
    sellerRoll: {
      type: String,
      trim: true
    },
    pickupLocation: {
      type: String,
      required: [true, 'Campus pickup location is required'],
      trim: true,
      maxlength: [200, 'Pickup location cannot exceed 200 characters']
    },
    bidsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['active', 'pending_approval', 'completed', 'cancelled', 'unsold'],
      default: 'active'
    },
    cancellationReason: {
      type: String,
      default: null
    },
    questions: [questionSchema]
  },
  {
    timestamps: true
  }
);

// Indexes for high performance searches and sorting
auctionSchema.index({ title: 'text', description: 'text' });
auctionSchema.index({ status: 1, closingAt: 1 });
auctionSchema.index({ category: 1, status: 1 });
auctionSchema.index({ seller: 1, status: 1 });
auctionSchema.index({ currentPrice: 1 });

// Helper to normalize JSON output
auctionSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

const Auction = mongoose.model('Auction', auctionSchema);
export default Auction;
