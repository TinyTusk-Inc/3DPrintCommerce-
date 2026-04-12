/**
 * Category Routes
 * Product category management endpoints
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

/**
 * Public Routes
 * No authentication required
 */

/**
 * GET /api/categories
 * List all categories with product counts
 * 
 * Response: { categories: [...] }
 */
router.get('/', categoryController.listCategories);

/**
 * GET /api/categories/:id
 * Get single category by ID
 * 
 * Response: { category: {...}, product_count: 10 }
 */
router.get('/:id', categoryController.getCategory);

/**
 * Admin Routes
 * Require authentication and admin role
 */

/**
 * POST /api/categories
 * Create new category (admin only)
 * 
 * Request body:
 * {
 *   "name": "Category Name",
 *   "description": "Optional description"
 * }
 * 
 * Response: { category: {...} }
 */
router.post('/', verifyToken, verifyAdmin, categoryController.createCategory);

/**
 * PUT /api/categories/:id
 * Update category (admin only)
 * 
 * Request body: (all fields optional)
 * {
 *   "name": "New Name",
 *   "description": "New description"
 * }
 * 
 * Response: { category: {...} }
 */
router.put('/:id', verifyToken, verifyAdmin, categoryController.updateCategory);

/**
 * DELETE /api/categories/:id
 * Delete category (admin only)
 * 
 * Note: Category must have no products (cascade delete not allowed)
 * 
 * Response: { message: "Category deleted successfully" }
 */
router.delete('/:id', verifyToken, verifyAdmin, categoryController.deleteCategory);

module.exports = router;
