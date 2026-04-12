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
  const isAdmin = user?.role === 'admin';

  const value = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    loading,
    error,
    login,
    register,
    logout,
    getProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
