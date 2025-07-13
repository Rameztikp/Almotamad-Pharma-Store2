import React from 'react';
import { Navigate } from 'react-router-dom';

// Lazy load the admin dashboard to improve initial load performance
const DashboardPage = React.lazy(() => import('./pages/admin/DashboardPage'));

// Admin route wrapper component
const AdminRoute = ({ children }) => {
  // TODO: Replace with actual authentication check
  // This should check if the user is authenticated and has admin role
  const isAuthenticated = true; // Replace with actual auth check
  const isAdmin = true; // Replace with actual admin check

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    // Redirect to home or show access denied if not admin
    return <Navigate to="/" replace />;
  }

  return children;
};

// Define admin routes
export const adminRoutes = [
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <React.Suspense fallback={<div>جاري التحميل...</div>}>
          <DashboardPage />
        </React.Suspense>
      </AdminRoute>
    ),
  },
];
