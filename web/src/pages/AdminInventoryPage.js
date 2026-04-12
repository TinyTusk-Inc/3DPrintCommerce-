import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';

function AdminInventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [adjustForm, setAdjustForm] = useState({
    product_id: '',
    quantity_change: '',
    reason: 'manual_adjustment'
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const [invRes, lowRes] = await Promise.all([
        adminService.getInventory({ limit: 100 }),
        adminService.getLowStock()
      ]);
      setInventory(invRes.products || []);
      setLowStock(lowRes.products || []);
    } catch (err) {
      setError('Failed to load inventory');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustmentChange = (e) => {
    const { name, value } = e.target;
    setAdjustForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAdjustInventory = async (e) => {
    e.preventDefault();
    if (!adjustForm.product_id || !adjustForm.quantity_change) {
      setMessage('Please fill in all fields');
      return;
    }
    try {
      await adminService.adjustInventory({
        product_id: adjustForm.product_id,
        quantity_change: parseInt(adjustForm.quantity_change),
        reason: adjustForm.reason
      });
      setMessage('✓ Inventory adjusted successfully');
      setAdjustForm({ product_id: '', quantity_change: '', reason: 'manual_adjustment' });
      fetchInventory();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to adjust inventory');
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
      <h1 className="card-title">Inventory Management</h1>

      {message && (
        <div className={`alert ${message.includes('Failed') ? 'alert-danger' : 'alert-success'}`}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="card">
          <h3 className="card-title">Current Stock Levels</h3>
          {inventory.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock Level</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td>{item.name}</td>
                    <td>{item.stock}</td>
                    <td>{item.reorder_level || '---'}</td>
                    <td>
                      {item.stock < (item.reorder_level || 10) ? (
                        <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>⚠ Low</span>
                      ) : (
                        <span style={{ color: '#27ae60' }}>✓ Good</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No products found</p>
          )}
        </div>

        <aside>
          <div className="card">
            <h3 className="card-title">Adjust Inventory</h3>
            <form onSubmit={handleAdjustInventory}>
              <div className="form-group">
                <label>Product</label>
                <select
                  name="product_id"
                  value={adjustForm.product_id}
                  onChange={handleAdjustmentChange}
                  className="form-control"
                  required
                >
                  <option value="">Select product...</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quantity Change</label>
                <input
                  type="number"
                  name="quantity_change"
                  value={adjustForm.quantity_change}
                  onChange={handleAdjustmentChange}
                  className="form-control"
                  placeholder="+ or - quantity"
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason</label>
                <select
                  name="reason"
                  value={adjustForm.reason}
                  onChange={handleAdjustmentChange}
                  className="form-control"
                >
                  <option value="manual_adjustment">Manual Adjustment</option>
                  <option value="return">Product Return</option>
                  <option value="damage">Damaged</option>
                  <option value="restock">Restock</option>
                  <option value="inventory_correction">Inventory Correction</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary">Update Stock</button>
            </form>
          </div>

          {lowStock.length > 0 && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 className="card-title">⚠ Low Stock Items</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {lowStock.slice(0, 5).map(item => (
                  <li key={item.id} style={{ paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                    <strong>{item.name}</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#666' }}>Stock: {item.stock}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default AdminInventoryPage;
