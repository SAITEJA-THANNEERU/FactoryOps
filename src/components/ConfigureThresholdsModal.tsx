import React, { useState, useEffect } from 'react';
import type { Machine } from '../types';
import { api } from '../services/api';
import { X, Sliders, Save, AlertCircle } from 'lucide-react';

interface ConfigureThresholdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine: Machine | null;
  onSuccess?: () => void;
}

export const ConfigureThresholdsModal: React.FC<ConfigureThresholdsModalProps> = ({
  isOpen,
  onClose,
  machine,
  onSuccess
}) => {
  const [maxTemp, setMaxTemp] = useState<number>(75);
  const [maxVib, setMaxVib] = useState<number>(3.5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (machine) {
      setMaxTemp((machine as any).max_temperature_c || 75);
      setMaxVib((machine as any).max_vibration_mms || 3.5);
    }
  }, [machine]);

  if (!isOpen || !machine) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.machines.updateThresholds({
        machine_id: machine.id || machine.machine_id,
        max_temperature_c: maxTemp,
        max_vibration_mms: maxVib
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update alert thresholds');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Configure Machine Limits</h2>
              <p className="text-xs text-slate-500">{machine.name} ({machine.machine_id})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Max Safe Temperature (°C)
            </label>
            <input
              type="number"
              step="0.5"
              required
              value={maxTemp}
              onChange={e => setMaxTemp(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-indigo-600 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Telemetry exceeding this limit triggers automated yellow/red warning alerts.
            </p>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Max Vibration Threshold (mm/s)
            </label>
            <input
              type="number"
              step="0.1"
              required
              value={maxVib}
              onChange={e => setMaxVib(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-hidden focus:border-indigo-600 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Vibration harmonics exceeding this value flag spindle/bearing alignment anomalies.
            </p>
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
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Thresholds'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
