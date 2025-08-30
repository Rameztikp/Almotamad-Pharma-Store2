// src/services/notificationService.js
// Lightweight client-side notification system using CustomEvent + localStorage + optional polling

import { orderService } from './orderService';

const STORAGE_BASE = 'client_notifications';
const SNAPSHOT_BASE = 'client_orders_snapshot';
const LAST_SEEN_BASE = 'client_notifications_last_seen';

let subscribers = new Set();
let pollingIntervalId = null;
let sse = null;
let sseReconnectTimer = null;
let sseBackoffMs = 2000; // exponential backoff starting at 2s

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
  // Mirror src/services/api.js logic
  const dev = import.meta.env.MODE === 'development';
  const base = dev ? '/api/v1' : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1');
  if (base.startsWith('/')) return `${window.location.origin}${base}`;
  return base;
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
  // Check for tokens in localStorage (for admin) or user data (for HttpOnly cookie auth)
  const hasToken = !!(localStorage.getItem('client_auth_token') || localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('admin_token'));
  const hasUserData = !!(localStorage.getItem('client_user_data') || localStorage.getItem('adminData'));
  return hasToken || hasUserData;
};

// --- SSE client ---
const startSSE = () => {
  // Close existing connection if any
  if (sse) {
    try { sse.close(); } catch {}
    sse = null;
  }

  // Get fresh token
  const token = getClientToken();
  if (!token) {
    console.warn('No auth token available for SSE connection');
    return;
  }

  // Construct SSE URL with cache-busting parameter
  const base = getApiBase();
  const url = new URL(`${base}/api/v1/notifications/stream`);
  url.searchParams.append('_t', Date.now());
  
  console.log('🔌 Connecting to SSE endpoint:', url.toString());

  try {
    // Create new EventSource with error handling
    sse = new EventSource(url, { 
      withCredentials: true,
      // Don't use the default EventSource, use the native one
      // This helps with some environments that might polyfill it incorrectly
      // @ts-ignore - Some environments might not have this type
      fetch: window.fetch.bind(window)
    });
    
    // Set a timeout to detect connection issues
    const connectionTimer = setTimeout(() => {
      if (sse && sse.readyState === sse.CONNECTING) {
        console.warn('SSE connection is taking too long, will retry...');
        sse.close();
        sse = null;
        setTimeout(startSSE, 2000);
      }
    }, 5000);
    
    // Clean up timer on successful connection
    sse.onopen = () => {
      clearTimeout(connectionTimer);
      console.log('✅ SSE connection established successfully');
      // Reset backoff on successful connection
      sseBackoffMs = 2000;
      // Stop polling since we have SSE
      stopOrderPolling();
    };

    sse.onopen = () => {
      // Connected -> prefer SSE over polling
      if (isDev) console.log('🔌 SSE connected');
      if (sseReconnectTimer) {
        clearTimeout(sseReconnectTimer);
        sseReconnectTimer = null;
      }
      sseBackoffMs = 2000;
      // stop polling to reduce load
      stopOrderPolling();
    };

    sse.onmessage = (evt) => {
      if (!evt?.data) return;
      try {
        const parsed = JSON.parse(evt.data);
        const event = parsed?.event;
        const payload = parsed?.payload;
        if (!event) return;

        switch (event) {
          case 'connected':
            if (isDev) console.log('✅ SSE hello', payload);
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
            if (isDev) console.log('ℹ️ Unknown SSE event', event, payload);
        }
      } catch (e) {
        if (isDev) console.warn('SSE parse error', e);
      }
    };

    sse.onerror = (error) => {
      clearTimeout(connectionTimer);
      
      if (sse) {
        console.error('SSE connection error:', error);
        try { sse.close(); } catch {}
        sse = null;
      }
      
      // Start polling as fallback
      if (isAuthenticated() && !pollingIntervalId) {
        console.log('🔄 Starting polling as fallback');
        startOrderPolling();
      }
      
      // Schedule reconnection with exponential backoff
      if (!sseReconnectTimer) {
        const delay = Math.min(sseBackoffMs, 30000); // Max 30s delay
        console.log(`⏳ Will attempt to reconnect in ${delay}ms...`);
        
        sseReconnectTimer = setTimeout(() => {
          sseReconnectTimer = null;
          sseBackoffMs = Math.min(sseBackoffMs * 1.5, 30000); // Increase backoff
          console.log('🔄 Attempting to reconnect SSE...');
          startSSE();
        }, delay);
      }
    };
  } catch (e) {
    if (isDev) console.error('SSE setup failed', e);
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

const init = () => {
  if (init._initialized) return;
  init._initialized = true;

  // Events wiring
  window.addEventListener('wholesaleUpgradeApproved', (e) => {
    const { userId, requestId } = e?.detail || {};
    addNotification({
      type: 'wholesale_approved',
      title: 'تمت الموافقة على ترقية حساب الجملة',
      message: `رقم الطلب: ${requestId || ''}`.trim(),
      meta: { userId, requestId },
    });
  });

  window.addEventListener('orderPlaced', (e) => {
    const detail = e?.detail || {};
    const orders = Array.isArray(detail?.orders) ? detail.orders : detail?.order ? [detail.order] : [];
    const count = orders.length;
    if (count > 0) {
      const firstId = orders[0]?.id || orders[0]?.order_id || orders[0]?.uuid || orders[0]?.number;
      addNotification({
        type: 'order_placed',
        title: count === 1 ? 'تم إنشاء الطلب بنجاح' : `تم إنشاء ${count} طلبات بنجاح`,
        message: firstId ? `رقم الطلب: ${firstId}` : '',
        meta: { orders },
      });
    }
  });

  window.addEventListener('authStateChanged', (e) => {
    const isAuth = e?.detail?.isAuthenticated;
    if (typeof isAuth === 'boolean') {
      if (isAuth) {
        startSSE();
        startOrderPolling(); // start initially; SSE will stop it upon connect
      } else {
        stopSSE();
        stopOrderPolling();
      }
    } else {
      // No detail -> check now
      if (isAuthenticated()) {
        startSSE();
        startOrderPolling();
      }
    }
  });

  // Start polling if already authenticated
  if (isAuthenticated()) {
    startSSE();
    startOrderPolling();
  }
};

// API methods for persistent notifications
const apiRequest = async (endpoint, options = {}) => {
  const token = getClientToken();
  const base = getApiBase();
  
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
    
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Only add Authorization header if we have a token
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important for HttpOnly cookies
    });
    
    console.log(`🔔 API Response: ${response.status} ${response.statusText} for ${endpoint}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      
      // Handle 401 Unauthorized
      if (response.status === 401) {
        // Try to refresh token if possible
        if (endpoint !== '/auth/refresh') {
          console.log('🔑 Attempting to refresh token...');
          try {
            const refreshResponse = await fetch(`${base}/auth/refresh`, {
              method: 'POST',
              credentials: 'include',
            });
            
            if (refreshResponse.ok) {
              console.log('✅ Token refreshed, retrying original request');
              return apiRequest(endpoint, options);
            }
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
          }
        }
        
        // If we get here, refresh failed or not possible
        window.dispatchEvent(new CustomEvent('authStateChanged', {
          detail: { isAuthenticated: false }
        }));
        
        throw new Error('Session expired. Please log in again.');
      }
      
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }
    
    // For 204 No Content responses
    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

const getStoredNotifications = async (limit = 20, unreadOnly = false) => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (unreadOnly) params.append('unread', 'true');
  
  return apiRequest(`/notifications?${params}`);
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

const notificationService = {
  init,
  addNotification,
  getNotifications: getStoredNotifications, // Use API method as primary
  getLocalNotifications: getNotifications, // Keep local method available
  markAllRead: markAllStoredAsRead, // Use API method as primary
  markAllLocalRead: markAllRead, // Keep local method available
  markRead: markStoredAsRead, // Use API method as primary
  markLocalRead: markRead, // Keep local method available
  markAsRead: markStoredAsRead,
  markAllAsRead: markAllStoredAsRead,
  getUnreadCount,
  subscribe,
};

export default notificationService;
