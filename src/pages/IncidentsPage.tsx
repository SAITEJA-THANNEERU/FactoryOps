import React, { useState } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { SeverityBadge } from '../components/SeverityBadge.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { CreateIncidentModal } from '../components/CreateIncidentModal.tsx';
import { CreateWorkOrderModal } from '../components/CreateWorkOrderModal.tsx';
import { AlertTriangle, Plus, Trash2, CheckCircle, Wrench } from 'lucide-react';
import type { Incident } from '../types/index.ts';
import { useSearchHighlight } from '../utils/useSearchHighlight.ts';

export const IncidentsPage: React.FC = () => {
  const { incidents, machines, createIncident, updateIncident, deleteIncident, createWorkOrder } = useData();
  const { highlightId, isHighlighted, highlightRef, highlightClass } = useSearchHighlight();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedIncidentForWO, setSelectedIncidentForWO] = useState<Incident | null>(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredIncidents = incidents.filter(i => {
    if (highlightId && (
      (i.incident_id && i.incident_id.toLowerCase().includes(highlightId.toLowerCase())) ||
      (i.id && i.id.toLowerCase().includes(highlightId.toLowerCase())) ||
      (i.machine_id && i.machine_id.toLowerCase().includes(highlightId.toLowerCase())) ||
      (i.title && i.title.toLowerCase().includes(highlightId.toLowerCase()))
    )) {
      return true;
    }
    if (filterSeverity !== 'all' && i.severity.toLowerCase() !== filterSeverity.toLowerCase()) {
      return false;
    }
    return true;
  });

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Closed' ? 'Open' : currentStatus === 'Open' ? 'Investigating' : 'Closed';
    try {
      await updateIncident(id, { status: nextStatus as any });
    } catch (err: any) {
      alert(err.message || 'Failed to update incident status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this incident record from the database?')) return;
    setDeletingId(id);
    try {
      await deleteIncident(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete incident');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Operational Incident Log & Root Cause Triage</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time equipment stoppages, quality deviations, and operator reports
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Report Incident</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Filter Severity:</span>
        {['all', 'critical', 'high', 'medium', 'low'].map(sev => (
          <button
            key={sev}
            onClick={() => setFilterSeverity(sev)}
            className={`px-2.5 py-1 rounded text-xs capitalize font-medium transition-colors cursor-pointer ${
              filterSeverity === sev
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {sev}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900 flex items-center justify-between">
          <span>Incident Reports ({filteredIncidents.length})</span>
          <span className="text-xs font-normal text-slate-500">Persisted in Supabase</span>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold z-10">
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Incident ID</th>
                <th className="py-3 px-4">Machine ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reported By</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Root Cause Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredIncidents.map(inc => {
                const highlighted = isHighlighted(inc.incident_id, inc.id, inc.machine_id, inc.title);
                return (
                  <tr
                    key={inc.id}
                    ref={highlighted ? highlightRef : undefined}
                    className={`transition-colors ${highlighted ? highlightClass : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-emerald-800">{inc.incident_id}</td>
                    <td className="py-3 px-4 font-mono text-slate-800">{inc.machine_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{inc.title}</td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(inc.id, inc.status)}
                        title="Click to cycle status: Open -> Investigating -> Closed"
                        className="cursor-pointer group flex items-center gap-1"
                      >
                        <StatusBadge status={inc.status} size="sm" />
                      </button>
                    </td>
                    <td className="py-3 px-4">{inc.reported_by}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(inc.reported_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-600">{inc.root_cause || 'Under investigation'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedIncidentForWO(inc);
                            setIsConvertModalOpen(true);
                          }}
                          title="Convert Incident to Work Order"
                          className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Wrench className="w-3 h-3 text-emerald-600" />
                          <span>Dispatch WO</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(inc.id, inc.status)}
                          title="Advance status"
                          className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(inc.id)}
                          disabled={deletingId === inc.id}
                          title="Delete incident"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CreateIncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        machines={machines}
        onSubmit={async data => {
          await createIncident(data);
        }}
      />

      <CreateWorkOrderModal
        isOpen={isConvertModalOpen}
        onClose={() => {
          setIsConvertModalOpen(false);
          setSelectedIncidentForWO(null);
        }}
        machines={machines}
        initialIncident={selectedIncidentForWO}
        onSubmit={async data => {
          await createWorkOrder(data);
          if (selectedIncidentForWO) {
            await updateIncident(selectedIncidentForWO.id, { status: 'Investigating' });
          }
        }}
      />
    </div>
  );
};
