import { Link } from 'react-router-dom';
import { Tag, MapPin, Gavel, User, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CountdownBadge from './CountdownBadge';
import './AuctionCard.css';

export default function AuctionCard({ auction }) {
  if (!auction) return null;

  const { currentUser } = useAuth();

  const {
    id,
    _id,
    title,
    imageUrl,
    currentPrice,
    startingPrice,
    bidsCount,
    condition,
    category,
    closingAt,
    seller,
    sellerName,
    sellerDepartment,
    pickupLocation,
    highestBidderName,
    highestBidder
  } = auction;

  const auctionId = id || _id;

  // Determine user role
  const isSeller = currentUser && (
    (typeof seller === 'object' && (seller?._id === currentUser.id || seller?.id === currentUser.id)) ||
    seller === currentUser.id
  );

  // Resolve actual highest bidder display name
  const resolvedBidderName =
    highestBidderName ||
    (highestBidder && typeof highestBidder === 'object' && highestBidder.name ? highestBidder.name : null);

  const isWinningBidder = currentUser && (
    (resolvedBidderName && resolvedBidderName === currentUser.name) ||
    (typeof highestBidder === 'object' && (highestBidder?._id === currentUser.id || highestBidder?.id === currentUser.id)) ||
    highestBidder === currentUser.id
  );

  const resolvedSellerName = seller?.name || sellerName || 'Campus Student';
  const resolvedSellerDept = seller?.department || sellerDepartment;

  return (
    <article className={`auction-card ${isSeller ? 'card-user-is-seller' : ''} ${isWinningBidder ? 'card-user-is-winner' : ''}`}>
      <Link to={`/auctions/${auctionId}`} className="card-media-wrapper">
        <img
          src={imageUrl}
          alt={title}
          className="card-image"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80';
          }}
        />
        <div className="card-media-badges">
          <span className="badge-condition">{condition}</span>
          <CountdownBadge closingAt={closingAt} />
        </div>
      </Link>

      <div className="card-content">
        {/* Section 1: Item and Seller Information */}
        <div className="card-section card-item-seller-section">
          <div className="card-meta-top">
            <span className="card-category">
              <Tag size={12} /> {category}
            </span>
            <span className="card-starting-price">
              Starts: ₹{(startingPrice || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <h3 className="card-title">
            <Link to={`/auctions/${auctionId}`}>{title}</Link>
          </h3>

          <div className="card-party-row card-seller-row">
            {isSeller ? (
              <span className="role-tag-badge seller-badge">
                <Sparkles size={11} /> Your Listing
              </span>
            ) : (
              <>
                <span className="party-label">Seller:</span>
                <span className="party-name seller-highlight">{resolvedSellerName}</span>
                {resolvedSellerDept && <span className="seller-dept">&bull; {resolvedSellerDept}</span>}
              </>
            )}
          </div>
        </div>

        {/* Section 2: Bidding Information */}
        <div className="card-section card-bidding-block">
          <div className="bidding-block-header">
            {isWinningBidder ? (
              <span className="bidding-role-indicator winning">
                Your Winning Status: <strong>Highest Bidder</strong>
              </span>
            ) : isSeller ? (
              <span className="bidding-role-indicator seller">
                Listing Bidding Activity ({bidsCount || 0})
              </span>
            ) : (
              <span className="bidding-role-indicator">
                <Gavel size={11} /> Bidding Information
              </span>
            )}
          </div>

          <div className="card-party-row card-bidder-row">
            {bidsCount > 0 && resolvedBidderName ? (
              <span className="party-bidder-text">
                Highest Bidder: <strong className="party-name bidder-highlight">
                  {isWinningBidder ? `${resolvedBidderName} (You)` : resolvedBidderName}
                </strong>
              </span>
            ) : (
              <span className="no-bids-text">No bids yet</span>
            )}
          </div>
        </div>

        <div className="card-location">
          <MapPin size={12} /> <span>Handover: {pickupLocation}</span>
        </div>

        <div className="card-footer">
          <div className="price-stack">
            <span className="price-label">Current Highest Bid</span>
            <span className="price-amount">₹{(currentPrice || 0).toLocaleString('en-IN')}</span>
          </div>

          <Link to={`/auctions/${auctionId}`} className="btn-view-auction">
            {isSeller ? 'Manage Listing' : 'View Auction'}
          </Link>
        </div>
      </div>
    </article>
  );
}
