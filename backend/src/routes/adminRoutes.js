/**
 * Admin Routes
 * Inventory management and order fulfillment tracking
 * All routes require admin authentication
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// All admin routes require authentication and admin role
router.use(verifyToken, verifyAdmin);

/**
 * Dashboard
 */

/**
 * GET /api/admin/dashboard
 * High-level dashboard overview with key metrics
 * 
 * Response: { dashboard: { products: {...}, orders: {...}, revenue: {...} } }
 */
router.get('/dashboard', adminController.getDashboardOverview);

/**
 * Inventory Management Routes
 */

/**
 * GET /api/admin/inventory
 * List all products with stock levels
 * 
 * Query parameters:
 * - sort: by_name, by_stock_asc (default), by_stock_desc
 * - category_id (optional): filter by category
 * - low_stock_only (optional): "true" to show only low stock items
 * - page (default: 1)
 * - limit (default: 50, max: 100)
 * 
 * Response: { inventory: [...], pagination: {...}, filters: {...} }
 */
router.get('/inventory', adminController.getInventory);

/**
 * GET /api/admin/inventory/low-stock
 * Get products below stock threshold
 * 
 * Query parameters:
 * - threshold (default: 10): stock level threshold
 * - page (default: 1)
 * - limit (default: 50, max: 100)
 * 
 * Response: { low_stock_products: [...], threshold: 10, pagination: {...} }
 */
router.get('/inventory/low-stock', adminController.getLowStockAlert);

/**
 * POST /api/admin/inventory/:id/adjust
 * Adjust product stock (add or remove)
 * Creates audit log for change
 * 
 * Parameters:
 * - id: product UUID
 * 
 * Request body:
 * {
 *   "action": "add" | "remove",
 *   "quantity": 10,
 *   "reason": "Restock from supplier" | "Damage during transport" | etc
 * }
 * 
 * Response: { product: {...}, action: "add", reason: "...", message: "..." }
 */
router.post('/inventory/:id/adjust', adminController.adjustInventory);

/**
 * GET /api/admin/inventory/:id/logs
 * Get inventory change history for a product
 * 
 * Parameters:
 * - id: product UUID
 * 
 * Query parameters:
 * - action (optional): filter by action (add, remove, sold)
 * - page (default: 1)
 * - limit (default: 50, max: 100)
 * 
 * Response: { product: {...}, logs: [...], pagination: {...} }
 */
router.get('/inventory/:id/logs', adminController.getInventoryLogs);

/**
 * Order Fulfillment Routes
 */

/**
 * GET /api/admin/fulfillment
 * Get fulfillment queue - orders ready to ship
 * 
 * Query parameters:
 * - status (optional): filter by status (pending, paid, shipped)
 *   Default: shows paid and shipped orders
 * - sort (default: by_date): by_date, by_total, by_items
 * - page (default: 1)
 * - limit (default: 50, max: 100)
 * 
 * Response: { fulfillment_queue: [...], pagination: {...}, status_filter: "..." }
 */
router.get('/fulfillment', adminController.getFulfillmentQueue);

/**
 * GET /api/admin/fulfillment/metrics
 * Get fulfillment performance metrics
 * 
 * Response: { metrics: { orders: {...}, fulfillment: {...}, revenue: {...} } }
 */
router.get('/fulfillment/metrics', adminController.getFulfillmentMetrics);

/**
 * PUT /api/admin/fulfillment/:id
 * Update order fulfillment status
 * Transition: paid → shipped → delivered
 * 
 * Parameters:
 * - id: order UUID
 * 
 * Request body:
 * {
 *   "status": "shipped" | "delivered" | "cancelled",
 *   "tracking_number": "TRK123456" (optional, for shipped status),
 *   "notes": "Shipped via FedEx" (optional)
 * }
 * 
 * Response: { order: {...}, message: "...", tracking_number: "..." (optional) }
 */
router.put('/fulfillment/:id', adminController.updateFulfillmentStatus);

module.exports = router;
