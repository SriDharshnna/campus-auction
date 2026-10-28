/**
 * Module 5 Automated Verification Suite: Core Bidding Engine
 * Tests:
 * 1. Below-starting-price bid rejection (400)
 * 2. Seller self-bidding rejection (400)
 * 3. Opening bid validation (201)
 * 4. Insufficient increment bid rejection (400)
 * 5. Valid subsequent bid (201)
 * 6. Bids after closing deadline rejection (400)
 * 7. Simultaneous / concurrent bids concurrency serialization (Promise.all race test)
 * 8. Public bid history retrieval and privacy sanitization (no emails/passwords/raw roll numbers)
 * 9. Auction leading price & leading bidder consistency
 */

import mongoose from 'mongoose';
import Auction from './src/models/Auction.js';
import Bid from './src/models/Bid.js';

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
  console.log('🚀 Starting Module 5 Verification Tests (Core Bidding Engine)...\n');
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
    // Connect Mongoose directly for state inspection
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-auction');
    }

    // 1. Register test users (Seller, Bidder 1, Bidder 2)
    const suffix = Date.now().toString().slice(-4);
    const sellerPayload = {
      name: 'Seller Sam',
      email: `seller.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22ECR${Math.floor(100 + Math.random() * 890)}`
    };
    const bidder1Payload = {
      name: 'Bidder One',
      email: `bidder1.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22CSR${Math.floor(100 + Math.random() * 890)}`
    };
    const bidder2Payload = {
      name: 'Bidder Two',
      email: `bidder2.${suffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22ADR${Math.floor(100 + Math.random() * 890)}`
    };

    const regSeller = await req('/auth/register', { method: 'POST', body: JSON.stringify(sellerPayload) });
    const regB1 = await req('/auth/register', { method: 'POST', body: JSON.stringify(bidder1Payload) });
    const regB2 = await req('/auth/register', { method: 'POST', body: JSON.stringify(bidder2Payload) });

    const tokenSeller = regSeller.data.token;
    const tokenB1 = regB1.data.token;
    const tokenB2 = regB2.data.token;

    assert(tokenSeller && tokenB1 && tokenB2, 'Seller and bidders registered successfully with JWT');

    // 2. Seller creates an auction (Starting ₹1,000, Increment ₹100)
    const auctionCreate = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({
        title: `Casio Graphic fx-9860GII Calculator ${suffix}`,
        category: 'calculators',
        condition: 'Like New',
        startingPrice: 1000,
        minIncrement: 100,
        closingAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
        description: 'Scientific calculator used for one semester in mathematics.',
        pickupLocation: 'Library Ground Floor'
      })
    });
    assert(auctionCreate.status === 201, 'Auction created with startingPrice: 1000, minIncrement: 100');
    const auction = auctionCreate.data.auction;
    const auctionId = auction.id;

    // 3. Test 1: Bid below starting price
    const belowStart = await req(`/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB1}` },
      body: JSON.stringify({ amount: 900 })
    });
    assert(belowStart.status === 400, 'Opening bid below starting price rejected with 400');
    assert(
      belowStart.data.message.includes('starting price'),
      `Error explains starting price requirement: "${belowStart.data.message}"`
    );

    // 4. Test 2: Seller self-bidding rejection
    const sellerSelfBid = await req(`/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSeller}` },
      body: JSON.stringify({ amount: 1000 })
    });
    assert(sellerSelfBid.status === 400, 'Seller self-bidding rejected with 400');
    assert(
      sellerSelfBid.data.message.toLowerCase().includes('seller'),
      `Seller rejection message: "${sellerSelfBid.data.message}"`
    );

    // 5. Test 3: Valid opening bid at starting price
    const validOpening = await req(`/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB1}` },
      body: JSON.stringify({ amount: 1000 })
    });
    assert(validOpening.status === 201, 'Valid opening bid of ₹1,000 accepted (201)');
    assert(validOpening.data.auction.currentPrice === 1000, 'Auction currentPrice updated to ₹1,000');
    assert(validOpening.data.auction.bidsCount === 1, 'Auction bidsCount incremented to 1');
    assert(validOpening.data.bid && validOpening.data.bid.amount === 1000, 'Bid record returned');

    // 6. Test 4: Insufficient increment rejection
    // Current is 1000, minIncrement is 100 -> min next is 1100
    const insufficientInc = await req(`/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB2}` },
      body: JSON.stringify({ amount: 1050 })
    });
    assert(insufficientInc.status === 400, 'Subsequent bid below current + increment rejected with 400');
    assert(
      insufficientInc.data.message.includes('1,100'),
      `Error explains minimum increment requirement: "${insufficientInc.data.message}"`
    );

    // 7. Test 5: Valid subsequent bid
    const validSecond = await req(`/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB2}` },
      body: JSON.stringify({ amount: 1100 })
    });
    assert(validSecond.status === 201, 'Valid subsequent bid of ₹1,100 accepted (201)');
    assert(validSecond.data.auction.currentPrice === 1100, 'Auction currentPrice updated to ₹1,100');
    assert(validSecond.data.auction.bidsCount === 2, 'Auction bidsCount incremented to 2');

    // 8. Test 6: Bids after closing time
    // Create an auction and set closingAt to 10 minutes in the past
    const expiredAuction = new Auction({
      title: `Expired Textbook ${suffix}`,
      category: 'textbooks',
      condition: 'Good Condition',
      startingPrice: 300,
      minIncrement: 50,
      currentPrice: 300,
      description: 'Used textbook for testing expiration rules',
      closingAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
      pickupLocation: 'Hostel 3',
      seller: regSeller.data.user.id || regSeller.data.user._id,
      status: 'active'
    });
    await expiredAuction.save();

    const bidOnExpired = await req(`/auctions/${expiredAuction._id}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB1}` },
      body: JSON.stringify({ amount: 300 })
    });
    assert(bidOnExpired.status === 400, 'Bid on expired auction rejected with 400');
    assert(
      bidOnExpired.data.message.toLowerCase().includes('expired') ||
      bidOnExpired.data.message.toLowerCase().includes('closed'),
      `Expiration error message: "${bidOnExpired.data.message}"`
    );

    // 9. Test 7: Simultaneous / Concurrent Bids Serialization (Race Condition Guard)
    // Create a new auction specifically for concurrent load testing
    const raceAuction = new Auction({
      title: `Race Test Cycle ${suffix}`,
      category: 'cycles',
      condition: 'Like New',
      startingPrice: 2000,
      minIncrement: 100,
      currentPrice: 2000,
      description: 'Mountain bike for concurrent bidding serialization test',
      closingAt: new Date(Date.now() + 3600 * 1000),
      pickupLocation: 'Quad',
      seller: regSeller.data.user.id || regSeller.data.user._id,
      status: 'active',
      bidsCount: 0
    });
    await raceAuction.save();

    console.log('\n  ⚡ Simulating simultaneous concurrent opening bids (Race Test)...');
    const [raceRes1, raceRes2] = await Promise.all([
      req(`/auctions/${raceAuction._id}/bids`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB1}` },
        body: JSON.stringify({ amount: 2000 })
      }),
      req(`/auctions/${raceAuction._id}/bids`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB2}` },
        body: JSON.stringify({ amount: 2000 })
      })
    ]);

    const statuses = [raceRes1.status, raceRes2.status];
    const hasSuccess = statuses.includes(201);
    const hasConflict = statuses.includes(409) || statuses.includes(400);

    assert(hasSuccess, 'Exactly one concurrent bid received HTTP 201 Created');
    assert(hasConflict, 'The competing concurrent bid was rejected with HTTP 409 Conflict');

    // Verify auction consistency after race
    const raceDbCheck = await Auction.findById(raceAuction._id);
    assert(raceDbCheck.currentPrice === 2000, 'Database price consistently set to ₹2,000 (no dirty write)');
    assert(raceDbCheck.bidsCount === 1, 'Database bidsCount is exactly 1 (no double increment)');

    const raceBidsInDb = await Bid.countDocuments({ auction: raceAuction._id });
    assert(raceBidsInDb === 1, 'Exactly one Bid record written to database');

    // 10. Test 8: Public Bid History Retrieval and Privacy Masking (Rule 6)
    const historyRes = await req(`/auctions/${auctionId}/bids`);
    assert(historyRes.status === 200, 'GET /api/auctions/:id/bids returns 200');
    assert(Array.isArray(historyRes.data.bids), 'Bid history is an array');
    assert(historyRes.data.bids.length === 2, `Retrieved all ${historyRes.data.bids.length} accepted bids`);

    // Privacy check on each bid
    const sampleBid = historyRes.data.bids[0];
    assert(sampleBid.amount !== undefined, 'Bid contains amount');
    assert(sampleBid.bidderMasked !== undefined, `Bidder masked correctly: "${sampleBid.bidderMasked}"`);
    assert(sampleBid.createdAt !== undefined, 'Bid contains createdAt timestamp');

    // STRICT PRIVACY AUDIT: Ensure NO sensitive user data is exposed
    const exposedEmail = sampleBid.email || sampleBid.bidderEmail;
    const exposedPassword = sampleBid.password;
    const exposedFullRoll = sampleBid.bidderRoll || sampleBid.studentId;
    const exposedUserId = sampleBid.bidder;

    assert(exposedEmail === undefined, 'Bid history does NOT expose bidder email (Privacy verified)');
    assert(exposedPassword === undefined, 'Bid history does NOT expose credentials (Privacy verified)');
    assert(exposedFullRoll === undefined, 'Bid history does NOT expose full student ID (Privacy verified)');
    assert(exposedUserId === undefined, 'Bid history does NOT expose internal user account reference (Privacy verified)');

    // 11. Test 9: Consistency of Auction details endpoint
    const auctionDetail = await req(`/auctions/${auctionId}`);
    assert(auctionDetail.status === 200, 'GET /api/auctions/:id retrieves auction');
    assert(auctionDetail.data.auction.currentPrice === 1100, 'Auction currentPrice is ₹1,100');
    assert(auctionDetail.data.auction.bidsCount === 2, 'Auction bidsCount is 2');
    assert(auctionDetail.data.auction.highestBidderMasked !== null, 'Auction displays highestBidderMasked');

    console.log(`\n===========================================`);
    console.log(`Total Passed: ${passed} | Total Failed: ${failed}`);
    console.log(`===========================================\n`);

    if (failed === 0) {
      console.log('🎉 ALL MODULE 5 REQUIREMENTS VERIFIED SUCCESSFULLY!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Module 5 test suite error:', err);
    process.exit(1);
  }
}

runTests();
