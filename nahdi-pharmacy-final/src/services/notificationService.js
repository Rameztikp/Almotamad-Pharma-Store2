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
  return !!(localStorage.getItem('client_auth_token') || localStorage.getItem('authToken') || localStorage.getItem('token'));
};

// --- SSE client ---
const startSSE = () => {
  if (sse) return; // already running
  const token = getClientToken();
  if (!token) return;

  const base = getApiBase();
  const url = `${base}/notifications/stream?token=${encodeURIComponent(token)}&_t=${Date.now()}`;

  try {
    sse = new EventSource(url, { withCredentials: true });

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
          case 'wholesale_approved': {
            addNotification({
              type: 'wholesale_approved',
              title: 'تمت الموافقة على ترقية حساب الجملة',
              message: `رقم الطلب: ${payload?.request_id || ''}`.trim(),
              meta: { ...payload },
            });
            break;
          }
          case 'wholesale_rejected': {
            addNotification({
              type: 'wholesale_rejected',
              title: 'تم رفض طلب ترقية حساب الجملة',
              message: payload?.rejection_reason ? `السبب: ${payload.rejection_reason}` : '',
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

    sse.onerror = () => {
      if (isDev) console.warn('⚠️ SSE error, will reconnect');
      try { sse.close(); } catch {}
      sse = null;
      // ensure polling runs while reconnecting
      if (!pollingIntervalId && isAuthenticated()) startOrderPolling();
      if (!sseReconnectTimer) {
        const delay = Math.min(sseBackoffMs, 30000);
        sseReconnectTimer = setTimeout(() => {
          sseReconnectTimer = null;
          sseBackoffMs *= 2;
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

const notificationService = {
  init,
  addNotification,
  getNotifications,
  markAllRead,
  markRead,
  subscribe,
};

export default notificationService;
