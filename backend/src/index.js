/**
 * Backend API Entry Point
 * Initializes Express server, middleware, routes, and database connection
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
// app.use('/api/reviews', require('./routes/reviewRoutes'));
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
