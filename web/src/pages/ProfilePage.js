import React, { useState } from 'react';
import { useAuth } from '../hooks';

function ProfilePage() {
  const { user, loading, error, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [message, setMessage] = useState('');
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editData)
      });
      if (response.ok) {
        setMessage('✓ Profile updated successfully');
        setIsEditing(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to update profile');
      }
    } catch (err) {
      setMessage('Error updating profile');
      console.error(err);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          old_password: passwordData.oldPassword,
          new_password: passwordData.newPassword
        })
      });
      if (response.ok) {
        setMessage('✓ Password changed successfully');
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Invalid current password');
      }
    } catch (err) {
      setMessage('Error changing password');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div>Loading...</div>;
  }

  return (
    <div>
      <h1 className="card-title">Profile</h1>

      {message && (
        <div className={`alert ${message.includes('Error') || message.includes('Invalid') ? 'alert-danger' : 'alert-success'}`}>
          {message}
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div className="card">
          {!isEditing ? (
            <>
              <h3 className="card-title">Your Information</h3>
              <div className="mb-3" style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                <strong>Name:</strong> {user?.name}
              </div>
              <div className="mb-3" style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
                <strong>Email:</strong> {user?.email}
              </div>
              <div className="mb-3">
                <strong>Role:</strong> <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-primary" onClick={() => {
                  setEditData({ name: user?.name, email: user?.email });
                  setIsEditing(true);
                }}>
                  ✎ Edit Profile
                </button>
                <button className="btn btn-warning" onClick={() => setShowPasswordForm(!showPasswordForm)}>
                  🔑 Change Password
                </button>
                <button className="btn btn-danger" onClick={logout}>
                  🚪 Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="card-title">Edit Profile</h3>
              <form onSubmit={handleSaveProfile}>
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editData.name}
                    onChange={handleEditChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editData.email}
                    onChange={handleEditChange}
                    className="form-control"
                    required
                    disabled
                  />
                </div>
                <button type="submit" className="btn btn-success">Save Changes</button>
                <button type="button" className="btn" onClick={() => setIsEditing(false)}>Cancel</button>
              </form>
            </>
          )}
        </div>

        {showPasswordForm && (
          <div className="card" style={{ marginTop: '20px' }}>
            <h3 className="card-title">Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  name="oldPassword"
                  value={passwordData.oldPassword}
                  onChange={handlePasswordChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="form-control"
                  required
                />
              </div>
              <button type="submit" className="btn btn-success">Update Password</button>
              <button type="button" className="btn" onClick={() => setShowPasswordForm(false)}>Cancel</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
