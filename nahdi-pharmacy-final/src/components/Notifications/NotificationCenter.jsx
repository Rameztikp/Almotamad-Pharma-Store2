import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Clock, AlertCircle, Info, CheckCircle } from 'lucide-react';
import notificationService from '../../services/notificationService';
import { SERVER_ROOT_URL } from '../../services/api';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const dropdownRef = useRef(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    setupSSE();

    // Handle clicks outside dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const setupSSE = () => {
    try {
      // Client-side SSE connection for regular users.
      // The browser will automatically send the HttpOnly session cookie.
      // The URL must be relative to the domain to ensure it goes through the Vite proxy.
      const sseUrl = '/api/v1/notifications/stream';
      console.log(`SSE: Connecting to ${sseUrl} for user notifications.`);

      // Ensure cookies are sent with the SSE request for authentication
      const newEventSource = new EventSource(sseUrl, { withCredentials: true });

      newEventSource.onopen = () => {
        console.log('SSE: Connection opened successfully.');
      };

      eventSourceRef.current = newEventSource;

      // Setup a single event listener for all new notifications
      newEventSource.addEventListener('new_notification', (event) => {
        try {
          const notification = JSON.parse(event.data);

          // Add new notification to the list
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification(notification.title, {
              body: notification.message,
              icon: '/logo192.png' // Optional: use a specific icon
            });
          }
        } catch (error) {
          console.error('Error parsing new_notification event:', error);
        }
      });

      newEventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            setupSSE();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Error setting up SSE:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationService.getNotifications(20, showOnlyUnread);
      setNotifications(data.notifications || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('فشل تحميل الإشعارات. يرجى المحاولة مرة أخرى.');
      // Fallback to local storage if available
      try {
        const localNotifs = notificationService.getLocalNotifications();
        if (localNotifs.length > 0) {
          setNotifications(localNotifs);
        }
      } catch (e) {
        console.warn('Could not load local notifications:', e);
      }
    } finally {
      setLoading(false);
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

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      setNotifications(prev => 
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

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          read_at: notif.read_at || new Date().toISOString() 
        }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
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

  const toggleDropdown = async () => {
    const newState = !isOpen;
    setIsOpen(newState);
    
    if (newState) {
      // Only load if we don't have data or it's older than 1 minute
      const shouldRefresh = !lastUpdated || (Date.now() - lastUpdated.getTime() > 60000);
      if (shouldRefresh || notifications.length === 0) {
        await loadNotifications();
      }
    }
  };
  
  const handleRefresh = async (e) => {
    e.stopPropagation();
    await loadNotifications();
  };

  const filteredNotifications = showOnlyUnread 
    ? notifications.filter(notif => !notif.read_at)
    : notifications;

  // Request notification permission on component mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="notification-bell"
        aria-label="الإشعارات"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <div className="notification-header-top">
              <h3>الإشعارات</h3>
              <div className="notification-actions">
                <button
                  onClick={handleRefresh}
                  className="refresh-btn"
                  disabled={loading}
                  title="تحديث"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                  className={`filter-btn ${showOnlyUnread ? 'active' : ''}`}
                  title={showOnlyUnread ? 'عرض الكل' : 'غير المقروءة فقط'}
                >
                  {showOnlyUnread ? 'الكل' : 'غير مقروءة'}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="mark-all-btn"
                    title="تحديد الكل كمقروء"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="close-btn"
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {lastUpdated && (
                <div className="last-updated">
                  آخر تحديث: {new Intl.DateTimeFormat('ar-SA', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  }).format(lastUpdated)}
                </div>
              )}
            </div>
          </div>

          <div className="notification-list">
            {error ? (
              <div className="notification-error">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <p>{error}</p>
                <button 
                  onClick={loadNotifications}
                  className="retry-btn"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : loading ? (
              <div className="notification-loading">
                <div className="loading-spinner"></div>
                <span>جاري التحميل...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="no-notifications">
                <Bell className="w-12 h-12 text-gray-300" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.read_at ? 'unread' : ''}`}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <div className="notification-meta">
                      <span className="notification-time">
                        <Clock className="w-3 h-3" />
                        {formatTime(notification.created_at)}
                      </span>
                      {notification.category && (
                        <span className="notification-category">
                          {notification.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {!notification.read_at && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="mark-read-btn"
                      title="تحديد كمقروء"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {filteredNotifications.length > 0 && (
            <div className="notification-footer">
              <button
                onClick={loadNotifications}
                className="load-more-btn"
                disabled={loading}
              >
                تحديث الإشعارات
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
