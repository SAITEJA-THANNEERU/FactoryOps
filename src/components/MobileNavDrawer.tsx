import React, { useEffect } from 'react';
import { useRouter } from '../contexts/RouterContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Logo } from './Logo.tsx';
import {
  X,
  LayoutDashboard,
  Cpu,
  TrendingUp,
  Wrench,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  BarChart3,
  BookOpen,
  Activity,
  Settings,
  CalendarCheck,
  Building2,
  LogOut,
  UserCheck,
  Sparkles,
  Users,
  ShieldCheck,
  Package
} from 'lucide-react';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  onOpenProfile
}) => {
  const { currentPath, navigate } = useRouter();
  const { user, activeFactory, logout } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getNavItems = () => {
    switch (user?.role) {
      case 'TECHNICIAN':
      case 'OPERATOR':
        return [
          { path: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
          { path: '/attendance', label: 'My Attendance', icon: CalendarCheck },
          { path: '/inventory', label: 'Spare Parts', icon: Package },
          { path: '/work-orders', label: 'My Work Orders', icon: ClipboardList },
          { path: '/machines', label: 'Assigned Machines', icon: Cpu },
          { path: '/maintenance', label: 'Maintenance', icon: Wrench },
          { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
          { path: '/sops', label: 'SOPs', icon: BookOpen }
        ];

      case 'PRODUCTION_PLANNER':
      case 'ANALYST':
        return [
          { path: '/dashboard', label: 'Planning Dashboard', icon: LayoutDashboard },
          { path: '/attendance', label: 'My Attendance', icon: CalendarCheck },
          { path: '/inventory', label: 'Spare Parts', icon: Package },
          { path: '/production', label: 'Production', icon: TrendingUp },
          { path: '/analytics', label: 'Production Analysis', icon: BarChart3 },
          { path: '/machines', label: 'Machine Performance', icon: Cpu },
          { path: '/operations', label: 'Downtime Analysis', icon: Activity },
          { path: '/work-orders', label: 'Work Orders', icon: ClipboardList }
        ];

      case 'MANAGER_SUPERVISOR':
      case 'FACTORY_MANAGER':
      case 'SUPERVISOR':
        return [
          { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
          { path: '/attendance', label: 'Attendance Hub', icon: CalendarCheck },
          { path: '/inventory', label: 'Spare Parts', icon: Package },
          { path: '/operations', label: 'Operations', icon: Activity },
          { path: '/production', label: 'Production', icon: TrendingUp },
          { path: '/machines', label: 'Machines', icon: Cpu },
          { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
          { path: '/work-orders', label: 'Work Orders', icon: ClipboardList },
          { path: '/quality', label: 'Quality', icon: CheckCircle2 },
          { path: '/sops', label: 'SOPs', icon: BookOpen }
        ];

      case 'SUPER_ADMIN':
        return [
          { path: '/super-admin/overview', label: 'Executive Overview & Role Monitor', icon: LayoutDashboard },
          { path: '/super-admin/factories', label: 'Factory Management', icon: Building2 },
          { path: '/super-admin/users', label: 'Tenant Users', icon: Users },
          { path: '/super-admin/system-health', label: 'System Health & IoT', icon: ShieldCheck },
          { path: '/super-admin/benchmarking', label: 'Benchmarking Analytics', icon: BarChart3 },
          { path: '/super-admin/settings', label: 'Settings', icon: Settings },
          { path: '/dashboard', label: 'Reserved Tenant View', icon: Activity }
        ];

      case 'ADMIN':
      case 'FACTORY_OWNER':
      default:
        return [
          { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
          { path: '/admin-attendance', label: 'Attendance Hub', icon: CalendarCheck },
          { path: '/operations', label: 'Operations', icon: Activity },
          { path: '/production', label: 'Production', icon: TrendingUp },
          { path: '/machines', label: 'Machines', icon: Cpu },
          { path: '/maintenance', label: 'Maintenance', icon: Wrench },
          { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
          { path: '/work-orders', label: 'Work Orders', icon: ClipboardList },
          { path: '/quality', label: 'Quality', icon: CheckCircle2 },
          { path: '/sops', label: 'SOPs', icon: BookOpen },
          { path: '/data-quality', label: 'Data Quality', icon: Activity },
          { path: '/admin', label: 'Administration', icon: Settings }
        ];
    }
  };

  const navItems = getNavItems();

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex">
      {/* Slide-over Container */}
      <div className="bg-white w-4/5 max-w-xs h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 bg-[#191923] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Logo className="w-8 h-8" />
            <div>
              <h2 className="text-sm font-extrabold tracking-tight">FactoryOps</h2>
              <p className="text-[10px] text-slate-400">{activeFactory?.name || 'Austin Plant'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card Shortcut */}
        <div
          onClick={() => {
            onClose();
            onOpenProfile();
          }}
          className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#191923] text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{user?.name}</div>
              <div className="text-[10px] text-[#0E79B2] font-semibold">{user?.role}</div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 underline font-medium">View Profile</span>
        </div>

        {/* Navigation Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path === '/dashboard' && currentPath === '/');

            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#0E79B2]/10 text-[#0E79B2]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0E79B2]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer: Authenticated Role & Sign Out */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
          {/* Authenticated Role Label */}
          <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Authenticated Role
              </span>
              <span className="font-bold text-[#191923]">
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' :
                 user?.role === 'ADMIN' ? 'Factory Admin' :
                 user?.role === 'MANAGER_SUPERVISOR' ? 'Manager / Supervisor' :
                 user?.role === 'TECHNICIAN' ? 'Technician' :
                 user?.role === 'PRODUCTION_PLANNER' ? 'Production Planner' : (user?.role || 'User')}
              </span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500" title="Active Verified Session" />
          </div>

          {/* AI Copilot trigger in mobile drawer */}
          <button
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('factoryops:open-ai-chat'));
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Open AI Copilot</span>
          </button>

          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Backdrop click area */}
      <div className="flex-1" onClick={onClose} />
    </div>
  );
};
