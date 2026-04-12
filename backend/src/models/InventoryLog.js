/**
 * InventoryLog Model
 * Tracks all inventory changes for audit and analytics
 */

const { query } = require('../config/database');

class InventoryLog {
  /**
   * Create inventory log entry
   * @param {object} data - { product_id, action, quantity_delta, reason }
   * @returns {Promise} InventoryLog object
   */
  static async create(data) {
    const { product_id, action, quantity_delta, reason = null } = data;
    
    const validActions = ['add', 'remove', 'sold'];
    if (!validActions.includes(action)) {
      throw new Error(`Action must be one of: ${validActions.join(', ')}`);
    }
    
    const text = `
      INSERT INTO inventory_logs (product_id, action, quantity_delta, reason)
      VALUES ($1, $2, $3, $4)
      RETURNING id, product_id, action, quantity_delta, reason, created_at
    `;
    const values = [product_id, action, quantity_delta, reason];
    
    const res = await query(text, values);
    return res.rows[0];
  }

  /**
   * Get inventory log by ID
   * @param {string} logId 
   * @returns {Promise} InventoryLog object
   */
  static async findById(logId) {
    const text = `
      SELECT id, product_id, action, quantity_delta, reason, created_at
      FROM inventory_logs
      WHERE id = $1
    `;
    const res = await query(text, [logId]);
    return res.rows[0] || null;
  }

  /**
   * Get inventory logs for a product
   * @param {string} productId 
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of logs
   */
  static async listByProduct(productId, limit = 100, offset = 0) {
    const text = `
      SELECT id, product_id, action, quantity_delta, reason, created_at
      FROM inventory_logs
      WHERE product_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(text, [productId, limit, offset]);
    return res.rows;
  }

  /**
   * Get logs by action type
   * @param {string} action - add, remove, sold
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of logs
   */
  static async listByAction(action, limit = 100, offset = 0) {
    const text = `
      SELECT id, product_id, action, quantity_delta, reason, created_at
      FROM inventory_logs
      WHERE action = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(text, [action, limit, offset]);
    return res.rows;
  }

  /**
   * Get inventory logs for a date range
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {Promise} Array of logs
   */
  static async getByDateRange(startDate, endDate) {
    const text = `
      SELECT id, product_id, action, quantity_delta, reason, created_at
      FROM inventory_logs
      WHERE created_at BETWEEN $1 AND $2
      ORDER BY created_at DESC
    `;
    const res = await query(text, [startDate, endDate]);
    return res.rows;
  }

  /**
   * Get total quantity change for a product (cumulative delta)
   * @param {string} productId 
   * @returns {Promise} Total change
   */
  static async getTotalChange(productId) {
    const text = `
      SELECT SUM(quantity_delta) as total_change
      FROM inventory_logs
      WHERE product_id = $1
    `;
    const res = await query(text, [productId]);
    return parseInt(res.rows[0].total_change || 0, 10);
  }

  /**
   * Count logs for a product
   * @param {string} productId 
   * @returns {Promise} Log count
   */
  static async countByProduct(productId) {
    const text = 'SELECT COUNT(*) as count FROM inventory_logs WHERE product_id = $1';
    const res = await query(text, [productId]);
    return parseInt(res.rows[0].count, 10);
  }

  /**
   * Get inventory summary (sold, added, removed)
   * @param {string} productId 
   * @returns {Promise} Summary object
   */
  static async getSummary(productId) {
    const text = `
      SELECT 
        action,
        SUM(quantity_delta) as total_delta,
        COUNT(*) as count
      FROM inventory_logs
      WHERE product_id = $1
      GROUP BY action
    `;
    const res = await query(text, [productId]);
    
    const summary = { add: 0, remove: 0, sold: 0, add_count: 0, remove_count: 0, sold_count: 0 };
    res.rows.forEach(row => {
      summary[row.action] = parseInt(row.total_delta || 0, 10);
      summary[`${row.action}_count`] = parseInt(row.count || 0, 10);
    });
    
    return summary;
  }
}

module.exports = InventoryLog;
