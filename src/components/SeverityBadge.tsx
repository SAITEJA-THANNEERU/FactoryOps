import React from 'react';
import type { IncidentSeverity } from '../types/index.ts';

interface SeverityBadgeProps {
  severity: IncidentSeverity | string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const norm = (severity || '').toLowerCase();

  const getStyle = () => {
    switch (norm) {
      case 'critical':
        return 'bg-rose-50 text-rose-700 border-rose-300 font-semibold';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${getStyle()}`}>
      {severity}
    </span>
  );
};
