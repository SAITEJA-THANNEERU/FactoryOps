import React, { useState } from 'react';
import type { TechnicianIncidentAssignment } from '../../types/index.ts';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Wrench,
  Clock,
  Package,
  Star,
  X,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface VerifyResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: TechnicianIncidentAssignment | null;
  onVerifySubmit: (assignmentId: string, payload: {
    decision: 'APPROVE' | 'REJECT';
    verification_notes?: string;
    quality_rating?: number;
    rework_instructions?: string;
  }) => Promise<void>;
}

export const VerifyResolutionModal: React.FC<VerifyResolutionModalProps> = ({
  isOpen,
  onClose,
  assignment,
  onVerifySubmit
}) => {
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [qualityRating, setQualityRating] = useState<number>(5);
  const [verificationNotes, setVerificationNotes] = useState<string>(
    'Equipment inspection verified. Vibration, temperature, and clamping pressure hold within standard operating limits. Repair approved.'
  );
  const [reworkInstructions, setReworkInstructions] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (decision === 'REJECT' && !reworkInstructions.trim()) {
      setErrorMsg('Please specify rework instructions for the technician');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onVerifySubmit(assignment.id, {
        decision,
        verification_notes: verificationNotes.trim() || undefined,
        quality_rating: decision === 'APPROVE' ? qualityRating : undefined,
        rework_instructions: decision === 'REJECT' ? reworkInstructions.trim() : undefined
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete resolution verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Manager Repair Verification & Sign-off
              </h3>
              <p className="text-xs text-slate-400">
                Audit technician resolution records prior to incident closure
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Incident & Technician Summary Card */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sky-400 font-medium">
                <Wrench className="w-4 h-4" />
                <span>{assignment.machine_name}</span>
                <span className="text-slate-500 font-mono">({assignment.machine_code || assignment.machine_id})</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">
                Assignment: {assignment.id}
              </span>
            </div>

            <div className="text-white font-bold text-sm">
              {assignment.incident_title}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 border-t border-slate-800 pt-2">
              <span>Technician: <strong className="text-white">{assignment.technician_name}</strong></span>
              <span>Specialisation: <strong className="text-indigo-300">{assignment.technician_specialisation}</strong></span>
              <span>
                Estimated vs Actual:{' '}
                <strong className="text-white font-mono">{assignment.estimated_repair_hours}h</strong> vs{' '}
                <strong className="text-emerald-400 font-mono">{assignment.resolution_submission?.actual_repair_hours || 0}h</strong>
              </span>
            </div>
          </div>

          {/* Resolution Submission Details */}
          {assignment.resolution_submission ? (
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl space-y-2.5">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                Technician Submitted Work Details
              </span>

              <div>
                <span className="text-slate-400 font-medium block mb-0.5">Confirmed Root Cause:</span>
                <p className="text-slate-200 bg-slate-900/70 p-2 rounded border border-slate-800">
                  {assignment.resolution_submission.confirmed_root_cause}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium block mb-0.5">Actions Taken & Testing Results:</span>
                <p className="text-slate-200 bg-slate-900/70 p-2 rounded border border-slate-800">
                  {assignment.resolution_submission.actions_taken}
                </p>
              </div>

              {assignment.resolution_submission.resolution_remarks && (
                <div>
                  <span className="text-slate-400 font-medium block mb-0.5">Technician Remarks:</span>
                  <p className="text-slate-300 italic bg-slate-900/70 p-2 rounded border border-slate-800">
                    "{assignment.resolution_submission.resolution_remarks}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-slate-900 rounded-lg text-slate-400">
              No formal resolution submission recorded.
            </div>
          )}

          {/* Decision Selector */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="block text-slate-300 font-semibold text-xs uppercase tracking-wider">
              Verification Decision
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision('APPROVE')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs transition ${
                  decision === 'APPROVE'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-md'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Approve & Close Incident
              </button>

              <button
                type="button"
                onClick={() => setDecision('REJECT')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-semibold text-xs transition ${
                  decision === 'REJECT'
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-md'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <RotateCcw className="w-4 h-4 text-rose-400" />
                Reject & Request Rework
              </button>
            </div>
          </div>

          {/* If Approving */}
          {decision === 'APPROVE' && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Quality & SOP Compliance Rating
                </label>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setQualityRating(i + 1)}
                      className="p-1 hover:scale-110 transition"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          i < qualityRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-slate-400 font-mono text-xs ml-2">
                    {qualityRating} / 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Manager Verification Notes (Audit Logged)
                </label>
                <textarea
                  rows={2}
                  value={verificationNotes}
                  onChange={e => setVerificationNotes(e.target.value)}
                  placeholder="Notes on equipment run, safety sign-off..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* If Rejecting */}
          {decision === 'REJECT' && (
            <div className="space-y-2 pt-2">
              <label className="block text-rose-300 font-medium">
                Rework Instructions & Diagnostic Feedback (Mandatory)
              </label>
              <textarea
                required
                rows={3}
                value={reworkInstructions}
                onChange={e => setReworkInstructions(e.target.value)}
                placeholder="Explain what failed inspection (e.g. residual vibration exceeds 2.5 mm/s, oil weeping still present, torque recalibration required)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <p className="text-[11px] text-slate-400">
                * The incident status will be reset to <strong className="text-indigo-400">IN PROGRESS</strong> and the technician will be alerted with your instructions.
              </p>
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-lg text-xs font-bold text-white shadow-lg transition flex items-center gap-1.5 disabled:opacity-50 ${
                decision === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
              }`}
            >
              {decision === 'APPROVE' ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  {isSubmitting ? 'Verifying...' : 'Approve & Close Incident'}
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  {isSubmitting ? 'Submitting...' : 'Return for Rework'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
