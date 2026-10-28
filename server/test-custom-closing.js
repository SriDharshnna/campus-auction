/**
 * Verification Test Suite: Custom Auction Closing Dates and Times
 * Tests:
 * 1. Validation: Missing, invalid, past, and <=1 min closing times rejected (HTTP 400).
 * 2. Successful creation: Exact custom closing timestamp saved as MongoDB Date.
 * 3. Independent closing: Two auctions with different deadlines close independently without affecting each other.
 * 4. Anti-sniping extension on custom deadline: Bid accepted within final 30s extends deadline to 60s.
 * 5. Edit rules: Updating deadline allowed when bidsCount === 0; rejected when bidsCount > 0.
 * 6. Persistence: Saved custom closing time persists across queries and simulated refreshes.
 */

import http from 'http';
import mongoose from 'mongoose';
import Auction from './src/models/Auction.js';
import User from './src/models/User.js';
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
  console.log('🧪 RUNNING CUSTOM AUCTION CLOSING DATE & TIME TEST SUITE');
  console.log('======================================================\n');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-auction');
    }

    const suffix = Date.now().toString().slice(-4);
    const sellerPayload = {
      name: 'Custom Deadline Seller',
      email: `custom.seller.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22CSR${Math.floor(100 + Math.random() * 890)}`
    };
    const bidderPayload = {
      name: 'Custom Deadline Bidder',
      email: `custom.bidder.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22ADR${Math.floor(100 + Math.random() * 890)}`
    };

    const regSeller = await req('/auth/register', { method: 'POST', body: JSON.stringify(sellerPayload) });
    const regBidder = await req('/auth/register', { method: 'POST', body: JSON.stringify(bidderPayload) });

    const tokenSeller = regSeller.data.token;
    const tokenBidder = regBidder.data.token;
    assert(tokenSeller && tokenBidder, 'Seller and Bidder registered and authenticated');

    // ---------------------------------------------------------
    // TEST 1: Backend rejects missing closingAt (no fallback to fixed duration)
    // ---------------------------------------------------------
    console.log('\n--- 1. Validation: Missing closingAt rejected ---');
    const missingClosing = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({
        title: `Item Missing Deadline ${suffix}`,
        category: 'electronics',
        condition: 'Good Condition',
        startingPrice: 500,
        minIncrement: 50,
        description: 'Should fail because closingAt is absent',
        pickupLocation: 'Library'
      })
    });
    assert(missingClosing.status === 400, 'POST /api/auctions without closingAt rejected with HTTP 400');
    assert(
      missingClosing.data.message.toLowerCase().includes('closing') || missingClosing.data.message.toLowerCase().includes('required'),
      `Error states closing time is required: "${missingClosing.data.message}"`
    );

    // ---------------------------------------------------------
    // TEST 2: Backend rejects invalid closingAt format
    // ---------------------------------------------------------
    console.log('\n--- 2. Validation: Invalid date format rejected ---');
    const invalidClosing = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({
        title: `Item Invalid Deadline ${suffix}`,
        category: 'electronics',
        condition: 'Good Condition',
        startingPrice: 500,
        minIncrement: 50,
        closingAt: 'not-a-valid-date-string',
        description: 'Should fail because closingAt is invalid',
        pickupLocation: 'Library'
      })
    });
    assert(invalidClosing.status === 400, 'POST /api/auctions with gibberish date rejected with HTTP 400');

    // ---------------------------------------------------------
    // TEST 3: Backend rejects past or <= 1 minute closingAt
    // ---------------------------------------------------------
    console.log('\n--- 3. Validation: Past or <=1 minute closingAt rejected ---');
    const pastClosing = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({
        title: `Item Past Deadline ${suffix}`,
        category: 'electronics',
        condition: 'Good Condition',
        startingPrice: 500,
        minIncrement: 50,
        closingAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        description: 'Should fail because closingAt is in the past',
        pickupLocation: 'Library'
      })
    });
    assert(pastClosing.status === 400, 'POST /api/auctions with past closingAt rejected with HTTP 400');

    const tooSoonClosing = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({
        title: `Item Too Soon Deadline ${suffix}`,
        category: 'electronics',
        condition: 'Good Condition',
        startingPrice: 500,
        minIncrement: 50,
        closingAt: new Date(Date.now() + 10 * 1000).toISOString(), // 10s from now (< 1 min)
        description: 'Should fail because closingAt is less than 1 minute into future',
        pickupLocation: 'Library'
      })
    });
    assert(tooSoonClosing.status === 400, 'POST /api/auctions with closingAt < 1 min rejected with HTTP 400');

    // ---------------------------------------------------------
    // TEST 4: Successful creation with valid custom deadline
    // ---------------------------------------------------------
    console.log('\n--- 4. Creation: Custom deadline stored as MongoDB Date ---');
    const targetCustomDate = new Date(Date.now() + 5 * 24 * 3600 * 1000 + 4 * 3600 * 1000); // 5 days + 4 hours
    const validCreate = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({
        title: `Scientific Calculator ${suffix}`,
        category: 'calculators',
        condition: 'Like New',
        startingPrice: 750,
        minIncrement: 50,
        closingAt: targetCustomDate.toISOString(),
        description: 'Casio fx-991EX ClassWiz for engineering math',
        pickupLocation: 'Mechanical Block 1st Floor'
      })
    });
    assert(validCreate.status === 201, 'Auction created successfully with custom deadline (HTTP 201)');
    const createdAuction = validCreate.data.auction;
    const storedDate = new Date(createdAuction.closingAt);
    assert(
      Math.abs(storedDate.getTime() - targetCustomDate.getTime()) < 1000,
      `Exact custom closingAt saved in MongoDB Date: ${storedDate.toISOString()}`
    );

    // ---------------------------------------------------------
    // TEST 5: Edit rules - update allowed before bids, rejected after bids
    // ---------------------------------------------------------
    console.log('\n--- 5. Edit rules: Updating custom deadline before and after bids ---');
    const updatedCustomDate = new Date(Date.now() + 7 * 24 * 3600 * 1000); // Extended to 7 days
    const editBeforeBids = await req(`/auctions/${createdAuction.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({
        closingAt: updatedCustomDate.toISOString()
      })
    });
    assert(editBeforeBids.status === 200, 'Seller can adjust custom closing time when 0 bids exist');
    const afterEditDate = new Date(editBeforeBids.data.auction.closingAt);
    assert(
      Math.abs(afterEditDate.getTime() - updatedCustomDate.getTime()) < 1000,
      `Updated closing time reflected: ${afterEditDate.toISOString()}`
    );

    // Place a bid by the bidder
    const placeBid = await req(`/auctions/${createdAuction.id}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBidder}` },
      body: JSON.stringify({ amount: 800 })
    });
    assert(placeBid.status === 201, 'Bidder placed initial bid of ₹800');

    // Attempt to alter deadline after bids exist
    const editAfterBids = await req(`/auctions/${createdAuction.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({
        closingAt: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString()
      })
    });
    assert(editAfterBids.status === 400, 'Attempt to alter custom deadline after bids exist rejected with HTTP 400');
    assert(
      editAfterBids.data.message.includes('cannot be altered') || editAfterBids.data.message.includes('terms'),
      `Fairness protection message returned: "${editAfterBids.data.message}"`
    );

    // ---------------------------------------------------------
    // TEST 6: Independent closing of auctions with different deadlines
    // ---------------------------------------------------------
    console.log('\n--- 6. Independent closing of auctions with different deadlines ---');
    // Auction Short: expires in 2 seconds
    const auctionShort = new Auction({
      title: `Short Deadline Item ${suffix}`,
      category: 'other',
      condition: 'Good Condition',
      startingPrice: 300,
      minIncrement: 20,
      currentPrice: 300,
      description: 'Auction with short deadline to test independent closing',
      closingAt: new Date(Date.now() + 2 * 1000), // 2 seconds
      pickupLocation: 'Admin Block',
      seller: regSeller.data.user.id || regSeller.data.user._id,
      sellerName: regSeller.data.user.name,
      sellerRoll: regSeller.data.user.studentId
    });
    await auctionShort.save();

    // Auction Long: expires in 120 seconds
    const auctionLong = new Auction({
      title: `Long Deadline Item ${suffix}`,
      category: 'other',
      condition: 'Good Condition',
      startingPrice: 400,
      minIncrement: 30,
      currentPrice: 400,
      description: 'Auction with long deadline to test independent closing',
      closingAt: new Date(Date.now() + 120 * 1000), // 120 seconds
      pickupLocation: 'Admin Block',
      seller: regSeller.data.user.id || regSeller.data.user._id,
      sellerName: regSeller.data.user.name,
      sellerRoll: regSeller.data.user.studentId
    });
    await auctionLong.save();

    console.log('  Waiting 3.5 seconds for short-deadline auction to expire...');
    await new Promise((r) => setTimeout(r, 3500));

    // Run close check
    await closeAuctionIfDue(auctionShort._id);
    await closeAuctionIfDue(auctionLong._id);

    const checkShort = await Auction.findById(auctionShort._id);
    const checkLong = await Auction.findById(auctionLong._id);

    assert(checkShort.status === 'unsold', `Short auction closed independently (status: ${checkShort.status})`);
    assert(checkLong.status === 'active', `Long auction remains active independently (status: ${checkLong.status})`);
    assert(new Date(checkLong.closingAt).getTime() > Date.now(), 'Long auction deadline preserved untouched');

    // ---------------------------------------------------------
    // TEST 7: Anti-sniping extension on custom deadline
    // ---------------------------------------------------------
    console.log('\n--- 7. Anti-sniping extension on custom deadline ---');
    const snipingAuction = new Auction({
      title: `Sniping Test Custom Item ${suffix}`,
      category: 'textbooks',
      condition: 'Excellent',
      startingPrice: 200,
      minIncrement: 20,
      currentPrice: 200,
      description: 'Test anti-sniping extension',
      closingAt: new Date(Date.now() + 20 * 1000), // 20s remaining (< 30s threshold)
      pickupLocation: 'Library',
      seller: regSeller.data.user.id || regSeller.data.user._id,
      sellerName: regSeller.data.user.name,
      sellerRoll: regSeller.data.user.studentId
    });
    await snipingAuction.save();

    const preDeadline = new Date(snipingAuction.closingAt).getTime();
    const snipingBid = await req(`/auctions/${snipingAuction._id}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenBidder}` },
      body: JSON.stringify({ amount: 250 })
    });
    assert(snipingBid.status === 201, 'Bid accepted within final 30 seconds');
    assert(snipingBid.data.extendedDeadline === true, 'Response indicates extendedDeadline === true');

    const freshSniping = await Auction.findById(snipingAuction._id);
    const postDeadline = new Date(freshSniping.closingAt).getTime();
    assert(postDeadline > preDeadline, 'Auction closingAt was pushed into the future');
    const diffSec = Math.round((postDeadline - Date.now()) / 1000);
    assert(diffSec >= 55 && diffSec <= 61, `Extended deadline is ~60s from bid acceptance (${diffSec}s remaining)`);

    // ---------------------------------------------------------
    // TEST 8: Persistence across page refresh (GET /api/auctions/:id)
    // ---------------------------------------------------------
    console.log('\n--- 8. Persistence across page refresh ---');
    const fetchRefreshed = await req(`/auctions/${createdAuction.id}`);
    assert(fetchRefreshed.status === 200, 'GET /api/auctions/:id successfully retrieved auction');
    const fetchedClosing = new Date(fetchRefreshed.data.auction.closingAt).getTime();
    assert(
      fetchedClosing === afterEditDate.getTime(),
      'Custom closingAt persists identically on subsequent reads (simulated page refresh)'
    );

    console.log('\n======================================================');
    console.log('🎉 ALL CUSTOM CLOSING DATE & TIME TESTS PASSED (8/8)!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
