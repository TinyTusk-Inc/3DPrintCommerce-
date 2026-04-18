/**
 * Product Routes
 * Public and admin product management endpoints
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, verifyAdmin, optionalAuth } = require('../middleware/authMiddleware');

/**
 * Admin Routes (must come before :id routes)
 * Require authentication and admin role
 */

/**
 * GET /api/products/admin/low-stock
 * Get low stock products (admin only)
 * 
 * Query parameters:
 * - threshold (default: 10) - stock level threshold
 * 
 * Response: { products: [...], threshold: 10 }
 */
router.get('/admin/low-stock', verifyToken, verifyAdmin, productController.getLowStockProducts);

/**
 * POST /api/products
 * Create new product (admin only)
 * 
 * Request body:
 * {
 *   "name": "Product Name",
 *   "description": "Description",
 *   "price": 29.99,
 *   "quantity_in_stock": 100,
 *   "category_id": "uuid",
 *   "image_urls": ["https://...", "https://..."]
 * }
 * 
 * Response: { product: {...} }
 */
router.post('/', verifyToken, verifyAdmin, productController.createProduct);

/**
 * Public Routes
 * No authentication required
 */

/**
 * GET /api/products
 * List all products with pagination and filters
 * 
 * Query parameters:
 * - page (default: 1)
 * - limit (default: 20, max: 100)
 * - category_id (optional) - filter by category
 * - search (optional) - search by name/description
 * - sort (default: 'newest') - newest, price_asc, price_desc, rating
 * - price_min, price_max (optional) - price range
 * 
 * Response: { products: [...], pagination: {...} }
 */
router.get('/', optionalAuth, productController.listProducts);

/**
 * GET /api/products/:id
 * Get single product with reviews and ratings
 * 
 * Response: { product: {...}, reviews: [...], stats: {...} }
 */
router.get('/:id', productController.getProduct);

/**
 * PUT /api/products/:id
 * Update product (admin only)
 * 
 * Request body: (all fields optional)
 * {
 *   "name": "New Name",
 *   "description": "New Description",
 *   "price": 39.99,
 *   "quantity_in_stock": 150,
 *   "category_id": "uuid",
 *   "image_urls": [...]
 * }
 * 
 * Response: { product: {...} }
 */
router.put('/:id', verifyToken, verifyAdmin, productController.updateProduct);

/**
 * DELETE /api/products/:id
 * Delete product (admin only)
 * 
 * Response: { message: "Product deleted successfully" }
 */
router.delete('/:id', verifyToken, verifyAdmin, productController.deleteProduct);

/**
 * GET /api/categories/:categoryId/products
 * Get products by category with pagination
 * 
 * Query parameters:
 * - page (default: 1)
 * - limit (default: 20, max: 100)
 * 
 * Response: { category: {...}, products: [...], pagination: {...} }
 */
router.get('/category/:categoryId', productController.getProductsByCategory);

// ---------------------------------------------------------------------------
// Variant routes (admin only)
// ---------------------------------------------------------------------------

/**
 * POST /api/products/:id/variants
 * Add a color variant to a product
 * Body: { color_name, color_hex, price_delta, stock, is_default, sort_order }
 */
router.post('/:id/variants', verifyToken, verifyAdmin, productController.createVariant);

/**
 * PUT /api/products/:id/variants/:variantId
 * Update a color variant
 */
router.put('/:id/variants/:variantId', verifyToken, verifyAdmin, productController.updateVariant);

/**
 * DELETE /api/products/:id/variants/:variantId
 * Delete a color variant (cascades to its images)
 */
router.delete('/:id/variants/:variantId', verifyToken, verifyAdmin, productController.deleteVariant);

// ---------------------------------------------------------------------------
// Image routes (admin only)
// ---------------------------------------------------------------------------

/**
 * POST /api/products/:id/images
 * Add an image to a product
 * Body: { url, alt_text, sort_order, variant_id (optional) }
 */
router.post('/:id/images', verifyToken, verifyAdmin, productController.addImage);

/**
 * DELETE /api/products/:id/images/:imageId
 * Remove an image from a product
 */
router.delete('/:id/images/:imageId', verifyToken, verifyAdmin, productController.deleteImage);

module.exports = router;
