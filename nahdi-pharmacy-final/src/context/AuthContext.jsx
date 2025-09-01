import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { adminLogin } from "../services/adminApi";
import ApiService from "../services/api";
import { Navigate, useLocation } from "react-router-dom";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state by fetching profile via cookies
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        if (!window.location.pathname.startsWith("/admin")) {
          setAdmin(null);
          setLoading(false);
          return;
        }
        const me = await ApiService.get("/auth/admin/profile");
        const user = me?.user || me?.data?.user || me;
        if (mounted && user && (user.role === 'admin' || user.role === 'super_admin')) {
          setAdmin(user);
        } else if (mounted) {
          setAdmin(null);
        }
      } catch (_) {
        if (mounted) setAdmin(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  const login = async (email, password, isAdmin = false) => {
    try {
      if (isAdmin) {
        const response = await adminLogin(email, password);
        if (response?.success) {
          // Token cookies are set by backend; set admin state from returned user
          const user = response.user;
          setAdmin(user);
          // Optional: persist admin user (not tokens) for UX
          localStorage.setItem("adminData", JSON.stringify(user));
          return { success: true };
        }
        return { success: false, message: response?.message || "فشل تسجيل الدخول" };
      }
      // Handle regular user login here if needed
      return { success: false, message: "نوع الحساب غير مدعوم" };
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى لاحقًا";
      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const logout = useCallback(async () => {
    try {
      // Logout from both admin and regular user sessions
      await ApiService.post('/auth/admin/logout', {}).catch(() => {});
      await ApiService.post('/auth/logout', {}).catch(() => {});
    } catch (_) {}
    // Clear admin data from localStorage
    localStorage.removeItem('adminData');
    setAdmin(null);
    return true;
  }, []);

  const isAuthenticated = useCallback(() => {
    // Consider authenticated if we have admin user in state while on admin routes
    if (window.location.pathname.startsWith("/admin")) {
      return !!admin;
    }
    return false;
  }, [admin]);

  return (
    <AuthContext.Provider
      value={{
        admin,
        login,
        logout,
        isAuthenticated,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
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
