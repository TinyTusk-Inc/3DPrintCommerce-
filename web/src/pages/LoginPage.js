import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/index';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error: authError } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setSuccess('');

    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }

    const result = await login(formData.email, formData.password);
    if (result.success) {
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } else {
      setError(result.error || 'Login failed');
    }
  };

  // Check for OAuth errors passed back via query string
  const params = new URLSearchParams(window.location.search);
  const oauthError = params.get('error');

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto' }}>
      <div className="card">
        <h2 className="card-title" style={{ textAlign: 'center' }}>Login</h2>

        {oauthError && (
          <div className="alert alert-danger">
            {oauthError === 'google_failed' && 'Google sign-in failed. Please try again.'}
            {oauthError === 'facebook_failed' && 'Facebook sign-in failed. Please try again.'}
            {!['google_failed', 'facebook_failed'].includes(oauthError) && 'Sign-in failed. Please try again.'}
          </div>
        )}
        {error && <div className="alert alert-danger">{error}</div>}
        {authError && <div className="alert alert-danger">{authError}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="form-input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
            style={{ marginBottom: '10px' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Social login divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <hr style={{ flex: 1, borderColor: '#ddd' }} />
          <span style={{ padding: '0 12px', color: '#888', fontSize: '13px' }}>or continue with</span>
          <hr style={{ flex: 1, borderColor: '#ddd' }} />
        </div>

        {/* Google sign-in */}
        <a
          href={`${API_URL}/api/auth/google`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '10px',
            marginBottom: '10px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            background: '#fff',
            color: '#333',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Sign in with Google
        </a>

        {/* Facebook sign-in */}
        <a
          href={`${API_URL}/api/auth/facebook`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            padding: '10px',
            marginBottom: '20px',
            border: '1px solid #1877F2',
            borderRadius: '6px',
            background: '#1877F2',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: '500',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Sign in with Facebook
        </a>

        <p style={{ textAlign: 'center', marginTop: '10px' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#3498db' }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
