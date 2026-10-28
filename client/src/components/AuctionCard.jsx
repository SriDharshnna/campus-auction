import { Link } from 'react-router-dom';
import { Tag, MapPin, Gavel } from 'lucide-react';
import CountdownBadge from './CountdownBadge';
import './AuctionCard.css';

export default function AuctionCard({ auction }) {
  if (!auction) return null;

  const {
    id,
    title,
    imageUrl,
    currentPrice,
    startingPrice,
    bidsCount,
    condition,
    category,
    closingAt,
    seller,
    pickupLocation
  } = auction;

  return (
    <article className="auction-card">
      <Link to={`/auctions/${id}`} className="card-media-wrapper">
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
        <div className="card-meta-top">
          <span className="card-category">
            <Tag size={12} /> {category}
          </span>
          <span className="card-bids">
            <Gavel size={12} /> {bidsCount} {bidsCount === 1 ? 'bid' : 'bids'}
          </span>
        </div>

        <h3 className="card-title">
          <Link to={`/auctions/${id}`}>{title}</Link>
        </h3>

        <div className="card-seller-info">
          <span className="seller-name">{seller?.name}</span>
          <span className="seller-dept">&bull; {seller?.department}</span>
        </div>

        <div className="card-location">
          <MapPin size={12} /> <span>{pickupLocation}</span>
        </div>

        <div className="card-footer">
          <div className="price-stack">
            <span className="price-label">Current Bid</span>
            <span className="price-amount">₹{currentPrice.toLocaleString('en-IN')}</span>
          </div>

          <Link to={`/auctions/${id}`} className="btn-view-auction">
            View Auction
          </Link>
        </div>
      </div>
    </article>
  );
}
