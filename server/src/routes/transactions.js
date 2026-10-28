import express from 'express';
import Transaction from '../models/Transaction.js';
import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import { protect } from '../middleware/auth.js';
import { createNotification } from '../services/notificationService.js';
import { getIo } from '../services/socket.js';

const router = express.Router();

/**
 * @route   GET /api/transactions
 * @desc    Get all transactions for the authenticated user (as seller or buyer)
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { role = 'all', status } = req.query;
    const userId = req.user._id;

    const query = {};

    if (role === 'seller') {
      query.seller = userId;
    } else if (role === 'buyer') {
      query.buyer = userId;
    } else {
      query.$or = [{ seller: userId }, { buyer: userId }];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .populate('auction', 'title category condition imageUrl pickupLocation status currentPrice startingPrice closingAt')
      .populate('seller', 'name email studentId department')
      .populate('buyer', 'name email studentId department')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: transactions.length,
      transactions
    });
  } catch (err) {
    console.error('[Transactions GET Error]:', err);
    return res.status(500).json({ message: 'Server error retrieving transactions.' });
  }
});

/**
 * @route   GET /api/transactions/my-bids
 * @desc    Get all real bids placed by the authenticated user with auction & sale outcome details
 * @access  Private
 */
router.get('/my-bids', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all distinct auctions where current user placed a bid
    const userBids = await Bid.find({ bidder: userId })
      .populate({
        path: 'auction',
        select: 'title category condition imageUrl pickupLocation status currentPrice startingPrice closingAt highestBidder highestBidderMasked provisionalWinner winningAmount'
      })
      .sort({ createdAt: -1 });

    // Group by auction to get user's highest bid per auction
    const auctionMap = new Map();

    for (const b of userBids) {
      if (!b.auction) continue;
      const aucId = b.auction._id.toString();
      if (!auctionMap.has(aucId)) {
        auctionMap.set(aucId, {
          auction: b.auction,
          highestUserBid: b.amount,
          lastBidAt: b.createdAt
        });
      } else {
        const entry = auctionMap.get(aucId);
        if (b.amount > entry.highestUserBid) {
          entry.highestUserBid = b.amount;
        }
      }
    }

    // Look up transactions for these auctions
    const auctionIds = Array.from(auctionMap.keys());
    const transactions = await Transaction.find({ auction: { $in: auctionIds } });
    const txMap = new Map();
    transactions.forEach((tx) => {
      txMap.set(tx.auction.toString(), tx);
    });

    const result = [];
    for (const [aucId, data] of auctionMap.entries()) {
      const a = data.auction;
      const tx = txMap.get(aucId) || null;

      let status = 'active';
      if (a.status === 'active') {
        const isWinning = a.highestBidder?.toString() === userId.toString();
        status = isWinning ? 'winning' : 'outbid';
      } else if (a.status === 'pending_approval') {
        const isWinner = a.provisionalWinner?.toString() === userId.toString();
        status = isWinner ? 'awaiting_approval' : 'lost';
      } else if (a.status === 'completed') {
        const isWinner = a.provisionalWinner?.toString() === userId.toString() || tx?.buyer?.toString() === userId.toString();
        status = isWinner ? 'won' : 'lost';
      } else {
        // unsold or cancelled
        status = 'closed';
      }

      result.push({
        id: `bid-agg-${aucId}`,
        auctionId: aucId,
        title: a.title,
        category: a.category,
        imageUrl: a.imageUrl,
        pickupLocation: a.pickupLocation,
        closingAt: a.closingAt,
        myBidAmount: data.highestUserBid,
        currentLeadingPrice: a.currentPrice,
        auctionStatus: a.status,
        status, // 'winning' | 'outbid' | 'awaiting_approval' | 'won' | 'lost' | 'closed'
        transaction: tx
      });
    }

    return res.status(200).json({ bids: result });
  } catch (err) {
    console.error('[My Bids GET Error]:', err);
    return res.status(500).json({ message: 'Server error retrieving user bids.' });
  }
});

/**
 * @route   GET /api/transactions/:id
 * @desc    Get single transaction details
 * @access  Private (Participant only)
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id)
      .populate('auction')
      .populate('seller', 'name email studentId department')
      .populate('buyer', 'name email studentId department');

    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    // Access guard: only seller or buyer can view transaction details
    const isSeller = tx.seller._id.toString() === req.user._id.toString();
    const isBuyer = tx.buyer._id.toString() === req.user._id.toString();
    if (!isSeller && !isBuyer) {
      return res.status(403).json({ message: 'Forbidden. You are not a participant in this transaction.' });
    }

    return res.status(200).json({ transaction: tx });
  } catch (err) {
    console.error('[Transaction GET by ID Error]:', err);
    return res.status(500).json({ message: 'Server error retrieving transaction.' });
  }
});

/**
 * @route   POST /api/transactions/:id/approve
 * @desc    Seller approves the provisional winning price (reserves item for buyer)
 * @access  Private (Listing Seller only)
 */
router.post('/:id/approve', protect, async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);

    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    // Authorization rule: Only the listing's authenticated seller can approve
    if (tx.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden. Only the listing seller can approve the winning price.' });
    }

    // State validation & duplicate/contradictory transition guard
    if (tx.status === 'approved') {
      return res.status(400).json({ message: 'This sale has already been approved and reserved.' });
    }
    if (tx.status === 'completed') {
      return res.status(400).json({ message: 'This sale is already completed.' });
    }
    if (tx.status !== 'pending_seller_approval') {
      return res.status(400).json({ message: `Cannot approve a transaction that is currently ${tx.status}.` });
    }

    const now = new Date();

    // Atomic update
    const updatedTx = await Transaction.findOneAndUpdate(
      { _id: tx._id, seller: req.user._id, status: 'pending_seller_approval' },
      {
        $set: {
          status: 'approved',
          'sellerDecision.decision': 'approved',
          'sellerDecision.decidedAt': now
        }
      },
      { new: true }
    )
      .populate('auction')
      .populate('seller', 'name email studentId department')
      .populate('buyer', 'name email studentId department');

    if (!updatedTx) {
      return res.status(409).json({ message: 'Transaction state conflict. Please refresh and try again.' });
    }

    // Notify buyer that their winning price was approved and item is reserved
    await createNotification(tx.buyer, {
      title: 'Winning Bid Approved!',
      message: `The seller approved your winning bid of ₹${tx.finalPrice.toLocaleString('en-IN')} for "${tx.auctionTitle}". The item is reserved for you. Please coordinate campus pickup at ${tx.pickupLocation}.`,
      type: 'sale_approved',
      auctionId: tx.auction,
      transactionId: tx._id
    });

    // Notify seller confirmation
    await createNotification(tx.seller, {
      title: 'Sale Approved & Reserved',
      message: `You approved the sale of "${tx.auctionTitle}" for ₹${tx.finalPrice.toLocaleString('en-IN')}. The item is reserved for buyer ${updatedTx.buyer?.name}.`,
      type: 'sale_approved',
      auctionId: tx.auction,
      transactionId: tx._id
    });

    try {
      const io = getIo();
      if (io) {
        io.emit('transaction:updated', { transactionId: tx._id.toString(), status: 'approved' });
      }
    } catch {}

    return res.status(200).json({
      message: 'Winning bid approved. Item is now reserved for campus handover.',
      transaction: updatedTx
    });
  } catch (err) {
    console.error('[Transaction Approve Error]:', err);
    return res.status(500).json({ message: 'Server error approving transaction: ' + err.message });
  }
});

/**
 * @route   POST /api/transactions/:id/reject
 * @desc    Seller rejects the provisional winning price (marks auction as unsold)
 * @access  Private (Listing Seller only)
 */
router.post('/:id/reject', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const tx = await Transaction.findById(req.params.id);

    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    // Authorization rule: Only the listing's authenticated seller can reject
    if (tx.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden. Only the listing seller can reject the winning price.' });
    }

    // State validation & duplicate/contradictory transition guard
    if (tx.status === 'rejected') {
      return res.status(400).json({ message: 'This sale has already been rejected.' });
    }
    if (tx.status === 'completed') {
      return res.status(400).json({ message: 'Cannot reject a completed sale.' });
    }
    if (tx.status !== 'pending_seller_approval') {
      return res.status(400).json({ message: `Cannot reject a transaction that is currently ${tx.status}.` });
    }

    const now = new Date();
    const rejectionReason = reason?.trim() || 'Seller declined the provisional winning bid amount';

    // Atomic update
    const updatedTx = await Transaction.findOneAndUpdate(
      { _id: tx._id, seller: req.user._id, status: 'pending_seller_approval' },
      {
        $set: {
          status: 'rejected',
          'sellerDecision.decision': 'rejected',
          'sellerDecision.decidedAt': now,
          'sellerDecision.rejectionReason': rejectionReason
        }
      },
      { new: true }
    )
      .populate('auction')
      .populate('seller', 'name email studentId department')
      .populate('buyer', 'name email studentId department');

    if (!updatedTx) {
      return res.status(409).json({ message: 'Transaction state conflict. Please refresh and try again.' });
    }

    // Explicit outcome: auction moves to 'unsold'
    await Auction.findByIdAndUpdate(tx.auction, { status: 'unsold' });

    // Notify buyer
    await createNotification(tx.buyer, {
      title: 'Winning Bid Declined',
      message: `The seller declined the provisional winning bid for "${tx.auctionTitle}". Reason: ${rejectionReason}`,
      type: 'sale_rejected',
      auctionId: tx.auction,
      transactionId: tx._id
    });

    try {
      const io = getIo();
      if (io) {
        io.emit('transaction:updated', { transactionId: tx._id.toString(), status: 'rejected' });
      }
    } catch {}

    return res.status(200).json({
      message: 'Winning bid rejected. Auction outcome recorded as unsold.',
      transaction: updatedTx
    });
  } catch (err) {
    console.error('[Transaction Reject Error]:', err);
    return res.status(500).json({ message: 'Server error rejecting transaction: ' + err.message });
  }
});

/**
 * @route   POST /api/transactions/:id/handover
 * @desc    Record confirmed campus handover of item and payment
 * @access  Private (Authorized participants only: Seller or Buyer)
 */
router.post('/:id/handover', protect, async (req, res) => {
  try {
    const { notes } = req.body;
    const tx = await Transaction.findById(req.params.id);

    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const isSeller = tx.seller.toString() === req.user._id.toString();
    const isBuyer = tx.buyer.toString() === req.user._id.toString();

    // Authorization rule: Only seller or buyer can confirm handover
    if (!isSeller && !isBuyer) {
      return res.status(403).json({ message: 'Forbidden. Only authorized participants can record handover actions.' });
    }

    // State validation: Handover can ONLY be confirmed after seller approval (status: 'approved')
    if (tx.status === 'completed') {
      return res.status(400).json({ message: 'Campus handover has already been confirmed.' });
    }
    if (tx.status === 'pending_seller_approval') {
      return res.status(400).json({ message: 'Cannot confirm handover before seller approves the winning price.' });
    }
    if (tx.status !== 'approved') {
      return res.status(400).json({ message: `Cannot confirm handover on a transaction that is ${tx.status}.` });
    }

    const now = new Date();

    // Atomic update
    const updatedTx = await Transaction.findOneAndUpdate(
      { _id: tx._id, status: 'approved' },
      {
        $set: {
          status: 'completed',
          'handover.confirmedAt': now,
          'handover.confirmedBy': req.user._id,
          'handover.confirmedBySeller': isSeller || tx.handover.confirmedBySeller,
          'handover.confirmedByBuyer': isBuyer || tx.handover.confirmedByBuyer,
          'handover.notes': notes?.trim() || 'Campus handover successfully completed at designated pickup location'
        }
      },
      { new: true }
    )
      .populate('auction')
      .populate('seller', 'name email studentId department')
      .populate('buyer', 'name email studentId department');

    if (!updatedTx) {
      return res.status(409).json({ message: 'Transaction state conflict. Please refresh and try again.' });
    }

    // Update auction status to completed
    await Auction.findByIdAndUpdate(tx.auction, { status: 'completed' });

    // Notify the other party
    const otherUserId = isSeller ? tx.buyer : tx.seller;
    const actorRole = isSeller ? 'Seller' : 'Buyer';
    await createNotification(otherUserId, {
      title: 'Campus Handover Confirmed!',
      message: `${actorRole} (${req.user.name}) confirmed the handover of "${tx.auctionTitle}". The sale is now fully completed.`,
      type: 'handover_confirmed',
      auctionId: tx.auction,
      transactionId: tx._id
    });

    try {
      const io = getIo();
      if (io) {
        io.emit('transaction:updated', { transactionId: tx._id.toString(), status: 'completed' });
      }
    } catch {}

    return res.status(200).json({
      message: 'Campus handover confirmed successfully. Transaction completed.',
      transaction: updatedTx
    });
  } catch (err) {
    console.error('[Transaction Handover Error]:', err);
    return res.status(500).json({ message: 'Server error confirming handover: ' + err.message });
  }
});

/**
 * @route   POST /api/transactions/:id/fail-pickup
 * @desc    Record failed campus meetup or inspection rejection
 * @access  Private (Authorized participants only: Seller or Buyer)
 */
router.post('/:id/fail-pickup', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const tx = await Transaction.findById(req.params.id);

    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const isSeller = tx.seller.toString() === req.user._id.toString();
    const isBuyer = tx.buyer.toString() === req.user._id.toString();

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ message: 'Forbidden. Only authorized participants can record failed pickup.' });
    }

    // Can only fail pickup on an approved, reserved item
    if (tx.status !== 'approved') {
      return res.status(400).json({ message: `Cannot report failed pickup on a transaction that is ${tx.status}.` });
    }

    const now = new Date();
    const failureReason = reason?.trim() || 'Campus handover could not be completed as scheduled';

    // Atomic update
    const updatedTx = await Transaction.findOneAndUpdate(
      { _id: tx._id, status: 'approved' },
      {
        $set: {
          status: 'failed_pickup',
          'failure.reason': failureReason,
          'failure.reportedBy': req.user._id,
          'failure.reportedAt': now
        }
      },
      { new: true }
    )
      .populate('auction')
      .populate('seller', 'name email studentId department')
      .populate('buyer', 'name email studentId department');

    if (!updatedTx) {
      return res.status(409).json({ message: 'Transaction state conflict. Please refresh and try again.' });
    }

    // Auction outcome explicitly set to unsold
    await Auction.findByIdAndUpdate(tx.auction, { status: 'unsold' });

    // Notify other party
    const otherUserId = isSeller ? tx.buyer : tx.seller;
    await createNotification(otherUserId, {
      title: 'Campus Handover Failed',
      message: `Failed pickup was recorded for "${tx.auctionTitle}". Reason: ${failureReason}`,
      type: 'handover_failed',
      auctionId: tx.auction,
      transactionId: tx._id
    });

    try {
      const io = getIo();
      if (io) {
        io.emit('transaction:updated', { transactionId: tx._id.toString(), status: 'failed_pickup' });
      }
    } catch {}

    return res.status(200).json({
      message: 'Failed pickup recorded. Item marked as unsold.',
      transaction: updatedTx
    });
  } catch (err) {
    console.error('[Transaction Fail Pickup Error]:', err);
    return res.status(500).json({ message: 'Server error recording failed pickup: ' + err.message });
  }
});

/**
 * @route   POST /api/transactions/:id/cancel
 * @desc    Record transaction cancellation prior to completion
 * @access  Private (Authorized participants only: Seller or Buyer)
 */
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const tx = await Transaction.findById(req.params.id);

    if (!tx) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const isSeller = tx.seller.toString() === req.user._id.toString();
    const isBuyer = tx.buyer.toString() === req.user._id.toString();

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ message: 'Forbidden. Only authorized participants can cancel a transaction.' });
    }

    if (tx.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed transaction.' });
    }
    if (tx.status === 'cancelled') {
      return res.status(400).json({ message: 'This transaction is already cancelled.' });
    }
    if (!['pending_seller_approval', 'approved'].includes(tx.status)) {
      return res.status(400).json({ message: `Cannot cancel a transaction in ${tx.status} status.` });
    }

    const now = new Date();
    const cancelReason = reason?.trim() || 'Cancelled by participant';

    // Atomic update
    const updatedTx = await Transaction.findOneAndUpdate(
      { _id: tx._id, status: { $in: ['pending_seller_approval', 'approved'] } },
      {
        $set: {
          status: 'cancelled',
          'cancellation.reason': cancelReason,
          'cancellation.cancelledBy': req.user._id,
          'cancellation.cancelledAt': now
        }
      },
      { new: true }
    )
      .populate('auction')
      .populate('seller', 'name email studentId department')
      .populate('buyer', 'name email studentId department');

    if (!updatedTx) {
      return res.status(409).json({ message: 'Transaction state conflict. Please refresh and try again.' });
    }

    await Auction.findByIdAndUpdate(tx.auction, { status: 'cancelled' });

    // Notify other party
    const otherUserId = isSeller ? tx.buyer : tx.seller;
    await createNotification(otherUserId, {
      title: 'Sale Cancelled',
      message: `The transaction for "${tx.auctionTitle}" was cancelled. Reason: ${cancelReason}`,
      type: 'sale_cancelled',
      auctionId: tx.auction,
      transactionId: tx._id
    });

    try {
      const io = getIo();
      if (io) {
        io.emit('transaction:updated', { transactionId: tx._id.toString(), status: 'cancelled' });
      }
    } catch {}

    return res.status(200).json({
      message: 'Transaction cancelled successfully.',
      transaction: updatedTx
    });
  } catch (err) {
    console.error('[Transaction Cancel Error]:', err);
    return res.status(500).json({ message: 'Server error cancelling transaction: ' + err.message });
  }
});

export default router;
