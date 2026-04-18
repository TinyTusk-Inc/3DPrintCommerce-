/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user info to request
 */

const jwt = require('jsonwebtoken');

// Fail fast at module load time — never run with a missing or default JWT secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

/**
 * Verify JWT token
 * Checks Authorization header for Bearer token
 * Attaches req.user with decoded token data
 * 
 * Usage: app.use('/api/protected', verifyToken);
 * 
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Express next middleware
 */
function verifyToken(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Missing Authorization header'
      });
    }

    // Extract token from "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid Authorization header format. Use: Bearer <token>'
      });
    }

    const token = parts[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to request
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        expiredAt: error.expiredAt
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    } else {
      return res.status(401).json({
        error: 'Authentication failed',
        message: error.message
      });
    }
  }
}

/**
 * Verify admin role
 * Only allows users with is_admin = true
 * Must be used after verifyToken middleware
 * 
 * Usage: app.use('/api/admin', verifyToken, verifyAdmin);
 * 
 * @param {object} req - Express request (with req.user from verifyToken)
 * @param {object} res - Express response
 * @param {function} next - Express next middleware
 */
async function verifyAdmin(req, res, next) {
  try {
    // Check if user is authenticated (verifyToken must be called first)
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        error: 'Unauthorized. Please authenticate first.'
      });
    }

    // Get user from database to check admin status
    const { User } = require('../models');
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check if user is admin
    if (!user.is_admin) {
      return res.status(403).json({
        error: 'Forbidden. Admin access required.'
      });
    }

    // User is admin, continue
    next();
  } catch (error) {
    console.error('Verify admin error:', error);
    return res.status(500).json({
      error: 'Failed to verify admin status',
      message: error.message
    });
  }
}

/**
 * Verify seller role
 * Only allows users with is_seller = true
 * Must be used after verifyToken middleware
 * 
 * Usage: app.use('/api/seller', verifyToken, verifySeller);
 * 
 * @param {object} req - Express request (with req.user from verifyToken)
 * @param {object} res - Express response
 * @param {function} next - Express next middleware
 */
async function verifySeller(req, res, next) {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        error: 'Unauthorized. Please authenticate first.'
      });
    }

    // Get user from database to check seller status
    const { User } = require('../models');
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check if user is seller
    if (!user.is_seller) {
      return res.status(403).json({
        error: 'Forbidden. Seller access required.'
      });
    }

    // User is seller, continue
    next();
  } catch (error) {
    console.error('Verify seller error:', error);
    return res.status(500).json({
      error: 'Failed to verify seller status',
      message: error.message
    });
  }
}

/**
 * Optional authentication middleware
 * Doesn't require token, but extracts user info if present
 * Useful for endpoints that have different behavior for authenticated vs. guest users
 * 
 * Usage: app.use('/api/public', optionalAuth);
 * 
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Express next middleware
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          req.user = decoded;
        } catch (error) {
          // Token is invalid, but we don't throw - just continue as guest
          console.log('Optional auth token invalid, continuing as guest');
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    // Always continue even if error occurs
    next();
  }
}

module.exports = {
  verifyToken,
  verifyAdmin,
  verifySeller,
  optionalAuth
};
