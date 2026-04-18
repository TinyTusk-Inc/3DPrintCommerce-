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
      const user_id = req.user.id;

      // Validate inputs
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: 'Items array is required and cannot be empty'
        });
      }

      if (!shipping_address || !shipping_address.name || !shipping_address.email || !shipping_address.phone) {
        return res.status(400).json({
          error: 'Complete shipping address is required (name, email, phone, street, city, state, zip, country)'
        });
      }

      // Validate items and calculate total
      let total_price = 0;
      const validatedItems = [];

      for (const item of items) {
        if (!item.product_id || !item.quantity || item.quantity < 1) {
          return res.status(400).json({
            error: 'Each item must have product_id and quantity >= 1'
          });
        }

        // Get product details
        const product = await Product.findById(item.product_id);
        if (!product) {
          return res.status(404).json({
            error: `Product ${item.product_id} not found`
          });
        }

        // Check stock
        if (product.quantity_in_stock < item.quantity) {
          return res.status(400).json({
            error: `Product "${product.name}" only has ${product.quantity_in_stock} in stock, but ${item.quantity} requested`
          });
        }

        // Calculate line total
        const line_total = product.price * item.quantity;
        total_price += line_total;

        validatedItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_purchase: product.price,
          product
        });
      }

      // Prevent free orders
      if (total_price <= 0) {
        return res.status(400).json({
          error: 'Order total must be greater than 0'
        });
      }

      // Create Razorpay order ID (we'll integrate with Razorpay API later)
      // For now, generate a unique order ID
      const razorpay_order_id = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create order in database
      const order = await Order.create({
        user_id,
        seller_id: validatedItems[0].product.seller_id, // Could be multi-seller, simplified for now
        status: 'pending',
        total_price,
        razorpay_order_id,
        shipping_address
      });

      // Create order items
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

      // Return order with items
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
      const user_id = req.user.id;

      // Validate ID format
      if (!id || id.length < 36) {
        return res.status(400).json({
          error: 'Invalid order ID format'
        });
      }

      // Get order
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          error: 'Order not found'
        });
      }

      // Check authorization (user can only see their own orders, admin can see all)
      if (order.user_id !== user_id && req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Not authorized to view this order'
        });
      }

      // Get order items
      const items = await OrderItem.listByOrder(order.id);

      return res.status(200).json({
        order: {
          ...order,
          items,
          item_count: items.length,
          shipping_address: JSON.parse(order.shipping_address || 'null')
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
      const user_id = req.user.id;
      const user_role = req.user.role;

      // Get order
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          error: 'Order not found'
        });
      }

      // Check authorization
      if (order.user_id !== user_id && user_role !== 'admin') {
        return res.status(403).json({
          error: 'Not authorized to cancel this order'
        });
      }

      // Check if order can be cancelled (only pending orders)
      if (order.status !== 'pending' && order.status !== 'paid') {
        return res.status(400).json({
          error: `Cannot cancel order with status: ${order.status}`
        });
      }

      // Update status to cancelled
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

      // --- Signature verification (HMAC-SHA256) ---
      if (razorpay_webhook_secret) {
        if (!razorpay_signature) {
          return res.status(400).json({ error: 'Missing webhook signature' });
        }
        // req.rawBody must be set by express.json({ verify: ... }) — see index.js
        const rawBody = req.rawBody;
        if (!rawBody) {
          console.error('[webhook] rawBody not available — ensure express.json verify hook is configured');
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
        console.warn('[webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping signature verification (unsafe in production)');
      }

      const { event, payload } = req.body;

      // --- Payment success events ---
      if (event === 'payment.authorized' || event === 'payment.captured') {
        const payment = payload.payload.payment.entity;
        const razorpay_order_id = payment.order_id;
        const razorpay_payment_id = payment.id;
        const amount = payment.amount / 100; // paise → rupees

        // Find order
        const order = await Order.findByRazorpayOrderId(razorpay_order_id);
        if (!order) {
          return res.status(404).json({ error: 'Order not found for this payment' });
        }

        // Idempotency: already paid
        if (order.status === 'paid') {
          return res.status(200).json({ message: 'Already processed' });
        }

        // Verify amount
        if (Math.abs(order.total_price - amount) > 0.01) {
          console.error('[webhook] Amount mismatch for order:', razorpay_order_id);
          return res.status(400).json({ error: 'Payment amount does not match order total' });
        }

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
