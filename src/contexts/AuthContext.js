import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../lib/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Use dynamic API base URL from config
axios.defaults.baseURL = API_BASE_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password, selectedService = null, isAdminLogin = false) => {
    try {
      const requestBody = { email, password };
      if (selectedService) {
        requestBody.selectedService = selectedService;
      }
      if (isAdminLogin) {
        requestBody.isAdminLogin = true;
      }
      const response = await axios.post('/auth/login', requestBody);
      
      // Backend returns tokens: { accessToken, refreshToken } and user
      const { tokens, user: userData } = response.data;
      const newToken = tokens?.accessToken || tokens?.token || response.data.token;
      const refreshToken = tokens?.refreshToken;
      
      if (!newToken) {
        throw new Error('No token received from server');
      }
      
      // Store in localStorage first
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      
      // Set axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      // Update state
      setToken(newToken);
      setUser(userData);
      setLoading(false);
      
      return { success: true, user: userData, token: newToken };
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Login failed';
      const messageDE = error.response?.data?.messageDE;
      const accountLocked = error.response?.data?.accountLocked;
      const remainingMinutes = error.response?.data?.remainingMinutes;
      return {
        success: false,
        error: message,
        message: message,
        messageDE: messageDE,
        accountLocked: accountLocked,
        remainingMinutes: remainingMinutes
      };
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await axios.post('/auth/register', userData);
      
      const { token: newToken, user: newUser } = response.data;
      
      setToken(newToken);
      setUser(newUser);
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      toast.success('Registration successful!');
      return { success: true, user: newUser };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    delete axios.defaults.headers.common['Authorization'];
    // Toast message is handled by calling component
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await axios.post('/auth/refresh', { refreshToken });
      const { tokens } = response.data;
      const newToken = tokens?.accessToken || response.data.token;
      const newRefreshToken = tokens?.refreshToken;
      
      if (!newToken) {
        throw new Error('No token received from server');
      }
      
      setToken(newToken);
      localStorage.setItem('token', newToken);
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return newToken;
    } catch (error) {
      logout();
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await axios.post('/auth/forgot-password', { email });
      toast.success('Password reset email sent!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      const response = await axios.post('/auth/reset-password', { token, password });
      toast.success('Password reset successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password reset failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const isAuthenticated = () => {
    return !!user && !!token;
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    refreshToken,
    forgotPassword,
    resetPassword,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    isUser: user?.role === 'user',
    isPartner: user?.role === 'partner',
    isSuperAdmin: user?.role === 'superadmin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};