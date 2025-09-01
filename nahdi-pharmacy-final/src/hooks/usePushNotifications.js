import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { 
  initMessaging, 
  onMessageListener, 
  subscribeToPushNotifications,
  initializePushNotifications
} from '../services/firebaseService';

const usePushNotifications = (userId, authChecked = false) => {
  const { t } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to check authentication status
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const isAuthenticated = () => {
    return getCookie('client_auth_status') === 'authenticated';
  };

  // Check if browser supports push notifications
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = 'serviceWorker' in navigator && 'PushManager' in window;
        setIsSupported(supported);
        
        if (supported) {
          await initMessaging();
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error checking push notification support:', err);
        setError(err);
        setIsLoading(false);
      }
    };

    // Only check support if auth is ready
    if (authChecked) {
      checkSupport();
    }
  }, [authChecked]);

  // Subscribe to push notifications
  const subscribe = async () => {
    if (!isSupported || !userId || !authChecked || !isAuthenticated()) {
      console.log('Cannot subscribe: missing requirements', {
        isSupported,
        userId: !!userId,
        authChecked,
        isAuthenticated: isAuthenticated()
      });
      return false;
    }
    
    try {
      setIsLoading(true);
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast.warning(t('notifications.permissionDenied'));
        return false;
      }
      
      const success = await subscribeToPushNotifications(userId);
      setIsSubscribed(success);
      
      if (success) {
        toast.success(t('notifications.subscribed'));
      } else {
        toast.error(t('notifications.subscriptionFailed'));
      }
      
      return success;
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      toast.error(t('notifications.error'));
      setError(err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle incoming messages
  useEffect(() => {
    if (!isSupported) return;

    const unsubscribe = onMessageListener((payload) => {
      console.log('Message received:', payload);
      
      // Show notification to user
      if (payload.notification) {
        const { title, body } = payload.notification;
        toast.info(body, {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
      
      // You can add more specific handling based on the payload data
      // For example, update UI based on notification type
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isSupported]);

  // Initialize push notifications when component mounts and auth is ready
  useEffect(() => {
    if (isSupported && userId && authChecked && isAuthenticated()) {
      const init = async () => {
        try {
          await initializePushNotifications();
          // Check subscription status
          const permission = Notification.permission === 'granted';
          setIsSubscribed(permission);
        } catch (err) {
          console.error('Error initializing push notifications:', err);
          setError(err);
        }
      };
      
      init();
    }
  }, [isSupported, userId, authChecked]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
  };
};

export default usePushNotifications;
