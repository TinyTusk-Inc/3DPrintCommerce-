import api from './api';

/**
 * Admin Service
 * API calls for admin dashboard, inventory, fulfillment
 */

export const adminService = {
  /**
   * Get dashboard overview
   */
  getDashboard: async () => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  /**
   * Get inventory listing
   */
  getInventory: async (params = {}) => {
    const response = await api.get('/admin/inventory', { params });
    return response.data;
  },

  /**
   * Get low stock alert
   */
  getLowStock: async (params = {}) => {
    const response = await api.get('/admin/inventory/low-stock', { params });
    return response.data;
  },

  /**
   * Adjust inventory
   */
  adjustInventory: async (productId, action, quantity, reason) => {
    const response = await api.post(`/admin/inventory/${productId}/adjust`, {
      action,
      quantity,
      reason
    });
    return response.data;
  },

  /**
   * Get inventory logs for product
   */
  getInventoryLogs: async (productId, params = {}) => {
    const response = await api.get(`/admin/inventory/${productId}/logs`, {
      params
    });
    return response.data;
  },

  /**
   * Get fulfillment queue
   */
  getFulfillmentQueue: async (params = {}) => {
    const response = await api.get('/admin/fulfillment', { params });
    return response.data;
  },

  /**
   * Get fulfillment metrics
   */
  getFulfillmentMetrics: async () => {
    const response = await api.get('/admin/fulfillment/metrics');
    return response.data;
  },

  /**
   * Update order fulfillment status
   */
  updateFulfillmentStatus: async (orderId, status, trackingNumber, notes) => {
    const response = await api.put(`/admin/fulfillment/${orderId}`, {
      status,
      tracking_number: trackingNumber,
      notes
    });
    return response.data;
  },

  // ---------------------------------------------------------------------------
  // Product management
  // ---------------------------------------------------------------------------

  createProduct: async (data) => {
    const response = await api.post('/products', data);
    return response.data;
  },

  updateProduct: async (productId, data) => {
    const response = await api.put(`/products/${productId}`, data);
    return response.data;
  },

  deleteProduct: async (productId) => {
    const response = await api.delete(`/products/${productId}`);
    return response.data;
  },

  // ---------------------------------------------------------------------------
  // Variant management
  // ---------------------------------------------------------------------------

  createVariant: async (productId, data) => {
    const response = await api.post(`/products/${productId}/variants`, data);
    return response.data;
  },

  updateVariant: async (productId, variantId, data) => {
    const response = await api.put(`/products/${productId}/variants/${variantId}`, data);
    return response.data;
  },

  deleteVariant: async (productId, variantId) => {
    const response = await api.delete(`/products/${productId}/variants/${variantId}`);
    return response.data;
  },

  // ---------------------------------------------------------------------------
  // Image management
  // ---------------------------------------------------------------------------

  addProductImage: async (productId, data) => {
    const response = await api.post(`/products/${productId}/images`, data);
    return response.data;
  },

  deleteProductImage: async (productId, imageId) => {
    const response = await api.delete(`/products/${productId}/images/${imageId}`);
    return response.data;
  }
};
