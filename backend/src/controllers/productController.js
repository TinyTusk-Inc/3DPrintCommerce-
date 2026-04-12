/**
 * Product Controller
 * Handles product listing, search, filtering, and admin product management
 */

const { Product, Category, Review } = require('../models');

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

    // Validate UUID format (basic check)
    if (!id || id.length !== 36) {
      return res.status(400).json({
        error: 'Invalid product ID format'
      });
    }

    // Get product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    // Get reviews for product
    const reviews = await Review.listByProduct(id, 10, 0);

    // Get review stats
    const stats = await Review.getStats(id);

    return res.status(200).json({
      product,
      reviews,
      stats
    });
  } catch (error) {
    console.error('Get product error:', error);
    return res.status(500).json({
      error: 'Failed to get product',
      message: error.message
    });
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

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getProductsByCategory
};
