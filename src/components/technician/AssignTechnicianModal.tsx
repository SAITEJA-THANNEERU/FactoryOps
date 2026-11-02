import React, { useState, useEffect } from 'react';
import type { Incident, Machine, TechnicianProfile, TechnicianRecommendationResult } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import {
  Sparkles,
  User,
  Wrench,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  Calendar,
  X,
  Search,
  Check
} from 'lucide-react';

interface AssignTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: Incident[];
  machines: Machine[];
  technicians: TechnicianProfile[];
  initialIncidentId?: string;
  initialTechnicianId?: string;
  onAssignSubmit: (data: any) => Promise<void>;
}

export const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({
  isOpen,
  onClose,
  incidents,
  machines,
  technicians,
  initialIncidentId,
  initialTechnicianId,
  onAssignSubmit
}) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(initialIncidentId || '');
  const [recommendation, setRecommendation] = useState<TechnicianRecommendationResult | null>(null);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState<boolean>(false);

  // Form State
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>(initialTechnicianId || '');
  const [priority, setPriority] = useState<string>('High');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date(Date.now() + 48 * 3600000);
    return d.toISOString().slice(0, 16);
  });
  const [estimatedHours, setEstimatedHours] = useState<number>(3.0);
  const [requiredTools, setRequiredTools] = useState<string[]>([]);
  const [newToolInput, setNewToolInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available open incidents (not closed)
  const openIncidents = incidents.filter(i => i.status !== 'Closed');

  // Selected incident details
  const currentIncident = incidents.find(i => i.id === selectedIncidentId || i.incident_id === selectedIncidentId);
  const currentMachine = currentIncident ? machines.find(m => m.id === currentIncident.machine_id) : undefined;

  // Set default selected incident if none selected
  useEffect(() => {
    if (isOpen) {
      if (initialIncidentId) {
        setSelectedIncidentId(initialIncidentId);
      } else if (!selectedIncidentId && openIncidents.length > 0) {
        setSelectedIncidentId(openIncidents[0].id || openIncidents[0].incident_id || '');
      }
      if (initialTechnicianId) {
        setSelectedTechnicianId(initialTechnicianId);
      }
    }
  }, [isOpen, initialIncidentId, initialTechnicianId, openIncidents.length]);

  // Fetch AI recommendation when selected incident changes
  useEffect(() => {
    if (!selectedIncidentId) {
      setRecommendation(null);
      return;
    }

    let isMounted = true;
    setIsLoadingRecommendation(true);
    setErrorMsg(null);

    api.technicianAssignments.recommend(selectedIncidentId)
      .then(res => {
        if (!isMounted) return;
        setRecommendation(res);
        setSelectedTechnicianId(res.recommended_technician.user_id || res.recommended_technician.id || '');
        setEstimatedHours(res.estimated_repair_hours || 3.0);
        setRequiredTools(res.required_tools || []);
        if (currentIncident?.severity) {
          setPriority(currentIncident.severity);
        }
      })
      .catch(err => {
        if (!isMounted) return;
        console.warn('AI recommendation error:', err);
        // Fallback default
        if (technicians.length > 0) {
          setSelectedTechnicianId(technicians[0].user_id || technicians[0].id || '');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingRecommendation(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedIncidentId]);

  if (!isOpen) return null;

  const handleAddTool = () => {
    if (newToolInput.trim() && !requiredTools.includes(newToolInput.trim())) {
      setRequiredTools([...requiredTools, newToolInput.trim()]);
      setNewToolInput('');
    }
  };

  const handleRemoveTool = (tool: string) => {
    setRequiredTools(requiredTools.filter(t => t !== tool));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentId || !selectedTechnicianId) {
      setErrorMsg('Please select an incident and a technician');
      return;
    }

    const tech = technicians.find(t => t.user_id === selectedTechnicianId || t.id === selectedTechnicianId);

    const payload = {
      incident_id: selectedIncidentId,
      incident_title: currentIncident?.title || 'Factory Incident',
      incident_description: currentIncident?.description || '',
      machine_id: currentIncident?.machine_id || currentMachine?.id || 'M001',
      machine_name: currentMachine?.name || 'Machine Asset',
      machine_code: currentMachine?.machine_id,
      machine_location: currentMachine?.line,
      factory_id: 'FAC-001',
      technician_id: selectedTechnicianId,
      technician_name: tech?.name || 'Assigned Technician',
      technician_email: tech?.email,
      technician_specialisation: tech?.specialisation || 'Mechanical Technician',
      priority,
      due_date: new Date(dueDate).toISOString(),
      estimated_repair_hours: Number(estimatedHours),
      identified_issue: currentIncident?.title,
      root_cause_analysis: currentIncident?.description,
      recommended_resolution: recommendation?.reasoning,
      required_tools: requiredTools,
      spare_parts_required: recommendation?.suggested_spare_parts || [],
      ai_recommendation_details: recommendation ? {
        match_score: recommendation.recommended_percentage,
        reasoning: recommendation.reasoning,
        required_specialisation: recommendation.required_specialisation,
        matched_skills: recommendation.required_skills
      } : undefined
    };

    try {
      setIsSubmitting(true);
      await onAssignSubmit(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create technician assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-700 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                AI-Assisted Technician Incident Assignment
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Match machine faults and required skills with available technician competencies
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Incident Selection */}
          <div>
            <label className="block text-slate-800 font-bold mb-1.5 text-xs uppercase tracking-wider">
              1. Select Incident to Assign
            </label>
            <select
              value={selectedIncidentId}
              onChange={e => setSelectedIncidentId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              {openIncidents.map(inc => (
                <option key={inc.id || inc.incident_id} value={inc.id || inc.incident_id}>
                  [{inc.severity}] {inc.incident_id || inc.id} - {inc.title || inc.description} ({inc.machine_id})
                </option>
              ))}
            </select>
          </div>

          {/* Selected Incident Context Preview */}
          {currentIncident && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    currentIncident.severity === 'Critical'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {currentIncident.severity}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {currentIncident.title}
                  </span>
                </div>
                <p className="text-slate-600 font-medium">
                  {currentIncident.description}
                </p>
              </div>

              {currentMachine && (
                <div className="text-right text-[11px] text-slate-600 font-medium border-l border-slate-200 pl-3">
                  <div className="text-sky-800 font-bold">{currentMachine.name}</div>
                  <div>Line: {currentMachine.line}</div>
                  <div className="font-mono text-slate-500">ID: {currentMachine.machine_id}</div>
                </div>
              )}
            </div>
          )}

          {/* 2. AI Recommendation & Candidate Ranking */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                2. AI Technician Recommendation
              </label>
              {isLoadingRecommendation && (
                <span className="text-indigo-600 animate-pulse text-xs font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 animate-spin" /> Analyzing machine diagnostics & technician workload...
                </span>
              )}
            </div>

            {recommendation && (
              <div className="space-y-3">
                {/* Top Recommended Hero Card */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-white border-2 border-indigo-400 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 border border-indigo-700 flex items-center justify-center text-white font-bold">
                        {(recommendation.recommended_technician.name || 'Technician').split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {recommendation.recommended_technician.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                            ⭐ Top Match
                          </span>
                        </div>
                        <div className="text-slate-600 font-medium text-[11px]">
                          {recommendation.recommended_technician.specialisation} • {recommendation.recommended_technician.experience_years} yrs exp • Shift: {recommendation.recommended_technician.shift}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-mono font-black text-emerald-700">
                        {recommendation.recommended_percentage}%
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Match Score
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 font-medium mt-2 bg-white p-2.5 rounded-lg border border-indigo-200 leading-relaxed">
                    <strong className="text-indigo-900">AI Recommendation Reason:</strong> {recommendation.reasoning}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-200 text-[11px]">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 font-medium">
                        Status:{' '}
                        <strong className={
                          recommendation.recommended_technician.availability_status === 'AVAILABLE'
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }>
                          {recommendation.recommended_technician.availability_status}
                        </strong>
                      </span>
                      <span className="text-slate-600 font-medium">
                        Current Workload:{' '}
                        <strong className="text-slate-900">
                          {recommendation.recommended_technician.current_workload} active tasks
                        </strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTechnicianId(recommendation.recommended_technician.user_id || recommendation.recommended_technician.id || '')}
                      className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        selectedTechnicianId === (recommendation.recommended_technician.user_id || recommendation.recommended_technician.id)
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {selectedTechnicianId === (recommendation.recommended_technician.user_id || recommendation.recommended_technician.id) ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Selected
                        </>
                      ) : (
                        'Select Recommended'
                      )}
                    </button>
                  </div>
                </div>

                {/* Ranked Alternative Technicians List */}
                <div>
                  <span className="text-slate-500 font-bold block mb-2 text-[11px] uppercase tracking-wider">
                    All Available Technicians ({recommendation.all_candidates?.length || technicians.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {recommendation.all_candidates?.map((candidate, idx) => {
                      const isSelected = selectedTechnicianId === (candidate.technician.user_id || candidate.technician.id);
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedTechnicianId(candidate.technician.user_id || candidate.technician.id || '')}
                          className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-500 shadow-xs'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{candidate.technician.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                            </div>
                            <div className="text-[11px] text-slate-600 font-medium">
                              {candidate.technician.specialisation}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 font-medium">
                              <span>Workload: {candidate.technician.current_workload}</span>
                              <span className={candidate.technician.availability_status === 'AVAILABLE' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                                {candidate.technician.availability_status}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900">
                              {candidate.match_percentage}%
                            </span>
                            <div className="text-[9px] text-slate-500 uppercase font-bold">score</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Assignment Parameters Configuration */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <label className="block text-slate-800 font-bold text-xs uppercase tracking-wider">
              3. Configure Assignment & Resources
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Due Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Estimated Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={estimatedHours}
                  onChange={e => setEstimatedHours(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Tools Required Input */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">Required Diagnostic Tools</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newToolInput}
                  onChange={e => setNewToolInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTool())}
                  placeholder="e.g. Torque Wrench 40Nm, Fluke 87V, Dial Indicator..."
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddTool}
                  className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold cursor-pointer"
                >
                  Add Tool
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {requiredTools.map((tool, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 flex items-center gap-1.5 font-mono font-semibold text-[11px]"
                  >
                    <span>{tool}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTool(tool)}
                      className="text-slate-400 hover:text-slate-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Suggested Spare Parts */}
            {recommendation?.suggested_spare_parts && recommendation.suggested_spare_parts.length > 0 && (
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-amber-600" /> Compatible Spare Parts Auto-Identified
                </label>
                <div className="flex flex-wrap gap-2">
                  {recommendation.suggested_spare_parts.map((p, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center gap-2">
                      <div>
                        <div className="font-bold text-slate-900">{p.part_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{p.part_number}</div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.is_in_stock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <span className="text-[11px] text-slate-600 font-medium">
              * The technician will receive this incident card immediately with action prompt.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedIncidentId || !selectedTechnicianId || isSubmitting}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'Assigning...' : 'Approve & Dispatch Assignment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
