import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productService } from '../services/productService';
import { useCart } from '../hooks/index';

function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [selectedVariantId, setSelectedVariantId] = useState(null); // null = no variants / base product
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetch
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await productService.getProduct(productId);
        setProduct(data.product);
        setReviews(data.reviews || []);
        setStats(data.stats || null);

        // Pre-select the default variant if any
        const defaultVariant = (data.product.variants || []).find(v => v.is_default);
        if (defaultVariant) setSelectedVariantId(defaultVariant.id);
      } catch (err) {
        setError('Failed to load product');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const selectedVariant = useMemo(
    () => (product?.variants || []).find(v => v.id === selectedVariantId) || null,
    [product, selectedVariantId]
  );

  // Images to display: variant-specific first, then shared
  const displayImages = useMemo(() => {
    if (!product) return [];
    const shared = product.shared_images || [];
    if (!selectedVariant) return shared;
    const variantImgs = selectedVariant.images || [];
    return [...variantImgs, ...shared];
  }, [product, selectedVariant]);

  // Reset active image when variant changes
  useEffect(() => { setActiveImageIndex(0); }, [selectedVariantId]);

  // Effective price = base + variant delta
  const effectivePrice = useMemo(() => {
    if (!product) return 0;
    const base = Number(product.price);
    const delta = selectedVariant ? Number(selectedVariant.price_delta) : 0;
    return base + delta;
  }, [product, selectedVariant]);

  // Stock: use variant stock if variants exist, else product stock
  const availableStock = useMemo(() => {
    if (!product) return 0;
    if (selectedVariant) return selectedVariant.stock;
    return product.quantity_in_stock;
  }, [product, selectedVariant]);

  const hasVariants = product?.variants?.length > 0;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAddToCart = () => {
    if (!product) return;
    addItem(
      {
        ...product,
        price: effectivePrice,
        selectedVariantId,
        selectedVariantName: selectedVariant?.color_name || null
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return <div className="loading"><div className="spinner" />Loading...</div>;
  }
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!product) return <div className="alert alert-danger">Product not found</div>;

  const heroImage = displayImages[activeImageIndex];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>

      {/* ------------------------------------------------------------------ */}
      {/* Left: Image gallery                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div>
        {/* Hero image */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '10px' }}>
          <div style={{ height: '420px', background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {heroImage ? (
              <img
                src={heroImage.url}
                alt={heroImage.alt_text || product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ color: '#aaa' }}>No image available</span>
            )}
          </div>
        </div>

        {/* Thumbnail strip */}
        {displayImages.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {displayImages.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setActiveImageIndex(idx)}
                style={{
                  width: '64px', height: '64px', padding: 0, border: 'none',
                  borderRadius: '6px', overflow: 'hidden', cursor: 'pointer',
                  outline: idx === activeImageIndex ? '2px solid #3498db' : '2px solid transparent',
                  opacity: idx === activeImageIndex ? 1 : 0.7
                }}
              >
                <img
                  src={img.url}
                  alt={img.alt_text || `View ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right: Product info                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h1 style={{ marginBottom: '6px' }}>{product.name}</h1>

        {stats && (
          <div style={{ marginBottom: '12px', color: '#888', fontSize: '14px' }}>
            ⭐ {stats.average_rating?.toFixed(1) || '—'} / 5
            <span style={{ marginLeft: '8px' }}>({stats.review_count || 0} reviews)</span>
          </div>
        )}

        <div className="card" style={{ marginBottom: '20px' }}>
          {/* Price */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#2c3e50' }}>
              ₹{effectivePrice.toFixed(2)}
            </span>
            {selectedVariant && Number(selectedVariant.price_delta) !== 0 && (
              <span style={{ fontSize: '13px', color: '#888', marginLeft: '8px' }}>
                (base ₹{Number(product.price).toFixed(2)}
                {Number(selectedVariant.price_delta) > 0 ? ' + ' : ' − '}
                ₹{Math.abs(Number(selectedVariant.price_delta)).toFixed(2)} for {selectedVariant.color_name})
              </span>
            )}
          </div>

          {/* Description */}
          <p style={{ color: '#555', marginBottom: '16px', lineHeight: '1.6' }}>
            {product.description}
          </p>

          {/* Color picker */}
          {hasVariants && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontWeight: '600', marginBottom: '8px' }}>
                Color:{' '}
                <span style={{ fontWeight: 'normal', color: '#555' }}>
                  {selectedVariant?.color_name || 'Select a color'}
                </span>
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {product.variants.map(v => (
                  <button
                    key={v.id}
                    title={v.color_name}
                    onClick={() => setSelectedVariantId(v.id)}
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: v.color_hex || '#ccc',
                      border: v.id === selectedVariantId
                        ? '3px solid #3498db'
                        : '2px solid #ccc',
                      cursor: 'pointer', padding: 0,
                      boxShadow: v.id === selectedVariantId ? '0 0 0 2px #fff inset' : 'none',
                      opacity: v.stock === 0 ? 0.35 : 1
                    }}
                  />
                ))}
              </div>
              {selectedVariant?.stock === 0 && (
                <p style={{ color: '#e74c3c', fontSize: '13px', marginTop: '6px' }}>
                  This color is out of stock
                </p>
              )}
            </div>
          )}

          {/* Stock */}
          <div style={{ marginBottom: '16px' }}>
            <strong>Stock: </strong>
            <span style={{ color: availableStock > 0 ? '#27ae60' : '#e74c3c' }}>
              {availableStock > 0 ? `${availableStock} available` : 'Out of stock'}
            </span>
          </div>

          {/* Quantity */}
          {availableStock > 0 && (
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                min="1"
                max={availableStock}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, Math.min(availableStock, parseInt(e.target.value) || 1)))}
                className="form-input"
                style={{ width: '80px' }}
              />
            </div>
          )}

          {added && <div className="alert alert-success" style={{ marginBottom: '10px' }}>Added to cart!</div>}

          <button
            onClick={handleAddToCart}
            disabled={availableStock === 0 || (hasVariants && !selectedVariantId)}
            className="btn btn-primary btn-block"
            style={{ marginBottom: '10px' }}
          >
            {availableStock === 0
              ? 'Out of Stock'
              : hasVariants && !selectedVariantId
              ? 'Select a Color'
              : 'Add to Cart'}
          </button>

          <button onClick={() => navigate('/products')} className="btn btn-secondary btn-block">
            ← Back to Products
          </button>
        </div>

        {/* Reviews */}
        <div className="card">
          <h3 className="card-title">Reviews</h3>
          {reviews.length > 0 ? (
            reviews.slice(0, 3).map(review => (
              <div key={review.id} style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold' }}>⭐ {review.rating} — {review.author_name}</div>
                <p style={{ color: '#888', fontSize: '12px', margin: '2px 0' }}>
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
                <p style={{ margin: 0 }}>{review.text}</p>
              </div>
            ))
          ) : (
            <p className="text-muted">No reviews yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;
