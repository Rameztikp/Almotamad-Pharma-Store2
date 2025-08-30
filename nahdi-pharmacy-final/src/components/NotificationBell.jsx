import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff } from 'lucide-react';
import notificationService from '../services/notificationService';
import { requestNotificationPermission, getFCMToken, onMessageListener } from '../services/pushNotificationService';

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [position, setPosition] = useState({ top: 0, right: 0, isMobile: false });
  const [pushEnabled, setPushEnabled] = useState(false);
  const btnRef = useRef(null);

  // Initialize push notifications
  const initPushNotifications = useCallback(async () => {
    try {
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        await getFCMToken();
        setPushEnabled(true);
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }, []);

  // Listen for new push notifications
  useEffect(() => {
    const unsubscribe = onMessageListener((payload) => {
      // Refresh notifications when a new push is received
      loadNotifications();
      loadUnreadCount();
    });
    return () => unsubscribe();
  }, []);

  // Load notifications from API instead of localStorage
  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications(20, false);
      setItems(data.notifications || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const data = await notificationService.getUnreadCount();
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setItems(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read_at: new Date().toISOString() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setItems(prev => 
        prev.map(notif => ({ 
          ...notif, 
          read_at: notif.read_at || new Date().toISOString() 
        }))
      );
      setUnreadCount(0);
      loadNotifications(); // Refresh the list
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes < 1 ? 'الآن' : `منذ ${diffInMinutes} دقيقة`;
    } else if (diffInHours < 24) {
      return `منذ ${Math.floor(diffInHours)} ساعة`;
    } else {
      return date.toLocaleDateString('ar-SA');
    }
  };

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    initPushNotifications();

    // Set up SSE connection for real-time updates
    const sseUrl = '/api/v1/notifications/stream';
    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.addEventListener('new_notification', (event) => {
      try {
        const notification = JSON.parse(event.data);
        setItems(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      } catch (error) {
        console.error('Error parsing new_notification event:', error);
      }
    });

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Compute dropdown position
  const computePosition = () => {
    const isMobile = window.innerWidth < 768; // md breakpoint
    if (isMobile) {
      setPosition({ top: 56, right: 12, isMobile: true });
      return;
    }
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const gap = 8; // mt-2
    const width = 320; // panel width on desktop
    let right = Math.max(12, window.innerWidth - rect.right);
    const top = rect.bottom + gap;
    // Clamp so the left edge stays within viewport (>= 12px)
    const left = window.innerWidth - right - width;
    if (left < 12) {
      right = window.innerWidth - width - 12;
    }
    setPosition({ top, right, isMobile: false });
  };

  useEffect(() => {
    if (!open) return;
    computePosition();
    const onScroll = () => computePosition();
    const onResize = () => computePosition();
    const onClick = (e) => {
      // close on outside click
      if (btnRef.current && !btnRef.current.contains(e.target)) {
        const panel = document.getElementById('notif-panel');
        if (panel && !panel.contains(e.target)) {
          setOpen(false);
        }
      }
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-gray-100 relative"
        aria-label="Notifications"
      >
        {pushEnabled ? (
          <Bell className="w-6 h-6 text-blue-500" />
        ) : (
          <BellOff className="w-6 h-6 text-gray-400" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          id="notif-panel"
          className={`${position.isMobile
              ? 'fixed right-3 left-3 top-16'
              : 'fixed'
            } bg-white rounded-lg shadow-xl border border-gray-100 z-[9999]`}
          style={position.isMobile ? {} : { top: position.top, right: position.right, width: 320 }}
        >
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-medium text-gray-800">الإشعارات</span>
            {items.length > 0 && (
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={handleMarkAllAsRead}
              >
                تحديد الكل كمقروء
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500">لا توجد إشعارات بعد</div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-50 text-right ${!n.read_at ? 'bg-blue-50/40' : ''}`}
                  onMouseEnter={() => !n.read_at && handleMarkAsRead(n.id)}
                >
                  <div className="text-sm font-medium text-gray-800 mb-0.5">{n.title}</div>
                  {n.message && (
                    <div className="text-xs text-gray-600 mb-1">{n.message}</div>
                  )}
                  <div className="text-[11px] text-gray-400">{formatTime(n.created_at)}</div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;
