import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PlusCircle,
  Image,
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Upload,
  UploadCloud,
  X,
  Loader2
} from 'lucide-react';
import { CATEGORIES } from '../mock/mockData';
import { api } from '../services/api';
import './CreateListing.css';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 5;

// Helper to convert date to YYYY-MM-DDTHH:mm for datetime-local input
const toLocalDateTimeString = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper to calculate human-readable preview and relative remaining time
const getClosingPreview = (dateTimeStr) => {
  if (!dateTimeStr) {
    return { isValid: false, message: 'Please select an auction closing date and time.' };
  }
  const target = new Date(dateTimeStr);
  if (isNaN(target.getTime())) {
    return { isValid: false, message: 'Invalid date/time format.' };
  }
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 60 * 1000) {
    return {
      isValid: false,
      message: 'Closing time must be at least 1 minute into the future.'
    };
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(diffMinutes / (24 * 60));
  const hours = Math.floor((diffMinutes % (24 * 60)) / 60);
  const mins = diffMinutes % 60;

  let relative = 'in ';
  if (days > 0) relative += `${days}d `;
  if (hours > 0 || days > 0) relative += `${hours}h `;
  relative += `${mins}m`;

  const formattedDate = target.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const formattedTime = target.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    isValid: true,
    formatted: `${formattedDate} at ${formattedTime}`,
    relative
  };
};

export default function CreateListing({ isEditMode = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('cycles');
  const [condition, setCondition] = useState('Good Condition');
  const [startingPrice, setStartingPrice] = useState('');
  const [minIncrement, setMinIncrement] = useState('100');
  const [closingAt, setClosingAt] = useState(() =>
    toLocalDateTimeString(new Date(Date.now() + 24 * 60 * 60 * 1000))
  );
  const [hasBids, setHasBids] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('Hostel 4 / Main Gate');
  const [description, setDescription] = useState('');

  // Image Upload State
  // Array of { id: string, file?: File, previewUrl: string, isExisting?: boolean }
  const [previewItems, setPreviewItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(isEditMode);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      previewItems.forEach((item) => {
        if (!item.isExisting && item.previewUrl && item.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  // If in edit mode, fetch real auction details from backend
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
            setPickupLocation(a.pickupLocation || '');
            setDescription(a.description || '');
            if (a.closingAt) {
              setClosingAt(toLocalDateTimeString(a.closingAt));
            }
            setHasBids((a.bidsCount || 0) > 0);

            // Populate existing images
            if (Array.isArray(a.imageUrls) && a.imageUrls.length > 0) {
              setPreviewItems(
                a.imageUrls.map((url, idx) => ({
                  id: `existing-${idx}-${Date.now()}`,
                  previewUrl: url,
                  isExisting: true
                }))
              );
            } else if (a.imageUrl) {
              setPreviewItems([
                {
                  id: `existing-0-${Date.now()}`,
                  previewUrl: a.imageUrl,
                  isExisting: true
                }
              ]);
            }
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

  const handlePresetClosing = (hoursToAdd) => {
    if (hasBids) return;
    const futureDate = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
    setClosingAt(toLocalDateTimeString(futureDate));
  };

  // Image Selection & Validation
  const handleIncomingFiles = (fileList) => {
    setError('');
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    if (previewItems.length + files.length > MAX_IMAGES) {
      setError(
        `Maximum ${MAX_IMAGES} images allowed per listing. You already have ${previewItems.length} image(s); cannot add ${files.length} more.`
      );
      return;
    }

    const newItems = [];
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      const isValidMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
      const isValidExt = ALLOWED_EXTS.includes(ext);

      if (!isValidMime && !isValidExt) {
        setError(
          `"${file.name}" has an unsupported format. Please upload JPG, JPEG, PNG, or WEBP images.`
        );
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setError(`"${file.name}" (${sizeMb}MB) exceeds the 5MB size limit. Please choose a smaller image.`);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      newItems.push({
        id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        previewUrl: objectUrl,
        isExisting: false
      });
    }

    setPreviewItems((prev) => [...prev, ...newItems]);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleIncomingFiles(e.target.files);
      e.target.value = ''; // Reset so the same file can be selected again if replaced
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (idToRemove) => {
    setPreviewItems((prev) => {
      const target = prev.find((item) => item.id === idToRemove);
      if (target && !target.isExisting && target.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== idToRemove);
    });
  };

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

    if (!closingAt) {
      setError('Please select an auction closing date and time.');
      return;
    }

    const targetDate = new Date(closingAt);
    if (isNaN(targetDate.getTime())) {
      setError('Please enter a valid closing date and time.');
      return;
    }

    if (targetDate.getTime() <= Date.now() + 60 * 1000) {
      setError('Closing time must be at least 1 minute into the future.');
      return;
    }

    // Image requirement check
    if (previewItems.length === 0) {
      setError('Please upload at least one item image for your listing.');
      return;
    }

    try {
      setLoading(true);
      let finalImageUrls = [];

      // Identify new local files that need uploading
      const filesToUpload = previewItems.filter((p) => p.file && !p.isExisting).map((p) => p.file);

      if (filesToUpload.length > 0) {
        setUploadStatus(`Uploading ${filesToUpload.length} image(s)...`);
        const uploadRes = await api.uploadImages(filesToUpload);
        if (!uploadRes?.urls || uploadRes.urls.length === 0) {
          throw new Error('Image upload failed. Please try again.');
        }

        let uploadIdx = 0;
        finalImageUrls = previewItems.map((p) => {
          if (p.file && !p.isExisting) {
            return uploadRes.urls[uploadIdx++];
          }
          return p.previewUrl;
        });
      } else {
        // All preview items were existing URLs
        finalImageUrls = previewItems.map((p) => p.previewUrl);
      }

      setUploadStatus('Saving auction listing...');
      const payload = {
        title: title.trim(),
        category,
        condition,
        startingPrice: Number(startingPrice),
        minIncrement: Number(minIncrement),
        closingAt: targetDate.toISOString(),
        imageUrl: finalImageUrls[0],
        imageUrls: finalImageUrls,
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
      setUploadStatus('');
    }
  };

  const handleSampleFill = (sampleType) => {
    setClosingAt(toLocalDateTimeString(new Date(Date.now() + 24 * 60 * 60 * 1000)));
    if (sampleType === 'cycle') {
      setTitle('Hero Sprint Pro 26T City Bicycle');
      setCategory('cycles');
      setCondition('Good Condition');
      setStartingPrice('2800');
      setMinIncrement('150');
      setPreviewItems([
        {
          id: 'demo-cycle-1',
          previewUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
          isExisting: true
        }
      ]);
      setPickupLocation('Hostel 3 Parking Stand');
      setDescription('Smooth single-speed cycle with front suspension, mudguards, and chain cover. Ready for campus rides.');
    } else if (sampleType === 'electronics') {
      setTitle('Logitech MX Master 3S Wireless Mouse');
      setCategory('electronics');
      setCondition('Like New');
      setStartingPrice('3200');
      setMinIncrement('200');
      setPreviewItems([
        {
          id: 'demo-elec-1',
          previewUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
          isExisting: true
        }
      ]);
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
                <h1>{isEditMode ? 'Edit Handover Listing' : 'Create an Item Auction'}</h1>
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
            <div className="alert-error" role="alert">
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

            {/* Pricing & Custom Deadline */}
            <div className="form-section">
              <h3>2. Auction Rules & Custom Deadline</h3>
              <div className="form-row-2">
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
              </div>

              {/* Custom Closing Date & Time */}
              <div className="closing-picker-wrapper">
                <div className="form-group">
                  <label htmlFor="auction-closing-at" className="form-label">
                    <Clock size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                    Auction Closing Date & Time <span className="req">*</span>
                  </label>
                  <input
                    id="auction-closing-at"
                    type="datetime-local"
                    className="form-input"
                    value={closingAt}
                    onChange={(e) => setClosingAt(e.target.value)}
                    min={toLocalDateTimeString(new Date(Date.now() + 60 * 1000))}
                    disabled={hasBids}
                    required
                  />
                </div>

                {!hasBids && (
                  <div className="quick-presets-bar">
                    <span className="presets-label">Quick Presets:</span>
                    <button
                      type="button"
                      className="btn-preset-chip"
                      onClick={() => handlePresetClosing(6)}
                    >
                      +6 Hours
                    </button>
                    <button
                      type="button"
                      className="btn-preset-chip"
                      onClick={() => handlePresetClosing(24)}
                    >
                      +24 Hours (1 Day)
                    </button>
                    <button
                      type="button"
                      className="btn-preset-chip"
                      onClick={() => handlePresetClosing(72)}
                    >
                      +3 Days
                    </button>
                    <button
                      type="button"
                      className="btn-preset-chip"
                      onClick={() => handlePresetClosing(168)}
                    >
                      +7 Days (1 Week)
                    </button>
                  </div>
                )}

                {/* Selected Closing Time Preview Display */}
                {(() => {
                  const preview = getClosingPreview(closingAt);
                  if (preview.isValid) {
                    return (
                      <div className="closing-preview-card" id="closing-preview-box">
                        <div className="closing-preview-header">
                          <CheckCircle2 size={14} color="#10b981" />
                          <span>Scheduled Auction Deadline</span>
                        </div>
                        <div className="closing-preview-main">
                          <span className="closing-preview-date">{preview.formatted}</span>
                          <span className="closing-preview-tag">{preview.relative}</span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="closing-preview-card invalid" id="closing-preview-box">
                      <div className="closing-preview-header">
                        <AlertCircle size={14} color="#ef4444" />
                        <span>Deadline Notice</span>
                      </div>
                      <span className="closing-preview-error">{preview.message}</span>
                    </div>
                  );
                })()}

                {hasBids && (
                  <div className="locked-deadline-note">
                    <AlertCircle size={16} />
                    <span>
                      Bids have already been placed on this item. To preserve auction fairness, the
                      closing deadline cannot be altered.
                    </span>
                  </div>
                )}
              </div>

              <p className="field-hint">
                * Note: Every auction enforces fair anti-sniping: bids received in the final 30 seconds
                extend closing by 60 seconds automatically.
              </p>
            </div>

            {/* Media Upload & Campus Handover Location */}
            <div className="form-section">
              <h3>3. Photos & Campus Handover</h3>

              {/* Upload Item Images Field */}
              <div className="form-group">
                <label className="form-label" htmlFor="upload-images-input">
                  <Image size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                  Upload Item Images <span className="req">*</span>
                </label>

                {/* Drag and Drop Zone */}
                <div
                  className={`image-upload-dropzone ${isDragging ? 'dragging' : ''} ${
                    previewItems.length >= MAX_IMAGES ? 'disabled' : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => {
                    if (previewItems.length < MAX_IMAGES) {
                      fileInputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && previewItems.length < MAX_IMAGES) {
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    id="upload-images-input"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                    disabled={previewItems.length >= MAX_IMAGES}
                  />

                  <UploadCloud size={40} className="dropzone-icon" />

                  <div className="dropzone-info">
                    <p className="dropzone-title">
                      <strong>Drag and drop</strong> your item images here, or browse from device
                    </p>
                    <button
                      type="button"
                      className="btn-choose-files"
                      disabled={previewItems.length >= MAX_IMAGES}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload size={15} />
                      Choose Files
                    </button>
                    <p className="dropzone-formats">
                      Supported formats: <strong>JPG, JPEG, PNG, WEBP</strong> &bull; Max 5 images &bull; Up to 5MB each
                    </p>
                  </div>
                </div>

                {/* Image Previews Gallery */}
                {previewItems.length > 0 && (
                  <div className="image-previews-section">
                    <div className="preview-status-bar">
                      <span className="preview-counter">
                        <strong>{previewItems.length}</strong> of {MAX_IMAGES} images selected
                        {previewItems.length >= MAX_IMAGES && ' (Limit reached)'}
                      </span>
                      <span className="preview-cover-note">First image is the main cover photo</span>
                    </div>

                    <div className="image-previews-grid">
                      {previewItems.map((item, index) => (
                        <div key={item.id} className="preview-card">
                          <img
                            src={item.previewUrl}
                            alt={`Item preview ${index + 1}`}
                            className="preview-img"
                            onError={(e) => {
                              e.target.src =
                                'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=800&q=80';
                            }}
                          />
                          {index === 0 && <span className="preview-badge-primary">Cover Photo</span>}
                          <button
                            type="button"
                            className="btn-remove-preview"
                            title="Remove image"
                            aria-label={`Remove image ${index + 1}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(item.id);
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Status Bar */}
                {uploadStatus && (
                  <div className="upload-progress-card">
                    <Loader2 size={16} className="spin-icon" />
                    <span>{uploadStatus}</span>
                  </div>
                )}
              </div>

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
                disabled={loading}
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
                    <Loader2 size={16} className="spin-icon" />
                    <span>{uploadStatus || 'Saving Listing...'}</span>
                  </>
                ) : isEditMode ? (
                  'Save Changes'
                ) : (
                  'Publish Handover Auction'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
