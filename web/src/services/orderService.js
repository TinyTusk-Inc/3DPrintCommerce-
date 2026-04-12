import api from './api';

/**
 * Order Service
 * API calls for orders, checkout, payment
 */

export const orderService = {
  /**
   * Create order from cart
   */
  createOrder: async (items, shippingAddress) => {
    const response = await api.post('/orders', {
      items,
      shipping_address: shippingAddress
    });
    return response.data;
  },

  /**
   * Get user's orders
   */
  getUserOrders: async (params = {}) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  /**
   * Get single order detail
   */
  getOrder: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * Cancel order
   */
  cancelOrder: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/cancel`);
    return response.data;
  }
};
