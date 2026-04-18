/**
 * OAuthCallbackPage
 *
 * The backend redirects here after a successful Google / Facebook OAuth flow:
 *   /oauth-callback?token=<jwt>
 *
 * This page reads the token from the URL, stores it via AuthContext,
 * then redirects the user to the home page (or wherever they came from).
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/index';

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setError('No token received. Please try signing in again.');
      return;
    }

    // Hand the token to AuthContext so it's stored and the user is set
    const result = loginWithToken(token);
    if (result && result.success === false) {
      setError(result.error || 'Sign-in failed. Please try again.');
    } else {
      // If the social provider didn't share an email (rare Facebook edge case),
      // send the user to their profile to add one before they can receive
      // order confirmation and notification emails.
      if (!result.user?.email) {
        navigate('/profile?prompt=add-email', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [loginWithToken, navigate]);

  if (error) {
    return (
      <div style={{ maxWidth: '400px', margin: '80px auto', textAlign: 'center' }}>
        <div className="card">
          <h3>Sign-in failed</h3>
          <p className="alert alert-danger">{error}</p>
          <a href="/login" className="btn btn-primary">Back to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', textAlign: 'center' }}>
      <div className="card">
        <p>Signing you in…</p>
      </div>
    </div>
  );
}

export default OAuthCallbackPage;
