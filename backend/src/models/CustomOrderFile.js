/**
 * CustomOrderFile Model
 * Handles file uploads for custom 3D printing orders (Phase 5)
 */

const { query } = require('../config/database');

class CustomOrderFile {
  /**
   * Create a file record for custom order
   * @param {object} data - { custom_order_id, file_name, file_url, file_type, file_size, virus_scanned }
   * @returns {Promise} CustomOrderFile object
   */
  static async create(data) {
    const { custom_order_id, file_name, file_url, file_type, file_size, virus_scanned = false } = data;
    
    const text = `
      INSERT INTO custom_order_files (custom_order_id, file_name, file_url, file_type, file_size, virus_scanned)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, custom_order_id, file_name, file_url, file_type, file_size, virus_scanned, created_at
    `;
    const values = [custom_order_id, file_name, file_url, file_type, file_size, virus_scanned];
    
    const res = await query(text, values);
    return res.rows[0];
  }

  /**
   * Get file by ID
   * @param {string} fileId 
   * @returns {Promise} CustomOrderFile object
   */
  static async findById(fileId) {
    const text = `
      SELECT id, custom_order_id, file_name, file_url, file_type, file_size, virus_scanned, created_at
      FROM custom_order_files
      WHERE id = $1
    `;
    const res = await query(text, [fileId]);
    return res.rows[0] || null;
  }

  /**
   * List files for a custom order
   * @param {string} customOrderId 
   * @returns {Promise} Array of files
   */
  static async listByCustomOrder(customOrderId) {
    const text = `
      SELECT id, custom_order_id, file_name, file_url, file_type, file_size, virus_scanned, created_at
      FROM custom_order_files
      WHERE custom_order_id = $1
      ORDER BY created_at ASC
    `;
    const res = await query(text, [customOrderId]);
    return res.rows;
  }

  /**
   * Update file record (mostly for virus_scanned status)
   * @param {string} fileId 
   * @param {object} data - { virus_scanned }
   * @returns {Promise} Updated file
   */
  static async update(fileId, data) {
    const { virus_scanned } = data;
    
    const text = `
      UPDATE custom_order_files
      SET virus_scanned = COALESCE($2, virus_scanned)
      WHERE id = $1
      RETURNING id, custom_order_id, file_name, file_url, file_type, file_size, virus_scanned
    `;
    const values = [fileId, virus_scanned];
    
    const res = await query(text, values);
    return res.rows[0] || null;
  }

  /**
   * Delete file record
   * @param {string} fileId 
   * @returns {Promise} Success
   */
  static async delete(fileId) {
    const text = 'DELETE FROM custom_order_files WHERE id = $1 RETURNING id';
    const res = await query(text, [fileId]);
    return res.rowCount > 0;
  }

  /**
   * Count files for a custom order
   * @param {string} customOrderId 
   * @returns {Promise} File count
   */
  static async countByCustomOrder(customOrderId) {
    const text = 'SELECT COUNT(*) as count FROM custom_order_files WHERE custom_order_id = $1';
    const res = await query(text, [customOrderId]);
    return parseInt(res.rows[0].count, 10);
  }

  /**
   * Get total file size for a custom order
   * @param {string} customOrderId 
   * @returns {Promise} Total size in bytes
   */
  static async getTotalSize(customOrderId) {
    const text = `
      SELECT SUM(file_size) as total_size
      FROM custom_order_files
      WHERE custom_order_id = $1
    `;
    const res = await query(text, [customOrderId]);
    return parseInt(res.rows[0].total_size || 0, 10);
  }

  /**
   * Get unscanned files
   * @returns {Promise} Array of files awaiting virus scan
   */
  static async getUnscanned() {
    const text = `
      SELECT id, custom_order_id, file_name, file_url, file_type, file_size, created_at
      FROM custom_order_files
      WHERE virus_scanned = false
      ORDER BY created_at ASC
    `;
    const res = await query(text, []);
    return res.rows;
  }

  /**
   * Mark multiple files as scanned
   * @param {array} fileIds 
   * @returns {Promise} Count updated
   */
  static async markScanned(fileIds) {
    if (!fileIds || fileIds.length === 0) return 0;
    
    const placeholders = fileIds.map((_, i) => `$${i + 1}`).join(',');
    const text = `
      UPDATE custom_order_files
      SET virus_scanned = true
      WHERE id IN (${placeholders})
    `;
    
    const res = await query(text, fileIds);
    return res.rowCount;
  }
}

module.exports = CustomOrderFile;
