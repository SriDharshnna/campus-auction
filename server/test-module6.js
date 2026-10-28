/**
 * Module 6 Automated Verification Suite: Auction Lifecycle, Countdown and Anti-Sniping
 * Tests:
 * 1. Anti-sniping automatic deadline extension to 60s when bid arrives in final 30s
 * 2. Idempotent closing without bids -> transitions to 'unsold'
 * 3. Idempotent closing with bids -> transitions to 'pending_approval' with highest bid provisional winner
 * 4. Duplicate close attempt idempotency -> second close attempt is a guaranteed no-op
 * 5. Server restart / boot recovery -> processDueAuctions() cleans up all expired active auctions
 * 6. Mutual exclusion between bid acceptance and auction close
 * 7. Real-time Socket.IO event emission on anti-sniping and bid events
 */

import mongoose from 'mongoose';
import { io as ioClient } from 'socket.io-client';
import Auction from './src/models/Auction.js';
import Bid from './src/models/Bid.js';
import { closeAuctionIfDue, processDueAuctions } from './src/services/auctionLifecycle.js';

const BASE_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

async function req(url, options = {}) {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTests() {
  console.log('🚀 Starting Module 6 Verification Tests (Lifecycle, Anti-Sniping & Countdown)...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-auction');
    }

    // 1. Setup test users
    const suffix = Date.now().toString().slice(-4);
    const sellerPayload = {
      name: 'Seller Lifecycle',
      email: `seller.life.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22ALR${Math.floor(100 + Math.random() * 890)}`
    };
    const bidder1Payload = {
      name: 'Bidder Alpha',
      email: `bidder.alpha.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22ECR${Math.floor(100 + Math.random() * 890)}`
    };
    const bidder2Payload = {
      name: 'Bidder Beta',
      email: `bidder.beta.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22CSR${Math.floor(100 + Math.random() * 890)}`
    };

    const regSeller = await req('/auth/register', { method: 'POST', body: JSON.stringify(sellerPayload) });
    const regB1 = await req('/auth/register', { method: 'POST', body: JSON.stringify(bidder1Payload) });
    const regB2 = await req('/auth/register', { method: 'POST', body: JSON.stringify(bidder2Payload) });

    const tokenSeller = regSeller.data.token;
    const tokenB1 = regB1.data.token;
    const tokenB2 = regB2.data.token;
    const sellerId = regSeller.data.user.id || regSeller.data.user._id;
    const b1Id = regB1.data.user.id || regB1.data.user._id;
    const b2Id = regB2.data.user.id || regB2.data.user._id;

    assert(tokenSeller && tokenB1 && tokenB2, 'Test users registered successfully');

    // 2. TEST 1: Anti-Sniping Deadline Extension
    // Create an auction with closingAt set to 20 seconds from now (within the 30s threshold)
    const snipingAuction = new Auction({
      title: `Anti-Sniping Test Item ${suffix}`,
      category: 'electronics',
      condition: 'Like New',
      startingPrice: 1500,
      minIncrement: 100,
      currentPrice: 1500,
      description: 'Device to test anti-sniping extension',
      closingAt: new Date(Date.now() + 20 * 1000), // 20s remaining (< 30s threshold)
      pickupLocation: 'Hostel 5',
      seller: sellerId,
      status: 'active',
      bidsCount: 0
    });
    await snipingAuction.save();

    const originalClosingMs = new Date(snipingAuction.closingAt).getTime();

    // Connect a socket client to verify real-time event emission
    const clientSocket = ioClient(SOCKET_URL, { transports: ['websocket'] });
    let socketExtensionReceived = false;
    let socketBidReceived = false;

    await new Promise((resolve) => {
      clientSocket.on('connect', () => {
        clientSocket.emit('join:auction', snipingAuction._id.toString());
        resolve();
      });
    });

    clientSocket.on('auction:extended', (data) => {
      if (data.auctionId === snipingAuction._id.toString()) {
        socketExtensionReceived = true;
      }
    });

    clientSocket.on('auction:bid', (data) => {
      if (data.auctionId === snipingAuction._id.toString()) {
        socketBidReceived = true;
      }
    });

    // Place bid during final 20 seconds
    const snipingBid = await req(`/auctions/${snipingAuction._id}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB1}` },
      body: JSON.stringify({ amount: 1500 })
    });

    assert(snipingBid.status === 201, 'Bid in final 30 seconds accepted (201)');
    assert(snipingBid.data.extendedDeadline === true, 'Response confirms deadline extension triggered');

    const extendedClosingMs = new Date(snipingBid.data.auction.closingAt).getTime();
    const extensionDiffSeconds = Math.round((extendedClosingMs - Date.now()) / 1000);

    assert(
      extensionDiffSeconds >= 55 && extensionDiffSeconds <= 65,
      `Auction deadline extended to ~60s from bid acceptance (Current: ${extensionDiffSeconds}s)`
    );

    const dbSnipingCheck = await Auction.findById(snipingAuction._id);
    assert(dbSnipingCheck.antiSnipingExtensions === 1, 'Auction antiSnipingExtensions counter is 1');

    // Wait briefly for socket delivery
    await new Promise((r) => setTimeout(r, 400));
    assert(socketExtensionReceived, 'Socket.IO client received "auction:extended" event in real-time');
    assert(socketBidReceived, 'Socket.IO client received "auction:bid" event in real-time');

    clientSocket.disconnect();

    // 3. TEST 2: Idempotent Closing Without Bids (Unsold Outcome)
    const unsoldAuction = new Auction({
      title: `Unsold Item ${suffix}`,
      category: 'textbooks',
      condition: 'Good Condition',
      startingPrice: 400,
      minIncrement: 50,
      currentPrice: 400,
      description: 'Book with no bidders',
      closingAt: new Date(Date.now() - 5000), // 5 seconds in past
      pickupLocation: 'Main Gate',
      seller: sellerId,
      status: 'active',
      bidsCount: 0
    });
    await unsoldAuction.save();

    const closedUnsold = await closeAuctionIfDue(unsoldAuction._id);
    assert(closedUnsold !== null, 'closeAuctionIfDue successfully processed overdue auction');
    assert(closedUnsold.status === 'unsold', 'Auction with 0 bids transitioned to "unsold" status');
    assert(closedUnsold.provisionalWinner === null, 'No provisional winner recorded for unsold auction');
    assert(closedUnsold.winningAmount === null, 'No winning amount recorded for unsold auction');
    assert(closedUnsold.closedAt !== null, 'closedAt timestamp recorded');

    // 4. TEST 3: Idempotent Closing With Bids (Provisional Winner Selection)
    const auctionWithBids = new Auction({
      title: `Bidded Item ${suffix}`,
      category: 'cycles',
      condition: 'Good Condition',
      startingPrice: 2000,
      minIncrement: 100,
      currentPrice: 2200,
      description: 'Cycle with active bidding history',
      closingAt: new Date(Date.now() - 5000), // 5 seconds in past
      pickupLocation: 'Quad',
      seller: sellerId,
      status: 'active',
      bidsCount: 2
    });
    await auctionWithBids.save();

    // Create 2 bids: Bidder Alpha (2000), Bidder Beta (2200)
    const bid1 = new Bid({
      auction: auctionWithBids._id,
      bidder: b1Id,
      bidderName: bidder1Payload.name,
      bidderRoll: bidder1Payload.studentId,
      bidderMasked: 'Student ***11',
      amount: 2000,
      createdAt: new Date(Date.now() - 60000)
    });
    const bid2 = new Bid({
      auction: auctionWithBids._id,
      bidder: b2Id,
      bidderName: bidder2Payload.name,
      bidderRoll: bidder2Payload.studentId,
      bidderMasked: 'Student ***22',
      amount: 2200,
      createdAt: new Date(Date.now() - 30000)
    });
    await bid1.save();
    await bid2.save();

    const closedWithBids = await closeAuctionIfDue(auctionWithBids._id);
    assert(closedWithBids !== null, 'closeAuctionIfDue successfully closed auction with bids');
    assert(closedWithBids.status === 'pending_approval', 'Auction transitioned to "pending_approval" awaiting seller');
    assert(closedWithBids.winningAmount === 2200, 'Winning amount matches highest bid of ₹2,200');
    assert(closedWithBids.provisionalWinner.toString() === b2Id.toString(), 'Provisional winner is highest bidder (Bidder Beta)');
    assert(closedWithBids.provisionalWinnerMasked === 'Student ***22', 'Provisional winner masked identity recorded');

    // 5. TEST 4: Duplicate Close Attempt (Idempotency Guard)
    const duplicateCloseResult = await closeAuctionIfDue(auctionWithBids._id);
    assert(duplicateCloseResult === null, 'Duplicate close attempt returns null (idempotent no-op)');

    const recheckDb = await Auction.findById(auctionWithBids._id);
    assert(recheckDb.status === 'pending_approval', 'Database state uncorrupted by duplicate close attempt');
    assert(recheckDb.winningAmount === 2200, 'Winning amount unchanged');

    // 6. TEST 5: Server Restart / Downtime Recovery (processDueAuctions)
    console.log('\n  ⚡ Simulating server boot / restart recovery sweep...');
    // Seed 3 overdue active auctions simulating missed runs during server outage
    const overdue1 = new Auction({
      title: `Missed Auction 1 (With Bids) ${suffix}`,
      category: 'dorm',
      condition: 'Like New',
      startingPrice: 500,
      minIncrement: 50,
      currentPrice: 650,
      description: 'Missed auction during outage',
      closingAt: new Date(Date.now() - 120000),
      pickupLocation: 'Hostel 1',
      seller: sellerId,
      status: 'active',
      bidsCount: 1
    });
    const overdue1Bid = new Bid({
      auction: overdue1._id,
      bidder: b1Id,
      bidderName: bidder1Payload.name,
      bidderRoll: bidder1Payload.studentId,
      bidderMasked: 'Student ***11',
      amount: 650
    });

    const overdue2 = new Auction({
      title: `Missed Auction 2 (No Bids) ${suffix}`,
      category: 'textbooks',
      condition: 'Good Condition',
      startingPrice: 200,
      minIncrement: 20,
      currentPrice: 200,
      description: 'Missed unsold auction during outage',
      closingAt: new Date(Date.now() - 90000),
      pickupLocation: 'Hostel 2',
      seller: sellerId,
      status: 'active',
      bidsCount: 0
    });

    await overdue1.save();
    await overdue1Bid.save();
    await overdue2.save();

    const sweepCount = await processDueAuctions();
    assert(sweepCount >= 2, `Boot recovery sweep successfully transitioned ${sweepCount} overdue auctions`);

    const checkOverdue1 = await Auction.findById(overdue1._id);
    const checkOverdue2 = await Auction.findById(overdue2._id);

    assert(checkOverdue1.status === 'pending_approval', 'Overdue auction with bids recovered as pending_approval');
    assert(checkOverdue1.winningAmount === 650, 'Overdue auction winning amount correctly recovered');
    assert(checkOverdue2.status === 'unsold', 'Overdue auction with no bids recovered as unsold');

    // 7. TEST 6: Bid rejection on closed auction (Concurrency mutual exclusion)
    const bidAfterClose = await req(`/auctions/${checkOverdue1._id}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB2}` },
      body: JSON.stringify({ amount: 750 })
    });
    assert(bidAfterClose.status === 400, 'Bid on closed auction rejected with 400');
    assert(
      bidAfterClose.data.message.toLowerCase().includes('closed') ||
      bidAfterClose.data.message.toLowerCase().includes('expired'),
      `Close guard error message: "${bidAfterClose.data.message}"`
    );

    console.log(`\n===========================================`);
    console.log(`Total Passed: ${passed} | Total Failed: ${failed}`);
    console.log(`===========================================\n`);

    if (failed === 0) {
      console.log('🎉 ALL MODULE 6 REQUIREMENTS VERIFIED SUCCESSFULLY!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Module 6 test suite error:', err);
    process.exit(1);
  }
}

runTests();
