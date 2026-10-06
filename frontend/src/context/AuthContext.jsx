import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient, { subscribeToSessionExpired } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('champions_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);

  // Validate session on boot if token exists
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('champions_token');
      if (token) {
        try {
          const res = await apiClient.get('/auth/me', { suppressErrorToast: true });
          setUser(res.data);
          localStorage.setItem('champions_user', JSON.stringify(res.data));
        } catch {
          // If token was invalid and refresh failed, user is cleared by client interceptor
        }
      }
      setIsLoading(false);
    };

    initAuth();

    // Listen for silent refresh failure
    const unsubscribe = subscribeToSessionExpired(() => {
      setUser(null);
      setSessionExpiredOpen(true);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const res = await apiClient.post(
      '/auth/login',
      { email: cleanEmail, password },
      { suppressErrorToast: true }
    );

    const { accessToken, refreshToken, user: userData } = res.data;

    localStorage.setItem('champions_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('champions_refresh_token', refreshToken);
    }
    localStorage.setItem('champions_user', JSON.stringify(userData));

    setUser(userData);
    return userData;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('champions_refresh_token');
    try {
      await apiClient.post('/auth/logout', { refreshToken }, { suppressErrorToast: true });
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('champions_token');
      localStorage.removeItem('champions_refresh_token');
      localStorage.removeItem('champions_user');
      setUser(null);
    }
  };

  const logoutAll = async () => {
    try {
      await apiClient.post('/auth/logout-all', {}, { suppressErrorToast: true });
    } finally {
      localStorage.removeItem('champions_token');
      localStorage.removeItem('champions_refresh_token');
      localStorage.removeItem('champions_user');
      setUser(null);
    }
  };

  const hasRole = (allowedRoles) => {
    if (!user || !user.role) return false;
    if (!allowedRoles || allowedRoles.length === 0) return true;
    return allowedRoles.includes(user.role);
  };

  const closeSessionExpired = () => {
    setSessionExpiredOpen(false);
  };

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    logout,
    logoutAll,
    hasRole,
    sessionExpiredOpen,
    closeSessionExpired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
