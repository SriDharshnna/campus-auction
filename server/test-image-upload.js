/**
 * Automated Verification Suite: Device Image Upload & Multi-Image Listings
 *
 * Tests:
 * 1. Health check & Seller authentication
 * 2. POST /api/upload with valid images (JPEG, PNG, WEBP) -> 200, returns /uploads/... URLs
 * 3. Static serving of uploaded images via GET /uploads/:filename -> 200, correct Content-Type
 * 4. Validation: reject unsupported file extensions/mime types (.txt, .pdf) -> 400
 * 5. Validation: reject oversized files (> 5MB) -> 400
 * 6. Validation: reject more than 5 files -> 400
 * 7. POST /api/upload/single endpoint -> 200, returns single url
 * 8. Auction creation with uploaded image URLs -> verifies MongoDB stores valid /uploads/... paths (not C:\fakepath)
 * 9. Auction update (PUT /api/auctions/:id) with updated imageUrls
 * 10. Verification of image presence on public auction detail retrieval (GET /api/auctions/:id)
 */

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🚀 Starting Device Image Upload & Storage Verification Suite...\n');
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
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'ok', 'Server is healthy and running on port 5000');

    // 2. Register a test seller
    const uniqueSuffix = Date.now().toString().slice(-4);
    const randomRoll = Math.floor(100 + Math.random() * 890).toString();
    const sellerData = {
      name: 'Image Test Seller',
      email: `seller.img.${uniqueSuffix}@kongu.edu`,
      password: 'Password123!',
      studentId: `23ADR${randomRoll}`
    };

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sellerData)
    });
    const regData = await regRes.json();
    const token = regData.token;
    assert(regRes.status === 201 && token, 'Seller registered and JWT token acquired');

    // Helper: Create simulated image buffers
    // 1x1 8-bit PNG byte signature
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82
    ]);

    // JPEG header signature
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xd9]);

    // WEBP signature
    const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c, 0x0e, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x00, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

    // 3. Test multi-image upload: 3 valid images (PNG, JPEG, WEBP)
    console.log('\n--- Test 1: Uploading multiple valid images (PNG, JPEG, WEBP) ---');
    const validFormData = new FormData();
    validFormData.append('images', new Blob([pngBytes], { type: 'image/png' }), 'device_photo1.png');
    validFormData.append('images', new Blob([jpegBytes], { type: 'image/jpeg' }), 'device_photo2.jpg');
    validFormData.append('images', new Blob([webpBytes], { type: 'image/webp' }), 'device_photo3.webp');

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: validFormData
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 200, `POST /api/upload returns status 200 (got ${uploadRes.status})`);
    assert(uploadData.count === 3, `Upload response reports 3 files uploaded (got ${uploadData.count})`);
    assert(Array.isArray(uploadData.urls) && uploadData.urls.length === 3, 'Returned urls array contains 3 paths');
    assert(uploadData.urls.every(u => u.startsWith('/uploads/item-')), 'All URLs start with /uploads/item- and do not contain device paths');
    assert(uploadData.primaryUrl === uploadData.urls[0], 'primaryUrl matches the first image in the collection');

    // 4. Test Express static serving of uploaded image
    console.log('\n--- Test 2: Verifying static image serving via GET /uploads/:filename ---');
    const testImageUrl = uploadData.urls[0];
    const staticRes = await fetch(`${BASE_URL}${testImageUrl}`);
    assert(staticRes.status === 200, `GET ${testImageUrl} returns HTTP 200`);
    assert(staticRes.headers.get('content-type')?.includes('image'), `Static image Content-Type is image/* (got ${staticRes.headers.get('content-type')})`);

    // 5. Validation Test: Reject unsupported file format (e.g. .pdf or .txt)
    console.log('\n--- Test 3: Rejecting unsupported file formats ---');
    const invalidFormatData = new FormData();
    invalidFormatData.append('images', new Blob(['Hello text file content'], { type: 'text/plain' }), 'document.txt');

    const invalidFormatRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: invalidFormatData
    });
    const invalidFormatJson = await invalidFormatRes.json();
    assert(invalidFormatRes.status === 400, `Unsupported file format (.txt) rejected with 400 (got ${invalidFormatRes.status})`);
    assert(invalidFormatJson.message?.includes('Only JPG, JPEG, PNG, and WEBP'), `Error message clearly explains format constraint: "${invalidFormatJson.message}"`);

    // 6. Validation Test: Reject oversized file (> 5MB)
    console.log('\n--- Test 4: Rejecting oversized files (> 5MB) ---');
    const largeBuffer = new Uint8Array(6 * 1024 * 1024); // 6MB
    largeBuffer.set(jpegBytes, 0); // Fake jpeg header
    const oversizedFormData = new FormData();
    oversizedFormData.append('images', new Blob([largeBuffer], { type: 'image/jpeg' }), 'oversized_photo.jpg');

    const oversizedRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: oversizedFormData
    });
    const oversizedJson = await oversizedRes.json();
    assert(oversizedRes.status === 400, `Oversized file (> 5MB) rejected with 400 (got ${oversizedRes.status})`);
    assert(oversizedJson.message?.toLowerCase().includes('limit') || oversizedJson.message?.toLowerCase().includes('large'), `Error message notes file size limit: "${oversizedJson.message}"`);

    // 7. Validation Test: Reject more than 5 files in a single request
    console.log('\n--- Test 5: Rejecting more than 5 files ---');
    const tooManyFormData = new FormData();
    for (let i = 1; i <= 6; i++) {
      tooManyFormData.append('images', new Blob([pngBytes], { type: 'image/png' }), `photo_${i}.png`);
    }

    const tooManyRes = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: tooManyFormData
    });
    assert(tooManyRes.status === 400, `Exceeding 5 files rejected with 400 (got ${tooManyRes.status})`);

    // 8. Test Single Image Upload endpoint
    console.log('\n--- Test 6: Single image upload endpoint ---');
    const singleFormData = new FormData();
    singleFormData.append('image', new Blob([jpegBytes], { type: 'image/jpeg' }), 'single_photo.jpg');

    const singleRes = await fetch(`${BASE_URL}/api/upload/single`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: singleFormData
    });
    const singleData = await singleRes.json();
    assert(singleRes.status === 200 && singleData.url?.startsWith('/uploads/'), 'POST /api/upload/single succeeds and returns image url');

    // 9. Test Auction Creation with Uploaded Device Images
    console.log('\n--- Test 7: Creating auction with uploaded image references ---');
    const closingTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const auctionPayload = {
      title: 'KTM Mountain Bike 21-Speed',
      category: 'cycles',
      condition: 'Excellent',
      startingPrice: 3500,
      minIncrement: 100,
      closingAt: closingTime,
      pickupLocation: 'Hostel 3 Bicycle Stand',
      description: 'Used for 1 semester, excellent condition, dual disc brakes.',
      imageUrl: uploadData.primaryUrl,
      imageUrls: uploadData.urls
    };

    const createRes = await fetch(`${BASE_URL}/api/auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(auctionPayload)
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, `Auction created successfully with status 201 (got ${createRes.status})`);

    const createdAuction = createData.auction;
    assert(createdAuction.imageUrl === uploadData.primaryUrl, `Auction.imageUrl correctly saved as "${createdAuction.imageUrl}"`);
    assert(Array.isArray(createdAuction.imageUrls) && createdAuction.imageUrls.length === 3, 'Auction.imageUrls array correctly saved with all 3 uploaded images');
    assert(!createdAuction.imageUrl.includes('fakepath') && !createdAuction.imageUrl.includes('C:\\'), 'No local filesystem device paths stored in MongoDB');

    // 10. Test Public Retrieval of Listing (details page API)
    console.log('\n--- Test 8: Public retrieval of listing details ---');
    const getRes = await fetch(`${BASE_URL}/api/auctions/${createdAuction._id || createdAuction.id}`);
    const getData = await getRes.json();
    assert(getRes.status === 200, 'GET /api/auctions/:id succeeds with 200');
    assert(getData.auction.imageUrl === uploadData.primaryUrl, 'Public details response includes valid imageUrl');
    assert(Array.isArray(getData.auction.imageUrls) && getData.auction.imageUrls.length === 3, 'Public details response includes full imageUrls collection');

    // 11. Test Updating Auction Images (PUT /api/auctions/:id)
    console.log('\n--- Test 9: Updating auction with replacement images ---');
    const updateRes = await fetch(`${BASE_URL}/api/auctions/${createdAuction._id || createdAuction.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        description: 'Updated description: includes helmet and cable lock.',
        imageUrl: singleData.url,
        imageUrls: [singleData.url]
      })
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'PUT /api/auctions/:id returns 200');
    assert(updateData.auction.imageUrl === singleData.url, `Auction.imageUrl successfully replaced with new upload "${singleData.url}"`);
    assert(updateData.auction.imageUrls.length === 1 && updateData.auction.imageUrls[0] === singleData.url, 'Auction.imageUrls updated with replaced image collection');

    console.log(`\n========================================`);
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTests();
