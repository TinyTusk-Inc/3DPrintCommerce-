/**
 * CustomOrder Model
 * Handles custom 3D printing orders (Phase 5)
 */

const { query } = require('../config/database');

class CustomOrder {
  /**
   * Create a custom order
   * @param {object} data - { user_id, seller_id, description, specifications, status, estimated_cost, files_urls }
   * @returns {Promise} CustomOrder object
   */
  static async create(data) {
    const { user_id, seller_id, description, specifications = {}, status = 'submitted', estimated_cost = null, files_urls = [] } = data;
    
    const text = `
      INSERT INTO custom_orders (user_id, seller_id, description, specifications, status, estimated_cost, files_urls)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, seller_id, description, specifications, status, estimated_cost, files_urls, created_at, updated_at
    `;
    const values = [
      user_id,
      seller_id,
      description,
      JSON.stringify(specifications),
      status,
      estimated_cost,
      JSON.stringify(files_urls)
    ];
    
    const res = await query(text, values);
    return {
      ...res.rows[0],
      specifications: JSON.parse(res.rows[0].specifications || '{}'),
      files_urls: JSON.parse(res.rows[0].files_urls || '[]')
    };
  }

  /**
   * Get custom order by ID
   * @param {string} customOrderId 
   * @returns {Promise} CustomOrder object
   */
  static async findById(customOrderId) {
    const text = `
      SELECT id, user_id, seller_id, description, specifications, status, estimated_cost, files_urls, created_at, updated_at
      FROM custom_orders
      WHERE id = $1
    `;
    const res = await query(text, [customOrderId]);
    if (res.rows[0]) {
      return {
        ...res.rows[0],
        specifications: JSON.parse(res.rows[0].specifications || '{}'),
        files_urls: JSON.parse(res.rows[0].files_urls || '[]')
      };
    }
    return null;
  }

  /**
   * List custom orders by user
   * @param {string} userId 
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of custom orders
   */
  static async listByUser(userId, limit = 50, offset = 0) {
    const text = `
      SELECT id, user_id, seller_id, description, status, estimated_cost, created_at, updated_at
      FROM custom_orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(text, [userId, limit, offset]);
    return res.rows;
  }

  /**
   * List custom orders for a seller
   * @param {string} sellerId 
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of custom orders
   */
  static async listBySeller(sellerId, limit = 50, offset = 0) {
    const text = `
      SELECT id, user_id, seller_id, description, status, estimated_cost, created_at, updated_at
      FROM custom_orders
      WHERE seller_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(text, [sellerId, limit, offset]);
    return res.rows;
  }

  /**
   * List custom orders by status
   * @param {string} status - submitted, in_progress, quote_sent, accepted, rejected, completed
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of custom orders
   */
  static async listByStatus(status, limit = 50, offset = 0) {
    const text = `
      SELECT id, user_id, seller_id, description, status, estimated_cost, created_at, updated_at
      FROM custom_orders
      WHERE status = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(text, [status, limit, offset]);
    return res.rows;
  }

  /**
   * Update custom order
   * @param {string} customOrderId 
   * @param {object} data - { status, estimated_cost, specifications }
   * @returns {Promise} Updated custom order
   */
  static async update(customOrderId, data) {
    const { status, estimated_cost, specifications } = data;
    
    const text = `
      UPDATE custom_orders
      SET status = COALESCE($2, status),
          estimated_cost = COALESCE($3, estimated_cost),
          specifications = COALESCE($4, specifications)
      WHERE id = $1
      RETURNING id, user_id, seller_id, description, status, estimated_cost, specifications, updated_at
    `;
    const values = [
      customOrderId,
      status,
      estimated_cost,
      specifications ? JSON.stringify(specifications) : null
    ];
    
    const res = await query(text, values);
    if (res.rows[0]) {
      return {
        ...res.rows[0],
        specifications: JSON.parse(res.rows[0].specifications || '{}')
      };
    }
    return null;
  }

  /**
   * Update status
   * @param {string} customOrderId 
   * @param {string} newStatus 
   * @param {number} estimatedCost 
   * @returns {Promise} Updated order
   */
  static async updateStatus(customOrderId, newStatus, estimatedCost = null) {
    const text = `
      UPDATE custom_orders
      SET status = $2, estimated_cost = COALESCE($3, estimated_cost)
      WHERE id = $1
      RETURNING id, status, estimated_cost, updated_at
    `;
    const res = await query(text, [customOrderId, newStatus, estimatedCost]);
    return res.rows[0] || null;
  }

  /**
   * Count custom orders
   * @returns {Promise} Count
   */
  static async count() {
    const text = 'SELECT COUNT(*) as count FROM custom_orders';
    const res = await query(text, []);
    return parseInt(res.rows[0].count, 10);
  }

  /**
   * Count pending custom orders
   * @returns {Promise} Count
   */
  static async countPending() {
    const text = "SELECT COUNT(*) as count FROM custom_orders WHERE status IN ('submitted', 'in_progress')";
    const res = await query(text, []);
    return parseInt(res.rows[0].count, 10);
  }
}

module.exports = CustomOrder;
