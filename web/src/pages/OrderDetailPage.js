import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { orderService } from '../services/orderService';

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
    return <div className="loading"><div className="spinner"></div>Loading...</div>;
  }

  if (error || !order) {
    return <div className="alert alert-danger">{error || 'Order not found'}</div>;
  }

  return (
    <div>
      <h1 className="card-title">Order {order.id.substring(0, 8)}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div>
          <div className="card">
            <h3 className="card-title">Order Details</h3>
            <div className="mb-3" style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
              <strong>Order ID:</strong> {order.id}
            </div>
            <div className="mb-3" style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
              <strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}
            </div>
            <div className="mb-3" style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
              <strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{order.status}</span>
            </div>

            {order.razorpay_payment_id && (
              <div className="mb-3" style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                <strong>Payment ID:</strong> {order.razorpay_payment_id}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Shipping Address</h3>
            {order.shipping_address ? (
              <>
                <p>{order.shipping_address.name}</p>
                <p>{order.shipping_address.street}</p>
                <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}</p>
                <p>{order.shipping_address.country}</p>
                <p>{order.shipping_address.phone}</p>
              </>
            ) : (
              <p>No shipping address</p>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Items</h3>
            {order.items && order.items.length > 0 ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map(item => (
                    <tr key={item.id}>
                      <td>{item.product_name}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.price_at_purchase.toFixed(2)}</td>
                      <td>₹{(item.quantity * item.price_at_purchase).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No items</p>
            )}
          </div>
        </div>

        <aside>
          <div className="card">
            <h3 className="card-title">Order Summary</h3>
            <div className="mb-3" style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
              ₹{order.total_price.toFixed(2)}
            </div>

            {order.status === 'pending' && (
              <div className="alert alert-warning">
                ⏳ Awaiting payment
              </div>
            )}

            {order.status === 'paid' && (
              <div className="alert alert-info">
                ✅ Payment confirmed, awaiting fulfillment
              </div>
            )}

            {order.status === 'shipped' && (
              <div className="alert alert-info">
                📦 Order has been shipped
              </div>
            )}

            {order.status === 'delivered' && (
              <div className="alert alert-success">
                ✓ Delivered
              </div>
            )}

            {order.status === 'cancelled' && (
              <div className="alert alert-danger">
                ✗ Cancelled
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default OrderDetailPage;
