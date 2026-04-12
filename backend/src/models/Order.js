/**
 * Order Model
 * Handles orders and order management
 */

const { query } = require('../config/database');

class Order {
  /**
   * Create a new order
   * @param {object} data - { user_id, seller_id, status, total_price, razorpay_order_id, shipping_address }
   * @returns {Promise} Order object
   */
  static async create(data) {
    const { user_id, seller_id, status = 'pending', total_price, razorpay_order_id, shipping_address } = data;
    
    const text = `
      INSERT INTO orders (user_id, seller_id, status, total_price, razorpay_order_id, shipping_address)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, seller_id, status, total_price, razorpay_order_id, shipping_address, created_at, updated_at
    `;
    const values = [
      user_id,
      seller_id,
      status,
      total_price,
      razorpay_order_id,
      shipping_address ? JSON.stringify(shipping_address) : null
    ];
    
    const res = await query(text, values);
    return res.rows[0];
  }

  /**
   * Get order by ID
   * @param {string} orderId 
   * @returns {Promise} Order object
   */
  static async findById(orderId) {
    const text = `
      SELECT id, user_id, seller_id, status, total_price, razorpay_order_id, razorpay_payment_id, shipping_address, created_at, updated_at
      FROM orders
      WHERE id = $1
    `;
    const res = await query(text, [orderId]);
    if (res.rows[0]) {
      res.rows[0].shipping_address = JSON.parse(res.rows[0].shipping_address || 'null');
    }
    return res.rows[0] || null;
  }

  /**
   * Get order by Razorpay order ID
   * @param {string} razorpayOrderId 
   * @returns {Promise} Order object
   */
  static async findByRazorpayOrderId(razorpayOrderId) {
    const text = `
      SELECT id, user_id, seller_id, status, total_price, razorpay_order_id, razorpay_payment_id, shipping_address, created_at, updated_at
      FROM orders
      WHERE razorpay_order_id = $1
    `;
    const res = await query(text, [razorpayOrderId]);
    if (res.rows[0]) {
      res.rows[0].shipping_address = JSON.parse(res.rows[0].shipping_address || 'null');
    }
    return res.rows[0] || null;
  }

  /**
   * List user orders
   * @param {string} userId 
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of orders
   */
  static async listByUser(userId, limit = 50, offset = 0) {
    const text = `
      SELECT id, user_id, seller_id, status, total_price, razorpay_order_id, razorpay_payment_id, created_at, updated_at
      FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(text, [userId, limit, offset]);
    return res.rows;
  }

  /**
   * List all orders (admin)
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of orders
   */
  static async listAll(limit = 50, offset = 0) {
    const text = `
      SELECT id, user_id, seller_id, status, total_price, razorpay_order_id, created_at, updated_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const res = await query(text, [limit, offset]);
    return res.rows;
  }

  /**
   * List orders by status
   * @param {string} status - pending, paid, shipped, delivered, cancelled
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of orders
   */
  static async listByStatus(status, limit = 50, offset = 0) {
    const text = `
      SELECT id, user_id, seller_id, status, total_price, razorpay_order_id, created_at, updated_at
      FROM orders
      WHERE status = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(text, [status, limit, offset]);
    return res.rows;
  }

  /**
   * Update order status
   * @param {string} orderId 
   * @param {string} newStatus 
   * @returns {Promise} Updated order
   */
  static async updateStatus(orderId, newStatus) {
    const text = `
      UPDATE orders
      SET status = $2
      WHERE id = $1
      RETURNING id, user_id, seller_id, status, total_price, razorpay_order_id, updated_at
    `;
    const res = await query(text, [orderId, newStatus]);
    return res.rows[0] || null;
  }

  /**
   * Update payment info after Razorpay webhook
   * @param {string} orderId 
   * @param {string} razorpayPaymentId 
   * @returns {Promise} Updated order
   */
  static async updatePaymentInfo(orderId, razorpayPaymentId) {
    const text = `
      UPDATE orders
      SET razorpay_payment_id = $2, status = 'paid'
      WHERE id = $1
      RETURNING id, status, razorpay_payment_id, updated_at
    `;
    const res = await query(text, [orderId, razorpayPaymentId]);
    return res.rows[0] || null;
  }

  /**
   * Count total orders
   * @returns {Promise} Order count
   */
  static async count() {
    const text = 'SELECT COUNT(*) as count FROM orders';
    const res = await query(text, []);
    return parseInt(res.rows[0].count, 10);
  }

  /**
   * Get orders by date range
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {Promise} Array of orders
   */
  static async getByDateRange(startDate, endDate) {
    const text = `
      SELECT id, user_id, seller_id, status, total_price, created_at
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
      ORDER BY created_at DESC
    `;
    const res = await query(text, [startDate, endDate]);
    return res.rows;
  }
}

module.exports = Order;
