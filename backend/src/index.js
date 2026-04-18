/**
 * Backend API Entry Point
 * Initializes Express server, middleware, routes, and database connection
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('./config/passport');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Fail fast if critical env vars are missing
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

// Global limiter — 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Tighter limiter for auth endpoints — 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

// File upload limiter — 20 requests per hour per IP (for future Phase 5)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached, please try again in an hour.' }
});

// Middleware
app.use(helmet()); // Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(globalLimiter);

// Capture raw body for Razorpay webhook signature verification
// Must be registered BEFORE express.json() so the webhook route gets rawBody
app.use((req, res, next) => {
  if (req.path === '/api/orders/webhook/razorpay') {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      req.rawBody = data;
      try { req.body = JSON.parse(data); } catch (e) { req.body = {}; }
      next();
    });
  } else {
    next();
  }
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Passport (no session — we use JWT; passport.initialize() is still required
// by passport-google-oauth20 and passport-facebook for the OAuth dance)
app.use(passport.initialize());

// Routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/auth', authLimiter, require('./routes/oauthRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/addresses', require('./routes/addressRoutes'));
// app.use('/api/custom-orders', require('./routes/customOrderRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }
  
  // Database errors
  if (err.code) {
    // PostgreSQL error codes
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'Duplicate entry',
        message: 'This record already exists'
      });
    }
    
    if (err.code === '23503') {
      return res.status(400).json({
        error: 'Invalid reference',
        message: 'Referenced record does not exist'
      });
    }
    
    return res.status(400).json({
      error: 'Database error',
      code: err.code
    });
  }
  
  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
});

module.exports = app;
module.exports.uploadLimiter = uploadLimiter;
