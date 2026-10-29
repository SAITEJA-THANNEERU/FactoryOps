import React, { useState } from 'react';
import type { Machine, MaintenanceRecord } from '../types/index.ts';
import { X, Wrench, AlertCircle } from 'lucide-react';

interface LogMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  onSubmit: (data: Partial<MaintenanceRecord>) => Promise<any>;
}

export const LogMaintenanceModal: React.FC<LogMaintenanceModalProps> = ({
  isOpen,
  onClose,
  machines,
  onSubmit
}) => {
  const [machineId, setMachineId] = useState(machines[0]?.machine_id || '');
  const [type, setType] = useState('Predictive');
  const [status, setStatus] = useState('Scheduled');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [technician, setTechnician] = useState('');
  const [downtimeHours, setDowntimeHours] = useState('2.5');
  const [costUsd, setCostUsd] = useState('350');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId) {
      setError('Please select a target machine');
      return;
    }
    if (!description.trim()) {
      setError('Please provide maintenance scope/description');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        machine_id: machineId,
        type,
        status,
        scheduled_date: scheduledDate,
        technician: technician.trim() || 'Assigned Technician',
        downtime_hours: parseFloat(downtimeHours) || 0,
        cost_usd: parseFloat(costUsd) || 0,
        description: description.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to log maintenance record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900">Log Maintenance Task</h3>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Maintenance Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Predictive">Predictive Maintenance</option>
                <option value="Preventive">Preventive Maintenance</option>
                <option value="Corrective">Corrective Maintenance</option>
                <option value="Calibration">Sensor Calibration</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Scheduled Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Tech</label>
              <input
                type="text"
                placeholder="Tech Name"
                value={technician}
                onChange={e => setTechnician(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Downtime (hrs)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={downtimeHours}
                onChange={e => setDowntimeHours(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cost (USD)</label>
              <input
                type="number"
                min="0"
                value={costUsd}
                onChange={e => setCostUsd(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Description & Scope</label>
            <textarea
              rows={2}
              placeholder="e.g. Ultrasonic vibration dampener replacement and thermal sensor calibration..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              required
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
              {isSubmitting ? 'Recording Task...' : 'Save Maintenance Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
