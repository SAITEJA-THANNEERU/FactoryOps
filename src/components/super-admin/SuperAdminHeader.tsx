import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useRouter } from '../../contexts/RouterContext.tsx';
import { useData } from '../../contexts/DataContext.tsx';
import { UserProfileModal } from '../UserProfileModal.tsx';
import { NotificationPopover } from '../NotificationPopover.tsx';
import { MobileNavDrawer } from '../MobileNavDrawer.tsx';
import { Logo } from '../Logo.tsx';
import {
  Factory as FactoryIcon,
  LogOut,
  Building2,
  ShieldCheck,
  Search,
  Bell,
  UserCheck,
  Sparkles,
  Menu
} from 'lucide-react';

export const SuperAdminHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const { navigate } = useRouter();
  const { incidents, workOrders, machines } = useData();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const bellButtonRef = useRef<HTMLButtonElement>(null);

  const handleOpenAICopilot = () => {
    window.dispatchEvent(new CustomEvent('factoryops:open-ai-chat'));
  };

  // Live alerts for Super Admin
  const unreadAlertsCount = useMemo(() => {
    const criticalIncidents = incidents.filter(
      i => i.status !== 'Closed' && (i.severity === 'Critical' || i.severity === 'High')
    ).length;
    const pendingOrders = workOrders.filter(
      w => w.status === 'Pending Parts' || w.priority === 'Critical'
    ).length;
    const warningMachines = machines.filter(m => m.status === 'warning').length;
    return criticalIncidents + pendingOrders + warningMachines;
  }, [incidents, workOrders, machines]);

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 shadow-xs">
      <div className="max-w-[1850px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Branding & Tenant Mode */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Mobile Navigation Drawer Toggle (< 1024px) */}
          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="lg:hidden p-1.5 sm:p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Open Navigation Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate('/super-admin/overview')}
            className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-hidden cursor-pointer"
          >
            <Logo className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 font-display">FactoryOps</span>
                <span className="text-[9px] sm:text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-300 px-1.5 py-0.2 rounded uppercase tracking-wider">
                  Super Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">Apex Plant Operations</p>
            </div>
          </button>

          {/* Prominent Active Factory Indicator */}
          <div className="flex items-center gap-2 pl-2 sm:pl-4 border-l border-slate-200">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-lg bg-emerald-50/90 border border-emerald-300 text-emerald-900 shadow-2xs">
              <Building2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-emerald-600 shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1 sm:gap-1.5 leading-tight">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-600 hidden xs:inline">Active:</span>
                  <span className="text-xs font-black text-emerald-950 font-mono tracking-wide">APEX</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <span className="text-[9px] text-emerald-700 font-medium leading-none hidden xl:block">Apex Precision Manufacturing (APX-01)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Authenticated Role, AI Copilot, Notifications, User Info, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* AI Copilot Direct Launcher Button */}
          <button
            onClick={handleOpenAICopilot}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-purple-900 to-slate-900 hover:from-purple-800 hover:to-slate-800 text-white text-xs font-semibold shadow-xs transition-all duration-200 border border-purple-400/20 hover:scale-[1.02] cursor-pointer"
            title="Open Enterprise AI Operations Copilot"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden xs:inline">AI Copilot</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-800/80 text-purple-200 hidden 2xl:inline">
              Flash
            </span>
          </button>

          {/* Authenticated Role Badge (Read-only security badge) */}
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-lg text-xs font-semibold text-purple-800">
            <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider hidden 2xl:inline">Role:</span>
            <span>Super Admin</span>
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              ref={bellButtonRef}
              onClick={() => setIsNotificationsOpen(prev => !prev)}
              aria-label={`Notifications (${unreadAlertsCount} unread)`}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors relative cursor-pointer ${
                isNotificationsOpen ? 'bg-slate-100 text-[#0E79B2]' : 'text-slate-600 hover:text-[#191923] hover:bg-slate-100'
              }`}
              title="Operational Notifications & Alarms"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[15px] h-3.5 px-0.5 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold leading-none shadow-2xs">
                  {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                </span>
              )}
            </button>

            <NotificationPopover
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              anchorRef={bellButtonRef}
            />
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-1 sm:gap-2 pl-1.5 sm:pl-2.5 border-l border-slate-200">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-left focus:outline-hidden"
              title="View User Profile & Permissions"
              aria-label="User Profile"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900 flex items-center justify-end gap-1">
                  <span className="truncate max-w-[100px] xl:max-w-[140px]">{user?.name || 'Super Admin'}</span>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                </div>
                <div className="text-[10px] text-slate-500 font-medium hidden 2xl:block">Global Application Admin</div>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
                {user?.name?.charAt(0) || 'S'}
              </div>
            </button>

            <button
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Mobile Navigation Drawer for Super Admin */}
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />
    </header>
  );
};
