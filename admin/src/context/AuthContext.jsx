import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as authApi from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('p2g_admin_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('p2g_admin_token') || null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync token and verify session on initial mount
  const checkSession = useCallback(async () => {
    const activeToken = localStorage.getItem('p2g_admin_token');
    if (!activeToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const freshUser = await authApi.getMe();
      // Requirement 7 & 8: Verify user is an ADMIN
      if (freshUser.role !== 'ADMIN') {
        throw new Error('Unauthorized role: Not an administrator.');
      }
      setUser(freshUser);
      localStorage.setItem('p2g_admin_user', JSON.stringify(freshUser));
    } catch (error) {
      console.warn('Session verification failed:', error.message);
      setUser(null);
      setToken(null);
      localStorage.removeItem('p2g_admin_token');
      localStorage.removeItem('p2g_admin_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();

    // Listen for session expiry event from apiClient interceptor
    const handleSessionExpired = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('p2g_admin_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('p2g_admin_session_expired', handleSessionExpired);
    };
  }, [checkSession]);

  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    if (!data?.token || !data?.user) {
      throw new Error('Invalid response received from authentication server.');
    }

    // Role check
    if (data.user.role !== 'ADMIN') {
      throw new Error('Access denied: This dashboard is reserved strictly for store administrators.');
    }

    localStorage.setItem('p2g_admin_token', data.token);
    localStorage.setItem('p2g_admin_user', JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('p2g_admin_token');
    localStorage.removeItem('p2g_admin_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const updateProfile = async (updateData) => {
    const updated = await authApi.updateProfile(updateData);
    setUser(updated);
    localStorage.setItem('p2g_admin_user', JSON.stringify(updated));
    return updated;
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    return await authApi.changePassword({ currentPassword, newPassword });
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && user?.role === 'ADMIN',
    isLoading,
    login,
    logout,
    updateProfile,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
