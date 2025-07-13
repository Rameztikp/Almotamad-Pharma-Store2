import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ShopProvider } from './context/ShopContext';
import { AuthProvider } from './context/AuthContext';
import { UserAuthProvider } from './context/UserAuthContext';
import { lazy, Suspense } from 'react';
import InteractiveNavbar from './components/InteractiveNavbar';
import HomePage from './components/HomePage';
import InteractiveProductsPage from './components/InteractiveProductsPage';
import InteractiveCartPage from './components/InteractiveCartPage';
import InteractiveCheckoutPage from './components/InteractiveCheckoutPage';
import OrderTrackingPage from './components/OrderTrackingPage';
import RegisterPage from './components/RegisterPage';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ProductCardPreview from './pages/ProductCardPreview';
import WholesaleHomePage from './pages/WholesaleHomePage';

// Lazy load admin routes
const AdminRoutes = lazy(() => import('./routes/adminRoutes'));
import './App.css';

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

function FullyInteractiveApp() {
  return (
    <Router>
      <AuthProvider>
        <UserAuthProvider>
          <ShopProvider>
            <div className="min-h-screen bg-gray-50">
              <InteractiveNavbar />
              <main>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/products" element={<InteractiveProductsPage />} />
                  <Route path="/cart" element={<InteractiveCartPage />} />
                  
                  {/* Protected Routes */}
                  <Route 
                    path="/checkout" 
                    element={
                      <ProtectedRoute>
                        <InteractiveCheckoutPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route path="/track-order" element={<OrderTrackingPage />} />
                  <Route path="/login" element={<Navigate to="/" state={{ showAuthModal: true, isLoginView: true }} replace />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/preview/cards" element={<ProductCardPreview />} />
                  
                  {/* Wholesale Routes */}
                  <Route path="/wholesale" element={<WholesaleHomePage />} />
                  
                  {/* Admin Routes */}
                  <Route 
                    path="/admin/*" 
                    element={
                      <Suspense fallback={<LoadingFallback />}>
                        <AdminRoutes />
                      </Suspense>
                    } 
                  />
                  
                  {/* 404 Route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
              <Toaster position="bottom-right" />
            </div>
          </ShopProvider>
        </UserAuthProvider>
      </AuthProvider>
    </Router>
  );
}

export default FullyInteractiveApp;
