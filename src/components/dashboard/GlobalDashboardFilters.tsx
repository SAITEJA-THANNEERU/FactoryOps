import React from 'react';
import { useFilters } from '../../contexts/FilterContext.tsx';
import type { Machine } from '../../types/index.ts';
import { Filter, RotateCcw, Calendar, Layers, Cpu, Clock, AlertCircle } from 'lucide-react';

interface GlobalDashboardFiltersProps {
  machines?: Machine[];
  showStatusFilter?: boolean;
  showPriorityFilter?: boolean;
  showSeverityFilter?: boolean;
  showWorkOrderStatusFilter?: boolean;
}

export const GlobalDashboardFilters: React.FC<GlobalDashboardFiltersProps> = ({
  machines = [],
  showStatusFilter = false,
  showPriorityFilter = false,
  showSeverityFilter = false,
  showWorkOrderStatusFilter = false
}) => {
  const {
    selectedLine,
    setSelectedLine,
    selectedShift,
    setSelectedShift,
    selectedStatus,
    setSelectedStatus,
    selectedMachine,
    setSelectedMachine,
    selectedPriority,
    setSelectedPriority,
    selectedSeverity,
    setSelectedSeverity,
    selectedWorkOrderStatus,
    setSelectedWorkOrderStatus,
    timeRange,
    setTimeRange,
    resetFilters
  } = useFilters();

  const lines = Array.from(new Set(machines.map(m => m.line).filter(Boolean)));

  const hasActiveFilters =
    timeRange !== '7d' ||
    selectedLine !== 'all' ||
    selectedShift !== 'all' ||
    selectedMachine !== 'all' ||
    selectedStatus !== 'all' ||
    selectedPriority !== 'all' ||
    selectedSeverity !== 'all' ||
    selectedWorkOrderStatus !== 'all';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-2xs mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span>Interactive Operations Filter</span>
          <span className="text-slate-300">|</span>
          <span className="text-[11px] text-slate-500 font-normal">Cross-filters all KPI metrics, visuals & tables</span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-3 pt-3 border-t border-slate-100 text-xs">
        {/* Date Range Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>Date Range</span>
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white font-medium"
          >
            <option value="today">Today (Active Shifts)</option>
            <option value="7d">Last 7 Days (Default)</option>
            <option value="14d">Last 14 Days (Full Dataset)</option>
            <option value="all">All Available Records</option>
          </select>
        </div>

        {/* Production Line Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            <span>Production Line</span>
          </label>
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white font-medium"
          >
            <option value="all">All Lines ({machines.length} Units)</option>
            {lines.map(line => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>
        </div>

        {/* Machine Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-400" />
            <span>Equipment / Machine</span>
          </label>
          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white font-medium"
          >
            <option value="all">All Machines</option>
            {machines
              .filter(m => selectedLine === 'all' || m.line === selectedLine)
              .map(m => (
                <option key={m.id} value={m.machine_id}>
                  {m.machine_id} - {m.name}
                </option>
              ))}
          </select>
        </div>

        {/* Shift Filter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Shift</span>
          </label>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white font-medium"
          >
            <option value="all">All Shifts (24h)</option>
            <option value="Morning">Morning Shift (06:00 - 14:00)</option>
            <option value="Afternoon">Afternoon Shift (14:00 - 22:00)</option>
            <option value="Night">Night Shift (22:00 - 06:00)</option>
          </select>
        </div>

        {/* Optional Machine Status Filter */}
        {showStatusFilter && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-slate-400" />
              <span>Machine Status</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="running">Running</option>
              <option value="warning">Warning</option>
              <option value="maintenance">Maintenance</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        )}

        {/* Optional Priority Filter */}
        {showPriorityFilter && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Task Priority
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white font-medium"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        )}

        {/* Optional Severity Filter */}
        {showSeverityFilter && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Incident Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white font-medium"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        )}

        {/* Optional Work Order Status Filter */}
        {showWorkOrderStatusFilter && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Work Order Status
            </label>
            <select
              value={selectedWorkOrderStatus}
              onChange={(e) => setSelectedWorkOrderStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
