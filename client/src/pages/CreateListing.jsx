import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlusCircle, Image, MapPin, Tag, Clock, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { CATEGORIES } from '../mock/mockData';
import { api } from '../services/api';
import './CreateListing.css';

export default function CreateListing({ isEditMode = false }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('cycles');
  const [condition, setCondition] = useState('Good Condition');
  const [startingPrice, setStartingPrice] = useState('');
  const [minIncrement, setMinIncrement] = useState('100');
  const [durationHours, setDurationHours] = useState('24');
  const [imageUrl, setImageUrl] = useState('');
  const [pickupLocation, setPickupLocation] = useState('Hostel 4 / Main Gate');
  const [description, setDescription] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(isEditMode);

  // If in edit mode, fetch the real auction details from backend
  useEffect(() => {
    if (isEditMode && id) {
      const fetchToEdit = async () => {
        try {
          setLoadingInitial(true);
          const res = await api.getAuctionById(id);
          if (res?.auction) {
            const a = res.auction;
            setTitle(a.title || '');
            setCategory(a.category || 'cycles');
            setCondition(a.condition || 'Good Condition');
            setStartingPrice(a.startingPrice?.toString() || '');
            setMinIncrement(a.minIncrement?.toString() || '100');
            setImageUrl(a.imageUrl || '');
            setPickupLocation(a.pickupLocation || '');
            setDescription(a.description || '');
          }
        } catch (err) {
          setError(err.message || 'Failed to load auction details for editing.');
        } finally {
          setLoadingInitial(false);
        }
      };
      fetchToEdit();
    }
  }, [isEditMode, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !startingPrice || !minIncrement || !description.trim()) {
      setError('Please fill in all mandatory listing fields.');
      return;
    }

    if (Number(startingPrice) <= 0) {
      setError('Starting price must be greater than zero.');
      return;
    }

    if (Number(minIncrement) < 10) {
      setError('Minimum increment must be at least ₹10.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: title.trim(),
        category,
        condition,
        startingPrice: Number(startingPrice),
        minIncrement: Number(minIncrement),
        durationHours: Number(durationHours) || 24,
        imageUrl: imageUrl.trim() || undefined,
        pickupLocation: pickupLocation.trim(),
        description: description.trim()
      };

      let result;
      if (isEditMode && id) {
        result = await api.updateListing(id, payload);
      } else {
        result = await api.createListing(payload);
      }

      const auctionId = result?.auction?.id || result?.auction?._id || id;
      navigate(auctionId ? `/auctions/${auctionId}` : '/dashboard');
    } catch (err) {
      console.error('Auction save error:', err);
      setError(err.message || 'Failed to save auction listing. Please verify the fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleFill = (sampleType) => {
    if (sampleType === 'cycle') {
      setTitle('Hero Sprint Pro 26T City Bicycle');
      setCategory('cycles');
      setCondition('Good Condition');
      setStartingPrice('2800');
      setMinIncrement('150');
      setImageUrl('https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80');
      setPickupLocation('Hostel 3 Parking Stand');
      setDescription('Smooth single-speed cycle with front suspension, mudguards, and chain cover. Ready for campus rides.');
    } else if (sampleType === 'electronics') {
      setTitle('Logitech MX Master 3S Wireless Mouse');
      setCategory('electronics');
      setCondition('Like New');
      setStartingPrice('3200');
      setMinIncrement('200');
      setImageUrl('https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80');
      setPickupLocation('Academic Block B, Room 204');
      setDescription('Silent clicks, 8K DPI sensor, USB-C fast charging. Used for 4 months, works flawlessly.');
    }
    setError('');
  };

  return (
    <div className="create-page">
      <div className="create-container">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Cancel & Go Back
        </button>

        <div className="create-card">
          <div className="create-header">
            <div className="create-title-box">
              <PlusCircle className="create-icon" size={24} />
              <div>
                <h1>{isEditMode ? 'Edit Campus Listing' : 'Create an Item Auction'}</h1>
                <p>List your cycle, textbooks or essentials for graduating or junior students</p>
              </div>
            </div>

            {/* Quick Fill Sample Data Buttons */}
            {!isEditMode && (
              <div className="quick-fill-row">
                <span className="quick-fill-label">Fill demo data:</span>
                <button
                  type="button"
                  className="btn-quick-fill"
                  onClick={() => handleSampleFill('cycle')}
                >
                  Bicycle
                </button>
                <button
                  type="button"
                  className="btn-quick-fill"
                  onClick={() => handleSampleFill('electronics')}
                >
                  Electronics
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="listing-form">
            {/* Title & Category */}
            <div className="form-section">
              <h3>1. Item Overview</h3>
              <div className="form-group">
                <label htmlFor="listing-title" className="form-label">
                  Item Title <span className="req">*</span>
                </label>
                <input
                  id="listing-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Firefox 21-Speed Mountain Gear Bicycle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="listing-category" className="form-label">
                    Category <span className="req">*</span>
                  </label>
                  <select
                    id="listing-category"
                    className="form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="listing-condition" className="form-label">
                    Item Condition <span className="req">*</span>
                  </label>
                  <select
                    id="listing-condition"
                    className="form-input"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="Like New">Like New (Barely Used)</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good Condition">Good Condition</option>
                    <option value="Fair / Functional">Fair / Functional</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing & Duration */}
            <div className="form-section">
              <h3>2. Auction Rules & Pricing</h3>
              <div className="form-row-3">
                <div className="form-group">
                  <label htmlFor="starting-price" className="form-label">
                    Starting Price (₹) <span className="req">*</span>
                  </label>
                  <input
                    id="starting-price"
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="e.g. 2500"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="min-increment" className="form-label">
                    Min Increment (₹) <span className="req">*</span>
                  </label>
                  <input
                    id="min-increment"
                    type="number"
                    min="10"
                    className="form-input"
                    placeholder="e.g. 100"
                    value={minIncrement}
                    onChange={(e) => setMinIncrement(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auction-duration" className="form-label">
                    Auction Duration
                  </label>
                  <select
                    id="auction-duration"
                    className="form-input"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                  >
                    <option value="1">1 Hour (Quick Demo)</option>
                    <option value="6">6 Hours</option>
                    <option value="24">24 Hours (1 Day)</option>
                    <option value="48">48 Hours (2 Days)</option>
                    <option value="72">72 Hours (3 Days)</option>
                  </select>
                </div>
              </div>
              <p className="field-hint">
                * Note: Every auction enforces fair anti-sniping: bids received in the final 30 seconds extend closing by 60 seconds automatically.
              </p>
            </div>

            {/* Media & Handover Location */}
            <div className="form-section">
              <h3>3. Photos & Campus Handover</h3>
              <div className="form-group">
                <label htmlFor="image-url" className="form-label">
                  Photo URL
                </label>
                <input
                  id="image-url"
                  type="url"
                  className="form-input"
                  placeholder="https://images.unsplash.com/... or paste image link"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>

              {imageUrl && (
                <div className="image-preview-box">
                  <span className="preview-label">Image Preview:</span>
                  <img src={imageUrl} alt="Preview" className="preview-thumb" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="pickup-spot" className="form-label">
                  Designated Campus Handover Spot <span className="req">*</span>
                </label>
                <div className="input-with-icon">
                  <MapPin size={16} className="input-icon" />
                  <input
                    id="pickup-spot"
                    type="text"
                    className="form-input has-icon"
                    placeholder="e.g. Hostel 4 Ground Floor / Main Gate / Library Courtyard"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="listing-desc" className="form-label">
                  Detailed Item Description <span className="req">*</span>
                </label>
                <textarea
                  id="listing-desc"
                  rows="4"
                  className="form-input form-textarea"
                  placeholder="Describe wear and tear, included cables/accessories, or reasons for selling..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="form-submit-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-submit-listing"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <CheckCircle2 size={16} /> Saving Listing...
                  </>
                ) : isEditMode ? (
                  'Save Changes'
                ) : (
                  'Publish Campus Auction'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
