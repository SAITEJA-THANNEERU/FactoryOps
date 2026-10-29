import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useRouter } from '../contexts/RouterContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { api } from '../services/api.ts';
import { GlobalSearch } from './GlobalSearch.tsx';
import { NotificationPopover } from './NotificationPopover.tsx';
import { UserProfileModal } from './UserProfileModal.tsx';
import { MobileNavDrawer } from './MobileNavDrawer.tsx';
import { Logo } from './Logo.tsx';
import {
  Factory as FactoryIcon,
  LogOut,
  ArrowLeft,
  Building2,
  Clock,
  UserCheck,
  Bell,
  Sparkles,
  Menu,
  Database
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, activeFactory, inspectingFactory, stopInspectingFactory, logout } = useAuth();
  const { navigate } = useRouter();
  const { unreadNotificationsCount, machines } = useData();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  const bellButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    api.system.getStatus().then(setSystemStatus).catch(() => {});
  }, []);

  const handleBackToSuperAdmin = () => {
    stopInspectingFactory();
    navigate('/super-admin/overview');
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ADMIN':
      case 'FACTORY_OWNER':
        return 'Factory Admin';
      case 'MANAGER_SUPERVISOR':
      case 'FACTORY_MANAGER':
      case 'SUPERVISOR':
        return 'Manager / Supervisor';
      case 'TECHNICIAN':
      case 'OPERATOR':
        return 'Technician';
      case 'PRODUCTION_PLANNER':
      case 'ANALYST':
        return 'Production Planner';
      default:
        return role || 'Operator';
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ADMIN':
      case 'FACTORY_OWNER':
        return 'bg-blue-50 text-[#0E79B2] border-blue-200';
      case 'MANAGER_SUPERVISOR':
      case 'FACTORY_MANAGER':
      case 'SUPERVISOR':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'TECHNICIAN':
      case 'OPERATOR':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'PRODUCTION_PLANNER':
      case 'ANALYST':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ADMIN':
      case 'FACTORY_OWNER':
        return 'Admin';
      case 'MANAGER_SUPERVISOR':
      case 'FACTORY_MANAGER':
      case 'SUPERVISOR':
        return 'Manager';
      case 'TECHNICIAN':
      case 'OPERATOR':
        return 'Technician';
      case 'PRODUCTION_PLANNER':
      case 'ANALYST':
        return 'Planner';
      default:
        return role || 'User';
    }
  };

  return (
    <header className="bg-white border-b border-[#191923]/10 text-[#191923] sticky top-0 z-40 shadow-xs">
      {/* Super Admin Inspection Banner if inspecting a specific factory */}
      {inspectingFactory && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-bold uppercase tracking-wider text-amber-800">Inspecting Tenant:</span>
            <span className="font-bold text-slate-900">{inspectingFactory.name}</span>
            <span className="hidden sm:inline text-amber-800">
              ({inspectingFactory.location} • {inspectingFactory.industry})
            </span>
          </div>
          <button
            onClick={handleBackToSuperAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#191923] hover:bg-[#191923]/80 text-white font-medium rounded text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Factories</span>
          </button>
        </div>
      )}

      <div className="max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile Menu Toggle & Branding */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile Navigation Drawer Button (< 1024px) */}
          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Open Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo & Platform Name */}
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <Logo className="w-9 h-9" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-[#191923]">FactoryOps</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">Asset & Operations Intelligence</p>
            </div>
          </div>

          {/* Plant Context Tag */}
          {activeFactory && (
            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-slate-200">
              <div className="p-1 rounded bg-slate-100 border border-slate-200 text-slate-600">
                <Building2 className="w-3.5 h-3.5 text-[#0E79B2]" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#191923] truncate max-w-[180px]">
                  {activeFactory.name}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{activeFactory.location}</span>
                  <span className="text-slate-300">•</span>
                  <span>{activeFactory.factory_code}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center: Global Search Component (Desktop + Mobile) */}
        <GlobalSearch />

        {/* Right: Actions, Role Switcher, Notifications, User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Authenticated Role (Read-only security badge) */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getRoleBadgeStyle(user?.role)}`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Role:</span>
            <span className="font-bold">{getRoleLabel(user?.role)}</span>
          </div>

          {/* Transparent Data Source Indicator */}
          <div className="relative group hidden lg:block">
            <button
              onClick={() => navigate('/super-admin/health')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                systemStatus?.isSupabaseHealthy
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Data Source & Supabase Connection Status"
            >
              <Database className={`w-3.5 h-3.5 ${systemStatus?.isSupabaseHealthy ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className="hidden xl:inline">
                {systemStatus?.isSupabaseHealthy ? 'Live Supabase (PostgreSQL)' : 'CSV Dataset Fallback'}
              </span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl p-3 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 text-xs">
              <div className="font-bold text-slate-900 mb-1 flex items-center justify-between">
                <span>Operational Data Source</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${systemStatus?.isSupabaseHealthy ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {systemStatus?.isSupabaseHealthy ? 'Live Cloud DB' : 'Validated Local Dataset'}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed mb-2 text-[11px]">
                {systemStatus?.isSupabaseHealthy
                  ? 'Connected directly to remote PostgreSQL instance via Supabase client with real-time replication.'
                  : 'Serving live records backed by atomic server disk persistence and continuous Supabase sync.'}
              </p>
              <div className="bg-slate-50 rounded-lg p-2 font-mono text-[10px] space-y-0.5 text-slate-700 border border-slate-100">
                <div>Fleet: {systemStatus?.activeCounts?.machines ?? machines.length} units</div>
                <div>Storage: Persistent File Store + Supabase Dual-Write</div>
                <div>Cloud Sync: {systemStatus?.isSupabaseHealthy ? 'Healthy & Connected' : 'Continuous Sync Active'}</div>
              </div>
            </div>
          </div>

          {/* AI Operations Copilot Trigger Button */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('factoryops:open-ai-chat'))}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
            title="Ask FactoryOps AI Operations Copilot"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">AI Copilot</span>
          </button>

          {/* Notifications Bell with Popover */}
          <div className="relative">
            <button
              ref={bellButtonRef}
              onClick={() => setIsNotificationsOpen(prev => !prev)}
              aria-label={`Notifications (${unreadNotificationsCount} unread)`}
              className={`p-2 rounded-lg transition-colors relative cursor-pointer ${
                isNotificationsOpen ? 'bg-slate-100 text-[#0E79B2]' : 'text-slate-600 hover:text-[#191923] hover:bg-slate-100'
              }`}
              title="Operational Notifications & Alarms"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold leading-none shadow-2xs">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            <NotificationPopover
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              anchorRef={bellButtonRef}
            />
          </div>

          {/* User Profile Pill & Click Handler */}
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-left focus:outline-hidden focus:ring-2 focus:ring-[#0E79B2]/30"
              title="View User Profile & Permissions"
              aria-label="User Profile"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-[#191923] flex items-center justify-end gap-1">
                  <span>{user?.name}</span>
                  <UserCheck className="w-3.5 h-3.5 text-[#0E79B2]" />
                </div>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <span className={`text-[10px] font-semibold border px-1.5 py-0.2 rounded-md ${getRoleBadgeStyle(user?.role)}`}>
                    {getRoleDisplayName(user?.role)}
                  </span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-[#191923] text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </button>

            {/* Logout button */}
            <button
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />
    </header>
  );
};
