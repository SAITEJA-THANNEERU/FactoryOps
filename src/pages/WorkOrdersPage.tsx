import React, { useState } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { CreateWorkOrderModal } from '../components/CreateWorkOrderModal.tsx';
import { formatDuration } from '../utils/formatters.ts';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';
import { useSearchHighlight } from '../utils/useSearchHighlight.ts';

export const WorkOrdersPage: React.FC = () => {
  const { workOrders, machines, createWorkOrder, updateWorkOrder, deleteWorkOrder } = useData();
  const { isHighlighted, highlightRef, highlightClass } = useSearchHighlight();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, newStatus: any) => {
    try {
      await updateWorkOrder(id, { status: newStatus });
    } catch (err: any) {
      alert(err.message || 'Failed to update work order');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this work order permanently?')) return;
    setDeletingId(id);
    try {
      await deleteWorkOrder(id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete work order');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
            <span>Maintenance Work Orders & Dispatching</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active technician assignments, parts requisitions, and completion sign-offs
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Work Order</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900 flex items-center justify-between">
          <span>Work Orders ({workOrders.length})</span>
          <span className="text-xs font-normal text-slate-500">Persisted in Supabase</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">WO ID</th>
                <th className="py-3 px-4">Machine ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Technician</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Est. Hours</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {workOrders.map(wo => {
                const highlighted = isHighlighted(wo.work_order_id, wo.id, wo.machine_id, wo.title, wo.assigned_to);
                return (
                  <tr
                    key={wo.id}
                    ref={highlighted ? highlightRef : undefined}
                    className={`transition-colors ${highlighted ? highlightClass : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-emerald-800">{wo.work_order_id}</td>
                    <td className="py-3 px-4 font-mono text-slate-800">{wo.machine_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{wo.title}</td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={wo.priority} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={wo.status} size="sm" />
                    </td>
                    <td className="py-3 px-4">{wo.assigned_to}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{wo.due_date}</td>
                    <td className="py-3 px-4">{formatDuration(wo.estimated_hours, 'h')}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={wo.status}
                          onChange={e => handleStatusChange(wo.id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-md px-2 py-1 focus:outline-hidden focus:border-emerald-600"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => handleDelete(wo.id)}
                          disabled={deletingId === wo.id}
                          title="Delete work order"
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

      <CreateWorkOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        machines={machines}
        onSubmit={async data => {
          await createWorkOrder(data);
        }}
      />
    </div>
  );
};
