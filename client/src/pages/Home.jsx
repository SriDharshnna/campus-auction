import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, Flame, SlidersHorizontal, Sparkles, AlertCircle } from 'lucide-react';
import { CATEGORIES } from '../mock/mockData';
import { api } from '../services/api';
import { socket } from '../services/socket';
import AuctionCard from '../components/AuctionCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import './Home.css';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('closingSoon');
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTrigger, setSearchTrigger] = useState(0);

  // Track latest active request to prevent race conditions / out-of-order response overwrites
  const latestRequestIdRef = useRef(0);

  // Fetch auctions with active filters, handling race conditions safely
  const fetchAuctions = useCallback(async (keyword, category, sort) => {
    const requestId = ++latestRequestIdRef.current;
    try {
      setLoading(true);
      setError('');

      const params = {
        sort: sortBy
      };

      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const data = await api.getAuctions(params);

      // Discard response if a newer search request was triggered while in flight
      if (requestId === latestRequestIdRef.current) {
        setAuctions(data?.auctions || []);
      }
    } catch (err) {
      console.error('Failed to load auctions:', err);
      if (requestId === latestRequestIdRef.current) {
        setError(err.message || 'Failed to load active auctions. Please check your connection.');
        setAuctions([]);
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [searchQuery]);

  // Execute fetch when filters, committed search query, or search trigger changes
  useEffect(() => {
    fetchAuctions(searchQuery, selectedCategory, sortBy);
  }, [searchQuery, selectedCategory, sortBy, searchTrigger, fetchAuctions]);

  // Submit search: clicking Search button or pressing Enter
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const nextKeyword = searchInput.trim();
    setSearchQuery(nextKeyword);
    // Increment searchTrigger to ensure search always executes even if keyword did not change
    setSearchTrigger((prev) => prev + 1);
  };

  // Clear search input and search all items
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setSearchTrigger((prev) => prev + 1);
  };

  // Reset all filters, keyword, and sorting
  const handleResetAllFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('closingSoon');
    setSearchTrigger((prev) => prev + 1);
  };

  // Real-time marketplace live price, bids and closing-time updates
  useEffect(() => {
    const handleMarketplaceUpdate = (payload) => {
      setAuctions((prev) =>
        prev
          .map((auc) => {
            const idMatch = auc.id === payload.auctionId || auc._id === payload.auctionId;
            if (idMatch) {
              return {
                ...auc,
                currentPrice: payload.currentPrice !== undefined ? payload.currentPrice : auc.currentPrice,
                bidsCount: payload.bidsCount !== undefined ? payload.bidsCount : auc.bidsCount,
                closingAt: payload.closingAt || auc.closingAt,
                highestBidderName: payload.highestBidderName !== undefined ? payload.highestBidderName : auc.highestBidderName,
                highestBidder: payload.highestBidder !== undefined ? payload.highestBidder : auc.highestBidder,
                status: payload.status || auc.status
              };
            }
            return auc;
          })
          .filter((auc) => auc.status === 'active' && new Date(auc.closingAt).getTime() > Date.now())
      );
    };

    socket.on('marketplace:update', handleMarketplaceUpdate);
    return () => {
      socket.off('marketplace:update', handleMarketplaceUpdate);
    };
  }, []);

  // Closing soon subset (< 1 hour remaining) for highlight strip
  const closingSoonAuctions = useMemo(() => {
    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    return auctions.filter(
      (a) => new Date(a.closingAt).getTime() <= oneHourFromNow && new Date(a.closingAt).getTime() > Date.now()
    );
  }, [auctions]);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-banner">
        <div className="hero-container">
          <div className="hero-badge">
            <Sparkles size={14} /> Handover &bull; Graduating Student Marketplace
          </div>
          <h1 className="hero-title">
            Bid on Used Cycles, Textbooks & Tech <br />
            <span className="hero-gradient-text">Directly from Campus Seniors</span>
          </h1>
          <p className="hero-subtitle">
            Zero shipping delays, zero middleman fees. Transparent real-time auctions with guaranteed on-campus handovers.
          </p>

          {/* Quick Search Bar */}
          <form className="search-bar-wrapper" onSubmit={handleSearchSubmit}>
            <Search className="search-icon" size={20} />
            <input
              id="auction-search-input"
              type="text"
              className="search-input"
              placeholder="Search cycles, calculators, books, monitors or sellers..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit(e);
                }
              }}
            />
            {searchInput && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={handleClearSearch}
                aria-label="Clear search input"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="btn-hero-search"
              id="search-submit-button"
              aria-label="Search auctions"
            >
              <Search size={16} />
              <span>Search</span>
            </button>
          </form>

          {/* Quick Stats Pill */}
          <div className="hero-stats-row">
            <div className="hero-stat">
              <strong>100%</strong>
              <span>Verified Campus IDs</span>
            </div>
            <div className="stat-separator"></div>
            <div className="hero-stat">
              <strong>60s</strong>
              <span>Anti-Sniping Protection</span>
            </div>
            <div className="stat-separator"></div>
            <div className="hero-stat">
              <strong>₹0</strong>
              <span>Campus Delivery Fees</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Browse Section */}
      <section className="browse-section">
        {/* Category Pills Bar */}
        <div className="category-scroll-container">
          <div className="category-pills">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Closing Soon Highlight Strip */}
        {closingSoonAuctions.length > 0 && selectedCategory === 'all' && !searchQuery && (
          <div className="closing-soon-section">
            <div className="section-header-compact">
              <div className="header-icon-title">
                <Flame size={20} className="flame-icon" />
                <h2>Ending Soon (&lt; 1 Hour)</h2>
              </div>
              <span className="urgent-badge">High Bidding Activity</span>
            </div>

            <div className="closing-soon-grid">
              {closingSoonAuctions.map((auction) => (
                <AuctionCard key={`soon-${auction.id || auction._id}`} auction={auction} />
              ))}
            </div>
          </div>
        )}

        {/* Filter and Sorting Toolbar */}
        <div className="toolbar-row">
          <div className="toolbar-info">
            <h2>
              {selectedCategory === 'all'
                ? 'All Active Handover Auctions'
                : CATEGORIES.find((c) => c.id === selectedCategory)?.label}
            </h2>
            <span className="results-count">
              Showing {auctions.length} available {auctions.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="sort-dropdown-wrapper">
            <SlidersHorizontal size={16} className="sort-icon" />
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort auctions"
            >
              <option value="closingSoon">Ending Soonest</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
              <option value="mostBids">Most Bids</option>
            </select>
          </div>
        </div>

        {/* Loading / Error / Grid State */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <LoadingSpinner size="lg" message="Searching Handover auctions..." />
          </div>
        ) : error ? (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              padding: '1.25rem',
              borderRadius: '12px',
              margin: '2rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <AlertCircle size={20} />
            <div>
              <strong>Error loading listings:</strong> {error}
            </div>
          </div>
        ) : auctions.length > 0 ? (
          <div className="auctions-grid">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id || auction._id} auction={auction} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No auctions match your search"
            description={
              searchQuery
                ? `We couldn't find any listings matching "${searchQuery}"${
                    selectedCategory !== 'all' ? ` in ${CATEGORIES.find((c) => c.id === selectedCategory)?.label}` : ''
                  }. Try another keyword or reset filters!`
                : `No active listings found in this category.`
            }
            actionLabel="Reset Search Filters"
            onAction={handleResetAllFilters}
          />
        )}
      </section>
    </div>
  );
}
