import React from 'react';
import { Navigate } from 'react-router-dom';

// Lazy load the admin dashboard to improve initial load performance
const DashboardPage = React.lazy(() => import('./pages/admin/DashboardPage'));
const BannersManager = React.lazy(() => import('./pages/admin/BannersManager'));
const SettingsRoutes = React.lazy(() => import('./routes/user/settingsRoutes'));
const TestPushPage = React.lazy(() => import('./pages/TestPushPage'));

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
// Protected route for authenticated users
const ProtectedRoute = ({ children }) => {
  // TODO: Replace with actual authentication check
  const isAuthenticated = true; // Replace with actual auth check

  if (!isAuthenticated) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  return children;
};

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
  {
    path: '/admin/banners',
    element: (
      <AdminRoute>
        <React.Suspense fallback={<div>جاري التحميل...</div>}>
          <BannersManager />
        </React.Suspense>
      </AdminRoute>
    ),
  },
];

// Export default routes for the app
export default [
  {
    path: '/settings/*',
    element: (
      <ProtectedRoute>
        <React.Suspense fallback={<div>جاري التحميل...</div>}>
          <SettingsRoutes />
        </React.Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/test-push',
    element: (
      <ProtectedRoute>
        <React.Suspense fallback={<div>جاري التحميل...</div>}>
          <TestPushPage />
        </React.Suspense>
      </ProtectedRoute>
    ),
  },
];

// Export all routes for reference
export const userRoutes = [
  {
    path: '/settings/*',
    element: (
      <React.Suspense fallback={<div>جاري التحميل...</div>}>
        <SettingsRoutes />
      </React.Suspense>
    ),
  },
];
