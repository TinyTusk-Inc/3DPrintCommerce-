/**
 * Order Controller
 * Handles order creation, management, and payment processing
 */

const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const Product = require('../models/Product');
const User = require('../models/User');
const InventoryLog = require('../models/InventoryLog');
const emailService = require('../services/emailService');
const crypto = require('crypto');

class OrderController {
  /**
   * Create new order from cart items
   * POST /api/orders
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
   */
  static async createOrder(req, res) {
    try {
      const { items, shipping_address } = req.body;
      const user_id = req.user.userId || req.user.id;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required and cannot be empty' });
      }

      // Cap items array to prevent abuse
      if (items.length > 50) {
        return res.status(400).json({ error: 'Cannot order more than 50 distinct items at once' });
      }

      if (!shipping_address || !shipping_address.name || !shipping_address.phone ||
          !shipping_address.street || !shipping_address.city || !shipping_address.state) {
        return res.status(400).json({
          error: 'Complete shipping address is required (name, phone, street, city, state)'
        });
      }

      // Validate shipping address field lengths
      if (shipping_address.name.length > 255 || shipping_address.street.length > 500) {
        return res.status(400).json({ error: 'Shipping address fields exceed maximum length' });
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      let total_price = 0;
      const validatedItems = [];

      for (const item of items) {
        // Strict positive integer validation for quantity
        const qty = parseInt(item.quantity, 10);
        if (!item.product_id || !Number.isInteger(qty) || qty <= 0 || qty > 9999) {
          return res.status(400).json({ error: 'Each item must have a valid product_id and quantity (1–9999)' });
        }

        // Validate product_id is a UUID
        if (!uuidRegex.test(item.product_id)) {
          return res.status(400).json({ error: 'Invalid product_id format' });
        }

        const product = await Product.findById(item.product_id);
        if (!product) {
          return res.status(404).json({ error: `Product ${item.product_id} not found` });
        }

        if (product.quantity_in_stock < qty) {
          return res.status(400).json({
            error: `Product "${product.name}" only has ${product.quantity_in_stock} in stock, but ${qty} requested`
          });
        }

        total_price += product.price * qty;
        validatedItems.push({ product_id: item.product_id, quantity: qty, price_at_purchase: product.price, product });
      }

      if (total_price <= 0) {
        return res.status(400).json({ error: 'Order total must be greater than 0' });
      }

      const razorpay_order_id = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const order = await Order.create({
        user_id,
        seller_id: validatedItems[0].product.seller_id,
        status: 'pending',
        total_price,
        razorpay_order_id,
        shipping_address
      });

      const order_items = [];
      for (const item of validatedItems) {
        const order_item = await OrderItem.create({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_purchase: item.price_at_purchase
        });
        order_items.push(order_item);
      }

      return res.status(201).json({
        order: {
          id: order.id,
          razorpay_order_id: order.razorpay_order_id,
          status: order.status,
          total_price: order.total_price,
          items: order_items,
          shipping_address: order.shipping_address,
          created_at: order.created_at
        },
        message: 'Order created. Proceed to payment.'
      });
    } catch (error) {
      console.error('Error creating order:', error);
      return res.status(500).json({
        error: 'Failed to create order',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * List user's orders
   * GET /api/orders
   * 
   * Query parameters:
   * - page (default: 1)
   * - limit (default: 20, max: 50)
   * - status (optional) - filter by status (pending, paid, shipped, delivered, cancelled)
   */
  static async listUserOrders(req, res) {
    try {
      const user_id = req.user.id;
      const { page = 1, limit = 20, status } = req.query;

      // Pagination safety
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      // Get orders
      let orders = status 
        ? await Order.listByStatus(status, limitNum, offset)
        : await Order.listByUser(user_id, limitNum, offset);

      // Filter by user if status filter is used
      if (status) {
        orders = orders.filter(o => o.user_id === user_id);
      }

      // Enhance orders with items
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => ({
          ...order,
          items: await OrderItem.listByOrder(order.id),
          item_count: await OrderItem.countByOrder(order.id)
        }))
      );

      // Get total count for pagination
      const allUserOrders = await Order.listByUser(user_id, 1000, 0);
      const total = status 
        ? allUserOrders.filter(o => o.status === status).length 
        : allUserOrders.length;

      return res.status(200).json({
        orders: ordersWithItems,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error listing user orders:', error);
      return res.status(500).json({
        error: 'Failed to retrieve orders',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get single order detail
   * GET /api/orders/:id
   * 
   * Returns order with all items and product details
   */
  static async getOrderDetail(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.userId || req.user.id;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({ error: 'Invalid order ID format' });
      }

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // FIXED: was checking req.user.role which doesn't exist — use req.user.is_admin
      if (order.user_id !== user_id && !req.user.is_admin) {
        return res.status(403).json({ error: 'Not authorized to view this order' });
      }

      const items = await OrderItem.listByOrder(order.id);

      return res.status(200).json({
        order: {
          ...order,
          items,
          item_count: items.length,
          shipping_address: typeof order.shipping_address === 'string'
            ? JSON.parse(order.shipping_address)
            : order.shipping_address
        }
      });
    } catch (error) {
      console.error('Error getting order detail:', error);
      return res.status(500).json({
        error: 'Failed to retrieve order',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update order status
   * PUT /api/orders/:id
   * Admin only
   * 
   * Request body:
   * { "status": "paid" | "shipped" | "delivered" | "cancelled" }
   */
  static async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate inputs
      if (!status) {
        return res.status(400).json({
          error: 'Status is required'
        });
      }

      const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Get current order
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          error: 'Order not found'
        });
      }

      // Prevent status downgrades (except to cancelled)
      const statusOrder = { pending: 1, paid: 2, shipped: 3, delivered: 4 };
      if (status !== 'cancelled') {
        if (statusOrder[status] < statusOrder[order.status]) {
          return res.status(400).json({
            error: `Cannot change status from ${order.status} to ${status}`
          });
        }
      }

      // Update status
      const updatedOrder = await Order.updateStatus(id, status);

      // Send email notification for shipped/delivered/paid
      if (['paid', 'shipped', 'delivered'].includes(status)) {
        const buyer = await User.findById(updatedOrder.user_id || order.user_id);
        if (buyer?.email) {
          emailService
            .sendOrderStatusUpdate(updatedOrder, status, buyer.email)
            .catch((err) => console.error('[orderController] Failed to send status email:', err.message));
        }
      }

      return res.status(200).json({
        order: updatedOrder,
        message: `Order status updated to ${status}`
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      return res.status(500).json({
        error: 'Failed to update order status',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Cancel order
   * POST /api/orders/:id/cancel
   * User can cancel their own pending orders, admin can cancel any pending order
   */
  static async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const user_id = req.user.userId || req.user.id;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // FIXED: was checking req.user.role which doesn't exist — use req.user.is_admin
      if (order.user_id !== user_id && !req.user.is_admin) {
        return res.status(403).json({ error: 'Not authorized to cancel this order' });
      }

      if (order.status !== 'pending' && order.status !== 'paid') {
        return res.status(400).json({
          error: `Cannot cancel order with status: ${order.status}`
        });
      }

      const cancelledOrder = await Order.updateStatus(id, 'cancelled');

      return res.status(200).json({
        order: cancelledOrder,
        message: 'Order cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      return res.status(500).json({
        error: 'Failed to cancel order',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Handle Razorpay webhook
   * POST /api/orders/webhook/razorpay
   * Public endpoint but includes Razorpay signature verification
   * 
   * Webhook body:
   * {
   *   "event": "payment.authorized",
   *   "payload": {
   *     "payment": {
   *       "entity": {
   *         "id": "pay_xxxxx",
   *         "order_id": "order_xxxxx",
   *         "amount": 5000,
   *         "status": "authorized"
   *       }
   *     }
   *   }
   * }
   */
  static async handleRazorpayWebhook(req, res) {
    try {
      const razorpay_signature = req.headers['x-razorpay-signature'];
      const razorpay_webhook_secret = process.env.RAZORPAY_WEBHOOK_SECRET;

      // In production, webhook secret is mandatory
      if (!razorpay_webhook_secret && process.env.NODE_ENV === 'production') {
        console.error('[webhook] RAZORPAY_WEBHOOK_SECRET not set in production — rejecting all webhook calls');
        return res.status(500).json({ error: 'Webhook not configured' });
      }

      if (razorpay_webhook_secret) {
        if (!razorpay_signature) {
          return res.status(400).json({ error: 'Missing webhook signature' });
        }
        const rawBody = req.rawBody;
        if (!rawBody) {
          console.error('[webhook] rawBody not available');
          return res.status(500).json({ error: 'Server misconfiguration: rawBody unavailable' });
        }
        const expectedSig = crypto
          .createHmac('sha256', razorpay_webhook_secret)
          .update(rawBody)
          .digest('hex');

        if (expectedSig !== razorpay_signature) {
          console.warn('[webhook] Signature mismatch — rejecting request');
          return res.status(400).json({ error: 'Invalid webhook signature' });
        }
      } else {
        console.warn('[webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping verification (dev only)');
      }

      const { event, payload } = req.body;

      // --- Payment success events ---
      if (event === 'payment.authorized' || event === 'payment.captured') {
        const payment = payload.payload.payment.entity;
        const razorpay_order_id = payment.order_id;
        const razorpay_payment_id = payment.id;

        const order = await Order.findByRazorpayOrderId(razorpay_order_id);
        if (!order) {
          return res.status(404).json({ error: 'Order not found for this payment' });
        }

        if (order.status === 'paid') {
          return res.status(200).json({ message: 'Already processed' });
        }

        // Verify amount — compare in paise (integers) to avoid float precision issues
        const expectedPaise = Math.round(Number(order.total_price) * 100);
        if (payment.amount !== expectedPaise) {
          console.error('[webhook] Amount mismatch for order:', razorpay_order_id,
            `expected ${expectedPaise} paise, got ${payment.amount}`);
          return res.status(400).json({ error: 'Payment amount does not match order total' });
        }

        const amount = payment.amount / 100; // paise → rupees for DB storage

        // Mark order as paid
        const updatedOrder = await Order.updatePaymentInfo(order.id, razorpay_payment_id);

        // Decrement stock for each item and log inventory change
        const items = await OrderItem.listByOrder(order.id);
        for (const item of items) {
          await Product.decrementStock(item.product_id, item.quantity);
          await InventoryLog.create({
            product_id: item.product_id,
            action: 'sold',
            quantity_delta: -item.quantity,
            reason: `Order ${order.id}`
          });
        }

        // Send order confirmation email (fire-and-forget — don't block webhook response)
        const buyer = await User.findById(order.user_id);
        if (buyer?.email) {
          emailService
            .sendOrderConfirmation(updatedOrder, items, buyer.email)
            .catch((err) => console.error('[webhook] Failed to send confirmation email:', err.message));
        }

        return res.status(200).json({
          message: 'Payment processed successfully',
          order: updatedOrder
        });
      }

      // --- Payment failure ---
      if (event === 'payment.failed') {
        const payment = payload.payload.payment.entity;
        const razorpay_order_id = payment.order_id;
        const order = await Order.findByRazorpayOrderId(razorpay_order_id);
        if (order) {
          console.log('[webhook] Payment failed for order:', order.id);
        }
        return res.status(200).json({ message: 'Payment failure recorded' });
      }

      // Unknown event — acknowledge
      return res.status(200).json({ message: 'Webhook received' });
    } catch (error) {
      console.error('Error handling Razorpay webhook:', error);
      return res.status(500).json({
        error: 'Failed to process webhook',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get order statistics (admin only)
   * GET /api/orders/admin/stats
   */
  static async getOrderStats(req, res) {
    try {
      const total_orders = await Order.count();

      // Get orders by status
      const pending = await Order.listByStatus('pending', 1000, 0);
      const paid = await Order.listByStatus('paid', 1000, 0);
      const shipped = await Order.listByStatus('shipped', 1000, 0);
      const delivered = await Order.listByStatus('delivered', 1000, 0);

      // Calculate total revenue (paid + shipped + delivered orders)
      const completed_orders = [...paid, ...shipped, ...delivered];
      const total_revenue = completed_orders.reduce((sum, order) => sum + order.total_price, 0);

      return res.status(200).json({
        stats: {
          total_orders,
          by_status: {
            pending: pending.length,
            paid: paid.length,
            shipped: shipped.length,
            delivered: delivered.length
          },
          total_revenue,
          average_order_value: completed_orders.length > 0 ? total_revenue / completed_orders.length : 0
        }
      });
    } catch (error) {
      console.error('Error getting order stats:', error);
      return res.status(500).json({
        error: 'Failed to retrieve order statistics',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = OrderController;
