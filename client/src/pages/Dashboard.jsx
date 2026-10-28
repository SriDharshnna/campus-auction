import { useState } from 'react';
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
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MOCK_AUCTIONS } from '../mock/mockData';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import './Dashboard.css';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('listings'); // 'listings' | 'bids'
  const [listingsFilter, setListingsFilter] = useState('all');
  const [bidsFilter, setBidsFilter] = useState('all');

  // Simulated student listings
  const [myListings, setMyListings] = useState([
    {
      id: 'auc-001',
      title: 'Firefox 21-Speed Mountain Gear Bicycle',
      category: 'cycles',
      currentPrice: 4200,
      startingPrice: 3500,
      bidsCount: 6,
      closingAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      status: 'active',
      winnerName: 'Student ***42',
      pickupLocation: 'Hostel 4 Ground Floor'
    },
    {
      id: 'auc-004',
      title: 'Dell 24-inch IPS 75Hz Monitor with HDMI Cable',
      category: 'electronics',
      currentPrice: 5800,
      startingPrice: 4500,
      bidsCount: 11,
      closingAt: new Date(Date.now() + 28 * 60 * 1000).toISOString(),
      status: 'active',
      winnerName: 'Student ***88',
      pickupLocation: 'Hostel 4 Ground Floor'
    },
    {
      id: 'auc-007',
      title: 'Bajaj Room Heater 1000W (Winter Essential)',
      category: 'dorm',
      currentPrice: 950,
      startingPrice: 600,
      bidsCount: 5,
      closingAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      status: 'pending_approval',
      winnerName: 'Student ***15',
      winningAmount: 950,
      pickupLocation: 'Library Courtyard'
    },
    {
      id: 'auc-008',
      title: 'Engineering Mechanics by Timoshenko (5th Edition)',
      category: 'textbooks',
      currentPrice: 450,
      startingPrice: 450,
      bidsCount: 0,
      closingAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      status: 'unsold',
      pickupLocation: 'Main Gate'
    }
  ]);

  // Simulated student bids
  const [myBids, setMyBids] = useState([
    {
      id: 'bid-rec-1',
      auctionId: 'auc-002',
      title: 'Casio fx-991EX Scientific Classwiz Calculator',
      category: 'calculators',
      myBidAmount: 1150,
      currentLeadingPrice: 1150,
      status: 'winning',
      closingAt: new Date(Date.now() + 18 * 60 * 1000).toISOString(),
      pickupLocation: 'Library Courtyard'
    },
    {
      id: 'bid-rec-2',
      auctionId: 'auc-003',
      title: 'Thomas Calculus (14th Edition) & Halliday-Resnick Physics Set',
      category: 'textbooks',
      myBidAmount: 1300,
      currentLeadingPrice: 1500,
      status: 'outbid',
      closingAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      pickupLocation: 'Academic Complex Atrium'
    },
    {
      id: 'bid-rec-3',
      auctionId: 'auc-009',
      title: 'Study Desk Table Lamp (3-Tone LED)',
      category: 'dorm',
      myBidAmount: 400,
      currentLeadingPrice: 400,
      status: 'won',
      closingAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      pickupLocation: 'Hostel 7 Common Room',
      handoverConfirmed: false
    }
  ]);

  // Seller Action handlers
  const handleApproveSale = (listingId) => {
    setMyListings(
      myListings.map((item) =>
        item.id === listingId ? { ...item, status: 'completed' } : item
      )
    );
    alert('Winning bid approved! The item is reserved and ready for campus handover.');
  };

  const handleRejectSale = (listingId) => {
    setMyListings(
      myListings.map((item) =>
        item.id === listingId ? { ...item, status: 'unsold' } : item
      )
    );
    alert('Winning bid rejected. Marked as unsold.');
  };

  const handleConfirmHandover = (bidId) => {
    setMyBids(
      myBids.map((bid) =>
        bid.id === bidId ? { ...bid, handoverConfirmed: true } : bid
      )
    );
    alert('Campus handover confirmed! Transaction marked as fully complete.');
  };

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
                {currentUser?.email} &bull; Roll: {currentUser?.studentId || '2023CSB1042'} &bull;{' '}
                {currentUser?.department || 'Engineering'} ({currentUser?.batch || 'Class of 2026'})
              </p>
            </div>
          </div>

          <div className="profile-actions">
            <Link to="/create-listing" className="btn btn-primary">
              <PlusCircle size={16} /> Create New Listing
            </Link>
          </div>
        </section>

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

            {/* Listings Table / Cards */}
            {filteredListings.length > 0 ? (
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
                    {filteredListings.map((item) => (
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
                          <strong className="table-price">₹{item.currentPrice.toLocaleString('en-IN')}</strong>
                          <span className="table-subtext">Start: ₹{item.startingPrice}</span>
                        </td>
                        <td>{item.bidsCount} bids</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>
                          <div className="table-action-group">
                            <Link to={`/auctions/${item.id}`} className="btn-table-action" title="View details">
                              <ArrowUpRight size={15} />
                            </Link>

                            {item.status === 'active' && item.bidsCount === 0 && (
                              <Link to={`/create-listing?edit=${item.id}`} className="btn-table-action" title="Edit listing">
                                <Edit size={15} />
                              </Link>
                            )}

                            {/* Seller Approval Buttons */}
                            {item.status === 'pending_approval' && (
                              <div className="approval-btn-group">
                                <button
                                  className="btn-approve"
                                  onClick={() => handleApproveSale(item.id)}
                                  title="Approve Winning Bid"
                                >
                                  <Check size={14} /> Approve
                                </button>
                                <button
                                  className="btn-reject"
                                  onClick={() => handleRejectSale(item.id)}
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
                    ))}
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
            {filteredBids.length > 0 ? (
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
                    {filteredBids.map((bid) => (
                      <tr key={bid.id}>
                        <td>
                          <div className="table-item-cell">
                            <strong>{bid.title}</strong>
                            <span className="table-subtext">Spot: {bid.pickupLocation}</span>
                          </div>
                        </td>
                        <td>
                          <strong className="table-price">₹{bid.myBidAmount.toLocaleString('en-IN')}</strong>
                        </td>
                        <td>
                          <strong className="table-price-leader">₹{bid.currentLeadingPrice.toLocaleString('en-IN')}</strong>
                        </td>
                        <td>
                          <StatusBadge status={bid.status} />
                        </td>
                        <td>
                          {bid.status === 'won' ? (
                            bid.handoverConfirmed ? (
                              <span className="badge-done">
                                <CheckCircle size={13} /> Handover Done
                              </span>
                            ) : (
                              <button
                                className="btn-confirm-handover"
                                onClick={() => handleConfirmHandover(bid.id)}
                              >
                                <Handshake size={14} /> Confirm Pickup
                              </button>
                            )
                          ) : (
                            <span className="table-subtext">Pending close</span>
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
                    ))}
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
