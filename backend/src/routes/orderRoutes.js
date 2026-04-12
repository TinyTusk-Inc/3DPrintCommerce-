/**
 * Order Routes
 * Shopping cart checkout, order management, and payment webhook
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

/**
 * Admin Routes (must come before :id routes)
 */

/**
 * GET /api/orders/admin/stats
 * Get order statistics and revenue (admin only)
 * 
 * Response: { stats: { total_orders, by_status: {...}, total_revenue, average_order_value } }
 */
router.get('/admin/stats', verifyToken, verifyAdmin, orderController.getOrderStats);

/**
 * Webhook Routes
 */

/**
 * POST /api/orders/webhook/razorpay
 * Razorpay payment webhook - public but signature verified
 * Called by Razorpay when payment is authorized/captured/failed
 * 
 * No authentication required (Razorpay signature verified in controller)
 */
router.post('/webhook/razorpay', orderController.handleRazorpayWebhook);

/**
 * Protected Routes
 * Require authentication
 */

/**
 * POST /api/orders
 * Create new order from cart items
 * 
 * Request body:
 * {
 *   "items": [
 *     { "product_id": "uuid", "quantity": 2 },
 *     { "product_id": "uuid", "quantity": 1 }
 *   ],
 *   "shipping_address": {
 *     "name": "John Doe",
 *     "email": "john@example.com",
 *     "phone": "+1234567890",
 *     "street": "123 Main St",
 *     "city": "New York",
 *     "state": "NY",
 *     "zip": "10001",
 *     "country": "USA"
 *   }
 * }
 * 
 * Response: { order: {...}, message: "Order created. Proceed to payment." }
 */
router.post('/', verifyToken, orderController.createOrder);

/**
 * GET /api/orders
 * List authenticated user's orders
 * 
 * Query parameters:
 * - page (default: 1)
 * - limit (default: 20, max: 50)
 * - status (optional) - filter by status: pending, paid, shipped, delivered, cancelled
 * 
 * Response: { orders: [...], pagination: {...} }
 */
router.get('/', verifyToken, orderController.listUserOrders);

/**
 * GET /api/orders/:id
 * Get single order detail with items
 * Users can only view their own orders, admins can view any order
 * 
 * Response: { order: { ..., items: [...], item_count: 5, shipping_address: {...} } }
 */
router.get('/:id', verifyToken, orderController.getOrderDetail);

/**
 * PUT /api/orders/:id
 * Update order status (admin only)
 * 
 * Valid status transitions:
 * - pending → paid → shipped → delivered
 * - Any status → cancelled
 * 
 * Request body:
 * { "status": "paid" | "shipped" | "delivered" | "cancelled" }
 * 
 * Response: { order: {...}, message: "Order status updated to..." }
 */
router.put('/:id', verifyToken, verifyAdmin, orderController.updateOrderStatus);

/**
 * POST /api/orders/:id/cancel
 * Cancel order
 * Users can cancel their own pending/paid orders, admins can cancel any pending/paid order
 * 
 * Response: { order: {...}, message: "Order cancelled successfully" }
 */
router.post('/:id/cancel', verifyToken, orderController.cancelOrder);

module.exports = router;
