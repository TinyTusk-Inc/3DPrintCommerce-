import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { productService } from '../services/productService';
import mainCategories from '../data/mainCategories';
import Container, { containerClasses } from '@mui/material/Container';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

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
      const productsData = await productService.listProducts({ limit: 8 });
      setFeaturedProducts(productsData.products || []);
      setCategories(mainCategories);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ py: '0 !important', px: '0 !important' }}>
    <Container sx={{ py: '0 !important', px: '0 !important'}}>
      {/* Hero */}
      <Box
        sx={{
          borderRadius: 2,
          color: 'common.white',
          textAlign: 'center',
          py: 8,
          px: '0 !important',
          mb: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 2 }}>
          Welcome to 3D Print Commerce
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Browse and purchase high-quality 3D printing materials and supplies
        </Typography>
        <Button component={RouterLink} to="/products" variant="contained" color="primary" sx={{ px: 4, py: 1.5 }}>
          Shop Now
        </Button>
      </Box>
    </Container>
    <Container sx={{ py: 4 }}>
      {/* Categories */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Categories
        </Typography>
        <Grid container spacing={2}>
          {categories.map((category) => (
            <Grid item key={category.id} xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ height: '100%', width: '100%', minWidth: 180 }}>
                <CardActionArea component={RouterLink} to={`/products?category_id=${category.id}`} sx={{ p: 0, display: 'block', width: '100%', minWidth: 180 }}>
                  <Box
                    sx={{
                      position: 'relative',
                      height: 140,
                      width: '100%',
                      minWidth: 160,
                      backgroundImage: `url(${category.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                      <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)' }} />
                      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'common.white', px: 2, textAlign: 'center', width: '100%' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{category.name}</Typography>
                      </Box>
                    </Box>
                  </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Featured Products */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          Featured Products
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {featuredProducts.map((product) => (
            <Grid item key={product.id} xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardActionArea component={RouterLink} to={`/products/${product.id}`} sx={{ flexGrow: 1 }}>
                  {product.image_urls?.[0] ? (
                    <CardMedia component="img" height="180" image={product.image_urls[0]} alt={product.name} />
                  ) : (
                    <Box sx={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
                      <Typography color="text.secondary">No image</Typography>
                    </Box>
                  )}
                  <CardContent>
                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                      {product.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                      <Typography variant="subtitle2" color="text.primary">
                        ₹{product.price}
                      </Typography>
                      {product.quantity_in_stock > 0 ? (
                        <Chip
                          label={
                            product.quantity_in_stock > 10
                              ? `${product.quantity_in_stock} in stock`
                              : `${product.quantity_in_stock} in stock`
                          }
                          color={product.quantity_in_stock > 10 ? 'success' : 'warning'}
                          size="small"
                        />
                      ) : (
                        <Chip label="Out of stock" color="error" size="small" />
                      )}
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
    </Container>
  );
}

export default HomePage;
