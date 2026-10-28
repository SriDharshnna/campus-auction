import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  Banknote,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  MapPin,
  User,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import './PaymentConfirmation.css';

export default function PaymentConfirmation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('COD');
  const [referenceId, setReferenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getTransactionById(id);
      if (res?.transaction) {
        setTransaction(res.transaction);
        if (res.transaction.payment?.method) {
          setSelectedMethod(res.transaction.payment.method);
        }
        if (res.transaction.payment?.transactionReference) {
          setReferenceId(res.transaction.payment.transactionReference);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load transaction details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTransaction();
    }
  }, [id]);

  const handleSelectCod = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await api.selectPaymentMethod(id, 'COD');
      setTransaction(res.transaction);
      setSuccessMsg('Cash on Delivery confirmed! Payment of exact cash will be collected during campus handover.');
    } catch (err) {
      setError(err.message || 'Failed to confirm COD payment method.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectUpi = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await api.selectPaymentMethod(id, 'UPI');
      setTransaction(res.transaction);
      setSuccessMsg('UPI payment initiated. Please scan the QR code and enter your transaction reference ID to verify.');
    } catch (err) {
      setError(err.message || 'Failed to initialize UPI payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyUpi = async (e) => {
    e.preventDefault();
    if (!referenceId.trim()) {
      setError('Please enter a valid 12-digit UPI transaction reference ID (UTR).');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await api.verifyUpiPayment(id, referenceId.trim());
      setTransaction(res.transaction);
      setSuccessMsg('UPI payment verified successfully! Your payment status is now PAID.');
    } catch (err) {
      setError(err.message || 'UPI payment verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="payment-page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <LoadingSpinner size="lg" message="Loading payment details..." />
        </div>
      </div>
    );
  }

  if (error && !transaction) {
    return (
      <div className="payment-page">
        <div className="payment-container">
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div className="alert-error" style={{ marginTop: '1rem' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  const isBuyer = (transaction.buyer?._id || transaction.buyer?.id || transaction.buyer) === currentUser?.id;
  const payment = transaction.payment || {};
  const isPaid = payment.status === 'PAID';
  const isPending = payment.status === 'PENDING';
  const finalPrice = transaction.finalPrice || 0;

  // Generate UPI QR Code URL using standard chart QR API
  const upiUri = payment.upiQrData || `upi://pay?pa=handover.campus@upi&pn=Handover&am=${finalPrice}&tn=Auction-${transaction.auction?._id || transaction.auction}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`;

  return (
    <div className="payment-page">
      <div className="payment-container">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="payment-header">
          <div className="payment-title-row">
            <div className="payment-icon-box">
              <CreditCard size={24} />
            </div>
            <div>
              <h1>Campus Handover Payment</h1>
              <p>Select your payment method and confirm reservation for physical handover</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-success" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.85rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Item Summary Card */}
        <div className="payment-summary-card">
          <div className="summary-top">
            <div className="summary-title-group">
              <h2>{transaction.auctionTitle}</h2>
              <div className="summary-tags">
                <span className="category-tag">{transaction.auction?.category || 'Auction Item'}</span>
                <span className="card-status-pill approved">Item Reserved</span>
              </div>
            </div>

            <div className="summary-price-box">
              <div className="summary-price-label">Approved Winning Price</div>
              <div className="summary-price-val">₹{finalPrice.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div className="summary-meta-grid">
            <div className="meta-field">
              <span className="meta-label">Campus Handover Spot</span>
              <span className="meta-val">
                <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                {transaction.pickupLocation}
              </span>
            </div>

            <div className="meta-field">
              <span className="meta-label">Listing Seller</span>
              <span className="meta-val">
                <User size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                {transaction.sellerName || transaction.seller?.name} ({transaction.sellerRoll || transaction.seller?.studentId || 'Verified'})
              </span>
            </div>

            <div className="meta-field">
              <span className="meta-label">Winning Buyer</span>
              <span className="meta-val">
                {transaction.buyerName || transaction.buyer?.name} ({transaction.buyerRoll || transaction.buyer?.studentId || 'You'})
              </span>
            </div>
          </div>
        </div>

        {/* Payment Status Banner */}
        {isPaid ? (
          <div className="payment-status-banner paid">
            <CheckCircle2 size={22} color="#10b981" />
            <div>
              <strong>Payment Status: PAID (Verified via {payment.verifiedBy || 'UPI'})</strong>
              <div style={{ fontSize: '0.82rem', marginTop: '2px', opacity: 0.9 }}>
                Reference ID: {payment.transactionReference || 'N/A'} &bull; Paid At: {new Date(payment.paidAt || Date.now()).toLocaleString()}
              </div>
            </div>
          </div>
        ) : isPending && payment.method ? (
          <div className="payment-status-banner pending">
            <Clock size={22} color="#f59e0b" />
            <div>
              <strong>Payment Status: PENDING ({payment.method === 'COD' ? 'Cash on Delivery' : 'UPI Verification Needed'})</strong>
              <div style={{ fontSize: '0.82rem', marginTop: '2px', opacity: 0.9 }}>
                {payment.method === 'COD'
                  ? 'Payment will be completed when you pay cash to the seller at campus handover.'
                  : 'Please complete the UPI transfer and submit the transaction reference below.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="payment-status-banner unselected">
            <AlertCircle size={22} />
            <div>
              <strong>Awaiting Payment Method Selection</strong>
              <div style={{ fontSize: '0.82rem', marginTop: '2px', opacity: 0.9 }}>
                Please choose either Cash on Delivery (COD) or instant UPI payment to confirm your reservation.
              </div>
            </div>
          </div>
        )}

        {/* Payment Options Section (Only for winning buyer when not yet marked PAID) */}
        {isBuyer && !isPaid && (
          <div className="payment-methods-card">
            <h3>Select Payment Method</h3>

            <div className="method-options-grid">
              {/* Option 1: Cash on Delivery */}
              <div
                className={`method-option-card ${selectedMethod === 'COD' ? 'selected' : ''}`}
                onClick={() => setSelectedMethod('COD')}
              >
                <div className="option-header">
                  <div className="option-title">
                    <Banknote size={20} color="#10b981" />
                    <span>Cash on Delivery (COD)</span>
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={selectedMethod === 'COD'}
                    onChange={() => setSelectedMethod('COD')}
                  />
                </div>
                <p className="option-desc">
                  Pay cash in hand directly to the seller when you meet for campus handover at {transaction.pickupLocation}.
                </p>
              </div>

              {/* Option 2: UPI */}
              <div
                className={`method-option-card ${selectedMethod === 'UPI' ? 'selected' : ''}`}
                onClick={() => setSelectedMethod('UPI')}
              >
                <div className="option-header">
                  <div className="option-title">
                    <QrCode size={20} color="#6366f1" />
                    <span>Instant UPI Payment</span>
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={selectedMethod === 'UPI'}
                    onChange={() => setSelectedMethod('UPI')}
                  />
                </div>
                <p className="option-desc">
                  Pay via any UPI app (GPay, PhonePe, Paytm) using scan-and-pay QR code with instant reference verification.
                </p>
              </div>
            </div>

            {/* If COD Selected */}
            {selectedMethod === 'COD' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-pay-action"
                  disabled={submitting}
                  onClick={handleSelectCod}
                >
                  <Banknote size={18} />
                  {submitting ? 'Confirming...' : 'Confirm Cash on Delivery'}
                </button>
              </div>
            )}

            {/* If UPI Selected */}
            {selectedMethod === 'UPI' && (
              <div className="upi-details-box">
                <div className="upi-qr-row">
                  <div className="upi-qr-wrapper">
                    <img
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      className="upi-qr-img"
                    />
                    <span className="upi-qr-label">Scan with any UPI App</span>
                  </div>

                  <div className="upi-instructions">
                    <div>
                      <strong>Pay via UPI Intent:</strong>
                    </div>
                    <div>
                      UPI ID: <span className="upi-id-pill">campus.auction@upi</span>
                    </div>
                    <div>
                      Amount: <strong>₹{finalPrice.toLocaleString('en-IN')}</strong>
                    </div>
                    <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      1. Scan the QR code or pay to the UPI ID.<br />
                      2. Copy the 12-digit UPI Reference Number / UTR from your banking app.<br />
                      3. Enter it below to verify your payment.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleVerifyUpi} className="upi-verification-panel">
                  <label htmlFor="upi-utr" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Enter 12-Digit UPI Transaction Reference (UTR) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div className="verification-input-row">
                    <input
                      id="upi-utr"
                      type="text"
                      className="verification-input"
                      placeholder="e.g. 202610287719 or 339102441920"
                      value={referenceId}
                      onChange={(e) => setReferenceId(e.target.value)}
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                      style={{ padding: '0 1.5rem' }}
                    >
                      {submitting ? 'Verifying...' : 'Verify Payment'}
                    </button>
                  </div>

                  {/* Sandbox helper button for demo and testing */}
                  <button
                    type="button"
                    className="btn-fill-demo"
                    onClick={() => {
                      const demoUtr = `UPI${Date.now().toString().slice(-9)}`;
                      setReferenceId(demoUtr);
                    }}
                  >
                    ⚡ Fill Demo Test UTR
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Next Steps Card */}
        <div className="payment-summary-card" style={{ background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            <ShieldCheck size={18} color="#10b981" />
            <span>Campus Security & Handover Guidelines</span>
          </div>
          <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <li>Meet in well-lit, public campus locations (e.g. {transaction.pickupLocation}).</li>
            <li>Inspect the item condition thoroughly before completing the physical exchange.</li>
            <li>Once physically exchanged, confirm the handover on your Dashboard to finalize the auction record.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
