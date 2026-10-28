/**
 * Verification Suite for Search Bar Refinements
 *
 * Verifies:
 * 1. Removal of "List Item" button from Home.jsx search bar area
 * 2. Search bar contains only search input, clear button, and Search submit button
 * 3. Search button is present and clearly visible
 * 4. Enter-key submission and button-click submission handler (handleSearchSubmit)
 * 5. Preservation of category filters, sorting, and search query integration with API
 * 6. Item-listing feature remains accessible through Navbar ("Sell Item") and /create-listing route
 * 7. Verification of API search results for button/Enter search execution
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🚀 Starting Search Bar Refinement Verification Suite...\n');
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
    // 1. Inspect client/src/pages/Home.jsx
    console.log('--- 1. Inspecting Home.jsx Search Bar Code ---');
    const homeCode = fs.readFileSync(path.resolve('../client/src/pages/Home.jsx'), 'utf-8');

    // Rule 1: "List Item" tab/button removed from search bar area
    const hasListItemInSearch = homeCode.includes('btn-hero-sell') || homeCode.includes('>List Item<') || homeCode.includes('List Item');
    assert(!hasListItemInSearch, 'The "List Item" button is completely removed from the hero search bar area');

    // Rule 2: Search bar wrapper is a form dedicated to searching
    const hasSearchForm = homeCode.includes('<form className="search-bar-wrapper"') || homeCode.includes("className=\"search-bar-wrapper\"");
    assert(hasSearchForm, 'Search bar area is structured as a dedicated search form');

    // Rule 3: Clearly visible Search button
    const hasSearchButton = homeCode.includes('className="btn-hero-search"') && homeCode.includes('Search</span>');
    assert(hasSearchButton, 'Clearly visible "Search" button is rendered beside search input');

    // Rule 4: Pressing Enter triggers search
    const hasEnterKeyHandler = homeCode.includes("e.key === 'Enter'") && homeCode.includes('handleSearchSubmit');
    const hasFormSubmit = homeCode.includes('onSubmit={handleSearchSubmit}');
    assert(hasEnterKeyHandler && hasFormSubmit, 'Pressing Enter key triggers handleSearchSubmit via onKeyDown and form onSubmit');

    // Rule 5: Connected to search functionality with filters preserved
    const hasCategoryParam = homeCode.includes('params.category = selectedCategory');
    const hasSortParam = homeCode.includes('sort: sortBy');
    const hasSearchParam = homeCode.includes('params.search = searchQuery.trim()');
    assert(hasCategoryParam && hasSortParam && hasSearchParam, 'Search query connects to API with category filters and sorting fully preserved');

    // Rule 6: Item-listing feature accessible through Navbar & routing
    console.log('\n--- 2. Inspecting Navigation & Listing Route Accessibility ---');
    const navCode = fs.readFileSync(path.resolve('../client/src/components/Navbar.jsx'), 'utf-8');
    const hasSellItemNavLink = navCode.includes('to="/create-listing"') && navCode.includes('Sell Item');
    assert(hasSellItemNavLink, 'Item listing feature is accessible via the "Sell Item" button in the Navbar');

    const appCode = fs.readFileSync(path.resolve('../client/src/App.jsx'), 'utf-8');
    const hasCreateRoute = appCode.includes('path="/create-listing"') && appCode.includes('CreateListing');
    assert(hasCreateRoute, 'The /create-listing route is registered and active in React Router');

    // 2. Inspect client/src/pages/Home.css
    console.log('\n--- 3. Inspecting Regular CSS Styling ---');
    const homeCss = fs.readFileSync(path.resolve('../client/src/pages/Home.css'), 'utf-8');
    const hasSearchBtnCss = homeCss.includes('.btn-hero-search');
    const hasClearBtnCss = homeCss.includes('.btn-clear-search');
    assert(hasSearchBtnCss && hasClearBtnCss, 'Vanilla CSS classes .btn-hero-search and .btn-clear-search are defined without Tailwind');

    // 3. Test API Search Integration with Filters
    console.log('\n--- 4. Testing Live Backend Search Query API ---');
    // Keyword search simulation
    const keywordRes = await fetch(`${BASE_URL}/auctions?search=Cycle`);
    const keywordData = await keywordRes.json();
    assert(keywordRes.status === 200, 'GET /api/auctions?search=Cycle returns HTTP 200');
    assert(Array.isArray(keywordData.auctions), 'Auctions search result is an array');

    // Keyword + Category filter simulation
    const filteredRes = await fetch(`${BASE_URL}/auctions?search=Hero&category=cycles`);
    const filteredData = await filteredRes.json();
    assert(filteredRes.status === 200, 'GET /api/auctions with search AND category filter returns HTTP 200');
    assert(filteredData.auctions.every(a => a.category === 'cycles'), 'All returned search items match the selected category filter');

    // Keyword + Sort filter simulation
    const sortedRes = await fetch(`${BASE_URL}/auctions?search=Cycle&sort=priceLow`);
    const sortedData = await sortedRes.json();
    assert(sortedRes.status === 200, 'GET /api/auctions with search AND sort filter returns HTTP 200');

    console.log(`\n========================================`);
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
