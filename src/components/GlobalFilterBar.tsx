import React from 'react';
import { useFilters } from '../contexts/FilterContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { Filter, Search, RotateCcw } from 'lucide-react';

export const GlobalFilterBar: React.FC = () => {
  const {
    selectedLine,
    setSelectedLine,
    selectedShift,
    setSelectedShift,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery,
    resetFilters
  } = useFilters();

  const { machines } = useData();
  const lines = Array.from(new Set(machines.map(m => m.line || m.line_name))).filter(Boolean);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm shadow-xs">
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs shrink-0">
          <Filter className="w-3.5 h-3.5 text-[#0E79B2]" />
          <span>Filters:</span>
        </div>

        {/* Line Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-500 text-xs hidden sm:inline">Line:</label>
          <select
            value={selectedLine}
            onChange={e => setSelectedLine(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#0E79B2] transition-colors"
          >
            <option value="all">All Lines</option>
            {lines.map(line => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>
        </div>

        {/* Shift Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-500 text-xs hidden sm:inline">Shift:</label>
          <select
            value={selectedShift}
            onChange={e => setSelectedShift(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#0E79B2] transition-colors"
          >
            <option value="all">All Shifts</option>
            <option value="A">Shift A (Morning)</option>
            <option value="B">Shift B (Afternoon)</option>
            <option value="C">Shift C (Night)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-slate-500 text-xs hidden sm:inline">Status:</label>
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#0E79B2] transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="running">Running</option>
            <option value="warning">Warning</option>
            <option value="maintenance">Maintenance</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <button
          onClick={resetFilters}
          className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          title="Reset Filters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="relative min-w-[160px] w-full sm:w-64">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter table rows..."
          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-hidden focus:border-[#0E79B2] placeholder-slate-400 transition-colors"
        />
      </div>
    </div>
  );
};
