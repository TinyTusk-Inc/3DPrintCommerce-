import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productService } from '../services/productService';
import { useCart } from '../hooks/index';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

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

  if (loading) return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
      <CircularProgress />
    </Box>
  );
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!product) return <Alert severity="error">Product not found</Alert>;

  const heroImage = displayImages[activeImageIndex];

  return (
    <Container sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card sx={{ overflow: 'hidden' }}>
            {heroImage ? (
              <CardMedia component="img" height="420" image={heroImage.url} alt={heroImage.alt_text || product.name} />
            ) : (
              <Box sx={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
                <Typography color="text.secondary">No image available</Typography>
              </Box>
            )}
          </Card>

          {displayImages.length > 1 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              {displayImages.map((img, idx) => (
                <Box
                  key={img.id}
                  component="button"
                  onClick={() => setActiveImageIndex(idx)}
                  sx={{
                    width: 64, height: 64, p: 0, border: 'none', borderRadius: 1, overflow: 'hidden', cursor: 'pointer',
                    outline: idx === activeImageIndex ? '2px solid' : '2px solid transparent'
                  }}
                >
                  <Box component="img" src={img.url} alt={img.alt_text || `View ${idx + 1}`} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
              ))}
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h4" sx={{ mb: 1 }}>{product.name}</Typography>

          {stats && (
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              ⭐ {stats.average_rating?.toFixed(1) || '—'} / 5 ({stats.review_count || 0} reviews)
            </Typography>
          )}

          <Box sx={{ mb: 3, p: 2, borderRadius: 1, bgcolor: 'background.paper', boxShadow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              ₹{effectivePrice.toFixed(2)}
            </Typography>
            {selectedVariant && Number(selectedVariant.price_delta) !== 0 && (
              <Typography variant="body2" color="text.secondary">
                (base ₹{Number(product.price).toFixed(2)}
                {Number(selectedVariant.price_delta) > 0 ? ' + ' : ' − '}
                ₹{Math.abs(Number(selectedVariant.price_delta)).toFixed(2)} for {selectedVariant.color_name})
              </Typography>
            )}

            <Typography sx={{ color: 'text.secondary', mt: 2 }}>{product.description}</Typography>

            {hasVariants && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontWeight: 600, mb: 1 }}>Color: <Typography component="span" sx={{ fontWeight: 'normal', color: 'text.secondary' }}>{selectedVariant?.color_name || 'Select a color'}</Typography></Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {product.variants.map(v => (
                    <Box
                      key={v.id}
                      component="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      title={v.color_name}
                      sx={{
                        width: 36, height: 36, borderRadius: '50%', background: v.color_hex || '#ccc',
                        border: v.id === selectedVariantId ? '3px solid' : '2px solid', borderColor: v.id === selectedVariantId ? 'primary.main' : 'grey.300',
                        cursor: 'pointer', p: 0, boxShadow: v.id === selectedVariantId ? '0 0 0 2px #fff inset' : 'none', opacity: v.stock === 0 ? 0.35 : 1
                      }}
                    />
                  ))}
                </Stack>
                {selectedVariant?.stock === 0 && (
                  <Typography color="error" sx={{ fontSize: 13, mt: 1 }}>This color is out of stock</Typography>
                )}
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <Typography component="span" sx={{ mr: 1 }}>Stock:</Typography>
              <Typography component="span" sx={{ color: availableStock > 0 ? 'success.main' : 'error.main' }}>{availableStock > 0 ? `${availableStock} available` : 'Out of stock'}</Typography>
            </Box>

            {availableStock > 0 && (
              <Box sx={{ mt: 2, width: 120 }}>
                <TextField
                  label="Quantity"
                  type="number"
                  size="small"
                  inputProps={{ min: 1, max: availableStock }}
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, Math.min(availableStock, parseInt(e.target.value) || 1)))}
                />
              </Box>
            )}

            {added && <Alert severity="success" sx={{ mt: 2 }}>Added to cart!</Alert>}

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleAddToCart}
                disabled={availableStock === 0 || (hasVariants && !selectedVariantId)}
              >
                {availableStock === 0 ? 'Out of Stock' : hasVariants && !selectedVariantId ? 'Select a Color' : 'Add to Cart'}
              </Button>
              <Button variant="outlined" onClick={() => navigate('/products')}>← Back to Products</Button>
            </Box>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>Reviews</Typography>
            {reviews.length > 0 ? (
              reviews.slice(0, 3).map(review => (
                <Box key={review.id} sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 1 }}>
                  <Typography sx={{ fontWeight: 'bold' }}>⭐ {review.rating} — {review.author_name}</Typography>
                  <Typography color="text.secondary" sx={{ fontSize: 12 }}>{new Date(review.created_at).toLocaleDateString()}</Typography>
                  <Typography sx={{ mt: 1 }}>{review.text}</Typography>
                </Box>
              ))
            ) : (
              <Typography color="text.secondary">No reviews yet</Typography>
            )}
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}

export default ProductDetailPage;
