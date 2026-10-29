import { useState, useEffect, useRef } from 'react';
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
  UserPlus,
  ChevronDown,
  User,
  Mail,
  Hash,
  ShieldCheck,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const { currentUser, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  // Close dropdown when navigating or clicking outside
  useEffect(() => {
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileDropdownOpen]);

  const handleNavClick = () => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
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
            <span className="brand-name">Handover</span>
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
              <span>My Dashboard</span>
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

              {/* User Avatar + Profile Dropdown Menu */}
              <div className="user-profile-menu" ref={dropdownRef}>
                {/* Clicking the user's name/avatar toggles the profile dropdown */}
                <button
                  type="button"
                  className={`user-avatar-btn ${profileDropdownOpen ? 'active' : ''}`}
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  title="View Account Profile"
                  aria-expanded={profileDropdownOpen}
                  aria-haspopup="true"
                  id="user-profile-button"
                >
                  <div className="avatar-circle">
                    {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="user-info-snippet">
                    <span className="user-snippet-name">{currentUser?.name || 'Student'}</span>
                    <span className="user-snippet-dept">{currentUser?.studentId || currentUser?.department || 'Verified'}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`dropdown-chevron ${profileDropdownOpen ? 'open' : ''}`}
                  />
                </button>

                {/* Separate Quick Logout Action in Navbar */}
                <button
                  className="btn-logout"
                  onClick={handleLogout}
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={16} />
                </button>

                {/* Profile Dropdown: Contains ONLY authenticated user's account details */}
                {profileDropdownOpen && (
                  <div className="profile-dropdown-card" role="menu" aria-labelledby="user-profile-button">
                    {/* Header: User identity & role badge */}
                    <div className="profile-dropdown-header">
                      <div className="dropdown-avatar-lg">
                        {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div className="dropdown-user-titles">
                        <h4 className="dropdown-user-name">{currentUser?.name || 'Campus Student'}</h4>
                        <div className="dropdown-badge-row">
                          <span className="profile-role-badge">
                            <ShieldCheck size={12} /> {currentUser?.role || 'Student'}
                          </span>
                          <span className="profile-verified-tag">
                            <CheckCircle2 size={11} /> Verified Student
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Section: Account Details (Full name, roll number, email, role, department) */}
                    <div className="profile-dropdown-details">
                      <div className="dropdown-section-label">Account Details</div>

                      <div className="dropdown-field-row">
                        <User size={14} className="field-row-icon" />
                        <div className="field-row-text">
                          <span className="field-row-label">Full Name</span>
                          <span className="field-row-val">{currentUser?.name}</span>
                        </div>
                      </div>

                      <div className="dropdown-field-row">
                        <Hash size={14} className="field-row-icon" />
                        <div className="field-row-text">
                          <span className="field-row-label">Roll Number</span>
                          <span className="field-row-val roll-highlight">{currentUser?.studentId || 'Verified'}</span>
                        </div>
                      </div>

                      <div className="dropdown-field-row">
                        <Mail size={14} className="field-row-icon" />
                        <div className="field-row-text">
                          <span className="field-row-label">College Email</span>
                          <span className="field-row-val">{currentUser?.email}</span>
                        </div>
                      </div>

                      <div className="dropdown-field-row">
                        <GraduationCap size={14} className="field-row-icon" />
                        <div className="field-row-text">
                          <span className="field-row-label">Department</span>
                          <span className="field-row-val">{currentUser?.department || 'Engineering'}</span>
                        </div>
                      </div>

                      <div className="dropdown-field-row">
                        <ShieldCheck size={14} className="field-row-icon" />
                        <div className="field-row-text">
                          <span className="field-row-label">Account Role</span>
                          <span className="field-row-val">{currentUser?.role || 'Student (Campus Member)'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Navigation links & Logout action */}
                    <div className="profile-dropdown-footer">
                      <Link
                        to="/profile"
                        className="dropdown-nav-btn view-profile-btn"
                        onClick={handleNavClick}
                      >
                        <User size={14} />
                        <span>View Full Profile Page</span>
                      </Link>

                      <Link
                        to="/dashboard"
                        className="dropdown-nav-btn dashboard-btn"
                        onClick={handleNavClick}
                      >
                        <LayoutDashboard size={14} />
                        <span>My Dashboard (Listings & Bids)</span>
                      </Link>

                      {/* Separate, clearly labelled Logout action */}
                      <button
                        type="button"
                        className="dropdown-logout-action"
                        onClick={handleLogout}
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
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
          {/* Mobile Account Profile Snippet */}
          <div className="mobile-profile-card">
            <div className="avatar-circle">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="mobile-profile-info">
              <strong>{currentUser?.name || 'Student'}</strong>
              <span>{currentUser?.studentId} &bull; {currentUser?.email}</span>
            </div>
          </div>

          <nav className="mobile-nav-list">
            <Link to="/profile" className="mobile-nav-item" onClick={handleNavClick}>
              <User size={16} /> My Account Profile
            </Link>
            <Link to="/" className="mobile-nav-item" onClick={handleNavClick}>
              Browse Auctions
            </Link>
            <Link to="/create-listing" className="mobile-nav-item" onClick={handleNavClick}>
              <PlusCircle size={16} /> Create Listing
            </Link>
            <Link to="/dashboard" className="mobile-nav-item" onClick={handleNavClick}>
              <LayoutDashboard size={16} /> My Dashboard
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
