/**
 * Complete Search Functionality Automated Verification Suite
 *
 * Tests against actual running MongoDB database & Express backend:
 * 1. Repeated & Changing Searches:
 *    - cycle -> books -> cycle
 *    - laptop -> book -> laptop
 *    - Same keyword repeated 5 times -> identical consistent results
 *    - Valid keyword -> unmatched keyword -> valid keyword again
 * 2. Flexible Keyword Matching (case-insensitive, multi-word, any order, partial words):
 *    - "Gear Cycle"
 *    - "gear cycle"
 *    - "GEAR CYCLE"
 *    - "cycle gear"
 *    - "gear cyc"
 *    - "cycle"
 *    - Extra spaces: "   gear    cycle   "
 *    - Special characters / regex escaping: "fx-991EX (14th)"
 * 3. Filters & Controls:
 *    - Search with no category selected
 *    - Search with category selected (e.g. category=cycles)
 *    - Category mismatch handling (e.g. search=books&category=cycles -> 0 results)
 *    - Sort combination (e.g. search=calculator&sort=priceLow -> ascending prices)
 *    - Empty input -> returns all eligible active listings
 * 4. Auction Eligibility:
 *    - Only active listings with closingAt in future returned
 *    - Expired/unsold listings excluded
 */

const BASE_URL = 'http://localhost:5000/api';

async function queryAuctions(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      searchParams.append(k, v);
    }
  });
  const qs = searchParams.toString();
  const url = `${BASE_URL}/auctions${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  return { status: res.status, data };
}

async function runCompleteSearchTests() {
  console.log('🚀 Starting Complete Search Functionality Verification Suite...\n');
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
    // Check Health
    const health = await fetch(`${BASE_URL}/health`);
    assert(health.status === 200, 'Server is running and healthy on port 5000');

    // Baseline: Empty search returns all active items
    const baseline = await queryAuctions();
    assert(baseline.status === 200, 'Empty search returns HTTP 200');
    assert(baseline.data.auctions.length > 0, `Baseline search returned ${baseline.data.auctions.length} active listings`);
    const totalActive = baseline.data.auctions.length;

    // SECTION 1: Repeated and changing searches
    console.log('\n--- Section 1: Repeated & Changing Keyword Searches ---');

    // 1.1: cycle -> books -> cycle
    const cycle1 = await queryAuctions({ search: 'cycle' });
    assert(cycle1.status === 200 && cycle1.data.auctions.length > 0, `Search "cycle" returned ${cycle1.data.auctions.length} listings`);

    const books1 = await queryAuctions({ search: 'books' });
    assert(books1.status === 200 && books1.data.auctions.length > 0, `Search "books" returned ${books1.data.auctions.length} listings`);

    const cycle2 = await queryAuctions({ search: 'cycle' });
    assert(cycle2.status === 200 && cycle2.data.auctions.length === cycle1.data.auctions.length, `Searching "cycle" again returns identical count (${cycle2.data.auctions.length})`);

    // 1.2: laptop -> book -> laptop
    const laptop1 = await queryAuctions({ search: 'laptop' });
    assert(laptop1.status === 200, 'Search "laptop" returns HTTP 200');

    const book1 = await queryAuctions({ search: 'book' });
    assert(book1.status === 200 && book1.data.auctions.length > 0, `Search "book" returned ${book1.data.auctions.length} listings`);

    const laptop2 = await queryAuctions({ search: 'laptop' });
    assert(laptop2.status === 200 && laptop2.data.auctions.length === laptop1.data.auctions.length, `Searching "laptop" again returns identical count (${laptop2.data.auctions.length})`);

    // 1.3: Repeated searches for the same keyword 5 times
    const repFirst = await queryAuctions({ search: 'calculator' });
    const expectedCalcCount = repFirst.data.auctions.length;
    let repeatConsistent = expectedCalcCount > 0;
    for (let i = 0; i < 5; i++) {
      const rep = await queryAuctions({ search: 'calculator' });
      if (rep.data.auctions.length !== expectedCalcCount) {
        repeatConsistent = false;
      }
    }
    assert(repeatConsistent, `Repeating the same search 5 consecutive times yields identical consistent results (${expectedCalcCount} items)`);

    // 1.4: Valid keyword -> unmatched keyword -> valid keyword again
    const valid1 = await queryAuctions({ search: 'monitor' });
    assert(valid1.data.auctions.length > 0, `Search "monitor" found ${valid1.data.auctions.length} item(s)`);

    const unmatch = await queryAuctions({ search: 'xyzunmatchedkeyword123' });
    assert(unmatch.data.auctions.length === 0, 'Unmatched keyword returns 0 results');

    const valid2 = await queryAuctions({ search: 'monitor' });
    assert(valid2.data.auctions.length === valid1.data.auctions.length, 'Re-running valid search recovers all items after zero-result search');

    // SECTION 2: Flexible Keyword Matching
    console.log('\n--- Section 2: Flexible Keyword Matching (Multi-word, Any Order, Partial Words, Regex Safe) ---');

    const gearCycle1 = await queryAuctions({ search: 'Gear Cycle' });
    assert(gearCycle1.data.auctions.some(a => a.title.toLowerCase().includes('gear') || a.description.toLowerCase().includes('gear cycle')), 'Search "Gear Cycle" finds the gear cycle item');

    const gearCycle2 = await queryAuctions({ search: 'gear cycle' });
    assert(gearCycle2.data.auctions.length === gearCycle1.data.auctions.length, 'Lowercase "gear cycle" returns identical matches as "Gear Cycle"');

    const gearCycleUpper = await queryAuctions({ search: 'GEAR CYCLE' });
    assert(gearCycleUpper.data.auctions.length === gearCycle1.data.auctions.length, 'Uppercase "GEAR CYCLE" returns identical matches');

    const cycleGear = await queryAuctions({ search: 'cycle gear' });
    assert(cycleGear.data.auctions.length === gearCycle1.data.auctions.length, 'Reversed word order "cycle gear" successfully matches "gear cycle" item');

    const gearCyc = await queryAuctions({ search: 'gear cyc' });
    assert(gearCyc.data.auctions.length >= gearCycle1.data.auctions.length, 'Partial word search "gear cyc" matches the item');

    const cycleSingle = await queryAuctions({ search: 'cycle' });
    assert(cycleSingle.data.auctions.length >= gearCycle1.data.auctions.length, 'Single word "cycle" matches all cycles including gear cycle');

    // Extra spaces
    const extraSpaces = await queryAuctions({ search: '   gear     cycle   ' });
    assert(extraSpaces.data.auctions.length === gearCycle1.data.auctions.length, 'Extra leading, trailing, and inter-word spaces are ignored properly');

    // Special regex characters escaping (e.g. parentheses, plus)
    const specialChars = await queryAuctions({ search: 'Calculus (14th' });
    assert(specialChars.status === 200 && specialChars.data.auctions.length > 0, 'Parentheses and special regex characters do not crash or corrupt the search query');

    // SECTION 3: Category Filters and Sorting
    console.log('\n--- Section 3: Category Filters and Sorting Integration ---');

    // 3.1: Search with no category selected
    const allCat = await queryAuctions({ search: 'calculator', category: 'all' });
    assert(allCat.data.auctions.length > 0, `Search with category="all" finds ${allCat.data.auctions.length} calculators`);

    // 3.2: Search with matching category selected
    const matchingCat = await queryAuctions({ search: 'calculator', category: 'calculators' });
    assert(matchingCat.data.auctions.length > 0 && matchingCat.data.auctions.every(a => a.category === 'calculators'), 'Search with category="calculators" only returns calculator items');

    // 3.3: Search with mismatched category
    const mismatchCat = await queryAuctions({ search: 'books', category: 'cycles' });
    assert(mismatchCat.data.auctions.length === 0, 'Combining keyword "books" with category "cycles" correctly returns 0 items');

    // 3.4: Sorting by price low-to-high
    const sortedLow = await queryAuctions({ search: 'calculator', sort: 'priceLow' });
    let isAscending = true;
    for (let i = 0; i < sortedLow.data.auctions.length - 1; i++) {
      if (sortedLow.data.auctions[i].currentPrice > sortedLow.data.auctions[i + 1].currentPrice) {
        isAscending = false;
      }
    }
    assert(sortedLow.status === 200 && isAscending, 'Sorting by priceLow correctly orders matching search results ascending');

    // 3.5: Sorting by price high-to-low
    const sortedHigh = await queryAuctions({ search: 'calculator', sort: 'priceHigh' });
    let isDescending = true;
    for (let i = 0; i < sortedHigh.data.auctions.length - 1; i++) {
      if (sortedHigh.data.auctions[i].currentPrice < sortedHigh.data.auctions[i + 1].currentPrice) {
        isDescending = false;
      }
    }
    assert(sortedHigh.status === 200 && isDescending, 'Sorting by priceHigh correctly orders matching search results descending');

    // 3.6: Clear search (empty keyword) returns all items under category
    const clearedSearch = await queryAuctions({ search: '', category: 'calculators' });
    assert(clearedSearch.data.auctions.length > 0 && clearedSearch.data.auctions.every(a => a.category === 'calculators'), 'Empty search with category="calculators" returns all eligible calculator listings');

    // SECTION 4: Auction Eligibility
    console.log('\n--- Section 4: Auction Eligibility Verification ---');
    assert(baseline.data.auctions.every(a => a.status === 'active'), 'All returned search items have status "active"');
    const nowMs = Date.now();
    assert(baseline.data.auctions.every(a => new Date(a.closingAt).getTime() > nowMs), 'All returned search items have future closing deadlines (no expired items)');

    console.log(`\n========================================`);
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runCompleteSearchTests();
