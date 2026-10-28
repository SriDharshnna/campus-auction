import { useState, useMemo } from 'react';
import { Search, Flame, SlidersHorizontal, Sparkles, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CATEGORIES, MOCK_AUCTIONS } from '../mock/mockData';
import AuctionCard from '../components/AuctionCard';
import EmptyState from '../components/EmptyState';
import './Home.css';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('closingSoon');

  // Filter and sort auctions
  const filteredAuctions = useMemo(() => {
    return MOCK_AUCTIONS.filter((auction) => {
      const matchesCategory =
        selectedCategory === 'all' || auction.category === selectedCategory;
      const matchesSearch =
        auction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        auction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        auction.seller.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'closingSoon') {
        return new Date(a.closingAt) - new Date(b.closingAt);
      }
      if (sortBy === 'priceLow') {
        return a.currentPrice - b.currentPrice;
      }
      if (sortBy === 'priceHigh') {
        return b.currentPrice - a.currentPrice;
      }
      if (sortBy === 'mostBids') {
        return b.bidsCount - a.bidsCount;
      }
      return 0;
    });
  }, [selectedCategory, searchQuery, sortBy]);

  // Closing soon subset (< 1 hour remaining)
  const closingSoonAuctions = useMemo(() => {
    const oneHourFromNow = Date.now() + 60 * 60 * 1000;
    return MOCK_AUCTIONS.filter(
      (a) => new Date(a.closingAt).getTime() <= oneHourFromNow && new Date(a.closingAt).getTime() > Date.now()
    );
  }, []);

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
              Showing {filteredAuctions.length} available {filteredAuctions.length === 1 ? 'item' : 'items'}
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

        {/* Auctions Grid or Empty State */}
        {filteredAuctions.length > 0 ? (
          <div className="auctions-grid">
            {filteredAuctions.map((auction) => (
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
