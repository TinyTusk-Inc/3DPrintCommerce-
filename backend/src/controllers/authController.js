/**
 * Authentication Controller
 * Handles user registration, login, and profile retrieval
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is required');
const JWT_EXPIRY = process.env.JWT_EXPIRE || '7d';

/**
 * Register a new user
 * POST /api/auth/register
 * 
 * @param {object} req - Express request
 * @param {string} req.body.email 
 * @param {string} req.body.password 
 * @param {string} req.body.name 
 * @param {string} req.body.phone - optional
 * @returns {object} { user: { id, email, name, ... }, token: "jwt..." }
 */
async function register(req, res) {
  try {
    const { email, password, name, phone } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, name'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate field lengths
    if (name.length > 255) {
      return res.status(400).json({ error: 'Name must be 255 characters or less' });
    }

    // Validate password strength — min 8 chars, must have uppercase, lowercase, digit
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await User.create(email, passwordHash, name, phone || null);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Return user and token (excluding password_hash)
    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        is_seller: user.is_seller,
        is_admin: user.is_admin,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      error: 'Failed to register user',
      message: error.message
    });
  }
}

/**
 * Login user
 * POST /api/auth/login
 * 
 * @param {object} req - Express request
 * @param {string} req.body.email 
 * @param {string} req.body.password 
 * @returns {object} { user: { id, email, name, ... }, token: "jwt..." }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields: email, password'
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Return user and token (excluding password_hash)
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address ? JSON.parse(user.address) : null,
        is_seller: user.is_seller,
        is_admin: user.is_admin,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Failed to login',
      message: error.message
    });
  }
}

/**
 * Get current user profile (protected)
 * GET /api/auth/me
 * Requires valid JWT token in Authorization header
 * 
 * @param {object} req - Express request with userId in req.user
 * @returns {object} { user: { id, email, name, ... } }
 */
async function getCurrentUser(req, res) {
  try {
    const userId = req.user.userId;

    // Get user from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Return user (excluding password_hash)
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        is_seller: user.is_seller,
        is_admin: user.is_admin,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      error: 'Failed to get user profile',
      message: error.message
    });
  }
}

/**
 * Update user profile (protected)
 * PUT /api/auth/me
 * Requires valid JWT token
 * 
 * @param {object} req - Express request
 * @param {string} req.body.name - optional
 * @param {string} req.body.phone - optional
 * @param {object} req.body.address - optional { street, city, zip, country }
 * @returns {object} { user: { id, email, name, ... } }
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { name, phone, address, email } = req.body;

    // Validate field lengths
    if (name && name.length > 255) {
      return res.status(400).json({ error: 'Name must be 255 characters or less' });
    }
    if (phone && phone.length > 20) {
      return res.status(400).json({ error: 'Phone must be 20 characters or less' });
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Validate address if provided
    if (address && typeof address !== 'object') {
      return res.status(400).json({ error: 'Address must be an object' });
    }

    const updatedUser = await User.updateProfile(userId, { name, phone, address, email });
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        address: updatedUser.address,
        is_seller: updatedUser.is_seller,
        is_admin: updatedUser.is_admin,
        updated_at: updatedUser.updated_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'That email address is already in use' });
    }
    return res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
}

/**
 * Change password (protected)
 * POST /api/auth/change-password
 * Requires valid JWT token
 * 
 * @param {object} req - Express request
 * @param {string} req.body.currentPassword 
 * @param {string} req.body.newPassword 
 * @returns {object} { message: "Password changed successfully" }
 */
async function changePassword(req, res) {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing required fields: currentPassword, newPassword'
      });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password hash
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Note: User model doesn't store password_hash in findById
    // Need to update this to get full user with password
    const userFull = await User.findByEmail(user.email);

    // Verify current password
    const currentPasswordMatch = await bcrypt.compare(currentPassword, userFull.password_hash);
    if (!currentPasswordMatch) {
      return res.status(401).json({
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password directly in database
    const { query } = require('../config/database');
    const text = 'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id';
    await query(text, [newPasswordHash, userId]);

    return res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      error: 'Failed to change password',
      message: error.message
    });
  }
}

/**
 * Logout (frontend only - remove token from client)
 * POST /api/auth/logout
 * No backend operation needed - just confirmation
 * 
 * @returns {object} { message: "Logged out successfully" }
 */
function logout(req, res) {
  // JWT is stateless, so logout is done on client by removing token
  // This endpoint can be used for audit logging if needed
  return res.status(200).json({
    message: 'Logged out successfully. Please remove the token from client storage.'
  });
}

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  logout
};
