/**
 * OAuth Routes
 * Handles Google and Facebook OAuth 2.0 login flows.
 * After successful authentication, issues a JWT and redirects
 * the browser to the frontend with the token in the query string.
 */

const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRE || '7d';

// URL of the frontend — used for the post-auth redirect
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

/**
 * Build a JWT for a user row returned by Passport
 */
function issueToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      is_seller: user.is_seller
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

/**
 * GET /api/auth/google
 * Redirects the browser to Google's consent screen.
 */
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

/**
 * GET /api/auth/google/callback
 * Google redirects here after the user grants permission.
 * Issues a JWT and redirects to the frontend.
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=google_failed` }),
  (req, res) => {
    const token = issueToken(req.user);
    // Redirect to frontend — the frontend reads the token from the URL and stores it
    res.redirect(`${FRONTEND_URL}/oauth-callback?token=${token}`);
  }
);

// ---------------------------------------------------------------------------
// Facebook OAuth
// ---------------------------------------------------------------------------

/**
 * GET /api/auth/facebook
 * Redirects the browser to Facebook's consent screen.
 */
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'], session: false })
);

/**
 * GET /api/auth/facebook/callback
 * Facebook redirects here after the user grants permission.
 * Issues a JWT and redirects to the frontend.
 */
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=facebook_failed` }),
  (req, res) => {
    const token = issueToken(req.user);
    res.redirect(`${FRONTEND_URL}/oauth-callback?token=${token}`);
  }
);

module.exports = router;
