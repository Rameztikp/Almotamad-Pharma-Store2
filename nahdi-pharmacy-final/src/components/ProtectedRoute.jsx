import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useShop } from '../context/useShop';
import { toast } from 'react-hot-toast';

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useShop();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      toast.error('يجب تسجيل الدخول أولاً للمتابعة إلى صفحة الدفع');
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to the login page, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
