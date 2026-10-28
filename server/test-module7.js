/**
 * Module 7 Verification Test Suite: Seller Approval and Campus Handover
 * Tests:
 * 1. Automatic transaction creation upon auction close with bids
 * 2. Authorization: Only authenticated seller can approve or reject (403 Forbidden for others)
 * 3. Seller Approval: Reserves item for winner ('approved'), does NOT mark completed
 * 4. Notifications: Dispatched to seller and buyer with correct event types
 * 5. Handover: Only authorized participants (seller/buyer) can confirm handover (403 for others)
 * 6. Handover: Cannot confirm handover before approval (400 Bad Request)
 * 7. Handover Confirmation: Transitions transaction to 'completed' and auction to 'completed'
 * 8. State Integrity: Duplicate or contradictory state transitions rejected (400 Bad Request)
 * 9. Seller Rejection: Sets transaction to 'rejected', reason saved, auction to 'unsold'
 * 10. Failed Pickup: Sets transaction to 'failed_pickup', reason saved, auction to 'unsold'
 * 11. Cancellation: Sets transaction to 'cancelled', reason saved, auction to 'cancelled'
 * 12. Dashboard & Notifications APIs: Verified working
 */

import http from 'http';
import mongoose from 'mongoose';
import Auction from './src/models/Auction.js';
import User from './src/models/User.js';
import Bid from './src/models/Bid.js';
import Transaction from './src/models/Transaction.js';
import Notification from './src/models/Notification.js';
import { closeAuctionIfDue } from './src/services/auctionLifecycle.js';

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

function req(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const headers = options.headers || {};
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const requestOptions = {
      method: options.method || 'GET',
      headers,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search
    };

    const clientReq = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    clientReq.on('error', reject);
    if (options.body) {
      clientReq.write(options.body);
    }
    clientReq.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function run() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MODULE 7: SELLER APPROVAL & HANDOVER TEST SUITE');
  console.log('======================================================\n');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-auction');
    }

    const suffix = Date.now().toString().slice(-4);

    // 1. Setup 3 test users: Seller, Buyer, and an Unauthorized 3rd Party Student
    const sellerPayload = {
      name: 'Seller Seven',
      email: `seller.mod7.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22ECR${Math.floor(100 + Math.random() * 890)}`
    };
    const buyerPayload = {
      name: 'Buyer Seven',
      email: `buyer.mod7.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22CSR${Math.floor(100 + Math.random() * 890)}`
    };
    const thirdPartyPayload = {
      name: 'Intruder Student',
      email: `intruder.mod7.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22ALR${Math.floor(100 + Math.random() * 890)}`
    };

    const regSeller = await req('/auth/register', { method: 'POST', body: JSON.stringify(sellerPayload) });
    const regBuyer = await req('/auth/register', { method: 'POST', body: JSON.stringify(buyerPayload) });
    const regThird = await req('/auth/register', { method: 'POST', body: JSON.stringify(thirdPartyPayload) });

    const tokenSeller = regSeller.data.token;
    const tokenBuyer = regBuyer.data.token;
    const tokenThird = regThird.data.token;

    const sellerId = regSeller.data.user.id || regSeller.data.user._id;
    const buyerId = regBuyer.data.user.id || regBuyer.data.user._id;
    const thirdId = regThird.data.user.id || regThird.data.user._id;

    assert(tokenSeller && tokenBuyer && tokenThird, 'Three test users registered and authenticated');

    // -------------------------------------------------------------------------
    // SCENARIO 1: Auction Lifecycle -> Transaction Creation -> Approval -> Handover
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Auction Close & Automatic Transaction Creation ---');
    // Create auction expiring in 1 second
    const auc1 = new Auction({
      title: `Hero Sprint Pro 26T Cycle ${suffix}`,
      category: 'cycles',
      condition: 'Good Condition',
      startingPrice: 2000,
      minIncrement: 100,
      currentPrice: 2000,
      description: 'Single-speed bicycle for campus commute',
      closingAt: new Date(Date.now() + 1000), // 1s
      pickupLocation: 'Hostel 4 Ground Floor',
      seller: sellerId,
      sellerName: sellerPayload.name,
      sellerRoll: sellerPayload.studentId
    });
    await auc1.save();

    // Buyer places winning bid of ₹2,200
    const bid1 = new Bid({
      auction: auc1._id,
      bidder: buyerId,
      bidderName: buyerPayload.name,
      bidderMasked: 'Student ***22',
      amount: 2200,
      previousPrice: 2000
    });
    await bid1.save();

    auc1.bidsCount = 1;
    auc1.currentPrice = 2200;
    auc1.highestBidder = buyerId;
    auc1.highestBidderMasked = 'Student ***22';
    await auc1.save();

    console.log('  Waiting 1.5s for auction deadline to expire...');
    await new Promise((r) => setTimeout(r, 1500));

    // Trigger close
    const closedAuc1 = await closeAuctionIfDue(auc1._id);
    assert(closedAuc1 && closedAuc1.status === 'pending_approval', 'Auction closed with status "pending_approval"');
    assert(closedAuc1.winningAmount === 2200, 'Winning amount recorded as ₹2,200');

    // Check automatic Transaction creation
    const tx1 = await Transaction.findOne({ auction: auc1._id });
    assert(tx1 !== null, 'Transaction record automatically initialized');
    assert(tx1.status === 'pending_seller_approval', 'Transaction status is "pending_seller_approval"');
    assert(tx1.finalPrice === 2200, 'Transaction finalPrice is ₹2,200');
    assert(tx1.seller.toString() === sellerId.toString(), 'Transaction seller matches sellerId');
    assert(tx1.buyer.toString() === buyerId.toString(), 'Transaction buyer matches buyerId');

    // Check Notifications sent to both parties
    const sellerNotif = await Notification.findOne({ user: sellerId, transaction: tx1._id });
    assert(sellerNotif !== null, 'Seller received "approval_needed" notification');
    assert(sellerNotif.type === 'approval_needed', 'Seller notification type is approval_needed');

    const buyerNotif = await Notification.findOne({ user: buyerId, transaction: tx1._id });
    assert(buyerNotif !== null, 'Buyer received "auction_won" notification');
    assert(buyerNotif.type === 'auction_won', 'Buyer notification type is auction_won');

    // -------------------------------------------------------------------------
    // TEST 2: Authorization: Unauthorized Approval Attempt (HTTP 403)
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Authorization Rules: Approval & Rejection Guards ---');
    // Buyer attempts to approve their own bid
    const buyerApprove = await req(`/transactions/${tx1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBuyer}` }
    });
    assert(buyerApprove.status === 403, 'Buyer approving transaction rejected with HTTP 403 Forbidden');

    // 3rd party attempts to approve
    const thirdApprove = await req(`/transactions/${tx1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenThird}` }
    });
    assert(thirdApprove.status === 403, 'Intruder student approving transaction rejected with HTTP 403 Forbidden');

    // 3rd party attempts to reject
    const thirdReject = await req(`/transactions/${tx1._id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenThird}` },
      body: JSON.stringify({ reason: 'Malicious reject' })
    });
    assert(thirdReject.status === 403, 'Intruder student rejecting transaction rejected with HTTP 403 Forbidden');

    // -------------------------------------------------------------------------
    // TEST 3: Handover attempted before Seller Approval (HTTP 400)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. State Sequence: Handover before approval rejected ---');
    const prematureHandover = await req(`/transactions/${tx1._id}/handover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({ notes: 'Meeting early' })
    });
    assert(prematureHandover.status === 400, 'Handover before seller approval rejected with HTTP 400');
    assert(
      prematureHandover.data.message.includes('before seller approves'),
      `Error states approval required before handover: "${prematureHandover.data.message}"`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Authorized Seller Approval (Item Reservation)
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Authorized Seller Approval (Item Reservation) ---');
    const validApprove = await req(`/transactions/${tx1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` }
    });
    assert(validApprove.status === 200, 'Seller approved transaction successfully (HTTP 200)');
    assert(validApprove.data.transaction.status === 'approved', 'Transaction status moved to "approved" (Reserved for winner)');
    assert(validApprove.data.transaction.sellerDecision.decision === 'approved', 'Seller decision recorded as "approved"');
    assert(validApprove.data.transaction.sellerDecision.decidedAt !== null, 'Decision timestamp recorded');

    // Verification: Sale is NOT marked completed merely because seller approved it
    assert(validApprove.data.transaction.status !== 'completed', 'Sale is NOT marked completed on approval (Reservation rule verified)');

    // Verification: Auction status remains distinct from sale status
    const freshAuc1 = await Auction.findById(auc1._id);
    assert(freshAuc1.status === 'pending_approval', 'Auction status kept separate (still in pending_approval awaiting physical handover)');

    // Buyer received approval notification
    const buyerApproveNotif = await Notification.findOne({ user: buyerId, type: 'sale_approved' });
    assert(buyerApproveNotif !== null, 'Buyer received "sale_approved" notification confirming reservation');

    // -------------------------------------------------------------------------
    // TEST 5: Contradictory Transition Guard (Cannot re-approve or reject approved sale)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. State Integrity: Duplicate/Contradictory transitions blocked ---');
    const duplicateApprove = await req(`/transactions/${tx1._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` }
    });
    assert(duplicateApprove.status === 400, 'Duplicate approval rejected with HTTP 400');

    const contradictoryReject = await req(`/transactions/${tx1._id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({ reason: 'Changed mind' })
    });
    assert(contradictoryReject.status === 400, 'Rejecting an already approved sale rejected with HTTP 400');

    // -------------------------------------------------------------------------
    // TEST 6: Unauthorized Handover Attempt (HTTP 403)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Handover Authorization: Unauthorized participant blocked ---');
    const thirdHandover = await req(`/transactions/${tx1._id}/handover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenThird}` }
    });
    assert(thirdHandover.status === 403, 'Intruder recording handover rejected with HTTP 403 Forbidden');

    // -------------------------------------------------------------------------
    // TEST 7: Confirmed Campus Handover (Completion)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Confirmed Campus Handover ---');
    const validHandover = await req(`/transactions/${tx1._id}/handover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBuyer}` },
      body: JSON.stringify({ notes: 'Exchanged at Hostel 4 entrance in cash' })
    });
    assert(validHandover.status === 200, 'Buyer confirmed campus handover successfully (HTTP 200)');
    assert(validHandover.data.transaction.status === 'completed', 'Transaction status moved to "completed"');
    assert(validHandover.data.transaction.handover.confirmedAt !== null, 'Handover confirmedAt timestamp recorded');
    assert(validHandover.data.transaction.handover.confirmedBy.toString() === buyerId.toString(), 'ConfirmedBy matches buyer ID');

    // Verification: Auction status now moved to completed
    const completedAuc1 = await Auction.findById(auc1._id);
    assert(completedAuc1.status === 'completed', 'Auction status moved to "completed" upon confirmed handover');

    // Seller received handover confirmation notification
    const sellerHandoverNotif = await Notification.findOne({ user: sellerId, type: 'handover_confirmed' });
    assert(sellerHandoverNotif !== null, 'Seller received "handover_confirmed" notification');

    // Cannot confirm handover a second time
    const duplicateHandover = await req(`/transactions/${tx1._id}/handover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` }
    });
    assert(duplicateHandover.status === 400, 'Duplicate handover confirmation rejected with HTTP 400');

    // Cannot cancel a completed transaction
    const cancelCompleted = await req(`/transactions/${tx1._id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({ reason: 'Want item back' })
    });
    assert(cancelCompleted.status === 400, 'Cancelling a completed transaction rejected with HTTP 400');

    // -------------------------------------------------------------------------
    // SCENARIO 2: Rejection Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Seller Rejection Workflow ---');
    const auc2 = new Auction({
      title: `Calculus Textbook ${suffix}`,
      category: 'textbooks',
      condition: 'Like New',
      startingPrice: 500,
      minIncrement: 50,
      currentPrice: 550,
      description: 'Used for one semester',
      closingAt: new Date(Date.now() - 1000), // Expired
      pickupLocation: 'Library Portico',
      seller: sellerId,
      bidsCount: 1,
      highestBidder: buyerId,
      highestBidderMasked: 'Student ***22'
    });
    await auc2.save();

    await Bid.create({
      auction: auc2._id,
      bidder: buyerId,
      bidderName: buyerPayload.name,
      bidderMasked: 'Student ***22',
      amount: 550,
      previousPrice: 500
    });

    await closeAuctionIfDue(auc2._id);
    const tx2 = await Transaction.findOne({ auction: auc2._id });
    assert(tx2 !== null, 'Transaction for item 2 initialized');

    // Seller rejects with reason
    const validReject = await req(`/transactions/${tx2._id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({ reason: 'Winning price of ₹550 is too low for this hardcover book' })
    });
    assert(validReject.status === 200, 'Seller rejected winning bid (HTTP 200)');
    assert(validReject.data.transaction.status === 'rejected', 'Transaction status moved to "rejected"');
    assert(
      validReject.data.transaction.sellerDecision.rejectionReason.includes('too low'),
      'Rejection reason saved in transaction record'
    );

    // Auction outcome explicitly set to unsold
    const rejectedAuc = await Auction.findById(auc2._id);
    assert(rejectedAuc.status === 'unsold', 'Auction status explicitly set to "unsold" upon seller rejection');

    // Buyer notified of rejection
    const rejectNotif = await Notification.findOne({ user: buyerId, type: 'sale_rejected' });
    assert(rejectNotif !== null, 'Buyer received "sale_rejected" notification with reason');

    // -------------------------------------------------------------------------
    // SCENARIO 3: Failed Pickup Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Failed Campus Pickup Workflow ---');
    const auc3 = new Auction({
      title: `Casio Scientific Calculator ${suffix}`,
      category: 'calculators',
      condition: 'Good Condition',
      startingPrice: 800,
      minIncrement: 50,
      currentPrice: 850,
      description: 'Engineering calculator',
      closingAt: new Date(Date.now() - 1000),
      pickupLocation: 'Academic Block B',
      seller: sellerId,
      bidsCount: 1,
      highestBidder: buyerId,
      highestBidderMasked: 'Student ***22'
    });
    await auc3.save();

    await Bid.create({
      auction: auc3._id,
      bidder: buyerId,
      bidderName: buyerPayload.name,
      bidderMasked: 'Student ***22',
      amount: 850,
      previousPrice: 800
    });

    await closeAuctionIfDue(auc3._id);
    const tx3 = await Transaction.findOne({ auction: auc3._id });

    // Approve first to enter reserved state
    await req(`/transactions/${tx3._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` }
    });

    // Record failed pickup (e.g. buyer did not show up)
    const failPickup = await req(`/transactions/${tx3._id}/fail-pickup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({ reason: 'Buyer did not arrive after 30 minutes at Academic Block B' })
    });
    assert(failPickup.status === 200, 'Failed pickup recorded (HTTP 200)');
    assert(failPickup.data.transaction.status === 'failed_pickup', 'Transaction status moved to "failed_pickup"');
    assert(
      failPickup.data.transaction.failure.reason.includes('did not arrive'),
      'Failure reason preserved in transaction record'
    );

    const failedAuc = await Auction.findById(auc3._id);
    assert(failedAuc.status === 'unsold', 'Auction status explicitly set to "unsold" on failed pickup');

    // -------------------------------------------------------------------------
    // SCENARIO 4: Cancellation Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Cancellation Workflow ---');
    const auc4 = new Auction({
      title: `Desk Study Lamp ${suffix}`,
      category: 'dorm',
      condition: 'Like New',
      startingPrice: 300,
      minIncrement: 30,
      currentPrice: 350,
      description: 'LED lamp',
      closingAt: new Date(Date.now() - 1000),
      pickupLocation: 'Hostel 7',
      seller: sellerId,
      bidsCount: 1,
      highestBidder: buyerId,
      highestBidderMasked: 'Student ***22'
    });
    await auc4.save();

    await Bid.create({
      auction: auc4._id,
      bidder: buyerId,
      bidderName: buyerPayload.name,
      bidderMasked: 'Student ***22',
      amount: 350,
      previousPrice: 300
    });

    await closeAuctionIfDue(auc4._id);
    const tx4 = await Transaction.findOne({ auction: auc4._id });

    const cancelRes = await req(`/transactions/${tx4._id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBuyer}` },
      body: JSON.stringify({ reason: 'Leaving campus early for vacation' })
    });
    assert(cancelRes.status === 200, 'Cancellation recorded (HTTP 200)');
    assert(cancelRes.data.transaction.status === 'cancelled', 'Transaction status moved to "cancelled"');

    const cancelledAuc = await Auction.findById(auc4._id);
    assert(cancelledAuc.status === 'cancelled', 'Auction status explicitly set to "cancelled"');

    // -------------------------------------------------------------------------
    // TEST 11: Real Dashboard & Notifications Endpoints Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Dashboard & Notifications API Endpoints ---');
    // Seller gets transactions
    const sellerTxList = await req('/transactions?role=seller', {
      headers: { Authorization: `Bearer ${tokenSeller}` }
    });
    assert(sellerTxList.status === 200, 'GET /api/transactions returns HTTP 200 for seller');
    assert(Array.isArray(sellerTxList.data.transactions), 'Transactions list is an array');
    assert(sellerTxList.data.transactions.length >= 4, 'Seller retrieved all relevant transactions');

    // Buyer gets real bids with transaction linkages
    const buyerBids = await req('/transactions/my-bids', {
      headers: { Authorization: `Bearer ${tokenBuyer}` }
    });
    assert(buyerBids.status === 200, 'GET /api/transactions/my-bids returns HTTP 200 for buyer');
    assert(Array.isArray(buyerBids.data.bids), 'My bids is an array');
    assert(buyerBids.data.bids.length >= 4, 'Buyer retrieved all active/closed bids');

    // Check notifications API
    const notifsList = await req('/notifications', {
      headers: { Authorization: `Bearer ${tokenBuyer}` }
    });
    assert(notifsList.status === 200, 'GET /api/notifications returns HTTP 200');
    assert(notifsList.data.notifications.length > 0, 'Buyer has notifications recorded');

    // Mark single notification as read
    const singleNotifId = notifsList.data.notifications[0].id || notifsList.data.notifications[0]._id;
    const markSingle = await req(`/notifications/${singleNotifId}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenBuyer}` }
    });
    assert(markSingle.status === 200, 'PUT /api/notifications/:id/read returns HTTP 200');
    assert(markSingle.data.notification.read === true, 'Single notification marked as read');

    // Mark all notifications as read
    const markAll = await req('/notifications/mark-all-read', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenBuyer}` }
    });
    assert(markAll.status === 200, 'PUT /api/notifications/mark-all-read returns HTTP 200');

    console.log('\n======================================================');
    console.log('🎉 ALL MODULE 7 TESTS PASSED SUCCESSFULLY (11/11)!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ MODULE 7 TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
