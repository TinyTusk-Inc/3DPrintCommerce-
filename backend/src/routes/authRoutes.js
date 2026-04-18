/**
 * Authentication Routes
 * Handles user registration, login, and profile management
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const emailOtpController = require('../controllers/emailOtpController');
const { verifyToken } = require('../middleware/authMiddleware');

// Strict limiter for OTP requests — 3 per hour per IP to prevent email spam
const otpRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification code requests. Try again in 1 hour.' }
});

// Limiter for OTP verification attempts — 10 per 15 min per IP
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Try again in 15 minutes.' }
});

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

/**
 * POST /api/auth/email/request-otp
 * Send a 6-digit OTP to a new email address for verification.
 * Body: { email }
 */
router.post('/email/request-otp', otpRequestLimiter, verifyToken, emailOtpController.requestOtp);

/**
 * POST /api/auth/email/verify-otp
 * Verify the OTP and save the email as verified.
 * Body: { otp }
 */
router.post('/email/verify-otp', otpVerifyLimiter, verifyToken, emailOtpController.verifyOtp);

module.exports = router;
