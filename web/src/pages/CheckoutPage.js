/**
 * CheckoutPage — 3-step flow
 *
 * Step 1: Address selection
 *   - If user has saved addresses → show list, let them pick or add new
 *   - If no saved addresses → go straight to address form
 *
 * Step 2: Add / edit address (shown when user clicks "Add new" or has none)
 *
 * Step 3: Payment (Razorpay modal)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/index';
import { useAuth } from '../hooks/index';
import { orderService } from '../services/orderService';
import { addressService } from '../services/addressService';
import AddressForm from '../components/AddressForm';
import toast from '../components/toast';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';

// ---------------------------------------------------------------------------
// Razorpay helper
// ---------------------------------------------------------------------------

function openRazorpayModal({ razorpayOrderId, amount, currency = 'INR', keyId, user }) {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Razorpay SDK not loaded. Please refresh the page.'));
      return;
    }
    const options = {
      key: keyId,
      amount: Math.round(amount * 100),
      currency,
      name: '3D Print Store',
      description: 'Order Payment',
      order_id: razorpayOrderId,
      prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
      theme: { color: '#3498db' },
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error('Payment cancelled by user')) }
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')));
    rzp.open();
  });
}

// ---------------------------------------------------------------------------
// Address card (used in step 1)
// ---------------------------------------------------------------------------

function AddressCard({ address, selected, onSelect, accountPhone }) {
  const phone = address.use_account_phone ? accountPhone : address.phone;
  return (
    <Paper
      onClick={onSelect}
      sx={{ p: 2, mb: 1, cursor: 'pointer', border: 2, borderColor: selected ? 'primary.main' : 'divider', bgcolor: selected ? 'action.selected' : 'background.paper' }}
      elevation={0}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          <Chip label={address.label} size="small" sx={{ mr: 1 }} />
          {address.is_default && <Chip label="Default" color="success" size="small" />}
          <Typography sx={{ fontWeight: 600, mt: 1 }}>{address.name}</Typography>
          <Typography color="text.secondary">{address.street}</Typography>
          <Typography color="text.secondary">{address.city}, {address.state} — {address.pincode}</Typography>
          <Typography color="text.secondary">📞 {phone || '—'}</Typography>
        </Box>
        <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 1, borderColor: selected ? 'primary.main' : 'grey.300', bgcolor: selected ? 'primary.main' : 'transparent' }}>
          {selected && <Typography sx={{ color: '#fff', fontSize: 12 }}>✓</Typography>}
        </Box>
      </Box>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { user, token } = useAuth();

  const [step, setStep] = useState('loading'); // loading | select | add | pay
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState('');

  // ---------------------------------------------------------------------------
  // Load saved addresses
  // ---------------------------------------------------------------------------

  const loadAddresses = useCallback(async () => {
    try {
      const data = await addressService.list();
      const list = data.addresses || [];
      setAddresses(list);

      if (list.length === 0) {
        setStep('add');
      } else {
        const def = list.find(a => a.is_default) || list[0];
        setSelectedAddressId(def.id);
        setStep('select');
      }
    } catch {
      setStep('add'); // fallback — let user enter address
    }
  }, []);

  useEffect(() => {
    if (token) loadAddresses();
  }, [token, loadAddresses]);

  // ---------------------------------------------------------------------------
  // Empty cart guard
  // ---------------------------------------------------------------------------

  if (items.length === 0) {
    return (
      <Container sx={{ py: 6 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography>No items in cart</Typography>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/cart')}>Back to Cart</Button>
        </Paper>
      </Container>
    );
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSaveAddress = async (formData) => {
    setFormLoading(true);
    try {
      const result = await addressService.create(formData);
      const newAddr = result.address;
      setAddresses(prev => [...prev, newAddr]);
      setSelectedAddressId(newAddr.id);
      toast.success('Address saved');
      setStep('select');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save address');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePay = async () => {
    const address = addresses.find(a => a.id === selectedAddressId);
    if (!address) {
      setError('Please select a delivery address');
      return;
    }

    setError('');
    setPayLoading(true);

    try {
      // Resolve phone: use account phone if flagged
      const phone = address.use_account_phone ? (user?.phone || '') : (address.phone || '');

      const shippingAddress = {
        name: address.name,
        email: user?.email || '',
        phone,
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.pincode,
        country: address.country
      };

      const orderItems = items.map(item => ({
        product_id: item.id,
        quantity: item.quantity
      }));

      const result = await orderService.createOrder(orderItems, shippingAddress);
      const order = result.order;

      if (!order) throw new Error('Failed to create order');

      const keyId = process.env.REACT_APP_RAZORPAY_KEY_ID;
      if (!keyId || keyId === 'your_key_id_here') {
        console.warn('Razorpay key not configured — skipping payment modal in development');
        clearCart();
        navigate(`/orders/${order.id}`);
        return;
      }

      await openRazorpayModal({ razorpayOrderId: order.razorpay_order_id, amount: order.total_price, keyId, user });

      clearCart();
      toast.success('Payment successful!');
      navigate(`/orders/${order.id}`, { state: { paymentSuccess: true } });
    } catch (err) {
      if (err.message === 'Payment cancelled by user') {
        setError('Payment was cancelled. Your order has been saved — you can retry from your orders page.');
      } else {
        setError(err.response?.data?.error || err.message || 'Something went wrong');
      }
    } finally {
      setPayLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Order summary (right column — shown in all steps)
  // ---------------------------------------------------------------------------

  const OrderSummary = () => (
    <Box>
      <Typography variant="h6">Order Summary</Typography>
      <Paper sx={{ mt: 1, p: 2 }}>
        <List dense>
          {items.map(item => (
            <ListItem key={item.id} sx={{ py: 0 }}>
              <ListItemText primary={item.name} secondary={`Qty: ${item.quantity}`} />
              <Typography>₹{(Number(item.price) * item.quantity).toFixed(2)}</Typography>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', mt: 1 }}>
          <span>Total:</span>
          <span>₹{total.toFixed(2)}</span>
        </Box>
      </Paper>
      <Alert severity="info" sx={{ mt: 2 }}>🔒 Payments processed securely via Razorpay</Alert>
    </Box>
  );

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (step === 'loading') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: add new address
  // ---------------------------------------------------------------------------

  if (step === 'add') {
    return (
      <Container sx={{ py: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {addresses.length > 0 && (
                <Button onClick={() => setStep('select')} variant="outlined">← Back</Button>
              )}
              <Typography variant="h5">Add Delivery Address</Typography>
            </Box>
            <Paper sx={{ p: 2 }}>
              <AddressForm
                accountPhone={user?.phone}
                onSubmit={handleSaveAddress}
                onCancel={addresses.length > 0 ? () => setStep('select') : null}
                loading={formLoading}
                submitLabel="Save & Continue"
              />
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <OrderSummary />
          </Grid>
        </Grid>
      </Container>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: select address + pay
  // ---------------------------------------------------------------------------

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);

  return (
    <Container sx={{ py: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h5" sx={{ mb: 2 }}>Delivery Address</Typography>

          {error && <Alert severity="error">{error}</Alert>}

          {addresses.map(addr => (
            <AddressCard
              key={addr.id}
              address={addr}
              selected={addr.id === selectedAddressId}
              onSelect={() => setSelectedAddressId(addr.id)}
              accountPhone={user?.phone}
            />
          ))}

          <Button variant="outlined" fullWidth sx={{ my: 2 }} onClick={() => setStep('add')}>+ Add New Address</Button>

          {selectedAddress && (
            <Paper sx={{ p: 2, bgcolor: 'action.selected', border: 1, borderColor: 'primary.main' }}>
              <Typography sx={{ fontWeight: 600 }}>Delivering to:</Typography>
              <Typography color="text.secondary">{selectedAddress.name} · {selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.pincode}</Typography>
            </Paper>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button variant="contained" onClick={handlePay} disabled={payLoading || !selectedAddressId}>{payLoading ? 'Processing…' : `Pay ₹${total.toFixed(2)} with Razorpay`}</Button>
            <Button variant="outlined" onClick={() => navigate('/cart')}>← Back to Cart</Button>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <OrderSummary />
        </Grid>
      </Grid>
    </Container>
  );
}

export default CheckoutPage;
