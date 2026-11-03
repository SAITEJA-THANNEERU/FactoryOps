import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { useRouter } from '../contexts/RouterContext.tsx';
import {
  Bell,
  X,
  AlertTriangle,
  ClipboardList,
  Cpu,
  Check,
  CheckCheck,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  Flame,
  ArrowRight
} from 'lucide-react';
import type { OperationalNotification as NotificationItem } from '../contexts/DataContext.tsx';

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  anchorRef
}) => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    deleteNotification
  } = useData();
  const { navigate } = useRouter();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'critical'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.read && !n.is_read;
    if (activeTab === 'critical') return n.priority === 'CRITICAL' || n.priority === 'HIGH' || n.severity === 'Critical' || n.severity === 'High';
    return true;
  });

  // Handle clicking outside & Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!isOpen) return;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorRef]);

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    markNotificationAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead();
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  const handleItemClick = (notification: NotificationItem) => {
    markNotificationAsRead(notification.id);
    onClose();
    if (notification.targetPath) {
      navigate(notification.targetPath);
    }
  };

  const renderPriorityBadge = (priority?: string, severity?: string) => {
    const p = (priority || severity || 'MEDIUM').toUpperCase();
    if (p === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300 font-mono shrink-0 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
          CRITICAL
        </span>
      );
    }
    if (p === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 font-mono shrink-0">
          <Flame className="w-2.5 h-2.5 text-amber-600" />
          HIGH
        </span>
      );
    }
    if (p === 'MEDIUM') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200 font-mono shrink-0">
          MEDIUM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-700 border border-slate-200 font-mono shrink-0">
        LOW
      </span>
    );
  };

  const renderModuleIcon = (item: NotificationItem) => {
    const mod = (item.related_module || item.type || '').toLowerCase();
    if (mod.includes('security') || item.notification_type?.includes('SECURITY')) {
      return <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />;
    }
    if (mod.includes('incident') || item.priority === 'CRITICAL') {
      return <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
    }
    if (mod.includes('machine') || mod.includes('telemetry')) {
      return <Cpu className="w-3.5 h-3.5 text-amber-600" />;
    }
    return <ClipboardList className="w-3.5 h-3.5 text-sky-600" />;
  };

  const unreadCount = unreadNotificationsCount;

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      role="region"
      aria-label="Operational Notifications"
      className="absolute right-0 top-full mt-2 w-88 sm:w-[420px] bg-white border border-[#191923]/15 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800"
    >
      {/* Header */}
      <div className="bg-[#191923] text-white px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#0E79B2]">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
              <span>Operational Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-600 text-white font-mono">
                  {unreadCount}
                </span>
              )}
            </h3>
            <span className="text-[10px] text-slate-300">
              Role-authorized live alerts & task updates
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-[10px] font-bold text-sky-200 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#0E79B2]" />
              <span>Mark all read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="text-[10px] font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-rose-900/40 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs"
              title="Clear all notifications"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Clear</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-1 text-[11px]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'unread'
                ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#0E79B2] text-white text-[9px] flex items-center justify-center font-bold font-mono">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('critical')}
            className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'critical'
                ? 'bg-white text-rose-900 shadow-2xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Priority Alerts
          </button>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-time</span>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              {activeTab === 'unread' ? 'No Unread Notifications' : 'All Clear'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {activeTab === 'unread'
                ? 'You are all caught up with your operational tasks and alerts.'
                : 'No pending alerts or notifications matching this filter.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map(item => {
            const isUnread = !item.read && !item.is_read;
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 relative border-b border-slate-100 group ${
                  isUnread
                    ? 'bg-blue-50/70 border-l-4 border-l-[#0E79B2] hover:bg-blue-100/70'
                    : 'bg-white hover:bg-slate-50 border-l-4 border-l-transparent opacity-85'
                }`}
              >
                {/* Module Icon Container */}
                <div
                  className={`p-1.5 rounded-lg shrink-0 mt-0.5 border ${
                    item.priority === 'CRITICAL' || item.severity === 'Critical'
                      ? 'bg-rose-50 border-rose-200'
                      : item.priority === 'HIGH' || item.severity === 'High'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {renderModuleIcon(item)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-1.5 mb-1 flex-wrap">
                    <div className="flex items-center gap-1.5 truncate">
                      {renderPriorityBadge(item.priority, item.severity)}
                      {item.related_module && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 truncate">
                          {item.related_module}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isUnread ? (
                        <button
                          onClick={e => handleMarkAsRead(item.id, e)}
                          title="Click to mark as read"
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0E79B2] hover:bg-sky-700 text-white font-mono shadow-2xs cursor-pointer transition-colors"
                        >
                          <Check className="w-2.5 h-2.5" />
                          <span>NEW</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400 font-mono">
                          <CheckCheck className="w-3 h-3 text-emerald-600" />
                          <span>Read</span>
                        </span>
                      )}
                      <button
                        onClick={e => handleDeleteItem(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-600 rounded transition-opacity"
                        title="Delete notification"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <h4 className={`text-xs leading-snug ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                    {item.title}
                  </h4>

                  <p className={`text-[11px] mt-0.5 line-clamp-2 leading-relaxed ${isUnread ? 'text-slate-800' : 'text-slate-500'}`}>
                    {item.description}
                  </p>

                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                    <span className="truncate">{item.meta}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span>{item.timestamp}</span>
                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-[#0E79B2] transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span>Click any card to open relevant module</span>
        <button
          onClick={onClose}
          className="text-[#0E79B2] hover:underline font-semibold cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
