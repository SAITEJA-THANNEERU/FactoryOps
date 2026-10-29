import React from 'react';
import type { Machine, Incident, WorkOrder, ProductionRecord } from '../types/index.ts';
import { StatusBadge } from './StatusBadge.tsx';
import { SeverityBadge } from './SeverityBadge.tsx';
import { PriorityBadge } from './PriorityBadge.tsx';
import {
  X,
  Gauge,
  Thermometer,
  Activity,
  Layers,
  Cpu,
  User,
  Zap,
  AlertTriangle,
  ClipboardList,
  Edit3,
  Trash2
} from 'lucide-react';
import {
  formatDuration,
  formatNumber,
  formatPercent,
  formatWholeNumber,
  formatScrap
} from '../utils/formatters.ts';

interface MachineDetailModalProps {
  machine: Machine | null;
  onClose: () => void;
  incidents: Incident[];
  workOrders: WorkOrder[];
  production: ProductionRecord[];
  onEdit?: (machine: Machine) => void;
  onDelete?: (machine: Machine) => void;
  onStatusChange?: (machineId: string, status: string) => Promise<void>;
}

export const MachineDetailModal: React.FC<MachineDetailModalProps> = ({
  machine,
  onClose,
  incidents,
  workOrders,
  production,
  onEdit,
  onDelete,
  onStatusChange
}) => {
  if (!machine) return null;

  const machineIncidents = incidents.filter(i => i.machine_id === machine.machine_id);
  const machineWorkOrders = workOrders.filter(w => w.machine_id === machine.machine_id);
  const machineProduction = production.filter(p => p.machine_id === machine.machine_id).slice(0, 5);

  const handleStatusSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onStatusChange && machine) {
      await onStatusChange(machine.machine_id || machine.id, e.target.value);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl text-slate-800">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-900 text-white">
              <Cpu className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">{machine.name}</h2>
                <StatusBadge status={machine.status} size="sm" />
                {onStatusChange && (
                  <select
                    value={machine.status}
                    onChange={handleStatusSelect}
                    className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded px-2 py-0.5 cursor-pointer focus:outline-hidden"
                    title="Change Machine Operating Status"
                  >
                    <option value="running">🟢 Running / Active</option>
                    <option value="warning">🟡 Warning</option>
                    <option value="maintenance">🟠 Maintenance</option>
                    <option value="offline">⚪ Offline</option>
                  </select>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                ID: <span className="font-semibold text-emerald-800">{machine.machine_id}</span> • Line: {machine.line} • Type: {machine.type}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(machine);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Edit Machine Specifications"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  onClose();
                  onDelete(machine);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                title="Remove Machine"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>Health Score</span>
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">{formatPercent(machine.health_score, 1)}</div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    machine.health_score > 80 ? 'bg-emerald-600' : machine.health_score > 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, machine.health_score))}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>OEE</span>
                <Gauge className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-emerald-800">{formatPercent(machine.oee, 1)}</div>
              <div className="text-[10px] text-slate-500 mt-1">Operational Effectiveness</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>Temperature</span>
                <Thermometer className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">{formatNumber(machine.temperature_c, 1)}°C</div>
              <div className="text-[10px] text-slate-500 mt-1">Threshold: &lt;85°C</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>Vibration</span>
                <Zap className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">{formatNumber(machine.vibration_mms, 2)} mm/s</div>
              <div className="text-[10px] text-slate-500 mt-1">Velocity RMS</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>Speed</span>
                <Activity className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">{formatWholeNumber(machine.speed_rpm)} RPM</div>
              <div className="text-[10px] text-slate-500 mt-1">Pressure: {formatNumber(machine.pressure_bar, 1)} bar</div>
            </div>
          </div>

          {/* Machine Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Assigned Operator:</span>
              <p className="text-slate-900 font-medium flex items-center gap-1.5 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-600" />
                {machine.operator}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Production Line:</span>
              <p className="text-slate-900 font-medium mt-0.5">{machine.line}</p>
            </div>
            <div>
              <span className="text-slate-500">Installed Date:</span>
              <p className="text-slate-900 font-medium mt-0.5">{machine.install_date}</p>
            </div>
            <div>
              <span className="text-slate-500">Last Service Date:</span>
              <p className="text-slate-900 font-medium mt-0.5">{machine.last_service_date}</p>
            </div>
          </div>

          {/* Active Incidents */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Reported Incidents ({machineIncidents.length})</span>
            </h3>
            {machineIncidents.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500 text-center">
                No active or historical incidents recorded for this machine.
              </div>
            ) : (
              <div className="space-y-2">
                {machineIncidents.map(inc => (
                  <div key={inc.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <span className="font-mono text-emerald-800">{inc.incident_id}</span>
                        <span>{inc.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={inc.severity} />
                        <StatusBadge status={inc.status} size="sm" />
                      </div>
                    </div>
                    <p className="text-slate-600 mt-1">{inc.description}</p>
                    <div className="text-[10px] text-slate-400 mt-2">
                      Reported by {inc.reported_by} on {new Date(inc.reported_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Work Orders */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
              <ClipboardList className="w-4 h-4 text-slate-700" />
              <span>Maintenance Work Orders ({machineWorkOrders.length})</span>
            </h3>
            {machineWorkOrders.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500 text-center">
                No active work orders pending.
              </div>
            ) : (
              <div className="space-y-2">
                {machineWorkOrders.map(wo => (
                  <div key={wo.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <span className="font-mono text-emerald-800">{wo.work_order_id}</span>
                        <span>{wo.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={wo.priority} />
                        <StatusBadge status={wo.status} size="sm" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-600 mt-1 text-[11px]">
                      <span>Assigned: {wo.assigned_to}</span>
                      <span>Due: {wo.due_date}</span>
                      <span>Est: {formatDuration(wo.estimated_hours, 'h')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Production History */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Recent Production Records</span>
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-2.5 px-3">Shift / Time</th>
                    <th className="py-2.5 px-3">Target</th>
                    <th className="py-2.5 px-3">Actual</th>
                    <th className="py-2.5 px-3">Defective</th>
                    <th className="py-2.5 px-3">Scrap (kg)</th>
                    <th className="py-2.5 px-3">Cycle Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {machineProduction.map(p => (
                    <tr key={p.id}>
                      <td className="py-2 px-3">{p.shift} ({new Date(p.timestamp).toLocaleDateString()})</td>
                      <td className="py-2 px-3">{formatWholeNumber(p.target_units)}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{formatWholeNumber(p.actual_units)}</td>
                      <td className="py-2 px-3 text-rose-600 font-semibold">{formatWholeNumber(p.defective_units)}</td>
                      <td className="py-2 px-3">{formatScrap(p.scrap_kg)}</td>
                      <td className="py-2 px-3">{formatNumber(p.cycle_time_sec, 1)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(machine);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-md transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Specifications</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => {
                  onClose();
                  onDelete(machine);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-md transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Asset</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors shadow-2xs"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
};
