/**
 * ProductVariant Model
 * Manages color variants for a product.
 * Each variant has its own stock level and optional price delta.
 */

const { query } = require('../config/database');

class ProductVariant {
  /**
   * Get all variants for a product (ordered by sort_order)
   * @param {string} productId
   * @returns {Promise<Array>}
   */
  static async listByProduct(productId) {
    const text = `
      SELECT id, product_id, color_name, color_hex, price_delta, stock, is_default, sort_order, created_at, updated_at
      FROM product_variants
      WHERE product_id = $1
      ORDER BY sort_order ASC, created_at ASC
    `;
    const res = await query(text, [productId]);
    return res.rows;
  }

  /**
   * Get a single variant by ID
   * @param {string} variantId
   * @returns {Promise<object|null>}
   */
  static async findById(variantId) {
    const text = `
      SELECT id, product_id, color_name, color_hex, price_delta, stock, is_default, sort_order, created_at, updated_at
      FROM product_variants
      WHERE id = $1
    `;
    const res = await query(text, [variantId]);
    return res.rows[0] || null;
  }

  /**
   * Create a new variant
   * @param {object} data - { product_id, color_name, color_hex, price_delta, stock, is_default, sort_order }
   * @returns {Promise<object>}
   */
  static async create(data) {
    const {
      product_id,
      color_name,
      color_hex = null,
      price_delta = 0,
      stock = 0,
      is_default = false,
      sort_order = 0
    } = data;

    // If this is the default, clear any existing default first
    if (is_default) {
      await query(
        'UPDATE product_variants SET is_default = FALSE WHERE product_id = $1',
        [product_id]
      );
    }

    const text = `
      INSERT INTO product_variants (product_id, color_name, color_hex, price_delta, stock, is_default, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, product_id, color_name, color_hex, price_delta, stock, is_default, sort_order, created_at
    `;
    const values = [product_id, color_name, color_hex, price_delta, stock, is_default, sort_order];
    const res = await query(text, values);
    return res.rows[0];
  }

  /**
   * Update a variant
   * @param {string} variantId
   * @param {object} data
   * @returns {Promise<object|null>}
   */
  static async update(variantId, data) {
    const { color_name, color_hex, price_delta, stock, is_default, sort_order } = data;

    // If setting as default, clear existing default for this product first
    if (is_default) {
      const existing = await ProductVariant.findById(variantId);
      if (existing) {
        await query(
          'UPDATE product_variants SET is_default = FALSE WHERE product_id = $1 AND id != $2',
          [existing.product_id, variantId]
        );
      }
    }

    const text = `
      UPDATE product_variants
      SET color_name  = COALESCE($2, color_name),
          color_hex   = COALESCE($3, color_hex),
          price_delta = COALESCE($4, price_delta),
          stock       = COALESCE($5, stock),
          is_default  = COALESCE($6, is_default),
          sort_order  = COALESCE($7, sort_order),
          updated_at  = NOW()
      WHERE id = $1
      RETURNING id, product_id, color_name, color_hex, price_delta, stock, is_default, sort_order, updated_at
    `;
    const values = [variantId, color_name, color_hex, price_delta, stock, is_default, sort_order];
    const res = await query(text, values);
    return res.rows[0] || null;
  }

  /**
   * Decrement variant stock on payment
   * @param {string} variantId
   * @param {number} quantity
   * @returns {Promise<object|null>}
   */
  static async decrementStock(variantId, quantity) {
    const text = `
      UPDATE product_variants
      SET stock = GREATEST(0, stock - $2), updated_at = NOW()
      WHERE id = $1
      RETURNING id, color_name, stock
    `;
    const res = await query(text, [variantId, quantity]);
    return res.rows[0] || null;
  }

  /**
   * Delete a variant (also cascades to its images)
   * @param {string} variantId
   * @returns {Promise<boolean>}
   */
  static async delete(variantId) {
    const res = await query('DELETE FROM product_variants WHERE id = $1 RETURNING id', [variantId]);
    return res.rowCount > 0;
  }

  /**
   * Delete all variants for a product
   * @param {string} productId
   */
  static async deleteByProduct(productId) {
    await query('DELETE FROM product_variants WHERE product_id = $1', [productId]);
  }
}

module.exports = ProductVariant;
