import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { TechnicianAssignmentCard } from '../components/technician/TechnicianAssignmentCard.tsx';
import { useSearchHighlight } from '../utils/useSearchHighlight.ts';
import {
  Wrench,
  AlertTriangle,
  Inbox,
  CheckCircle2,
  Clock,
  Briefcase,
  Star,
  User,
  Calendar,
  Layers,
  RotateCcw
} from 'lucide-react';

export const MyAssignedTasksPage: React.FC = () => {
  const { user } = useAuth();
  const {
    technicianProfiles,
    technicianAssignments,
    acceptTechnicianAssignment,
    rejectTechnicianAssignment,
    requestAssignmentReassignment,
    startAssignmentRepair,
    updateAssignmentProgress,
    resolveAssignment
  } = useData();

  const { highlightId, isHighlighted, highlightRef, highlightClass } = useSearchHighlight();

  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'PENDING ACCEPTANCE' | 'IN PROGRESS' | 'RESOLVED_PENDING_VERIFICATION' | 'OVERDUE'>('ALL');

  // Find profile of logged in technician or default to first profile
  const myProfile = useMemo(() => {
    if (!user) return technicianProfiles[0] || null;
    return technicianProfiles.find(p => p.user_id === user.id || p.email === user.email) || technicianProfiles[0] || null;
  }, [technicianProfiles, user]);

  // Filter assignments for this technician
  const myAssignments = useMemo(() => {
    let list = technicianAssignments;
    if (user?.role === 'TECHNICIAN' || user?.role === 'OPERATOR') {
      list = list.filter(a => {
        const matchesUserId = a.technician_id === user.id;
        const matchesEmail = a.technician_email?.toLowerCase() === user.email?.toLowerCase();
        const matchesProfile = myProfile && (a.technician_id === myProfile.id || a.technician_id === myProfile.user_id);
        const matchesName = user.name && a.technician_name && (
          a.technician_name.toLowerCase().includes(user.name.toLowerCase().split(' ')[0]) ||
          user.name.toLowerCase().includes(a.technician_name.toLowerCase().split(' ')[0])
        );
        return matchesUserId || matchesEmail || matchesProfile || matchesName;
      });
    } else if (myProfile) {
      list = list.filter(a => a.technician_id === myProfile.user_id || a.technician_id === myProfile.id || a.technician_email === myProfile.email);
    }
    return list;
  }, [technicianAssignments, user, myProfile]);

  // Auto switch filter to ALL if highlighted item is not in current filter
  useEffect(() => {
    if (highlightId && myAssignments.length > 0) {
      const match = myAssignments.find(a =>
        (a.id && a.id.toLowerCase().includes(highlightId.toLowerCase())) ||
        (a.incident_id && a.incident_id.toLowerCase().includes(highlightId.toLowerCase())) ||
        (a.incident_title && a.incident_title.toLowerCase().includes(highlightId.toLowerCase())) ||
        (a.machine_id && a.machine_id.toLowerCase().includes(highlightId.toLowerCase())) ||
        (a.machine_code && a.machine_code.toLowerCase().includes(highlightId.toLowerCase()))
      );
      if (match) {
        setAssignmentFilter('ALL');
      }
    }
  }, [highlightId, myAssignments]);

  const filteredAssignments = useMemo(() => {
    if (assignmentFilter === 'ALL') return myAssignments;
    if (assignmentFilter === 'OVERDUE') return myAssignments.filter(a => a.is_overdue);
    if (assignmentFilter === 'PENDING ACCEPTANCE') {
      return myAssignments.filter(a => {
        const st = (a.status || '').toUpperCase().trim();
        return st === 'PENDING ACCEPTANCE' || st === 'PENDING_ACCEPTANCE' || st === 'PENDING';
      });
    }
    if (assignmentFilter === 'IN PROGRESS') {
      return myAssignments.filter(a => {
        const st = (a.status || '').toUpperCase().trim();
        return st === 'IN PROGRESS' || st === 'IN_PROGRESS';
      });
    }
    if (assignmentFilter === 'RESOLVED_PENDING_VERIFICATION') {
      return myAssignments.filter(a => {
        const st = (a.status || '').toUpperCase().trim();
        return st === 'RESOLVED_PENDING_VERIFICATION' || st === 'RESOLVED';
      });
    }
    return myAssignments.filter(a => a.status === assignmentFilter);
  }, [myAssignments, assignmentFilter]);

  const pendingAcceptanceCount = useMemo(() => {
    return myAssignments.filter(a => {
      const st = (a.status || '').toUpperCase().trim();
      return st === 'PENDING ACCEPTANCE' || st === 'PENDING_ACCEPTANCE' || st === 'PENDING';
    }).length;
  }, [myAssignments]);

  const inProgressCount = useMemo(() => {
    return myAssignments.filter(a => {
      const st = (a.status || '').toUpperCase().trim();
      return st === 'IN PROGRESS' || st === 'IN_PROGRESS';
    }).length;
  }, [myAssignments]);

  const awaitingVerificationCount = useMemo(() => {
    return myAssignments.filter(a => {
      const st = (a.status || '').toUpperCase().trim();
      return st === 'RESOLVED_PENDING_VERIFICATION' || st === 'RESOLVED';
    }).length;
  }, [myAssignments]);

  const overdueCount = useMemo(() => {
    return myAssignments.filter(a => a.is_overdue).length;
  }, [myAssignments]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#794628] text-white flex items-center justify-center shrink-0 shadow-md">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>My Assigned Tasks</span>
              {pendingAcceptanceCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-bounce shadow-2xs">
                  {pendingAcceptanceCount} Action Required
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Actionable Incident Assignments & Response — Review assigned machine incidents, accept or reject assignments, log repair diagnostics, and submit resolution for sign-off.
            </p>
          </div>
        </div>

        {/* Workload Pill */}
        {myProfile && (
          <div className="flex items-center gap-4 bg-white border border-slate-200 p-3 rounded-xl shadow-2xs shrink-0">
            <div>
              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                Availability
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                myProfile.availability_status === 'AVAILABLE' || myProfile.availability_status === 'Available'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  myProfile.availability_status === 'AVAILABLE' || myProfile.availability_status === 'Available' ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                }`} />
                {myProfile.availability_status || 'Available'}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">
                Active Queue
              </span>
              <span className="text-sm text-slate-900 font-mono font-black">
                {myAssignments.filter(a => a.status === 'IN PROGRESS' || a.status === 'PENDING ACCEPTANCE' || a.status === 'ACCEPTED').length} / {myProfile.max_concurrent_assignments || 3} Tasks
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Task Management Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-sm">
        {/* Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Layers className="w-4 h-4 text-[#794628]" />
            <span>Filter Tasks by Operational Status:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAssignmentFilter('ALL')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                assignmentFilter === 'ALL'
                  ? 'bg-[#794628] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700'
              }`}
            >
              All ({myAssignments.length})
            </button>
            <button
              type="button"
              onClick={() => setAssignmentFilter('PENDING ACCEPTANCE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                assignmentFilter === 'PENDING ACCEPTANCE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700'
              }`}
            >
              Pending ({pendingAcceptanceCount})
              {pendingAcceptanceCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setAssignmentFilter('IN PROGRESS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                assignmentFilter === 'IN PROGRESS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700'
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setAssignmentFilter('RESOLVED_PENDING_VERIFICATION')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                assignmentFilter === 'RESOLVED_PENDING_VERIFICATION'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700'
              }`}
            >
              Pending Sign-off ({awaitingVerificationCount})
            </button>
            {overdueCount > 0 && (
              <button
                type="button"
                onClick={() => setAssignmentFilter('OVERDUE')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs ${
                  assignmentFilter === 'OVERDUE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white hover:bg-rose-50 border border-rose-300 text-rose-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Overdue ({overdueCount})
              </button>
            )}
          </div>
        </div>

        {/* Task Cards Grid */}
        {filteredAssignments.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {filteredAssignments.map(asn => {
              const highlighted = isHighlighted(
                asn.id,
                asn.incident_id,
                asn.machine_id,
                asn.machine_code,
                asn.incident_title
              );

              return (
                <div
                  key={asn.id}
                  ref={highlighted ? highlightRef : undefined}
                  className={`transition-all rounded-2xl ${highlighted ? highlightClass : ''}`}
                >
                  <TechnicianAssignmentCard
                    assignment={asn}
                    isHighlighted={highlighted}
                    onAccept={async (id) => { await acceptTechnicianAssignment(id); }}
                    onReject={async (id, reason) => { await rejectTechnicianAssignment(id, reason); }}
                    onRequestReassignment={async (id, reason) => { await requestAssignmentReassignment(id, reason); }}
                    onStartRepair={async (id) => { await startAssignmentRepair(id); }}
                    onUpdateProgress={async (id, percent, notes, additionalProblems) => {
                      await updateAssignmentProgress(id, {
                        progress_percent: percent,
                        diagnosis_notes: notes,
                        additional_problems_found: additionalProblems
                      });
                    }}
                    onResolve={async (id, submission) => {
                      await resolveAssignment(id, submission);
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 px-4 text-center rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Inbox className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              No incident assignments found in this view
            </h4>
            <p className="text-xs text-slate-600 font-medium max-w-md mx-auto">
              {assignmentFilter === 'ALL'
                ? 'You have no incident assignments currently assigned. All assigned machinery is operating under standard status.'
                : `No assignments currently match the filter "${assignmentFilter}". Switch to 'All' to see all assignments.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
