import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWholesaleAccess } from '../../hooks/useWholesaleAccess.jsx';
import WholesaleUpgradeModal from './WholesaleUpgradeModal';
import { useUserAuth } from '../../context/UserAuthContext';
import { toast } from 'react-hot-toast';

const withWholesaleAccess = (WrappedComponent) => {
  return function WithWholesaleAccess(props) {
    const { user, isAuthenticated } = useUserAuth();
    const location = useLocation();
    const { showUpgradeModal, setShowUpgradeModal } = useWholesaleAccess();
    const [hasShownUpgrade, setHasShownUpgrade] = useState(false);

    useEffect(() => {
      // Only show upgrade notification if user is logged in, not a wholesale user, and hasn't seen it yet
      if (isAuthenticated() && user && 
          (user.accountType !== 'wholesale' || !user.wholesale_access) && 
          !hasShownUpgrade) {
        const timer = setTimeout(() => {
          toast(
            (t) => (
              <div className="text-right">
                <p className="mb-2">للاستفادة من عروض الجملة المميزة، يرجى ترقية حسابك</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowUpgradeModal(true);
                      toast.dismiss(t.id);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    ترقية الحساب
                  </button>
                  <button
                    onClick={() => {
                      setHasShownUpgrade(true);
                      toast.dismiss(t.id);
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
                  >
                    لاحقاً
                  </button>
                </div>
              </div>
            ),
            {
              duration: 10000, // 10 seconds
              position: 'bottom-left',
              className: 'rtl text-right',
              style: {
                background: '#fff',
                color: '#1F2937',
                border: '1px solid #E5E7EB',
                borderRadius: '0.5rem',
                padding: '1rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                maxWidth: '400px',
              },
            }
          );
        }, 2000); // Show after 2 seconds

        return () => clearTimeout(timer);
      }
    }, [isAuthenticated, user, hasShownUpgrade, setShowUpgradeModal]);

    const handleUpgradeSuccess = () => {
      setShowUpgradeModal(false);
      toast.success('تم تحديث حسابك بنجاح!', {
        position: 'top-center',
        className: 'rtl text-right',
        style: {
          background: '#D1FAE5',
          color: '#065F46',
          border: '1px solid #6EE7B7',
          borderRadius: '0.5rem',
          padding: '1rem',
        },
      });
    };

    return (
      <div className="wholesale-page">
        <WrappedComponent {...props} />
        <WholesaleUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onUpgradeSuccess={handleUpgradeSuccess}
        />
      </div>
    );
  };
};

export default withWholesaleAccess;
