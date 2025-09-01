import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthProvider';
import { toast } from 'react-hot-toast';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading: isLoading, isAuthenticated } = useUserAuth();
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated()) {
        // إظهار رسالة فقط إذا لم نكن في صفحة تسجيل الدخول
        if (!location.pathname.includes('/login')) {
          const isAdminRoute = location.pathname.startsWith('/admin');
          const message = isAdminRoute ? 
            'يجب تسجيل الدخول كمسؤول للوصول إلى لوحة التحكم' : 
            'يجب تسجيل الدخول أولاً للوصول إلى هذه الصفحة';
          toast.error(message);
        }
      } else if (requiredRole && user?.role !== requiredRole) {
        const message = requiredRole === 'admin' ? 
          'ليس لديك صلاحيات مسؤول. يجب تسجيل الدخول كمسؤول' : 
          'ليس لديك صلاحية الوصول إلى هذه الصفحة';
        toast.error(message);
      }
      setInitialCheckDone(true);
    }
  }, [user, isLoading, isAuthenticated, location.pathname, requiredRole]);

  // Show loading spinner while checking auth state
  if (isLoading || !initialCheckDone) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Check authentication and role if required
  const isAuthorized = isAuthenticated() && (!requiredRole || user?.role === requiredRole);

  if (!isAuthorized) {
    // إعادة توجيه ذكية بناءً على نوع الصفحة
    const isAdminRoute = location.pathname.startsWith('/admin');
    const loginPath = isAdminRoute ? '/admin/login' : '/login';
    
    // سجل فقط في وضع التطوير
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 ProtectedRoute: إعادة توجيه إلى ${loginPath}`);
    }
    
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // If we have a user and they're authorized, render the children
  return children;
};

export default ProtectedRoute;
