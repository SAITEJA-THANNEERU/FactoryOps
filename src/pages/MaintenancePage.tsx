import React, { useState } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { CreateWorkOrderModal } from '../components/CreateWorkOrderModal.tsx';
import { LogMaintenanceModal } from '../components/LogMaintenanceModal.tsx';
import { Wrench, Plus, Trash2, Calendar } from 'lucide-react';
import { formatDuration, formatCurrency } from '../utils/formatters.ts';
import { useSearchHighlight } from '../utils/useSearchHighlight.ts';

export const MaintenancePage: React.FC = () => {
  const {
    maintenance,
    machines,
    createWorkOrder,
    createMaintenanceRecord,
    deleteMaintenanceRecord
  } = useData();
  const { isHighlighted, highlightRef, highlightClass } = useSearchHighlight();
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalCost = maintenance.reduce((sum, m) => sum + (m.cost_usd || 0), 0);
  const totalDowntime = maintenance.reduce((sum, m) => sum + (m.downtime_hours || 0), 0);
  const predictiveCount = maintenance.filter(m => (m.type || '').toLowerCase().includes('predictive')).length;
  const predictiveRatio = maintenance.length > 0 ? Math.round((predictiveCount / maintenance.length) * 100) : 0;

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this maintenance record from the database?')) return;
    setDeletingId(id);
    try {
      await deleteMaintenanceRecord(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete maintenance task');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-600" />
            <span>Plant Maintenance Schedules & Tasks</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Preventive, predictive and corrective maintenance records
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>Log Maintenance</span>
          </button>
          <button
            onClick={() => setIsWorkOrderModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Work Order</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Scheduled Actions</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{maintenance.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Cumulative Downtime</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{formatDuration(totalDowntime, 'hrs')}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Maintenance Cost</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totalCost)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Predictive Ratio</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{predictiveRatio}%</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900 flex items-center justify-between">
          <span>Maintenance Records & Tasks ({maintenance.length})</span>
          <span className="text-xs font-normal text-slate-500">Persisted in Supabase</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Machine ID</th>
                <th className="py-3 px-4">Maintenance Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Scheduled Date</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Downtime</th>
                <th className="py-3 px-4">Cost</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {maintenance.map(m => {
                const highlighted = isHighlighted(m.machine_id, m.id, m.type, m.technician, m.description);
                return (
                  <tr
                    key={m.id}
                    ref={highlighted ? highlightRef : undefined}
                    className={`transition-colors ${highlighted ? highlightClass : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-emerald-800">{m.machine_id}</td>
                    <td className="py-3 px-4 font-medium">{m.type}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={m.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{m.scheduled_date}</td>
                    <td className="py-3 px-4">{m.technician}</td>
                    <td className="py-3 px-4 max-w-xs text-slate-600">{m.description}</td>
                    <td className="py-3 px-4 font-medium text-amber-700">{formatDuration(m.downtime_hours, 'h')}</td>
                    <td className="py-3 px-4 text-emerald-700 font-semibold">{formatCurrency(m.cost_usd)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        title="Delete maintenance record"
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
      </div>

      <CreateWorkOrderModal
        isOpen={isWorkOrderModalOpen}
        onClose={() => setIsWorkOrderModalOpen(false)}
        machines={machines}
        onSubmit={async data => {
          await createWorkOrder(data);
        }}
      />

      <LogMaintenanceModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        machines={machines}
        onSubmit={async data => {
          await createMaintenanceRecord(data);
        }}
      />
    </div>
  );
};
