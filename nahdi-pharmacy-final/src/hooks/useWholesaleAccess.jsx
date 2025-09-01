import { useState, useCallback } from 'react';
import { useUserAuth } from '../context/UserAuthProvider';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ApiService from '../services/api';

export const useWholesaleAccess = () => {
  const { user, isAuthenticated } = useUserAuth();
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  // Check wholesale verification status from the backend
  const checkVerificationStatus = useCallback(async () => {
    if (!isAuthenticated() || !user) {
      return { hasAccess: false, action: 'login' };
    }

    // Check local user data first
    if (user.wholesale_access && user.isActive) {
      return { hasAccess: true };
    }

    try {
      const response = await ApiService.get('/wholesale/status');
      
      if (response?.status === 'approved' && response?.isActive) {
        return { hasAccess: true };
      } else if (response?.status === 'pending') {
        return { 
          hasAccess: false, 
          action: 'pending',
          message: 'طلب الترقية قيد المراجعة. سيتم إشعارك عند تفعيل حساب الجملة الخاص بك.'
        };
      } else if (response?.status === 'rejected') {
        return {
          hasAccess: false,
          action: 'rejected',
          message: response?.reason || 'تم رفض طلب الترقية الخاص بك.'
        };
      }
      
      // If no status or not approved, show upgrade prompt
      return { 
        hasAccess: false, 
        action: 'upgrade',
        message: 'يرجى ترقية حسابك إلى حساب جملة للوصول إلى هذه الميزة.'
      };
      
    } catch (error) {
      console.error('Error checking verification status:', error);
      // Fallback to local user data if API fails
      if (user.wholesale_access && user.isActive) {
        return { hasAccess: true };
      } else if (user.accountType === 'wholesale' && !user.isActive) {
        return { 
          hasAccess: false, 
          action: 'pending',
          message: 'طلب الترقية قيد المراجعة. سيتم إشعارك عند تفعيل حساب الجملة الخاص بك.'
        };
      }
      
      return { 
        hasAccess: false, 
        action: 'upgrade',
        message: 'يرجى ترقية حسابك إلى حساب جملة للوصول إلى هذه الميزة.'
      };
    }
  }, [user, isAuthenticated]);
  
  // Check if user can access wholesale features
  const checkWholesaleAccess = useCallback(async (showNotification = true) => {
    if (!isAuthenticated() || !user) {
      if (showNotification) {
        toast.error('يجب تسجيل الدخول أولاً للوصول إلى هذه الصفحة', {
          position: 'top-center',
          className: 'rtl text-right',
          style: {
            background: '#FEE2E2',
            color: '#991B1B',
            border: '1px solid #FCA5A5',
            borderRadius: '0.5rem',
            padding: '1rem',
          },
        });
      }
      return { hasAccess: false, action: 'login' };
    }

    setIsChecking(true);
    try {
      const status = await checkVerificationStatus();
      
      if (status.action === 'rejected' && showNotification) {
        toast.error(status.message || 'تم رفض طلب الترقية الخاص بك', {
          duration: 5000,
          position: 'top-center',
          className: 'rtl text-right',
          style: {
            background: '#FEE2E2',
            color: '#991B1B',
            border: '1px solid #FCA5A5',
            borderRadius: '0.5rem',
            padding: '1rem',
          },
        });
      } else if (status.action === 'pending' && showNotification) {
        toast(status.message || 'طلب الترقية قيد المراجعة', {
          icon: '⏳',
          duration: 5000,
          position: 'top-center',
          className: 'rtl text-right',
          style: {
            background: '#FEF3C7',
            color: '#92400E',
            border: '1px solid #FCD34D',
            borderRadius: '0.5rem',
            padding: '1rem'
          }
        });
      } else if (status.action === 'upgrade' && showNotification) {
        // Don't show the default upgrade toast here as we handle it in the HOC
      }
      
      return status;
    } catch (error) {
      console.error('Error in checkWholesaleAccess:', error);
      return { hasAccess: false, action: 'upgrade' };
    } finally {
      setIsChecking(false);
    }
  }, [user, isAuthenticated, checkVerificationStatus]);
  
  return {
    checkWholesaleAccess,
    showUpgradeModal,
    setShowUpgradeModal,
    isWholesale: (user?.accountType === 'wholesale' || user?.wholesale_access) && user?.isActive,
    isPendingApproval: user?.accountType === 'wholesale' && !user?.isActive && !user?.wholesale_access
  };
};
