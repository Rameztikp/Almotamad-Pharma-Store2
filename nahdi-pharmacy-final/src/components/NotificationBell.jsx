import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
import notificationService from '../services/notificationService';

const formatTime = (ts) => {
  try {
    const d = new Date(ts);
    return d.toLocaleString('ar-EG');
  } catch {
    return '';
  }
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() => notificationService.getNotifications());
  const [position, setPosition] = useState({ top: 0, right: 0, isMobile: false });
  const btnRef = useRef(null);

  useEffect(() => {
    const unsub = notificationService.subscribe((list) => setItems(Array.isArray(list) ? list : []));
    return () => unsub && unsub();
  }, []);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

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
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2.5 rounded-full hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors duration-300"
        aria-label="الإشعارات"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-medium rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center shadow-sm">
            {unreadCount}
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
                onClick={() => notificationService.markAllRead()}
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
                  className={`px-4 py-3 border-b border-gray-50 text-right ${!n.read ? 'bg-blue-50/40' : ''}`}
                  onMouseEnter={() => !n.read && notificationService.markRead(n.id)}
                >
                  <div className="text-sm font-medium text-gray-800 mb-0.5">{n.title}</div>
                  {n.message && (
                    <div className="text-xs text-gray-600 mb-1">{n.message}</div>
                  )}
                  <div className="text-[11px] text-gray-400">{formatTime(n.createdAt)}</div>
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
