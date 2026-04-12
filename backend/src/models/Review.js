/**
 * Review Model
 * Handles product reviews and ratings
 */

const { query } = require('../config/database');

class Review {
  /**
   * Create a review
   * @param {object} data - { product_id, user_id, rating, text }
   * @returns {Promise} Review object
   */
  static async create(data) {
    const { product_id, user_id, rating, text = null } = data;
    
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    const text_query = `
      INSERT INTO reviews (product_id, user_id, rating, text)
      VALUES ($1, $2, $3, $4)
      RETURNING id, product_id, user_id, rating, text, created_at, updated_at
    `;
    const values = [product_id, user_id, rating, text];
    
    const res = await query(text_query, values);
    return res.rows[0];
  }

  /**
   * Get review by ID
   * @param {string} reviewId 
   * @returns {Promise} Review object with author info
   */
  static async findById(reviewId) {
    const text = `
      SELECT 
        r.id, 
        r.product_id, 
        r.user_id, 
        r.rating, 
        r.text, 
        r.created_at, 
        r.updated_at,
        u.name as author_name,
        u.email as author_email
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `;
    const res = await query(text, [reviewId]);
    return res.rows[0] || null;
  }

  /**
   * List reviews for a product
   * @param {string} productId 
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of reviews
   */
  static async listByProduct(productId, limit = 50, offset = 0) {
    const text = `
      SELECT 
        r.id, 
        r.product_id, 
        r.user_id, 
        r.rating, 
        r.text, 
        r.created_at, 
        r.updated_at,
        u.name as author_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(text, [productId, limit, offset]);
    return res.rows;
  }

  /**
   * Get reviews by user
   * @param {string} userId 
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of reviews
   */
  static async listByUser(userId, limit = 50, offset = 0) {
    const text = `
      SELECT 
        r.id, 
        r.product_id, 
        r.user_id, 
        r.rating, 
        r.text, 
        r.created_at, 
        r.updated_at,
        p.name as product_name
      FROM reviews r
      JOIN products p ON r.product_id = p.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(text, [userId, limit, offset]);
    return res.rows;
  }

  /**
   * Update review
   * @param {string} reviewId 
   * @param {object} data - { rating, text }
   * @returns {Promise} Updated review
   */
  static async update(reviewId, data) {
    const { rating, text } = data;
    
    if (rating && (rating < 1 || rating > 5)) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    const text_query = `
      UPDATE reviews
      SET rating = COALESCE($2, rating),
          text = COALESCE($3, text)
      WHERE id = $1
      RETURNING id, product_id, user_id, rating, text, updated_at
    `;
    const values = [reviewId, rating, text];
    
    const res = await query(text_query, values);
    return res.rows[0] || null;
  }

  /**
   * Delete review
   * @param {string} reviewId 
   * @returns {Promise} Success
   */
  static async delete(reviewId) {
    const text = 'DELETE FROM reviews WHERE id = $1 RETURNING id';
    const res = await query(text, [reviewId]);
    return res.rowCount > 0;
  }

  /**
   * Get average rating and count for a product
   * @param {string} productId 
   * @returns {Promise} { average_rating, count }
   */
  static async getStats(productId) {
    const text = `
      SELECT 
        AVG(rating)::DECIMAL(3,2) as average_rating,
        COUNT(*) as review_count
      FROM reviews
      WHERE product_id = $1
    `;
    const res = await query(text, [productId]);
    return {
      average_rating: parseFloat(res.rows[0].average_rating || 0),
      review_count: parseInt(res.rows[0].review_count || 0, 10)
    };
  }

  /**
   * Count reviews for a product
   * @param {string} productId 
   * @returns {Promise} Review count
   */
  static async countByProduct(productId) {
    const text = 'SELECT COUNT(*) as count FROM reviews WHERE product_id = $1';
    const res = await query(text, [productId]);
    return parseInt(res.rows[0].count, 10);
  }

  /**
   * Check if user reviewed product
   * @param {string} productId 
   * @param {string} userId 
   * @returns {Promise} Review object or null
   */
  static async findUserReview(productId, userId) {
    const text = `
      SELECT id, product_id, user_id, rating, text, created_at, updated_at
      FROM reviews
      WHERE product_id = $1 AND user_id = $2
    `;
    const res = await query(text, [productId, userId]);
    return res.rows[0] || null;
  }
}

module.exports = Review;
