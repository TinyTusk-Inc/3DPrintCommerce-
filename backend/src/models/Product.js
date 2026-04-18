/**
 * Product Model
 * Handles products and inventory
 */

const { query } = require('../config/database');

class Product {
  /**
   * Create a new product
   * @param {object} data - { seller_id, name, description, price, quantity_in_stock, category_id, image_urls }
   * @returns {Promise} Product object
   */
  static async create(data) {
    const { seller_id, name, description, price, quantity_in_stock = 0, category_id, image_urls = [] } = data;
    
    const text = `
      INSERT INTO products (seller_id, name, description, price, quantity_in_stock, category_id, image_urls)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, seller_id, name, description, price, quantity_in_stock, category_id, image_urls, created_at, updated_at
    `;
    const values = [
      seller_id,
      name,
      description,
      price,
      quantity_in_stock,
      category_id,
      JSON.stringify(image_urls)
    ];
    
    const res = await query(text, values);
    return res.rows[0];
  }

  /**
   * Get product by ID
   * @param {string} productId 
   * @returns {Promise} Product object with parsed image_urls
   */
  static async findById(productId) {
    const text = `
      SELECT id, seller_id, name, description, price, quantity_in_stock, category_id, image_urls, created_at, updated_at
      FROM products
      WHERE id = $1
    `;
    const res = await query(text, [productId]);
    if (res.rows[0]) {
      res.rows[0].image_urls = res.rows[0].image_urls || [];
    }
    return res.rows[0] || null;
  }

  /**
   * Get product by ID with full variant + image data
   * Use this for the product detail page.
   * @param {string} productId
   * @returns {Promise} Product with variants[] and images[]
   */
  static async findByIdWithVariants(productId) {
    const ProductVariant = require('./ProductVariant');
    const ProductImage = require('./ProductImage');

    const product = await Product.findById(productId);
    if (!product) return null;

    const [variants, images] = await Promise.all([
      ProductVariant.listByProduct(productId),
      ProductImage.listByProduct(productId)
    ]);

    // Attach images to each variant for easy frontend consumption
    const variantsWithImages = variants.map((v) => ({
      ...v,
      images: images.filter((img) => img.variant_id === v.id)
    }));

    // Shared images (no variant)
    const sharedImages = images.filter((img) => img.variant_id === null);

    return {
      ...product,
      variants: variantsWithImages,
      shared_images: sharedImages,
      // Convenience: hero image is the first shared image or first variant image
      hero_image: sharedImages[0]?.url || variantsWithImages[0]?.images[0]?.url || null
    };
  }

  /**
   * List all products with pagination
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of products
   */
  static async listAll(limit = 50, offset = 0) {
    const text = `
      SELECT id, seller_id, name, description, price, quantity_in_stock, category_id, image_urls, created_at, updated_at
      FROM products
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const res = await query(text, [limit, offset]);
    return res.rows.map(p => ({
      ...p,
      image_urls: p.image_urls || []
    }));
  }

  /**
   * List products by category
   * @param {string} categoryId 
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of products
   */
  static async listByCategory(categoryId, limit = 50, offset = 0) {
    const text = `
      SELECT id, seller_id, name, description, price, quantity_in_stock, category_id, image_urls, created_at, updated_at
      FROM products
      WHERE category_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const res = await query(text, [categoryId, limit, offset]);
    return res.rows.map(p => ({
      ...p,
      image_urls: p.image_urls || []
    }));
  }

  /**
   * Search products by name or description
   * @param {string} searchTerm 
   * @param {number} limit 
   * @param {number} offset 
   * @returns {Promise} Array of products
   */
  static async search(searchTerm, limit = 50, offset = 0) {
    const text = `
      SELECT id, seller_id, name, description, price, quantity_in_stock, category_id, image_urls, created_at, updated_at
      FROM products
      WHERE name ILIKE $1 OR description ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const value = `%${searchTerm}%`;
    const res = await query(text, [value, limit, offset]);
    return res.rows.map(p => ({
      ...p,
      image_urls: JSON.parse(p.image_urls || '[]')
    }));
  }

  /**
   * Update product
   * @param {string} productId 
   * @param {object} data - { name, description, price, quantity_in_stock, category_id, image_urls }
   * @returns {Promise} Updated product
   */
  static async update(productId, data) {
    const { name, description, price, quantity_in_stock, category_id, image_urls } = data;
    
    const text = `
      UPDATE products
      SET name = COALESCE($2, name),
          description = COALESCE($3, description),
          price = COALESCE($4, price),
          quantity_in_stock = COALESCE($5, quantity_in_stock),
          category_id = COALESCE($6, category_id),
          image_urls = COALESCE($7, image_urls)
      WHERE id = $1
      RETURNING id, seller_id, name, description, price, quantity_in_stock, category_id, image_urls, updated_at
    `;
    const values = [
      productId,
      name,
      description,
      price,
      quantity_in_stock,
      category_id,
      image_urls ? JSON.stringify(image_urls) : null
    ];
    
    const res = await query(text, values);
    if (res.rows[0]) {
      res.rows[0].image_urls = JSON.parse(res.rows[0].image_urls || '[]');
    }
    return res.rows[0] || null;
  }

  /**
   * Decrement stock quantity (called on payment confirmation)
   * @param {string} productId
   * @param {number} quantity - amount to subtract
   * @returns {Promise} Updated product
   */
  static async decrementStock(productId, quantity) {
    const text = `
      UPDATE products
      SET quantity_in_stock = GREATEST(0, quantity_in_stock - $2)
      WHERE id = $1
      RETURNING id, name, quantity_in_stock
    `;
    const res = await query(text, [productId, quantity]);
    return res.rows[0] || null;
  }

  /**
   * Delete product
   * @param {string} productId 
   * @returns {Promise} Success
   */
  static async delete(productId) {
    const text = 'DELETE FROM products WHERE id = $1 RETURNING id';
    const res = await query(text, [productId]);
    return res.rowCount > 0;
  }

  /**
   * Count total products
   * @returns {Promise} Product count
   */
  static async count() {
    const text = 'SELECT COUNT(*) as count FROM products';
    const res = await query(text, []);
    return parseInt(res.rows[0].count, 10);
  }

  /**
   * Get low stock products (quantity < threshold)
   * @param {number} threshold 
   * @returns {Promise} Array of products
   */
  static async getLowStock(threshold = 10) {
    const text = `
      SELECT id, name, quantity_in_stock, price
      FROM products
      WHERE quantity_in_stock < $1
      ORDER BY quantity_in_stock ASC
    `;
    const res = await query(text, [threshold]);
    return res.rows;
  }
}

module.exports = Product;
