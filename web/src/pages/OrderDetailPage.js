import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { orderService } from '../services/orderService';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

function OrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOrder(orderId);
      setOrder(data.order);
    } catch (err) {
      setError('Failed to load order');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>;
  }

  if (error || !order) {
    return <Container sx={{ py: 4 }}><Alert severity="error">{error || 'Order not found'}</Alert></Container>;
  }

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Order {order.id.substring(0,8)}</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">Order Details</Typography>
            <Box sx={{ mt: 1 }}>
              <Typography><strong>Order ID:</strong> {order.id}</Typography>
              <Typography><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}</Typography>
              <Typography><strong>Status:</strong> <Box component="span" sx={{ textTransform: 'capitalize' }}>{order.status}</Box></Typography>
            </Box>
            {order.razorpay_payment_id && (
              <Box sx={{ mt: 1 }}><Typography><strong>Payment ID:</strong> {order.razorpay_payment_id}</Typography></Box>
            )}
          </Paper>

          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">Shipping Address</Typography>
            {order.shipping_address ? (
              <Box sx={{ mt: 1 }}>
                <Typography>{order.shipping_address.name}</Typography>
                <Typography color="text.secondary">{order.shipping_address.street}</Typography>
                <Typography color="text.secondary">{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}</Typography>
                <Typography color="text.secondary">{order.shipping_address.country}</Typography>
                <Typography color="text.secondary">{order.shipping_address.phone}</Typography>
              </Box>
            ) : (
              <Typography>No shipping address</Typography>
            )}
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Items</Typography>
            {order.items && order.items.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{item.price_at_purchase.toFixed(2)}</TableCell>
                        <TableCell>₹{(item.quantity * item.price_at_purchase).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography>No items</Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Order Summary</Typography>
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>₹{order.total_price.toFixed(2)}</Typography>
            </Box>

            {order.status === 'pending' && <Alert severity="warning">⏳ Awaiting payment</Alert>}
            {order.status === 'paid' && <Alert severity="info">✅ Payment confirmed, awaiting fulfillment</Alert>}
            {order.status === 'shipped' && <Alert severity="info">📦 Order has been shipped</Alert>}
            {order.status === 'delivered' && <Alert severity="success">✓ Delivered</Alert>}
            {order.status === 'cancelled' && <Alert severity="error">✗ Cancelled</Alert>}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default OrderDetailPage;
