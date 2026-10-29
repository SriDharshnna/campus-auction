import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Hash,
  GraduationCap,
  ShieldCheck,
  Calendar,
  LogOut,
  LayoutDashboard,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

export default function Profile() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!currentUser) {
    return (
      <div className="profile-page">
        <div className="profile-page-card">
          <p>Please sign in to view your profile.</p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const memberSinceFormatted = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Active Semester';

  return (
    <div className="profile-page">
      <div className="profile-page-container">
        {/* Navigation Breadcrumb */}
        <div className="profile-nav-row">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {/* Profile Card containing ONLY authenticated account details */}
        <div className="profile-page-card">
          {/* Header banner */}
          <div className="profile-card-header">
            <div className="profile-card-avatar">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="profile-header-info">
              <h2>{currentUser.name}</h2>
              <div className="profile-status-tags">
                <span className="profile-role-badge">
                  <ShieldCheck size={14} /> {currentUser.role || 'Student'}
                </span>
                <span className="profile-verified-pill">
                  <CheckCircle2 size={13} /> Verified Campus Account
                </span>
              </div>
            </div>
          </div>

          {/* Account Details Section */}
          <div className="profile-details-section">
            <h3 className="section-title">Authenticated Account Details</h3>
            <p className="section-subtitle">
              Your official campus credentials and account information.
            </p>

            <div className="profile-info-grid">
              {/* Full Name */}
              <div className="profile-field-card">
                <div className="field-icon-box">
                  <User size={18} />
                </div>
                <div className="field-content">
                  <span className="field-label">Full Name</span>
                  <strong className="field-value">{currentUser.name}</strong>
                </div>
              </div>

              {/* Roll Number */}
              <div className="profile-field-card">
                <div className="field-icon-box">
                  <Hash size={18} />
                </div>
                <div className="field-content">
                  <span className="field-label">Roll Number</span>
                  <strong className="field-value roll-accent">{currentUser.studentId || 'Verified'}</strong>
                </div>
              </div>

              {/* College Email */}
              <div className="profile-field-card">
                <div className="field-icon-box">
                  <Mail size={18} />
                </div>
                <div className="field-content">
                  <span className="field-label">College Email Address</span>
                  <strong className="field-value">{currentUser.email}</strong>
                </div>
              </div>

              {/* Department */}
              <div className="profile-field-card">
                <div className="field-icon-box">
                  <GraduationCap size={18} />
                </div>
                <div className="field-content">
                  <span className="field-label">Department</span>
                  <strong className="field-value">{currentUser.department || 'Engineering'}</strong>
                </div>
              </div>

              {/* Account Role */}
              <div className="profile-field-card">
                <div className="field-icon-box">
                  <ShieldCheck size={18} />
                </div>
                <div className="field-content">
                  <span className="field-label">Account Role</span>
                  <strong className="field-value">{currentUser.role || 'Student (Campus Member)'}</strong>
                </div>
              </div>

              {/* Member Since */}
              <div className="profile-field-card">
                <div className="field-icon-box">
                  <Calendar size={18} />
                </div>
                <div className="field-content">
                  <span className="field-label">Member Since</span>
                  <strong className="field-value">{memberSinceFormatted}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row: Distinct Logout + Navigation to Dashboard */}
          <div className="profile-action-footer">
            <Link to="/dashboard" className="btn btn-secondary btn-dashboard-link">
              <LayoutDashboard size={16} /> Go to My Dashboard
            </Link>

            <button
              className="btn btn-danger btn-profile-signout"
              onClick={handleLogout}
              title="Sign Out of Handover"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
