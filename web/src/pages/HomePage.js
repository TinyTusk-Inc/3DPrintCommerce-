import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../services/productService';

function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        productService.listProducts({ limit: 8 }),
        productService.getCategories()
      ]);
      
      setFeaturedProducts(productsData.products || []);
      setCategories(categoriesData.categories || []);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading...
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '60px 20px'
      }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
          Welcome to 3D Print Commerce
        </h1>
        <p style={{ fontSize: '18px', marginBottom: '30px' }}>
          Browse and purchase high-quality 3D printing materials and supplies
        </p>
        <Link to="/products" className="btn btn-primary" style={{ fontSize: '16px', padding: '12px 30px' }}>
          Shop Now
        </Link>
      </div>

      {/* Categories Section */}
      <section style={{ marginTop: '40px' }}>
        <h2 className="card-title">Categories</h2>
        <div className="grid grid-4">
          {categories.map(category => (
            <Link
              key={category.id}
              to={`/products?category_id=${category.id}`}
              className="card"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.3s'
              }}
            >
              <h3 style={{ marginBottom: '5px' }}>{category.name}</h3>
              <p className="text-muted">
                {category.product_count || 0} products
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products Section */}
      <section style={{ marginTop: '40px' }}>
        <h2 className="card-title">Featured Products</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        
        <div className="grid grid-4">
          {featuredProducts.map(product => (
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
                  <div className="product-price">₹{product.price}</div>
                  <div className={`product-stock ${product.quantity_in_stock > 10 ? 'stock-ok' : 'stock-low'}`}>
                    {product.quantity_in_stock > 0
                      ? `${product.quantity_in_stock} in stock`
                      : 'Out of stock'}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
