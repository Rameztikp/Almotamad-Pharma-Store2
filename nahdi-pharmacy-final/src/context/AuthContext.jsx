import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminLogin } from '../services/adminApi';
import { Navigate, useLocation } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const adminData = localStorage.getItem('adminData');
    
    if (token && adminData) {
      setAdmin(JSON.parse(adminData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await adminLogin(email, password);
      if (response && response.token) {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('adminData', JSON.stringify(response.user));
        setAdmin(response.user);
        return { success: true };
      }
      return { success: false, message: response?.message || 'Login failed' };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please check your credentials.'
      };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('adminData');
    setAdmin(null);
    return true;
  }, []);

  const isAuthenticated = useCallback(() => {
    return !!localStorage.getItem('authToken');
  }, []);

  return (
    <AuthContext.Provider value={{ 
      admin, 
      login, 
      logout, 
      isAuthenticated, 
      loading 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};
