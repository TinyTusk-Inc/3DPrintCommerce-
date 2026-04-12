import React, { useState, useEffect } from 'react';
import { orderService } from '../services/orderService';
import { useAuth } from '../hooks/index';

function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getUserOrders();
      setOrders(data.orders || []);
    } catch (err) {
      setError('Failed to load orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading...
      </div>
    );
  }

  return (
    <div>
      <h1 className="card-title">My Orders</h1>

      {error && <div className="alert alert-danger">{error}</div>}

      {orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Items</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>
                    <a href={`/orders/${order.id}`} style={{ color: '#3498db' }}>
                      {order.id.substring(0, 8)}...
                    </a>
                  </td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>₹{order.total_price.toFixed(2)}</td>
                  <td>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor:
                        order.status === 'delivered' ? '#d4edda' :
                        order.status === 'shipped' ? '#cfe2ff' :
                        order.status === 'paid' ? '#fff3cd' :
                        '#e2e3e5',
                      color:
                        order.status === 'delivered' ? '#155724' :
                        order.status === 'shipped' ? '#084298' :
                        order.status === 'paid' ? '#664d03' :
                        '#383d41'
                    }}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.item_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default OrdersPage;
