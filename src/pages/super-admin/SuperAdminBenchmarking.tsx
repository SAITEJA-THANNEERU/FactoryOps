import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import type { Factory, FactoryKPIs } from '../../types/index.ts';
import {
  BarChart3,
  TrendingUp,
  Gauge,
  AlertTriangle,
  Wrench,
  Download,
  RefreshCw,
  Award
} from 'lucide-react';
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
import {
  formatDuration,
  formatPercent,
  formatWholeNumber
} from '../../utils/formatters.ts';

export const SuperAdminBenchmarkingPage: React.FC = () => {
  const [factories, setFactories] = useState<(Factory & { kpis: FactoryKPIs })[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [metricTab, setMetricTab] = useState<'oee' | 'production' | 'downtime' | 'incidents'>('oee');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const overview = await api.superAdmin.getOverview();
      setFactories(overview.factories);
    } catch (err) {
      console.error('Failed to load benchmarking data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const chartData = factories.map(f => ({
    name: f.name.replace(' Precision Manufacturing', '').replace(' Industrial Systems', '').replace(' Auto Components', '').replace(' Manufacturing', '').replace(' Industrial Works', ''),
    code: f.factory_code,
    oee: f.kpis.oee,
    availability: f.kpis.availability,
    performance: f.kpis.performance,
    quality: f.kpis.quality,
    productionK: Math.round(f.kpis.total_production_units / 1000),
    downtime: f.kpis.downtime_hours,
    incidents: f.kpis.active_incidents,
    workOrders: f.kpis.open_work_orders,
    defectRate: f.kpis.defect_rate_pct
  }));

  const exportBenchmarkCsv = () => {
    const headers = ['Factory,Location,OEE (%),Availability (%),Performance (%),Quality (%),Production (Units),Downtime (Hours),Defect Rate (%),Active Incidents,Work Orders'];
    const rows = factories.map(f =>
      `"${f.name}","${f.location}",${f.kpis.oee},${f.kpis.availability},${f.kpis.performance},${f.kpis.quality},${f.kpis.total_production_units},${f.kpis.downtime_hours},${f.kpis.defect_rate_pct},${f.kpis.active_incidents},${f.kpis.open_work_orders}`
    );
    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factoryops-benchmarking-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Computing Benchmarking Analytics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Plant Benchmarking Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-plant comparative analysis across OEE factors, volume throughput, downtime, and quality variance
          </p>
        </div>

        <button
          onClick={exportBenchmarkCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Benchmark Data</span>
        </button>
      </div>

      {/* Chart Selector Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Comparative Factory Performance</h2>
            <p className="text-xs text-slate-500">Select dimension to visualize comparative variance</p>
          </div>

          <div className="flex space-x-1 bg-slate-100 p-1 rounded-md text-xs">
            <button
              onClick={() => setMetricTab('oee')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                metricTab === 'oee' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              OEE Factors
            </button>
            <button
              onClick={() => setMetricTab('production')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                metricTab === 'production' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Production Output
            </button>
            <button
              onClick={() => setMetricTab('downtime')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                metricTab === 'downtime' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Downtime & Defects
            </button>
            <button
              onClick={() => setMetricTab('incidents')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                metricTab === 'incidents' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Incidents & Work Orders
            </button>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {metricTab === 'oee' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" domain={[60, 100]} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="oee" name="OEE %" fill="#059669" radius={[3, 3, 0, 0]} />
                <Bar dataKey="availability" name="Availability %" fill="#0284c7" radius={[3, 3, 0, 0]} />
                <Bar dataKey="quality" name="Quality %" fill="#d97706" radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : metricTab === 'production' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="productionK" name="Output (x1,000 units)" fill="#0f172a" radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : metricTab === 'downtime' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="downtime" name="Cumulative Downtime (Hours)" fill="#e11d48" radius={[3, 3, 0, 0]} />
                <Bar dataKey="defectRate" name="Defect Rate %" fill="#d97706" radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="incidents" name="Active Incidents" fill="#d97706" radius={[3, 3, 0, 0]} />
                <Bar dataKey="workOrders" name="Open Work Orders" fill="#0284c7" radius={[3, 3, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cross-Plant Benchmark Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Benchmark Metrics Summary Matrix</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Plant</th>
                <th className="py-3 px-4">OEE</th>
                <th className="py-3 px-4">Availability</th>
                <th className="py-3 px-4">Performance</th>
                <th className="py-3 px-4">Quality</th>
                <th className="py-3 px-4">Total Production</th>
                <th className="py-3 px-4">Downtime</th>
                <th className="py-3 px-4">Defect Rate</th>
                <th className="py-3 px-4">Active Incidents</th>
                <th className="py-3 px-4">Work Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {factories.map(f => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900">{f.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono block">{f.id}</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-800">{formatPercent(f.kpis.oee, 2)}</td>
                  <td className="py-3 px-4">{formatPercent(f.kpis.availability, 2)}</td>
                  <td className="py-3 px-4">{formatPercent(f.kpis.performance, 2)}</td>
                  <td className="py-3 px-4">{formatPercent(f.kpis.quality, 2)}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {formatWholeNumber(f.kpis.total_production_units)}
                  </td>
                  <td className="py-3 px-4 text-rose-700 font-medium">{formatDuration(f.kpis.downtime_hours, 'h')}</td>
                  <td className="py-3 px-4 text-amber-700">{formatPercent(f.kpis.defect_rate_pct, 2)}</td>
                  <td className="py-3 px-4 font-semibold">{formatWholeNumber(f.kpis.active_incidents)}</td>
                  <td className="py-3 px-4">{formatWholeNumber(f.kpis.open_work_orders)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
