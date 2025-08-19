import React from 'react';
import { useLocation } from 'react-router-dom';
import InteractiveNavbar from './InteractiveNavbar';
import AdminNavbar from './admin/AdminNavbar';

const AppNavbar = ({ toggleSidebar }) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return <AdminNavbar toggleSidebar={toggleSidebar} />;
  }
  
  return <InteractiveNavbar />;
};

export default AppNavbar;
