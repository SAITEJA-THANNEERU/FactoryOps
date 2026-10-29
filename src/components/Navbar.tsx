import React from 'react';
import { useRouter } from '../contexts/RouterContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
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
  Package
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const { user } = useAuth();

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
          { path: '/work-orders', label: 'Work Orders', icon: ClipboardList }
        ];

      case 'MANAGER_SUPERVISOR':
      case 'FACTORY_MANAGER':
      case 'SUPERVISOR':
        return [
          { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
          { path: '/attendance', label: 'Attendance Hub', icon: CalendarCheck },
          { path: '/inventory', label: 'Spare Parts', icon: Package },
          { path: '/production', label: 'Production', icon: TrendingUp },
          { path: '/machines', label: 'Machines', icon: Cpu },
          { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
          { path: '/work-orders', label: 'Work Orders', icon: ClipboardList },
          { path: '/quality', label: 'Quality', icon: CheckCircle2 },
          { path: '/sops', label: 'SOPs', icon: BookOpen }
        ];

      case 'SUPER_ADMIN':
        return [
          { path: '/dashboard', label: 'Reserved Dashboard', icon: LayoutDashboard },
          { path: '/super-admin/overview', label: 'Multi-Plant Overview', icon: Activity }
        ];

      case 'ADMIN':
      case 'FACTORY_OWNER':
      default:
        return [
          { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
          { path: '/attendance', label: 'Attendance Hub', icon: CalendarCheck },
          { path: '/inventory', label: 'Spare Parts Inventory', icon: Package },
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

  const factoryNavItems = getNavItems();

  return (
    <nav className="bg-white border-b border-[#191923]/10 sticky top-16 z-30 overflow-x-auto scrollbar-none shadow-2xs">
      <div className="max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-1.5 min-w-max py-1.5">
          {factoryNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || (item.path === '/dashboard' && currentPath === '/');

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#0E79B2]/10 text-[#0E79B2] shadow-2xs'
                    : 'text-slate-600 hover:text-[#191923] hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0E79B2]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
