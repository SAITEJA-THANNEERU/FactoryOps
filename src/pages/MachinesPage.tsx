import React, { useState } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { useFilters } from '../contexts/FilterContext.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { GlobalFilterBar } from '../components/GlobalFilterBar.tsx';
import { MachineDetailModal } from '../components/MachineDetailModal.tsx';
import { AddEditMachineModal } from '../components/AddEditMachineModal.tsx';
import { ConfigureThresholdsModal } from '../components/ConfigureThresholdsModal.tsx';
import type { Machine, MachineStatus } from '../types/index.ts';
import { exportToCsv } from '../utils/exportCsv.ts';
import {
  Cpu,
  ArrowUpRight,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  Loader2,
  Activity,
  CheckCircle2,
  Download,
  Sliders
} from 'lucide-react';
import { formatNumber, formatPercent } from '../utils/formatters.ts';
import { useSearchHighlight } from '../utils/useSearchHighlight.ts';

export const MachinesPage: React.FC = () => {
  const {
    machines,
    incidents,
    workOrders,
    production,
    createMachine,
    updateMachine,
    deleteMachine,
    updateMachineStatus,
    refreshData
  } = useData();

  const { selectedLine, selectedStatus, searchQuery } = useFilters();
  const { highlightId, isHighlighted, highlightRef, highlightClass } = useSearchHighlight();

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [thresholdMachine, setThresholdMachine] = useState<Machine | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [deleteConfirmMachine, setDeleteConfirmMachine] = useState<Machine | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const filteredMachines = machines.filter(m => {
    if (highlightId && (m.machine_id.toLowerCase() === highlightId.toLowerCase() || m.id?.toLowerCase() === highlightId.toLowerCase())) {
      return true;
    }
    if (selectedLine !== 'all' && m.line !== selectedLine) return false;
    if (selectedStatus !== 'all' && m.status !== selectedStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.machine_id.toLowerCase().includes(q) ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.operator && m.operator.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingMachine(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (machine: Machine, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingMachine(machine);
    setIsAddEditOpen(true);
  };

  const handleOpenDelete = (machine: Machine, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmMachine(machine);
  };

  const handleSaveMachine = async (machineData: Partial<Machine>) => {
    if (editingMachine) {
      const idToUpdate = editingMachine.machine_id || editingMachine.id;
      const updated = await updateMachine(idToUpdate, machineData);
      if (selectedMachine && (selectedMachine.machine_id === idToUpdate || selectedMachine.id === idToUpdate)) {
        setSelectedMachine(updated);
      }
      showNotification(`Machine ${machineData.machine_id || idToUpdate} updated successfully.`);
    } else {
      const created = await createMachine(machineData);
      showNotification(`New machine ${created.machine_id || created.name} provisioned to plant floor.`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmMachine) return;
    setIsDeleting(true);
    try {
      const targetId = deleteConfirmMachine.machine_id || deleteConfirmMachine.id;
      const success = await deleteMachine(targetId);
      if (success) {
        showNotification(`Machine ${deleteConfirmMachine.name} (${targetId}) decommissioned.`);
        if (selectedMachine && (selectedMachine.machine_id === targetId || selectedMachine.id === targetId)) {
          setSelectedMachine(null);
        }
      }
    } catch (err: any) {
      console.error('Failed to delete machine:', err);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmMachine(null);
    }
  };

  const handleStatusChange = async (machineId: string, status: string, e?: React.ChangeEvent<HTMLSelectElement>) => {
    if (e) e.stopPropagation();
    try {
      const updated = await updateMachineStatus(machineId, status);
      if (selectedMachine && (selectedMachine.machine_id === machineId || selectedMachine.id === machineId)) {
        setSelectedMachine(updated);
      }
      showNotification(`Machine ${machineId} status changed to ${status.toUpperCase()}.`);
    } catch (err: any) {
      console.error('Failed to update status:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-600" />
            <span>Plant Equipment Fleet & Telemetry</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time asset telemetry, operational limits, health scores, and equipment lifecycle management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCsv('FactoryOps_Fleet_Telemetry', filteredMachines.map(m => ({
              machine_id: m.machine_id,
              name: m.name,
              line: m.line,
              type: m.type,
              status: m.status,
              health_score: m.health_score,
              temperature_c: m.temperature_c,
              vibration_mms: m.vibration_mms,
              oee: m.oee,
              operator: m.operator,
              max_temp_limit_c: (m as any).max_temperature_c || 75,
              max_vib_limit_mms: (m as any).max_vibration_mms || 3.5
            })))}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors border border-slate-300 cursor-pointer"
            title="Export CSV Telemetry Report"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Machine</span>
          </button>
        </div>
      </div>

      <GlobalFilterBar />

      {/* Machine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMachines.map(m => {
          const highlighted = isHighlighted(m.machine_id, m.id, m.name, m.line);
          return (
            <div
              key={m.id || m.machine_id}
              ref={highlighted ? highlightRef : undefined}
              onClick={() => setSelectedMachine(m)}
              className={`border rounded-lg p-5 cursor-pointer transition-all shadow-xs group flex flex-col justify-between ${
                highlighted ? highlightClass : 'bg-white hover:bg-slate-50/80 border-slate-200'
              }`}
            >
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {m.machine_id}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">{m.line}</span>
                </div>

                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                  <select
                    value={m.status}
                    onChange={e => handleStatusChange(m.machine_id || m.id, e.target.value, e)}
                    className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded px-1.5 py-0.5 cursor-pointer focus:outline-hidden"
                    title="Change Status"
                  >
                    <option value="running">🟢 Running</option>
                    <option value="warning">🟡 Warning</option>
                    <option value="maintenance">🟠 Maintenance</option>
                    <option value="offline">⚪ Offline</option>
                  </select>
                </div>
              </div>

              {/* Machine Name & Line */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {m.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {m.type || 'Industrial Machinery'} • {m.station_number || 'ST-01'}
                  </p>
                </div>

                {/* Threshold, Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setThresholdMachine(m);
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    title="Configure alert thresholds"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => handleOpenEdit(m, e)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                    title="Edit machine specifications"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => handleOpenDelete(m, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title="Delete machine"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Telemetry Metrics */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded-md">
                  <span className="text-[10px] text-slate-400 block font-medium">Health</span>
                  <span className="font-bold text-slate-900">{formatNumber(m.health_score, 0)}%</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-md">
                  <span className="text-[10px] text-slate-400 block font-medium">Temp</span>
                  <span className="font-medium text-slate-900">{formatNumber(m.temperature_c, 1)}°C</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-md">
                  <span className="text-[10px] text-slate-400 block font-medium">OEE</span>
                  <span className="font-bold text-emerald-800">{formatNumber(m.oee, 1)}%</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Op: {m.operator || 'Unassigned'}</span>
              <span className="text-emerald-700 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View Telemetry <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        );
      })}
      </div>

      {/* Empty State */}
      {filteredMachines.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Cpu className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No equipment matches selected criteria</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your line filters, status filters, or search query.
          </p>
        </div>
      )}

      {/* Machine Detail Modal */}
      <MachineDetailModal
        machine={selectedMachine}
        onClose={() => setSelectedMachine(null)}
        incidents={incidents}
        workOrders={workOrders}
        production={production}
        onEdit={m => {
          setSelectedMachine(null);
          setEditingMachine(m);
          setIsAddEditOpen(true);
        }}
        onDelete={m => {
          setSelectedMachine(null);
          setDeleteConfirmMachine(m);
        }}
        onStatusChange={handleStatusChange}
      />

      {/* Add / Edit Machine Modal */}
      <AddEditMachineModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setEditingMachine(null);
        }}
        machine={editingMachine}
        onSave={handleSaveMachine}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmMachine && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Decommission Equipment Asset?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <span className="font-semibold text-slate-900">{deleteConfirmMachine.name}</span> (ID: <span className="font-mono font-semibold text-emerald-800">{deleteConfirmMachine.machine_id}</span>)?
              This will update the plant registry and mark the equipment station as unallocated.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmMachine(null)}
                disabled={isDeleting}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Decommissioning...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Thresholds Modal */}
      <ConfigureThresholdsModal
        isOpen={!!thresholdMachine}
        onClose={() => setThresholdMachine(null)}
        machine={thresholdMachine}
        onSuccess={() => {
          refreshData();
          showNotification('Machine alert thresholds updated successfully.');
        }}
      />
    </div>
  );
};
