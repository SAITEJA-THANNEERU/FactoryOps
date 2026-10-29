import React from 'react';
import { useRouter } from '../../contexts/RouterContext.tsx';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  BarChart3,
  Settings
} from 'lucide-react';

export const SuperAdminNavbar: React.FC = () => {
  const { currentPath, navigate, factoryDetailId } = useRouter();

  const navItems = [
    { path: '/super-admin/overview', label: 'Executive Overview & Role Monitor', icon: LayoutDashboard },
    { path: '/super-admin/factories', label: 'Factory Management', icon: Building2 },
    { path: '/super-admin/users', label: 'Tenant Users', icon: Users },
    { path: '/super-admin/system-health', label: 'System Health & IoT', icon: ShieldCheck },
    { path: '/super-admin/benchmarking', label: 'Benchmarking Analytics', icon: BarChart3 },
    { path: '/super-admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-slate-200/90 sticky top-16 z-30 overflow-x-auto scrollbar-none font-sans">
      <div className="max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-2 min-w-max">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive =
              currentPath === item.path ||
              (item.path === '/super-admin/factories' && !!factoryDetailId);

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-[#0E79B2] text-[#0E79B2] bg-[#0E79B2]/5'
                    : 'border-transparent text-slate-600 hover:text-[#191923] hover:bg-slate-50/70'
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
