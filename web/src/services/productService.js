import api from './api';

/**
 * Product Service
 * API calls for product listing, searching, filtering
 */

export const productService = {
  /**
   * List products with filters
   */
  listProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  /**
   * Get single product
   */
  getProduct: async (productId) => {
    const response = await api.get(`/products/${productId}`);
    return response.data;
  },

  /**
   * Search products
   */
  search: async (query, params = {}) => {
    const response = await api.get('/products', {
      params: { search: query, ...params }
    });
    return response.data;
  },

  /**
   * Get products by category
   */
  getByCategory: async (categoryId, params = {}) => {
    const response = await api.get(`/products/category/${categoryId}`, {
      params
    });
    return response.data;
  },

  /**
   * Get all categories
   */
  getCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  /**
   * Get single category
   */
  getCategory: async (categoryId) => {
    const response = await api.get(`/categories/${categoryId}`);
    return response.data;
  }
};
