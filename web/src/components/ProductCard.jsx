import React from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { Link as RouterLink } from 'react-router-dom';

export default function ProductCard({ product }) {
  return (
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
              ₹{Number(product.price).toFixed(2)}
            </Typography>
            {product.quantity_in_stock > 0 ? (
              <Chip
                label={`${product.quantity_in_stock} in stock`}
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
  );
}
