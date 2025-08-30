import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, Clock, AlertCircle, Info, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import notificationService from '../../services/notificationService';
import { SERVER_ROOT_URL } from '../../services/api';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connected', 'disconnected', 'error'
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const dropdownRef = useRef(null);
  const eventSourceRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Load notifications and unread count
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([loadNotifications(), loadUnreadCount()]);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Error loading notification data:', err);
      setError('فشل تحميل الإشعارات. يرجى المحاولة مرة أخرى.');
      setConnectionStatus('error');
      // Auto-retry after 5 seconds
      retryTimeoutRef.current = setTimeout(loadData, 5000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
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
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [loadData]);

  const setupSSE = () => {
    try {
      const token = localStorage.getItem('client_auth_token') || 
                   localStorage.getItem('authToken') || 
                   localStorage.getItem('token');
      
      if (!token) {
        console.log('No auth token available, skipping SSE setup');
        setConnectionStatus('disconnected');
        return;
      }

      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Add token as query parameter for authentication
      const sseUrl = `/api/v1/notifications/stream?token=${encodeURIComponent(token)}`;
      console.log(`SSE: Connecting to ${sseUrl}`);

      // Create new EventSource with credentials
      const newEventSource = new EventSource(sseUrl, { 
        withCredentials: true 
      });

      newEventSource.onopen = () => {
        console.log('SSE: Connection established successfully');
        setConnectionStatus('connected');
      };

      eventSourceRef.current = newEventSource;

      // Handle new notifications
      newEventSource.addEventListener('new_notification', (event) => {
        try {
          const notification = JSON.parse(event.data);
          console.log('New notification received:', notification);

          // Update notifications list
          setNotifications(prev => {
            // Prevent duplicates
            if (prev.some(n => n.id === notification.id)) return prev;
            return [notification, ...prev];
          });
          
          // Update unread count if notification is unread
          if (!notification.read_at) {
            setUnreadCount(prev => prev + 1);
          }

          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            try {
              new Notification(notification.title || 'إشعار جديد', {
                body: notification.message || notification.body || '',
                icon: notification.image || '/logo192.png', // Use notification image if available
                dir: 'rtl',
                lang: 'ar',
                tag: `notification-${notification.id}`
              });
            } catch (notifError) {
              console.error('Error showing browser notification:', notifError);
            }
          }
        } catch (error) {
          console.error('Error handling new_notification event:', error);
        }
      });

      newEventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnectionStatus('error');
        
        // Close the connection if it's in a bad state
        if (newEventSource.readyState === EventSource.CLOSED) {
          console.log('SSE: Connection closed by server');
          
          // Attempt to reconnect after delay
          const reconnectDelay = 5000; // 5 seconds
          console.log(`SSE: Attempting to reconnect in ${reconnectDelay}ms`);
          
          setTimeout(() => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              setupSSE();
            }
          }, reconnectDelay);
        }
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
      return data;
    } catch (error) {
      console.error('Error loading notifications:', error);
      throw error; // Re-throw to be handled by the caller
    }
  };

  const loadUnreadCount = async () => {
    try {
      const data = await notificationService.getUnreadCount();
      setUnreadCount(data.unread_count || 0);
      return data;
    } catch (error) {
      console.error('Error loading unread count:', error);
      throw error; // Re-throw to be handled by the caller
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read if unread
      if (!notification.read_at) {
        try {
          await notificationService.markAsRead(notification.id);
          setNotifications(prev =>
            prev.map(n =>
              n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
            )
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (markReadError) {
          console.error('Error marking notification as read:', markReadError);
          // Continue with navigation even if marking as read fails
        }
      }
      
      // Handle notification action
      const navigateTo = (url) => {
        if (url) {
          if (url.startsWith('http')) {
            window.open(url, '_blank');
          } else {
            window.location.href = url;
          }
        }
      };
      
      // Determine where to navigate based on notification type and metadata
      if (notification.action_url) {
        navigateTo(notification.action_url);
      } else if (notification.meta?.order_id) {
        navigateTo(`/orders/${notification.meta.order_id}`);
      } else if (notification.meta?.url) {
        navigateTo(notification.meta.url);
      } else if (notification.url) {
        navigateTo(notification.url);
      }
      
      // Close the dropdown after handling the click
      setIsOpen(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
      // Show error to user if needed
      setError('حدث خطأ أثناء معالجة الإشعار. يرجى المحاولة مرة أخرى.');
    }
  };

  const loadMoreNotifications = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const currentPage = Math.ceil(notifications.length / 20) + 1;
      const data = await notificationService.getNotifications(20, showOnlyUnread, currentPage);
      
      if (data.notifications && data.notifications.length > 0) {
        setNotifications(prev => [...prev, ...data.notifications]);
      }
    } catch (error) {
      console.error('Error loading more notifications:', error);
      setError('فشل تحميل المزيد من الإشعارات. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order_placed':
      case 'order_status':
        return <CheckCircle size={20} className="text-blue-500" />;
      case 'order_delivered':
        return <CheckCheck size={20} className="text-green-500" />;
      case 'order_cancelled':
        return <X size={20} className="text-red-500" />;
      case 'promotion':
      case 'offer':
        return <AlertCircle size={20} className="text-yellow-500" />;
      case 'wholesale_approved':
        return <Check size={20} className="text-green-500" />;
      case 'wholesale_rejected':
        return <X size={20} className="text-red-500" />;
      case 'wholesale_submitted':
        return <Clock size={20} className="text-blue-500" />;
      case 'payment_success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'payment_failed':
        return <X size={20} className="text-red-500" />;
      case 'account_updated':
        return <Info size={20} className="text-blue-500" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-500" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-500" />;
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };

  const getNotificationTypeLabel = (type) => {
    const labels = {
      order_placed: 'طلب جديد',
      order_status: 'تحديث حالة الطلب',
      order_delivered: 'تم التوصيل',
      order_cancelled: 'إلغاء طلب',
      promotion: 'عرض ترويجي',
      offer: 'عرض خاص',
      wholesale_approved: 'موافقة على طلب الجملة',
      wholesale_rejected: 'رفض طلب الجملة',
      wholesale_submitted: 'تقديم طلب جملة',
      payment_success: 'دفع ناجح',
      payment_failed: 'فشل الدفع',
      account_updated: 'تحديث الحساب',
      warning: 'تحذير',
      error: 'خطأ',
    };
    return labels[type] || 'إشعار';
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

  // Render connection status indicator
  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="connection-status connected">
            <span className="status-dot"></span>
            <span>متصل</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="connection-status connecting">
            <Loader2 className="animate-spin" size={16} />
            <span>جاري الاتصال...</span>
          </div>
        );
      case 'error':
        return (
          <div className="connection-status error">
            <AlertTriangle size={16} />
            <span>فشل الاتصال. جاري إعادة المحاولة...</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="notification-center" ref={dropdownRef}>
      <div className="notification-bell-container">
        <button
          className="notification-bell"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              loadData(); // Refresh data when opening
            }
          }}
          aria-label="عرض الإشعارات"
          aria-expanded={isOpen}
        >
          <Bell size={24} />
          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        {renderConnectionStatus()}
      </div>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>الإشعارات</h3>
            <div className="notification-actions">
              <button
                className={`mark-all-read ${unreadCount === 0 ? 'disabled' : ''}`}
                onClick={() => markAllAsRead()}
                disabled={unreadCount === 0}
                aria-label="تعيين الكل كمقروء"
              >
                تعيين الكل كمقروء
              </button>
              <button
                className="close-button"
                onClick={() => setIsOpen(false)}
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="notification-filters">
            <button
              className={`filter-button ${!showOnlyUnread ? 'active' : ''}`}
              onClick={() => setShowOnlyUnread(false)}
              aria-pressed={!showOnlyUnread}
            >
              الكل
            </button>
            <button
              className={`filter-button ${showOnlyUnread ? 'active' : ''}`}
              onClick={() => setShowOnlyUnread(true)}
              aria-pressed={showOnlyUnread}
              disabled={unreadCount === 0}
            >
              غير المقروء {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="loading-state">
                <Loader2 className="animate-spin" size={24} />
                <p>جاري تحميل الإشعارات...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <AlertCircle size={24} />
                <p>{error}</p>
                <button 
                  className="retry-button" 
                  onClick={loadData}
                  disabled={loading}
                >
                  {loading ? 'جاري المحاولة...' : 'إعادة المحاولة'}
                </button>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="empty-state">
                <Info size={24} />
                <p>{showOnlyUnread ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات لعرضها'}</p>
              </div>
            ) : (
              <>
                {filteredNotifications.map((notification) => {
                  const isUnread = !notification.read_at;
                  return (
                    <div
                      key={notification.id}
                      className={`notification-item ${isUnread ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(notification)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNotificationClick(notification);
                        }
                      }}
                    >
                      <div className="notification-icon">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="notification-content">
                        <h4>{notification.title || 'إشعار جديد'}</h4>
                        <p>{notification.message || notification.body || ''}</p>
                        <div className="notification-meta">
                          <span className="notification-time">
                            {formatTime(notification.created_at || notification.sent_at)}
                          </span>
                          {notification.type && (
                            <span className="notification-type">
                              {getNotificationTypeLabel(notification.type)}
                            </span>
                          )}
                        </div>
                      </div>
                      {isUnread && <div className="unread-indicator"></div>}
                    </div>
                  );
                })}
              </>
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
