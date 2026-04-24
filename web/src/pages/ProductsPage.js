import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productService } from '../services/productService';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';

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
    <Container sx={{ py: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Box sx={{ position: { md: 'sticky' }, top: 24 }}>
            <Box sx={{ mb: 2, p: 2, borderRadius: 1, bgcolor: 'background.paper', boxShadow: 1 }}>
              <Typography variant="h6" gutterBottom>
                Filters
              </Typography>
              <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  name="search"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </Box>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Category</InputLabel>
                <Select name="category_id" value={filters.category_id} label="Category" onChange={handleFilterChange}>
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(cat => (
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Min Price"
                name="price_min"
                type="number"
                fullWidth
                size="small"
                value={filters.price_min}
                onChange={handleFilterChange}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Max Price"
                name="price_max"
                type="number"
                fullWidth
                size="small"
                value={filters.price_max}
                onChange={handleFilterChange}
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Sort</InputLabel>
                <Select name="sort" value={filters.sort} label="Sort" onChange={handleFilterChange}>
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="price_asc">Price: Low to High</MenuItem>
                  <MenuItem value="price_desc">Price: High to Low</MenuItem>
                </Select>
              </FormControl>

              <Button variant="outlined" fullWidth onClick={resetFilters}>
                Reset Filters
              </Button>
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} md={9}>
          <Typography variant="h4" gutterBottom>
            Products
          </Typography>

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {!loading && products.length === 0 && (
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography>No products found</Typography>
            </Box>
          )}

          {!loading && products.length > 0 && (
            <>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Showing {products.length} product{products.length !== 1 ? 's' : ''}
              </Typography>

              <Grid container spacing={2}>
                {products.map(product => (
                  <Grid key={product.id} item xs={12} sm={6} md={4}>
                    <ProductCard product={product} />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}

export default ProductsPage;
