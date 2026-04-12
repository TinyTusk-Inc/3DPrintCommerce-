/**
 * Authentication Routes
 * Handles user registration, login, and profile management
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * Public Routes
 */

/**
 * POST /api/auth/register
 * Register a new user
 * 
 * Request body: { email, password, name, phone? }
 * Response: { user: {...}, token: "..." }
 */
router.post('/register', authController.register);

/**
 * POST /api/auth/login
 * Login and get JWT token
 * 
 * Request body: { email, password }
 * Response: { user: {...}, token: "..." }
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/logout
 * Logout (frontend removes token)
 * 
 * Response: { message: "Logged out successfully..." }
 */
router.post('/logout', authController.logout);

/**
 * Protected Routes
 * Require valid JWT token in Authorization header: Bearer <token>
 */

/**
 * GET /api/auth/me
 * Get current user profile
 * 
 * Headers: Authorization: Bearer <token>
 * Response: { user: {...} }
 */
router.get('/me', verifyToken, authController.getCurrentUser);

/**
 * PUT /api/auth/me
 * Update current user profile
 * 
 * Headers: Authorization: Bearer <token>
 * Request body: { name?, phone?, address? }
 * Response: { user: {...} }
 */
router.put('/me', verifyToken, authController.updateProfile);

/**
 * POST /api/auth/change-password
 * Change password for current user
 * 
 * Headers: Authorization: Bearer <token>
 * Request body: { currentPassword, newPassword }
 * Response: { message: "Password changed successfully" }
 */
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;
