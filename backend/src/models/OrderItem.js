/**
 * OrderItem Model
 * Handles individual items in orders
 */

const { query } = require('../config/database');

class OrderItem {
  /**
   * Create order item
   * @param {object} data - { order_id, product_id, quantity, price_at_purchase }
   * @returns {Promise} OrderItem object
   */
  static async create(data) {
    const { order_id, product_id, quantity, price_at_purchase } = data;
    
    const text = `
      INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
      VALUES ($1, $2, $3, $4)
      RETURNING id, order_id, product_id, quantity, price_at_purchase, created_at
    `;
    const values = [order_id, product_id, quantity, price_at_purchase];
    
    const res = await query(text, values);
    return res.rows[0];
  }

  /**
   * Get order item by ID
   * @param {string} orderItemId 
   * @returns {Promise} OrderItem object
   */
  static async findById(orderItemId) {
    const text = `
      SELECT id, order_id, product_id, quantity, price_at_purchase, created_at
      FROM order_items
      WHERE id = $1
    `;
    const res = await query(text, [orderItemId]);
    return res.rows[0] || null;
  }

  /**
   * List items in an order
   * @param {string} orderId 
   * @returns {Promise} Array of order items with product details
   */
  static async listByOrder(orderId) {
    const text = `
      SELECT 
        oi.id, 
        oi.order_id, 
        oi.product_id, 
        oi.quantity, 
        oi.price_at_purchase,
        p.name as product_name,
        p.description as product_description,
        p.image_urls,
        oi.created_at
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
    `;
    const res = await query(text, [orderId]);
    return res.rows.map(item => ({
      ...item,
      image_urls: JSON.parse(item.image_urls || '[]')
    }));
  }

  /**
   * Get total quantity of product sold
   * @param {string} productId 
   * @returns {Promise} Total quantity
   */
  static async getTotalSold(productId) {
    const text = `
      SELECT SUM(quantity) as total_sold
      FROM order_items
      WHERE product_id = $1
    `;
    const res = await query(text, [productId]);
    return parseInt(res.rows[0].total_sold || 0, 10);
  }

  /**
   * Get revenue for a product
   * @param {string} productId 
   * @returns {Promise} Total revenue
   */
  static async getRevenue(productId) {
    const text = `
      SELECT SUM(quantity * price_at_purchase) as total_revenue
      FROM order_items
      WHERE product_id = $1
    `;
    const res = await query(text, [productId]);
    return parseFloat(res.rows[0].total_revenue || 0);
  }

  /**
   * Delete order item
   * @param {string} orderItemId 
   * @returns {Promise} Success
   */
  static async delete(orderItemId) {
    const text = 'DELETE FROM order_items WHERE id = $1 RETURNING id';
    const res = await query(text, [orderItemId]);
    return res.rowCount > 0;
  }

  /**
   * Count items in order
   * @param {string} orderId 
   * @returns {Promise} Item count
   */
  static async countByOrder(orderId) {
    const text = 'SELECT COUNT(*) as count FROM order_items WHERE order_id = $1';
    const res = await query(text, [orderId]);
    return parseInt(res.rows[0].count, 10);
  }
}

module.exports = OrderItem;
