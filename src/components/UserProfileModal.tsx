import React, { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  X,
  User,
  Mail,
  Shield,
  Building2,
  Calendar,
  CheckCircle2,
  LogOut,
  Award,
  KeyRound,
  ExternalLink
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, activeFactory, logout } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'ADMIN':
      case 'FACTORY_OWNER':
        return 'bg-blue-100 text-[#0E79B2] border-blue-300';
      case 'MANAGER_SUPERVISOR':
      case 'FACTORY_MANAGER':
      case 'SUPERVISOR':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'TECHNICIAN':
      case 'OPERATOR':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'PRODUCTION_PLANNER':
      case 'ANALYST':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getRoleCapabilities = (role?: string): string[] => {
    switch (role) {
      case 'SUPER_ADMIN':
        return [
          'Global multi-plant telemetry & benchmarking oversight',
          'Cross-tenant factory administration & tenant provisioning',
          'Role-based security audits & system health diagnostics',
          'Read & audit access across all 5 industrial facilities'
        ];
      case 'ADMIN':
      case 'FACTORY_OWNER':
        return [
          'Full plant asset management (Add, Edit, Decommission machines)',
          'Shift scheduling, work order creation & assignment',
          'Incident triage and root-cause verification',
          'Production quota management & factory configuration'
        ];
      case 'MANAGER_SUPERVISOR':
      case 'FACTORY_MANAGER':
      case 'SUPERVISOR':
        return [
          'Real-time shift performance monitoring & line coordination',
          'OEE tracking, downtime analysis & variance triage',
          'Incident escalation & floor technician supervision',
          'Daily throughput sign-off & shift handover reviews'
        ];
      case 'TECHNICIAN':
      case 'OPERATOR':
        return [
          'Assigned work order execution & status updates',
          'Machine vibration RMS and temperature limit logging',
          'First-line incident reporting & spare parts requisition',
          'Step-by-step SOP execution & maintenance logging'
        ];
      case 'PRODUCTION_PLANNER':
      case 'ANALYST':
        return [
          'Production target vs actual tracking & shortfall analytics',
          'Shift-by-shift scrap minimization & cycle time optimization',
          'Capacity planning across Machining, Stamping, & Assembly lines',
          'Maintenance schedule synchronization with production runs'
        ];
      default:
        return ['Standard factory floor read access'];
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
        className="bg-white border border-[#191923]/10 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header Banner */}
        <div className="bg-[#191923] text-white px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-lg font-bold shadow-xs">
              {user.name.charAt(0)}
            </div>
            <div>
              <h2 id="profile-title" className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>{user.name}</span>
                <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${getRoleBadgeStyle(user.role)}`}>
                  {user.role}
                </span>
              </h2>
              <p className="text-xs text-slate-300 font-mono mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3 h-3 text-[#0E79B2]" />
                <span>{user.email}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Profile"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
          {/* Identity & Account Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                User ID
              </span>
              <span className="font-mono font-semibold text-slate-900 mt-0.5 block truncate">
                {user.id}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Account Status
              </span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="capitalize">{user.status || 'Active'}</span>
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Assigned Plant
              </span>
              <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                {activeFactory?.name || user.factory_name || 'Multi-Plant / Global'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Location Code
              </span>
              <span className="font-mono font-semibold text-slate-900 mt-0.5 block truncate">
                {activeFactory?.factory_code || 'HQ-GLOBAL'} ({activeFactory?.location?.split(',')[0] || 'Austin'})
              </span>
            </div>
          </div>

          {/* Plant Context Details */}
          {activeFactory && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 flex items-start gap-3">
              <Building2 className="w-4 h-4 text-[#0E79B2] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs">
                  {activeFactory.name}
                </div>
                <p className="text-[11px] text-blue-800/90 mt-0.5">
                  Industry: {activeFactory.industry} • Established {activeFactory.established_year} • Capacity: {activeFactory.capacity}
                </p>
              </div>
            </div>
          )}

          {/* Role & Authorized Capabilities */}
          <div>
            <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5 text-[#0E79B2]" />
              <span>Role Permissions & Access Scope</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              {getRoleCapabilities(user.role).map((cap, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0E79B2] shrink-0 mt-1.5" />
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security Notice */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center gap-2">
            <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Role permissions and factory assignments are managed centrally by the Plant Super Administrator.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#191923] hover:bg-[#191923]/80 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
