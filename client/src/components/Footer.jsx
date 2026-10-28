import { ShieldCheck, HeartHandshake, Zap, Clock } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer-wrapper">
      <div className="footer-trust-banner">
        <div className="trust-item">
          <ShieldCheck className="trust-icon" size={20} />
          <div>
            <strong>Verified Campus Students</strong>
            <p>Institutional email authentication & zero anonymous scammers</p>
          </div>
        </div>

        <div className="trust-item">
          <Clock className="trust-icon" size={20} />
          <div>
            <strong>Anti-Sniping Protection</strong>
            <p>Final 30s bids extend closing by 60s for fair bidding</p>
          </div>
        </div>

        <div className="trust-item">
          <HeartHandshake className="trust-icon" size={20} />
          <div>
            <strong>Safe Campus Handover</strong>
            <p>Exchange on-campus at designated hostels or academic zones</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Campus Auction Marketplace &bull; Hackathon Demo Release</p>
        <div className="footer-links">
          <span>Student Rules</span>
          <span>&bull;</span>
          <span>Escrow & Handover Guidelines</span>
          <span>&bull;</span>
          <span>Campus Safety</span>
        </div>
      </div>
    </footer>
  );
}
