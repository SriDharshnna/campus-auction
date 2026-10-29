/**
 * Comprehensive Automated Verification Suite:
 * Manual Auction Extensions & Seller Cancellation
 */
import mongoose from 'mongoose';
import Auction from './src/models/Auction.js';
import Bid from './src/models/Bid.js';
import Notification from './src/models/Notification.js';
import Transaction from './src/models/Transaction.js';
import { processDueAuctions } from './src/services/auctionLifecycle.js';

const BASE_URL = 'http://localhost:5000/api';

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
  console.log('🚀 Starting Manual Auction Extension & Seller Cancellation Test Suite...\n');
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

    const suffix = Date.now().toString().slice(-4);

    // 1. Setup Accounts
    console.log('--- 1. Account Setup ---');
    const sellerRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Seller Maya',
        email: `maya.${suffix}@campus.edu`,
        password: 'Password123!',
        studentId: `21CSR${Math.floor(100 + Math.random() * 890)}`,
        department: 'Computer Science and Engineering'
      })
    });
    const sellerToken = sellerRes.data.token;
    assert(sellerToken, 'Seller registered successfully');

    const bidder1Res = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Bidder Rahul',
        email: `rahul.${suffix}@campus.edu`,
        password: 'Password123!',
        studentId: `22ADR${Math.floor(100 + Math.random() * 890)}`,
        department: 'Artificial Intelligence and Data Science'
      })
    });
    const bidder1Token = bidder1Res.data.token;
    const bidder1Id = bidder1Res.data.user.id;
    assert(bidder1Token, 'Bidder 1 registered successfully');

    const bidder2Res = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Bidder Ananya',
        email: `ananya.${suffix}@campus.edu`,
        password: 'Password123!',
        studentId: `23ECR${Math.floor(100 + Math.random() * 890)}`,
        department: 'Electronics and Communication Engineering'
      })
    });
    const bidder2Token = bidder2Res.data.token;
    const bidder2Id = bidder2Res.data.user.id;
    assert(bidder2Token, 'Bidder 2 registered successfully');

    const unauthorizedRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Unauthorized Sneha',
        email: `sneha.${suffix}@campus.edu`,
        password: 'Password123!',
        studentId: `24ITR${Math.floor(100 + Math.random() * 890)}`,
        department: 'Information Technology'
      })
    });
    const unauthorizedToken = unauthorizedRes.data.token;
    assert(unauthorizedToken, 'Unauthorized student registered');

    // 2. Scenario 1: Extension Before Bids
    console.log('\n--- 2. Extension Before Bids ---');
    const initialDeadline = new Date(Date.now() + 10 * 60 * 1000); // +10m
    const createRes = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({
        title: 'Arduino Sensor Kit Complete',
        category: 'electronics',
        condition: 'Like New',
        description: 'Complete Arduino kit with sensors for lab assignments.',
        startingPrice: 500,
        minIncrement: 50,
        pickupLocation: 'Academic Block A, Ground Floor',
        closingAt: initialDeadline.toISOString()
      })
    });
    assert(createRes.status === 201, 'Auction created with initial 10m deadline');
    const auction1Id = createRes.data.auction.id;

    // Seller extends deadline to +30m
    const extendedDeadline1 = new Date(Date.now() + 30 * 60 * 1000);
    const extend1Res = await req(`/auctions/${auction1Id}/extend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ newClosingAt: extendedDeadline1.toISOString() })
    });
    assert(extend1Res.status === 200, 'POST /extend accepted valid extension before bids');
    assert(
      new Date(extend1Res.data.auction.closingAt).getTime() === extendedDeadline1.getTime(),
      'Auction closingAt correctly updated in response'
    );

    // Verify persisted directly in MongoDB
    const dbAuction1 = await Auction.findById(auction1Id);
    assert(
      dbAuction1.closingAt.getTime() === extendedDeadline1.getTime(),
      'New deadline persisted in MongoDB closingAt field'
    );

    // 3. Scenario 2: Invalid Deadline Validations
    console.log('\n--- 3. Invalid Deadline Validations ---');
    // Shortening attempt (date earlier than current deadline)
    const earlierDeadline = new Date(dbAuction1.closingAt.getTime() - 5 * 60 * 1000);
    const shortenRes = await req(`/auctions/${auction1Id}/extend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ newClosingAt: earlierDeadline.toISOString() })
    });
    assert(shortenRes.status === 400, 'Shortening deadline rejected with 400 Bad Request');
    assert(
      shortenRes.data.message.includes('later than the current closing time') || shortenRes.data.message.includes('Shortening'),
      'Appropriate error message for shortening attempt'
    );

    // Past deadline attempt (earlier than server time)
    const pastDeadline = new Date(Date.now() - 60 * 1000);
    const pastRes = await req(`/auctions/${auction1Id}/extend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ newClosingAt: pastDeadline.toISOString() })
    });
    assert(pastRes.status === 400, 'Past deadline rejected with 400 Bad Request');

    // Missing or invalid format
    const invalidRes = await req(`/auctions/${auction1Id}/extend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ newClosingAt: 'not-a-date' })
    });
    assert(invalidRes.status === 400, 'Invalid date string rejected with 400 Bad Request');

    // 4. Scenario 3: Permissions & Unauthorized Access
    console.log('\n--- 4. Permissions & Unauthorized Access ---');
    const unauthExtend = await req(`/auctions/${auction1Id}/extend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${unauthorizedToken}` },
      body: JSON.stringify({ newClosingAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
    });
    assert(unauthExtend.status === 403, 'Unauthorized user extension rejected with 403 Forbidden');

    const unauthCancel = await req(`/auctions/${auction1Id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${unauthorizedToken}` },
      body: JSON.stringify({ reason: 'Attempt to cancel someone elses auction' })
    });
    assert(unauthCancel.status === 403, 'Unauthorized user cancellation rejected with 403 Forbidden');

    // 5. Scenario 4: Extension After Bids Have Been Placed
    console.log('\n--- 5. Extension After Bids ---');
    const bid1Res = await req(`/auctions/${auction1Id}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bidder1Token}` },
      body: JSON.stringify({ amount: 500 })
    });
    assert(bid1Res.status === 201, 'Bidder 1 placed opening bid of ₹500');

    // Verify terms cannot be modified via PUT except extension
    const tryChangePrice = await req(`/auctions/${auction1Id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ startingPrice: 800 })
    });
    assert(tryChangePrice.status === 400, 'Attempt to alter pricing after bids rejected');

    // Seller extends deadline after bids via POST /extend
    const extendedDeadline2 = new Date(Date.now() + 90 * 60 * 1000);
    const extendAfterBids = await req(`/auctions/${auction1Id}/extend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ newClosingAt: extendedDeadline2.toISOString() })
    });
    assert(extendAfterBids.status === 200, 'Extension after bids accepted successfully');
    assert(extendAfterBids.data.auction.bidsCount === 1, 'Bid count preserved after extension');
    assert(extendAfterBids.data.auction.currentPrice === 500, 'Current price preserved after extension');

    // Bidder 2 can still bid under the new extended deadline
    const bid2Res = await req(`/auctions/${auction1Id}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bidder2Token}` },
      body: JSON.stringify({ amount: 550 })
    });
    assert(bid2Res.status === 201, 'Bidder 2 successfully placed higher bid under extended deadline');

    // 6. Scenario 5: Seller Cancellation Before Bids
    console.log('\n--- 6. Cancellation Before Bids ---');
    const createRes2 = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({
        title: 'Drawing Board & T-Square',
        category: 'lab',
        condition: 'Good Condition',
        description: 'Standard engineering drawing board.',
        startingPrice: 300,
        minIncrement: 50,
        pickupLocation: 'Civil Engineering Block',
        closingAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      })
    });
    const auction2Id = createRes2.data.auction.id;

    // Cancellation without reason rejected
    const emptyReasonCancel = await req(`/auctions/${auction2Id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ reason: '   ' })
    });
    assert(emptyReasonCancel.status === 400, 'Cancellation without mandatory reason rejected with 400');
    assert(
      emptyReasonCancel.data.message.includes('reason is required'),
      'Error message clarifies cancellation reason is required'
    );

    // Valid cancellation before bids
    const validCancel1 = await req(`/auctions/${auction2Id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ reason: 'Item damaged during campus hostel shifting' })
    });
    assert(validCancel1.status === 200, 'Valid cancellation before bids accepted');
    assert(validCancel1.data.auction.status === 'cancelled', 'Auction status transitioned to cancelled');
    assert(
      validCancel1.data.auction.cancellationReason === 'Item damaged during campus hostel shifting',
      'Cancellation reason recorded on auction document'
    );

    // Bid on cancelled auction rejected
    const bidOnCancelled = await req(`/auctions/${auction2Id}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bidder1Token}` },
      body: JSON.stringify({ amount: 300 })
    });
    assert(bidOnCancelled.status === 400, 'Bidding on cancelled auction rejected with 400');
    assert(
      bidOnCancelled.data.message.includes('Bidding is closed for this listing (status: cancelled)'),
      'Accurate rejection message on cancelled auction'
    );

    // 7. Scenario 6: Seller Cancellation After Bids & Bidder Notification Verification
    console.log('\n--- 7. Cancellation After Bids & Bidder Notifications ---');
    const createRes3 = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({
        title: 'Scientific Calculator fx-991EX',
        category: 'calculators',
        condition: 'Excellent',
        description: 'Original Casio fx-991EX ClassWiz.',
        startingPrice: 600,
        minIncrement: 50,
        pickupLocation: 'Library Front Lawn',
        closingAt: new Date(Date.now() + 20 * 60 * 1000).toISOString()
      })
    });
    const auction3Id = createRes3.data.auction.id;

    // Bidder 1 bids ₹600
    await req(`/auctions/${auction3Id}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bidder1Token}` },
      body: JSON.stringify({ amount: 600 })
    });

    // Bidder 2 bids ₹650
    await req(`/auctions/${auction3Id}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bidder2Token}` },
      body: JSON.stringify({ amount: 650 })
    });

    // Verify 2 bids exist
    const bidsBeforeCancel = await Bid.find({ auction: auction3Id });
    assert(bidsBeforeCancel.length === 2, '2 bids placed on auction 3');

    // Seller cancels auction with mandatory reason
    const cancelReason = 'Calculator is urgently required for end-semester supplementary exams.';
    const cancelWithBidsRes = await req(`/auctions/${auction3Id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ reason: cancelReason })
    });
    assert(cancelWithBidsRes.status === 200, 'Seller cancelled active auction with bids');
    assert(cancelWithBidsRes.data.auction.status === 'cancelled', 'Status set to cancelled');

    // Verify bid history is preserved for auditing
    const bidsAfterCancel = await Bid.find({ auction: auction3Id });
    assert(bidsAfterCancel.length === 2, 'Bid records completely preserved in database for audit integrity');

    // Verify notifications were created for both bidders
    const notifBidder1 = await Notification.findOne({
      user: bidder1Id,
      auction: auction3Id,
      type: 'sale_cancelled'
    });
    assert(!!notifBidder1, 'Notification created for Bidder 1');
    assert(
      notifBidder1?.message.includes(cancelReason),
      'Bidder 1 notification contains mandatory cancellation reason'
    );

    const notifBidder2 = await Notification.findOne({
      user: bidder2Id,
      auction: auction3Id,
      type: 'sale_cancelled'
    });
    assert(!!notifBidder2, 'Notification created for Bidder 2');
    assert(
      notifBidder2?.message.includes(cancelReason),
      'Bidder 2 notification contains mandatory cancellation reason'
    );

    // Verify no Transaction was created for cancelled auction
    const txForCancelled = await Transaction.findOne({ auction: auction3Id });
    assert(!txForCancelled, 'No Transaction created for cancelled auction');

    // 8. Scenario 7: Anti-Sniping Protection Preservation
    console.log('\n--- 8. Anti-Sniping Preservation ---');
    // Create auction with closing in 20 seconds
    const antiSnipAuction = await Auction.create({
      title: 'Lab Coat 40 inch White',
      category: 'lab',
      condition: 'Good Condition',
      description: 'Clean cotton lab coat.',
      startingPrice: 200,
      minIncrement: 20,
      pickupLocation: 'Chemistry Block',
      closingAt: new Date(Date.now() + 20 * 1000), // in 20s (< 30s trigger)
      seller: sellerRes.data.user.id,
      sellerName: 'Seller Maya'
    });

    const snipBidRes = await req(`/auctions/${antiSnipAuction._id}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bidder1Token}` },
      body: JSON.stringify({ amount: 200 })
    });
    assert(snipBidRes.status === 201, 'Bid in final 20 seconds accepted');
    assert(snipBidRes.data.extendedDeadline === true, 'Anti-sniping trigger activated');
    const freshAntiSnip = await Auction.findById(antiSnipAuction._id);
    const remainingSecs = (freshAntiSnip.closingAt.getTime() - Date.now()) / 1000;
    assert(remainingSecs >= 45 && remainingSecs <= 65, 'Anti-sniping automatically extended closing to ~60s');

    // Manual extension after anti-sniping
    const manualExtendAfterSnip = new Date(Date.now() + 10 * 60 * 1000);
    const extendSnipRes = await req(`/auctions/${antiSnipAuction._id}/extend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ newClosingAt: manualExtendAfterSnip.toISOString() })
    });
    assert(extendSnipRes.status === 200, 'Manual extension works seamlessly on top of anti-sniping extension');

    // 9. Scenario 8: Cancellation Guard on Expired / Completed Auctions
    console.log('\n--- 9. Cancellation Guard on Expired / Completed Auctions ---');
    // Auction that already expired
    const expiredAuction = await Auction.create({
      title: 'Workshop Safety Goggles',
      category: 'lab',
      condition: 'Like New',
      description: 'Safety goggles.',
      startingPrice: 100,
      minIncrement: 10,
      pickupLocation: 'Workshop Hall',
      closingAt: new Date(Date.now() - 5000), // 5 seconds in the past
      seller: sellerRes.data.user.id,
      sellerName: 'Seller Maya',
      status: 'active'
    });

    const cancelExpiredRes = await req(`/auctions/${expiredAuction._id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ reason: 'Trying to cancel after deadline' })
    });
    assert(cancelExpiredRes.status === 400, 'Cancelling past-deadline auction rejected with 400');

    // 10. Scenario 9: Scheduler Persistence & Lifecycle Sweep
    console.log('\n--- 10. Scheduler Recovery & Persistence ---');
    // Run processDueAuctions sweep
    const swept = await processDueAuctions();
    assert(typeof swept === 'number', `Scheduler sweep processed successfully (${swept} auctions closed)`);

    // Verify cancelled auctions are never picked up by scheduler
    const dbCancelled = await Auction.findById(auction3Id);
    assert(dbCancelled.status === 'cancelled', 'Cancelled auction remained cancelled, never processed into pending_approval');

    // Verify extended auction 1 is still active
    const dbExtended = await Auction.findById(auction1Id);
    assert(dbExtended.status === 'active', 'Manually extended auction remained active until new deadline');

    // 11. Scenario 10: Module 7 Flow Preserved
    console.log('\n--- 11. Module 7 Flow Preserved ---');
    // Create an auction with a short deadline that expires, closes to pending_approval, and seller approves
    const mod7Auction = await Auction.create({
      title: 'Data Structures Textbook by Cormen',
      category: 'textbooks',
      condition: 'Good Condition',
      description: 'Algorithms classic textbook.',
      startingPrice: 400,
      minIncrement: 50,
      pickupLocation: 'Central Library',
      closingAt: new Date(Date.now() + 60 * 1000),
      seller: sellerRes.data.user.id,
      sellerName: 'Seller Maya',
      sellerRoll: '21CSR101',
      status: 'active'
    });

    // Bidder 1 bids
    const mod7BidRes = await req(`/auctions/${mod7Auction._id}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bidder1Token}` },
      body: JSON.stringify({ amount: 400 })
    });
    assert(mod7BidRes.status === 201, 'Bidder 1 placed bid on Module 7 auction');

    // Simulate deadline passing
    await Auction.findByIdAndUpdate(mod7Auction._id, { closingAt: new Date(Date.now() - 1000) });
    await processDueAuctions();

    const closedMod7Auction = await Auction.findById(mod7Auction._id);
    assert(closedMod7Auction.status === 'pending_approval', 'Auction transitioned to pending_approval');

    const mod7Tx = await Transaction.findOne({ auction: mod7Auction._id });
    assert(!!mod7Tx, 'Module 7 Transaction automatically created');
    assert(mod7Tx.status === 'pending_seller_approval', 'Transaction status is pending_seller_approval');

    // Seller approves transaction
    const approveRes = await req(`/transactions/${mod7Tx._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    assert(approveRes.status === 200, 'Module 7 seller approval succeeded');
    assert(approveRes.data.transaction.status === 'approved', 'Transaction transitioned to approved');

    // Attempt to cancel auction after transaction has progressed -> REJECTED
    const cancelProgressed = await req(`/auctions/${mod7Auction._id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ reason: 'Late cancellation attempt' })
    });
    assert(cancelProgressed.status === 400, 'Cancellation blocked after transaction approval/closure');

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
