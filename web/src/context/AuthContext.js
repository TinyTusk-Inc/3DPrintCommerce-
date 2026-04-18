import React, { createContext, useState, useCallback, useEffect } from 'react';

/**
 * AuthContext - Manages user authentication state
 * Stores JWT token and user info
 */
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Login function
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      const newToken = data.token;
      
      setToken(newToken);
      setUser(data.user);
      localStorage.setItem('authToken', newToken);
      
      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (email, password, name) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await response.json();
      const newToken = data.token;
      
      setToken(newToken);
      setUser(data.user);
      localStorage.setItem('authToken', newToken);
      
      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  }, []);

  /**
   * loginWithToken - Used by OAuthCallbackPage after a social login redirect.
   * Decodes the JWT payload to extract user info without an extra API call.
   */
  const loginWithToken = useCallback((newToken) => {
    try {
      // Decode the JWT payload (base64url middle segment) — no signature check needed here,
      // the server already validated it before issuing the redirect.
      const payloadBase64 = newToken.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));

      const userFromToken = {
        id: payload.id,
        email: payload.email,
        is_admin: payload.is_admin,
        is_seller: payload.is_seller
      };

      setToken(newToken);
      setUser(userFromToken);
      localStorage.setItem('authToken', newToken);

      return { success: true, user: userFromToken };
    } catch (err) {
      console.error('[AuthContext] loginWithToken failed:', err);
      return { success: false, error: 'Invalid token received' };
    }
  }, []);

  // Get current user profile
  const getProfile = useCallback(async () => {
    if (!token) return null;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, [token]);

  // Auto-fetch user profile when token changes
  useEffect(() => {
    if (token && !user) {
      getProfile();
    }
  }, [token, user, getProfile]);

  const isAuthenticated = !!token;
  const isAdmin = user?.is_admin === true;

  const value = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    loading,
    error,
    login,
    loginWithToken,
    register,
    logout,
    getProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
