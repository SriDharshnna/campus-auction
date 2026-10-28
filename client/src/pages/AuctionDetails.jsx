import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Clock,
  History,
  MessageSquare,
  AlertCircle,
  HelpCircle,
  Share2,
  Bookmark,
  Gavel
} from 'lucide-react';
import { MOCK_AUCTIONS } from '../mock/mockData';
import CountdownBadge from '../components/CountdownBadge';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import './AuctionDetails.css';

export default function AuctionDetails() {
  const { id } = useParams();
  const auction = MOCK_AUCTIONS.find((a) => a.id === id) || MOCK_AUCTIONS[0];

  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [questionList, setQuestionList] = useState(auction.questions || []);
  const [saved, setSaved] = useState(false);

  const minNextBid = auction.currentPrice + auction.minIncrement;

  const handleBidSubmit = (e) => {
    e.preventDefault();
    setBidError('');

    const numBid = Number(bidAmount);
    if (!bidAmount || isNaN(numBid)) {
      setBidError('Please enter a valid bid amount.');
      return;
    }

    if (numBid < minNextBid) {
      setBidError(`Minimum valid bid is ₹${minNextBid.toLocaleString('en-IN')} (Current ₹${auction.currentPrice.toLocaleString('en-IN')} + ₹${auction.minIncrement} increment).`);
      return;
    }

    // In Module 2, real bidding is kept separate per prompt instructions:
    // "Do not implement fake bidding logic. Keep API integration separate so the frontend can connect to the backend in later modules."
    alert(`[Module 2 Frontend Preview] Bid validated! Amount: ₹${numBid.toLocaleString('en-IN')}.\nReal-time server bidding will be activated in Module 5.`);
    setBidAmount('');
  };

  const handleAskQuestion = (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    const questionObj = {
      id: `q-${Date.now()}`,
      asker: 'You (Student)',
      question: newQuestion.trim(),
      answer: null,
      time: 'Just now'
    };

    setQuestionList([questionObj, ...questionList]);
    setNewQuestion('');
  };

  if (!auction) {
    return (
      <div className="details-container">
        <EmptyState
          title="Auction not found"
          description="The item you are looking for may have been removed or completed."
          actionLabel="Back to Browse"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  return (
    <div className="details-page">
      <div className="details-container">
        {/* Breadcrumb Navigation */}
        <div className="details-nav-row">
          <Link to="/" className="btn-back">
            <ArrowLeft size={16} /> Back to Browse
          </Link>

          <div className="details-top-actions">
            <button
              className={`btn-action-icon ${saved ? 'active' : ''}`}
              onClick={() => setSaved(!saved)}
              title={saved ? 'Remove from Saved' : 'Save Item'}
            >
              <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
              <span>{saved ? 'Saved' : 'Save'}</span>
            </button>
            <button
              className="btn-action-icon"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Auction URL copied to clipboard!');
              }}
              title="Share"
            >
              <Share2 size={16} />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Main Grid: Left Media & Info, Right Bidding Panel */}
        <div className="details-layout-grid">
          {/* Left Column: Image, Details, Specs, Questions */}
          <div className="details-main-col">
            {/* Image Preview Box */}
            <div className="details-media-card">
              <img
                src={auction.imageUrl}
                alt={auction.title}
                className="details-main-img"
              />
              <div className="media-overlay-tags">
                <span className="badge-condition-lg">{auction.condition}</span>
                <StatusBadge status={auction.status} />
              </div>
            </div>

            {/* Description Section */}
            <section className="details-section">
              <h1 className="auction-main-title">{auction.title}</h1>
              <div className="auction-category-chip">
                <span>Category:</span>
                <strong>{auction.category}</strong>
              </div>

              <div className="description-content">
                <h3>About This Item</h3>
                <p>{auction.description}</p>
              </div>

              <div className="item-specs-grid">
                <div className="spec-card">
                  <span className="spec-label">Condition</span>
                  <strong className="spec-val">{auction.condition}</strong>
                </div>
                <div className="spec-card">
                  <span className="spec-label">Starting Price</span>
                  <strong className="spec-val">₹{auction.startingPrice.toLocaleString('en-IN')}</strong>
                </div>
                <div className="spec-card">
                  <span className="spec-label">Min Increment</span>
                  <strong className="spec-val">+₹{auction.minIncrement.toLocaleString('en-IN')}</strong>
                </div>
                <div className="spec-card">
                  <span className="spec-label">Handover Point</span>
                  <strong className="spec-val spec-location">
                    <MapPin size={14} /> {auction.pickupLocation}
                  </strong>
                </div>
              </div>
            </section>

            {/* Public Questions & Answers Section */}
            <section className="details-section">
              <div className="section-title-row">
                <div className="title-with-icon">
                  <MessageSquare size={18} />
                  <h3>Public Questions & Answers ({questionList.length})</h3>
                </div>
                <span className="public-notice">Visible to all students</span>
              </div>

              {/* Ask Question Form */}
              <form onSubmit={handleAskQuestion} className="ask-question-form">
                <label htmlFor="student-question" className="form-label">
                  Ask the seller about condition, accessories or pickup time:
                </label>
                <div className="question-input-row">
                  <input
                    id="student-question"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Does this cycle come with an extra lock?"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!newQuestion.trim()}>
                    Ask
                  </button>
                </div>
              </form>

              {/* Questions List */}
              <div className="questions-thread">
                {questionList.length > 0 ? (
                  questionList.map((q) => (
                    <div key={q.id} className="question-item">
                      <div className="question-header">
                        <span className="asker-name">{q.asker}</span>
                        <span className="q-time">{q.time}</span>
                      </div>
                      <p className="question-text">Q: {q.question}</p>
                      {q.answer ? (
                        <div className="seller-answer-box">
                          <span className="seller-tag">Seller Reply:</span>
                          <p>{q.answer}</p>
                        </div>
                      ) : (
                        <div className="pending-answer-tag">
                          Awaiting seller response...
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="no-questions">No questions asked yet. Be the first to ask the seller!</p>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Bidding Action & Bid History */}
          <div className="details-side-col">
            {/* Live Bidding Box */}
            <div className="side-card bidding-card">
              <div className="bidding-header">
                <div className="current-price-group">
                  <span className="label-sm">Current Leading Price</span>
                  <div className="price-huge">₹{auction.currentPrice.toLocaleString('en-IN')}</div>
                  <span className="starting-subtext">Started at ₹{auction.startingPrice.toLocaleString('en-IN')}</span>
                </div>

                <div className="countdown-container">
                  <span className="label-sm">Auction Closes In</span>
                  <CountdownBadge closingAt={auction.closingAt} size="large" />
                </div>
              </div>

              {/* Anti-Sniping Notice */}
              <div className="anti-sniping-banner">
                <ShieldCheck size={16} className="shield-icon" />
                <p>
                  <strong>Anti-Sniping Active:</strong> Any bid submitted in the final 30 seconds automatically extends closing by 60 seconds.
                </p>
              </div>

              {/* Place Bid Form */}
              <form onSubmit={handleBidSubmit} className="bid-form">
                <div className="form-group">
                  <div className="bid-label-row">
                    <label htmlFor="bid-input" className="form-label">
                      Your Maximum Bid (₹)
                    </label>
                    <span className="min-bid-hint">
                      Min next: <strong>₹{minNextBid.toLocaleString('en-IN')}</strong>
                    </span>
                  </div>

                  <div className="input-prefix-box">
                    <span className="currency-symbol">₹</span>
                    <input
                      id="bid-input"
                      type="number"
                      step={auction.minIncrement}
                      min={minNextBid}
                      className="form-input bid-input"
                      placeholder={minNextBid.toString()}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                    />
                  </div>
                  {bidError && <p className="form-error-msg">{bidError}</p>}
                </div>

                {/* Quick Increment Buttons */}
                <div className="quick-bid-buttons">
                  <button
                    type="button"
                    className="btn-quick-chip"
                    onClick={() => setBidAmount(minNextBid.toString())}
                  >
                    +₹{auction.minIncrement} (₹{minNextBid})
                  </button>
                  <button
                    type="button"
                    className="btn-quick-chip"
                    onClick={() => setBidAmount((minNextBid + auction.minIncrement).toString())}
                  >
                    +₹{auction.minIncrement * 2} (₹{minNextBid + auction.minIncrement})
                  </button>
                  <button
                    type="button"
                    className="btn-quick-chip"
                    onClick={() => setBidAmount((minNextBid + auction.minIncrement * 3).toString())}
                  >
                    +₹{auction.minIncrement * 4}
                  </button>
                </div>

                <button type="submit" className="btn btn-primary btn-bid-submit">
                  <Gavel size={18} /> Place Validated Bid
                </button>

                <p className="bidding-terms-note">
                  By bidding, you commit to purchasing at this price if you are the provisional winner and the seller approves.
                </p>
              </form>
            </div>

            {/* Seller Info Card */}
            <div className="side-card seller-card">
              <div className="seller-header">
                <div className="seller-avatar">
                  {auction.seller.name.charAt(0)}
                </div>
                <div className="seller-meta">
                  <h4>{auction.seller.name}</h4>
                  <p>{auction.seller.department} &bull; {auction.seller.batch}</p>
                </div>
              </div>
              <div className="seller-badge-row">
                <span className="trust-pill">Verified Student</span>
                <span className="rating-pill">⭐ {auction.seller.rating} rating</span>
              </div>
              <div className="handover-notice">
                <MapPin size={16} />
                <div>
                  <strong>Pickup Point:</strong>
                  <p>{auction.pickupLocation}</p>
                </div>
              </div>
            </div>

            {/* Public Bid History Section */}
            <div className="side-card history-card">
              <div className="history-header">
                <div className="title-with-icon">
                  <History size={16} />
                  <h4>Public Bid History ({auction.bidHistory?.length || 0})</h4>
                </div>
                <span className="history-hint">Privacy Protected</span>
              </div>

              <div className="bid-history-list">
                {auction.bidHistory && auction.bidHistory.length > 0 ? (
                  auction.bidHistory.map((bid, index) => (
                    <div
                      key={bid.id}
                      className={`bid-history-row ${index === auction.bidHistory.length - 1 ? 'leading-bid' : ''}`}
                    >
                      <div className="bidder-info">
                        <span className="bidder-masked">{bid.bidderName}</span>
                        {index === auction.bidHistory.length - 1 && (
                          <span className="winning-badge">Highest</span>
                        )}
                      </div>
                      <div className="bid-figures">
                        <strong className="bid-price">₹{bid.amount.toLocaleString('en-IN')}</strong>
                        <span className="bid-time">{bid.time}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-bids-yet">No bids placed yet. Place the opening bid at starting price!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
