import api from './api';

const USE_FAKE = process.env.REACT_APP_USE_FAKE_API === 'true';

async function fetchFakeProducts() {
  const res = await fetch('https://fakestoreapi.com/products');
  const json = await res.json();
  return json;
}

function mapFakeToProduct(p) {
  return {
    id: String(p.id),
    name: p.title,
    price: Number(p.price),
    description: p.description,
    image_urls: p.image ? [p.image] : [],
    quantity_in_stock: Math.floor(Math.random() * 30),
    review_count: p.rating?.count || 0,
    rating: p.rating?.rate || 0,
    category: p.category
  };
}

/**
 * Product Service
 * API calls for product listing, searching, filtering
 */

export const productService = {
  /**
   * List products with filters
   */
  listProducts: async (params = {}) => {
    if (USE_FAKE) {
      const fake = await fetchFakeProducts();
      const products = (fake || []).slice(0, params.limit || 12).map(mapFakeToProduct);
      return { products };
    }
    const response = await api.get('/products', { params });
    return response.data;
  },

  // Alias used by AdminProductsPage
  getProducts: async (params = {}) => {
    if (USE_FAKE) {
      const fake = await fetchFakeProducts();
      const products = (fake || []).map(mapFakeToProduct);
      return { products };
    }
    const response = await api.get('/products', { params });
    return response.data;
  },

  /**
   * Get single product
   */
  getProduct: async (productId) => {
    if (USE_FAKE) {
      const fake = await fetch(`https://fakestoreapi.com/products/${productId}`).then(r => r.json());
      const product = mapFakeToProduct(fake);
      // Provide minimal reviews/stats shape
      return { product, reviews: [], stats: { average_rating: product.rating, review_count: product.review_count } };
    }
    const response = await api.get(`/products/${productId}`);
    return response.data;
  },

  /**
   * Search products
   */
  search: async (query, params = {}) => {
    if (USE_FAKE) {
      const fake = await fetchFakeProducts();
      const filtered = (fake || []).filter(p => p.title.toLowerCase().includes((query||'').toLowerCase())).map(mapFakeToProduct);
      return { products: filtered };
    }
    const response = await api.get('/products', {
      params: { search: query, ...params }
    });
    return response.data;
  },

  /**
   * Get products by category
   */
  getByCategory: async (categoryId, params = {}) => {
    if (USE_FAKE) {
      const fake = await fetchFakeProducts();
      const filtered = (fake || []).filter(p => p.category === categoryId).map(mapFakeToProduct);
      return { products: filtered };
    }
    const response = await api.get(`/products/category/${categoryId}`, {
      params
    });
    return response.data;
  },

  /**
   * Get all categories
   */
  getCategories: async () => {
    if (USE_FAKE) {
      const fake = await fetchFakeProducts();
      const cats = Array.from(new Set((fake || []).map(p => p.category)));
      const categories = cats.map((c, idx) => ({ id: c, name: c, product_count: (fake || []).filter(p => p.category === c).length }));
      return { categories };
    }
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
