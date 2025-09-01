import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import api from './api';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAf4FUHcErictwyMdOMFt_HWxs5hlWpAKw",
  authDomain: "almatamed-11a07.firebaseapp.com",
  projectId: "almatamed-11a07",
  storageBucket: "almatamed-11a07.firebasestorage.app",
  messagingSenderId: "418460842186",
  appId: "1:418460842186:web:66c0100d2465c851719c33"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let messaging = null;

// Initialize Firebase Cloud Messaging and get a reference to the service
const initMessaging = async () => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('This browser does not support Firebase Cloud Messaging');
      return null;
    }
    
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    return null;
  }
};

// Get FCM token
const getFCMToken = async () => {
  try {
    if (!messaging) {
      await initMessaging();
      if (!messaging) return null;
    }

    // Request permission to show notifications
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get the registration token
    const currentToken = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
    });

    if (!currentToken) {
      console.warn('No registration token available.');
      return null;
    }

    return currentToken;
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
};

// Subscribe to FCM token refresh
const onTokenRefresh = (callback) => {
  if (!messaging) return () => {};
  
  const unsubscribe = onMessage(messaging, (payload) => {
    if (payload && payload.data && payload.data.token) {
      callback(payload.data.token);
    }
  });
  
  return unsubscribe;
};

// Subscribe to incoming messages
const onMessageListener = (callback) => {
  if (!messaging) return () => {};
  
  const unsubscribe = onMessage(messaging, (payload) => {
    callback(payload);
  });
  
  return unsubscribe;
};

// Register the service worker
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered with scope:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Initialize the service worker and get the FCM token
const initializePushNotifications = async () => {
  try {
    await registerServiceWorker();
    const token = await getFCMToken();
    return token;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return null;
  }
};

// Subscribe to push notifications
const subscribeToPushNotifications = async (userId) => {
  try {
    // Check if user is authenticated using auth status cookie
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    const authStatus = getCookie('client_auth_status');
    if (authStatus !== 'authenticated') {
      console.warn('User not authenticated, cannot subscribe to push notifications');
      return false;
    }

    const token = await getFCMToken();
    if (!token) {
      console.warn('No FCM token available');
      return false;
    }

    const response = await api.post('/api/v1/fcm/subscribe', { token });
    return response.data;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
};

// Send test notification
const sendTestNotification = async (title, body, data = {}) => {
  try {
    const response = await api.post('/fcm/test', {
      title,
      body,
      data
    });
    return response.data;
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
};

export {
  initMessaging,
  getFCMToken,
  onTokenRefresh,
  onMessageListener,
  registerServiceWorker,
  initializePushNotifications,
  subscribeToPushNotifications,
  sendTestNotification
};
