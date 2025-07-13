import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

export const UserAuthContext = createContext(null);

export const UserAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user data on initial render
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        // Set the token in the API service before making the request
        const userData = await authService.getProfile();
        setUser(userData);
      } catch (error) {
        console.error('Failed to load user data:', error);
        localStorage.removeItem('authToken');
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (identifier, password) => {
    try {
      const result = await authService.login(identifier, password);
      if (result && result.token) {
        // Store the token in localStorage
        localStorage.setItem('authToken', result.token);
        // Set the token in the API service
        if (result.user) {
          setUser(result.user);
        } else {
          // If user data is not in the response, fetch it
          await loadUser();
        }
        return { success: true };
      }
      return { success: false, message: 'فشل تسجيل الدخول' };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.message || 'حدث خطأ أثناء تسجيل الدخول' 
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem('authToken');
  };

  return (
    <UserAuthContext.Provider 
      value={{ 
        user,
        loading,
        login,
        logout,
        isAuthenticated,
        setUser
      }}
    >
      {!loading && children}
    </UserAuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
};
