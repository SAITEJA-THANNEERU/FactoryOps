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
  Trash2
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
  const { notifications, unreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications } = useData();
  const { navigate } = useRouter();

  const [filterTab, setFilterTab] = useState<'all' | 'alerts' | 'tasks'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);

  const filteredNotifications = notifications.filter(n => {
    if (filterTab === 'alerts') return n.type === 'incident' || n.type === 'machine';
    if (filterTab === 'tasks') return n.type === 'work_order';
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

  const handleItemClick = (notification: NotificationItem) => {
    markNotificationAsRead(notification.id);
    onClose();
    navigate(notification.targetPath);
  };

  const unreadCount = unreadNotificationsCount;

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      role="region"
      aria-label="Operational Notifications"
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-[#191923]/15 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800"
    >
      {/* Header */}
      <div className="bg-[#191923] text-white px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#0E79B2]">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight">
              Operational Notifications
            </h3>
            <span className="text-[10px] text-slate-300">
              {unreadCount} unread alarm{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 ? (
            <button
              onClick={handleMarkAllAsRead}
              className="text-[10px] font-bold text-sky-200 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#0E79B2]" />
              <span>Mark all read</span>
            </button>
          ) : (
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" />
              <span>All clear</span>
            </span>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="text-[10px] font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-rose-900/40 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs"
              title="Clear all notifications from history"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Clear all</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center gap-1 text-[11px]">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
            filterTab === 'all'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilterTab('alerts')}
          className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
            filterTab === 'alerts'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Incidents & Telemetry
        </button>
        <button
          onClick={() => setFilterTab('tasks')}
          className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
            filterTab === 'tasks'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Work Orders
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">All Alarms Clear</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              No active warnings or unassigned critical orders pending on plant floor.
            </p>
          </div>
        ) : (
          filteredNotifications.map(item => (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 relative border-b border-slate-100 ${
                !item.read
                  ? 'bg-blue-50/90 border-l-4 border-l-[#0E79B2] hover:bg-blue-100/80 shadow-2xs'
                  : 'bg-slate-50/60 hover:bg-slate-100/70 border-l-4 border-l-transparent opacity-80'
              }`}
            >
              {/* Type Icon */}
              <div
                className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  item.type === 'incident'
                    ? 'bg-rose-100 text-rose-700'
                    : item.type === 'machine'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {item.type === 'incident' ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : item.type === 'machine' ? (
                  <Cpu className="w-3.5 h-3.5" />
                ) : (
                  <ClipboardList className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className={`text-xs truncate ${!item.read ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                    {item.title}
                  </h4>
                  {!item.read ? (
                    <span
                      onClick={e => handleMarkAsRead(item.id, e)}
                      title="Click to mark as read"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#0E79B2] hover:bg-sky-700 text-white shrink-0 font-mono tracking-tight shadow-2xs cursor-pointer transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      NEW
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 font-medium shrink-0">
                      <CheckCheck className="w-3 h-3 text-emerald-600" />
                      Read
                    </span>
                  )}
                </div>

                <p className={`text-[11px] line-clamp-2 leading-snug ${!item.read ? 'text-slate-800' : 'text-slate-500'}`}>
                  {item.description}
                </p>

                <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                  <span className="truncate">{item.meta}</span>
                  <span className="shrink-0">{item.timestamp}</span>
                </div>
              </div>

              {/* Explicit Mark as Read Button */}
              {!item.read && (
                <button
                  onClick={e => handleMarkAsRead(item.id, e)}
                  className="shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-[#0E79B2] text-[#0E79B2] hover:text-white border border-[#0E79B2]/40 rounded-md text-[10px] font-bold transition-all shadow-2xs cursor-pointer self-center whitespace-nowrap"
                  title="Mark this notification as read"
                >
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Mark read</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span>Real operational alarms from live plant floor</span>
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
