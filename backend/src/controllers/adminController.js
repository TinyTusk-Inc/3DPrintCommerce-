/**
 * Admin Controller
 * Handles inventory management and order fulfillment tracking
 */

const Product = require('../models/Product');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const InventoryLog = require('../models/InventoryLog');
const Category = require('../models/Category');

class AdminController {
  /**
   * Dashboard Overview
   * GET /api/admin/dashboard
   * High-level metrics for admin dashboard
   */
  static async getDashboardOverview(req, res) {
    try {
      // Get key metrics
      const totalProducts = await Product.listAll(1000, 0);
      const totalOrders = await Order.count();
      const pendingOrders = await Order.listByStatus('pending', 1000, 0);
      const paidOrders = await Order.listByStatus('paid', 1000, 0);
      const shippedOrders = await Order.listByStatus('shipped', 1000, 0);
      const deliveredOrders = await Order.listByStatus('delivered', 1000, 0);

      // Calculate revenue
      const completedOrders = [...paidOrders, ...shippedOrders, ...deliveredOrders];
      const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total_price, 0);
      const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

      // Low stock alert
      const allProducts = await Product.listAll(1000, 0);
      const lowStockCount = allProducts.filter(p => p.quantity_in_stock < 10).length;

      return res.status(200).json({
        dashboard: {
          products: {
            total: totalProducts.length,
            low_stock: lowStockCount
          },
          orders: {
            total: totalOrders,
            pending: pendingOrders.length,
            paid: paidOrders.length,
            shipped: shippedOrders.length,
            delivered: deliveredOrders.length
          },
          revenue: {
            total: totalRevenue,
            average_order_value: avgOrderValue,
            completed_orders: completedOrders.length
          }
        }
      });
    } catch (error) {
      console.error('Error getting dashboard overview:', error);
      return res.status(500).json({
        error: 'Failed to retrieve dashboard',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Inventory Management
   * GET /api/admin/inventory
   * List all products with stock levels
   * 
   * Query params:
   * - sort: by_name, by_stock_asc, by_stock_desc (default: by_stock_asc)
   * - category_id: filter by category
   * - low_stock_only: true (show only items below threshold)
   * - page, limit
   */
  static async getInventory(req, res) {
    try {
      const { sort = 'by_stock_asc', category_id, low_stock_only = false, page = 1, limit = 50 } = req.query;

      // Pagination safety
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      // Get all products
      let products = await Product.listAll(1000, 0);

      // Filter by category if specified
      if (category_id) {
        products = products.filter(p => p.category_id === category_id);
      }

      // Filter low stock only
      if (low_stock_only === 'true' || low_stock_only === true) {
        products = products.filter(p => p.quantity_in_stock < 10);
      }

      // Sort
      switch (sort) {
        case 'by_name':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'by_stock_desc':
          products.sort((a, b) => b.quantity_in_stock - a.quantity_in_stock);
          break;
        case 'by_stock_asc':
        default:
          products.sort((a, b) => a.quantity_in_stock - b.quantity_in_stock);
          break;
      }

      // Apply pagination
      const total = products.length;
      const paginatedProducts = products.slice(offset, offset + limitNum);

      // Enhance with additional info
      const enhancedProducts = await Promise.all(
        paginatedProducts.map(async (product) => {
          const inventoryLogs = await InventoryLog.listByProduct(product.id, 10, 0);
          const summary = await InventoryLog.getSummary(product.id);
          return {
            ...product,
            reorder_status: product.quantity_in_stock < 10 ? 'low' : product.quantity_in_stock < 20 ? 'medium' : 'ok',
            recent_activity: inventoryLogs.length > 0 ? inventoryLogs[0].created_at : null,
            inventory_summary: summary
          };
        })
      );

      return res.status(200).json({
        inventory: enhancedProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        },
        filters: {
          sort,
          category_id: category_id || null,
          low_stock_only: low_stock_only === 'true' || low_stock_only === true
        }
      });
    } catch (error) {
      console.error('Error getting inventory:', error);
      return res.status(500).json({
        error: 'Failed to retrieve inventory',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Low Stock Alert
   * GET /api/admin/inventory/low-stock
   * Get products below stock threshold
   */
  static async getLowStockAlert(req, res) {
    try {
      const { threshold = 10, page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;
      const thresholdNum = Math.max(1, parseInt(threshold, 10) || 10);

      // Get low stock products
      let lowStockProducts = await Product.listAll(1000, 0);
      lowStockProducts = lowStockProducts.filter(p => p.quantity_in_stock < thresholdNum);
      lowStockProducts.sort((a, b) => a.quantity_in_stock - b.quantity_in_stock);

      const total = lowStockProducts.length;
      const paginatedProducts = lowStockProducts.slice(offset, offset + limitNum);

      // Enhance with category info
      const enhanced = await Promise.all(
        paginatedProducts.map(async (product) => {
          const category = await Category.findById(product.category_id);
          return {
            ...product,
            category_name: category ? category.name : 'Unknown',
            reorder_amount: Math.max(25, Math.ceil(thresholdNum * 3)) // Suggest reorder for 3x threshold
          };
        })
      );

      return res.status(200).json({
        low_stock_products: enhanced,
        threshold: thresholdNum,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error getting low stock alert:', error);
      return res.status(500).json({
        error: 'Failed to retrieve low stock products',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Adjust Inventory
   * POST /api/admin/inventory/:id/adjust
   * Add or remove stock (creates audit log)
   * 
   * Request body:
   * {
   *   "action": "add" | "remove",
   *   "quantity": 10,
   *   "reason": "Restock from supplier" | "Damage found" | etc
   * }
   */
  static async adjustInventory(req, res) {
    try {
      const { id } = req.params;
      const { action, quantity, reason } = req.body;

      // Validate inputs
      if (!action || !['add', 'remove'].includes(action)) {
        return res.status(400).json({
          error: 'Action must be "add" or "remove"'
        });
      }

      if (!quantity || quantity < 1 || !Number.isInteger(Number(quantity))) {
        return res.status(400).json({
          error: 'Quantity must be a positive integer'
        });
      }

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          error: 'Reason is required'
        });
      }

      // Get product
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          error: 'Product not found'
        });
      }

      // Validate remove doesn't go negative
      if (action === 'remove' && product.quantity_in_stock < quantity) {
        return res.status(400).json({
          error: `Cannot remove ${quantity} items. Only ${product.quantity_in_stock} in stock.`
        });
      }

      // Update product stock
      const newStock = action === 'add' 
        ? product.quantity_in_stock + parseInt(quantity, 10)
        : product.quantity_in_stock - parseInt(quantity, 10);

      const updatedProduct = await Product.update(id, { quantity_in_stock: newStock });

      // Create inventory log (use negative for removals)
      const quantityDelta = action === 'add' ? quantity : -quantity;
      await InventoryLog.create({
        product_id: id,
        action,
        quantity_delta: quantityDelta,
        reason: reason.trim()
      });

      return res.status(200).json({
        product: {
          id: updatedProduct.id,
          name: updatedProduct.name,
          old_stock: product.quantity_in_stock,
          new_stock: updatedProduct.quantity_in_stock,
          change: action === 'add' ? `+${quantity}` : `-${quantity}`
        },
        action,
        reason,
        message: `Inventory adjusted successfully`
      });
    } catch (error) {
      console.error('Error adjusting inventory:', error);
      return res.status(500).json({
        error: 'Failed to adjust inventory',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Inventory Logs
   * GET /api/admin/inventory/:id/logs
   * Get change history for a product
   */
  static async getInventoryLogs(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50, action } = req.query;

      // Validate product exists
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({
          error: 'Product not found'
        });
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      // Get logs (filtered by action if specified)
      let logs = action
        ? await InventoryLog.listByAction(action, 500, 0)
        : await InventoryLog.listByProduct(id, 500, 0);

      logs = logs.filter(log => log.product_id === id);

      const total = logs.length;
      const paginatedLogs = logs.slice(offset, offset + limitNum);

      return res.status(200).json({
        product: {
          id: product.id,
          name: product.name,
          current_stock: product.quantity_in_stock
        },
        logs: paginatedLogs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });
    } catch (error) {
      console.error('Error getting inventory logs:', error);
      return res.status(500).json({
        error: 'Failed to retrieve inventory logs',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Fulfillment Queue
   * GET /api/admin/fulfillment
   * Get orders pending fulfillment
   * 
   * Query params:
   * - status: pending, paid, shipped (default: paid, shipped)
   * - sort: by_date, by_total, by_items (default: by_date)
   * - page, limit
   */
  static async getFulfillmentQueue(req, res) {
    try {
      const { status, sort = 'by_date', page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const offset = (pageNum - 1) * limitNum;

      // Get orders by status
      let orders = [];
      if (status) {
        orders = await Order.listByStatus(status, 1000, 0);
      } else {
        // Default: paid and shipped orders
        const paid = await Order.listByStatus('paid', 500, 0);
        const shipped = await Order.listByStatus('shipped', 500, 0);
        orders = [...paid, ...shipped];
      }

      // Sort
      switch (sort) {
        case 'by_total':
          orders.sort((a, b) => b.total_price - a.total_price);
          break;
        case 'by_items':
          // Will sort by item count after enhancement
          break;
        case 'by_date':
        default:
          orders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          break;
      }

      const total = orders.length;
      const paginatedOrders = orders.slice(offset, offset + limitNum);

      // Enhance with items
      const enhancedOrders = await Promise.all(
        paginatedOrders.map(async (order) => {
          const items = await OrderItem.listByOrder(order.id);
          return {
            ...order,
            item_count: items.length,
            items: items.map(item => ({
              product_name: item.product_name,
              quantity: item.quantity,
              price: item.price_at_purchase
            }))
          };
        })
      );

      // Re-sort by item count if needed
      if (sort === 'by_items') {
        enhancedOrders.sort((a, b) => b.item_count - a.item_count);
      }

      return res.status(200).json({
        fulfillment_queue: enhancedOrders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        },
        status_filter: status || 'paid, shipped'
      });
    } catch (error) {
      console.error('Error getting fulfillment queue:', error);
      return res.status(500).json({
        error: 'Failed to retrieve fulfillment queue',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Order Status Updates
   * PUT /api/admin/fulfillment/:id
   * Update order status with tracking info
   * 
   * Request body:
   * {
   *   "status": "shipped" | "delivered",
   *   "tracking_number": "TRK123456" (optional for shipped),
   *   "notes": "Shipped via FedEx" (optional)
   * }
   */
  static async updateFulfillmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, tracking_number, notes } = req.body;

      // Validate inputs
      if (!status || !['shipped', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({
          error: 'Status must be "shipped", "delivered", or "cancelled"'
        });
      }

      // Get current order
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          error: 'Order not found'
        });
      }

      // Validate status transitions
      const allowedTransitions = {
        'pending': ['paid', 'cancelled'],
        'paid': ['shipped', 'cancelled'],
        'shipped': ['delivered'],
        'delivered': [],
        'cancelled': []
      };

      if (!allowedTransitions[order.status].includes(status)) {
        return res.status(400).json({
          error: `Cannot transition from ${order.status} to ${status}`
        });
      }

      // Update order status
      const updatedOrder = await Order.updateStatus(id, status);

      const response = {
        order: {
          id: updatedOrder.id,
          status: updatedOrder.status,
          old_status: order.status,
          total_price: updatedOrder.total_price,
          updated_at: updatedOrder.updated_at
        },
        message: `Order status updated to ${status}`
      };

      if (tracking_number) {
        response.tracking_number = tracking_number;
        response.message += ` with tracking: ${tracking_number}`;
      }

      if (notes) {
        response.notes = notes;
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error updating fulfillment status:', error);
      return res.status(500).json({
        error: 'Failed to update fulfillment status',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Fulfillment Metrics
   * GET /api/admin/fulfillment/metrics
   * Get fulfillment performance metrics
   */
  static async getFulfillmentMetrics(req, res) {
    try {
      const pending = await Order.listByStatus('pending', 1000, 0);
      const paid = await Order.listByStatus('paid', 1000, 0);
      const shipped = await Order.listByStatus('shipped', 1000, 0);
      const delivered = await Order.listByStatus('delivered', 1000, 0);
      const cancelled = await Order.listByStatus('cancelled', 1000, 0);

      // Calculate average fulfillment time (simplified - shipped to delivered)
      let avgFulfillmentDays = 0;
      if (delivered.length > 0) {
        const totalDays = delivered.reduce((sum, order) => {
          // Would need created_at and updated_at to calculate properly
          return sum;
        }, 0);
        avgFulfillmentDays = delivered.length > 0 ? totalDays / delivered.length : 0;
      }

      // Calculate fulfillment rate
      const totalCompleted = delivered.length;
      const totalOrders = pending.length + paid.length + shipped.length + delivered.length + cancelled.length;
      const fulfillmentRate = totalOrders > 0 ? (totalCompleted / totalOrders) * 100 : 0;

      return res.status(200).json({
        metrics: {
          orders: {
            pending: pending.length,
            paid: paid.length,
            shipped: shipped.length,
            delivered: delivered.length,
            cancelled: cancelled.length,
            total: totalOrders
          },
          fulfillment: {
            rate: fulfillmentRate.toFixed(2) + '%',
            completed: totalCompleted,
            in_progress: shipped.length,
            pending: paid.length
          },
          revenue: {
            from_delivered: delivered.reduce((sum, o) => sum + o.total_price, 0),
            from_shipped: shipped.reduce((sum, o) => sum + o.total_price, 0),
            pending_payment: paid.reduce((sum, o) => sum + o.total_price, 0)
          }
        }
      });
    } catch (error) {
      console.error('Error getting fulfillment metrics:', error);
      return res.status(500).json({
        error: 'Failed to retrieve fulfillment metrics',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = AdminController;
