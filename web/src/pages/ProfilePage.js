/**
 * ProfilePage
 * Sections:
 *  1. Account info (name, phone) — editable
 *  2. Saved addresses — list, add, edit, delete, set default
 *  3. Change password
 *  4. Logout
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks';
import { addressService } from '../services/addressService';
import AddressForm from '../components/AddressForm';
import ConfirmModal from '../components/ConfirmModal';
import toast from '../components/toast';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Address card
// ---------------------------------------------------------------------------

function AddressCard({ address, accountPhone, onEdit, onDelete, onSetDefault }) {
  const phone = address.use_account_phone ? accountPhone : address.phone;
  return (
    <div style={{
      border: '1px solid #ddd', borderRadius: '8px', padding: '14px 16px',
      marginBottom: '10px', position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{
            fontSize: '11px', fontWeight: '600', background: '#e8f4fd',
            color: '#3498db', padding: '2px 8px', borderRadius: '10px', marginRight: '6px'
          }}>{address.label}</span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          {!address.is_default && (
            <button onClick={() => onSetDefault(address.id)} className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: '12px' }}>
              Set default
            </button>
          )}
          <button onClick={() => onEdit(address)} className="btn btn-secondary" style={{ padding: '3px 10px', fontSize: '12px' }}>
            Edit
          </button>
          <button
            onClick={() => onDelete(address)}
            style={{ padding: '3px 10px', fontSize: '12px', background: 'none', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', cursor: 'pointer' }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function ProfilePage() {
  const { user, token, logout, getProfile } = useAuth();

  // Account info
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({ name: '', phone: '' });
  const [infoLoading, setInfoLoading] = useState(false);

  // Password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null); // null = add mode
  const [addrFormLoading, setAddrFormLoading] = useState(false);

  // Confirm modal
  const [confirm, setConfirm] = useState(null);

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  const loadAddresses = useCallback(async () => {
    try {
      setAddrLoading(true);
      const data = await addressService.list();
      setAddresses(data.addresses || []);
    } catch {
      toast.error('Failed to load addresses');
    } finally {
      setAddrLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadAddresses();
  }, [token, loadAddresses]);

  useEffect(() => {
    if (user) setInfoForm({ name: user.name || '', phone: user.phone || '' });
  }, [user]);

  // ---------------------------------------------------------------------------
  // Account info
  // ---------------------------------------------------------------------------

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setInfoLoading(true);
    try {
      await api.put('/auth/me', { name: infoForm.name, phone: infoForm.phone });
      await getProfile(); // refresh user in context
      toast.success('Profile updated');
      setEditingInfo(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setInfoLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Password
  // ---------------------------------------------------------------------------

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setPwLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword
      });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Addresses
  // ---------------------------------------------------------------------------

  const handleAddressSubmit = async (formData) => {
    setAddrFormLoading(true);
    try {
      if (editingAddress) {
        await addressService.update(editingAddress.id, formData);
        toast.success('Address updated');
      } else {
        await addressService.create(formData);
        toast.success('Address added');
      }
      setShowAddressForm(false);
      setEditingAddress(null);
      loadAddresses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save address');
    } finally {
      setAddrFormLoading(false);
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = (address) => {
    setConfirm({
      message: `Delete "${address.label}" address for ${address.name}?`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await addressService.delete(address.id);
          toast.success('Address deleted');
          loadAddresses();
        } catch {
          toast.error('Failed to delete address');
        }
      }
    });
  };

  const handleSetDefault = async (id) => {
    try {
      await addressService.setDefault(id);
      toast.success('Default address updated');
      loadAddresses();
    } catch {
      toast.error('Failed to update default address');
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!user) return <div className="loading"><div className="spinner" />Loading…</div>;

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <h1 className="card-title">My Profile</h1>

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 1. Account Info                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Account Information</h3>
          {!editingInfo && (
            <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '13px' }} onClick={() => setEditingInfo(true)}>
              Edit
            </button>
          )}
        </div>

        {!editingInfo ? (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: '#888', width: '80px' }}>Name</span>
              <span style={{ fontWeight: '500' }}>{user.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: '#888', width: '80px' }}>Email</span>
              <span>{user.email}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: '#888', width: '80px' }}>Phone</span>
              <span>{user.phone || <span style={{ color: '#aaa' }}>Not set</span>}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveInfo}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={infoForm.name}
                onChange={e => setInfoForm(p => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                type="tel"
                value={infoForm.phone}
                onChange={e => setInfoForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="Your mobile number"
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={infoLoading}>
                {infoLoading ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingInfo(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Saved Addresses                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Saved Addresses</h3>
          {!showAddressForm && (
            <button
              className="btn btn-primary"
              style={{ padding: '4px 12px', fontSize: '13px' }}
              onClick={() => { setEditingAddress(null); setShowAddressForm(true); }}
            >
              + Add Address
            </button>
          )}
        </div>

        {showAddressForm && (
          <div style={{ background: '#f8f9fa', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 12px' }}>{editingAddress ? 'Edit Address' : 'New Address'}</h4>
            <AddressForm
              initial={editingAddress || {}}
              accountPhone={user.phone}
              onSubmit={handleAddressSubmit}
              onCancel={() => { setShowAddressForm(false); setEditingAddress(null); }}
              loading={addrFormLoading}
              submitLabel={editingAddress ? 'Update Address' : 'Save Address'}
            />
          </div>
        )}

        {addrLoading ? (
          <p style={{ color: '#888' }}>Loading addresses…</p>
        ) : addresses.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '20px 0' }}>
            No saved addresses yet. Add one above.
          </p>
        ) : (
          addresses.map(addr => (
            <AddressCard
              key={addr.id}
              address={addr}
              accountPhone={user.phone}
              onEdit={handleEditAddress}
              onDelete={handleDeleteAddress}
              onSetDefault={handleSetDefault}
            />
          ))
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Change Password                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showPasswordForm ? '16px' : 0 }}>
          <h3 style={{ margin: 0 }}>Change Password</h3>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 12px', fontSize: '13px' }}
            onClick={() => setShowPasswordForm(p => !p)}
          >
            {showPasswordForm ? 'Cancel' : 'Change'}
          </button>
        </div>

        {showPasswordForm && (
          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-input"
                value={pwForm.currentPassword}
                onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                value={pwForm.newPassword}
                onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={pwForm.confirmPassword}
                onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={pwLoading}>
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Logout                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="card">
        <button className="btn btn-danger" onClick={logout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;
