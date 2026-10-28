import { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Gavel,
  PlusCircle,
  LayoutDashboard,
  Bell,
  Bookmark,
  Sparkles,
  Menu,
  X,
  LogOut,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/login', { replace: true });
  };

  const isRegisterPage = location.pathname === '/register';

  return (
    <header className="navbar-wrapper">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link
          to={isAuthenticated ? '/' : '/login'}
          className="navbar-brand"
          onClick={handleNavClick}
        >
          <div className="brand-icon-box">
            <Gavel size={20} className="brand-icon" />
          </div>
          <div className="brand-text-group">
            <span className="brand-name">Campus Auction</span>
            <span className="brand-tag">Student Marketplace</span>
          </div>
        </Link>

        {/* Navigation Links - ONLY shown when authenticated to prevent duplicate clutter */}
        {isAuthenticated && (
          <nav className="navbar-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Browse
            </NavLink>

            <NavLink
              to="/create-listing"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <PlusCircle size={15} />
              <span>Sell Item</span>
            </NavLink>

            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={15} />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/saved-searches"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Bookmark size={15} />
              <span>Saved Searches</span>
            </NavLink>

            <NavLink
              to="/ai-assistant"
              className={({ isActive }) => `nav-link ai-link ${isActive ? 'active' : ''}`}
            >
              <Sparkles size={14} className="sparkle-icon" />
              <span>AI Assistant</span>
            </NavLink>
          </nav>
        )}

        {/* Right Action Icons & Auth Profile */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              {/* Notifications Link */}
              <Link
                to="/notifications"
                className="action-icon-btn"
                title="Notifications"
                onClick={handleNavClick}
              >
                <Bell size={18} />
                {currentUser?.unreadNotificationsCount > 0 && (
                  <span className="notification-pill">
                    {currentUser.unreadNotificationsCount}
                  </span>
                )}
              </Link>

              {/* User Avatar + Profile */}
              <div className="user-profile-menu">
                <Link to="/dashboard" className="user-avatar-btn" title="View Student Dashboard">
                  <div className="avatar-circle">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="user-info-snippet">
                    <span className="user-snippet-name">{currentUser?.name || 'Student'}</span>
                    <span className="user-snippet-dept">{currentUser?.department || 'Verified Student'}</span>
                  </div>
                </Link>
                <button
                  className="btn-logout"
                  onClick={handleLogout}
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            /* Single clean action button on the right for guests */
            <div className="guest-auth-actions">
              {isRegisterPage ? (
                <Link to="/login" className="btn btn-secondary btn-sm">
                  <LogIn size={14} />
                  <span>Sign In</span>
                </Link>
              ) : (
                <Link to="/register" className="btn btn-primary btn-sm">
                  <UserPlus size={14} />
                  <span>Register</span>
                </Link>
              )}
            </div>
          )}

          {/* Mobile Hamburger Toggle (only when authenticated) */}
          {isAuthenticated && (
            <button
              className="mobile-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && isAuthenticated && (
        <div className="mobile-drawer">
          <nav className="mobile-nav-list">
            <Link to="/" className="mobile-nav-item" onClick={handleNavClick}>
              Browse Auctions
            </Link>
            <Link to="/create-listing" className="mobile-nav-item" onClick={handleNavClick}>
              <PlusCircle size={16} /> Create Listing
            </Link>
            <Link to="/dashboard" className="mobile-nav-item" onClick={handleNavClick}>
              <LayoutDashboard size={16} /> Student Dashboard
            </Link>
            <Link to="/saved-searches" className="mobile-nav-item" onClick={handleNavClick}>
              <Bookmark size={16} /> Saved Searches
            </Link>
            <Link to="/notifications" className="mobile-nav-item" onClick={handleNavClick}>
              <Bell size={16} /> Notifications
            </Link>
            <Link to="/ai-assistant" className="mobile-nav-item" onClick={handleNavClick}>
              <Sparkles size={16} /> AI Listing Assistant
            </Link>
            <div className="mobile-auth-section">
              <button className="btn btn-danger w-full" onClick={handleLogout}>
                <LogOut size={16} /> Sign Out ({currentUser?.name || 'Student'})
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
