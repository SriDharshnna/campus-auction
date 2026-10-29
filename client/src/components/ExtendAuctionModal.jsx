import { useState, useEffect } from 'react';
import { Clock, AlertCircle, Calendar, X, Check } from 'lucide-react';
import { api } from '../services/api';
import './AuctionModals.css';

// Helper to format Date into 'YYYY-MM-DDTHH:mm' for datetime-local input
function toDatetimeLocalString(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function ExtendAuctionModal({ isOpen, onClose, auction, onSuccess }) {
  const [selectedDateTime, setSelectedDateTime] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && auction) {
      setError('');
      // Default to 1 hour after current closing time or 1 hour from now, whichever is later
      const currentClosing = new Date(auction.closingAt).getTime();
      const baseTime = Math.max(Date.now(), isNaN(currentClosing) ? Date.now() : currentClosing);
      const defaultNewTime = new Date(baseTime + 60 * 60 * 1000);
      setSelectedDateTime(toDatetimeLocalString(defaultNewTime));
    }
  }, [isOpen, auction]);

  if (!isOpen || !auction) return null;

  const currentClosingDate = new Date(auction.closingAt);
  const minAllowedTime = Math.max(Date.now() + 60 * 1000, currentClosingDate.getTime() + 60 * 1000);
  const minAllowedString = toDatetimeLocalString(minAllowedTime);

  const formattedCurrentClosing = !isNaN(currentClosingDate.getTime())
    ? currentClosingDate.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : 'Unknown';

  const applyPreset = (msToAdd) => {
    const baseTime = Math.max(Date.now(), currentClosingDate.getTime());
    const newTarget = new Date(baseTime + msToAdd);
    setSelectedDateTime(toDatetimeLocalString(newTarget));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedDateTime) {
      setError('Please select a valid extension date and time.');
      return;
    }

    const newClosing = new Date(selectedDateTime);
    const newClosingMs = newClosing.getTime();
    const nowMs = Date.now();
    const currentClosingMs = currentClosingDate.getTime();

    if (isNaN(newClosingMs)) {
      setError('Invalid date-time specified.');
      return;
    }

    if (newClosingMs <= nowMs) {
      setError('The new deadline must be later than the current time.');
      return;
    }

    if (newClosingMs <= currentClosingMs) {
      setError('New deadline must be strictly later than the current deadline. Shortening deadlines is not permitted.');
      return;
    }

    try {
      setLoading(true);
      const auctionId = auction.id || auction._id;
      const res = await api.extendAuction(auctionId, newClosing.toISOString());
      if (onSuccess) {
        onSuccess(res.auction || { ...auction, closingAt: newClosing.toISOString() });
      }
      onClose();
    } catch (err) {
      console.error('[Extend Auction Error]:', err);
      setError(err.message || 'Failed to extend auction deadline.');
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
            <div className="modal-header-icon extend">
              <Clock size={20} />
            </div>
            <h3>Extend Auction Deadline</h3>
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
                <span>Current Deadline: <strong>{formattedCurrentClosing}</strong></span>
                <span>Bids: <strong>{auction.bidsCount || 0}</strong></span>
                <span>Current: <strong>₹{(auction.currentPrice || 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="modal-form-group">
              <label className="modal-form-label">
                <span>Quick Add to Current Deadline:</span>
              </label>
              <div className="modal-quick-presets">
                <button
                  type="button"
                  className="btn-preset-chip"
                  onClick={() => applyPreset(1 * 60 * 60 * 1000)}
                >
                  +1 Hour
                </button>
                <button
                  type="button"
                  className="btn-preset-chip"
                  onClick={() => applyPreset(6 * 60 * 60 * 1000)}
                >
                  +6 Hours
                </button>
                <button
                  type="button"
                  className="btn-preset-chip"
                  onClick={() => applyPreset(24 * 60 * 60 * 1000)}
                >
                  +1 Day
                </button>
                <button
                  type="button"
                  className="btn-preset-chip"
                  onClick={() => applyPreset(3 * 24 * 60 * 60 * 1000)}
                >
                  +3 Days
                </button>
              </div>
            </div>

            {/* Date-time picker */}
            <div className="modal-form-group">
              <label htmlFor="extend-datetime-input" className="modal-form-label">
                <span>Choose New Closing Date & Time:</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Must be after current deadline</span>
              </label>
              <input
                id="extend-datetime-input"
                type="datetime-local"
                className="modal-form-input"
                min={minAllowedString}
                value={selectedDateTime}
                onChange={(e) => {
                  setSelectedDateTime(e.target.value);
                  setError('');
                }}
                required
              />
            </div>

            {/* Rule explanation & confirmation alert */}
            <div className="modal-warning-box info">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Extension Rules:</strong>
                <p style={{ marginTop: '0.2rem' }}>
                  Extensions only. The new deadline will update in real time across the campus marketplace and countdown timers. Shortening deadlines is strictly prohibited.
                </p>
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
              Cancel
            </button>
            <button type="submit" className="btn-modal-confirm" disabled={loading}>
              <Check size={16} />
              {loading ? 'Extending...' : 'Confirm Extension'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
