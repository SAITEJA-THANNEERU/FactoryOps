import React, { useState } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { useFilters } from '../contexts/FilterContext.tsx';
import { GlobalFilterBar } from '../components/GlobalFilterBar.tsx';
import { LogProductionModal } from '../components/LogProductionModal.tsx';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';
import {
  formatWholeNumber,
  formatPercent,
  formatScrap,
  formatNumber
} from '../utils/formatters.ts';
import { useSearchHighlight } from '../utils/useSearchHighlight.ts';

export const ProductionPage: React.FC = () => {
  const { production, machines, kpis, createProductionRecord, deleteProductionRecord } = useData();
  const { selectedShift, selectedLine, searchQuery } = useFilters();
  const { highlightId, isHighlighted, highlightRef, highlightClass } = useSearchHighlight();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const filteredProduction = production.filter(p => {
    if (highlightId && (
      (p.machine_id && p.machine_id.toLowerCase().includes(highlightId.toLowerCase())) ||
      (p.id && String(p.id).toLowerCase().includes(highlightId.toLowerCase())) ||
      (p.shift && p.shift.toLowerCase() === highlightId.toLowerCase())
    )) {
      return true;
    }
    // Line filtering
    if (selectedLine && selectedLine !== 'all') {
      const lineMatch =
        (p.line_id && p.line_id.toLowerCase() === selectedLine.toLowerCase()) ||
        (p.line_name && p.line_name.toLowerCase() === selectedLine.toLowerCase()) ||
        (p.machine_id && selectedLine.toLowerCase().includes(p.machine_id.toLowerCase()));
      if (!lineMatch) return false;
    }

    // Shift filtering
    if (selectedShift && selectedShift !== 'all') {
      const s = (p.shift || '').toUpperCase().trim();
      const target = selectedShift.toUpperCase().trim();
      const isMatch =
        s === target ||
        ((target === 'A' || target === 'MORNING') && (s === 'A' || s === 'MORNING')) ||
        ((target === 'B' || target === 'AFTERNOON') && (s === 'B' || s === 'AFTERNOON')) ||
        ((target === 'C' || target === 'NIGHT') && (s === 'C' || s === 'NIGHT'));
      if (!isMatch) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const mId = (p.machine_id || '').toLowerCase();
      const op = (p.operator || p.operator_name || '').toLowerCase();
      const prod = (p.product_name || p.product_id || '').toLowerCase();
      return mId.includes(q) || op.includes(q) || prod.includes(q);
    }
    return true;
  });

  // Calculate pagination slice
  const totalRecords = filteredProduction.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const currentRecords = filteredProduction.slice(startIndex, startIndex + pageSize);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this production record permanently from database?')) return;
    setDeletingId(id);
    try {
      await deleteProductionRecord(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete record');
    } finally {
      setDeletingId(null);
    }
  };

  // Dynamic calculations from real records
  const totalActual = production.reduce((acc, p) => acc + (p.actual_units || 0), 0);
  const totalTarget = production.reduce((acc, p) => acc + (p.target_units ?? (p as any).planned_units ?? 0), 0);
  const totalDefects = production.reduce((acc, p) => acc + (p.defective_units ?? (p as any).defect_units ?? 0), 0);
  const defectRate = totalActual > 0 ? (totalDefects / totalActual) * 100 : 0;
  const avgCycleTime = production.length > 0
    ? (production.reduce((acc, p) => acc + (p.cycle_time_sec || 45), 0) / production.length).toFixed(1)
    : '0.0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>Production Runs & Shift Output</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Shift-by-shift output, scrap generation, and cycle time performance
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Shift Output</span>
        </button>
      </div>

      <GlobalFilterBar />

      {/* Summary KPI Cards with dynamic calculations */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Actual Output</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatWholeNumber(kpis?.total_production_units || totalActual)} units
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Production Target</span>
          <div className="text-2xl font-bold text-slate-600 mt-1">
            {formatWholeNumber(kpis?.target_production_units || totalTarget)} units
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Defects Flagged</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {formatWholeNumber(kpis?.defective_units || totalDefects)} ({formatPercent(kpis?.defect_rate_pct || defectRate)})
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Avg Cycle Time</span>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{avgCycleTime} sec</div>
        </div>
      </div>

      {/* Production Log Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>Production Log Records</span>
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-mono text-slate-600">
              {totalRecords} Total
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-normal text-slate-500">
            <span>Showing {totalRecords === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + pageSize, totalRecords)} of {totalRecords}</span>
            <div className="flex items-center gap-1">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold z-10">
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Machine ID</th>
                <th className="py-3 px-4">Shift</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Actual</th>
                <th className="py-3 px-4">Defects</th>
                <th className="py-3 px-4">Scrap (kg)</th>
                <th className="py-3 px-4">Cycle Time</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentRecords.map(p => {
                const highlighted = isHighlighted(p.machine_id, p.id ? String(p.id) : null, p.shift, p.operator);
                return (
                  <tr
                    key={p.id}
                    ref={highlighted ? highlightRef : undefined}
                    className={`transition-colors ${highlighted ? highlightClass : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {new Date(p.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-emerald-800">{p.machine_id}</td>
                    <td className="py-2.5 px-4">{p.shift}</td>
                    <td className="py-2.5 px-4">{formatWholeNumber(p.target_units ?? (p as any).planned_units ?? 0)}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{formatWholeNumber(p.actual_units ?? 0)}</td>
                    <td className="py-2.5 px-4 text-rose-600 font-semibold">{formatWholeNumber(p.defective_units ?? (p as any).defect_units ?? 0)}</td>
                    <td className="py-2.5 px-4">{formatScrap(p.scrap_kg ?? 0)}</td>
                    <td className="py-2.5 px-4">{formatNumber(p.cycle_time_sec ?? 45, 1)}s</td>
                    <td className="py-2.5 px-4 text-slate-600">{p.operator || (p as any).operator_name || 'Plant Operator'}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                        title="Delete record"
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Control Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Page <span className="font-semibold">{validPage}</span> of <span className="font-semibold">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={validPage === 1}
              className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-medium disabled:opacity-40 transition-colors cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={validPage === totalPages}
              className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-medium disabled:opacity-40 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <LogProductionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        machines={machines}
        onSubmit={async data => {
          await createProductionRecord(data);
        }}
      />
    </div>
  );
};
export default ProductionPage;
