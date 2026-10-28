import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Gavel,
  Package,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Edit,
  Handshake,
  Check,
  X,
  AlertTriangle,
  PlusCircle,
  UserCheck,
  Ban
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import './Dashboard.css';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'bids'
  const [listingsFilter, setListingsFilter] = useState('all');
  const [bidsFilter, setBidsFilter] = useState('all');

  const [myListings, setMyListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const [myBids, setMyBids] = useState([]);
  const [loadingBids, setLoadingBids] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser?.id) return;

    // 1. Fetch real listings
    try {
      setLoadingListings(true);
      setListingsError('');
      const res = await api.getAuctions({
        seller: currentUser.id,
        status: 'all'
      });
      setMyListings(res?.auctions || []);
    } catch (err) {
      console.error('Failed to load user listings:', err);
      setListingsError(err.message || 'Failed to fetch your listings.');
    } finally {
      setLoadingListings(false);
    }

    // 2. Fetch real transactions
    try {
      setLoadingTransactions(true);
      const txRes = await api.getTransactions({ role: 'all' });
      setTransactions(txRes?.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }

    // 3. Fetch real user bids
    try {
      setLoadingBids(true);
      const bidsRes = await api.getMyBids();
      setMyBids(bidsRes?.bids || []);
    } catch (err) {
      console.error('Failed to load user bids:', err);
    } finally {
      setLoadingBids(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle listing cancellation (Soft delete)
  const handleCancelListing = async (listingId) => {
    const reason = window.prompt(
      'Are you sure you want to cancel this auction listing?\nPlease provide a reason (e.g. "Item no longer available"):',
      'Seller withdrew item'
    );
    if (!reason) return;

    try {
      await api.cancelListing(listingId, reason);
      alert('Auction listing has been cancelled.');
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to cancel listing.');
    }
  };

  // Module 7 Handlers
  const handleApproveSale = async (txId) => {
    try {
      await api.approveTransaction(txId);
      alert('Winning bid approved! The item is now officially reserved for campus handover.');
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to approve winning bid.');
    }
  };

  const handleRejectSale = async (txId) => {
    const reason = window.prompt(
      'Please provide a reason for rejecting the provisional winning bid:',
      'Minimum reserve price expectation not met'
    );
    if (reason === null) return;

    try {
      await api.rejectTransaction(txId, reason);
      alert('Winning bid rejected. Auction outcome recorded as unsold.');
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to reject winning bid.');
    }
  };

  const handleConfirmHandover = async (txId) => {
    const notes = window.prompt(
      'Confirm campus handover: Any notes on item condition or physical exchange?',
      'Item handed over and verified in good condition'
    );
    if (notes === null) return;

    try {
      await api.confirmHandover(txId, notes);
      alert('Campus handover confirmed! Transaction marked as fully completed.');
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to confirm handover.');
    }
  };

  const handleReportFailedPickup = async (txId) => {
    const reason = window.prompt(
      'Please describe why the campus handover failed (e.g., student did not arrive, item condition mismatch):',
      'Buyer did not arrive at designated campus spot'
    );
    if (reason === null) return;

    try {
      await api.reportFailedPickup(txId, reason);
      alert('Failed pickup recorded. Auction outcome set to unsold.');
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to report pickup failure.');
    }
  };

  // Derive Module 7 Sections
  // 1. Pending Seller Decisions: Transactions where currentUser is the seller & status is pending_seller_approval
  const pendingDecisions = transactions.filter((t) => {
    const sellerId = t.seller?._id || t.seller?.id || t.seller;
    return sellerId?.toString() === currentUser?.id?.toString() && t.status === 'pending_seller_approval';
  });

  // 2. Active Campus Handovers: Transactions in 'approved' status (reserved for winner) where user is participant
  const activeHandovers = transactions.filter((t) => t.status === 'approved');

  // Filter listings
  const filteredListings = myListings.filter((l) => {
    if (listingsFilter === 'all') return true;
    return l.status === listingsFilter;
  });

  // Filter bids
  const filteredBids = myBids.filter((b) => {
    if (bidsFilter === 'all') return true;
    return b.status === bidsFilter;
  });

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Profile Header Card */}
        <section className="profile-header-card">
          <div className="profile-left">
            <div className="profile-avatar-lg">
              {currentUser?.name?.charAt(0) || 'S'}
            </div>
            <div className="profile-details">
              <div className="profile-name-row">
                <h2>{currentUser?.name || 'Campus Student'}</h2>
                <span className="profile-verified-badge">
                  <UserCheck size={14} /> Verified Student
                </span>
              </div>
              <p className="profile-meta">
                {currentUser?.email} &bull; Roll: {currentUser?.studentId || 'Verified'} &bull;{' '}
                {currentUser?.department || 'Engineering'}
              </p>
            </div>
          </div>

          <div className="profile-actions">
            <Link to="/create-listing" className="btn btn-primary">
              <PlusCircle size={16} /> Create New Listing
            </Link>
          </div>
        </section>

        {/* Module 7: Section 1 - Pending Seller Decisions */}
        {pendingDecisions.length > 0 && (
          <div className="module7-section">
            <div className="module7-section-header">
              <AlertTriangle size={20} color="#f59e0b" />
              <span>Pending Seller Decisions</span>
              <span className="module7-badge-count urgent">{pendingDecisions.length} Action Needed</span>
            </div>
            <div className="module7-cards-grid">
              {pendingDecisions.map((tx) => (
                <div key={tx.id} className="decision-card">
                  <div className="card-top-row">
                    <span className="card-title-text">{tx.auctionTitle}</span>
                    <span className="card-status-pill pending">Awaiting Decision</span>
                  </div>
                  <div className="card-details-grid">
                    <div className="card-detail-item">
                      <span className="detail-label">Winning Bid</span>
                      <span className="detail-val price">₹{(tx.finalPrice || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="card-detail-item">
                      <span className="detail-label">Buyer</span>
                      <span className="detail-val">{tx.buyerName || tx.buyer?.name || 'Student'} ({tx.buyerRoll || tx.buyer?.studentId || 'Verified'})</span>
                    </div>
                    <div className="card-detail-item" style={{ gridColumn: 'span 2' }}>
                      <span className="detail-label">Designated Handover Spot</span>
                      <span className="detail-val">{tx.pickupLocation}</span>
                    </div>
                  </div>
                  <div className="card-action-bar">
                    <button
                      className="btn-reject"
                      onClick={() => handleRejectSale(tx.id)}
                    >
                      <X size={14} /> Reject Bid
                    </button>
                    <button
                      className="btn-approve"
                      onClick={() => handleApproveSale(tx.id)}
                    >
                      <Check size={14} /> Approve & Reserve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Module 7: Section 2 - Active Campus Handovers */}
        {activeHandovers.length > 0 && (
          <div className="module7-section">
            <div className="module7-section-header">
              <Handshake size={20} color="#10b981" />
              <span>Scheduled Campus Handovers</span>
              <span className="module7-badge-count">{activeHandovers.length} Ready</span>
            </div>
            <div className="module7-cards-grid">
              {activeHandovers.map((tx) => {
                const sellerId = tx.seller?._id || tx.seller?.id || tx.seller;
                const isSeller = sellerId?.toString() === currentUser?.id?.toString();
                const otherName = isSeller ? (tx.buyerName || tx.buyer?.name) : (tx.sellerName || tx.seller?.name);
                const otherRoll = isSeller ? (tx.buyerRoll || tx.buyer?.studentId) : (tx.sellerRoll || tx.seller?.studentId);
                return (
                  <div key={tx.id} className="handover-card">
                    <div className="card-top-row">
                      <span className="card-title-text">{tx.auctionTitle}</span>
                      <span className="card-status-pill approved">Item Reserved</span>
                    </div>
                    <div className="card-details-grid">
                      <div className="card-detail-item">
                        <span className="detail-label">Agreed Amount</span>
                        <span className="detail-val price">₹{(tx.finalPrice || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="card-detail-item">
                        <span className="detail-label">{isSeller ? 'Meeting Buyer' : 'Meeting Seller'}</span>
                        <span className="detail-val">{otherName} ({otherRoll})</span>
                      </div>
                      <div className="card-detail-item" style={{ gridColumn: 'span 2' }}>
                        <span className="detail-label">Handover Meeting Spot</span>
                        <span className="detail-val">{tx.pickupLocation}</span>
                      </div>
                    </div>
                    <div className="card-action-bar">
                      <button
                        className="btn-report-fail"
                        onClick={() => handleReportFailedPickup(tx.id)}
                      >
                        <Ban size={13} /> Report Failed Pickup
                      </button>
                      <button
                        className="btn-confirm-handover"
                        onClick={() => handleConfirmHandover(tx.id)}
                      >
                        <CheckCircle size={14} /> Confirm Handover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dashboard Tabs Bar */}
        <div className="dashboard-tabs-bar">
          <button
            className={`dash-tab ${activeTab === 'listings' ? 'active' : ''}`}
            onClick={() => setActiveTab('listings')}
          >
            <Package size={18} />
            <span>My Listings ({myListings.length})</span>
          </button>
          <button
            className={`dash-tab ${activeTab === 'bids' ? 'active' : ''}`}
            onClick={() => setActiveTab('bids')}
          >
            <Gavel size={18} />
            <span>My Bids ({myBids.length})</span>
          </button>
        </div>

        {/* TAB 1: MY LISTINGS */}
        {activeTab === 'listings' && (
          <div className="dashboard-content">
            {/* Filter Pills */}
            <div className="sub-filter-row">
              <button
                className={`filter-btn ${listingsFilter === 'all' ? 'active' : ''}`}
                onClick={() => setListingsFilter('all')}
              >
                All ({myListings.length})
              </button>
              <button
                className={`filter-btn ${listingsFilter === 'active' ? 'active' : ''}`}
                onClick={() => setListingsFilter('active')}
              >
                Live Auctions ({myListings.filter((l) => l.status === 'active').length})
              </button>
              <button
                className={`filter-btn ${listingsFilter === 'pending_approval' ? 'active' : ''}`}
                onClick={() => setListingsFilter('pending_approval')}
              >
                Awaiting Approval ({myListings.filter((l) => l.status === 'pending_approval').length})
              </button>
              <button
                className={`filter-btn ${listingsFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setListingsFilter('completed')}
              >
                Sold / Completed ({myListings.filter((l) => l.status === 'completed').length})
              </button>
              <button
                className={`filter-btn ${listingsFilter === 'unsold' ? 'active' : ''}`}
                onClick={() => setListingsFilter('unsold')}
              >
                Unsold ({myListings.filter((l) => l.status === 'unsold').length})
              </button>
            </div>

            {/* Listings Table */}
            {loadingListings ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                <LoadingSpinner size="md" message="Loading your campus listings..." />
              </div>
            ) : listingsError ? (
              <div style={{ color: '#ef4444', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', margin: '1rem 0' }}>
                {listingsError}
              </div>
            ) : filteredListings.length > 0 ? (
              <div className="dash-table-wrapper">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Current / Final Bid</th>
                      <th>Bids</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredListings.map((item) => {
                      const linkedTx = transactions.find((t) => {
                        const aucId = t.auction?._id || t.auction?.id || t.auction;
                        return aucId?.toString() === item.id?.toString();
                      });

                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="table-item-cell">
                              <strong>{item.title}</strong>
                              <span className="table-subtext">Pickup: {item.pickupLocation}</span>
                            </div>
                          </td>
                          <td>
                            <span className="category-tag">{item.category}</span>
                          </td>
                          <td>
                            <strong className="table-price">₹{(item.currentPrice || 0).toLocaleString('en-IN')}</strong>
                            <span className="table-subtext">Start: ₹{item.startingPrice}</span>
                          </td>
                          <td>{item.bidsCount || 0} bids</td>
                          <td>
                            <StatusBadge status={item.status} />
                          </td>
                          <td>
                            <div className="table-action-group">
                              <Link to={`/auctions/${item.id}`} className="btn-table-action" title="View details">
                                <ArrowUpRight size={15} />
                              </Link>

                              {item.status === 'active' && (!item.bidsCount || item.bidsCount === 0) && (
                                <Link to={`/edit-listing/${item.id}`} className="btn-table-action" title="Edit listing">
                                  <Edit size={15} />
                                </Link>
                              )}

                              {item.status === 'active' && (
                                <button
                                  className="btn-table-action"
                                  onClick={() => handleCancelListing(item.id)}
                                  title="Cancel auction listing"
                                  style={{ color: '#ef4444' }}
                                >
                                  <Ban size={15} />
                                </button>
                              )}

                              {/* Seller Approval Buttons */}
                              {item.status === 'pending_approval' && linkedTx && (
                                <div className="approval-btn-group">
                                  <button
                                    className="btn-approve"
                                    onClick={() => handleApproveSale(linkedTx.id)}
                                    title="Approve Winning Bid"
                                  >
                                    <Check size={14} /> Approve
                                  </button>
                                  <button
                                    className="btn-reject"
                                    onClick={() => handleRejectSale(linkedTx.id)}
                                    title="Reject Bid"
                                  >
                                    <X size={14} /> Reject
                                  </button>
                                </div>
                              )}

                              {item.status === 'completed' && (
                                <span className="badge-done">
                                  <CheckCircle size={13} /> Completed
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No listings in this category"
                description="List your unused cycle, textbooks or room essentials now."
                actionLabel="Create an Auction"
                onAction={() => (window.location.href = '/create-listing')}
              />
            )}
          </div>
        )}

        {/* TAB 2: MY BIDS */}
        {activeTab === 'bids' && (
          <div className="dashboard-content">
            {/* Filter Pills */}
            <div className="sub-filter-row">
              <button
                className={`filter-btn ${bidsFilter === 'all' ? 'active' : ''}`}
                onClick={() => setBidsFilter('all')}
              >
                All Bids ({myBids.length})
              </button>
              <button
                className={`filter-btn ${bidsFilter === 'winning' ? 'active' : ''}`}
                onClick={() => setBidsFilter('winning')}
              >
                Leading / Winning ({myBids.filter((b) => b.status === 'winning').length})
              </button>
              <button
                className={`filter-btn ${bidsFilter === 'outbid' ? 'active' : ''}`}
                onClick={() => setBidsFilter('outbid')}
              >
                Outbid ({myBids.filter((b) => b.status === 'outbid').length})
              </button>
              <button
                className={`filter-btn ${bidsFilter === 'won' ? 'active' : ''}`}
                onClick={() => setBidsFilter('won')}
              >
                Won Auctions ({myBids.filter((b) => b.status === 'won').length})
              </button>
            </div>

            {/* Bids Table */}
            {loadingBids ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                <LoadingSpinner size="md" message="Loading your campus bids..." />
              </div>
            ) : filteredBids.length > 0 ? (
              <div className="dash-table-wrapper">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Auction Item</th>
                      <th>My Bid</th>
                      <th>Current Leader</th>
                      <th>Status</th>
                      <th>Handover</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBids.map((bid) => {
                      const tx = bid.transaction;
                      return (
                        <tr key={bid.id}>
                          <td>
                            <div className="table-item-cell">
                              <strong>{bid.title}</strong>
                              <span className="table-subtext">Spot: {bid.pickupLocation}</span>
                            </div>
                          </td>
                          <td>
                            <strong className="table-price">₹{(bid.myBidAmount || 0).toLocaleString('en-IN')}</strong>
                          </td>
                          <td>
                            <strong className="table-price-leader">₹{(bid.currentLeadingPrice || 0).toLocaleString('en-IN')}</strong>
                          </td>
                          <td>
                            <StatusBadge status={bid.status} />
                          </td>
                          <td>
                            {tx?.status === 'approved' ? (
                              <button
                                className="btn-confirm-handover"
                                onClick={() => handleConfirmHandover(tx.id || tx._id)}
                              >
                                <Handshake size={14} /> Confirm Pickup
                              </button>
                            ) : tx?.status === 'completed' ? (
                              <span className="badge-done">
                                <CheckCircle size={13} /> Handover Done
                              </span>
                            ) : bid.status === 'awaiting_approval' ? (
                              <span className="table-subtext">Awaiting Seller</span>
                            ) : (
                              <span className="table-subtext">{bid.status === 'winning' ? 'Leading' : 'Pending close'}</span>
                            )}
                          </td>
                          <td>
                            <div className="table-action-group">
                              <Link to={`/auctions/${bid.auctionId}`} className="btn-table-action" title="View auction">
                                <ArrowUpRight size={15} /> View
                              </Link>
                              {bid.status === 'outbid' && (
                                <Link to={`/auctions/${bid.auctionId}`} className="btn-bid-higher">
                                  Bid Higher
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No bids found"
                description="You have not placed bids under this filter yet. Explore live auctions!"
                actionLabel="Browse Live Auctions"
                onAction={() => (window.location.href = '/')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
