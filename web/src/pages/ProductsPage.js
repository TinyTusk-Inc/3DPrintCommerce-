import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productService } from '../services/productService';

function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category_id: searchParams.get('category_id') || '',
    price_min: searchParams.get('price_min') || '',
    price_max: searchParams.get('price_max') || '',
    sort: searchParams.get('sort') || 'newest',
    page: parseInt(searchParams.get('page')) || 1
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.listProducts(filters);
      setProducts(data.products || []);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await productService.getCategories();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Filters will auto-update due to useEffect
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category_id: '',
      price_min: '',
      price_max: '',
      sort: 'newest',
      page: 1
    });
    setSearchParams({});
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '20px' }}>
      {/* Sidebar */}
      <aside>
        <div className="card">
          <h3 className="card-title">Filters</h3>

          {/* Search */}
          <form onSubmit={handleSearch} className="form-group">
            <input
              type="text"
              name="search"
              placeholder="Search products..."
              value={filters.search}
              onChange={handleFilterChange}
              className="form-input"
            />
          </form>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              name="category_id"
              value={filters.category_id}
              onChange={handleFilterChange}
              className="form-select"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div className="form-group">
            <label className="form-label">Min Price</label>
            <input
              type="number"
              name="price_min"
              placeholder="Min"
              value={filters.price_min}
              onChange={handleFilterChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Max Price</label>
            <input
              type="number"
              name="price_max"
              placeholder="Max"
              value={filters.price_max}
              onChange={handleFilterChange}
              className="form-input"
            />
          </div>

          {/* Sort */}
          <div className="form-group">
            <label className="form-label">Sort</label>
            <select
              name="sort"
              value={filters.sort}
              onChange={handleFilterChange}
              className="form-select"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          <button
            onClick={resetFilters}
            className="btn btn-secondary btn-block"
          >
            Reset Filters
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main>
        <h1 className="card-title">Products</h1>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            Loading...
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        {!loading && products.length === 0 && (
          <div className="card">
            <p>No products found</p>
          </div>
        )}

        {!loading && products.length > 0 && (
          <>
            <p className="text-muted mb-3">
              Showing {products.length} product{products.length !== 1 ? 's' : ''}
            </p>

            <div className="grid grid-3">
              {products.map(product => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="product-card">
                    <div className="product-image">
                      {product.image_urls?.[0] ? (
                        <img src={product.image_urls[0]} alt={product.name} />
                      ) : (
                        'No image'
                      )}
                    </div>
                    <div className="product-info">
                      <div className="product-name">{product.name}</div>
                      <div className="product-price">₹{product.price.toFixed(2)}</div>
                      <div className={`product-stock ${product.quantity_in_stock > 10 ? 'stock-ok' : 'stock-low'}`}>
                        {product.quantity_in_stock > 0
                          ? `${product.quantity_in_stock} in stock`
                          : 'Out of stock'}
                      </div>
                      {product.review_count > 0 && (
                        <div className="text-muted" style={{ fontSize: '12px' }}>
                          ⭐ {product.rating?.toFixed(1)} ({product.review_count} reviews)
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default ProductsPage;
