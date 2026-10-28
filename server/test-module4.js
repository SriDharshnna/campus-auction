/**
 * Module 4 Automated Verification Suite
 * Tests:
 * 1. GET /api/auctions with search, category, condition, price range, sorting
 * 2. GET /api/auctions/:id (populated seller & 404 handling)
 * 3. POST /api/auctions validation (401 without auth, 400 on negative price/invalid date)
 * 4. POST /api/auctions creation by authenticated user (201, seller derived)
 * 5. PUT /api/auctions/:id authorization (403 for other user, 200 for owner)
 * 6. Bidding lock protection (400 if bidsCount > 0 and changing price/terms)
 * 7. Soft cancellation (DELETE /api/auctions/:id soft delete, preserve record)
 * 8. POST /api/auctions/:id/questions (201)
 */

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
  console.log('🚀 Starting Module 4 Verification Tests...\n');
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
    // 1. Health check
    const health = await req('/health');
    assert(health.status === 200 && health.data.status === 'ok', 'Health check is alive');

    // 2. Public listings retrieval
    const listings = await req('/auctions');
    assert(listings.status === 200 && Array.isArray(listings.data.auctions), 'GET /api/auctions returns auction list');
    assert(listings.data.auctions.length > 0, `Returned ${listings.data.auctions.length} seeded auctions`);

    const firstAuction = listings.data.auctions[0];
    const auctionId = firstAuction.id;

    // 3. Keyword Search
    const searchWord = firstAuction.title.split(' ')[0];
    const searchRes = await req(`/auctions?search=${encodeURIComponent(searchWord)}`);
    assert(searchRes.status === 200 && searchRes.data.auctions.some(a => a.title.toLowerCase().includes(searchWord.toLowerCase())), `Keyword search matches title for "${searchWord}"`);

    // 4. Category Filter
    const catRes = await req('/auctions?category=cycles');
    assert(catRes.status === 200 && catRes.data.auctions.every(a => a.category === 'cycles'), 'Category filter returns only cycles');

    // 4b. Condition Filter
    const condRes = await req('/auctions?condition=Like%20New');
    assert(condRes.status === 200 && condRes.data.auctions.every(a => a.condition === 'Like New'), 'Condition filter returns only items in specified condition');

    // 4c. Price Range Filter
    const priceRangeRes = await req('/auctions?minPrice=500&maxPrice=3000');
    assert(
      priceRangeRes.status === 200 &&
      priceRangeRes.data.auctions.every(a => a.currentPrice >= 500 && a.currentPrice <= 3000),
      'Price range filter matches auctions between 500 and 3000'
    );

    // 4d. Closing-soon filter (< 1 hour remaining)
    const closingSoonRes = await req('/auctions?closingSoon=true');
    const oneHourLater = Date.now() + 60 * 60 * 1000 + 5000;
    assert(
      closingSoonRes.status === 200 &&
      closingSoonRes.data.auctions.every(a => new Date(a.closingAt).getTime() <= oneHourLater),
      'Closing-soon filter returns auctions ending within 1 hour'
    );

    // 5. Price Sorting
    const sortRes = await req('/auctions?sort=priceLow');
    const prices = sortRes.data.auctions.map(a => a.currentPrice);
    const isSorted = prices.every((p, i) => i === 0 || p >= prices[i - 1]);
    assert(sortRes.status === 200 && isSorted, 'Sorting by priceLow correctly orders prices ascending');

    // 6. Retrieval by ID
    const single = await req(`/auctions/${auctionId}`);
    assert(single.status === 200 && single.data.auction.id === auctionId, 'GET /api/auctions/:id retrieves single auction');
    assert(single.data.auction.seller && single.data.auction.seller.name, 'Seller details populated on auction');

    // 7. Non-existent ID returns 404
    const notFound = await req('/auctions/666666666666666666666666');
    assert(notFound.status === 404, 'Non-existent auction returns 404 Not Found');

    // 8. Auth tests: register Seller A and Seller B
    const uniqueSuffix = Date.now().toString().slice(-4);
    const randomRoll1 = Math.floor(100 + Math.random() * 890).toString();
    const randomRoll2 = Math.floor(100 + Math.random() * 890).toString();
    const sellerAData = {
      name: 'Seller Alice',
      email: `alice.${uniqueSuffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22ADR${randomRoll1}`
    };
    const sellerBData = {
      name: 'Seller Bob',
      email: `bob.${uniqueSuffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `22CSR${randomRoll2}`
    };

    const regA = await req('/auth/register', { method: 'POST', body: JSON.stringify(sellerAData) });
    const tokenA = regA.data.token;
    assert(regA.status === 201 && tokenA, 'Seller A registered and received JWT');

    const regB = await req('/auth/register', { method: 'POST', body: JSON.stringify(sellerBData) });
    const tokenB = regB.data.token;
    assert(regB.status === 201 && tokenB, 'Seller B registered and received JWT');

    // 9. Unauthorized listing creation (without token)
    const noAuthCreate = await req('/auctions', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Draft cycle',
        category: 'cycles',
        startingPrice: 1500,
        minIncrement: 100,
        description: 'Test description',
        pickupLocation: 'Hostel 1'
      })
    });
    assert(noAuthCreate.status === 401, 'POST /api/auctions without token fails with 401');

    // 10. Validation failure: negative starting price
    const invalidPrice = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: 'Invalid Price Cycle',
        category: 'cycles',
        startingPrice: -500,
        minIncrement: 100,
        description: 'Test description',
        pickupLocation: 'Hostel 1'
      })
    });
    assert(invalidPrice.status === 400, 'POST /api/auctions with negative price fails with 400');

    // 11. Validation failure: past closing date
    const pastClosing = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: 'Past Date Cycle',
        category: 'cycles',
        startingPrice: 1500,
        minIncrement: 100,
        closingAt: new Date(Date.now() - 3600000).toISOString(),
        description: 'Test description',
        pickupLocation: 'Hostel 1'
      })
    });
    assert(pastClosing.status === 400, 'POST /api/auctions with past closing date fails with 400');

    // 12. Successful creation by Seller A
    const validCreate = await req('/auctions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: `Alice Special Hercules Cycle ${uniqueSuffix}`,
        category: 'cycles',
        condition: 'Good Condition',
        startingPrice: 2200,
        minIncrement: 100,
        closingAt: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        description: 'Original single speed bicycle with front basket and lock.',
        pickupLocation: 'Girls Hostel 2 Portico'
      })
    });
    assert(validCreate.status === 201, 'Seller A created listing successfully (201)');
    const createdAuction = validCreate.data.auction;
    const sellerId = createdAuction.seller?.id || createdAuction.seller?._id || createdAuction.seller;
    const expectedUserId = regA.data.user.id || regA.data.user._id;
    assert(sellerId?.toString() === expectedUserId?.toString(), 'Seller identity derived from auth token');

    // 13. Unauthorized edit by Seller B (Forbidden)
    const unauthEdit = await req(`/auctions/${createdAuction.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        title: 'Hacked Title By Bob'
      })
    });
    assert(unauthEdit.status === 403, 'Seller B cannot edit Seller A listing (403 Forbidden)');

    // 14. Authorized edit by Seller A
    const authEdit = await req(`/auctions/${createdAuction.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        title: `Alice Special Hercules Cycle (Updated) ${uniqueSuffix}`,
        pickupLocation: 'Girls Hostel 2 Main Entrance'
      })
    });
    assert(authEdit.status === 200, 'Seller A can edit their own listing before bids (200)');
    assert(authEdit.data.auction.pickupLocation === 'Girls Hostel 2 Main Entrance', 'Updated field persists');

    // 15. Bidding lock test: simulated bidsCount > 0
    // Connect Mongoose to simulate bidsCount > 0 for lock testing
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus-auction');
    }
    const Auction = (await import('./src/models/Auction.js')).default;
    await Auction.findByIdAndUpdate(createdAuction.id, { bidsCount: 2, currentPrice: 2400 });

    const forbiddenPriceAlter = await req(`/auctions/${createdAuction.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        startingPrice: 3000
      })
    });
    assert(forbiddenPriceAlter.status === 400, 'Altering price after bids have started is rejected (400)');

    // 16. Post a Question
    const questionRes = await req(`/auctions/${createdAuction.id}/questions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({
        question: 'Does this cycle have air filled in both tires?',
        askerName: 'Bob Student'
      })
    });
    assert(questionRes.status === 201, 'POST /questions successfully adds student question (201)');
    assert(questionRes.data.auction.questions.length > 0, 'Questions list contains the new inquiry');

    // 17. Unauthorized cancellation by Seller B
    const unauthCancel = await req(`/auctions/${createdAuction.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ reason: 'Malicious cancellation attempt' })
    });
    assert(unauthCancel.status === 403, 'Seller B cannot cancel Seller A listing (403 Forbidden)');

    // 18. Soft cancellation by Seller A
    const authCancel = await req(`/auctions/${createdAuction.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ reason: 'Decided to gift to junior directly' })
    });
    assert(authCancel.status === 200, 'Seller A cancelled listing successfully (200)');
    assert(authCancel.data.auction.status === 'cancelled', 'Auction status marked as cancelled (soft delete)');

    // Verify record is preserved in DB (not silently deleted)
    const dbRecord = await Auction.findById(createdAuction.id);
    assert(dbRecord !== null && dbRecord.status === 'cancelled', 'Audit trail preserved: record still exists in database');
    assert(dbRecord.cancellationReason === 'Decided to gift to junior directly', 'Cancellation reason saved');

    console.log(`\n===========================================`);
    console.log(`Total Passed: ${passed} | Total Failed: ${failed}`);
    console.log(`===========================================\n`);

    if (failed === 0) {
      console.log('🎉 ALL MODULE 4 REQUIREMENTS VERIFIED SUCCESSFULLY!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite failed with unexpected error:', err);
    process.exit(1);
  }
}

runTests();
