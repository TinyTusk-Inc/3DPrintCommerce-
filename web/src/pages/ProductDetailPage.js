import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productService } from '../services/productService';
import { useCart } from '../hooks/index';

function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const data = await productService.getProduct(productId);
      setProduct(data.product);
    } catch (err) {
      setError('Failed to load product');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (product) {
      addItem(product, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
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

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!product) {
    return <div className="alert alert-danger">Product not found</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
      {/* Product Image */}
      <div className="card">
        <div className="product-image" style={{ height: '400px' }}>
          {product.image_urls?.[0] ? (
            <img src={product.image_urls[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            'No image available'
          )}
        </div>
      </div>

      {/* Product Info */}
      <div>
        <h1 style={{ marginBottom: '10px' }}>{product.name}</h1>
        
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 className="product-price">₹{product.price.toFixed(2)}</h3>
          
          <div className="mb-3">
            <p className="text-muted">{product.description}</p>
          </div>

          <div className="mb-3">
            <strong>Stock Status:</strong>{' '}
            <span className={product.quantity_in_stock > 0 ? 'stock-ok' : 'stock-low'}>
              {product.quantity_in_stock > 0
                ? `${product.quantity_in_stock} in stock`
                : 'Out of stock'}
            </span>
          </div>

          {product.quantity_in_stock > 0 && (
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                min="1"
                max={product.quantity_in_stock}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="form-input"
              />
            </div>
          )}

          {added && <div className="alert alert-success mb-3">Added to cart!</div>}

          <button
            onClick={handleAddToCart}
            disabled={product.quantity_in_stock === 0}
            className="btn btn-primary btn-block"
            style={{ marginBottom: '10px' }}
          >
            {product.quantity_in_stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>

          <button
            onClick={() => navigate('/products')}
            className="btn btn-secondary btn-block"
          >
            Back to Products
          </button>
        </div>

        {/* Reviews Section */}
        {product.stats && (
          <div className="card">
            <h3 className="card-title">Reviews</h3>
            <div className="mb-2">
              <strong>Average Rating:</strong> ⭐ {product.stats.average_rating?.toFixed(1) || 'No rating'} / 5
            </div>
            <div className="mb-3">
              <strong>Total Reviews:</strong> {product.stats.review_count || 0}
            </div>

            {product.reviews && product.reviews.length > 0 ? (
              <div>
                {product.reviews.slice(0, 3).map(review => (
                  <div key={review.id} style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold' }}>⭐ {review.rating} - {review.author_name}</div>
                    <p className="text-muted" style={{ fontSize: '12px' }}>{new Date(review.created_at).toLocaleDateString()}</p>
                    <p>{review.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No reviews yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetailPage;
