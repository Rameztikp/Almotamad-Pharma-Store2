// src/services/notificationService.js
// Lightweight client-side notification system using CustomEvent + localStorage + optional polling

import { orderService } from './orderService';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { apiRequest } from './api';

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const firebaseApp = initializeApp(firebaseConfig);

const STORAGE_BASE = 'client_notifications';
const SNAPSHOT_BASE = 'client_orders_snapshot';
const LAST_SEEN_BASE = 'client_notifications_last_seen';

let subscribers = new Set();
let pollingIntervalId = null;
let sse = null;
let sseReconnectTimer = null;
let sseBackoffMs = 2000; // exponential backoff starting at 2s

// FCM Token Management
let fcmToken = null;
let fcmMessaging = null;
const FCM_TOKEN_KEY = 'fcm_token';

const isDev = import.meta.env.MODE === 'development';

// Get current client user ID from scoped storage (prevents cross-account leakage)
const getCurrentUserId = () => {
  try {
    const raw = localStorage.getItem('client_user_data') || localStorage.getItem('userData');
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj?.id || obj?._id || obj?.user?.id || null;
  } catch {
    return null;
  }
};

const scopedKey = (base) => {
  const uid = getCurrentUserId();
  return uid ? `${base}_${uid}` : `${base}_anon`;
};

const getClientToken = () =>
  localStorage.getItem('client_auth_token') ||
  localStorage.getItem('authToken') ||
  localStorage.getItem('token');

const getApiBase = () => {
  // In development, use the proxy path with /api/v1 prefix
  if (import.meta.env.MODE === 'development') {
    return `${window.location.origin}/api/v1`;
  }
  // In production, use the configured API base URL (should include /api/v1 if needed)
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
};

const readNotifications = () => {
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_BASE));
    return Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeNotifications = (list) => {
  try {
    localStorage.setItem(scopedKey(STORAGE_BASE), JSON.stringify(list));
  } catch {}
};

const readSnapshot = () => {
  try {
    const raw = localStorage.getItem(scopedKey(SNAPSHOT_BASE));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeSnapshot = (snapshot) => {
  try {
    localStorage.setItem(scopedKey(SNAPSHOT_BASE), JSON.stringify(snapshot || {}));
  } catch {}
};

const emitUpdate = () => {
  const notifications = readNotifications();
  subscribers.forEach((cb) => {
    try { cb(notifications); } catch {}
  });
};

const addNotification = ({ type, title, message, meta }) => {
  const notifications = readNotifications();
  const now = Date.now();
  const id = `${type}-${now}-${Math.random().toString(36).slice(2, 8)}`;
  const item = { id, type, title, message, meta: meta || {}, createdAt: now, read: false };
  notifications.unshift(item);
  writeNotifications(notifications);
  emitUpdate();
};

const getNotifications = () => readNotifications();

const markAllRead = () => {
  const list = readNotifications().map((n) => ({ ...n, read: true }));
  writeNotifications(list);
  try { localStorage.setItem(scopedKey(LAST_SEEN_BASE), String(Date.now())); } catch {}
  emitUpdate();
};

const markRead = (id) => {
  const list = readNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
  writeNotifications(list);
  emitUpdate();
};

const subscribe = (cb) => {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
};

const isAuthenticated = () => {
  try {
    // Check for user session data in localStorage
    const userData = localStorage.getItem('client_user_data') || 
                    localStorage.getItem('adminData') || 
                    localStorage.getItem('userData');
    
    if (userData) {
      const parsed = JSON.parse(userData);
      // Check if we have a valid user ID in the session
      return !!(parsed?.id || parsed?._id || parsed?.user?.id);
    }
    return false;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

// --- SSE client ---
let sseReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const SSE_ENDPOINT = '/api/v1/notifications/stream';
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

const startSSE = () => {
  // Don't start if already connected or no user is logged in
  if (sse && (sse.readyState === EventSource.OPEN || sse.readyState === EventSource.CONNECTING)) {
    console.log('SSE: Already connected or connecting');
    return;
  }

  const token = getClientToken();
  if (!token) {
    console.log('SSE: No auth token available, waiting for login');
    return;
  }

  // Close existing connection if any
  if (sse) {
    sse.close();
  }
  // Don't start if we've exceeded max reconnection attempts
  if (sseReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('Max SSE reconnection attempts reached, falling back to polling');
    startOrderPolling(30000); // Fallback to 30s polling
    return;
  }

  // Close existing connection if any
  if (sse) {
    try { 
      sse.close(); 
    } catch (e) {
      console.error('Error closing existing SSE connection:', e);
    }
    sse = null;
  }

  try {
    const base = getApiBase();
    // Clean up base URL and ensure proper API prefix
    const cleanBase = base.replace(/\/$/, '').replace(/\/api\/v1$/, '');
    const url = new URL('/api/v1/notifications/stream', cleanBase);
    try {
      // Add token as query parameter for authentication
      const sseUrl = `${SSE_ENDPOINT}?token=${encodeURIComponent(token)}`;
      console.log(`SSE: Connecting to ${sseUrl}`);

      // Create new EventSource with credentials
      const newEventSource = new EventSource(sseUrl, { 
        withCredentials: true 
      });

      // Reset reconnect attempts on successful connection
      sseReconnectAttempts = 0;

      // Set a timeout to detect connection issues
      const connectionTimer = setTimeout(() => {
        if (sse && sse.readyState === sse.CONNECTING) {
          console.warn('SSE connection timeout, will retry...');
          handleSSEError('Connection timeout');
        }
      }, 10000); // 10s connection timeout

      // Connection established
      newEventSource.onopen = () => {
        clearTimeout(connectionTimer);
        console.log('SSE: Connection established successfully');
        // Reset backoff on successful connection
        sseBackoffMs = 2000;
        // stop polling to reduce load
        stopOrderPolling();
      };

      newEventSource.onmessage = (evt) => {
        if (!evt?.data) return;
        try {
          const parsed = JSON.parse(evt.data);
          const event = parsed?.event;
          const payload = parsed?.payload;
          if (!event) return;

          switch (event) {
            case 'connected':
              if (isDev) console.log('SSE hello', payload);
              break;
            case 'order_created': {
              const id = payload?.order_id || payload?.id;
              addNotification({
                type: 'order_placed',
                title: 'تم إنشاء الطلب بنجاح',
                message: id ? `رقم الطلب: ${id}` : '',
                meta: { ...payload },
              });
              break;
            }
            case 'order_status_updated': {
              const id = payload?.order_id;
              addNotification({
                type: 'order_status',
                title: `تحديث حالة الطلب #${id || ''}`.trim(),
                message: `تم تغير الحالة إلى ${payload?.new_status}`,
                meta: { ...payload },
              });
              break;
            }
            case 'order_tracking_added': {
              const id = payload?.order_id;
              addNotification({
                type: 'order_tracking',
                title: `تم إضافة تحديث تتبع للطلب #${id || ''}`.trim(),
                message: payload?.description || '',
                meta: { ...payload },
              });
              break;
            }
            case 'wholesale_request_submitted': {
              addNotification({
                type: 'wholesale_submitted',
                title: 'تم تقديم طلب ترقية حساب الجملة',
                message: payload?.message || 'تم تقديم طلبك بنجاح وهو الآن قيد المراجعة',
                meta: { ...payload },
              });
              break;
            }
            case 'wholesale_approved': {
              addNotification({
                type: 'wholesale_approved',
                title: 'تمت الموافقة على ترقية حساب الجملة',
                message: payload?.message || 'تهانينا! تمت الموافقة على طلب ترقية حساب الجملة الخاص بك',
                meta: { ...payload },
              });
              break;
            }
            case 'wholesale_rejected': {
              addNotification({
                type: 'wholesale_rejected',
                title: 'تم رفض طلب ترقية حساب الجملة',
                message: payload?.message || (payload?.rejection_reason ? `السبب: ${payload.rejection_reason}` : 'تم رفض طلب ترقية حساب الجملة الخاص بك'),
                meta: { ...payload },
              });
              break;
            }
            case 'wholesale_request_updated': {
              addNotification({
                type: 'wholesale_update',
                title: 'تحديث حالة طلب حساب الجملة',
                message: `الحالة: ${payload?.status || ''}`,
                meta: { ...payload },
              });
              break;
            }
            default:
              if (isDev) console.log('Unknown SSE event', event, payload);
          }
        } catch (e) {
          if (isDev) console.warn('SSE parse error', e);
        }
      };

      newEventSource.onerror = (error) => {
        clearTimeout(connectionTimer);

        console.error('SSE connection error:', error);

        // Close the connection if it's in a bad state
        if (newEventSource.readyState === EventSource.CLOSED) {
          console.log('SSE: Connection closed by server');

          // Exponential backoff for reconnection
          const reconnectDelay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, sseReconnectAttempts++),
            30000 // Max 30 seconds
          );

          console.log(`SSE: Attempting to reconnect in ${reconnectDelay}ms (attempt ${sseReconnectAttempts})`);

          // Clear any existing timer
          if (sseReconnectTimer) {
            clearTimeout(sseReconnectTimer);
          }

          // Schedule reconnection
          sseReconnectTimer = setTimeout(() => {
            if (sseReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              startSSE();
            } else {
              console.error('SSE: Max reconnection attempts reached');
              // Notify subscribers of connection error
              emitUpdate();
            }
          }, reconnectDelay);
        }
      };

      sse = newEventSource;
    } catch (error) {
      console.error('Error setting up SSE:', error);
      handleSSEError('Setup error');
    }
  } catch (error) {
    console.error('Error setting up SSE:', error);
    handleSSEError('Setup error');
  }
};

const handleSSEError = (reason) => {
  try {
    if (sseReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('Max reconnection attempts reached, giving up on SSE');
      sseReconnectAttempts = 0;
      startOrderPolling(30000); // Fall back to more frequent polling
      return;
    }

    // Calculate backoff delay with exponential backoff
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, sseReconnectAttempts),
      30000 // Max 30 seconds
    );

    sseReconnectAttempts++;
    console.log(`SSE connection lost, attempting to reconnect in ${delay}ms (attempt ${sseReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    // Clear any existing timer
    if (sseReconnectTimer) {
      clearTimeout(sseReconnectTimer);
    }

    // Schedule reconnection
    sseReconnectTimer = setTimeout(() => {
      startSSE();
    }, delay);

    // Start polling as fallback
    if (sseReconnectAttempts > 1) {
      startOrderPolling(60000); // 1 minute polling as fallback
    }
  } catch (e) {
    if (isDev) console.error('SSE error handling failed', e);
  }
};

const stopSSE = () => {
  if (sseReconnectTimer) {
    clearTimeout(sseReconnectTimer);
    sseReconnectTimer = null;
  }
  if (sse) {
    try { sse.close(); } catch {}
    sse = null;
  }
};

const snapshotFromOrders = (orders) => {
  const snap = {};
  (orders || []).forEach((o) => {
    const id = o.id || o.order_id || o.uuid || o.number;
    const status = (o.status || o.order_status || '').toString().toLowerCase();
    if (id) snap[id] = status;
  });
  return snap;
};

const detectOrderStatusChanges = (oldSnap, newSnap) => {
  const changes = [];
  Object.keys(newSnap).forEach((id) => {
    const prev = oldSnap[id];
    const curr = newSnap[id];
    if (prev && curr && prev !== curr) {
      changes.push({ id, from: prev, to: curr });
    }
  });
  return changes;
};

const startOrderPolling = (intervalMs = 60000) => {
  if (pollingIntervalId) return; // already running
  const tick = async () => {
    if (!isAuthenticated()) return;
    try {
      const res = await orderService.getUserOrders();
      const data = res?.data?.data || res?.data || res || [];
      const newSnap = snapshotFromOrders(Array.isArray(data) ? data : data.orders || []);
      const oldSnap = readSnapshot();
      const changes = detectOrderStatusChanges(oldSnap, newSnap);
      if (changes.length) {
        changes.forEach((ch) => {
          addNotification({
            type: 'order_status',
            title: `تحديث حالة الطلب #${ch.id}`,
            message: `تم تغير الحالة من ${ch.from} إلى ${ch.to}`,
            meta: { orderId: ch.id, from: ch.from, to: ch.to },
          });
        });
      }
      writeSnapshot(newSnap);
    } catch (e) {
      // fail silently
    }
  };
  tick();
  pollingIntervalId = setInterval(tick, intervalMs);
};

const stopOrderPolling = () => {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
};

// Initialize FCM and request permission
const initializeFCM = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported in this browser');
    return null;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('Service Worker registered with scope:', registration.scope);

    // Initialize Firebase Messaging
    fcmMessaging = getMessaging(firebaseApp);

    // Handle incoming messages when app is in foreground
    onMessage(fcmMessaging, (payload) => {
      console.log('Received foreground message:', payload);
      handlePushNotification(payload);
    });

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    // Get FCM token
    const currentToken = await getToken(fcmMessaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      console.log('FCM Token obtained successfully');
      fcmToken = currentToken;
      localStorage.setItem(FCM_TOKEN_KEY, currentToken);

      // Register token with backend if user is authenticated
      const isAuth = await isAuthenticated();
      if (isAuth) {
        await registerFCMToken(currentToken);
      }
      
      return currentToken;
    } else {
      console.warn('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (error) {
    console.error('Error initializing FCM:', error);
    return null;
  }
};

// Register FCM token with backend
// Register FCM token with backend
const registerFCMToken = async (token) => {
  try {
    const deviceId = await getDeviceId();
    await apiRequest('/fcm/subscribe', {
      method: 'POST',
      body: JSON.stringify({ 
        token,
        deviceId,
        platform: 'web'
      })
    });
    console.log('FCM token registered successfully with backend');
    return true;
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return false;
  }
};

// Initialize the notification service
const init = async () => {
  if (init._initialized) return { init: true };
  init._initialized = true;
  
  try {
    // Initialize FCM for push notifications if available
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        await initializeFCM();
      } catch (error) {
        console.error('Failed to initialize FCM:', error);
      }
    }

    // Set up visibility change handler
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Refresh notifications when tab becomes visible
        if (isAuthenticated()) {
          await fetchNotifications();
          startSSE();
        }
      } else {
        // Clean up when tab is hidden
        stopSSE();
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', () => {
      stopSSE();
      stopOrderPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });

    // Start SSE connection for real-time updates if authenticated
    if (isAuthenticated()) {
      startSSE();
      await fetchNotifications();
    }

    return { init: true };
  } catch (error) {
    console.error('Error initializing notification service:', error);
    return { init: false, error };
  }
};

// Generate or retrieve a consistent device ID
const getDeviceId = async () => {
  const STORAGE_KEY = 'device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    // Generate a new device ID if one doesn't exist
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
};

const markStoredAsRead = async (notificationId) => {
  return apiRequest(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
};

const markAllStoredAsRead = async () => {
  return apiRequest('/notifications/read-all', {
    method: 'PUT',
  });
};

const getUnreadCount = async () => {
  return apiRequest('/notifications/unread-count');
};

// Fetch notifications from the server
const fetchNotifications = async () => {
  try {
    const response = await apiRequest('/notifications');
    if (response && Array.isArray(response)) {
      // Update local storage with the fetched notifications
      writeNotifications(response);
      emitUpdate();
      return response;
    }
    return [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

const getStoredNotifications = async () => {
  try {
    const response = await apiRequest('/notifications');
    if (response && Array.isArray(response)) {
      return response;
    }
    return [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

const handlePushNotification = (payload) => {
  try {
    console.log('Handling push notification:', payload);
    
    // Extract notification data
    const notification = payload.notification || {};
    const data = payload.data || {};
    
    // Show notification if in background
    if (document.hidden && notification && Notification.permission === 'granted') {
      const title = notification.title || 'New Notification';
      const options = {
        body: notification.body,
        icon: notification.icon || '/logo192.png',
        data: data,
        vibrate: [200, 100, 200],
        tag: data.notificationId || 'general-notification'
      };
      
      new Notification(title, options);
    }
    
    // Update UI if notification is for the current user
    if (data.userId === getCurrentUserId()) {
      // Refresh notifications
      getStoredNotifications().then(notifications => {
        emitUpdate();
      });
      
      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('new-notification', {
        detail: { ...notification, ...data }
      }));
    }
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
};

const notificationService = {
  init,
  addNotification,
  getNotifications: getStoredNotifications, 
  markRead: markStoredAsRead, 
  markAllRead: markAllStoredAsRead,
  subscribe,
  isAuthenticated,
  startSSE,
  stopSSE,
  startOrderPolling,
  stopOrderPolling,
  handlePushNotification,
  getUnreadCount,
  getFCMToken: () => fcmToken,
  deleteFCMToken: async () => {
    if (fcmMessaging && fcmToken) {
      try {
        await deleteToken(fcmMessaging);
        fcmToken = null;
        localStorage.removeItem(FCM_TOKEN_KEY);
        return true;
      } catch (error) {
        console.error('Error deleting FCM token:', error);
        return false;
      }
    }
    return true;
  },
  requestNotificationPermission: async () => {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }
};

export default notificationService;
