import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

// Allowed department codes and mapping
const DEPT_MAP = {
  ADR: 'Artificial Intelligence & Data Science',
  CSR: 'Computer Science & Engineering',
  ALR: 'Artificial Intelligence & Machine Learning',
  ECR: 'Electronics & Communication Engineering',
  EER: 'Electrical & Electronics Engineering',
  ITR: 'Information Technology'
};

const ROLL_REGEX = /^[0-9]{2}(ADR|CSR|ALR|ECR|EER|ITR)[0-9]{3}$/;

// Pre-existing roll numbers in mock data for client-side uniqueness validation
const MOCK_REGISTERED_ROLLS = ['23CSR042'];

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const isRegister = location.pathname === '/register';

  // Form states (Department removed entirely from state and UI)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status and feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg || '');

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated && !location.state?.registered) {
      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, location.state, navigate]);

  // Clear errors when navigating between login and register
  useEffect(() => {
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (!location.state?.successMsg) {
      setSuccessMsg('');
    }
  }, [location.pathname]);

  // Roll number formatting helper: automatically uppercase & trim
  const handleRollChange = (e) => {
    setError('');
    setRollNumber(e.target.value.toUpperCase().replace(/\s/g, ''));
  };

  const validateRegistration = () => {
    // 1. Full name validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      return 'Full student name is required.';
    }
    if (trimmedName.length < 2) {
      return 'Student name must be at least 2 characters long.';
    }
    if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
      return 'Student name can only contain letters, spaces, and hyphens.';
    }

    // 2. Email validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return 'College email address is required.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return 'Please enter a valid college email format (e.g., student@campus.edu).';
    }

    // 3. Roll number validation
    const formattedRoll = rollNumber.trim().toUpperCase();
    if (!formattedRoll) {
      return 'Roll number is required.';
    }
    if (formattedRoll.length !== 8) {
      return `Roll number must be exactly 8 characters (current: ${formattedRoll.length}). Format: YYCCCNNN (e.g. 23ADR157).`;
    }

    const deptCode = formattedRoll.slice(2, 5);
    const allowedCodes = Object.keys(DEPT_MAP);
    if (!allowedCodes.includes(deptCode)) {
      return `Invalid department code "${deptCode}". Allowed codes: ADR (AIDS), CSR (CSE), ALR (AIML), ECR (ECE), EER (EEE), ITR (IT).`;
    }

    if (!ROLL_REGEX.test(formattedRoll)) {
      return 'Invalid roll number format. Must start with 2 digits year, 3 letters department code, and 3 digits number (e.g. 23ADR157).';
    }

    // Duplicate check in mock data
    if (MOCK_REGISTERED_ROLLS.includes(formattedRoll)) {
      return `Roll number ${formattedRoll} is already registered in local mock data. (Note: client-side mock check, not global uniqueness).`;
    }

    // 4. Password validation
    if (!password) {
      return 'Password is required.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return 'Password must contain at least one letter and one number.';
    }

    // 5. Confirm password match
    if (!confirmPassword) {
      return 'Please confirm your password.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match. Please re-enter the matching password.';
    }

    return null;
  };

  const validateLogin = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return 'College email address is required.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return 'Please enter a valid college email address.';
    }
    if (!password) {
      return 'Password is required.';
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setSuccessMsg('');

    if (isRegister) {
      const validationError = validateRegistration();
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);

      const formattedRoll = rollNumber.trim().toUpperCase();
      const derivedDept = DEPT_MAP[formattedRoll.slice(2, 5)] || 'Engineering';

      setTimeout(() => {
        setLoading(false);
        navigate('/login', {
          replace: true,
          state: {
            successMsg: `Account for ${name.trim()} (${formattedRoll} - ${derivedDept}) created! Please sign in.`
          }
        });
      }, 500);
    } else {
      const loginError = validateLogin();
      if (loginError) {
        setError(loginError);
        return;
      }

      setLoading(true);

      setTimeout(() => {
        login({
          email: email.trim(),
          name: email.split('@')[0],
          studentId: '23CSR042',
          department: 'Computer Science & Engineering',
          batch: 'Class of 2027'
        });
        setLoading(false);

        const targetDestination = location.state?.from?.pathname || '/';
        navigate(targetDestination, { replace: true });
      }, 400);
    }
  };

  const handleQuickDemoFill = () => {
    setError('');
    if (isRegister) {
      setName('Aditya Verma');
      setEmail('aditya.verma@campus.edu');
      setRollNumber('23ADR157');
      setPassword('Campus2026');
      setConfirmPassword('Campus2026');
    } else {
      setEmail('kavya.nair@campus.edu');
      setPassword('Campus2026');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Navigation Tabs */}
        <div className="auth-tabs">
          <Link
            to="/login"
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => setError('')}
          >
            <LogIn size={16} /> Sign In
          </Link>
          <Link
            to="/register"
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => setError('')}
          >
            <UserPlus size={16} /> Register
          </Link>
        </div>

        <div className="auth-content">
          <div className="auth-header-block">
            <h1 className="auth-heading">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="auth-subheading">
              {isRegister
                ? 'Join your campus marketplace to bid and auction items.'
                : 'Sign in to access your auctions, bids, and listings.'}
            </p>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="auth-success-alert">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="auth-error-alert" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {isRegister ? (
              <>
                {/* 1. Full Name */}
                <div className="form-group">
                  <label htmlFor="reg-name" className="form-label">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Aditya Verma"
                    value={name}
                    onChange={(e) => {
                      setError('');
                      setName(e.target.value);
                    }}
                    disabled={loading}
                    autoComplete="name"
                    required
                  />
                </div>

                {/* 2. College Email */}
                <div className="form-group">
                  <label htmlFor="reg-email" className="form-label">
                    College Email <span className="req">*</span>
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    className="form-input"
                    placeholder="name@campus.edu"
                    value={email}
                    onChange={(e) => {
                      setError('');
                      setEmail(e.target.value);
                    }}
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>

                {/* 3. Roll Number */}
                <div className="form-group">
                  <label htmlFor="reg-roll" className="form-label">
                    Roll Number <span className="req">*</span>
                  </label>
                  <input
                    id="reg-roll"
                    type="text"
                    className="form-input roll-input"
                    placeholder="23ADR157"
                    maxLength={8}
                    value={rollNumber}
                    onChange={handleRollChange}
                    disabled={loading}
                    autoComplete="off"
                    required
                  />
                  <div className="field-hint-row">
                    <span className="field-example">Example: <strong>23ADR157</strong></span>
                    <span className="allowed-depts">ADR, CSR, ALR, ECR, EER, ITR</span>
                  </div>
                </div>

                {/* 4. Password */}
                <div className="form-group">
                  <label htmlFor="reg-pass" className="form-label">
                    Password <span className="req">*</span>
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="reg-pass"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input has-toggle"
                      placeholder="Min. 6 chars (letters + numbers)"
                      value={password}
                      onChange={(e) => {
                        setError('');
                        setPassword(e.target.value);
                      }}
                      disabled={loading}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* 5. Confirm Password */}
                <div className="form-group">
                  <label htmlFor="reg-confirm-pass" className="form-label">
                    Confirm Password <span className="req">*</span>
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="reg-confirm-pass"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input has-toggle"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setError('');
                        setConfirmPassword(e.target.value);
                      }}
                      disabled={loading}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Login: Email */}
                <div className="form-group">
                  <label htmlFor="login-email" className="form-label">
                    College Email <span className="req">*</span>
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    className="form-input"
                    placeholder="name@campus.edu"
                    value={email}
                    onChange={(e) => {
                      setError('');
                      setEmail(e.target.value);
                    }}
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>

                {/* Login: Password */}
                <div className="form-group">
                  <label htmlFor="login-pass" className="form-label">
                    Password <span className="req">*</span>
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      id="login-pass"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input has-toggle"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => {
                        setError('');
                        setPassword(e.target.value);
                      }}
                      disabled={loading}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                'Processing...'
              ) : isRegister ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>

            {/* Subtle Demo Fill Helper */}
            <div className="demo-fill-container">
              <button
                type="button"
                className="btn-demo-link"
                onClick={handleQuickDemoFill}
                disabled={loading}
              >
                Auto-fill demo {isRegister ? 'register' : 'login'}
              </button>
            </div>
          </form>

          {/* Switch Links between Login and Register */}
          <div className="auth-switch-prompt">
            {isRegister ? (
              <p>
                Already have an account?{' '}
                <Link to="/login" className="auth-switch-link">
                  Sign in
                </Link>
              </p>
            ) : (
              <p>
                Don&apos;t have an account?{' '}
                <Link to="/register" className="auth-switch-link">
                  Register
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
