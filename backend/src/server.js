/**
 * server.js — Combined entry point
 *
 * Starts both the public API server and the admin API server
 * in a single Node.js process. This is the recommended way to run
 * the backend in development and production.
 *
 * Usage:
 *   node src/server.js
 *   npm run dev   (via nodemon)
 *
 * Ports:
 *   PORT       (default 3000) — public API, exposed to internet
 *   ADMIN_PORT (default 3001) — admin API, localhost only / firewall-blocked
 */

require('dotenv').config();

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

const rateLimit  = require('express-rate-limit');
const { createApp, errorHandler } = require('./app');
const { verifyToken, verifyAdmin } = require('./middleware/authMiddleware');

const PORT       = parseInt(process.env.PORT       || '3000', 10);
const ADMIN_PORT = parseInt(process.env.ADMIN_PORT || '3001', 10);

if (PORT === ADMIN_PORT) {
  throw new Error(`FATAL: PORT and ADMIN_PORT must be different (both set to ${PORT})`);
}

// ===========================================================================
// PUBLIC SERVER
// ===========================================================================

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Upload limit reached, please try again in an hour.' }
});

const publicApp = createApp(
  {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  globalLimiter
);

publicApp.use('/api/auth',       authLimiter, require('./routes/authRoutes'));
publicApp.use('/api/auth',       authLimiter, require('./routes/oauthRoutes'));
publicApp.use('/api/categories',             require('./routes/categoryRoutes'));
publicApp.use('/api/products',               require('./routes/productRoutes'));
publicApp.use('/api/orders',                 require('./routes/orderRoutes'));
publicApp.use('/api/reviews',                require('./routes/reviewRoutes'));
publicApp.use('/api/addresses',              require('./routes/addressRoutes'));
// publicApp.use('/api/custom-orders',       require('./routes/customOrderRoutes'));

publicApp.get('/health', (req, res) => res.json({ status: 'Public API running', port: PORT }));
publicApp.use((req, res) => res.status(404).json({ error: 'Route not found' }));
publicApp.use(errorHandler);

// ===========================================================================
// ADMIN SERVER
// ===========================================================================

const adminGlobalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 60,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many admin requests, please try again later.' }
});

const adminApp = createApp(
  {
    origin: process.env.ADMIN_FRONTEND_URL || 'http://localhost:3002',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  adminGlobalLimiter
);

adminApp.use('/api/admin',    require('./routes/adminRoutes'));
adminApp.use('/api/products', verifyToken, verifyAdmin, require('./routes/productRoutes'));
adminApp.use('/api/orders',   verifyToken, verifyAdmin, require('./routes/orderRoutes'));

adminApp.get('/health', (req, res) => res.json({ status: 'Admin API running', port: ADMIN_PORT }));
adminApp.use((req, res) => res.status(404).json({ error: 'Route not found' }));
adminApp.use(errorHandler);

// ===========================================================================
// START BOTH SERVERS
// ===========================================================================

// Public server — listen on all interfaces (0.0.0.0) so it's reachable externally
publicApp.listen(PORT, '0.0.0.0', () => {
  console.log(`[Public]  API → http://0.0.0.0:${PORT}  (internet-facing)`);
});

// Admin server — bind to 127.0.0.1 only so the OS rejects external connections
// even if the firewall is misconfigured. This is a defence-in-depth measure.
adminApp.listen(ADMIN_PORT, '127.0.0.1', () => {
  console.log(`[Admin]   API → http://127.0.0.1:${ADMIN_PORT}  (localhost only)`);
  console.log(`          Block externally with: iptables -A INPUT -p tcp --dport ${ADMIN_PORT} -j DROP`);
});

console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

module.exports = { publicApp, adminApp, uploadLimiter };
