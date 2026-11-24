import React from 'react';
import type { WorkOrderPriority } from '../types/index.ts';

interface PriorityBadgeProps {
  priority: WorkOrderPriority | string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const norm = (priority || '').toLowerCase();

  const getStyle = () => {
    switch (norm) {
      case 'critical':
        return 'bg-rose-50 text-rose-700 border-rose-300 font-semibold';
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'medium':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium ${getStyle()}`}>
      {priority}
    </span>
  );
};
