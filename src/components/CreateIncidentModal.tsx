import React, { useState } from 'react';
import type { Machine } from '../types/index.ts';
import { X, AlertTriangle, Send } from 'lucide-react';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  onSubmit: (data: { machine_id: string; title: string; description: string; severity: string }) => Promise<void>;
}

export const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({
  isOpen,
  onClose,
  machines,
  onSubmit
}) => {
  const [machineId, setMachineId] = useState<string>(machines[0]?.machine_id || '');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<string>('Medium');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !machineId) {
      setError('Please provide a title and select a machine');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        machine_id: machineId,
        title,
        description,
        severity
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to report incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 text-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Report Operational Incident</h2>
              <p className="text-xs text-slate-500">Triage equipment anomaly or safety stoppage</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Target Machine *</label>
            <select
              value={machineId}
              onChange={e => setMachineId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-emerald-600"
              required
            >
              {machines.map(m => (
                <option key={m.id} value={m.machine_id}>
                  {m.machine_id} - {m.name} ({m.line})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Incident Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Spindle Thermal Alarm or Feed Slippage"
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-emerald-600 placeholder-slate-400"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Severity Level</label>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-emerald-600"
            >
              <option value="Low">Low - Informational / Observation</option>
              <option value="Medium">Medium - Warning / Impending Threshold</option>
              <option value="High">High - Production Interruption</option>
              <option value="Critical">Critical - Safety E-Stop / Total Line Halt</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Observation / Symptoms</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what occurred, gauge readings, error codes, and immediate actions taken..."
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-emerald-600 placeholder-slate-400"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Logging...' : 'Submit Ticket'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
