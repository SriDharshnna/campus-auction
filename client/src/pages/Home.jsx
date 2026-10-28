import { useState, useEffect, useMemo } from 'react';
import { Search, Flame, SlidersHorizontal, Sparkles, PlusCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../mock/mockData';
import { api } from '../services/api';
import { socket } from '../services/socket';
import AuctionCard from '../components/AuctionCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import './Home.css';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('closingSoon');
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch real auctions from API with debounced search
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
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
        if (isMounted) {
          setAuctions(data?.auctions || []);
        }
      } catch (err) {
        console.error('Failed to load auctions:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load active auctions. Please check your connection.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedCategory, searchQuery, sortBy]);

  // Real-time marketplace live price, bids and closing-time updates
  useEffect(() => {
    const handleMarketplaceUpdate = (payload) => {
      setAuctions((prev) =>
        prev.map((auc) => {
          if (auc.id === payload.auctionId || auc._id === payload.auctionId) {
            return {
              ...auc,
              currentPrice: payload.currentPrice !== undefined ? payload.currentPrice : auc.currentPrice,
              bidsCount: payload.bidsCount !== undefined ? payload.bidsCount : auc.bidsCount,
              closingAt: payload.closingAt || auc.closingAt,
              status: payload.status || auc.status
            };
          }
          return auc;
        })
      );
    };

    socket.on('marketplace:update', handleMarketplaceUpdate);
    return () => {
      socket.off('marketplace:update', handleMarketplaceUpdate);
    };
  }, []);

  // Closing soon subset (< 1 hour remaining)
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
            <Sparkles size={14} /> Graduating Student Marketplace
          </div>
          <h1 className="hero-title">
            Bid on Used Cycles, Textbooks & Tech <br />
            <span className="hero-gradient-text">Directly from Campus Seniors</span>
          </h1>
          <p className="hero-subtitle">
            Zero shipping delays, zero middleman fees. Transparent real-time auctions with guaranteed on-campus handovers.
          </p>

          {/* Quick Search Bar */}
          <div className="search-bar-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              className="search-input"
              placeholder="Search cycles, calculators, books, monitors or sellers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
              >
                Clear
              </button>
            )}
            <Link to="/create-listing" className="btn-hero-sell">
              <PlusCircle size={16} /> List Item
            </Link>
          </div>

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
                <AuctionCard key={`soon-${auction.id}`} auction={auction} />
              ))}
            </div>
          </div>
        )}

        {/* Filter and Sorting Toolbar */}
        <div className="toolbar-row">
          <div className="toolbar-info">
            <h2>
              {selectedCategory === 'all'
                ? 'All Active Campus Auctions'
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
            <LoadingSpinner size="lg" message="Loading live campus auctions from database..." />
          </div>
        ) : error ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '1.25rem',
            borderRadius: '12px',
            margin: '2rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertCircle size={20} />
            <div>
              <strong>Error loading listings:</strong> {error}
            </div>
          </div>
        ) : auctions.length > 0 ? (
          <div className="auctions-grid">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No auctions match your search"
            description={`We couldn't find any listings for "${searchQuery || selectedCategory}". Try another keyword or create a listing yourself!`}
            actionLabel="Reset Search Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
          />
        )}
      </section>
    </div>
  );
}
