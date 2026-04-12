/**
 * Category Model
 * Handles product categories
 */

const { query } = require('../config/database');

class Category {
  /**
   * Create a new category
   * @param {string} name 
   * @param {string} description 
   * @returns {Promise} Category object
   */
  static async create(name, description = null) {
    const text = `
      INSERT INTO categories (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, created_at, updated_at
    `;
    const values = [name, description];
    
    try {
      const res = await query(text, values);
      return res.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('Category name already exists');
      }
      throw error;
    }
  }

  /**
   * Get category by ID
   * @param {string} categoryId 
   * @returns {Promise} Category object
   */
  static async findById(categoryId) {
    const text = `
      SELECT id, name, description, created_at, updated_at
      FROM categories
      WHERE id = $1
    `;
    const res = await query(text, [categoryId]);
    return res.rows[0] || null;
  }

  /**
   * Get category by name
   * @param {string} name 
   * @returns {Promise} Category object
   */
  static async findByName(name) {
    const text = `
      SELECT id, name, description, created_at, updated_at
      FROM categories
      WHERE name = $1
    `;
    const res = await query(text, [name]);
    return res.rows[0] || null;
  }

  /**
   * List all categories
   * @returns {Promise} Array of categories
   */
  static async listAll() {
    const text = `
      SELECT id, name, description, created_at, updated_at
      FROM categories
      ORDER BY name ASC
    `;
    const res = await query(text, []);
    return res.rows;
  }

  /**
   * Update category
   * @param {string} categoryId 
   * @param {object} data - { name, description }
   * @returns {Promise} Updated category
   */
  static async update(categoryId, data) {
    const { name, description } = data;
    const text = `
      UPDATE categories
      SET name = COALESCE($2, name),
          description = COALESCE($3, description)
      WHERE id = $1
      RETURNING id, name, description, updated_at
    `;
    const values = [categoryId, name, description];
    
    const res = await query(text, values);
    return res.rows[0] || null;
  }

  /**
   * Delete category
   * @param {string} categoryId 
   * @returns {Promise} Success
   */
  static async delete(categoryId) {
    const text = 'DELETE FROM categories WHERE id = $1 RETURNING id';
    const res = await query(text, [categoryId]);
    return res.rowCount > 0;
  }

  /**
   * Count products in category
   * @param {string} categoryId 
   * @returns {Promise} Product count
   */
  static async countProducts(categoryId) {
    const text = 'SELECT COUNT(*) as count FROM products WHERE category_id = $1';
    const res = await query(text, [categoryId]);
    return parseInt(res.rows[0].count, 10);
  }
}

module.exports = Category;
