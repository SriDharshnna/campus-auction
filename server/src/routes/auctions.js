import express from 'express';
import Auction from '../models/Auction.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/auctions
 * @desc    Get all auctions with keyword search, categories, filters and sorting
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      search,
      category,
      condition,
      minPrice,
      maxPrice,
      status = 'active',
      closingSoon,
      seller,
      sort = 'closingSoon'
    } = req.query;

    const query = {};

    // 1. Status filter (default to 'active' unless specified otherwise or 'all')
    if (status && status !== 'all') {
      query.status = status;
    }

    // 2. Category filter
    if (category && category !== 'all') {
      query.category = category.toLowerCase().trim();
    }

    // 3. Condition filter
    if (condition && condition !== 'all') {
      query.condition = condition;
    }

    // 4. Seller filter (e.g. for student dashboard "My Listings")
    if (seller) {
      query.seller = seller;
    }

    // 5. Keyword search across title, description, and seller name
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { sellerName: regex },
        { pickupLocation: regex }
      ];
    }

    // 6. Price range filter
    if (minPrice || maxPrice) {
      query.currentPrice = {};
      if (minPrice && !isNaN(Number(minPrice))) {
        query.currentPrice.$gte = Number(minPrice);
      }
      if (maxPrice && !isNaN(Number(maxPrice))) {
        query.currentPrice.$lte = Number(maxPrice);
      }
    }

    // 7. Closing soon filter (< 1 hour remaining)
    if (closingSoon === 'true' || closingSoon === '1') {
      const now = new Date();
      const oneHourAhead = new Date(Date.now() + 60 * 60 * 1000);
      query.closingAt = { $lte: oneHourAhead, $gt: now };
    }

    // 8. Sorting logic
    let sortOptions = { closingAt: 1 }; // Default: ending soonest
    if (sort === 'priceLow') {
      sortOptions = { currentPrice: 1 };
    } else if (sort === 'priceHigh') {
      sortOptions = { currentPrice: -1 };
    } else if (sort === 'mostBids') {
      sortOptions = { bidsCount: -1 };
    } else if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    }

    const auctions = await Auction.find(query).sort(sortOptions);
    const total = await Auction.countDocuments(query);

    return res.status(200).json({
      auctions,
      total
    });
  } catch (err) {
    console.error('[Auctions GET Error]:', err);
    return res.status(500).json({ message: 'Server error retrieving auctions.' });
  }
});

/**
 * @route   GET /api/auctions/:id
 * @desc    Get single auction details
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id).populate(
      'seller',
      'name email studentId department'
    );

    if (!auction) {
      return res.status(404).json({ message: 'Auction item not found.' });
    }

    return res.status(200).json({ auction });
  } catch (err) {
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Auction item not found.' });
    }
    console.error('[Auction GET by ID Error]:', err);
    return res.status(500).json({ message: 'Server error retrieving auction details.' });
  }
});

/**
 * @route   POST /api/auctions
 * @desc    Create a new auction listing (Protected)
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const {
      title,
      category,
      condition,
      description,
      imageUrl,
      imageUrls,
      startingPrice,
      minIncrement,
      closingAt,
      durationHours,
      pickupLocation
    } = req.body;

    // 1. Mandatory field checks
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Listing title is required.' });
    }
    if (!category) {
      return res.status(400).json({ message: 'Category is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required.' });
    }
    if (!pickupLocation || !pickupLocation.trim()) {
      return res.status(400).json({ message: 'Campus pickup point is required.' });
    }

    // 2. Monetary validations
    const startPriceNum = Number(startingPrice);
    if (isNaN(startPriceNum) || startPriceNum < 1) {
      return res.status(400).json({ message: 'Starting price must be a positive amount (min ₹1).' });
    }

    const minIncNum = Number(minIncrement) || 50;
    if (minIncNum < 10) {
      return res.status(400).json({ message: 'Minimum bid increment must be at least ₹10.' });
    }

    // 3. Closing time calculation & validation
    let resolvedClosingAt;
    if (closingAt) {
      resolvedClosingAt = new Date(closingAt);
    } else if (durationHours) {
      resolvedClosingAt = new Date(Date.now() + Number(durationHours) * 60 * 60 * 1000);
    } else {
      resolvedClosingAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default
    }

    if (isNaN(resolvedClosingAt.getTime())) {
      return res.status(400).json({ message: 'Invalid closing date/time specified.' });
    }

    if (resolvedClosingAt.getTime() <= Date.now() + 60 * 1000) {
      return res.status(400).json({ message: 'Closing time must be at least 1 minute into the future.' });
    }

    // 4. Derive seller identity securely from authenticated JWT
    const newAuction = new Auction({
      title: title.trim(),
      category: category.toLowerCase().trim(),
      condition: condition || 'Good Condition',
      description: description.trim(),
      imageUrl: imageUrl?.trim() || 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80',
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
      startingPrice: startPriceNum,
      minIncrement: minIncNum,
      currentPrice: startPriceNum,
      closingAt: resolvedClosingAt,
      pickupLocation: pickupLocation.trim(),
      seller: req.user._id,
      sellerName: req.user.name,
      sellerDepartment: req.user.department,
      sellerRoll: req.user.studentId
    });

    await newAuction.save();
    await newAuction.populate('seller', 'name email studentId department');

    return res.status(201).json({
      message: 'Auction listing published successfully.',
      auction: newAuction
    });
  } catch (err) {
    console.error('[Auction POST Error]:', err);
    return res.status(500).json({ message: 'Server error creating listing: ' + err.message });
  }
});

/**
 * @route   PUT /api/auctions/:id
 * @desc    Update auction terms before bids exist, or update description/location after bids start (Protected)
 * @access  Private (Seller only)
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found.' });
    }

    // Ownership check
    if (auction.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden. You can only edit your own listings.' });
    }

    if (auction.status !== 'active') {
      return res.status(400).json({ message: `Cannot modify an auction that is ${auction.status}.` });
    }

    const {
      title,
      category,
      condition,
      description,
      imageUrl,
      pickupLocation,
      startingPrice,
      minIncrement,
      closingAt
    } = req.body;

    // Fairness rule: prevent changes to financial terms after bidding starts
    if (auction.bidsCount > 0) {
      if (
        (startingPrice && Number(startingPrice) !== auction.startingPrice) ||
        (minIncrement && Number(minIncrement) !== auction.minIncrement) ||
        (closingAt && new Date(closingAt).getTime() !== auction.closingAt.getTime()) ||
        (title && title.trim() !== auction.title)
      ) {
        return res.status(400).json({
          message: 'Bids have already been placed on this item. Pricing, title, and deadline terms cannot be altered.'
        });
      }
    } else {
      // If zero bids, allow editing terms
      if (title) auction.title = title.trim();
      if (category) auction.category = category.toLowerCase().trim();
      if (condition) auction.condition = condition;
      if (startingPrice && Number(startingPrice) > 0) {
        auction.startingPrice = Number(startingPrice);
        auction.currentPrice = Number(startingPrice);
      }
      if (minIncrement && Number(minIncrement) >= 10) {
        auction.minIncrement = Number(minIncrement);
      }
      if (closingAt) {
        const newClosing = new Date(closingAt);
        if (newClosing.getTime() > Date.now()) {
          auction.closingAt = newClosing;
        }
      }
    }

    // Always allowed updates (safe details)
    if (description) auction.description = description.trim();
    if (pickupLocation) auction.pickupLocation = pickupLocation.trim();
    if (imageUrl) auction.imageUrl = imageUrl.trim();

    await auction.save();
    await auction.populate('seller', 'name email studentId department');

    return res.status(200).json({
      message: 'Auction listing updated successfully.',
      auction
    });
  } catch (err) {
    console.error('[Auction PUT Error]:', err);
    return res.status(500).json({ message: 'Server error updating auction.' });
  }
});

/**
 * @route   DELETE /api/auctions/:id
 * @desc    Cancel auction listing (Soft delete: preserves audit record)
 * @access  Private (Seller only)
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found.' });
    }

    // Ownership check
    if (auction.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden. You can only cancel your own listings.' });
    }

    if (auction.status === 'cancelled') {
      return res.status(400).json({ message: 'Auction is already cancelled.' });
    }

    if (auction.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel an already completed sale.' });
    }

    // Soft delete: mark cancelled without destroying database history
    auction.status = 'cancelled';
    auction.cancellationReason = req.body.reason || 'Cancelled by seller';
    await auction.save();

    return res.status(200).json({
      message: 'Auction cancelled successfully.',
      auction
    });
  } catch (err) {
    console.error('[Auction DELETE Error]:', err);
    return res.status(500).json({ message: 'Server error cancelling auction.' });
  }
});

/**
 * @route   POST /api/auctions/:id/questions
 * @desc    Submit a public question on an auction listing
 * @access  Public / Authenticated
 */
router.post('/:id/questions', async (req, res) => {
  try {
    const { question, askerName } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ message: 'Question text is required.' });
    }

    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ message: 'Auction item not found.' });
    }

    auction.questions.unshift({
      askerName: askerName?.trim() || 'Student',
      question: question.trim()
    });

    await auction.save();

    return res.status(201).json({
      message: 'Question posted successfully.',
      questions: auction.questions,
      auction
    });
  } catch (err) {
    console.error('[Auction Question Error]:', err);
    return res.status(500).json({ message: 'Server error submitting question.' });
  }
});

export default router;
