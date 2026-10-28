import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Plus, Bell, Trash2, Search, ArrowUpRight } from 'lucide-react';
import { CATEGORIES, MOCK_SAVED_SEARCHES } from '../mock/mockData';
import EmptyState from '../components/EmptyState';
import './SavedSearches.css';

export default function SavedSearches() {
  const [searches, setSearches] = useState(MOCK_SAVED_SEARCHES);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('all');
  const [maxBudget, setMaxBudget] = useState('');
  const [emailAlerts, setEmailAlerts] = useState(true);

  const handleAddSearch = (e) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    const newEntry = {
      id: `ss-${Date.now()}`,
      query: newKeyword.trim(),
      category: newCategory,
      maxPrice: maxBudget ? Number(maxBudget) : null,
      emailAlerts,
      created: 'Just now'
    };

    setSearches([newEntry, ...searches]);
    setNewKeyword('');
    setMaxBudget('');
  };

  const handleDelete = (id) => {
    setSearches(searches.filter((s) => s.id !== id));
  };

  return (
    <div className="saved-page">
      <div className="saved-container">
        <div className="saved-header">
          <div className="saved-title-box">
            <div className="saved-icon-box">
              <Bookmark size={22} />
            </div>
            <div>
              <h1>Saved Item Searches</h1>
              <p>Get notified as soon as a student lists an item matching your keywords</p>
            </div>
          </div>
        </div>

        {/* Create Saved Search Form */}
        <div className="create-search-card">
          <h3>Create Search Alert</h3>
          <form onSubmit={handleAddSearch} className="create-search-form">
            <div className="form-row-grid">
              <div className="form-group">
                <label htmlFor="search-keyword" className="form-label">
                  Keyword / Item Name
                </label>
                <div className="input-with-icon">
                  <Search size={16} className="input-icon" />
                  <input
                    id="search-keyword"
                    type="text"
                    className="form-input has-icon"
                    placeholder="e.g. Firefox cycle, Casio calculator, iPad..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="search-cat" className="form-label">
                  Category
                </label>
                <select
                  id="search-cat"
                  className="form-input"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="search-budget" className="form-label">
                  Max Budget Limit (₹)
                </label>
                <input
                  id="search-budget"
                  type="number"
                  className="form-input"
                  placeholder="Optional limit"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                />
              </div>
            </div>

            <div className="search-form-footer">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                />
                <span>Send me instant notifications when new matching items are listed</span>
              </label>

              <button type="submit" className="btn btn-primary" disabled={!newKeyword.trim()}>
                <Plus size={16} /> Save Search Alert
              </button>
            </div>
          </form>
        </div>

        {/* Existing Searches List */}
        <div className="saved-searches-list">
          <h3>Active Saved Alerts ({searches.length})</h3>

          {searches.length > 0 ? (
            <div className="saved-grid">
              {searches.map((item) => (
                <div key={item.id} className="saved-card">
                  <div className="saved-card-header">
                    <div>
                      <h4 className="saved-query">&ldquo;{item.query}&rdquo;</h4>
                      <span className="saved-meta">
                        Category: <strong className="text-accent">{item.category}</strong> &bull; Created {item.created}
                      </span>
                    </div>

                    <button
                      className="btn-delete-search"
                      onClick={() => handleDelete(item.id)}
                      title="Delete search alert"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="saved-card-details">
                    <div className="budget-tag">
                      Budget:{' '}
                      <strong>
                        {item.maxPrice ? `≤ ₹${item.maxPrice.toLocaleString('en-IN')}` : 'Any Price'}
                      </strong>
                    </div>

                    <div className={`notif-status-pill ${item.emailAlerts ? 'enabled' : ''}`}>
                      <Bell size={12} /> {item.emailAlerts ? 'Notifications On' : 'Silent'}
                    </div>
                  </div>

                  <div className="saved-card-actions">
                    <Link to={`/?search=${encodeURIComponent(item.query)}`} className="btn-run-search">
                      Run Live Search <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No saved search alerts"
              description="Save a keyword like 'bicycle' or 'scientific calculator' to get notified immediately when seniors post them."
              icon={Bookmark}
            />
          )}
        </div>
      </div>
    </div>
  );
}
