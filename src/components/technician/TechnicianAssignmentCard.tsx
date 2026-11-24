import React, { useState } from 'react';
import type { TechnicianIncidentAssignment } from '../../types/index.ts';
import {
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  User,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Star,
  Target,
  Lightbulb,
  Building2,
  Calendar,
  FileText
} from 'lucide-react';

interface TechnicianAssignmentCardProps {
  assignment: TechnicianIncidentAssignment;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onRequestReassignment: (id: string, reason: string) => Promise<void>;
  onStartRepair: (id: string) => Promise<void>;
  onUpdateProgress: (id: string, percent: number, notes: string, additionalProblems?: string) => Promise<void>;
  onResolve: (id: string, submission: {
    confirmed_root_cause: string;
    actions_taken: string;
    parts_used: any[];
    actual_repair_hours: number;
    resolution_remarks: string;
  }) => Promise<void>;
  isManagerView?: boolean;
  onVerify?: (id: string) => void;
  isHighlighted?: boolean;
  defaultExpanded?: boolean;
}

export const TechnicianAssignmentCard: React.FC<TechnicianAssignmentCardProps> = ({
  assignment,
  onAccept,
  onReject,
  onRequestReassignment,
  onStartRepair,
  onUpdateProgress,
  onResolve,
  isManagerView = false,
  onVerify,
  isHighlighted = false,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded || isHighlighted);

  React.useEffect(() => {
    if (isHighlighted || defaultExpanded) {
      setIsExpanded(true);
    }
  }, [isHighlighted, defaultExpanded]);
  const [showHistory, setShowHistory] = useState(false);
  const [showProgressUpdates, setShowProgressUpdates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignReason, setReassignReason] = useState('');

  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(assignment.repair_progress_percent || 25);
  const [progressNotes, setProgressNotes] = useState('');
  const [additionalProblems, setAdditionalProblems] = useState('');

  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [rootCause, setRootCause] = useState(assignment.root_cause_analysis || '');
  const [actionsTaken, setActionsTaken] = useState(assignment.recommended_resolution || '');
  const [actualHours, setActualHours] = useState<number>(assignment.estimated_repair_hours || 2.0);
  const [resolutionRemarks, setResolutionRemarks] = useState('');

  // Normalized status checks
  const normalizedStatus = (assignment.status || '').toUpperCase().trim();
  const isPendingAcceptance = normalizedStatus === 'PENDING ACCEPTANCE' || normalizedStatus === 'PENDING_ACCEPTANCE' || normalizedStatus === 'PENDING';
  const isAccepted = normalizedStatus === 'ACCEPTED';
  const isInProgress = normalizedStatus === 'IN PROGRESS' || normalizedStatus === 'IN_PROGRESS';
  const isResolvedPending = normalizedStatus === 'RESOLVED_PENDING_VERIFICATION' || normalizedStatus === 'RESOLVED';
  const isVerifiedOrClosed = normalizedStatus === 'VERIFIED' || normalizedStatus === 'CLOSED';
  const isRejected = normalizedStatus === 'REJECTED';
  const isReassignmentRequested = normalizedStatus === 'REASSIGNMENT_REQUESTED' || normalizedStatus === 'PENDING REASSIGNMENT' || normalizedStatus === 'PENDING_REASSIGNMENT';

  // Status Styling Helper (FactoryOps clean style matching reference image)
  const getStatusBadge = () => {
    if (isPendingAcceptance) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <Clock className="w-3.5 h-3.5 text-emerald-600" /> Pending
        </span>
      );
    }
    if (isAccepted) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Accepted
        </span>
      );
    }
    if (isInProgress) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
          <Wrench className="w-3.5 h-3.5 text-blue-600" /> In Progress
        </span>
      );
    }
    if (isResolvedPending) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Pending Sign-off
        </span>
      );
    }
    if (isVerifiedOrClosed) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified & Closed
        </span>
      );
    }
    if (isRejected) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Rejected
        </span>
      );
    }
    if (isReassignmentRequested) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-orange-100 text-orange-900 border border-orange-300">
          <RotateCcw className="w-3.5 h-3.5 text-orange-600" /> Reassignment Requested
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
        {assignment.status}
      </span>
    );
  };

  const getPriorityBadge = () => {
    const prio = assignment.priority;
    if (prio === 'Critical') {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase bg-rose-100 text-rose-900 border border-rose-300">
          Critical
        </span>
      );
    }
    if (prio === 'High') {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
          HIGH
        </span>
      );
    }
    if (prio === 'Medium' || prio === 'Med' || prio === 'MED') {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
          MED
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-300">
        LOW
      </span>
    );
  };

  const handleAccept = async () => {
    try {
      setIsSubmitting(true);
      await onAccept(assignment.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    try {
      setIsSubmitting(true);
      await onReject(assignment.id, rejectReason.trim());
      setIsRejectOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignReason.trim()) return;
    try {
      setIsSubmitting(true);
      await onRequestReassignment(assignment.id, reassignReason.trim());
      setIsReassignOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStart = async () => {
    try {
      setIsSubmitting(true);
      await onStartRepair(assignment.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressNotes.trim()) return;
    try {
      setIsSubmitting(true);
      await onUpdateProgress(assignment.id, Number(progressPercent), progressNotes.trim(), additionalProblems.trim() || undefined);
      setIsProgressOpen(false);
      setProgressNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootCause.trim() || !actionsTaken.trim()) return;
    try {
      setIsSubmitting(true);
      await onResolve(assignment.id, {
        confirmed_root_cause: rootCause.trim(),
        actions_taken: actionsTaken.trim(),
        parts_used: assignment.spare_parts_required || [],
        actual_repair_hours: Number(actualHours),
        resolution_remarks: resolutionRemarks.trim()
      });
      setIsResolveOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compact Collapsed Card View
  if (!isExpanded) {
    return (
      <div className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all ${
        assignment.is_overdue
          ? 'border-rose-300 bg-rose-50/10'
          : 'border-slate-200/90'
      }`}>
        <div
          onClick={() => setIsExpanded(true)}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
        >
          {/* Left: Priority Badge + Incident ID & Machine Code + Title + Time/Due */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="shrink-0 pt-0.5">
              {getPriorityBadge()}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono font-bold">
                <span>{assignment.incident_id || assignment.id}</span>
                <span>|</span>
                <span>{assignment.machine_code || assignment.machine_id}</span>
              </div>

              <h4 className="text-sm font-black text-slate-900 tracking-tight line-clamp-1">
                {assignment.incident_title}
              </h4>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-600 font-medium pt-0.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Est. Time: <strong className="text-slate-900 font-bold">{assignment.estimated_repair_hours} hrs</strong></span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Due: <strong className={assignment.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-900 font-bold'}>
                    {new Date(assignment.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </strong></span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Progress % + Status + Progress Bar + Downward Arrow */}
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900 font-mono">{assignment.repair_progress_percent || 0}%</span>
              {getStatusBadge()}
            </div>

            <div className="hidden md:block w-28 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className="h-full bg-[#794628] rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, assignment.repair_progress_percent || 0))}%` }}
              />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition cursor-pointer shrink-0"
              aria-label="Expand task details"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-2xl p-5 space-y-4 shadow-xs transition-all hover:shadow-md ${
      assignment.is_overdue
        ? 'border-rose-300'
        : 'border-slate-200/90'
    }`}>
      {/* Top Header Row with Collapse Arrow */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {getPriorityBadge()}
          {getStatusBadge()}
          {assignment.is_overdue && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> OVERDUE
            </span>
          )}
          <span className="text-xs text-slate-700 font-mono font-bold">
            ID: {assignment.incident_id || assignment.id}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-700 font-mono flex items-center gap-1.5 font-bold">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Due: <strong className={assignment.is_overdue ? 'text-rose-600' : 'text-slate-900'}>
              {new Date(assignment.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </strong></span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition cursor-pointer shrink-0"
            aria-label="Collapse task details"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Machine Location & Details */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
          <Building2 className="w-4 h-4 text-[#794628]" />
          <span>{assignment.machine_name}</span>
          {assignment.machine_code && <span className="text-slate-500 font-mono">({assignment.machine_code})</span>}
          {assignment.machine_location && <span className="text-slate-400 font-normal">| {assignment.machine_location}</span>}
        </div>
        <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1">
          {assignment.incident_title}
        </h3>
        {assignment.incident_description && (
          <p className="mt-1 text-xs text-slate-600 font-medium leading-relaxed">
            {assignment.incident_description}
          </p>
        )}
      </div>

      {/* AI Skill-Match Recommendation Box */}
      {assignment.ai_recommendation_details && (
        <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/90 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" /> AI Skill-Match Recommendation
            </span>
            <span className="px-3 py-1 rounded-lg font-bold bg-blue-600 text-white text-xs shadow-2xs">
              {assignment.ai_recommendation_details.match_score}% Match
            </span>
          </div>
          <p className="text-slate-800 leading-relaxed font-medium">
            {assignment.ai_recommendation_details.reasoning}
          </p>
          {assignment.ai_recommendation_details.matched_skills && assignment.ai_recommendation_details.matched_skills.length > 0 && (
            <div className="pt-1 flex flex-wrap gap-1.5 items-center">
              <span className="text-slate-600 font-semibold text-[11px]">Matched Skills:</span>
              {assignment.ai_recommendation_details.matched_skills.map((skill: string, idx: number) => (
                <span key={idx} className="px-2.5 py-0.5 rounded-md bg-white text-slate-800 text-[11px] font-bold border border-blue-200 shadow-2xs">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Diagnostic Breakdown: Root Cause & Resolution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-[#794628]" /> Suspected Root Cause
          </span>
          <p className="text-slate-600 font-medium leading-relaxed">
            {assignment.root_cause_analysis || 'Under diagnostic investigation.'}
          </p>
        </div>

        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-600" /> Recommended Resolution
          </span>
          <p className="text-slate-600 font-medium leading-relaxed">
            {assignment.recommended_resolution || 'Follow standard operating procedure (SOP).'}
          </p>
        </div>
      </div>

      {/* Time & Assigned Tech Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Estimated Repair Time: <strong className="text-slate-900 font-extrabold font-mono">{assignment.estimated_repair_hours} hrs</strong></span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
          <User className="w-4 h-4 text-slate-500" />
          <span>Assigned: <strong className="text-slate-900 font-bold">{assignment.technician_name}</strong> <span className="text-slate-500 font-medium">({assignment.technician_specialisation})</span></span>
        </div>
      </div>

      {/* Required Tools */}
      {assignment.required_tools && assignment.required_tools.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-800 font-bold flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-[#794628]" /> Required Tools:
          </span>
          {assignment.required_tools.map((tool, idx) => (
            <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[11px]">
              {tool}
            </span>
          ))}
        </div>
      )}

      {/* Spare Parts */}
      {assignment.spare_parts_required && assignment.spare_parts_required.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-800 font-bold flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-amber-600" /> Spare Parts:
          </span>
          {assignment.spare_parts_required.map((part, idx) => (
            <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-bold text-[11px] flex items-center gap-1.5">
              <span>{part.part_name}</span>
              {part.quantity && <span className="text-slate-500 font-mono">x{part.quantity}</span>}
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                part.is_in_stock ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {part.is_in_stock ? '✓ In Stock' : 'Low Stock'}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Repair Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-900 font-bold">Repair Progress</span>
          <span className="text-slate-900 font-extrabold font-mono text-xs">{assignment.repair_progress_percent || 0}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div
            className="h-full bg-[#794628] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, assignment.repair_progress_percent || 0))}%` }}
          />
        </div>
        {assignment.repair_notes && (
          <p className="text-xs text-slate-600 italic font-medium">
            Latest: "{assignment.repair_notes}"
          </p>
        )}
      </div>

      {/* Submitted Repair Resolution Box */}
      {assignment.resolution_submission && (
        <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs space-y-1.5 text-slate-800">
          <div className="flex items-center justify-between font-bold">
            <span className="text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Submitted Repair Resolution
            </span>
            <span className="font-mono text-slate-700">
              Actual: {assignment.resolution_submission.actual_repair_hours} hrs
            </span>
          </div>
          <div>
            <strong className="text-slate-900 font-bold">Confirmed Root Cause:</strong>{' '}
            <span className="text-slate-700 font-medium">{assignment.resolution_submission.confirmed_root_cause}</span>
          </div>
          <div>
            <strong className="text-slate-900 font-bold">Actions Taken:</strong>{' '}
            <span className="text-slate-700 font-medium">{assignment.resolution_submission.actions_taken}</span>
          </div>
          {assignment.resolution_submission.resolution_remarks && (
            <div>
              <strong className="text-slate-900 font-bold">Remarks:</strong>{' '}
              <span className="text-slate-700 italic">{assignment.resolution_submission.resolution_remarks}</span>
            </div>
          )}
        </div>
      )}

      {/* Manager Verification Details */}
      {assignment.verification_details && (
        <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs space-y-1.5 text-slate-800">
          <div className="flex items-center justify-between font-bold">
            <span className="text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Manager Verification & Sign-off
            </span>
            <div className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < (assignment.verification_details?.quality_rating || 5)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-slate-800 font-medium">
            {assignment.verification_details.verification_notes}
          </p>
          <div className="text-[11px] text-slate-600 font-medium">
            Verified by <strong>{assignment.verification_details.verified_by_name}</strong> ({assignment.verification_details.verified_by_role}) on {new Date(assignment.verification_details.verified_at).toLocaleDateString()}
          </div>
        </div>
      )}

      {/* Bottom Collapsible Buttons & Action State Controls */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Audit Trail ({assignment.history?.length || 0})</span>
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {assignment.progress_updates && assignment.progress_updates.length > 0 && (
            <button
              type="button"
              onClick={() => setShowProgressUpdates(!showProgressUpdates)}
              className="text-xs text-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              <span>Log History ({assignment.progress_updates.length})</span>
              {showProgressUpdates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isManagerView && isResolvedPending && (
            <button
              type="button"
              onClick={() => onVerify && onVerify(assignment.id)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Verify & Sign-off
            </button>
          )}

          {isPendingAcceptance && (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleAccept}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Accept Assignment
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsRejectOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-rose-300 text-rose-800 hover:bg-rose-50 transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" /> Reject
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsReassignOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> Request Reassignment
              </button>
            </>
          )}

          {isAccepted && (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleStart}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Wrench className="w-3.5 h-3.5" /> Start Repair (LOTO Verified)
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsReassignOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" /> Request Reassignment
              </button>
            </>
          )}

          {isInProgress && (
            <>
              <button
                type="button"
                onClick={() => setIsProgressOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" /> Update Progress
              </button>
              <button
                type="button"
                onClick={() => setIsResolveOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Resolved
              </button>
            </>
          )}
        </div>
      </div>

      {/* Audit Timeline Section (Collapsible) */}
      {showHistory && (
        <div className="pt-3 border-t border-slate-200 bg-slate-50/80 p-3.5 rounded-xl space-y-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            Incident Assignment History Log
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {assignment.history?.map((entry, idx) => (
              <div key={idx} className="text-xs flex items-start gap-2 border-l-2 border-indigo-500 pl-2.5 py-0.5">
                <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div>
                  <span className="font-bold text-slate-900">{entry.action}</span>
                  <span className="text-slate-600"> by {entry.performed_by_name || entry.actor_name || 'Staff'} {entry.performed_by_role || entry.actor_role ? `(${entry.performed_by_role || entry.actor_role})` : ''}</span>
                  {entry.notes && <p className="text-slate-700 text-[11px] mt-0.5">{entry.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Updates Section (Collapsible) */}
      {showProgressUpdates && assignment.progress_updates && (
        <div className="pt-3 border-t border-slate-200 bg-slate-50/80 p-3.5 rounded-xl space-y-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            Diagnostic & Repair Log Entries
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {assignment.progress_updates.map((upd, idx) => (
              <div key={idx} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-indigo-700 font-bold">{upd.progress_percent}% Progress</span>
                  <span className="font-mono text-slate-500">{new Date(upd.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-slate-800 font-medium">{upd.diagnosis_notes || upd.notes}</p>
                {(upd.additional_problems_found || upd.reported_problems) && (
                  <p className="text-amber-900 text-[11px] font-medium">
                    <strong className="text-amber-800">Additional problem detected:</strong> {upd.additional_problems_found || upd.reported_problems}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Reject Modal --- */}
      {isRejectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-base font-bold text-rose-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" /> Reject Incident Assignment
              </h4>
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Please state the specific reason for rejecting this assignment. The factory manager will be notified immediately to reassign.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Rejection Reason (Mandatory)
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Currently dedicated to critical press PM in Bay 2, requires instrumentation calibration outside my domain..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectReason.trim() || isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Request Reassignment Modal --- */}
      {isReassignOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-base font-bold text-amber-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-600" /> Request Reassignment
              </h4>
              <button
                type="button"
                onClick={() => setIsReassignOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Submit a formal request to your supervisor to reassign this incident to another technician.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Reason for Reassignment Request (Mandatory)
                </label>
                <textarea
                  required
                  rows={3}
                  value={reassignReason}
                  onChange={e => setReassignReason(e.target.value)}
                  placeholder="e.g. End-of-shift conflict, urgent high-voltage safety permit required, specialist hydraulic testing needed..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsReassignOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!reassignReason.trim() || isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Submit Reassignment Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Progress Update Modal --- */}
      {isProgressOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" /> Log Diagnostic & Repair Progress
              </h4>
              <button
                type="button"
                onClick={() => setIsProgressOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleProgressSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-bold mb-1.5">
                  Repair Completion: <strong className="text-indigo-700 font-mono text-sm">{progressPercent}%</strong>
                </label>
                <input
                  type="range"
                  min="5"
                  max="95"
                  step="5"
                  value={progressPercent}
                  onChange={e => setProgressPercent(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>Initial LOTO (10%)</span>
                  <span>Disassembly (35%)</span>
                  <span>Part Replaced (70%)</span>
                  <span>Testing (90%)</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Diagnosis & Work Completed (Mandatory)
                </label>
                <textarea
                  required
                  rows={3}
                  value={progressNotes}
                  onChange={e => setProgressNotes(e.target.value)}
                  placeholder="Details of disassembly, measured tolerances, vibration check results..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Additional Problems / Hazards Identified (Optional)
                </label>
                <input
                  type="text"
                  value={additionalProblems}
                  onChange={e => setAdditionalProblems(e.target.value)}
                  placeholder="e.g. Minor oil seepage noticed on adjacent manifold"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsProgressOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!progressNotes.trim() || isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Save Progress Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Mark Resolved Modal --- */}
      {isResolveOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Complete Repair & Submit for Verification
              </h4>
              <button
                type="button"
                onClick={() => setIsResolveOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
              <p className="text-slate-600 font-medium">
                Provide comprehensive resolution records. This submission will be audited by the engineering supervisor before the incident is formally closed.
              </p>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Confirmed Root Cause (Mandatory)
                </label>
                <textarea
                  required
                  rows={2}
                  value={rootCause}
                  onChange={e => setRootCause(e.target.value)}
                  placeholder="e.g. Bearing inner race micro-spalling due to thermal expansion"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Actions Taken & Test Run Results (Mandatory)
                </label>
                <textarea
                  required
                  rows={3}
                  value={actionsTaken}
                  onChange={e => setActionsTaken(e.target.value)}
                  placeholder="Replaced bearing set, calibrated pre-load torque, executed 20-min dry run with vibration holding < 1.2 mm/s RMS."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Actual Repair Time (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={actualHours}
                    onChange={e => setActualHours(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Parts Consumed
                  </label>
                  <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 text-[11px] font-medium">
                    {assignment.spare_parts_required?.length
                      ? assignment.spare_parts_required.map((p: any) => p.part_name || p.name || p).join(', ')
                      : 'None required'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Technician Remarks / Preventive Suggestions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={resolutionRemarks}
                  onChange={e => setResolutionRemarks(e.target.value)}
                  placeholder="Recommend scheduled lubrication loop inspection after 100 operating hours."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsResolveOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rootCause.trim() || !actionsTaken.trim() || isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Submit Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
