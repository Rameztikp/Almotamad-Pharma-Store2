import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import notificationService from '../services/notificationService';

const UserAuthContext = createContext(null);

export const UserAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Helper function to check authentication status using cookies
  const getCookie = useCallback((name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }, []);

  const isAuthenticated = useCallback(() => {
    return getCookie('client_auth_status') === 'authenticated';
  }, [getCookie]);

  // Initialize auth state by checking cookies and fetching profile
  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated via cookies
      if (isAuthenticated()) {
        try {
          // Try to get user profile from server
          const userProfile = await authService.getProfile();
          if (userProfile) {
            setUser(userProfile);
            
            // Initialize notifications for authenticated user
            await notificationService.initializeForAuthenticatedUser();
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
    } finally {
      setAuthChecked(true);
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Initialize auth state on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Listen for auth status changes
  useEffect(() => {
    const handleAuthChange = () => {
      checkAuthStatus();
    };

    // Listen for custom auth events
    window.addEventListener('auth-status-changed', handleAuthChange);
    
    // Listen for cookie changes (polling fallback)
    const interval = setInterval(() => {
      const currentAuthStatus = isAuthenticated();
      const hasUser = !!user;
      
      // If auth status changed, refresh
      if (currentAuthStatus !== hasUser) {
        checkAuthStatus();
      }
    }, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener('auth-status-changed', handleAuthChange);
      clearInterval(interval);
    };
  }, [checkAuthStatus, isAuthenticated, user]);

  const login = async (identifier, password) => {
    try {
      setLoading(true);
      const response = await authService.login(identifier, password);
      
      // After successful login, check auth status to get user data
      await checkAuthStatus();
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('auth-status-changed'));
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Clean up notifications before logout
      await notificationService.cleanupOnLogout();
      
      // Logout from server
      await authService.logout();
      
      // Clear user state
      setUser(null);
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('auth-status-changed'));
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local state
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const refreshAuth = useCallback(async () => {
    await checkAuthStatus();
  }, [checkAuthStatus]);

  const value = {
    user,
    authChecked,
    loading,
    isAuthenticated: isAuthenticated(),
    login,
    logout,
    refreshAuth,
  };

  return (
    <UserAuthContext.Provider value={value}>
      {children}
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

export default UserAuthProvider;
