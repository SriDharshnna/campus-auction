import { useState, useEffect } from 'react';
import { Ban, AlertTriangle, AlertCircle, X, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import './AuctionModals.css';

export default function CancelAuctionModal({ isOpen, onClose, auction, onSuccess }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !auction) return null;

  const hasBids = (auction.bidsCount || 0) > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('A cancellation reason is required before cancelling this auction.');
      return;
    }

    try {
      setLoading(true);
      const auctionId = auction.id || auction._id;
      const res = await api.cancelListing(auctionId, trimmedReason);
      if (onSuccess) {
        onSuccess(res.auction || { ...auction, status: 'cancelled', cancellationReason: trimmedReason });
      }
      onClose();
    } catch (err) {
      console.error('[Cancel Auction Error]:', err);
      setError(err.message || 'Failed to cancel auction listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-header-icon cancel">
              <Ban size={20} />
            </div>
            <h3>Cancel Auction Listing</h3>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Item summary */}
            <div className="modal-item-summary">
              <span className="modal-item-title">{auction.title}</span>
              <div className="modal-item-meta">
                <span>Current Price: <strong>₹{(auction.currentPrice || 0).toLocaleString('en-IN')}</strong></span>
                <span>Active Bids: <strong>{auction.bidsCount || 0}</strong></span>
                <span>Category: <strong>{auction.category}</strong></span>
              </div>
            </div>

            {/* Bids Warning */}
            {hasBids ? (
              <div className="modal-warning-box danger">
                <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Active Bids Warning ({auction.bidsCount} bids):</strong>
                  <p style={{ marginTop: '0.2rem' }}>
                    Bids have already been submitted by fellow students. Cancelling will immediately close the auction, discard provisional winners, and notify all bidders with your cancellation reason.
                  </p>
                </div>
              </div>
            ) : (
              <div className="modal-warning-box warning">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Confirm Cancellation:</strong>
                  <p style={{ marginTop: '0.2rem' }}>
                    Cancelling will withdraw this listing from the active campus marketplace.
                  </p>
                </div>
              </div>
            )}

            {/* Mandatory Cancellation Reason */}
            <div className="modal-form-group">
              <label htmlFor="cancel-reason-textarea" className="modal-form-label">
                <span>Cancellation Reason (Mandatory):</span>
                <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>* Required</span>
              </label>
              <textarea
                id="cancel-reason-textarea"
                className="modal-form-textarea"
                placeholder="Please state why you are cancelling this listing (e.g., Item damaged, no longer available, emergency)..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError('');
                }}
                required
              />
            </div>

            {/* Business rules notice */}
            <div className="modal-warning-box info">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Audit Record:</strong> All bid history is preserved for fairness and platform dispute auditing. No winner or handover transaction will be created.
              </div>
            </div>

            {error && (
              <div className="modal-error-box">
                {error}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={loading}>
              Keep Listing Active
            </button>
            <button
              type="submit"
              className="btn-modal-confirm danger"
              disabled={loading || !reason.trim()}
            >
              <Trash2 size={16} />
              {loading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
