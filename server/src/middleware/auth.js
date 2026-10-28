import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication Middleware:
 * Extracts JWT from HttpOnly cookie or Authorization Bearer header,
 * verifies the signature, and attaches the authenticated user to req.user.
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Check HttpOnly cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Check Authorization Bearer header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      message: 'Authentication required. No token provided.'
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({
      message: 'Server error: JWT_SECRET is not configured.'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        message: 'The user belonging to this token no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Session has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      message: 'Invalid authentication token.'
    });
  }
};
