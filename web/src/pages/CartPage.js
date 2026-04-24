import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/index';
import ConfirmModal from '../components/ConfirmModal';
import toast from '../components/toast';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Container from '@mui/material/Container';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TextField from '@mui/material/TextField';

function CartPage() {
  const navigate = useNavigate();
  const { items, total, itemCount, removeItem, updateQuantity, clearCart } = useCart();
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }

  const handleRemoveItem = (item) => {
    setConfirm({
      message: `Remove "${item.name}" from your cart?`,
      onConfirm: () => {
        removeItem(item.id);
        toast.info(`"${item.name}" removed from cart`);
      }
    });
  };

  const handleClearCart = () => {
    setConfirm({
      message: 'Clear your entire cart? This cannot be undone.',
      confirmLabel: 'Clear Cart',
      onConfirm: () => {
        clearCart();
        toast.info('Cart cleared');
      }
    });
  };

  useEffect(() => {
    // Clear cart if no items
    if (items.length === 0) {
      setConfirm({
        message: 'Your cart is empty',
        onConfirm: () => {
          navigate('/');
        }
      });
    }
  }, [items, navigate]);

  if (items.length === 0) {
    return (
      <Container sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center', p: 6, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="h4" sx={{ mb: 2 }}>Your Cart is Empty</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>Start shopping to add items to your cart</Typography>
          <Button component={Link} to="/products" variant="contained">Continue Shopping</Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Grid container spacing={3}>
      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          confirmLabel={confirm.confirmLabel || 'Remove'}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      <Grid item xs={12} md={8}>
        <Typography variant="h4" sx={{ mb: 2 }}>Shopping Cart</Typography>

        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Quantity</TableCell>
                <TableCell>Subtotal</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link to={`/products/${item.id}`} style={{ color: '#1976d2' }}>
                      {item.name}
                      {item.selectedVariantName && (
                        <Typography component="span" sx={{ color: 'text.secondary', fontSize: 12, ml: 1 }}>({item.selectedVariantName})</Typography>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>₹{Number(item.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                      inputProps={{ style: { width: 80 } }}
                    />
                  </TableCell>
                  <TableCell>₹{(Number(item.price) * item.quantity).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button color="error" size="small" onClick={() => handleRemoveItem(item)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => navigate('/products')}>Continue Shopping</Button>
          <Button variant="outlined" onClick={handleClearCart}>Clear Cart</Button>
        </Box>
      </Grid>

      {/* Order Summary */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">Order Summary</Typography>
          <Box sx={{ mt: 2, borderBottom: 1, borderColor: 'divider', pb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <span>Items:</span>
              <span>{itemCount}</span>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <span>Subtotal:</span>
              <span>₹{total.toFixed(2)}</span>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <span>Shipping:</span>
              <span>Free</span>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <span>Tax:</span>
              <span>₹0</span>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 'bold', my: 2 }}>
            <span>Total:</span>
            <span>₹{total.toFixed(2)}</span>
          </Box>

          <Button variant="contained" color="success" fullWidth sx={{ mb: 1 }} onClick={() => navigate('/checkout')}>Proceed to Checkout</Button>
        </Paper>
      </Grid>
    </Grid>
  </Container>
  );
}

export default CartPage;
