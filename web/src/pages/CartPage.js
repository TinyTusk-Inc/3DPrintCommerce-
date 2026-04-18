import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/index';
import ConfirmModal from '../components/ConfirmModal';
import toast from '../components/toast';

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

  if (items.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ marginBottom: '20px' }}>Your Cart is Empty</h2>
        <p className="text-muted" style={{ marginBottom: '30px' }}>
          Start shopping to add items to your cart
        </p>
        <Link to="/products" className="btn btn-primary">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          confirmLabel={confirm.confirmLabel || 'Remove'}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Cart Items */}
      <div>
        <h1 className="card-title">Shopping Cart</h1>

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td>
                    <Link to={`/products/${item.id}`} style={{ color: '#3498db' }}>
                      {item.name}
                      {item.selectedVariantName && (
                        <span style={{ color: '#888', fontSize: '12px', marginLeft: '6px' }}>
                          ({item.selectedVariantName})
                        </span>
                      )}
                    </Link>
                  </td>
                  <td>₹{Number(item.price).toFixed(2)}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                      className="form-input"
                      style={{ width: '80px' }}
                    />
                  </td>
                  <td>₹{(Number(item.price) * item.quantity).toFixed(2)}</td>
                  <td>
                    <button
                      onClick={() => handleRemoveItem(item)}
                      className="btn btn-danger"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <button
            onClick={() => navigate('/products')}
            className="btn btn-secondary"
            style={{ marginRight: '10px' }}
          >
            Continue Shopping
          </button>
          <button onClick={handleClearCart} className="btn btn-secondary">
            Clear Cart
          </button>
        </div>
      </div>

      {/* Order Summary */}
      <aside>
        <div className="card">
          <h2 className="card-title">Order Summary</h2>

          <div className="mb-3" style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Items:</span>
              <span>{itemCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Subtotal:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Shipping:</span>
              <span>Free</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Tax:</span>
              <span>₹0</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
            <span>Total:</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="btn btn-success btn-block"
            style={{ marginBottom: '10px' }}
          >
            Proceed to Checkout
          </button>
        </div>
      </aside>
    </div>
  );
}

export default CartPage;
