import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { SystemAuditLog } from '../types';
import { ShieldCheck, RefreshCw, Search, Clock, User, Activity, Filter } from 'lucide-react';

export const SystemAuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('All');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.auditLogs.getAll();
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to fetch system audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const entities = ['All', 'Machine', 'Production', 'WorkOrder', 'Incident', 'SparePart', 'User', 'Attendance'];

  const filteredLogs = logs.filter(l => {
    const matchesEntity = selectedEntity === 'All' || l.entity_type === selectedEntity;
    const matchesSearch =
      l.user_name.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      (l.entity_id && l.entity_id.toLowerCase().includes(search.toLowerCase()));
    return matchesEntity && matchesSearch;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            System Audit Trail & Security Mutation Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of state changes, user edits, machine threshold overrides, and personnel activities
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, user or details..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {entities.map(ent => (
            <button
              key={ent}
              onClick={() => setSelectedEntity(ent)}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedEntity === ent
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {ent}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          Loading audit records...
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs">
          No audit log entries found matching criteria.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">User / Role</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Log Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="font-bold text-slate-900">{log.user_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{log.user_role}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-indigo-700 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-800 leading-relaxed">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
