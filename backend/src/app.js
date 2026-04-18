/**
 * app.js — Shared Express application factory
 *
 * Returns a configured Express app with all shared middleware applied.
 * Called by both the public server (index.js) and the admin server (adminServer.js).
 *
 * Shared middleware: helmet, body parsing, passport, error handler.
 * Rate limiting and CORS are configured per-server since they differ.
 */

const express = require('express');
const helmet  = require('helmet');
const passport = require('./config/passport');

// ---------------------------------------------------------------------------
// Shared error handler — used by both servers
// ---------------------------------------------------------------------------

function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry', message: 'This record already exists' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Invalid reference', message: 'Referenced record does not exist' });
  }
  if (err.code) {
    return res.status(400).json({ error: 'Database error', code: err.code });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a base Express app with shared middleware.
 * @param {object} corsOptions - cors() options (origin differs per server)
 * @param {function} rateLimiter - express-rate-limit instance
 * @returns {express.Application}
 */
function createApp(corsOptions, rateLimiter) {
  const cors = require('cors');
  const app  = express();

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(rateLimiter);

  // Capture raw body for Razorpay webhook signature verification.
  // Must be registered BEFORE express.json() so the webhook route gets rawBody.
  app.use((req, res, next) => {
    if (req.path === '/api/orders/webhook/razorpay') {
      let data = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => { data += chunk; });
      req.on('end', () => {
        req.rawBody = data;
        try { req.body = JSON.parse(data); } catch { req.body = {}; }
        next();
      });
    } else {
      next();
    }
  });

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(passport.initialize());

  return app;
}

module.exports = { createApp, errorHandler };
