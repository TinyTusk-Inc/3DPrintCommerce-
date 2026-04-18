/**
 * AddressForm
 * Reusable form for creating or editing a saved address.
 * Features:
 *  - Pincode autofill (India Post API) — fills city + state on 6-digit entry
 *  - "Use account phone" checkbox
 *  - Label selector (Home / Work / Other)
 *
 * Props:
 *  - initial     {object}   Pre-filled values (for edit mode)
 *  - accountPhone {string}  User's account phone (shown as hint)
 *  - onSubmit    {fn}       Called with form data object
 *  - onCancel    {fn}       Called when user cancels
 *  - submitLabel {string}   Button label (default: "Save Address")
 *  - loading     {bool}
 */

import React, { useState, useEffect } from 'react';
import { addressService } from '../services/addressService';

const EMPTY = {
  label: 'Home',
  name: '',
  phone: '',
  use_account_phone: true,
  street: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  is_default: false
};

function AddressForm({ initial = {}, accountPhone = '', onSubmit, onCancel, submitLabel = 'Save Address', loading = false }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [errors, setErrors] = useState({});

  // When initial changes (edit mode), reset form
  useEffect(() => {
    setForm({ ...EMPTY, ...initial });
  }, [initial?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Pincode autofill
  const handlePincodeChange = async (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    set('pincode', val);
    setPincodeError('');

    if (val.length === 6) {
      setPincodeLoading(true);
      const result = await addressService.lookupPincode(val);
      setPincodeLoading(false);
      if (result) {
        setForm(prev => ({ ...prev, pincode: val, city: result.city, state: result.state }));
      } else {
        setPincodeError('Pincode not found — please enter city and state manually');
      }
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name   = 'Full name is required';
    if (!form.street.trim()) e.street = 'Street address is required';
    if (!form.city.trim())   e.city   = 'City is required';
    if (!form.state.trim())  e.state  = 'State is required';
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter a valid 6-digit pincode';
    if (!form.use_account_phone && !form.phone.trim()) e.phone = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      phone: form.use_account_phone ? null : form.phone
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Label */}
      <div className="form-group">
        <label className="form-label">Address Label</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['Home', 'Work', 'Other'].map(l => (
            <button
              key={l}
              type="button"
              onClick={() => set('label', l)}
              style={{
                padding: '6px 16px', borderRadius: '20px', border: '1px solid',
                borderColor: form.label === l ? '#3498db' : '#ddd',
                background: form.label === l ? '#3498db' : '#fff',
                color: form.label === l ? '#fff' : '#333',
                cursor: 'pointer', fontSize: '13px'
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Recipient name */}
      <div className="form-group">
        <label className="form-label">Full Name *</label>
        <input
          className="form-input"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Name of recipient"
        />
        {errors.name && <p style={{ color: '#e74c3c', fontSize: '12px', margin: '4px 0 0' }}>{errors.name}</p>}
      </div>

      {/* Phone */}
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.use_account_phone}
            onChange={e => set('use_account_phone', e.target.checked)}
          />
          <span className="form-label" style={{ margin: 0 }}>
            Use my account phone
            {accountPhone && <span style={{ color: '#888', fontWeight: 'normal', marginLeft: '6px' }}>({accountPhone})</span>}
          </span>
        </label>
        {!form.use_account_phone && (
          <>
            <input
              className="form-input"
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="Phone for delivery / notifications"
            />
            {errors.phone && <p style={{ color: '#e74c3c', fontSize: '12px', margin: '4px 0 0' }}>{errors.phone}</p>}
          </>
        )}
        <p style={{ color: '#888', fontSize: '11px', margin: '4px 0 0' }}>
          The delivery person will call this number if needed.
        </p>
      </div>

      {/* Street */}
      <div className="form-group">
        <label className="form-label">Street Address *</label>
        <input
          className="form-input"
          value={form.street}
          onChange={e => set('street', e.target.value)}
          placeholder="Flat / House no., Building, Street, Area"
        />
        {errors.street && <p style={{ color: '#e74c3c', fontSize: '12px', margin: '4px 0 0' }}>{errors.street}</p>}
      </div>

      {/* Pincode — autofills city + state */}
      <div className="form-group">
        <label className="form-label">
          Pincode *
          {pincodeLoading && <span style={{ color: '#3498db', fontSize: '12px', marginLeft: '8px' }}>Looking up…</span>}
        </label>
        <input
          className="form-input"
          value={form.pincode}
          onChange={handlePincodeChange}
          placeholder="6-digit pincode"
          maxLength={6}
          inputMode="numeric"
          style={{ width: '160px' }}
        />
        {pincodeError && <p style={{ color: '#e67e22', fontSize: '12px', margin: '4px 0 0' }}>{pincodeError}</p>}
        {errors.pincode && <p style={{ color: '#e74c3c', fontSize: '12px', margin: '4px 0 0' }}>{errors.pincode}</p>}
      </div>

      {/* City + State */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div className="form-group">
          <label className="form-label">City *</label>
          <input
            className="form-input"
            value={form.city}
            onChange={e => set('city', e.target.value)}
            placeholder="Auto-filled from pincode"
          />
          {errors.city && <p style={{ color: '#e74c3c', fontSize: '12px', margin: '4px 0 0' }}>{errors.city}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">State *</label>
          <input
            className="form-input"
            value={form.state}
            onChange={e => set('state', e.target.value)}
            placeholder="Auto-filled from pincode"
          />
          {errors.state && <p style={{ color: '#e74c3c', fontSize: '12px', margin: '4px 0 0' }}>{errors.state}</p>}
        </div>
      </div>

      {/* Country (read-only for now) */}
      <div className="form-group">
        <label className="form-label">Country</label>
        <input className="form-input" value={form.country} readOnly style={{ background: '#f8f8f8' }} />
      </div>

      {/* Set as default */}
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={e => set('is_default', e.target.checked)}
          />
          <span className="form-label" style={{ margin: 0 }}>Set as default address</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default AddressForm;
