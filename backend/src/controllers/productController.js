/**
 * Product Controller
 * Handles product listing, search, filtering, and admin product management
 */

const { Product, Category, Review, ProductVariant, ProductImage } = require('../models');

/**
 * Get all products with pagination and filters
 * GET /api/products
 * 
 * Query parameters:
 * - page (default: 1) - page number
 * - limit (default: 20, max: 100) - items per page
 * - category_id (optional) - filter by category UUID
 * - search (optional) - search by name/description
 * - sort (default: 'newest') - newest, price_asc, price_desc, rating
 * - price_min, price_max (optional) - price range filter
 * 
 * @param {object} req - Express request
 * @returns {object} { products: [...], pagination: { page, limit, total, pages } }
 */
async function listProducts(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      category_id,
      search,
      sort = 'newest',
      price_min,
      price_max
    } = req.query;

    // Validate pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let products;
    let total;

    // Build query based on filters
    if (search) {
      // Search by name or description
      products = await Product.search(search, limitNum, offset);
      total = await Product.count(); // Simplified count - could be optimized
    } else if (category_id) {
      // Filter by category
      products = await Product.listByCategory(category_id, limitNum, offset);
      // Count in this category - need to optimize this
      total = await Category.countProducts(category_id);
    } else {
      // List all products
      products = await Product.listAll(limitNum, offset);
      total = await Product.count();
    }

    // Apply price filter if provided
    if (price_min || price_max) {
      products = products.filter(p => {
        const priceOk = 
          (!price_min || p.price >= parseFloat(price_min)) &&
          (!price_max || p.price <= parseFloat(price_max));
        return priceOk;
      });
    }

    // Apply sorting
    switch (sort) {
      case 'price_asc':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        // Would need to join with review stats
        // For now, leaving as default
        break;
      case 'newest':
      default:
        // Already sorted by created_at DESC from query
        break;
    }

    // Enhance products with review stats
    const enhancedProducts = await Promise.all(
      products.map(async (product) => {
        const stats = await Review.getStats(product.id);
        return {
          ...product,
          rating: stats.average_rating,
          review_count: stats.review_count
        };
      })
    );

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      products: enhancedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('List products error:', error);
    return res.status(500).json({
      error: 'Failed to list products',
      message: error.message
    });
  }
}

/**
 * Get single product by ID with reviews and ratings
 * GET /api/products/:id
 * 
 * @param {object} req - Express request
 * @param {string} req.params.id - Product UUID
 * @returns {object} { product: {...}, reviews: [...], stats: {...} }
 */
async function getProduct(req, res) {
  try {
    const { id } = req.params;

    if (!id || id.length !== 36) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }

    // Use enriched fetch that includes variants + images
    const product = await Product.findByIdWithVariants(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const reviews = await Review.listByProduct(id, 10, 0);
    const stats = await Review.getStats(id);

    return res.status(200).json({ product, reviews, stats });
  } catch (error) {
    console.error('Get product error:', error);
    return res.status(500).json({ error: 'Failed to get product', message: error.message });
  }
}

/**
 * Create new product (admin only)
 * POST /api/products
 * 
 * @param {object} req - Express request
 * @param {string} req.body.name
 * @param {string} req.body.description
 * @param {number} req.body.price
 * @param {number} req.body.quantity_in_stock
 * @param {string} req.body.category_id - Category UUID
 * @param {array} req.body.image_urls - Array of image URLs
 * @returns {object} { product: {...} }
 */
async function createProduct(req, res) {
  try {
    const { name, description, price, quantity_in_stock, category_id, image_urls } = req.body;

    // Validate required fields
    if (!name || !description || price === undefined || !category_id) {
      return res.status(400).json({
        error: 'Missing required fields: name, description, price, category_id'
      });
    }

    // Validate price
    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        error: 'Price must be a positive number'
      });
    }

    // Validate category exists
    const category = await Category.findById(category_id);
    if (!category) {
      return res.status(404).json({
        error: 'Category not found'
      });
    }

    // Validate image URLs if provided
    if (image_urls && !Array.isArray(image_urls)) {
      return res.status(400).json({
        error: 'image_urls must be an array'
      });
    }

    // Create product
    const product = await Product.create({
      seller_id: req.user.userId, // From auth middleware
      name,
      description,
      price: parseFloat(price),
      quantity_in_stock: parseInt(quantity_in_stock, 10) || 0,
      category_id,
      image_urls: image_urls || []
    });

    return res.status(201).json({
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({
      error: 'Failed to create product',
      message: error.message
    });
  }
}

/**
 * Update product (admin only)
 * PUT /api/products/:id
 * 
 * @param {object} req - Express request
 * @param {string} req.params.id - Product UUID
 * @param {string} req.body.name - optional
 * @param {string} req.body.description - optional
 * @param {number} req.body.price - optional
 * @param {number} req.body.quantity_in_stock - optional
 * @param {string} req.body.category_id - optional
 * @param {array} req.body.image_urls - optional
 * @returns {object} { product: {...} }
 */
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, description, price, quantity_in_stock, category_id, image_urls } = req.body;

    // Check product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    // If category_id provided, validate it exists
    if (category_id) {
      const category = await Category.findById(category_id);
      if (!category) {
        return res.status(404).json({
          error: 'Category not found'
        });
      }
    }

    // Validate price if provided
    if (price !== undefined && (isNaN(price) || price < 0)) {
      return res.status(400).json({
        error: 'Price must be a positive number'
      });
    }

    // Update product
    const updatedProduct = await Product.update(id, {
      name,
      description,
      price: price !== undefined ? parseFloat(price) : undefined,
      quantity_in_stock: quantity_in_stock !== undefined ? parseInt(quantity_in_stock, 10) : undefined,
      category_id,
      image_urls
    });

    return res.status(200).json({
      product: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({
      error: 'Failed to update product',
      message: error.message
    });
  }
}

/**
 * Delete product (admin only)
 * DELETE /api/products/:id
 * 
 * @param {object} req - Express request
 * @param {string} req.params.id - Product UUID
 * @returns {object} { message: "Product deleted successfully" }
 */
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    // Check product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    // Delete product
    const success = await Product.delete(id);
    if (!success) {
      throw new Error('Failed to delete product');
    }

    return res.status(200).json({
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({
      error: 'Failed to delete product',
      message: error.message
    });
  }
}

/**
 * Get low stock products (admin only)
 * GET /api/products/admin/low-stock
 * 
 * Query parameters:
 * - threshold (default: 10) - stock level threshold
 * 
 * @param {object} req - Express request
 * @returns {object} { products: [...] }
 */
async function getLowStockProducts(req, res) {
  try {
    const { threshold = 10 } = req.query;

    const products = await Product.getLowStock(parseInt(threshold, 10) || 10);

    return res.status(200).json({
      products,
      threshold: parseInt(threshold, 10) || 10
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    return res.status(500).json({
      error: 'Failed to get low stock products',
      message: error.message
    });
  }
}

/**
 * Get products by category
 * GET /api/categories/:categoryId/products
 * 
 * @param {object} req - Express request
 * @param {string} req.params.categoryId - Category UUID
 * @returns {object} { category: {...}, products: [...], pagination: {...} }
 */
async function getProductsByCategory(req, res) {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Validate category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        error: 'Category not found'
      });
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Get products
    const products = await Product.listByCategory(categoryId, limitNum, offset);
    const total = await Category.countProducts(categoryId);

    // Enhance with review stats
    const enhancedProducts = await Promise.all(
      products.map(async (product) => {
        const stats = await Review.getStats(product.id);
        return {
          ...product,
          rating: stats.average_rating,
          review_count: stats.review_count
        };
      })
    );

    const totalPages = Math.ceil(total / limitNum);

    return res.status(200).json({
      category,
      products: enhancedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    return res.status(500).json({
      error: 'Failed to get products by category',
      message: error.message
    });
  }
}

// ---------------------------------------------------------------------------
// Variant Management (admin only)
// ---------------------------------------------------------------------------

/**
 * POST /api/products/:id/variants
 * Add a color variant to a product
 *
 * Body: { color_name, color_hex, price_delta, stock, is_default, sort_order }
 */
async function createVariant(req, res) {
  try {
    const { id } = req.params;
    const { color_name, color_hex, price_delta = 0, stock = 0, is_default = false, sort_order = 0 } = req.body;

    if (!color_name) {
      return res.status(400).json({ error: 'color_name is required' });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const variant = await ProductVariant.create({
      product_id: id,
      color_name,
      color_hex,
      price_delta: parseFloat(price_delta) || 0,
      stock: parseInt(stock, 10) || 0,
      is_default,
      sort_order: parseInt(sort_order, 10) || 0
    });

    return res.status(201).json({ variant });
  } catch (error) {
    console.error('Create variant error:', error);
    return res.status(500).json({ error: 'Failed to create variant', message: error.message });
  }
}

/**
 * PUT /api/products/:id/variants/:variantId
 * Update a color variant
 */
async function updateVariant(req, res) {
  try {
    const { variantId } = req.params;
    const { color_name, color_hex, price_delta, stock, is_default, sort_order } = req.body;

    const variant = await ProductVariant.findById(variantId);
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    const updated = await ProductVariant.update(variantId, {
      color_name,
      color_hex,
      price_delta: price_delta !== undefined ? parseFloat(price_delta) : undefined,
      stock: stock !== undefined ? parseInt(stock, 10) : undefined,
      is_default,
      sort_order: sort_order !== undefined ? parseInt(sort_order, 10) : undefined
    });

    return res.status(200).json({ variant: updated });
  } catch (error) {
    console.error('Update variant error:', error);
    return res.status(500).json({ error: 'Failed to update variant', message: error.message });
  }
}

/**
 * DELETE /api/products/:id/variants/:variantId
 * Delete a color variant (cascades to its images)
 */
async function deleteVariant(req, res) {
  try {
    const { variantId } = req.params;

    const variant = await ProductVariant.findById(variantId);
    if (!variant) return res.status(404).json({ error: 'Variant not found' });

    await ProductVariant.delete(variantId);
    return res.status(200).json({ message: 'Variant deleted' });
  } catch (error) {
    console.error('Delete variant error:', error);
    return res.status(500).json({ error: 'Failed to delete variant', message: error.message });
  }
}

// ---------------------------------------------------------------------------
// Image Management (admin only)
// ---------------------------------------------------------------------------

/**
 * POST /api/products/:id/images
 * Add an image to a product (shared or variant-specific)
 *
 * Body: { url, alt_text, sort_order, variant_id (optional) }
 */
async function addImage(req, res) {
  try {
    const { id } = req.params;
    const { url, alt_text, sort_order = 0, variant_id = null } = req.body;

    if (!url) return res.status(400).json({ error: 'url is required' });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // If variant_id provided, verify it belongs to this product
    if (variant_id) {
      const variant = await ProductVariant.findById(variant_id);
      if (!variant || variant.product_id !== id) {
        return res.status(400).json({ error: 'variant_id does not belong to this product' });
      }
    }

    const image = await ProductImage.create({
      product_id: id,
      variant_id,
      url,
      alt_text,
      sort_order: parseInt(sort_order, 10) || 0
    });

    return res.status(201).json({ image });
  } catch (error) {
    console.error('Add image error:', error);
    return res.status(500).json({ error: 'Failed to add image', message: error.message });
  }
}

/**
 * DELETE /api/products/:id/images/:imageId
 * Remove an image from a product
 */
async function deleteImage(req, res) {
  try {
    const { imageId } = req.params;
    const success = await ProductImage.delete(imageId);
    if (!success) return res.status(404).json({ error: 'Image not found' });
    return res.status(200).json({ message: 'Image deleted' });
  } catch (error) {
    console.error('Delete image error:', error);
    return res.status(500).json({ error: 'Failed to delete image', message: error.message });
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getProductsByCategory,
  createVariant,
  updateVariant,
  deleteVariant,
  addImage,
  deleteImage
};
