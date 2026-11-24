import React, { useState } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import type { SOP } from '../types/index.ts';
import { BookOpen, ShieldAlert, Search, CheckSquare, Square, CheckCircle, Award, FileText } from 'lucide-react';
import { api } from '../services/api.ts';

export const SOPsPage: React.FC = () => {
  const { sops } = useData();
  const { user } = useAuth();
  const [selectedSop, setSelectedSop] = useState<SOP | null>(sops[0] || null);
  const [search, setSearch] = useState('');
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<number>>>({});
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [signedOffSops, setSignedOffSops] = useState<Record<string, { technician: string; notes: string; timestamp: string }>>({});
  const [technicianName, setTechnicianName] = useState(user?.name || '');
  const [signOffNotes, setSignOffNotes] = useState('');

  const filteredSops = sops.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.machine_type.toLowerCase().includes(q);
  });

  const toggleStep = (sopId: string, stepIndex: number) => {
    setCompletedSteps(prev => {
      const currentSet = new Set(prev[sopId] || []);
      if (currentSet.has(stepIndex)) {
        currentSet.delete(stepIndex);
      } else {
        currentSet.add(stepIndex);
      }
      return { ...prev, [sopId]: currentSet };
    });
  };

  const getSopProgress = (sop: SOP) => {
    const set = completedSteps[sop.id] || new Set();
    const total = sop.steps.length;
    const count = set.size;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return { count, total, pct };
  };

  const handleSignOffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSop) return;

    const nowIso = new Date().toLocaleString();
    setSignedOffSops(prev => ({
      ...prev,
      [selectedSop.id]: {
        technician: technicianName || user?.name || 'Authorized Tech',
        notes: signOffNotes || 'Procedure executed per standard SOP compliance.',
        timestamp: nowIso
      }
    }));

    setIsSignOffModalOpen(false);
    setSignOffNotes('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <span>Interactive Standard Operating Procedures (SOP)</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Step-by-step interactive checklist execution, progress tracking, and formal technician sign-off
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: SOP list */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search procedures..."
              className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-emerald-600"
            />
          </div>

          <div className="space-y-2">
            {filteredSops.map(sop => {
              const isSelected = selectedSop?.id === sop.id;
              const { pct } = getSopProgress(sop);
              const isSigned = !!signedOffSops[sop.id];

              return (
                <div
                  key={sop.id}
                  onClick={() => setSelectedSop(sop)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono font-bold text-emerald-800">{sop.sop_id}</span>
                    <span className="text-slate-400">{sop.version}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{sop.title}</h4>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 text-[10px]">
                    <span className="text-slate-500">{sop.machine_type}</span>
                    {isSigned ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" /> Signed Off
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono font-semibold">{pct}% Done</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected SOP Interactive Reader */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
          {selectedSop ? (
            <div className="space-y-5">
              <div className="border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedSop.category}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{selectedSop.sop_id} • {selectedSop.version}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedSop.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                  <span>Target: <strong className="text-slate-700">{selectedSop.target_audience}</strong></span>
                  <span>Author: <strong className="text-slate-700">{selectedSop.author}</strong></span>
                  <span>Updated: <strong className="text-slate-700">{selectedSop.last_updated}</strong></span>
                </div>
              </div>

              {/* Progress Bar & Interactive Checklist Status */}
              {(() => {
                const { count, total, pct } = getSopProgress(selectedSop);
                const isSigned = !!signedOffSops[selectedSop.id];
                const signData = signedOffSops[selectedSop.id];

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                      <span>Procedure Step Completion Tracker</span>
                      <span className="font-mono text-emerald-700">{count} of {total} steps verified ({pct}%)</span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          pct === 100 ? 'bg-emerald-600' : pct > 0 ? 'bg-indigo-500' : 'bg-slate-300'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {isSigned ? (
                      <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-between text-xs text-emerald-900">
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <div className="font-bold">Procedure Fully Executed & Signed Off</div>
                            <div className="text-[11px] text-emerald-700">
                              Technician: <strong>{signData.technician}</strong> • {signData.timestamp}
                            </div>
                            {signData.notes && (
                              <div className="text-[11px] text-emerald-800 italic mt-0.5">"{signData.notes}"</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      pct === 100 && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => setIsSignOffModalOpen(true)}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Sign Off & Record Completion</span>
                          </button>
                        </div>
                      )
                    )}
                  </div>
                );
              })()}

              {/* Safety Precautions Box */}
              <div className="p-4 rounded-md bg-rose-50 border border-rose-200">
                <h3 className="text-xs font-bold text-rose-800 flex items-center gap-1.5 mb-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Mandatory Safety Precautions</span>
                </h3>
                <ul className="list-disc list-inside space-y-1 text-xs text-rose-900">
                  {selectedSop.safety_precautions.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>

              {/* Interactive Step-by-Step Instructions */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Interactive Step-by-Step Execution</span>
                  <span className="text-[11px] font-normal text-slate-500">Click checkboxes as you perform each step</span>
                </h3>

                <div className="space-y-2.5">
                  {selectedSop.steps.map((step, idx) => {
                    const stepSet = completedSteps[selectedSop.id] || new Set();
                    const isChecked = stepSet.has(idx);

                    return (
                      <div
                        key={idx}
                        onClick={() => toggleStep(selectedSop.id, idx)}
                        className={`flex gap-3 text-xs p-3 rounded-md border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 text-slate-900'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <button type="button" className="mt-0.5 text-slate-400 shrink-0 focus:outline-none">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-bold text-[11px] text-slate-500">Step {idx + 1}</span>
                            {isChecked && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                Verified Complete
                              </span>
                            )}
                          </div>
                          <p className={`leading-relaxed ${isChecked ? 'line-through text-slate-600' : 'text-slate-800'}`}>
                            {step}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Select an SOP document from the left list to read.
            </div>
          )}
        </div>
      </div>

      {/* Technician Sign-Off Modal */}
      {isSignOffModalOpen && selectedSop && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 text-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Technician Execution Sign-Off</h2>
                  <p className="text-xs text-slate-500">{selectedSop.sop_id} - {selectedSop.title}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSignOffSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Technician / Inspector Name *</label>
                <input
                  type="text"
                  required
                  value={technicianName}
                  onChange={e => setTechnicianName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Sign-Off Remarks & Calibration Notes</label>
                <textarea
                  rows={3}
                  value={signOffNotes}
                  onChange={e => setSignOffNotes(e.target.value)}
                  placeholder="Record step outcome, tool offsets, or torque verification notes..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-900 focus:outline-none focus:border-emerald-600 placeholder-slate-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSignOffModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Sign-Off</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default SOPsPage;
