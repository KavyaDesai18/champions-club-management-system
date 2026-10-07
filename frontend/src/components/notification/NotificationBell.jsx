import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Clock,
  Sparkles,
  AlertTriangle,
  Award,
  Activity,
  Info,
  X,
} from 'lucide-react';
import { notificationsApi } from '../../api/notificationsApi';
import { emitToast } from '../../api/client';

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      const count =
        typeof res === 'number'
          ? res
          : typeof res?.unreadCount === 'number'
          ? res.unreadCount
          : typeof res?.data?.unreadCount === 'number'
          ? res.data.unreadCount
          : typeof res?.data === 'number'
          ? res.data
          : 0;
      setUnreadCount(count);
    } catch (err) {
      // User might be unauthenticated or offline
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationsApi.getMyNotifications({ page: 0, size: 10 });
      const items = res?.content || res?.data?.content || res?.data || (Array.isArray(res) ? res : []);
      setNotifications(items);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to real-time SSE stream
    const unsubscribe = notificationsApi.subscribeToStream(
      (newNotification) => {
        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        emitToast({
          id: Date.now(),
          type: 'info',
          title: newNotification.title,
          message: newNotification.message,
        });
      },
      (count) => {
        setUnreadCount(count);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'MEMBERSHIP_EXPIRY':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'MEMBERSHIP_RENEWED':
        return <Award className="w-4 h-4 text-emerald-400" />;
      case 'CHECK_IN':
        return <Activity className="w-4 h-4 text-cyan-400" />;
      default:
        return <Info className="w-4 h-4 text-brand-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Trigger */}
      <button
        type="button"
        id="notification-bell-btn"
        aria-label={`Notifications, ${unreadCount} unread`}
        onClick={handleToggle}
        className="p-2 rounded-xl border border-slate-800 bg-surface-900/60 text-slate-300 hover:text-white hover:border-slate-700 transition relative shrink-0"
      >
        <Bell className="w-4 h-4" />

        {/* Animated Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1"
          >
            <span className="relative flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500 text-white font-extrabold text-[10px] items-center justify-center shadow-glow">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          </motion.div>
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 sm:w-96 glass-card rounded-2xl border-slate-700/80 bg-surface-950/95 shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-extrabold text-white">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-white transition"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                  Loading alerts...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                  <Sparkles className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-300">You're all caught up!</p>
                  <p className="text-[11px] text-slate-500">No new alerts at this time.</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={(e) => !item.read && handleMarkRead(item.id, e)}
                    className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                      item.read
                        ? 'bg-transparent hover:bg-slate-900/40 text-slate-400'
                        : 'bg-brand-500/5 hover:bg-brand-500/10 text-white'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-surface-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                      {getNotificationIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-bold text-white truncate">
                          {item.title}
                        </h5>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0 shadow-glow" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
