import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authService } from "../services/authService";

export const UserAuthContext = createContext(null);

export const UserAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // UserAuthContext يتعامل فقط مع المستخدم العادي
  // المسؤول له AuthContext منفصل
  
  // دالة للتحقق من وجود مصادقة صالحة (HttpOnly cookies أو localStorage)
  const isAuthenticated = () => {
    // Check for user data (indicates valid session with HttpOnly cookies)
    const userData = localStorage.getItem('client_user_data');
    // Check for admin tokens (admin still uses localStorage tokens)
    const adminToken = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
    return !!(userData || adminToken);
  };

  // Load user data on initial render
  const loadUser = useCallback(async () => {
    try {
      // Cookie-based: just ask backend for current user
      const userData = await authService.getProfile();
      if (userData) {
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
      setUser(null);
    }
    setLoading(false);
  }, []);

  // Sync auth state across tabs via custom event and storage changes of user data
  useEffect(() => {
    const handleAuthEvent = () => loadUser();
    const handleStorageChange = (e) => {
      if (e.key === 'client_user_data' || e.key === null) {
        loadUser();
      }
    };
    window.addEventListener("authStateChanged", handleAuthEvent);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("authStateChanged", handleAuthEvent);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadUser]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (identifier, password) => {
    try {
      // Clear any existing auth state
      setUser(null);
      
      // مسح بيانات المستخدم العادي فقط
      const clientKeys = [ 'client_user_data', 'userData' ];
      clientKeys.forEach(key => localStorage.removeItem(key));
      
      setLoading(true);

      // Call the auth service
      const result = await authService.login(identifier, password);

      if (result && result.success) {
        // Update user state with the returned user data or fetch it
        let userData = result.user || await authService.getProfile();

        // Ensure we have valid user data
        if (userData) {
          setUser(userData);
          setLoading(false);

          // Force a re-render of all components that depend on auth state
          window.dispatchEvent(
            new CustomEvent("authStateChanged", {
              detail: { isAuthenticated: true, user: userData },
            })
          );

          return { success: true, user: userData };
        } else {
          // If we can't get user data, clear the token and throw an error
          throw new Error("فشل تحميل بيانات المستخدم");
        }
      } else {
        throw new Error("فشل تسجيل الدخول: استجابة غير صالحة من الخادم");
      }
    } catch (error) {
      console.error("Login error:", error);
      // Clear any partial auth state on error
      setUser(null);
      setLoading(false);

      // Notify about auth state change
      window.dispatchEvent(
        new CustomEvent("authStateChanged", {
          detail: { isAuthenticated: false, user: null },
        })
      );

      return {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "حدث خطأ أثناء تسجيل الدخول",
      };
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      // Try to log out from the server, but don't fail if it doesn't work
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with local logout even if server logout fails
    } finally {
      // مسح بيانات المستخدم العادي والتوكنات فقط
      const clientKeys = [ 
        'client_user_data', 
        'client_auth_token',
        'client_refresh_token',
        'userData',
        'authToken',
        'token'
      ];
      clientKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`✅ تم مسح بيانات المستخدم العادي: ${key}`);
        }
      });
      
      // التأكد من عدم مسح توكنات المسؤول
      const adminToken = localStorage.getItem('admin_auth_token');
      const adminData = localStorage.getItem('adminData');
      if (adminToken || adminData) {
        console.log('✅ توكنات المسؤول محفوظة - لم يتم مسحها');
      }
      
      // Reset user state
      setUser(null);
      setLoading(false);

      // Notify all components that auth state has changed
      window.dispatchEvent(
        new CustomEvent("authStateChanged", {
          detail: { isAuthenticated: false, user: null },
        })
      );

      console.log("User logged out successfully");
    }
  };

  const checkAuthStatus = () => {
    // Cookie-based: authenticated if we have a user loaded
    if (!user) {
      loadUser();
      return false;
    }
    return true;
  };

  // دالة لتحديث بيانات المستخدم الحالي
  const refreshUser = async () => {
    try {
      const userData = await authService.getProfile();
      if (userData) {
        setUser(userData);
        return userData;
      } else {
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
      setUser(null);
      return null;
    }
  };

  return (
    <UserAuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: checkAuthStatus,
        setUser,
        refreshUser,
      }}
    >
      {!loading && children}
    </UserAuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (!context) {
    throw new Error("useUserAuth must be used within a UserAuthProvider");
  }
  return context;
};
