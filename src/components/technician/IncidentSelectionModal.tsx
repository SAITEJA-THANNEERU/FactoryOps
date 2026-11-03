import React, { useState, useMemo } from 'react';
import type { Incident, Machine, TechnicianIncidentAssignment } from '../../types/index.ts';
import {
  AlertTriangle,
  Search,
  Filter,
  Wrench,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  Layers,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  User,
  Activity
} from 'lucide-react';
import { SeverityBadge } from '../SeverityBadge.tsx';
import { StatusBadge } from '../StatusBadge.tsx';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll.ts';

interface IncidentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: Incident[];
  machines: Machine[];
  assignments?: TechnicianIncidentAssignment[];
  onSelectIncident: (incident: Incident) => void;
  title?: string;
  subtitle?: string;
}

export const IncidentSelectionModal: React.FC<IncidentSelectionModalProps> = ({
  isOpen,
  onClose,
  incidents,
  machines,
  assignments = [],
  onSelectIncident,
  title = 'Select Incident for Technician Repair Assignment',
  subtitle = 'Choose an operational equipment stoppage or quality deviation to analyze root cause and dispatch a specialized technician.'
}) => {
  useLockBodyScroll(isOpen);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterAssignmentStatus, setFilterAssignmentStatus] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('UNASSIGNED');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // Map incident to its machine
  const getMachineForIncident = (incident: Incident): Machine | undefined => {
    return machines.find(m => m.id === incident.machine_id || m.machine_id === incident.machine_id);
  };

  // Map incident to its existing assignment
  const getAssignmentForIncident = (incident: Incident): TechnicianIncidentAssignment | undefined => {
    const incId = incident.id || incident.incident_id;
    return assignments.find(a => (a.incident_id === incId || a.incident_id === incident.id) && a.status !== 'CLOSED' && a.status !== 'VERIFIED');
  };

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      // Exclude closed incidents unless specifically searched
      if (inc.status === 'Closed' && !searchTerm) return false;

      // Severity filter
      if (filterSeverity !== 'ALL' && inc.severity.toLowerCase() !== filterSeverity.toLowerCase()) {
        return false;
      }

      const existingAssignment = getAssignmentForIncident(inc);
      if (filterAssignmentStatus === 'UNASSIGNED' && existingAssignment) return false;
      if (filterAssignmentStatus === 'ASSIGNED' && !existingAssignment) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const machine = getMachineForIncident(inc);
        const matchTitle = inc.title?.toLowerCase().includes(q);
        const matchId = inc.incident_id?.toLowerCase().includes(q) || inc.id?.toLowerCase().includes(q);
        const matchDesc = inc.description?.toLowerCase().includes(q);
        const matchMachine = machine && (machine.name.toLowerCase().includes(q) || machine.machine_id.toLowerCase().includes(q) || machine.line.toLowerCase().includes(q));
        if (!matchTitle && !matchId && !matchDesc && !matchMachine) return false;
      }

      return true;
    });
  }, [incidents, filterSeverity, filterAssignmentStatus, searchTerm, assignments, machines]);

  // Selected incident object
  const currentSelectedIncident = useMemo(() => {
    if (!selectedIncidentId) return filteredIncidents[0] || null;
    return incidents.find(i => (i.id === selectedIncidentId || i.incident_id === selectedIncidentId)) || filteredIncidents[0] || null;
  }, [selectedIncidentId, filteredIncidents, incidents]);

  if (!isOpen) return null;

  const currentMachine = currentSelectedIncident ? getMachineForIncident(currentSelectedIncident) : undefined;
  const currentAssignment = currentSelectedIncident ? getAssignmentForIncident(currentSelectedIncident) : undefined;

  // Unassigned count
  const unassignedCount = incidents.filter(i => i.status !== 'Closed' && !getAssignmentForIncident(i)).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{title}</span>
                {unassignedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    {unassignedCount} Unassigned
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Filter by Incident ID, Machine, Fault description..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Assignment Status filter */}
            <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterAssignmentStatus('UNASSIGNED')}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                  filterAssignmentStatus === 'UNASSIGNED'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Unassigned ({unassignedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterAssignmentStatus('ALL')}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                  filterAssignmentStatus === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Incidents
              </button>
              <button
                type="button"
                onClick={() => setFilterAssignmentStatus('ASSIGNED')}
                className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                  filterAssignmentStatus === 'ASSIGNED'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Active Assigned
              </button>
            </div>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Content Body: Two columns (List on Left, Preview on Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-0 bg-white">
          {/* Left Column: Incident List */}
          <div className="md:col-span-6 lg:col-span-5 border-r border-slate-200 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5 max-h-[60vh] md:max-h-none">
            {filteredIncidents.map(inc => {
              const machine = getMachineForIncident(inc);
              const assignment = getAssignmentForIncident(inc);
              const isSelected = currentSelectedIncident?.id === inc.id || currentSelectedIncident?.incident_id === inc.incident_id;

              return (
                <div
                  key={inc.id || inc.incident_id}
                  onClick={() => setSelectedIncidentId(inc.id || inc.incident_id || null)}
                  className={`p-3 rounded-xl border transition cursor-pointer text-xs space-y-2 ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-500 shadow-xs ring-1 ring-indigo-500/50'
                      : 'bg-white border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-mono text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
                        <span className="text-amber-700 font-bold">{inc.incident_id || inc.id}</span>
                        {machine && (
                          <span className="text-slate-500">• {machine.machine_id}</span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm line-clamp-1">
                        {inc.title}
                      </h4>
                    </div>
                    <SeverityBadge severity={inc.severity} />
                  </div>

                  <p className="text-slate-600 text-[11px] font-medium line-clamp-2">
                    {inc.description || 'Equipment anomaly reported on production floor.'}
                  </p>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                    <div>
                      {machine?.line || 'Plant Floor'}
                    </div>
                    <div>
                      {assignment ? (
                        <span className="text-sky-700 font-bold flex items-center gap-1">
                          <Wrench className="w-3 h-3" /> {assignment.technician_name}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Unassigned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredIncidents.length === 0 && (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs">No incidents match the selected filter.</p>
                <p className="text-[11px] text-slate-600">All equipment anomalies are currently addressed or closed.</p>
              </div>
            )}
          </div>

          {/* Right Column: Detailed Incident Preview & Dispatch Trigger */}
          <div className="md:col-span-6 lg:col-span-7 p-4 sm:p-5 overflow-y-auto flex flex-col justify-between bg-slate-50/50">
            {currentSelectedIncident ? (
              <div className="space-y-4">
                {/* Header of selected incident */}
                <div className="space-y-1.5 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-900 px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                      {currentSelectedIncident.incident_id || currentSelectedIncident.id}
                    </span>
                    <SeverityBadge severity={currentSelectedIncident.severity} />
                    <StatusBadge status={currentSelectedIncident.status} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {currentSelectedIncident.title}
                  </h3>
                  <div className="text-xs text-slate-600 font-medium flex items-center gap-3">
                    <span>Reported by: <strong className="text-slate-900">{currentSelectedIncident.reported_by || 'Plant Operator'}</strong></span>
                    <span>•</span>
                    <span>{new Date(currentSelectedIncident.reported_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Problem Description */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 text-xs font-bold block uppercase tracking-wider text-[10px]">
                    Failure Symptom & Description
                  </label>
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs leading-relaxed font-medium shadow-2xs">
                    {currentSelectedIncident.description || 'No detailed symptom log provided.'}
                  </div>
                </div>

                {/* Machine Asset Context Card */}
                {currentMachine && (
                  <div className="space-y-1.5">
                    <label className="text-slate-500 text-xs font-bold block uppercase tracking-wider text-[10px]">
                      Affected Machine Asset
                    </label>
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 grid grid-cols-2 gap-3 text-xs shadow-2xs">
                      <div>
                        <div className="text-slate-500 text-[10px] font-bold uppercase">Asset Name & Model</div>
                        <div className="font-bold text-slate-900 text-xs">{currentMachine.name}</div>
                        <div className="font-mono text-[10px] text-slate-500">{currentMachine.machine_id}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px] font-bold uppercase">Production Line</div>
                        <div className="font-bold text-slate-900 text-xs">{currentMachine.line}</div>
                        <div className="text-[10px] text-slate-600 font-medium">Status: <span className="text-amber-700 font-bold capitalize">{currentMachine.status}</span></div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px] font-bold uppercase">Health Score</div>
                        <div className={`font-bold font-mono text-xs ${currentMachine.health_score < 75 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {currentMachine.health_score}%
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px] font-bold uppercase">Telemetry Vitals</div>
                        <div className="font-mono text-[10px] text-slate-800 font-medium">
                          {currentMachine.temperature_c}°C • {currentMachine.vibration_mms} mm/s
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assignment Status Notice */}
                {currentAssignment ? (
                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs space-y-1">
                    <div className="font-bold text-sky-900 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-sky-700" />
                      <span>Already Assigned to {currentAssignment.technician_name}</span>
                    </div>
                    <div className="text-slate-700 text-[11px] font-medium">
                      Status: <strong className="text-slate-900 uppercase">{currentAssignment.status}</strong> • Specialisation: {currentAssignment.technician_specialisation}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs space-y-1">
                    <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-700" />
                      <span>AI Skill Matching Engine Ready</span>
                    </div>
                    <p className="text-slate-700 text-[11px] font-medium">
                      Selecting this incident will automatically analyze required competencies, match machine failure category against technician profiles, and rank the top recommended technicians.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-8 text-center font-medium">
                <AlertTriangle className="w-8 h-8 text-slate-400 mb-2" />
                <p>Select an incident from the list to view diagnostic details.</p>
              </div>
            )}

            {/* Bottom Modal Actions */}
            <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>

              {currentSelectedIncident && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectIncident(currentSelectedIncident);
                    onClose();
                  }}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition inline-flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-indigo-100" />
                  <span>
                    {currentAssignment ? 'Reassign / Update Task' : 'Proceed to Assign Technician'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
