/**
 * ProductImage Model
 * Manages photos for a product.
 *
 * variant_id = NULL  → shared image, shown for all color selections
 * variant_id = <id>  → color-specific image, shown only for that variant
 *
 * sort_order = 0 is the primary/hero image.
 */

const { query } = require('../config/database');

class ProductImage {
  /**
   * Get all images for a product (shared + all variant images)
   * @param {string} productId
   * @returns {Promise<Array>}
   */
  static async listByProduct(productId) {
    const text = `
      SELECT id, product_id, variant_id, url, alt_text, sort_order, created_at
      FROM product_images
      WHERE product_id = $1
      ORDER BY sort_order ASC, created_at ASC
    `;
    const res = await query(text, [productId]);
    return res.rows;
  }

  /**
   * Get shared images only (variant_id IS NULL)
   * @param {string} productId
   * @returns {Promise<Array>}
   */
  static async listShared(productId) {
    const text = `
      SELECT id, product_id, variant_id, url, alt_text, sort_order, created_at
      FROM product_images
      WHERE product_id = $1 AND variant_id IS NULL
      ORDER BY sort_order ASC
    `;
    const res = await query(text, [productId]);
    return res.rows;
  }

  /**
   * Get images for a specific variant
   * @param {string} variantId
   * @returns {Promise<Array>}
   */
  static async listByVariant(variantId) {
    const text = `
      SELECT id, product_id, variant_id, url, alt_text, sort_order, created_at
      FROM product_images
      WHERE variant_id = $1
      ORDER BY sort_order ASC
    `;
    const res = await query(text, [variantId]);
    return res.rows;
  }

  /**
   * Get images to display for a given variant selection:
   * variant-specific images first, then shared images.
   * If variantId is null, returns only shared images.
   * @param {string} productId
   * @param {string|null} variantId
   * @returns {Promise<Array>}
   */
  static async listForDisplay(productId, variantId = null) {
    if (!variantId) {
      return ProductImage.listShared(productId);
    }

    const text = `
      SELECT id, product_id, variant_id, url, alt_text, sort_order, created_at
      FROM product_images
      WHERE product_id = $1 AND (variant_id = $2 OR variant_id IS NULL)
      ORDER BY
        CASE WHEN variant_id = $2 THEN 0 ELSE 1 END,  -- variant images first
        sort_order ASC
    `;
    const res = await query(text, [productId, variantId]);
    return res.rows;
  }

  /**
   * Create a new image record
   * @param {object} data - { product_id, variant_id, url, alt_text, sort_order }
   * @returns {Promise<object>}
   */
  static async create(data) {
    const { product_id, variant_id = null, url, alt_text = null, sort_order = 0 } = data;

    const text = `
      INSERT INTO product_images (product_id, variant_id, url, alt_text, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, product_id, variant_id, url, alt_text, sort_order, created_at
    `;
    const values = [product_id, variant_id, url, alt_text, sort_order];
    const res = await query(text, values);
    return res.rows[0];
  }

  /**
   * Bulk create images (used when creating/updating a product)
   * @param {Array<object>} images - array of { product_id, variant_id, url, alt_text, sort_order }
   * @returns {Promise<Array>}
   */
  static async bulkCreate(images) {
    if (!images || images.length === 0) return [];

    const results = [];
    for (const img of images) {
      results.push(await ProductImage.create(img));
    }
    return results;
  }

  /**
   * Update an image record
   * @param {string} imageId
   * @param {object} data - { url, alt_text, sort_order, variant_id }
   * @returns {Promise<object|null>}
   */
  static async update(imageId, data) {
    const { url, alt_text, sort_order, variant_id } = data;
    const text = `
      UPDATE product_images
      SET url        = COALESCE($2, url),
          alt_text   = COALESCE($3, alt_text),
          sort_order = COALESCE($4, sort_order),
          variant_id = $5
      WHERE id = $1
      RETURNING id, product_id, variant_id, url, alt_text, sort_order
    `;
    const res = await query(text, [imageId, url, alt_text, sort_order, variant_id ?? null]);
    return res.rows[0] || null;
  }

  /**
   * Delete a single image
   * @param {string} imageId
   * @returns {Promise<boolean>}
   */
  static async delete(imageId) {
    const res = await query('DELETE FROM product_images WHERE id = $1 RETURNING id', [imageId]);
    return res.rowCount > 0;
  }

  /**
   * Delete all images for a product
   * @param {string} productId
   */
  static async deleteByProduct(productId) {
    await query('DELETE FROM product_images WHERE product_id = $1', [productId]);
  }
}

module.exports = ProductImage;
