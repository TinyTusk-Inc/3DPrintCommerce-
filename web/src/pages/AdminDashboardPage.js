import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';

function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboard();
      setDashboard(data.dashboard);
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading...</div>;
  }

  if (error || !dashboard) {
    return <div className="alert alert-danger">{error || 'Failed to load dashboard'}</div>;
  }

  return (
    <div>
      <h1 className="card-title">Admin Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
            {dashboard.total_products}
          </div>
          <p style={{ margin: 0, color: '#666' }}>Total Products</p>
        </div>

        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2ecc71' }}>
            {dashboard.total_orders}
          </div>
          <p style={{ margin: 0, color: '#666' }}>Total Orders</p>
        </div>

        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f39c12' }}>
            ₹{(dashboard.total_revenue || 0).toFixed(2)}
          </div>
          <p style={{ margin: 0, color: '#666' }}>Total Revenue</p>
        </div>

        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>
            {dashboard.orders_pending || 0}
          </div>
          <p style={{ margin: 0, color: '#666' }}>Pending Orders</p>
        </div>

        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9b59b6' }}>
            {dashboard.orders_shipped || 0}
          </div>
          <p style={{ margin: 0, color: '#666' }}>Shipped Orders</p>
        </div>

        <div className="card">
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1abc9c' }}>
            {dashboard.orders_delivered || 0}
          </div>
          <p style={{ margin: 0, color: '#666' }}>Delivered Orders</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <a href="/admin/inventory" className="card" style={{ textDecoration: 'none', cursor: 'pointer', paddingTop: '30px', paddingBottom: '30px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#3498db' }}>📦 Inventory Management</h3>
          <p style={{ color: '#666', marginTop: '10px' }}>Manage product stock and reorder levels</p>
        </a>

        <a href="/admin/fulfillment" className="card" style={{ textDecoration: 'none', cursor: 'pointer', paddingTop: '30px', paddingBottom: '30px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#2ecc71' }}>🚚 Fulfillment Queue</h3>
          <p style={{ color: '#666', marginTop: '10px' }}>Process and ship orders</p>
        </a>

        <a href="/admin/products" className="card" style={{ textDecoration: 'none', cursor: 'pointer', paddingTop: '30px', paddingBottom: '30px', textAlign: 'center' }}>
          <h3 style={{ margin: 0, color: '#9b59b6' }}>🎨 Product Management</h3>
          <p style={{ color: '#666', marginTop: '10px' }}>Add products, colors, and images</p>
        </a>      </div>
    </div>
  );
}

export default AdminDashboardPage;
