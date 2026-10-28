import { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [backendHealth, setBackendHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try direct API base URL first, fallback to Vite proxy /api/health
      let response;
      try {
        response = await fetch(`${apiBaseUrl}/api/health`);
      } catch (directErr) {
        response = await fetch('/api/health');
      }

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const data = await response.json();
      setBackendHealth(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend');
      setBackendHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="setup-container">
      <header className="setup-header">
        <div className="badge">Module 1 : Project Setup</div>
        <h1 className="title">Campus Auction</h1>
        <p className="subtitle">
          Fair, transparent marketplace for graduating students to auction college essentials
        </p>
      </header>

      <main className="setup-grid">
        {/* Frontend Status Card */}
        <section className="status-card" id="frontend-status">
          <div className="card-header">
            <span className="dot dot-success"></span>
            <h2>Frontend Runtime</h2>
          </div>
          <div className="card-body">
            <div className="status-row">
              <span className="label">Framework:</span>
              <span className="value">React 19 + Vite</span>
            </div>
            <div className="status-row">
              <span className="label">Styling:</span>
              <span className="value">Vanilla CSS (Zero Tailwind)</span>
            </div>
            <div className="status-row">
              <span className="label">Status:</span>
              <span className="badge badge-success">Running & Ready</span>
            </div>
          </div>
        </section>

        {/* Backend Connectivity Card */}
        <section className="status-card" id="backend-status">
          <div className="card-header">
            <span className={`dot ${backendHealth ? 'dot-success' : error ? 'dot-error' : 'dot-warning'}`}></span>
            <h2>Backend Connectivity</h2>
          </div>
          <div className="card-body">
            <div className="status-row">
              <span className="label">Target Endpoint:</span>
              <code className="value-code">{apiBaseUrl}/api/health</code>
            </div>
            <div className="status-row">
              <span className="label">Connection:</span>
              {loading ? (
                <span className="badge badge-warning">Checking...</span>
              ) : backendHealth ? (
                <span className="badge badge-success">Online (HTTP 200)</span>
              ) : (
                <span className="badge badge-error">Offline</span>
              )}
            </div>

            {backendHealth && (
              <div className="response-box">
                <span className="response-title">API Response:</span>
                <pre>{JSON.stringify(backendHealth, null, 2)}</pre>
              </div>
            )}

            {error && (
              <div className="error-box">
                <span>{error}</span>
                <p className="error-hint">Ensure the backend is running via <code>npm run dev</code> inside <code>server/</code></p>
              </div>
            )}

            <button
              id="recheck-health-btn"
              className="btn btn-primary"
              onClick={checkHealth}
              disabled={loading}
            >
              {loading ? 'Testing...' : 'Test Backend Health'}
            </button>
          </div>
        </section>

        {/* Development Roadmap Card */}
        <section className="status-card full-width" id="architecture-roadmap">
          <div className="card-header">
            <h2>Core Auction Architecture</h2>
          </div>
          <div className="card-body">
            <div className="module-grid">
              <div className="module-item active">
                <span className="mod-num">01</span>
                <div>
                  <strong>Project Setup</strong>
                  <p>Vite + Express + Health endpoint</p>
                </div>
              </div>
              <div className="module-item">
                <span className="mod-num">02</span>
                <div>
                  <strong>UI Foundation</strong>
                  <p>Navigation, modern layouts & pages</p>
                </div>
              </div>
              <div className="module-item">
                <span className="mod-num">03</span>
                <div>
                  <strong>Database & Auth</strong>
                  <p>MongoDB models, JWT, bcrypt</p>
                </div>
              </div>
              <div className="module-item">
                <span className="mod-num">04</span>
                <div>
                  <strong>Listings & Search</strong>
                  <p>Categories, uploads, queries</p>
                </div>
              </div>
              <div className="module-item">
                <span className="mod-num">05</span>
                <div>
                  <strong>Real-Time Bidding</strong>
                  <p>Anti-sniping, Socket.IO, bid history</p>
                </div>
              </div>
              <div className="module-item">
                <span className="mod-num">06</span>
                <div>
                  <strong>Approval & Handover</strong>
                  <p>Provisional winner, seller confirm</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="setup-footer">
        <p>Campus Auction &bull; Hackathon Senior Development Partner</p>
      </footer>
    </div>
  );
}
