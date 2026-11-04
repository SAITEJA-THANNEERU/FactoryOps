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
  ArrowRight,
  Info,
  Clock,
  Calendar,
  User
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

  const resolveNotificationNavigation = (notification: NotificationItem): string => {
    let target = notification.targetPath || (notification as any).target_path || '/';
    if (!target.startsWith('/')) {
      target = `/${target}`;
    }

    const mod = (notification.related_module || '').toLowerCase();
    const type = (notification.notification_type || notification.type || '').toLowerCase();
    const recordId = notification.related_record_id;

    if (mod.includes('incident') || type.includes('incident')) {
      target = '/incidents';
    } else if (mod.includes('work') || type.includes('work_order') || type.includes('assignment') || type.includes('technician_assignment')) {
      target = '/work-orders';
    } else if (mod.includes('machine') || type.includes('machine') || type.includes('telemetry')) {
      target = '/machines';
    } else if (mod.includes('production') || type.includes('production')) {
      target = '/production';
    } else if (mod.includes('maintenance')) {
      target = '/maintenance';
    } else if (mod.includes('inventory') || type.includes('inventory')) {
      target = '/inventory';
    } else if (mod.includes('security') || type.includes('security') || type.includes('system')) {
      target = '/super-admin/overview';
    } else if (target.includes('dashboard')) {
      if (mod.includes('incident')) target = '/incidents';
      else if (mod.includes('work')) target = '/work-orders';
      else if (mod.includes('machine')) target = '/machines';
      else if (mod.includes('production')) target = '/production';
      else if (mod.includes('maintenance')) target = '/maintenance';
    }

    if (recordId) {
      const sep = target.includes('?') ? '&' : '?';
      if (!target.includes('highlight=') && !target.includes('id=')) {
        target = `${target}${sep}highlight=${encodeURIComponent(recordId)}`;
      }
    }

    return target;
  };

  const handleItemClick = (notification: NotificationItem) => {
    markNotificationAsRead(notification.id);
    onClose();
    const destination = resolveNotificationNavigation(notification);
    navigate(destination);
  };

  const renderPriorityBadge = (priority?: string, severity?: string) => {
    const p = (priority || severity || 'MEDIUM').toUpperCase();
    if (p === 'CRITICAL' || p === 'HIGH') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 font-mono shrink-0 shadow-2xs">
          <Flame className="w-3 h-3 text-amber-600" />
          {p}
        </span>
      );
    }
    if (p === 'MEDIUM') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200 font-mono shrink-0">
          MEDIUM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono shrink-0">
        LOW
      </span>
    );
  };

  const renderModuleIcon = (item: NotificationItem) => {
    const mod = (item.related_module || item.type || '').toLowerCase();
    if (mod.includes('security') || item.notification_type?.includes('SECURITY')) {
      return <ShieldAlert className="w-4 h-4 text-purple-600" />;
    }
    if (mod.includes('incident') || item.priority === 'CRITICAL' || item.priority === 'HIGH') {
      return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    }
    if (mod.includes('machine') || mod.includes('telemetry')) {
      return <Cpu className="w-4 h-4 text-amber-600" />;
    }
    return <ClipboardList className="w-4 h-4 text-[#0E79B2]" />;
  };

  const unreadCount = unreadNotificationsCount;

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      role="region"
      aria-label="Operational Notifications"
      className="absolute right-0 top-full mt-2 w-[380px] sm:w-[480px] bg-white border border-[#191923]/20 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800"
    >
      {/* Header matching reference image */}
      <div className="bg-[#191923] text-white px-5 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#0E79B2] shadow-inner">
            <Bell className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Operational Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white font-mono shadow-sm">
                  {unreadCount}
                </span>
              )}
            </h3>
            <span className="text-xs text-slate-300 font-medium">
              Role-authorized live alerts & task updates
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-bold text-white bg-[#0E79B2] hover:bg-sky-600 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="text-xs font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-rose-900/50 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs border border-white/10"
              title="Clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Realtime Indicator matching reference image */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-[#0E79B2] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>All ({notifications.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
              activeTab === 'unread'
                ? 'bg-[#0E79B2] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black font-mono ${
                activeTab === 'unread' ? 'bg-white text-[#0E79B2]' : 'bg-[#0E79B2] text-white'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('critical')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
              activeTab === 'critical'
                ? 'bg-[#0E79B2] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Priority Alerts</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>Real-time</span>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[420px] overflow-y-auto p-4 space-y-3 bg-slate-100/50">
        {filteredNotifications.length === 0 ? (
          <div className="p-10 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">
              {activeTab === 'unread' ? 'No Unread Notifications' : 'All Clear'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
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
                className={`p-4 rounded-2xl transition-all cursor-pointer flex items-start gap-3.5 relative border shadow-xs group hover:shadow-md ${
                  isUnread
                    ? 'bg-white border-[#0E79B2]/40 ring-1 ring-[#0E79B2]/20'
                    : 'bg-white/90 border-slate-200 opacity-90 hover:opacity-100'
                }`}
              >
                {/* Module Icon Container */}
                <div
                  className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                    item.priority === 'CRITICAL' || item.severity === 'Critical'
                      ? 'bg-rose-50 border-rose-200'
                      : item.priority === 'HIGH' || item.severity === 'High'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  {renderModuleIcon(item)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-2 truncate">
                      {renderPriorityBadge(item.priority, item.severity)}
                      {item.related_module && (
                        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 truncate">
                          {item.related_module}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isUnread ? (
                        <button
                          onClick={e => handleMarkAsRead(item.id, e)}
                          title="Click to mark as read"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#0E79B2] hover:bg-sky-700 text-white font-mono shadow-2xs cursor-pointer transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          <span>NEW</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Read</span>
                        </span>
                      )}
                      <button
                        onClick={e => handleDeleteItem(item.id, e)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className={`text-xs sm:text-sm leading-snug tracking-tight ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
                    {item.title}
                  </h4>

                  <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${isUnread ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                    {item.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500 font-medium">
                    <span className="truncate flex items-center gap-1 text-slate-600">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {item.meta || 'System Broadcast'}
                    </span>
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.timestamp}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0E79B2] transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer matching reference image */}
      <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#0E79B2]" />
          <span>Click any card to open relevant module</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#E1EEF6] hover:bg-[#cbe3f3] text-[#0E79B2] transition cursor-pointer shadow-2xs"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
