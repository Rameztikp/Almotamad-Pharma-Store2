import React from 'react';
import { useLocation } from 'react-router-dom';
import InteractiveNavbar from './InteractiveNavbar';
import AdminNavbar from './admin/AdminNavbar';

const AppNavbar = ({ toggleSidebar }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdminLoginRoute = location.pathname === '/admin/login';

  // Don't show AdminNavbar on login page
  if (isAdminRoute && !isAdminLoginRoute) {
    // Check if admin is authenticated before showing navbar
    const adminToken = localStorage.getItem('admin_token') || 
                      localStorage.getItem('adminToken') || 
                      localStorage.getItem('admin_access_token');
    
    if (adminToken) {
      return <AdminNavbar toggleSidebar={toggleSidebar} />;
    }
  }
  
  // Show InteractiveNavbar for non-admin routes or when admin not authenticated
  if (!isAdminRoute) {
    return <InteractiveNavbar />;
  }
  
  // Don't show any navbar for admin login page or unauthenticated admin pages
  return null;
};

export default AppNavbar;
