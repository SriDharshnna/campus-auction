import { useState, useEffect } from 'react';
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
  Gavel,
  Edit
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { socket, joinAuctionRoom, leaveAuctionRoom } from '../services/socket';
import CountdownBadge from '../components/CountdownBadge';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import './AuctionDetails.css';

export default function AuctionDetails() {
  const { id } = useParams();
  const { currentUser } = useAuth();

  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');
  const [extensionNotice, setExtensionNotice] = useState('');
  const [placingBid, setPlacingBid] = useState(false);
  const [bidHistory, setBidHistory] = useState([]);

  const [newQuestion, setNewQuestion] = useState('');
  const [questionList, setQuestionList] = useState([]);
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeImgUrl, setActiveImgUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAuctionData = async () => {
      try {
        setLoading(true);
        setError('');
        const [resAuction, resBids] = await Promise.all([
          api.getAuctionById(id),
          api.getBidHistory(id).catch(() => ({ bids: [] }))
        ]);
        if (isMounted) {
          const loaded = resAuction.auction;
          setAuction(loaded);
          setQuestionList(loaded.questions || []);
          setBidHistory(resBids?.bids || []);
        }
      } catch (err) {
        console.error('Error fetching auction:', err);
        if (isMounted) {
          setError(err.message || 'Auction listing not found.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchAuctionData();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Real-time Socket.IO live updates listener
  useEffect(() => {
    if (!id) return;
    joinAuctionRoom(id);

    const handleRealtimeBid = (payload) => {
      setAuction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentPrice: payload.currentPrice,
          bidsCount: payload.bidsCount,
          closingAt: payload.closingAt || prev.closingAt,
          highestBidderMasked: payload.highestBidderMasked || prev.highestBidderMasked
        };
      });

      if (payload.bid) {
        setBidHistory((prev) => {
          const exists = prev.some((b) => (b.id || b._id) === (payload.bid.id || payload.bid._id));
          if (exists) return prev;
          return [payload.bid, ...prev];
        });
      }
    };

    const handleRealtimeExtension = (payload) => {
      setAuction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          closingAt: payload.closingAt
        };
      });
      setExtensionNotice(payload.message || 'Anti-sniping protection activated: auction extended by 60 seconds.');
      setTimeout(() => setExtensionNotice(''), 8000);
    };

    const handleRealtimeClosed = (payload) => {
      setAuction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: payload.status,
          winningAmount: payload.winningAmount,
          provisionalWinnerMasked: payload.provisionalWinnerMasked
        };
      });
    };

    socket.on('auction:bid', handleRealtimeBid);
    socket.on('auction:extended', handleRealtimeExtension);
    socket.on('auction:closed', handleRealtimeClosed);

    return () => {
      leaveAuctionRoom(id);
      socket.off('auction:bid', handleRealtimeBid);
      socket.off('auction:extended', handleRealtimeExtension);
      socket.off('auction:closed', handleRealtimeClosed);
    };
  }, [id]);

  const minNextBid = auction
    ? ((auction.bidsCount === 0 || !auction.bidsCount)
      ? auction.startingPrice
      : auction.currentPrice + auction.minIncrement)
    : 0;

  const isSeller = currentUser && auction && (
    (typeof auction.seller === 'object' && auction.seller?.id === currentUser.id) ||
    auction.seller === currentUser.id
  );

  const isClosed = auction && (
    auction.status !== 'active' ||
    new Date().getTime() >= new Date(auction.closingAt).getTime()
  );

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setBidError('');
    setBidSuccess('');

    if (!currentUser) {
      setBidError('Please sign in to place a verified bid.');
      return;
    }

    if (isSeller) {
      setBidError('Sellers are not permitted to bid on their own listings.');
      return;
    }

    if (isClosed) {
      setBidError('This auction has already closed. No further bids can be accepted.');
      return;
    }

    const numBid = Number(bidAmount);
    if (!bidAmount || isNaN(numBid) || numBid <= 0) {
      setBidError('Please enter a valid bid amount.');
      return;
    }

    if (numBid < minNextBid) {
      setBidError(`Minimum valid bid is ₹${minNextBid.toLocaleString('en-IN')}.`);
      return;
    }

    try {
      setPlacingBid(true);
      const res = await api.placeBid(id, numBid);
      setBidSuccess(res.message || `Bid of ₹${numBid.toLocaleString('en-IN')} placed successfully!`);
      if (res.auction) {
        setAuction(res.auction);
      }
      if (res.bid) {
        setBidHistory((prev) => [res.bid, ...prev]);
      } else {
        // Refresh bid history
        const updatedBids = await api.getBidHistory(id);
        if (updatedBids?.bids) {
          setBidHistory(updatedBids.bids);
        }
      }
      setBidAmount('');
    } catch (err) {
      console.error('Bid error:', err);
      setBidError(err.message || 'Failed to place bid. Please try again.');
    } finally {
      setPlacingBid(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    try {
      setAskingQuestion(true);
      const res = await api.askQuestion(id, {
        question: newQuestion.trim(),
        askerName: currentUser?.name || 'Campus Student'
      });
      if (res && res.auction) {
        setQuestionList(res.auction.questions || []);
      } else {
        const questionObj = {
          id: `q-${Date.now()}`,
          askerName: currentUser?.name || 'You (Student)',
          question: newQuestion.trim(),
          answer: null,
          createdAt: new Date().toISOString()
        };
        setQuestionList([questionObj, ...questionList]);
      }
      setNewQuestion('');
    } catch (err) {
      alert(err.message || 'Failed to submit question.');
    } finally {
      setAskingQuestion(false);
    }
  };

  if (loading) {
    return (
      <div className="details-container" style={{ padding: '6rem 0', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" message="Loading auction listing details..." />
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="details-container">
        <EmptyState
          title="Auction not found"
          description={error || "The item you are looking for may have been removed or does not exist."}
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
            {isSeller && (
              <Link
                to={`/edit-listing/${auction.id}`}
                className="btn-action-icon"
                title="Edit Listing"
                style={{ color: 'var(--color-primary, #6366f1)' }}
              >
                <Edit size={16} />
                <span>Edit</span>
              </Link>
            )}
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
                  questionList.map((q, idx) => (
                    <div key={q.id || q._id || idx} className="question-item">
                      <div className="question-header">
                        <span className="asker-name">{q.askerName || q.asker || 'Student'}</span>
                        <span className="q-time">
                          {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : q.time || 'Recently'}
                        </span>
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
                  <div className="price-huge">₹{(auction.currentPrice || 0).toLocaleString('en-IN')}</div>
                  <span className="starting-subtext">Started at ₹{(auction.startingPrice || 0).toLocaleString('en-IN')}</span>
                </div>

                <div className="countdown-container">
                  <span className="label-sm">Auction Closes In</span>
                  <CountdownBadge
                    closingAt={auction.closingAt}
                    size="large"
                    onExpire={() => {
                      setAuction((prev) => (prev ? { ...prev, status: prev.bidsCount > 0 ? 'pending_approval' : 'unsold' } : prev));
                    }}
                  />
                </div>
              </div>

              {/* Anti-Sniping Notice */}
              <div className="anti-sniping-banner">
                <ShieldCheck size={16} className="shield-icon" />
                <p>
                  <strong>Anti-Sniping Active:</strong> Any bid submitted in the final 30 seconds automatically extends closing to 60 seconds.
                </p>
              </div>

              {extensionNotice && (
                <div style={{
                  background: 'rgba(234, 179, 8, 0.15)',
                  border: '1px solid #eab308',
                  color: '#ca8a04',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  animation: 'pulse 1.5s infinite'
                }}>
                  <Clock size={16} /> {extensionNotice}
                </div>
              )}

              {/* Place Bid Form */}
              <form onSubmit={handleBidSubmit} className="bid-form">
                {bidSuccess && (
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#22c55e',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.875rem'
                  }}>
                    {bidSuccess}
                  </div>
                )}

                {isSeller ? (
                  <div style={{
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    color: '#eab308',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    marginBottom: '1rem'
                  }}>
                    <strong>Seller Notice:</strong> You are the seller of this auction and cannot place bids on it.
                  </div>
                ) : isClosed ? (
                  <div style={{
                    background: auction.status === 'unsold' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                    border: `1px solid ${auction.status === 'unsold' ? 'rgba(100, 116, 139, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                    color: auction.status === 'unsold' ? 'var(--color-text-secondary, #94a3b8)' : 'var(--color-primary, #6366f1)',
                    padding: '1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    marginBottom: '1rem',
                    lineHeight: '1.5'
                  }}>
                    {auction.status === 'unsold' ? (
                      <>
                        <strong>Auction Ended (Unsold):</strong> No qualifying bids were submitted before the closing deadline.
                      </>
                    ) : auction.status === 'completed' ? (
                      <>
                        <strong>Auction Completed:</strong> Sold to <strong>{auction.provisionalWinnerMasked || auction.highestBidderMasked}</strong> for <strong>₹{(auction.winningAmount || auction.currentPrice)?.toLocaleString('en-IN')}</strong>. Campus handover finished.
                      </>
                    ) : (
                      <>
                        <strong>Auction Closed — Provisional Winner:</strong>{' '}
                        <span>{auction.provisionalWinnerMasked || auction.highestBidderMasked || 'Leading Student'}</span> with highest valid bid of{' '}
                        <strong>₹{(auction.winningAmount || auction.currentPrice)?.toLocaleString('en-IN')}</strong>. Awaiting seller approval.
                      </>
                    )}
                  </div>
                ) : (
                  <>
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
                          step={auction.minIncrement || 10}
                          min={minNextBid}
                          className="form-input bid-input"
                          placeholder={minNextBid.toString()}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          disabled={placingBid}
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
                        disabled={placingBid}
                      >
                        Opening / Min (₹{minNextBid})
                      </button>
                      <button
                        type="button"
                        className="btn-quick-chip"
                        onClick={() => setBidAmount((minNextBid + (auction.minIncrement || 50)).toString())}
                        disabled={placingBid}
                      >
                        +₹{auction.minIncrement || 50} (₹{minNextBid + (auction.minIncrement || 50)})
                      </button>
                      <button
                        type="button"
                        className="btn-quick-chip"
                        onClick={() => setBidAmount((minNextBid + (auction.minIncrement || 50) * 2).toString())}
                        disabled={placingBid}
                      >
                        +₹{(auction.minIncrement || 50) * 2}
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary btn-bid-submit"
                      disabled={placingBid}
                    >
                      <Gavel size={18} /> {placingBid ? 'Submitting Validated Bid...' : 'Place Validated Bid'}
                    </button>

                    <p className="bidding-terms-note">
                      By bidding, you commit to purchasing at this price if you are the provisional winner and the seller approves.
                    </p>
                  </>
                )}
              </form>
            </div>

            {/* Seller Info Card */}
            <div className="side-card seller-card">
              <div className="seller-header">
                <div className="seller-avatar">
                  {auction.seller?.name ? auction.seller.name.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="seller-meta">
                  <h4>{auction.seller?.name || 'Campus Student'}</h4>
                  <p>{auction.seller?.department || 'Student'} &bull; {auction.seller?.rollNumber || auction.seller?.batch || 'Senior'}</p>
                </div>
              </div>
              <div className="seller-badge-row">
                <span className="trust-pill">Verified Student</span>
                <span className="rating-pill">⭐ {auction.seller?.rating || '4.9'} rating</span>
              </div>
              <div className="handover-notice">
                <MapPin size={16} />
                <div>
                  <strong>Pickup Point:</strong>
                  <p>{auction.pickupLocation || 'Campus Quad / Hostel'}</p>
                </div>
              </div>
            </div>

            {/* Public Bid History Section */}
            <div className="side-card history-card">
              <div className="history-header">
                <div className="title-with-icon">
                  <History size={16} />
                  <h4>Public Bid History ({bidHistory.length})</h4>
                </div>
                <span className="history-hint">Privacy Protected</span>
              </div>

              <div className="bid-history-list">
                {bidHistory && bidHistory.length > 0 ? (
                  bidHistory.map((bid, index) => (
                    <div
                      key={bid.id || bid._id || index}
                      className={`bid-history-row ${index === 0 ? 'leading-bid' : ''}`}
                    >
                      <div className="bidder-info">
                        <span className="bidder-masked">{bid.bidderMasked || 'Student ***'}</span>
                        {index === 0 && (
                          <span className="winning-badge">Leading</span>
                        )}
                      </div>
                      <div className="bid-figures">
                        <strong className="bid-price">₹{(bid.amount || 0).toLocaleString('en-IN')}</strong>
                        <span className="bid-time">
                          {bid.createdAt ? new Date(bid.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </span>
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
