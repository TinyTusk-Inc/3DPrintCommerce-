/**
 * Public API Server
 *
 * Serves all end-user facing routes on PORT (default 3000).
 * Admin routes are NOT mounted here — they live on ADMIN_PORT only.
 *
 * To start both servers:
 *   node src/index.js        (starts public server)
 *   node src/adminServer.js  (starts admin server — run separately or via npm scripts)
 *
 * Or use the combined entry point:
 *   node src/server.js       (starts both in one process)
 */

require('dotenv').config();

// Fail fast if critical env vars are missing
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

const rateLimit = require('express-rate-limit');
const { createApp, errorHandler } = require('./app');

const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Rate limiters (public server)
// ---------------------------------------------------------------------------

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

// File upload limiter — exported for use in Phase 5 custom order routes
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached, please try again in an hour.' }
});

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = createApp(
  {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  globalLimiter
);

// ---------------------------------------------------------------------------
// Public routes only — NO admin routes
// ---------------------------------------------------------------------------

app.use('/api/auth',       authLimiter, require('./routes/authRoutes'));
app.use('/api/auth',       authLimiter, require('./routes/oauthRoutes'));
app.use('/api/categories',             require('./routes/categoryRoutes'));
app.use('/api/products',               require('./routes/productRoutes'));
app.use('/api/orders',                 require('./routes/orderRoutes'));
app.use('/api/reviews',                require('./routes/reviewRoutes'));
app.use('/api/addresses',              require('./routes/addressRoutes'));
// app.use('/api/custom-orders',       require('./routes/customOrderRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Public API is running', port: PORT });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

// Error handler
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[Public]  API running at http://localhost:${PORT}`);
  console.log(`          Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
module.exports.uploadLimiter = uploadLimiter;
