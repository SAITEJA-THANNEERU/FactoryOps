import React from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { Activity } from 'lucide-react';

export const OperationsPage: React.FC = () => {
  const { machines } = useData();
  const lines = Array.from(new Set(machines.map(m => m.line))).filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-600" />
          <span>Real-Time Plant Operations & Line Coordination</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Live floor synchronization, active operator rosters, and line throughput
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {lines.map(lineName => {
          const lineMachines = machines.filter(m => m.line === lineName);
          const runningCount = lineMachines.filter(m => m.status === 'running').length;
          const warningCount = lineMachines.filter(m => m.status === 'warning').length;
          const maintCount = lineMachines.filter(m => m.status === 'maintenance').length;
          const avgLineOee = Math.round(
            lineMachines.reduce((acc, m) => acc + m.oee, 0) / (lineMachines.length || 1)
          );

          return (
            <div key={lineName} className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{lineName}</h3>
                  <span className="text-[11px] text-slate-500">{lineMachines.length} Connected Cells</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Line OEE</span>
                  <span className="text-base font-bold text-emerald-800">{avgLineOee}%</span>
                </div>
              </div>

              <div className="space-y-2">
                {lineMachines.map(m => (
                  <div key={m.id} className="p-2.5 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono text-emerald-800 font-bold">{m.machine_id}</div>
                      <div className="text-[11px] text-slate-600 font-medium">{m.name}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${m.status === 'running' ? 'text-emerald-700' : m.status === 'warning' ? 'text-amber-700' : 'text-rose-700'}`}>
                        {m.status.toUpperCase()}
                      </div>
                      <div className="text-[10px] text-slate-400">{m.operator}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-medium">{runningCount} Running</span>
                <span className="text-amber-700 font-medium">{warningCount} Warning</span>
                <span className="text-rose-700 font-medium">{maintCount} Maintenance</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
