import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import api from './api';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// طلب إذن الإشعارات
const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// الحصول على رمز FCM
const getFCMToken = async () => {
  try {
    const currentToken = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_KEY',
    });
    
    if (currentToken) {
      // إرسال الرمز للخادم
      await api.post('/notifications/subscribe', { token: currentToken });
      return currentToken;
    } else {
      console.log('No registration token available.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
};

// الاستماع للرسائل الواردة
const onMessageListener = (callback) => {
  return onMessage(messaging, (payload) => {
    callback(payload);
  });
};

export {
  requestNotificationPermission,
  getFCMToken,
  onMessageListener
};
