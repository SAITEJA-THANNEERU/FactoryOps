import React from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { BarChart3 } from 'lucide-react';
import { formatPercent } from '../utils/formatters.ts';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const { kpis, machines } = useData();

  const machineChartData = machines.map(m => ({
    name: m.machine_id,
    oee: m.oee,
    health: m.health_score,
    temp: m.temperature_c
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600" />
          <span>Operational Efficiency & OEE Decomposition</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Comprehensive breakdown of Availability, Performance, and Quality factors
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5 text-center shadow-xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Availability Factor</span>
          <div className="text-3xl font-bold text-slate-900 mt-2">{formatPercent(kpis?.availability ?? 93.4, 2)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Uptime vs Planned Schedule</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5 text-center shadow-xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Performance Factor</span>
          <div className="text-3xl font-bold text-slate-900 mt-2">{formatPercent(kpis?.performance ?? 96.2, 2)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Operating Speed vs Nameplate</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5 text-center shadow-xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Quality Factor</span>
          <div className="text-3xl font-bold text-emerald-700 mt-2">{formatPercent(kpis?.quality ?? 98.9, 2)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Conforming Parts Ratio</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Equipment OEE & Health Distribution</h2>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={machineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="oee" name="OEE %" fill="#059669" radius={[3, 3, 0, 0]} />
              <Bar dataKey="health" name="Health Score %" fill="#0284c7" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
