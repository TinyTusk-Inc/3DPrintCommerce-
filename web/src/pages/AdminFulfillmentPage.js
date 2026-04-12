import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';

function AdminFulfillmentPage() {
  const [queue, setQueue] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [updateForm, setUpdateForm] = useState({
    order_id: '',
    status: '',
    tracking_number: ''
  });

  useEffect(() => {
    fetchFulfillmentData();
  }, []);

  const fetchFulfillmentData = async () => {
    try {
      setLoading(true);
      const [queueRes, metricsRes] = await Promise.all([
        adminService.getFulfillmentQueue({ limit: 50 }),
        adminService.getFulfillmentMetrics()
      ]);
      setQueue(queueRes.orders || []);
      setMetrics(metricsRes.metrics);
    } catch (err) {
      setError('Failed to load fulfillment data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (e) => {
    const { name, value } = e.target;
    setUpdateForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!updateForm.order_id || !updateForm.status) {
      setMessage('Please select an order and status');
      return;
    }
    try {
      await adminService.updateFulfillmentStatus({
        order_id: updateForm.order_id,
        status: updateForm.status,
        tracking_number: updateForm.tracking_number || null
      });
      setMessage('✓ Order status updated');
      setUpdateForm({ order_id: '', status: '', tracking_number: '' });
      fetchFulfillmentData();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to update status');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div>
      <h1 className="card-title">Fulfillment Management</h1>

      {message && (
        <div className={`alert ${message.includes('Failed') ? 'alert-danger' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div className="card">
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3498db' }}>
              {metrics.pending_orders || 0}
            </div>
            <p style={{ margin: 0, color: '#666' }}>Pending Orders</p>
          </div>

          <div className="card">
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f39c12' }}>
              {metrics.avg_fulfillment_time || '---'} days
            </div>
            <p style={{ margin: 0, color: '#666' }}>Avg Fulfillment Time</p>
          </div>

          <div className="card">
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#27ae60' }}>
              {((metrics.fulfillment_rate || 0) * 100).toFixed(1)}%
            </div>
            <p style={{ margin: 0, color: '#666' }}>Fulfillment Rate</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div className="card">
          <h3 className="card-title">Order Queue</h3>
          {queue.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Items</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ fontSize: '12px' }}>{order.id.substring(0, 8)}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>₹{order.total_price.toFixed(2)}</td>
                    <td>{order.items?.length || 0}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: order.status === 'pending' ? '#e74c3c' :
                                        order.status === 'paid' ? '#f39c12' :
                                        order.status === 'shipped' ? '#3498db' :
                                        '#27ae60',
                        color: 'white',
                        textTransform: 'capitalize'
                      }}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No orders in queue</p>
          )}
        </div>

        <aside>
          <div className="card">
            <h3 className="card-title">Update Order</h3>
            <form onSubmit={handleUpdateStatus}>
              <div className="form-group">
                <label>Order</label>
                <select
                  name="order_id"
                  value={updateForm.order_id}
                  onChange={handleStatusChange}
                  className="form-control"
                  required
                >
                  <option value="">Select order...</option>
                  {queue.map(order => (
                    <option key={order.id} value={order.id}>
                      {order.id.substring(0, 8)} - ₹{order.total_price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={updateForm.status}
                  onChange={handleStatusChange}
                  className="form-control"
                  required
                >
                  <option value="">Select status...</option>
                  <option value="paid">Paid</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tracking Number (optional)</label>
                <input
                  type="text"
                  name="tracking_number"
                  value={updateForm.tracking_number}
                  onChange={handleStatusChange}
                  className="form-control"
                  placeholder="e.g., TRK123456"
                />
              </div>

              <button type="submit" className="btn btn-primary">Update Order</button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default AdminFulfillmentPage;
