import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { 
  initMessaging, 
  onMessageListener, 
  subscribeToPushNotifications,
  initializePushNotifications
} from '../services/firebaseService';

const usePushNotifications = (userId) => {
  const { t } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

    checkSupport();
  }, []);

  // Subscribe to push notifications
  const subscribe = async () => {
    if (!isSupported || !userId) return false;
    
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

  // Initialize push notifications when component mounts
  useEffect(() => {
    if (isSupported && userId) {
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
  }, [isSupported, userId]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
  };
};

export default usePushNotifications;
