import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import { broadcastAuctionClosed } from './socket.js';

let schedulerInterval = null;

/**
 * Idempotently closes an auction if its deadline has expired.
 * Guaranteed atomic state transition:
 * - If status is not 'active' or closingAt > now, does nothing and returns null.
 * - If bids exist, transitions to 'pending_approval' with highest bid as provisional winner.
 * - If no bids, transitions to 'unsold'.
 *
 * @param {string|ObjectId} auctionId
 * @returns {Promise<Auction|null>} The closed auction or null if already closed / not due
 */
export async function closeAuctionIfDue(auctionId) {
  const now = new Date();

  // 1. Fetch current auction snapshot to determine bid count and highest bidder
  const auction = await Auction.findById(auctionId);
  if (!auction) return null;

  // Strict guard: only active auctions past their deadline can be closed
  if (auction.status !== 'active' || new Date(auction.closingAt).getTime() > now.getTime()) {
    return null;
  }

  let targetStatus = 'unsold';
  let targetWinningAmount = null;
  let targetWinnerId = null;
  let targetWinnerName = null;
  let targetWinnerMasked = null;

  if (auction.bidsCount > 0) {
    targetStatus = 'pending_approval';
    // Find highest valid bid (highest amount, earliest timestamp for tie break)
    const topBid = await Bid.findOne({ auction: auction._id })
      .sort({ amount: -1, createdAt: 1 });

    if (topBid) {
      targetWinningAmount = topBid.amount;
      targetWinnerId = topBid.bidder;
      targetWinnerName = topBid.bidderName;
      targetWinnerMasked = topBid.bidderMasked;
    } else {
      // Fallback to auction currentPrice / highestBidder if bids collection was purged
      targetWinningAmount = auction.currentPrice;
      targetWinnerId = auction.highestBidder;
      targetWinnerMasked = auction.highestBidderMasked;
    }
  }

  // 2. Atomic state transition predicate
  // Matches ONLY if status is still 'active' and closingAt <= now
  // If another thread or worker already closed it, matches 0 documents (idempotent)
  const atomicCondition = {
    _id: auction._id,
    status: 'active',
    closingAt: { $lte: now }
  };

  const updatePayload = {
    $set: {
      status: targetStatus,
      closedAt: now,
      winningAmount: targetWinningAmount,
      provisionalWinner: targetWinnerId,
      provisionalWinnerName: targetWinnerName,
      provisionalWinnerMasked: targetWinnerMasked
    }
  };

  const closedAuction = await Auction.findOneAndUpdate(atomicCondition, updatePayload, { new: true });

  if (closedAuction) {
    console.log(`[Lifecycle] Closed auction "${closedAuction.title}" (${closedAuction._id}) -> Status: ${closedAuction.status}, Winner: ${closedAuction.provisionalWinnerMasked || 'None'}`);

    // Broadcast real-time Socket.IO event to all clients
    broadcastAuctionClosed(closedAuction._id.toString(), {
      auctionId: closedAuction._id.toString(),
      status: closedAuction.status,
      winningAmount: closedAuction.winningAmount,
      provisionalWinnerMasked: closedAuction.provisionalWinnerMasked,
      closedAt: closedAuction.closedAt
    });
  }

  return closedAuction;
}

/**
 * Sweeps the database for all expired active auctions and closes them.
 * Provides instant recovery on server startup or missed cron intervals.
 *
 * @returns {Promise<number>} Number of auctions successfully transitioned
 */
export async function processDueAuctions() {
  const now = new Date();
  try {
    const dueAuctions = await Auction.find({
      status: 'active',
      closingAt: { $lte: now }
    }).select('_id title closingAt bidsCount');

    let closedCount = 0;
    for (const item of dueAuctions) {
      const closed = await closeAuctionIfDue(item._id);
      if (closed) {
        closedCount++;
      }
    }

    return closedCount;
  } catch (err) {
    console.error('[Lifecycle Scheduler Error]:', err);
    return 0;
  }
}

/**
 * Starts the background auction closing scheduler.
 * Immediately executes an initial sweep for crash/restart recovery.
 */
export function startAuctionScheduler(intervalMs = 3000) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  // 1. Immediate boot recovery sweep
  processDueAuctions().then((count) => {
    if (count > 0) {
      console.log(`[Lifecycle Recovery] Boot recovery completed: closed ${count} overdue auctions.`);
    }
  }).catch((err) => {
    console.error('[Lifecycle Recovery] Boot sweep failed:', err);
  });

  // 2. Periodic polling scheduler
  schedulerInterval = setInterval(() => {
    processDueAuctions();
  }, intervalMs);

  console.log(`[Lifecycle] Background auction scheduler active (interval: ${intervalMs}ms).`);
}

/**
 * Stops the background auction closing scheduler.
 */
export function stopAuctionScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
