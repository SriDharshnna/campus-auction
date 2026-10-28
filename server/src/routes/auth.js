import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const ROLL_REGEX = /^[0-9]{2}(ADR|CSR|ALR|ECR|EER|ITR)[0-9]{3}$/;

// Helper to generate JWT token and cookie options
const generateTokenAndSetCookie = (res, userId) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured on the server.');
  }

  const token = jwt.sign({ id: userId }, jwtSecret, {
    expiresIn: '7d'
  });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return token;
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new campus student account
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, rollNumber, studentId, password } = req.body;
    const effectiveRoll = (rollNumber || studentId || '').trim().toUpperCase();

    // 1. Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'College email is required.' });
    }
    if (!effectiveRoll) {
      return res.status(400).json({ message: 'Student roll number is required.' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    if (!ROLL_REGEX.test(effectiveRoll)) {
      return res.status(400).json({
        message: 'Invalid roll number format. Must be 8 characters: YYCCCNNN (e.g. 23ADR157).'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check duplicate email (HTTP 409)
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({ message: 'A student with this email address is already registered.' });
    }

    // 3. Check duplicate roll number (HTTP 409)
    const existingRoll = await User.findOne({ studentId: effectiveRoll });
    if (existingRoll) {
      return res.status(409).json({ message: 'A student with this roll number is already registered.' });
    }

    // 4. Create User
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      studentId: effectiveRoll,
      password
    });

    await user.save();

    // 5. Generate token & set cookie
    const token = generateTokenAndSetCookie(res, user._id);

    return res.status(201).json({
      message: 'Student account registered successfully.',
      user: user.toJSON(),
      token
    });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key safety net
      const duplicateField = Object.keys(err.keyPattern || {})[0] || 'account';
      return res.status(409).json({
        message: `An account with this ${duplicateField} already exists.`
      });
    }
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ message: 'Server error during registration. Please try again.' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate student and return session
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Explicitly select password to compare
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      // Generic error to prevent email enumeration
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateTokenAndSetCookie(res, user._id);

    return res.status(200).json({
      message: 'Login successful.',
      user: user.toJSON(),
      token
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ message: 'Server error during login. Please try again.' });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Clear authentication cookie
 * @access  Public
 */
router.post('/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax'
  });

  return res.status(200).json({ message: 'Logged out successfully.' });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated student profile
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  return res.status(200).json({
    user: req.user.toJSON()
  });
});

export default router;
