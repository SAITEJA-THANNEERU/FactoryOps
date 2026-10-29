import React, { useState } from 'react';
import type { Machine, ProductionRecord } from '../types/index.ts';
import { X, TrendingUp, AlertCircle } from 'lucide-react';

interface LogProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  onSubmit: (data: Partial<ProductionRecord>) => Promise<any>;
}

export const LogProductionModal: React.FC<LogProductionModalProps> = ({
  isOpen,
  onClose,
  machines,
  onSubmit
}) => {
  const [machineId, setMachineId] = useState(machines[0]?.machine_id || '');
  const [shift, setShift] = useState<'A' | 'B' | 'C'>('A');
  const [targetUnits, setTargetUnits] = useState('1200');
  const [actualUnits, setActualUnits] = useState('1180');
  const [defectiveUnits, setDefectiveUnits] = useState('14');
  const [scrapKg, setScrapKg] = useState('6.2');
  const [cycleTimeSec, setCycleTimeSec] = useState('42.5');
  const [operator, setOperator] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId) {
      setError('Please select a target machine');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        machine_id: machineId,
        shift,
        target_units: parseInt(targetUnits) || 0,
        planned_units: parseInt(targetUnits) || 0,
        actual_units: parseInt(actualUnits) || 0,
        defective_units: parseInt(defectiveUnits) || 0,
        defect_units: parseInt(defectiveUnits) || 0,
        scrap_kg: parseFloat(scrapKg) || 0,
        cycle_time_sec: parseFloat(cycleTimeSec) || 45,
        operator: operator.trim() || 'Floor Operator',
        timestamp: new Date().toISOString()
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to persist production record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900">Log Shift Production Run</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Machine</label>
              <select
                value={machineId}
                onChange={e => setMachineId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                required
              >
                {machines.map(m => (
                  <option key={m.id || m.machine_id} value={m.machine_id}>
                    {m.machine_id} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shift</label>
              <select
                value={shift}
                onChange={e => setShift(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="A">Shift A (Morning)</option>
                <option value="B">Shift B (Afternoon)</option>
                <option value="C">Shift C (Night)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Planned Target Units</label>
              <input
                type="number"
                min="1"
                value={targetUnits}
                onChange={e => setTargetUnits(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Units Produced</label>
              <input
                type="number"
                min="0"
                value={actualUnits}
                onChange={e => setActualUnits(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Defects Count</label>
              <input
                type="number"
                min="0"
                value={defectiveUnits}
                onChange={e => setDefectiveUnits(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Scrap Material (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={scrapKg}
                onChange={e => setScrapKg(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cycle Time (sec)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={cycleTimeSec}
                onChange={e => setCycleTimeSec(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Operator Name</label>
            <input
              type="text"
              placeholder="e.g. Marcus Vance or Sarah Jenkins"
              value={operator}
              onChange={e => setOperator(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? 'Recording Run...' : 'Save & Sync Output'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
