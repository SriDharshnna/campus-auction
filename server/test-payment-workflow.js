/**
 * Test Suite: Payment Selection Workflow (COD & UPI)
 * Tests:
 * 1. Seller approval reserves item
 * 2. Buyer selects COD (status: PENDING)
 * 3. Security: Non-buyer cannot select payment (403 Forbidden)
 * 4. Handover before selecting payment method rejected (400 Bad Request)
 * 5. COD collection at handover (updates payment.status to PAID and transaction to completed)
 * 6. Buyer selects UPI (status: PENDING, upiQrData generated)
 * 7. Handover blocked while UPI payment is pending (400 Bad Request)
 * 8. Failed UPI verification (reference FAIL -> status: FAILED)
 * 9. Verified UPI payment (valid UTR -> status: PAID)
 * 10. Duplicate UPI verification rejected (400 Bad Request)
 * 11. Handover after verified UPI payment completes transaction
 * 12. Sensitive credentials check: No UPI PIN or private credentials stored
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
  console.log('🧪 RUNNING PAYMENT SELECTION WORKFLOW TEST SUITE');
  console.log('======================================================\n');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-auction');
    }

    const suffix = Date.now().toString().slice(-4);

    const sellerPayload = {
      name: 'Seller Payment',
      email: `seller.pay.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22ECR${Math.floor(100 + Math.random() * 890)}`
    };
    const buyerPayload = {
      name: 'Buyer Payment',
      email: `buyer.pay.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22CSR${Math.floor(100 + Math.random() * 890)}`
    };
    const thirdPartyPayload = {
      name: 'Intruder Payment',
      email: `intruder.pay.${suffix}@kongu.edu`,
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

    assert(tokenSeller && tokenBuyer && tokenThird, 'Seller, Buyer and 3rd Party registered');

    // ---------------------------------------------------------
    // TEST WORKFLOW 1: Cash on Delivery (COD) Flow
    // ---------------------------------------------------------
    console.log('\n--- 1. Cash on Delivery (COD) Workflow ---');
    // Create auction
    const aucCOD = new Auction({
      title: `Casio Scientific Calculator COD ${suffix}`,
      category: 'calculators',
      condition: 'Like New',
      startingPrice: 1000,
      minIncrement: 100,
      currentPrice: 1200,
      description: 'Calculator for COD payment test',
      closingAt: new Date(Date.now() - 1000), // expired
      pickupLocation: 'Library Ground Floor',
      seller: sellerId,
      bidsCount: 1,
      highestBidder: buyerId,
      highestBidderMasked: 'Student ***22'
    });
    await aucCOD.save();

    await Bid.create({
      auction: aucCOD._id,
      bidder: buyerId,
      bidderName: buyerPayload.name,
      bidderMasked: 'Student ***22',
      amount: 1200,
      previousPrice: 1000
    });

    // Close auction
    await closeAuctionIfDue(aucCOD._id);
    const txCOD = await Transaction.findOne({ auction: aucCOD._id });
    assert(txCOD !== null, 'Transaction created for COD auction');

    // 1. Handover before seller approval rejected
    const earlyHandover = await req(`/transactions/${txCOD._id}/handover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` }
    });
    assert(earlyHandover.status === 400, 'Handover before approval rejected');

    // 2. Seller approves
    const approveCOD = await req(`/transactions/${txCOD._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` }
    });
    assert(approveCOD.status === 200, 'Seller approved winning bid (Item Reserved)');
    assert(approveCOD.data.transaction.status === 'approved', 'Transaction status is approved');

    // 3. Handover before selecting payment method rejected
    const handoverNoPayment = await req(`/transactions/${txCOD._id}/handover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` }
    });
    assert(handoverNoPayment.status === 400, 'Handover without selected payment method rejected with 400');
    assert(
      handoverNoPayment.data.message.includes('confirm a payment method'),
      `Error requires payment method selection: "${handoverNoPayment.data.message}"`
    );

    // 4. Security guard: Intruder or Seller cannot select buyer's payment method
    const sellerSelectPayment = await req(`/transactions/${txCOD._id}/payment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({ method: 'COD' })
    });
    assert(sellerSelectPayment.status === 403, 'Seller selecting payment method rejected with 403 Forbidden');

    const thirdSelectPayment = await req(`/transactions/${txCOD._id}/payment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenThird}` },
      body: JSON.stringify({ method: 'COD' })
    });
    assert(thirdSelectPayment.status === 403, 'Intruder selecting payment method rejected with 403 Forbidden');

    // 5. Invalid payment method rejected
    const invalidMethod = await req(`/transactions/${txCOD._id}/payment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBuyer}` },
      body: JSON.stringify({ method: 'BITCOIN' })
    });
    assert(invalidMethod.status === 400, 'Invalid payment method rejected with 400');

    // 6. Buyer selects COD
    const selectCOD = await req(`/transactions/${txCOD._id}/payment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBuyer}` },
      body: JSON.stringify({ method: 'COD' })
    });
    assert(selectCOD.status === 200, 'Buyer selected COD successfully (HTTP 200)');
    assert(selectCOD.data.transaction.payment.method === 'COD', 'Payment method is COD');
    assert(selectCOD.data.transaction.payment.status === 'PENDING', 'COD payment status is PENDING prior to handover');
    assert(selectCOD.data.transaction.payment.amount === 1200, 'Payment amount matches finalPrice (₹1,200)');

    // 7. Seller and Buyer complete campus handover -> COD collected at handover
    const completeCOD = await req(`/transactions/${txCOD._id}/handover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({ notes: 'Cash ₹1,200 collected at Library' })
    });
    assert(completeCOD.status === 200, 'Seller confirmed handover with COD collection');
    assert(completeCOD.data.transaction.status === 'completed', 'Transaction status moved to completed');
    assert(completeCOD.data.transaction.payment.status === 'PAID', 'COD payment status marked as PAID upon handover');
    assert(completeCOD.data.transaction.payment.verifiedBy === 'SELLER_HANDOVER', 'Payment verifiedBy is SELLER_HANDOVER');

    // ---------------------------------------------------------
    // TEST WORKFLOW 2: Instant UPI Payment Flow
    // ---------------------------------------------------------
    console.log('\n--- 2. Instant UPI Payment Workflow ---');
    const aucUPI = new Auction({
      title: `Hero Sprint Mountain Bike UPI ${suffix}`,
      category: 'cycles',
      condition: 'Good Condition',
      startingPrice: 3000,
      minIncrement: 200,
      currentPrice: 3200,
      description: 'Mountain bike for UPI payment test',
      closingAt: new Date(Date.now() - 1000),
      pickupLocation: 'Hostel 4 Ground Floor',
      seller: sellerId,
      bidsCount: 1,
      highestBidder: buyerId,
      highestBidderMasked: 'Student ***22'
    });
    await aucUPI.save();

    await Bid.create({
      auction: aucUPI._id,
      bidder: buyerId,
      bidderName: buyerPayload.name,
      bidderMasked: 'Student ***22',
      amount: 3200,
      previousPrice: 3000
    });

    await closeAuctionIfDue(aucUPI._id);
    const txUPI = await Transaction.findOne({ auction: aucUPI._id });

    // Seller approves bid
    await req(`/transactions/${txUPI._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` }
    });

    // 1. Buyer selects UPI
    const selectUPI = await req(`/transactions/${txUPI._id}/payment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBuyer}` },
      body: JSON.stringify({ method: 'UPI' })
    });
    assert(selectUPI.status === 200, 'Buyer selected UPI payment successfully (HTTP 200)');
    assert(selectUPI.data.transaction.payment.method === 'UPI', 'Payment method is UPI');
    assert(selectUPI.data.transaction.payment.status === 'PENDING', 'UPI payment status is initially PENDING');
    assert(
      selectUPI.data.transaction.payment.upiQrData.startsWith('upi://pay?'),
      `Valid UPI intent generated: ${selectUPI.data.transaction.payment.upiQrData}`
    );

    // 2. Handover attempt while UPI is pending is BLOCKED (no fake payment)
    const pendingUpiHandover = await req(`/transactions/${txUPI._id}/handover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` }
    });
    assert(pendingUpiHandover.status === 400, 'Handover blocked while UPI payment is pending');
    assert(
      pendingUpiHandover.data.message.includes('UPI payment is still pending'),
      `Error explains verification required: "${pendingUpiHandover.data.message}"`
    );

    // 3. Security check: Non-buyer cannot submit UPI verification
    const unauthorizedVerify = await req(`/transactions/${txUPI._id}/verify-upi`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenThird}` },
      body: JSON.stringify({ referenceId: 'UPI202610287719' })
    });
    assert(unauthorizedVerify.status === 403, 'Intruder submitting UPI verification rejected with 403 Forbidden');

    // 4. Invalid reference rejected
    const invalidRef = await req(`/transactions/${txUPI._id}/verify-upi`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBuyer}` },
      body: JSON.stringify({ referenceId: '123' }) // too short
    });
    assert(invalidRef.status === 400, 'Short / invalid reference ID rejected with 400');

    // 5. Verification failure simulation
    const failRef = await req(`/transactions/${txUPI._id}/verify-upi`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBuyer}` },
      body: JSON.stringify({ referenceId: 'FAILED_UTR_9999' })
    });
    assert(failRef.status === 400, 'Failed UPI transaction verification rejected with 400');
    assert(failRef.data.payment.status === 'FAILED', 'Payment status marked as FAILED upon failed verification');

    // 6. Successful UPI verification
    const validUtr = 'UPI202610288821';
    const verifyUPI = await req(`/transactions/${txUPI._id}/verify-upi`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBuyer}` },
      body: JSON.stringify({ referenceId: validUtr })
    });
    assert(verifyUPI.status === 200, 'Valid UPI payment verified successfully (HTTP 200)');
    assert(verifyUPI.data.transaction.payment.status === 'PAID', 'Payment status moved to PAID after verification');
    assert(verifyUPI.data.transaction.payment.transactionReference === validUtr, 'UTR reference saved in payment record');
    assert(verifyUPI.data.transaction.payment.verifiedBy === 'UPI_VERIFIED', 'Payment marked verifiedBy UPI_VERIFIED');

    // 7. Duplicate verification rejected
    const duplicateVerify = await req(`/transactions/${txUPI._id}/verify-upi`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBuyer}` },
      body: JSON.stringify({ referenceId: validUtr })
    });
    assert(duplicateVerify.status === 400, 'Duplicate UPI verification rejected with 400');

    // 8. Now handover can proceed
    const completeUPI = await req(`/transactions/${txUPI._id}/handover`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBuyer}` },
      body: JSON.stringify({ notes: 'Cycle received at Hostel 4' })
    });
    assert(completeUPI.status === 200, 'Handover confirmed after verified UPI payment');
    assert(completeUPI.data.transaction.status === 'completed', 'Transaction completed');
    assert(completeUPI.data.transaction.payment.status === 'PAID', 'Payment remains PAID');

    // ---------------------------------------------------------
    // TEST 3: Security & Privacy Check
    // ---------------------------------------------------------
    console.log('\n--- 3. Security & Privacy Verification ---');
    const dbTx = await Transaction.findById(txUPI._id).lean();
    assert(dbTx.payment.upiPin === undefined, 'No UPI PIN field exists in MongoDB document');
    assert(dbTx.payment.password === undefined, 'No password field exists in MongoDB document');
    assert(dbTx.payment.secret === undefined, 'No secret credentials stored');

    console.log('\n======================================================');
    console.log('🎉 ALL PAYMENT SELECTION WORKFLOW TESTS PASSED (12/12)!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ PAYMENT WORKFLOW TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
