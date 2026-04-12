/**
 * User Model
 * Handles user authentication, profile, and user data queries
 */

const { query } = require('../config/database');

class User {
  /**
   * Create a new user (registration)
   * @param {string} email 
   * @param {string} passwordHash - Already hashed by bcrypt
   * @param {string} name 
   * @param {string} phone 
   * @returns {Promise} User object with id
   */
  static async create(email, passwordHash, name, phone = null) {
    const text = `
      INSERT INTO users (email, password_hash, name, phone)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, phone, is_seller, is_admin, created_at
    `;
    const values = [email, passwordHash, name, phone];
    
    try {
      const res = await query(text, values);
      return res.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  /**
   * Find user by email (for login)
   * @param {string} email 
   * @returns {Promise} User object with password_hash
   */
  static async findByEmail(email) {
    const text = `
      SELECT id, email, password_hash, name, phone, is_seller, is_admin, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    const res = await query(text, [email]);
    return res.rows[0] || null;
  }

  /**
   * Find user by ID
   * @param {string} userId 
   * @returns {Promise} User object
   */
  static async findById(userId) {
    const text = `
      SELECT id, email, name, phone, address, is_seller, is_admin, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    const res = await query(text, [userId]);
    return res.rows[0] || null;
  }

  /**
   * Update user profile
   * @param {string} userId 
   * @param {object} data - { name, phone, address }
   * @returns {Promise} Updated user
   */
  static async updateProfile(userId, data) {
    const { name, phone, address } = data;
    const text = `
      UPDATE users
      SET name = COALESCE($2, name),
          phone = COALESCE($3, phone),
          address = COALESCE($4, address)
      WHERE id = $1
      RETURNING id, email, name, phone, address, is_seller, is_admin, updated_at
    `;
    const values = [userId, name, phone, address ? JSON.stringify(address) : null];
    
    const res = await query(text, values);
    return res.rows[0] || null;
  }

  /**
   * List all users (admin only)
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of users
   */
  static async listAll(limit = 50, offset = 0) {
    const text = `
      SELECT id, email, name, phone, is_seller, is_admin, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const res = await query(text, [limit, offset]);
    return res.rows;
  }

  /**
   * Count total users
   * @returns {Promise} Count
   */
  static async count() {
    const text = 'SELECT COUNT(*) as count FROM users';
    const res = await query(text, []);
    return parseInt(res.rows[0].count, 10);
  }

  /**
   * Update user roles (admin only)
   * @param {string} userId 
   * @param {boolean} isSeller 
   * @param {boolean} isAdmin 
   * @returns {Promise} Updated user
   */
  static async updateRoles(userId, isSeller, isAdmin) {
    const text = `
      UPDATE users
      SET is_seller = $2, is_admin = $3
      WHERE id = $1
      RETURNING id, email, is_seller, is_admin, updated_at
    `;
    const res = await query(text, [userId, isSeller, isAdmin]);
    return res.rows[0] || null;
  }

  /**
   * Delete user (soft delete concept - keep for audit)
   * For now, we don't actually delete, just disable
   * @param {string} userId 
   * @returns {Promise} Success
   */
  static async delete(userId) {
    // In production, implement soft delete
    // For now, this is a placeholder
    throw new Error('User deletion not implemented');
  }
}

module.exports = User;
