/**
 * Automated Verification Suite: Highest Bidder Display
 */
import mongoose from 'mongoose';
import Auction from './src/models/Auction.js';
import Bid from './src/models/Bid.js';
import User from './src/models/User.js';

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
  console.log('🚀 Starting Highest Bidder Display Verification Tests...\n');
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

    // 1. Register Seller and two distinct Bidders
    const sellerRes = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Prof Vikram',
        email: `prof.${suffix}@campus.edu`,
        password: 'Password123!',
        studentId: `20ECR${Math.floor(100 + Math.random() * 890)}`,
        department: 'Electronics & Communication Engineering'
      })
    });
    const sellerToken = sellerRes.data.token;

    const bidder1Res = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Aarav Patel',
        email: `aarav.${suffix}@campus.edu`,
        password: 'Password123!',
        studentId: `22CSR${Math.floor(100 + Math.random() * 890)}`,
        department: 'Computer Science & Engineering'
      })
    });
    const bidder1Token = bidder1Res.data.token;

    const bidder2Res = await req('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Diya Sen',
        email: `diya.${suffix}@campus.edu`,
        password: 'Password123!',
        studentId: `23ADR${Math.floor(100 + Math.random() * 890)}`,
        department: 'Artificial Intelligence & Data Science'
      })
    });
    const bidder2Token = bidder2Res.data.token;

    assert(sellerToken && bidder1Token && bidder2Token, 'Seller and two distinct bidders registered successfully');

    // 2. Create Auction Listing
    const createRes = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({
        title: `TI-Nspire CX II Graphing Calculator - ${suffix}`,
        category: 'calculators',
        condition: 'Like New',
        description: 'Color graphing calculator for advanced calculus and linear algebra.',
        startingPrice: 3000,
        minIncrement: 150,
        closingAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        pickupLocation: 'Academic Block A, Ground Floor'
      })
    });

    assert(createRes.status === 201, 'Auction created successfully');
    const auctionId = createRes.data.auction.id || createRes.data.auction._id;

    // 3. Verify state before any bids (Zero bids state)
    const detailInitial = await req(`/auctions/${auctionId}`);
    assert(detailInitial.status === 200, 'GET /api/auctions/:id returned 200 for initial listing');
    assert(detailInitial.data.auction.bidsCount === 0, 'Initial auction bidsCount is 0');
    assert(
      !detailInitial.data.auction.highestBidderName && !detailInitial.data.auction.highestBidder,
      'Initial auction has no highest bidder (triggers "No bids yet" label)'
    );
    assert(
      detailInitial.data.auction.seller?.name === 'Prof Vikram',
      'Seller name is clearly "Prof Vikram"'
    );

    // Also check GET /api/auctions list endpoint
    const listInitial = await req(`/auctions?search=${encodeURIComponent(suffix)}`);
    assert(listInitial.status === 200, 'GET /api/auctions returned 200');
    const foundCardInitial = listInitial.data.auctions.find(a => (a.id || a._id) === auctionId);
    assert(foundCardInitial, 'Auction found in marketplace list');
    assert(foundCardInitial.bidsCount === 0, 'Card auction bidsCount is 0');
    assert(!foundCardInitial.highestBidderName, 'Card auction highestBidderName is null (displays "No bids yet")');

    // 4. Place First Bid by Bidder 1 ("Aarav Patel")
    const bid1Res = await req(`/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bidder1Token}` },
      body: JSON.stringify({ amount: 3000 })
    });

    assert(bid1Res.status === 201, 'Bidder 1 placed opening bid of ₹3,000 (201)');
    assert(bid1Res.data.auction.currentPrice === 3000, 'Current price updated to ₹3,000');
    assert(bid1Res.data.auction.bidsCount === 1, 'Bids count updated to 1');
    assert(
      bid1Res.data.auction.highestBidderName === 'Aarav Patel',
      'Response auction.highestBidderName is exact display name "Aarav Patel"'
    );
    assert(
      !/^[0-9a-fA-F]{24}$/.test(bid1Res.data.auction.highestBidderName),
      'Highest bidder is NOT a user ID hex string'
    );

    // 5. Query GET /api/auctions/:id to verify persistent backend retrieval
    const detailAfterBid1 = await req(`/auctions/${auctionId}`);
    assert(detailAfterBid1.status === 200, 'GET /api/auctions/:id returned 200 after first bid');
    assert(
      detailAfterBid1.data.auction.highestBidderName === 'Aarav Patel',
      'GET /api/auctions/:id provides highestBidderName: "Aarav Patel"'
    );
    assert(
      detailAfterBid1.data.auction.highestBidder?.name === 'Aarav Patel',
      'Populated highestBidder object contains name: "Aarav Patel"'
    );
    assert(
      detailAfterBid1.data.auction.seller?.name === 'Prof Vikram',
      'Seller name "Prof Vikram" is completely distinct from Highest Bidder "Aarav Patel"'
    );

    // 6. Query GET /api/auctions to verify auction cards in catalog get highestBidderName
    const listAfterBid1 = await req(`/auctions?search=${encodeURIComponent(suffix)}`);
    const foundCardBid1 = listAfterBid1.data.auctions.find(a => (a.id || a._id) === auctionId);
    assert(foundCardBid1, 'Auction card returned in catalog query');
    assert(
      foundCardBid1.highestBidderName === 'Aarav Patel',
      'Catalog card payload has highestBidderName: "Aarav Patel"'
    );
    assert(
      foundCardBid1.seller?.name === 'Prof Vikram',
      'Catalog card payload preserves Seller: "Prof Vikram"'
    );

    // 7. Place Outbid by Bidder 2 ("Diya Sen")
    const bid2Res = await req(`/auctions/${auctionId}/bids`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bidder2Token}` },
      body: JSON.stringify({ amount: 3200 })
    });

    assert(bid2Res.status === 201, 'Bidder 2 placed outbid of ₹3,200 (201)');
    assert(bid2Res.data.auction.currentPrice === 3200, 'Current price updated to ₹3,200');
    assert(bid2Res.data.auction.bidsCount === 2, 'Bids count updated to 2');
    assert(
      bid2Res.data.auction.highestBidderName === 'Diya Sen',
      'Highest bidder name updated immediately to "Diya Sen"'
    );

    // 8. Re-verify GET endpoints after outbid
    const detailAfterBid2 = await req(`/auctions/${auctionId}`);
    assert(
      detailAfterBid2.data.auction.highestBidderName === 'Diya Sen',
      'GET /api/auctions/:id reflects new highest bidder: "Diya Sen"'
    );
    assert(
      detailAfterBid2.data.auction.highestBidder?.name === 'Diya Sen',
      'Populated highestBidder reflects new highest bidder: "Diya Sen"'
    );

    const listAfterBid2 = await req(`/auctions?search=${encodeURIComponent(suffix)}`);
    const foundCardBid2 = listAfterBid2.data.auctions.find(a => (a.id || a._id) === auctionId);
    assert(
      foundCardBid2.highestBidderName === 'Diya Sen',
      'Catalog card reflects updated highest bidder: "Diya Sen"'
    );

    console.log('\n===========================================');
    console.log(`Total Passed: ${passed} | Total Failed: ${failed}`);
    console.log('===========================================\n');

    if (failed === 0) {
      console.log('🎉 ALL HIGHEST BIDDER DISPLAY REQUIREMENTS VERIFIED SUCCESSFULLY!');
    }
  } catch (err) {
    console.error('Fatal test execution error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
