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
  Edit,
  User,
  Sparkles,
  CheckCircle,
  XCircle,
  CreditCard,
  Handshake,
  Check,
  X,
  Calendar,
  Ban
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { socket, joinAuctionRoom, leaveAuctionRoom } from '../services/socket';
import CountdownBadge from '../components/CountdownBadge';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import ExtendAuctionModal from '../components/ExtendAuctionModal';
import CancelAuctionModal from '../components/CancelAuctionModal';
import './AuctionDetails.css';

export default function AuctionDetails() {
  const { id } = useParams();
  const { currentUser } = useAuth();

  const [auction, setAuction] = useState(null);
  const [transaction, setTransaction] = useState(null);
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
  const [txActionLoading, setTxActionLoading] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchAuctionData = async () => {
    try {
      setLoading(true);
      setError('');
      const [resAuction, resBids] = await Promise.all([
        api.getAuctionById(id),
        api.getBidHistory(id).catch(() => ({ bids: [] }))
      ]);
      const loaded = resAuction.auction;
      setAuction(loaded);
      setTransaction(resAuction.transaction || null);
      setQuestionList(loaded.questions || []);
      setBidHistory(resBids?.bids || []);
      if (loaded.imageUrl) {
        setActiveImgUrl(loaded.imageUrl);
      }
    } catch (err) {
      console.error('Error fetching auction:', err);
      setError(err.message || 'Auction listing not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchAuctionData();
    }
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
          highestBidderName: payload.highestBidderName || prev.highestBidderName,
          highestBidder: payload.highestBidder || prev.highestBidder,
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
          provisionalWinnerName: payload.provisionalWinnerName || prev.provisionalWinnerName,
          highestBidderName: payload.highestBidderName || payload.provisionalWinnerName || prev.highestBidderName,
          provisionalWinnerMasked: payload.provisionalWinnerMasked
        };
      });
      // Refresh to fetch newly created transaction
      fetchAuctionData();
    };

    const handleRealtimeCancelled = (payload) => {
      setAuction((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'cancelled',
          cancellationReason: payload.cancellationReason
        };
      });
    };

    socket.on('auction:bid', handleRealtimeBid);
    socket.on('auction:extended', handleRealtimeExtension);
    socket.on('auction:closed', handleRealtimeClosed);
    socket.on('auction:cancelled', handleRealtimeCancelled);

    return () => {
      leaveAuctionRoom(id);
      socket.off('auction:bid', handleRealtimeBid);
      socket.off('auction:extended', handleRealtimeExtension);
      socket.off('auction:closed', handleRealtimeClosed);
      socket.off('auction:cancelled', handleRealtimeCancelled);
    };
  }, [id]);

  // Derived user roles & labels
  const isSeller = currentUser && auction && (
    (typeof auction.seller === 'object' && (auction.seller?.id === currentUser.id || auction.seller?._id === currentUser.id)) ||
    auction.seller === currentUser.id
  );

  const resolvedBidderName =
    auction?.highestBidderName ||
    (auction?.highestBidder && typeof auction.highestBidder === 'object' && auction.highestBidder.name
      ? auction.highestBidder.name
      : null);

  const isWinningBidder = currentUser && (
    (resolvedBidderName && resolvedBidderName === currentUser.name) ||
    (typeof auction?.highestBidder === 'object' && (auction.highestBidder?._id === currentUser.id || auction.highestBidder?.id === currentUser.id)) ||
    auction?.highestBidder === currentUser.id ||
    (transaction && (transaction.buyer?._id === currentUser.id || transaction.buyer?.id === currentUser.id || transaction.buyer === currentUser.id))
  );

  const resolvedSellerName = auction?.seller?.name || auction?.sellerName || 'Campus Student';
  const resolvedSellerDept = auction?.seller?.department || auction?.sellerDepartment;
  const resolvedSellerRoll = auction?.seller?.studentId || auction?.sellerRoll || auction?.seller?.rollNumber;

  const minNextBid = auction
    ? ((auction.bidsCount === 0 || !auction.bidsCount)
      ? auction.startingPrice
      : auction.currentPrice + (auction.minIncrement || 50))
    : 0;

  const isClosed = auction && (
    auction.status !== 'active' ||
    new Date().getTime() >= new Date(auction.closingAt).getTime()
  );

  // User's own highest bid on this item
  const myBidsOnItem = bidHistory.filter((b) => {
    if (!currentUser) return false;
    const bId = b.bidder?._id || b.bidder?.id || b.bidder;
    return bId === currentUser.id || b.bidderName === currentUser.name;
  });
  const myHighestBid = myBidsOnItem.length > 0 ? Math.max(...myBidsOnItem.map((b) => b.amount)) : null;

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

  // Transaction action handlers
  const handleApproveSale = async (txId) => {
    try {
      setTxActionLoading(true);
      await api.approveTransaction(txId);
      alert('Winning bid approved! The item is now reserved for campus handover.');
      fetchAuctionData();
    } catch (err) {
      alert(err.message || 'Failed to approve winning bid.');
    } finally {
      setTxActionLoading(false);
    }
  };

  const handleRejectSale = async (txId) => {
    const reason = window.prompt(
      'Please provide a reason for rejecting the provisional winning bid:',
      'Minimum reserve price expectation not met'
    );
    if (reason === null) return;

    try {
      setTxActionLoading(true);
      await api.rejectTransaction(txId, reason);
      alert('Winning bid rejected. Auction outcome recorded as unsold.');
      fetchAuctionData();
    } catch (err) {
      alert(err.message || 'Failed to reject winning bid.');
    } finally {
      setTxActionLoading(false);
    }
  };

  const handleConfirmHandover = async (txId) => {
    const notes = window.prompt(
      'Confirm campus handover: Any notes on item condition or physical exchange?',
      'Item handed over and verified in good condition'
    );
    if (notes === null) return;

    try {
      setTxActionLoading(true);
      await api.confirmHandover(txId, notes);
      alert('Campus handover confirmed! Transaction marked as fully completed.');
      fetchAuctionData();
    } catch (err) {
      alert(err.message || 'Failed to confirm handover.');
    } finally {
      setTxActionLoading(false);
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

  // Format closing date & time nicely
  const closingDateFormatted = auction.closingAt
    ? new Date(auction.closingAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Not specified';

  // Determine if Transaction Section is relevant (never relevant for cancelled auctions)
  const hasTransactionOrEnded = (!!transaction || isClosed || auction.status !== 'active') && auction.status !== 'cancelled';

  return (
    <div className="details-page">
      <div className="details-container">
        {/* Breadcrumb Navigation & Actions */}
        <div className="details-nav-row">
          <Link to="/" className="btn-back">
            <ArrowLeft size={16} /> Back to Browse
          </Link>

          <div className="details-top-actions">
            {isSeller && auction.status === 'active' && (!auction.bidsCount || auction.bidsCount === 0) && (
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
            {isSeller && auction.status === 'active' && !isClosed && (
              <>
                <button
                  type="button"
                  className="btn-action-icon"
                  onClick={() => setShowExtendModal(true)}
                  title="Extend Auction Deadline"
                  style={{ color: '#818cf8' }}
                >
                  <Clock size={16} />
                  <span>Extend</span>
                </button>
                <button
                  type="button"
                  className="btn-action-icon"
                  onClick={() => setShowCancelModal(true)}
                  title="Cancel Auction"
                  style={{ color: '#ef4444' }}
                >
                  <Ban size={16} />
                  <span>Cancel</span>
                </button>
              </>
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

        {/* 2-Column Responsive Layout */}
        <div className="details-layout-grid">
          {/* ======================================================== */}
          {/* LEFT COLUMN: SECTION 1 (Item & Seller Information) & Q&A */}
          {/* ======================================================== */}
          <div className="details-main-col">
            {/* SECTION 1: Item and Seller Information */}
            <section className="section-block item-seller-section">
              <div className="section-badge-header">
                <div className="section-badge-title">
                  <span className="section-num-tag">1</span>
                  <h3>Item and Seller Information</h3>
                </div>
                {isSeller ? (
                  <span className="role-tag-badge seller-badge">
                    <Sparkles size={12} /> Your Listing
                  </span>
                ) : (
                  <span className="role-tag-badge bidder-badge">
                    Seller: <strong className="role-tag-name">{resolvedSellerName}</strong>
                  </span>
                )}
              </div>

              {/* Media gallery / main image */}
              <div className="details-media-card">
                <img
                  src={activeImgUrl || auction.imageUrl}
                  alt={auction.title}
                  className="details-main-img"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="media-overlay-tags">
                  <span className="badge-condition-lg">{auction.condition}</span>
                  <StatusBadge status={auction.status} />
                </div>
              </div>

              {/* Additional thumbnails if multiple images uploaded */}
              {auction.imageUrls && auction.imageUrls.length > 1 && (
                <div className="thumbnail-strip">
                  {auction.imageUrls.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`thumbnail-btn ${activeImgUrl === img ? 'active' : ''}`}
                      onClick={() => setActiveImgUrl(img)}
                    >
                      <img src={img} alt={`Preview ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}

              {/* Title & Key Meta */}
              <div className="item-title-block">
                <h1 className="auction-main-title">{auction.title}</h1>
                <div className="auction-category-chip">
                  <span>Category:</span>
                  <strong>{auction.category}</strong>
                </div>
              </div>

              {/* Description & Condition */}
              <div className="description-content">
                <h4>Description & Condition</h4>
                <p>{auction.description}</p>
              </div>

              {/* Item Specs Grid: Starting Price, Closing Time, Pickup Spot */}
              <div className="item-specs-grid">
                <div className="spec-card">
                  <span className="spec-label">Starting Price</span>
                  <strong className="spec-val price-accent">₹{auction.startingPrice.toLocaleString('en-IN')}</strong>
                </div>
                <div className="spec-card">
                  <span className="spec-label">Condition</span>
                  <strong className="spec-val">{auction.condition}</strong>
                </div>
                <div className="spec-card">
                  <span className="spec-label">Auction Closing Date & Time</span>
                  <strong className="spec-val spec-closing-time">
                    <Calendar size={13} /> {closingDateFormatted}
                  </strong>
                </div>
                <div className="spec-card">
                  <span className="spec-label">Campus Handover Location</span>
                  <strong className="spec-val spec-location">
                    <MapPin size={13} /> {auction.pickupLocation}
                  </strong>
                </div>
              </div>

              {/* Isolated Seller Profile Card */}
              <div className="seller-profile-subcard">
                <div className="seller-header">
                  <div className="seller-avatar">
                    {resolvedSellerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="seller-meta">
                    <span className="seller-card-badge-label">
                      {isSeller ? 'Your Listing Account' : 'Listing Seller'}
                    </span>
                    <h4>{isSeller ? `${resolvedSellerName} (You)` : resolvedSellerName}</h4>
                    <p>
                      {resolvedSellerDept && <span>{resolvedSellerDept} &bull; </span>}
                      {resolvedSellerRoll ? `Roll: ${resolvedSellerRoll}` : 'Verified Student'}
                    </p>
                  </div>
                </div>
                <div className="seller-badge-row">
                  <span className="trust-pill">Verified Student</span>
                  <span className="rating-pill">⭐ {auction.seller?.rating || '4.9'} rating</span>
                </div>
              </div>
            </section>

            {/* Public Questions & Answers Section */}
            <section className="section-block questions-section">
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
                  Ask about item condition, accessories, or pickup time:
                </label>
                <div className="question-input-row">
                  <input
                    id="student-question"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Does this textbook include all solved question papers?"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!newQuestion.trim() || askingQuestion}>
                    {askingQuestion ? 'Submitting...' : 'Ask'}
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

          {/* ======================================================== */}
          {/* RIGHT COLUMN: SECTION 2 (Bidding) & SECTION 3 (Transaction) */}
          {/* ======================================================== */}
          <div className="details-side-col">
            {/* SECTION 2: Bidding Information */}
            <section className="section-block bidding-info-section">
              <div className="section-badge-header">
                <div className="section-badge-title">
                  <span className="section-num-tag">2</span>
                  <h3>Bidding Information</h3>
                </div>
                {/* Role-appropriate indicator */}
                {isSeller ? (
                  <span className="role-tag-badge seller-badge">
                    Your Listing Bids ({auction.bidsCount || 0})
                  </span>
                ) : isWinningBidder ? (
                  <span className="role-tag-badge winner-badge">
                    Your Winning Status: <strong>Highest Bidder</strong>
                  </span>
                ) : myHighestBid ? (
                  <span className="role-tag-badge outbid-badge">
                    Your Bid: ₹{myHighestBid.toLocaleString('en-IN')} (Outbid)
                  </span>
                ) : (
                  <span className="role-tag-badge bidder-badge">
                    Bidder View
                  </span>
                )}
              </div>

              {/* Price & Leading Bidder Hero Box */}
              <div className="bidding-hero-box">
                <div className="bidding-header-top">
                  <div className="current-price-group">
                    <span className="label-sm">Current Highest Bid</span>
                    <div className="price-huge">₹{(auction.currentPrice || 0).toLocaleString('en-IN')}</div>
                    <span className="starting-subtext">Starting price: ₹{(auction.startingPrice || 0).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="countdown-container">
                    <span className="label-sm">Auction Closing</span>
                    <CountdownBadge
                      closingAt={auction.closingAt}
                      size="large"
                      onExpire={() => {
                        setAuction((prev) => (prev ? { ...prev, status: prev.bidsCount > 0 ? 'pending_approval' : 'unsold' } : prev));
                      }}
                    />
                  </div>
                </div>

                {/* Highest Bidder Display */}
                <div className="highest-bidder-pill-row">
                  <User size={15} className="bidder-badge-icon" />
                  <div className="highest-bidder-text-group">
                    <span className="highest-bidder-label">Highest Bidder:</span>
                    {auction.bidsCount > 0 && resolvedBidderName ? (
                      <strong className="highest-bidder-name-highlight">
                        {isWinningBidder ? `${resolvedBidderName} (You)` : resolvedBidderName}
                      </strong>
                    ) : (
                      <span className="details-no-bids">No bids yet</span>
                    )}
                  </div>
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
                <div className="extension-notice-banner">
                  <Clock size={16} /> {extensionNotice}
                </div>
              )}

              {/* Role-Specific Bid Actions */}
              <div className="bidding-action-container">
                {bidSuccess && (
                  <div className="bid-alert-success">
                    <CheckCircle size={16} /> {bidSuccess}
                  </div>
                )}

                {auction.status === 'cancelled' ? (
                  <div className="auction-cancelled-notice-box">
                    <AlertCircle size={22} className="cancelled-icon" />
                    <div className="cancelled-content">
                      <h4>Auction Cancelled by Seller</h4>
                      <p className="cancelled-reason">
                        <strong>Reason:</strong> {auction.cancellationReason || 'Cancelled by seller'}
                      </p>
                      <p className="cancelled-explanation">
                        Bidding is closed for this listing. No winner was selected and no transaction or handover will occur. Bid records are preserved for auditing.
                      </p>
                    </div>
                  </div>
                ) : isSeller ? (
                  <div className="seller-notice-box">
                    <Sparkles size={16} />
                    <div style={{ flex: 1 }}>
                      <strong>Your Listing (Seller View):</strong>
                      <p>Sellers are not permitted to bid on their own items. Monitor live bids below.</p>
                      {auction.status === 'active' && !isClosed && (
                        <div className="seller-management-actions">
                          <button
                            type="button"
                            className="btn-extend-action"
                            onClick={() => setShowExtendModal(true)}
                          >
                            <Clock size={15} /> Extend Deadline
                          </button>
                          <button
                            type="button"
                            className="btn-danger-outline"
                            onClick={() => setShowCancelModal(true)}
                          >
                            <Ban size={15} /> Cancel Auction
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : isClosed ? (
                  <div className="auction-closed-notice-box">
                    {auction.status === 'unsold' ? (
                      <div>
                        <strong>Auction Closed (Unsold):</strong> No qualifying bids were placed.
                      </div>
                    ) : (
                      <div>
                        <strong>Auction Closed:</strong> Bidding is concluded.
                      </div>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleBidSubmit} className="bid-form">
                    <div className="form-group">
                      <div className="bid-label-row">
                        <label htmlFor="bid-input" className="form-label">
                          Your Maximum Bid (₹)
                        </label>
                        <span className="min-bid-hint">
                          Minimum next bid: <strong>₹{minNextBid.toLocaleString('en-IN')}</strong>
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

                    {/* Quick increment chips */}
                    <div className="quick-bid-buttons">
                      <button
                        type="button"
                        className="btn-quick-chip"
                        onClick={() => setBidAmount(minNextBid.toString())}
                        disabled={placingBid}
                      >
                        Min Valid (₹{minNextBid})
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
                      By submitting a bid, you commit to purchase at this price if you are the provisional winner and the seller approves.
                    </p>
                  </form>
                )}
              </div>

              {/* Bid History Table (Bidder Name, Bid Amount, Bid Time) */}
              <div className="bid-history-container">
                <div className="history-header">
                  <div className="title-with-icon">
                    <History size={16} />
                    <h4>Bid History ({bidHistory.length})</h4>
                  </div>
                  <span className="history-hint">Student Bids</span>
                </div>

                <div className="bid-history-table-wrapper">
                  {bidHistory && bidHistory.length > 0 ? (
                    <div className="bid-history-list">
                      {bidHistory.map((bid, index) => {
                        const isThisBidder = currentUser && (
                          (bid.bidder?._id === currentUser.id || bid.bidder?.id === currentUser.id || bid.bidder === currentUser.id) ||
                          bid.bidderName === currentUser.name
                        );
                        const displayName = bid.bidderName || bid.bidderMasked || 'Student';

                        return (
                          <div
                            key={bid.id || bid._id || index}
                            className={`bid-history-row ${index === 0 ? 'leading-bid' : ''}`}
                          >
                            <div className="bidder-info">
                              <span className="bidder-name-cell">
                                {displayName} {isThisBidder && <strong className="you-pill">(You)</strong>}
                              </span>
                              {index === 0 && (
                                <span className="winning-badge">Highest</span>
                              )}
                            </div>
                            <div className="bid-figures">
                              <strong className="bid-price">₹{(bid.amount || 0).toLocaleString('en-IN')}</strong>
                              <span className="bid-time">
                                {bid.createdAt
                                  ? new Date(bid.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'Recently'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="no-bids-yet">No bids placed yet. Submit the opening bid at starting price!</p>
                  )}
                </div>
              </div>
            </section>

            {/* ======================================================== */}
            {/* SECTION 3: Transaction Information */}
            {/* ======================================================== */}
            {hasTransactionOrEnded && (
              <section className="section-block transaction-info-section">
                <div className="section-badge-header">
                  <div className="section-badge-title">
                    <span className="section-num-tag">3</span>
                    <h3>Transaction Information</h3>
                  </div>
                  <span className="role-tag-badge transaction-badge">
                    {transaction ? `Status: ${transaction.status}` : 'Outcome Pending'}
                  </span>
                </div>

                <div className="transaction-details-box">
                  {/* Winning Bidder */}
                  <div className="tx-info-row">
                    <span className="tx-label">
                      {isSeller ? 'Winning Bidder' : isWinningBidder ? 'Your Winning Status' : 'Winning Bidder'}
                    </span>
                    <strong className="tx-val winner-name">
                      {transaction?.buyerName ||
                        transaction?.buyer?.name ||
                        auction.provisionalWinnerName ||
                        resolvedBidderName ||
                        'None'}
                      {isWinningBidder ? ' (Provisional Winner — You)' : ''}
                    </strong>
                  </div>

                  {/* Agreed / Winning Amount */}
                  <div className="tx-info-row">
                    <span className="tx-label">Winning Price</span>
                    <strong className="tx-val price-highlight">
                      ₹{(transaction?.finalPrice || auction.winningAmount || auction.currentPrice || 0).toLocaleString('en-IN')}
                    </strong>
                  </div>

                  {/* Seller Approval Status */}
                  <div className="tx-info-row">
                    <span className="tx-label">Seller Approval Status</span>
                    <div className="tx-val">
                      {transaction?.status === 'approved' ? (
                        <span className="status-pill-tx approved">
                          <CheckCircle size={13} /> Approved by Seller (Item Reserved)
                        </span>
                      ) : transaction?.status === 'rejected' ? (
                        <span className="status-pill-tx rejected">
                          <XCircle size={13} /> Rejected by Seller
                        </span>
                      ) : transaction?.status === 'pending_seller_approval' ? (
                        <span className="status-pill-tx pending">
                          <Clock size={13} /> {isSeller ? 'Awaiting Your Approval' : 'Pending Seller Decision'}
                        </span>
                      ) : auction.status === 'unsold' ? (
                        <span className="status-pill-tx unsold">
                          Auction Unsold
                        </span>
                      ) : (
                        <span className="status-pill-tx pending">
                          {isSeller ? 'Pending Decision' : 'Pending Approval'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Payment Method & Payment Status */}
                  <div className="tx-info-row">
                    <span className="tx-label">Payment Method & Status</span>
                    <div className="tx-val">
                      {transaction?.payment?.status === 'PAID' ? (
                        <span className="payment-pill paid">
                          <CheckCircle size={13} /> PAID ({transaction.payment.method || 'Verified'})
                        </span>
                      ) : transaction?.payment?.method ? (
                        <span className="payment-pill pending">
                          <Clock size={13} /> PENDING ({transaction.payment.method === 'COD' ? 'Cash on Delivery' : 'UPI'})
                        </span>
                      ) : (
                        <span className="payment-pill unselected">
                          Awaiting Payment Selection
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Campus Handover Status */}
                  <div className="tx-info-row">
                    <span className="tx-label">Campus Handover Status</span>
                    <div className="tx-val">
                      {transaction?.status === 'completed' ? (
                        <span className="handover-pill completed">
                          <CheckCircle size={13} /> Handover Completed at {transaction.pickupLocation}
                        </span>
                      ) : transaction?.status === 'failed_pickup' ? (
                        <span className="handover-pill failed">
                          <XCircle size={13} /> Handover Failed / Cancelled
                        </span>
                      ) : transaction?.status === 'approved' ? (
                        <span className="handover-pill reserved">
                          <Handshake size={13} /> Reserved for Campus Handover at {transaction.pickupLocation}
                        </span>
                      ) : (
                        <span className="handover-pill pending">
                          Scheduled at {auction.pickupLocation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role-Based Transaction Actions */}
                  {/* Seller Approval Actions */}
                  {isSeller && transaction?.status === 'pending_seller_approval' && (
                    <div className="tx-action-bar">
                      <p className="tx-action-notice">
                        <strong>Approval Action Needed:</strong> Please accept or reject the provisional winning price.
                      </p>
                      <div className="tx-btn-group">
                        <button
                          className="btn-reject-sale"
                          onClick={() => handleRejectSale(transaction.id || transaction._id)}
                          disabled={txActionLoading}
                        >
                          <X size={15} /> Reject Bid
                        </button>
                        <button
                          className="btn-approve-sale"
                          onClick={() => handleApproveSale(transaction.id || transaction._id)}
                          disabled={txActionLoading}
                        >
                          <Check size={15} /> Approve & Reserve
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Buyer Payment Action */}
                  {isWinningBidder && transaction?.status === 'approved' && transaction?.payment?.status !== 'PAID' && (
                    <div className="tx-action-bar">
                      <p className="tx-action-notice">
                        <strong>Seller Approved:</strong> Item is reserved! Choose Cash on Delivery (COD) or Instant UPI to confirm.
                      </p>
                      <Link
                        to={`/payment/${transaction.id || transaction._id}`}
                        className="btn btn-primary btn-confirm-payment-link"
                      >
                        <CreditCard size={15} /> Confirm Payment
                      </Link>
                    </div>
                  )}

                  {/* Handover Confirmation Action (Seller or Buyer) */}
                  {(isSeller || isWinningBidder) && transaction?.status === 'approved' && (
                    <div className="tx-action-bar" style={{ marginTop: '0.75rem' }}>
                      <button
                        className="btn btn-confirm-handover-action"
                        onClick={() => handleConfirmHandover(transaction.id || transaction._id)}
                        disabled={txActionLoading}
                      >
                        <Handshake size={15} /> Confirm Campus Handover Exchange
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Manual Auction Extension Modal */}
        <ExtendAuctionModal
          isOpen={showExtendModal}
          onClose={() => setShowExtendModal(false)}
          auction={auction}
          onSuccess={(updated) => {
            setAuction(updated);
            setExtensionNotice('Auction deadline extended successfully.');
            setTimeout(() => setExtensionNotice(''), 8000);
          }}
        />

        {/* Seller Auction Cancellation Modal */}
        <CancelAuctionModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          auction={auction}
          onSuccess={(updated) => {
            setAuction(updated);
          }}
        />
      </div>
    </div>
  );
}
