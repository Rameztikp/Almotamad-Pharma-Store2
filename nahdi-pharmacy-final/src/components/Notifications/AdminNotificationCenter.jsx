import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiX, FiCheck, FiCheckCircle } from 'react-icons/fi';
import notificationService from '../../services/notificationService';
import './NotificationCenter.css';

// أيقونات الإشعارات
const NotificationIcons = {
  'admin_order_created': '🛒',
  'admin_wholesale_request': '🏢',
  'admin_wholesale_approved': '✅',
  'admin_wholesale_rejected': '❌',
  'admin_system': '⚙️',
  'default': '🔔'
};

// ألوان الإشعارات
const NotificationColors = {
  'admin_order_created': '#10B981',
  'admin_wholesale_request': '#F59E0B',
  'admin_wholesale_approved': '#059669',
  'admin_wholesale_rejected': '#EF4444',
  'admin_system': '#6366F1',
  'default': '#6B7280'
};

// تسميات أنواع الإشعارات
const getNotificationTypeLabel = (type) => {
  const labels = {
    'admin_wholesale_submitted': 'طلب ترقية جملة',
    'admin_wholesale_approved': 'موافقة ترقية',
    'admin_wholesale_rejected': 'رفض ترقية',
    'admin_order_created': 'طلب تجزئة جديد',
    'admin_order_updated': 'تحديث طلب تجزئة',
    'admin_wholesale_order': 'طلب جملة',
    'admin_system': 'نظام',
    'default': 'إشعار'
  };
  return labels[type] || labels.default;
};

const AdminNotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [eventSource, setEventSource] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dropdownRef = useRef(null);
  const eventSourceRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is authenticated
    const checkAuth = () => {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_access_token');
      const isAuth = !!token;
      
      if (isAuth !== isAuthenticated) {
        console.log('AdminNotificationCenter - Auth state changed:', { from: isAuthenticated, to: isAuth });
        setIsAuthenticated(isAuth);
      }
    };

    checkAuth();
    
    // Check auth periodically in case localStorage changes
    const authInterval = setInterval(checkAuth, 10000); // Reduced frequency to 10 seconds
    
    // Listen for storage changes to detect login/logout
    const handleStorageChange = () => {
      checkAuth();
    };
    
    window.addEventListener('storage', handleStorageChange);

    // Handle clicks outside dropdown
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(authInterval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []); // Remove isAuthenticated dependency to prevent infinite loop

  useEffect(() => {
    if (isAuthenticated) {
      console.log('AdminNotificationCenter - Setting up SSE and loading notifications...');
      setupSSE();
      loadNotifications();
      loadUnreadCount();
    } else {
      // Clean up SSE connection when not authenticated
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [showUnreadOnly, filterType]);

  const setupSSE = () => {
    try {
      console.log('🔗 AdminNotificationCenter - setupSSE called');
      
      // Get JWT token from localStorage (admin only)
      const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_access_token');
      if (!token) {
        console.warn('❌ No admin JWT token found for SSE connection');
        console.log('Available localStorage keys:', Object.keys(localStorage));
        return;
      }
      
      console.log('✅ Found admin token for SSE:', token.substring(0, 20) + '...');
      
      // Close existing connection if any
      if (eventSourceRef.current) {
        console.log('🔄 AdminNotificationCenter - Closing existing SSE connection');
        eventSourceRef.current.close();
      }

      // Create new SSE connection with admin endpoint
      const sseUrl = `http://localhost:8080/api/v1/admin/notifications/stream?token=${encodeURIComponent(token)}`;
      console.log('🌐 AdminNotificationCenter - Creating SSE connection to:', sseUrl);
      
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;
      setIsConnected(false); // Reset connection status

      eventSource.onopen = () => {
        console.log('✅ Admin SSE connection established');
        setIsConnected(true);
        // Load notifications immediately after SSE connection is established
        loadNotifications();
        loadUnreadCount();
      };

      eventSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          console.log('🔔 Received admin notification via SSE:', notification);
          
          if (notification && notification.id) {
            // Smart add to notifications list - avoid duplicates
            setNotifications(prev => {
              const exists = prev.some(n => n.id === notification.id);
              if (!exists) {
                return [notification, ...prev];
              }
              return prev;
            });
            
            // Update unread count only if notification is new
            setUnreadCount(prev => {
              const exists = notifications.some(n => n.id === notification.id);
              return exists ? prev : prev + 1;
            });
            
            // Show browser notification if permission granted
            if (Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/logo192.png'
              });
            }
          }
        } catch (error) {
          console.error('Error parsing SSE notification:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ Admin SSE connection error:', error);
        console.log('SSE readyState:', eventSource.readyState);
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            console.log('🔄 AdminNotificationCenter - Attempting SSE reconnection...');
            setupSSE();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Error setting up SSE:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_access_token');
      if (!token) return;

      await fetch(`http://localhost:8080/api/v1/admin/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };


  const loadNotifications = async (silent = false) => {
    try {
      console.log('📥 AdminNotificationCenter - loadNotifications called', { silent, showUnreadOnly, filterType });
      if (!silent) {
        setLoading(true);
      }

      const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_access_token');
      if (!token) {
        console.warn('❌ No admin token found for loading notifications');
        return;
      }

      let url = `http://localhost:8080/api/v1/admin/notifications?limit=20`;
      if (showUnreadOnly) {
        url += '&unread=true';
      }
      if (filterType && filterType !== 'all') {
        url += `&type=${filterType}`;
      }
      
      console.log('🌐 AdminNotificationCenter - Fetching notifications from:', url);
      console.log('🔑 Using token:', token.substring(0, 20) + '...');
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 AdminNotificationCenter - Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 AdminNotificationCenter - Notifications data:', data);
        
        // Smart update: only update if there are actual changes
        const newNotifications = data.data.notifications || [];
        console.log('📝 AdminNotificationCenter - Found notifications:', newNotifications.length);
        
        setNotifications(prevNotifications => {
          console.log('🔄 AdminNotificationCenter - Updating notifications state');
          // Only update if notifications actually changed
          if (JSON.stringify(prevNotifications) !== JSON.stringify(newNotifications)) {
            console.log('✅ AdminNotificationCenter - Notifications updated');
            return newNotifications;
          }
          console.log('⏭️ AdminNotificationCenter - No changes, keeping existing notifications');
          return prevNotifications;
        });
      } else {
        console.error('❌ Failed to load admin notifications:', response.status);
      }
    } catch (error) {
      console.error('💥 Error loading admin notifications:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleNotificationClick = (notification) => {
    console.log('Notification clicked:', notification);

    // Mark as read if it's not already
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Check for order_id and navigate
    if (notification.order_id) {
      navigate(`/admin/orders/${notification.order_id}`);
      setIsOpen(false); // Close the dropdown after navigation
    }
  };

  const loadUnreadCount = async () => {
    try {
      // Use admin-specific API endpoint
      const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_access_token');
      const response = await fetch('http://localhost:8080/api/v1/admin/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const newCount = data.count || 0;
        setUnreadCount(prevCount => {
          // Only update if count actually changed to prevent unnecessary re-renders
          return prevCount !== newCount ? newCount : prevCount;
        });
      } else {
        console.error('Error loading admin unread count:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };


  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen && isAuthenticated) {
      // Load notifications only when opening dropdown and authenticated
      loadNotifications();
    }
  };

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="notification-center" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="notification-bell relative p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-colors duration-200"
        title="إشعارات الإدارة"
      >
        <FiBell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown absolute left-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="notification-header p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <FiBell className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">إشعارات الإدارة</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600">
                {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'جميع الإشعارات مقروءة'}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <FiCheckCircle className="h-4 w-4 ml-1" />
                  تعليم الكل كمقروء
                </button>
              )}
            </div>
          </div>

          {/* فلاتر الإشعارات */}
          <div className="notification-filters p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filterType === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilterType('admin_order_created')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filterType === 'admin_order_created' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                طلبات تجزئة
              </button>
              <button
                onClick={() => setFilterType('admin_wholesale_order')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filterType === 'admin_wholesale_order' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                طلبات جملة
              </button>
              <button
                onClick={() => setFilterType('admin_wholesale_submitted')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filterType === 'admin_wholesale_submitted' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ترقية حسابات
              </button>
            </div>
            <div className="flex items-center">
              <label className="flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={(e) => setShowUnreadOnly(e.target.checked)}
                  className="mr-2 rounded border-gray-300"
                />
                غير المقروءة فقط
              </label>
            </div>
          </div>

          <div className="notification-list max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                جاري التحميل...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiBell className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">لا توجد إشعارات إدارية</p>
                <p className="text-gray-400 text-sm mt-1">ستظهر الإشعارات الجديدة هنا</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const notificationIcon = NotificationIcons[notification.type] || NotificationIcons.default;
                const notificationColor = NotificationColors[notification.type] || NotificationColors.default;
                
                return (
                  <div
                    key={notification.id}
                    className={`notification-item relative p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                      !notification.is_read 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-r-4 shadow-sm' 
                        : 'hover:shadow-sm'
                    }`}
                    style={{
                      borderRightColor: !notification.is_read ? notificationColor : 'transparent'
                    }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* أيقونة الإشعار */}
                      <div 
                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-md"
                        style={{ backgroundColor: notificationColor }}
                      >
                        <span className="text-lg">{notificationIcon}</span>
                      </div>
                      
                      {/* محتوى الإشعار */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 transition-colors"
                                title="تعليم كمقروء"
                              >
                                <FiCheck className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                            {new Date(notification.created_at).toLocaleString('ar-SA', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          
                          {/* نوع الإشعار */}
                          <span 
                            className="text-xs px-2 py-1 rounded-full text-white font-medium"
                            style={{ backgroundColor: notificationColor }}
                          >
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* خط التدرج في الأسفل للإشعارات غير المقروءة */}
                    {!notification.is_read && (
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-60"
                      ></div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex items-center justify-between">
                <label className="flex items-center text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showUnreadOnly}
                    onChange={(e) => {
                      setShowUnreadOnly(e.target.checked);
                      loadNotifications();
                    }}
                    className="ml-2"
                  />
                  إظهار غير المقروءة فقط
                </label>
                <button
                  onClick={loadNotifications}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  تحديث
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminNotificationCenter;
