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
    <div
      onClick={onSelect}
      style={{
        border: `2px solid ${selected ? '#3498db' : '#ddd'}`,
        borderRadius: '8px', padding: '14px 16px', cursor: 'pointer',
        background: selected ? '#f0f8ff' : '#fff', marginBottom: '10px',
        transition: 'border-color 0.15s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{
            fontSize: '11px', fontWeight: '600', background: '#e8f4fd',
            color: '#3498db', padding: '2px 8px', borderRadius: '10px', marginRight: '8px'
          }}>
            {address.label}
          </span>
          {address.is_default && (
            <span style={{
              fontSize: '11px', background: '#e8f8e8', color: '#27ae60',
              padding: '2px 8px', borderRadius: '10px'
            }}>Default</span>
          )}
          <p style={{ margin: '8px 0 2px', fontWeight: '600' }}>{address.name}</p>
          <p style={{ margin: '0 0 2px', color: '#555', fontSize: '14px' }}>{address.street}</p>
          <p style={{ margin: '0 0 2px', color: '#555', fontSize: '14px' }}>
            {address.city}, {address.state} — {address.pincode}
          </p>
          <p style={{ margin: '0', color: '#888', fontSize: '13px' }}>📞 {phone || '—'}</p>
        </div>
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${selected ? '#3498db' : '#ccc'}`,
          background: selected ? '#3498db' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {selected && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
        </div>
      </div>
    </div>
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
      <div className="card" style={{ textAlign: 'center' }}>
        <p>No items in cart</p>
        <button onClick={() => navigate('/cart')} className="btn btn-primary">Back to Cart</button>
      </div>
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
    <div>
      <h2 className="card-title">Order Summary</h2>
      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Product</th><th>Qty</th><th>Price</th></tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>
                  {item.name}
                  {item.selectedVariantName && (
                    <span style={{ color: '#888', fontSize: '12px' }}> ({item.selectedVariantName})</span>
                  )}
                </td>
                <td>{item.quantity}</td>
                <td>₹{(Number(item.price) * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ borderTop: '2px solid #ddd', paddingTop: '10px', marginTop: '10px', fontSize: '18px', fontWeight: 'bold' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total:</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <div className="alert alert-info" style={{ marginTop: '12px', fontSize: '13px' }}>
        🔒 Payments processed securely via Razorpay
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (step === 'loading') {
    return <div className="loading"><div className="spinner" />Loading…</div>;
  }

  // ---------------------------------------------------------------------------
  // Render: add new address
  // ---------------------------------------------------------------------------

  if (step === 'add') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {addresses.length > 0 && (
              <button onClick={() => setStep('select')} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
                ← Back
              </button>
            )}
            <h1 className="card-title" style={{ margin: 0 }}>Add Delivery Address</h1>
          </div>
          <div className="card">
            <AddressForm
              accountPhone={user?.phone}
              onSubmit={handleSaveAddress}
              onCancel={addresses.length > 0 ? () => setStep('select') : null}
              loading={formLoading}
              submitLabel="Save & Continue"
            />
          </div>
        </div>
        <OrderSummary />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: select address + pay
  // ---------------------------------------------------------------------------

  const selectedAddress = addresses.find(a => a.id === selectedAddressId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div>
        <h1 className="card-title">Delivery Address</h1>

        {error && <div className="alert alert-danger">{error}</div>}

        {/* Address list */}
        {addresses.map(addr => (
          <AddressCard
            key={addr.id}
            address={addr}
            selected={addr.id === selectedAddressId}
            onSelect={() => setSelectedAddressId(addr.id)}
            accountPhone={user?.phone}
          />
        ))}

        {/* Add new */}
        <button
          onClick={() => setStep('add')}
          className="btn btn-secondary"
          style={{ width: '100%', marginBottom: '20px', borderStyle: 'dashed' }}
        >
          + Add New Address
        </button>

        {/* Selected address summary */}
        {selectedAddress && (
          <div className="card" style={{ background: '#f0f8ff', border: '1px solid #3498db' }}>
            <p style={{ margin: '0 0 4px', fontWeight: '600', color: '#2c3e50' }}>Delivering to:</p>
            <p style={{ margin: '0', color: '#555', fontSize: '14px' }}>
              {selectedAddress.name} · {selectedAddress.street}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.pincode}
            </p>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={payLoading || !selectedAddressId}
          className="btn btn-primary btn-block"
          style={{ marginTop: '16px', fontSize: '16px', padding: '12px' }}
        >
          {payLoading ? 'Processing…' : `Pay ₹${total.toFixed(2)} with Razorpay`}
        </button>

        <button
          onClick={() => navigate('/cart')}
          className="btn btn-secondary btn-block"
          style={{ marginTop: '8px' }}
        >
          ← Back to Cart
        </button>
      </div>

      <OrderSummary />
    </div>
  );
}

export default CheckoutPage;
