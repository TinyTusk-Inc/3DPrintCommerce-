/**
 * Admin API Server
 *
 * Serves admin-only routes on ADMIN_PORT (default 3001).
 * This port should NEVER be exposed to the public internet.
 *
 * Firewall rule (Linux/iptables example):
 *   iptables -A INPUT -p tcp --dport 3001 -s <your-ip> -j ACCEPT
 *   iptables -A INPUT -p tcp --dport 3001 -j DROP
 *
 * Docker Compose: do NOT publish ADMIN_PORT to the host in production.
 * Only publish it for local development:
 *   ports:
 *     - "3000:3000"   # public — exposed
 *     - "3001:3001"   # admin  — remove this line in production
 *
 * The admin server shares the same DB connection and business logic
 * as the public server. It is a separate HTTP listener, not a separate process.
 * Use server.js to start both in one process.
 */

require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

const rateLimit = require('express-rate-limit');
const { createApp, errorHandler } = require('./app');

const ADMIN_PORT = process.env.ADMIN_PORT || 3001;

// ---------------------------------------------------------------------------
// Rate limiter (admin server — tighter than public)
// ---------------------------------------------------------------------------

// Admin actions are low-volume; 60 req/15 min is generous for a single operator
const adminGlobalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests, please try again later.' }
});

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

// Admin CORS: only allow requests from the admin frontend origin.
// In production this should be a separate admin dashboard domain/IP.
const adminApp = createApp(
  {
    origin: process.env.ADMIN_FRONTEND_URL || 'http://localhost:3002',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  adminGlobalLimiter
);

// ---------------------------------------------------------------------------
// Admin routes only
// ---------------------------------------------------------------------------

adminApp.use('/api/admin', require('./routes/adminRoutes'));

// Also expose product/order write routes here so admin UI can create/update
// products and manage orders without going through the public server.
// These routes already have verifyToken + verifyAdmin middleware.
const { verifyToken, verifyAdmin } = require('./middleware/authMiddleware');
adminApp.use('/api/products', verifyToken, verifyAdmin, require('./routes/productRoutes'));
adminApp.use('/api/orders',   verifyToken, verifyAdmin, require('./routes/orderRoutes'));

// Health check
adminApp.get('/health', (req, res) => {
  res.json({ status: 'Admin API is running', port: ADMIN_PORT });
});

// 404
adminApp.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

// Error handler
adminApp.use(errorHandler);

// ---------------------------------------------------------------------------
// Start (only when run directly — not when imported by server.js)
// ---------------------------------------------------------------------------

if (require.main === module) {
  adminApp.listen(ADMIN_PORT, '127.0.0.1', () => {
    console.log(`[Admin]   API running at http://127.0.0.1:${ADMIN_PORT}`);
    console.log(`          Bound to localhost only — not reachable from outside this machine`);
    console.log(`          Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = adminApp;
