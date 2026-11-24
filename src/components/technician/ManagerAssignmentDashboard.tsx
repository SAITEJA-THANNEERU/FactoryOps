import React, { useState, useMemo } from 'react';
import { TableLayoutProvider } from '../TableLayoutProvider.tsx';
import type { Machine, Incident, TechnicianProfile, TechnicianIncidentAssignment } from '../../types/index.ts';
import {
  Wrench,
  AlertTriangle,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Layers,
  FileText
} from 'lucide-react';
import { SeverityBadge } from '../SeverityBadge.tsx';
import { StatusBadge } from '../StatusBadge.tsx';
import { TechnicianWorkloadTable } from './TechnicianWorkloadTable.tsx';
import { IncidentSelectionModal } from './IncidentSelectionModal.tsx';
import { AssignTechnicianModal } from './AssignTechnicianModal.tsx';
import { VerifyResolutionModal } from './VerifyResolutionModal.tsx';

interface ManagerAssignmentDashboardProps {
  incidents: Incident[];
  machines: Machine[];
  technicians: TechnicianProfile[];
  assignments: TechnicianIncidentAssignment[];
  onAssignSubmit: (data: any) => Promise<any>;
  onVerifySubmit: (id: string, payload: any) => Promise<any>;
  onReviewReassignment: (id: string, payload: { decision: 'APPROVE' | 'REJECT'; new_technician_id?: string; manager_notes?: string }) => Promise<any>;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const ManagerAssignmentDashboard: React.FC<ManagerAssignmentDashboardProps> = ({
  incidents,
  machines,
  technicians,
  assignments,
  onAssignSubmit,
  onVerifySubmit,
  onReviewReassignment,
  onRefresh,
  isLoading = false
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'pipeline' | 'workload' | 'unassigned'>('pipeline');
  const [pipelineStatusFilter, setPipelineStatusFilter] = useState<string>('ALL');
  const [pipelineSearch, setPipelineSearch] = useState<string>('');

  // Modals state
  const [isIncidentSelectionOpen, setIsIncidentSelectionOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedIncidentIdForAssign, setSelectedIncidentIdForAssign] = useState<string | undefined>(undefined);
  const [selectedTechnicianIdForAssign, setSelectedTechnicianIdForAssign] = useState<string | undefined>(undefined);
  const [verifyModalAssignment, setVerifyModalAssignment] = useState<TechnicianIncidentAssignment | null>(null);

  // Reassignment review state
  const [reviewReassignmentAssignment, setReviewReassignmentAssignment] = useState<TechnicianIncidentAssignment | null>(null);
  const [reassignDecision, setReassignDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [newTechnicianId, setNewTechnicianId] = useState<string>('');
  const [managerReassignNotes, setManagerReassignNotes] = useState<string>('');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  // Detail drawer / modal for assignment
  const [inspectAssignment, setInspectAssignment] = useState<TechnicianIncidentAssignment | null>(null);

  // Live KPI counts
  const kpis = useMemo(() => {
    const totalActive = assignments.filter(a => a.status !== 'VERIFIED' && a.status !== 'CLOSED' && a.status !== 'REJECTED').length;
    const pendingAcceptance = assignments.filter(a => a.status === 'PENDING ACCEPTANCE').length;
    const inProgress = assignments.filter(a => a.status === 'IN PROGRESS' || a.status === 'ACCEPTED').length;
    const reassignmentRequests = assignments.filter(a => a.status === 'REASSIGNMENT_REQUESTED').length;
    const pendingVerification = assignments.filter(a => a.status === 'RESOLVED_PENDING_VERIFICATION').length;
    const overdue = assignments.filter(a => a.is_overdue && a.status !== 'VERIFIED' && a.status !== 'CLOSED').length;
    const verifiedAndClosed = assignments.filter(a => a.status === 'VERIFIED' || a.status === 'CLOSED').length;
    const unassignedIncidents = incidents.filter(i => {
      if (i.status === 'Closed') return false;
      const incId = i.id || i.incident_id;
      return !assignments.some(a => (a.incident_id === incId || a.incident_id === i.id) && a.status !== 'CLOSED' && a.status !== 'VERIFIED');
    }).length;

    return {
      totalActive,
      pendingAcceptance,
      inProgress,
      reassignmentRequests,
      pendingVerification,
      overdue,
      verifiedAndClosed,
      unassignedIncidents
    };
  }, [assignments, incidents]);

  // Filtered assignments for Pipeline tab
  const filteredPipelineAssignments = useMemo(() => {
    return assignments.filter(asn => {
      // Status filter
      if (pipelineStatusFilter === 'OVERDUE') {
        if (!asn.is_overdue || asn.status === 'VERIFIED' || asn.status === 'CLOSED') return false;
      } else if (pipelineStatusFilter !== 'ALL' && asn.status !== pipelineStatusFilter) {
        return false;
      }

      // Search term
      if (pipelineSearch.trim()) {
        const q = pipelineSearch.toLowerCase();
        const matchTitle = asn.incident_title?.toLowerCase().includes(q);
        const matchId = asn.id?.toLowerCase().includes(q) || asn.incident_id?.toLowerCase().includes(q);
        const matchTech = asn.technician_name?.toLowerCase().includes(q);
        const matchMachine = asn.machine_name?.toLowerCase().includes(q) || asn.machine_code?.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchTech && !matchMachine) return false;
      }

      return true;
    });
  }, [assignments, pipelineStatusFilter, pipelineSearch]);

  // Unassigned incidents list
  const unassignedIncidentsList = useMemo(() => {
    return incidents.filter(i => {
      if (i.status === 'Closed') return false;
      const incId = i.id || i.incident_id;
      return !assignments.some(a => (a.incident_id === incId || a.incident_id === i.id) && a.status !== 'CLOSED' && a.status !== 'VERIFIED');
    });
  }, [incidents, assignments]);

  // Handle selecting an incident from IncidentSelectionModal
  const handleIncidentSelected = (incident: Incident) => {
    setSelectedIncidentIdForAssign(incident.id || incident.incident_id);
    setSelectedTechnicianIdForAssign(undefined);
    setIsAssignModalOpen(true);
  };

  // Handle clicking "Assign Task" from TechnicianWorkloadTable
  const handleAssignToTechnician = (tech: TechnicianProfile) => {
    setSelectedTechnicianIdForAssign(tech.user_id || tech.id);
    setSelectedIncidentIdForAssign(undefined);
    setIsAssignModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-md shadow-indigo-900/20 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Manager-Controlled Technician Assignment & Resolution Hub</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold">
                Live Supabase Synced
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Triage factory incidents, inspect real-time technician workload, dispatch AI-matched specialists, and verify completed repairs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Sync live records from Supabase"
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsIncidentSelectionOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Select Incident ({kpis.unassignedIncidents} Open)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedIncidentIdForAssign(undefined);
              setSelectedTechnicianIdForAssign(undefined);
              setIsAssignModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Repair Task</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3.5">
        {/* 1. Total Active */}
        <div
          onClick={() => { setActiveTab('pipeline'); setPipelineStatusFilter('ALL'); }}
          className="relative overflow-hidden p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Wrench className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-900 text-sm tracking-tight">Total Active</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 my-1 tracking-tight">
            {kpis.totalActive}
          </div>
          <div className="text-xs text-slate-500 font-medium z-10">Repairs in workflow</div>
          <div className="absolute bottom-0 right-0 w-20 h-10 overflow-hidden pointer-events-none rounded-br-xl">
            <svg className="w-full h-full text-sky-100/80" viewBox="0 0 100 40" preserveAspectRatio="none" fill="currentColor">
              <path d="M0 40 Q40 10 100 0 L100 40 Z" />
            </svg>
          </div>
        </div>

        {/* 2. Pending Acceptance */}
        <div
          onClick={() => { setActiveTab('pipeline'); setPipelineStatusFilter('PENDING ACCEPTANCE'); }}
          className="relative overflow-hidden p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="font-bold text-slate-900 text-sm tracking-tight">Pending Accept</span>
          </div>
          <div className="text-3xl font-extrabold text-amber-500 my-1 tracking-tight">
            {kpis.pendingAcceptance}
          </div>
          <div className="text-xs text-slate-500 font-medium z-10">Awaiting Tech Sign-In</div>
          <div className="absolute bottom-0 right-0 w-20 h-10 overflow-hidden pointer-events-none rounded-br-xl">
            <svg className="w-full h-full text-amber-100/80" viewBox="0 0 100 40" preserveAspectRatio="none" fill="currentColor">
              <path d="M0 40 Q40 10 100 0 L100 40 Z" />
            </svg>
          </div>
        </div>

        {/* 3. In Progress */}
        <div
          onClick={() => { setActiveTab('pipeline'); setPipelineStatusFilter('IN PROGRESS'); }}
          className="relative overflow-hidden p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Wrench className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="font-bold text-slate-900 text-sm tracking-tight">In Repair</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 my-1 tracking-tight">
            {kpis.inProgress}
          </div>
          <div className="text-xs text-slate-500 font-medium z-10">Floor work underway</div>
          <div className="absolute bottom-0 right-0 w-20 h-10 overflow-hidden pointer-events-none rounded-br-xl">
            <svg className="w-full h-full text-emerald-100/80" viewBox="0 0 100 40" preserveAspectRatio="none" fill="currentColor">
              <path d="M0 40 Q40 10 100 0 L100 40 Z" />
            </svg>
          </div>
        </div>

        {/* 4. Reassignment Requested */}
        <div
          onClick={() => { setActiveTab('pipeline'); setPipelineStatusFilter('REASSIGNMENT_REQUESTED'); }}
          className="relative overflow-hidden p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <RotateCcw className="w-5 h-5 text-indigo-500 shrink-0" />
            <span className="font-bold text-slate-900 text-sm tracking-tight">Reassign Requests</span>
          </div>
          <div className="text-3xl font-extrabold text-indigo-600 my-1 tracking-tight">
            {kpis.reassignmentRequests}
          </div>
          <div className="text-xs text-slate-500 font-medium z-10">Requires Manager Action</div>
          <div className="absolute bottom-0 right-0 w-20 h-10 overflow-hidden pointer-events-none rounded-br-xl">
            <svg className="w-full h-full text-indigo-100/80" viewBox="0 0 100 40" preserveAspectRatio="none" fill="currentColor">
              <path d="M0 40 Q40 10 100 0 L100 40 Z" />
            </svg>
          </div>
        </div>

        {/* 5. Pending Manager Verification */}
        <div
          onClick={() => { setActiveTab('pipeline'); setPipelineStatusFilter('RESOLVED_PENDING_VERIFICATION'); }}
          className="relative overflow-hidden p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="font-bold text-slate-900 text-sm tracking-tight">Pending Verify</span>
          </div>
          <div className="text-3xl font-extrabold text-blue-600 my-1 tracking-tight">
            {kpis.pendingVerification}
          </div>
          <div className="text-xs text-slate-500 font-medium z-10">Ready for Sign-Off</div>
          <div className="absolute bottom-0 right-0 w-20 h-10 overflow-hidden pointer-events-none rounded-br-xl">
            <svg className="w-full h-full text-blue-100/80" viewBox="0 0 100 40" preserveAspectRatio="none" fill="currentColor">
              <path d="M0 40 Q40 10 100 0 L100 40 Z" />
            </svg>
          </div>
        </div>

        {/* 6. Overdue SLA */}
        <div
          onClick={() => { setActiveTab('pipeline'); setPipelineStatusFilter('OVERDUE'); }}
          className="relative overflow-hidden p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="font-bold text-slate-900 text-sm tracking-tight">Overdue SLA</span>
          </div>
          <div className="text-3xl font-extrabold text-red-600 my-1 tracking-tight">
            {kpis.overdue}
          </div>
          <div className="text-xs text-slate-500 font-medium z-10">Target Due Date Passed</div>
          <div className="absolute bottom-0 right-0 w-20 h-10 overflow-hidden pointer-events-none rounded-br-xl">
            <svg className="w-full h-full text-rose-100/80" viewBox="0 0 100 40" preserveAspectRatio="none" fill="currentColor">
              <path d="M0 40 Q40 10 100 0 L100 40 Z" />
            </svg>
          </div>
        </div>

        {/* 7. Verified & Closed */}
        <div
          onClick={() => { setActiveTab('pipeline'); setPipelineStatusFilter('VERIFIED'); }}
          className="relative overflow-hidden p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold text-slate-900 text-sm tracking-tight">Verified & Closed</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 my-1 tracking-tight">
            {kpis.verifiedAndClosed}
          </div>
          <div className="text-xs text-slate-500 font-medium z-10">Sign-off Completed</div>
          <div className="absolute bottom-0 right-0 w-20 h-10 overflow-hidden pointer-events-none rounded-br-xl">
            <svg className="w-full h-full text-emerald-100/80" viewBox="0 0 100 40" preserveAspectRatio="none" fill="currentColor">
              <path d="M0 40 Q40 10 100 0 L100 40 Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="bg-slate-100/90 border border-slate-200/90 p-1.5 rounded-xl flex items-center gap-1.5 overflow-x-auto shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('pipeline')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'pipeline'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Active Repair Assignments Pipeline</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeTab === 'pipeline' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {assignments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workload')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'workload'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80 shadow-2xs'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Technician Workload & Skill Matrix</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            activeTab === 'workload' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}>
            {technicians.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('unassigned')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'unassigned'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200 shadow-2xs'
          }`}
        >
          <AlertTriangle className={`w-4 h-4 ${activeTab === 'unassigned' ? 'text-white' : 'text-amber-600'}`} />
          <span>Unassigned Incidents Queue</span>
          {kpis.unassignedIncidents > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'unassigned' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              {kpis.unassignedIncidents}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ACTIVE ASSIGNMENT PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="space-y-3">
          {/* Filter Chips Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search assignments by ID, technician, machine..."
                value={pipelineSearch}
                onChange={e => setPipelineSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              {[
                { id: 'ALL', label: 'All Tasks' },
                { id: 'PENDING ACCEPTANCE', label: 'Pending Acceptance' },
                { id: 'IN PROGRESS', label: 'In Progress' },
                { id: 'REASSIGNMENT_REQUESTED', label: 'Reassignment Needed' },
                { id: 'RESOLVED_PENDING_VERIFICATION', label: 'Pending Verification' },
                { id: 'OVERDUE', label: 'Overdue SLA' },
                { id: 'VERIFIED', label: 'Verified & Closed' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPipelineStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer text-xs ${
                    pipelineStatusFilter === f.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignments Table */}
          <TableLayoutProvider maxHeightNormal="max-h-[500px]" className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-100/90 text-slate-800 border-b border-slate-200 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10">
                <tr>
                  <th className="py-3.5 px-3.5">Assignment & Incident</th>
                  <th className="py-3.5 px-3.5">Machine Asset</th>
                  <th className="py-3.5 px-3.5">Assigned Technician</th>
                  <th className="py-3.5 px-3.5">Lifecycle Status</th>
                  <th className="py-3.5 px-3.5">Repair Progress</th>
                  <th className="py-3.5 px-3.5">SLA Due Date</th>
                  <th className="py-3.5 px-3.5 text-right">Manager Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredPipelineAssignments.map(asn => {
                  return (
                    <tr key={asn.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Assignment & Incident Title */}
                      <td className="py-3 px-3.5 max-w-[260px]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-mono text-[10px]">
                            <span className="font-bold text-indigo-700">{asn.id}</span>
                            <span className="text-slate-400">•</span>
                            <span className="font-bold text-amber-700">{asn.incident_id}</span>
                            <span className="text-slate-400">•</span>
                            <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                              asn.priority === 'Critical' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              asn.priority === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                              {asn.priority}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 text-xs line-clamp-1">
                            {asn.incident_title}
                          </div>
                          <div className="text-[11px] text-slate-600 line-clamp-1 font-medium">
                            {asn.incident_description || asn.identified_issue}
                          </div>
                        </div>
                      </td>

                      {/* Machine Asset */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900">{asn.machine_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {asn.machine_code || asn.machine_id} {asn.machine_location && `• ${asn.machine_location}`}
                          </div>
                        </div>
                      </td>

                      {/* Assigned Technician */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600 border border-indigo-700 flex items-center justify-center font-bold text-[11px] text-white">
                            {asn.technician_name ? asn.technician_name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'TC'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              <span>{asn.technician_name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">({asn.technician_id})</span>
                            </div>
                            <div className="text-[10px] text-slate-600 font-medium">
                              {asn.technician_specialisation}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                          asn.status === 'RESOLVED_PENDING_VERIFICATION' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                          asn.status === 'REASSIGNMENT_REQUESTED' ? 'bg-orange-100 text-orange-900 border border-orange-300' :
                          asn.status === 'REJECTED' ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                          asn.status === 'IN PROGRESS' ? 'bg-sky-100 text-sky-900 border border-sky-300' :
                          asn.status === 'PENDING ACCEPTANCE' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          asn.status === 'VERIFIED' || asn.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                          'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}>
                          {asn.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="py-3 px-3.5 min-w-[120px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-900 font-bold">{asn.repair_progress_percent || 0}%</span>
                            <span className="text-[10px] text-slate-500 font-medium">{asn.estimated_repair_hours || 2}h est</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full transition-all"
                              style={{ width: `${asn.repair_progress_percent || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Due Date & Overdue SLA */}
                      <td className="py-3 px-3.5 font-mono text-[11px]">
                        <div className={asn.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-800 font-medium'}>
                          {new Date(asn.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {asn.is_overdue && asn.status !== 'VERIFIED' && asn.status !== 'CLOSED' && (
                          <span className="text-[10px] text-rose-600 font-bold block uppercase tracking-wider mt-0.5">
                            Overdue SLA
                          </span>
                        )}
                      </td>

                      {/* Manager Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {asn.status === 'RESOLVED_PENDING_VERIFICATION' && (
                            <button
                              type="button"
                              onClick={() => setVerifyModalAssignment(asn)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verify & Sign-off</span>
                            </button>
                          )}

                          {asn.status === 'REASSIGNMENT_REQUESTED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewReassignmentAssignment(asn);
                                setReassignDecision('APPROVE');
                                setManagerReassignNotes('');
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Review Request</span>
                            </button>
                          )}

                          {asn.status === 'REJECTED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIncidentIdForAssign(asn.incident_id);
                                setIsAssignModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reassign</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setInspectAssignment(asn)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                            title="Inspect Task Details"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPipelineAssignments.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs font-medium">
                No incident repair assignments found matching filter "{pipelineStatusFilter}".
              </div>
            )}
          </TableLayoutProvider>
        </div>
      )}

      {/* TAB 2: TECHNICIAN WORKLOAD TABLE */}
      {activeTab === 'workload' && (
        <TechnicianWorkloadTable
          technicians={technicians}
          assignments={assignments}
          onAssignTask={handleAssignToTechnician}
          onRefresh={onRefresh}
          isLoading={isLoading}
        />
      )}

      {/* TAB 3: UNASSIGNED INCIDENTS QUEUE */}
      {activeTab === 'unassigned' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex items-center justify-between text-xs text-amber-950 shadow-2xs font-semibold">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                <strong className="text-amber-950 font-bold">{unassignedIncidentsList.length} operational incidents</strong> currently require technician assignment. Dispatching will trigger skill-matching and notification to the assigned technician.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {unassignedIncidentsList.map(inc => {
              const machine = machines.find(m => m.id === inc.machine_id || m.machine_id === inc.machine_id);

              return (
                <div
                  key={inc.id || inc.incident_id}
                  className="p-4 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-700">
                        {inc.incident_id || inc.id}
                      </span>
                      <SeverityBadge severity={inc.severity} />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm tracking-tight">
                      {inc.title}
                    </h4>
                    <p className="text-slate-600 text-xs line-clamp-2 font-medium">
                      {inc.description || 'Equipment anomaly logged.'}
                    </p>
                    {machine && (
                      <div className="text-[11px] text-slate-600 font-medium pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>{machine.name}</span>
                        <span className="font-mono text-slate-500">{machine.line}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIncidentIdForAssign(inc.id || inc.incident_id);
                      setSelectedTechnicianIdForAssign(undefined);
                      setIsAssignModalOpen(true);
                    }}
                    className="w-full py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Assign Technician</span>
                  </button>
                </div>
              );
            })}

            {unassignedIncidentsList.length === 0 && (
              <div className="col-span-full p-12 text-center text-slate-600 space-y-2 bg-white rounded-xl border border-slate-200 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-slate-900 text-sm">All Incidents Assigned!</h4>
                <p className="text-xs font-medium">There are no unassigned incidents in Apex Precision Manufacturing right now.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Incident Selection Modal --- */}
      <IncidentSelectionModal
        isOpen={isIncidentSelectionOpen}
        onClose={() => setIsIncidentSelectionOpen(false)}
        incidents={incidents}
        machines={machines}
        assignments={assignments}
        onSelectIncident={handleIncidentSelected}
      />

      {/* --- Assign Technician Modal --- */}
      <AssignTechnicianModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        incidents={incidents}
        machines={machines}
        technicians={technicians}
        initialIncidentId={selectedIncidentIdForAssign}
        initialTechnicianId={selectedTechnicianIdForAssign}
        onAssignSubmit={onAssignSubmit}
      />

      {/* --- Verify Resolution Modal --- */}
      <VerifyResolutionModal
        isOpen={!!verifyModalAssignment}
        onClose={() => setVerifyModalAssignment(null)}
        assignment={verifyModalAssignment}
        onVerifySubmit={onVerifySubmit}
      />

      {/* --- Review Reassignment Request Modal --- */}
      {reviewReassignmentAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-orange-600" /> Review Reassignment Request
              </h4>
              <button
                type="button"
                onClick={() => setReviewReassignmentAssignment(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="text-slate-900 font-bold text-sm">{reviewReassignmentAssignment.incident_title}</div>
              <div className="text-slate-600 font-medium">Current Technician: <strong className="text-slate-900 font-bold">{reviewReassignmentAssignment.technician_name}</strong></div>
              <div className="text-orange-950 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-1 font-medium">
                <strong className="text-amber-900">Technician's Stated Reason:</strong> {reviewReassignmentAssignment.reassignment_reason}
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setIsReviewSubmitting(true);
                  await onReviewReassignment(reviewReassignmentAssignment.id, {
                    decision: reassignDecision,
                    new_technician_id: reassignDecision === 'APPROVE' ? (newTechnicianId || undefined) : undefined,
                    manager_notes: managerReassignNotes.trim() || undefined
                  });
                  setReviewReassignmentAssignment(null);
                } finally {
                  setIsReviewSubmitting(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block text-slate-800 font-bold mb-1.5">Manager Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReassignDecision('APPROVE')}
                    className={`p-2.5 rounded-lg border font-bold transition cursor-pointer ${
                      reassignDecision === 'APPROVE'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Approve & Reassign
                  </button>
                  <button
                    type="button"
                    onClick={() => setReassignDecision('REJECT')}
                    className={`p-2.5 rounded-lg border font-bold transition cursor-pointer ${
                      reassignDecision === 'REJECT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Decline Request
                  </button>
                </div>
              </div>

              {reassignDecision === 'APPROVE' && (
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Select Replacement Technician</label>
                  <select
                    value={newTechnicianId}
                    onChange={e => setNewTechnicianId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose available technician --</option>
                    {technicians
                      .filter(t => t.user_id !== reviewReassignmentAssignment.technician_id)
                      .map(t => (
                        <option key={t.id} value={t.user_id || t.id}>
                          {t.name} ({t.specialisation}) - {t.availability_status}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-800 font-bold mb-1">Manager Instructions / Notes</label>
                <textarea
                  rows={2}
                  value={managerReassignNotes}
                  onChange={e => setManagerReassignNotes(e.target.value)}
                  placeholder="Notes explaining reassignment decision..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReviewReassignmentAssignment(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReviewSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isReviewSubmitting ? 'Saving...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Task Inspection Drawer Modal --- */}
      {inspectAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Task Diagnostic Dossier: {inspectAssignment.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold">
                    {inspectAssignment.status}
                  </span>
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{inspectAssignment.incident_title}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectAssignment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase">Machine Unit</span>
                  <div className="font-bold text-slate-900 text-sm">{inspectAssignment.machine_name}</div>
                  <div className="text-slate-600 font-mono text-[10px]">{inspectAssignment.machine_code}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase">Assigned Technician</span>
                  <div className="font-bold text-slate-900 text-sm">{inspectAssignment.technician_name}</div>
                  <div className="text-indigo-700 text-[10px] font-semibold">{inspectAssignment.technician_specialisation}</div>
                </div>
              </div>

              {inspectAssignment.identified_issue && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[10px] font-bold uppercase">Identified Issue</span>
                  <div className="text-slate-800 font-medium mt-1">{inspectAssignment.identified_issue}</div>
                </div>
              )}

              {inspectAssignment.root_cause_analysis && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 text-[10px] font-bold uppercase">Root Cause Analysis</span>
                  <div className="text-slate-800 font-medium mt-1">{inspectAssignment.root_cause_analysis}</div>
                </div>
              )}

              {inspectAssignment.required_tools && inspectAssignment.required_tools.length > 0 && (
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase block mb-1">Required Diagnostic Tools</span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectAssignment.required_tools.map((t, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800 font-medium text-[11px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {inspectAssignment.history && inspectAssignment.history.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <span className="text-slate-500 text-[10px] font-bold uppercase">Audit Timeline</span>
                  <div className="space-y-1">
                    {inspectAssignment.history.map((h, hIdx) => (
                      <div key={hIdx} className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between">
                        <div>
                          <strong className="text-indigo-700">{h.action}</strong>: <span className="text-slate-800 font-medium">{h.notes || 'Status updated'}</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setInspectAssignment(null)}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
