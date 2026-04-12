import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/index';
import { orderService } from '../services/orderService';

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'India'
  });

  if (items.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <p>No items in cart</p>
        <button onClick={() => navigate('/cart')} className="btn btn-primary">
          Back to Cart
        </button>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const orderItems = items.map(item => ({
        product_id: item.id,
        quantity: item.quantity
      }));

      const result = await orderService.createOrder(orderItems, formData);

      if (result.order) {
        clearCart();
        alert(`Order created! Razorpay Order ID: ${result.order.razorpay_order_id}\n\nOrder total: ₹${result.order.total_price}`);
        navigate(`/orders/${result.order.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      {/* Checkout Form */}
      <div>
        <h1 className="card-title">Shipping Information</h1>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="card">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Street Address</label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">ZIP Code</label>
              <input
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
            style={{ marginBottom: '10px' }}
          >
            {loading ? 'Creating Order...' : 'Place Order'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="btn btn-secondary btn-block"
          >
            Back to Cart
          </button>
        </form>
      </div>

      {/* Order Summary */}
      <div>
        <h2 className="card-title">Order Summary</h2>

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>₹{(item.price * item.quantity).toFixed(2)}</td>
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

        <div className="alert alert-info mt-3">
          💡 Order will be created with your shipping information. Payment through Razorpay will be next step.
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
