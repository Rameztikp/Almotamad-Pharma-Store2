import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminLayout from '../components/admin/AdminLayout';

// Lazy load admin pages
const LoginPage = lazy(() => import('../pages/admin/LoginPage'));
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage'));
const WholesaleProductsPage = lazy(() => import('../pages/admin/products/WholesaleProducts'));
const RetailProductsPage = lazy(() => import('../pages/admin/products/RetailProducts'));
const UsersPage = lazy(() => import('../pages/admin/UsersPage'));
const CouponsPage = lazy(() => import('../pages/admin/CouponsPage'));
const WholesaleCustomersPage = lazy(() => import('../pages/admin/WholesaleCustomersPage'));
const RetailCustomersPage = lazy(() => import('../pages/admin/RetailCustomersPage'));
const WholesaleOrdersPage = lazy(() => import('../pages/admin/WholesaleOrdersPage'));
const RetailOrdersPage = lazy(() => import('../pages/admin/RetailOrdersPage'));

// Inventory Management
const InventoryManagementPage = lazy(() => import('../pages/admin/inventory/InventoryManagementPage'));
const SupplierBalancesPage = lazy(() => import('../pages/admin/inventory/SupplierBalancesPage'));
const TransactionHistory = lazy(() => import('../components/admin/inventory/TransactionHistory'));

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <AdminLayout>{children}</AdminLayout>;
};

// Admin routes component
const AdminRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public routes */}
        <Route path="login" element={<LoginPage />} />
        
        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="dashboard" replace />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        
        {/* Products */}
        <Route path="products">
          <Route
            index
            element={
              <ProtectedRoute>
                <Navigate to="wholesale" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="wholesale"
            element={
              <ProtectedRoute>
                <WholesaleProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="retail"
            element={
              <ProtectedRoute>
                <RetailProductsPage />
              </ProtectedRoute>
            }
          />
        </Route>
        
        {/* Inventory Management */}
        <Route path="inventory">
          <Route
            index
            element={
              <ProtectedRoute>
                <InventoryManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="suppliers"
            element={
              <ProtectedRoute>
                <SupplierBalancesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="transactions/:productId"
            element={
              <ProtectedRoute>
                <TransactionHistory />
              </ProtectedRoute>
            }
          />
        </Route>
        
        {/* Customers */}
        <Route path="customers">
          <Route
            index
            element={
              <ProtectedRoute>
                <Navigate to="wholesale" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="wholesale"
            element={
              <ProtectedRoute>
                <WholesaleCustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="retail"
            element={
              <ProtectedRoute>
                <RetailCustomersPage />
              </ProtectedRoute>
            }
          />
        </Route>
        
        {/* Orders */}
        <Route path="orders">
          <Route
            index
            element={
              <ProtectedRoute>
                <Navigate to="wholesale" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="wholesale"
            element={
              <ProtectedRoute>
                <WholesaleOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="retail"
            element={
              <ProtectedRoute>
                <RetailOrdersPage />
              </ProtectedRoute>
            }
          />
        </Route>
        
        {/* Users */}
        <Route
          path="users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        
        {/* Coupons */}
        <Route
          path="coupons"
          element={
            <ProtectedRoute>
              <CouponsPage />
            </ProtectedRoute>
          }
        />
        
        {/* Redirect any other admin routes to dashboard if authenticated, or to login if not */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Navigate to="/admin/dashboard" replace />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default AdminRoutes;
