import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ShopProvider } from "./context/ShopContext";
import { AuthProvider } from "./context/AuthContext";
import { UserAuthProvider } from "./context/UserAuthContext";
import { lazy, Suspense } from "react";
import AppNavbar from "./components/AppNavbar";
import HomePage from "./pages/HomePage";
import InteractiveProductsPage from "./components/InteractiveProductsPage";
import InteractiveCartPage from "./pages/InteractiveCartPage";
// Load restored full checkout page
const InteractiveCheckoutPage = lazy(() => import("./pages/InteractiveCheckoutPage"));
import OrderTrackingPage from "./components/OrderTrackingPage";
import RegisterPage from "./pages/RegisterPage";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import ProductCardPreview from "./pages/ProductCardPreview";
import withWholesaleAccess from "./components/wholesale/withWholesaleAccess";
import WholesaleHomePage from "./pages/WholesaleHomePage";
import UpgradeToWholesaleForm from "./components/wholesale/UpgradeToWholesaleForm";
import MyAccount from "./pages/MyAccount";
import MyOrdersPage from "./pages/MyOrdersPage";
import CategoryRoute from "./pages/CategoryRoute";

// Wrap the WholesaleHomePage with the withWholesaleAccess HOC
const WholesaleHomePageWithAccess = withWholesaleAccess(WholesaleHomePage);

// Lazy load routes
const AdminRoutes = lazy(() => import("./routes/adminRoutes"));
const UserRoutes = lazy(() => import("./routes.jsx"));
import "./App.css";

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

function FullyInteractiveApp() {
  // Clear any conflicting auth data on app start
  useEffect(() => {
    // Only clear admin data if we're specifically on regular user routes
    // Don't clear admin data when accessing admin routes or login page
    const currentPath = window.location.pathname;
    if (currentPath === "/" || currentPath.startsWith("/products") || currentPath.startsWith("/wholesale")) {
      // Only clear admin data when on main store pages, not admin pages
      const isAdminLoggedIn = localStorage.getItem("adminToken") || localStorage.getItem("admin_token");
      if (!isAdminLoggedIn) {
        localStorage.removeItem("adminData");
      }
    }
  }, []);

  return (
    <Router>
      <ShopProvider>
        <AuthProvider>
          <UserAuthProvider>
            <div className="min-h-screen bg-gray-50">
              <AppNavbar />
              <main>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route
                    path="/products"
                    element={<InteractiveProductsPage productType="retail" />}
                  />
                  {/* Pretty category URLs redirect to products with query param */}
                  <Route path="/category/:slug" element={<CategoryRoute />} />
                  <Route
                    path="/wholesale"
                    element={<WholesaleHomePageWithAccess />}
                  />
                  <Route
                    path="/wholesale/products"
                    element={
                      <InteractiveProductsPage productType="wholesale" />
                    }
                  />
                  <Route
                    path="/wholesale/upgrade"
                    element={
                      <ProtectedRoute>
                        <UpgradeToWholesaleForm />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/cart" element={<InteractiveCartPage />} />

                  {/* Protected Routes */}
                  <Route
                    path="/account"
                    element={
                      <ProtectedRoute>
                        <MyAccount />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <Suspense fallback={<LoadingFallback />}>
                          <InteractiveCheckoutPage />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/my-orders"
                    element={
                      <ProtectedRoute>
                        <MyOrdersPage />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* User Routes */}
                  <Route
                    path="/settings/*"
                    element={
                      <Suspense fallback={<LoadingFallback />}>
                        <UserRoutes />
                      </Suspense>
                    }
                  />

                  <Route path="/track-order" element={<OrderTrackingPage />} />
                  <Route path="/orders/tracking" element={<OrderTrackingPage />} />
                  <Route
                    path="/login"
                    element={
                      <Navigate
                        to="/"
                        state={{ showAuthModal: true, isLoginView: true }}
                        replace
                      />
                    }
                  />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route
                    path="/preview/cards"
                    element={<ProductCardPreview />}
                  />

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
          </UserAuthProvider>
        </AuthProvider>
      </ShopProvider>
    </Router>
  );
}

export default FullyInteractiveApp;
