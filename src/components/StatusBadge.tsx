import React from 'react';
import type { MachineStatus } from '../types/index.ts';

interface StatusBadgeProps {
  status: MachineStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normStatus = (status || '').toLowerCase();

  const getStyle = () => {
    switch (normStatus) {
      case 'running':
      case 'operational':
      case 'completed':
      case 'resolved':
      case 'healthy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
      case 'investigating':
      case 'in progress':
      case 'maintenance alert':
      case 'degraded':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'maintenance':
      case 'critical':
      case 'production slowdown':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'offline':
      case 'closed':
      case 'cancelled':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getDotColor = () => {
    switch (normStatus) {
      case 'running':
      case 'operational':
      case 'completed':
      case 'healthy':
        return 'bg-emerald-500';
      case 'warning':
      case 'investigating':
      case 'in progress':
        return 'bg-amber-500';
      case 'maintenance':
      case 'critical':
        return 'bg-rose-500';
      default:
        return 'bg-slate-400';
    }
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${getStyle()} ${pad}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDotColor()}`} />
      <span className="capitalize">{status}</span>
    </span>
  );
};
