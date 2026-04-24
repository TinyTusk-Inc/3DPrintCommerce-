import React from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

export default function CategoryCard({ category }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea component={RouterLink} to={`/products?category_id=${category.id}`} sx={{ p: 2 }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h6">{category.name}</Typography>
          <Typography color="text.secondary" variant="body2">
            {category.product_count || 0} products
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
