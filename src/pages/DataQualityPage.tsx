import React from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { Activity, Download } from 'lucide-react';
import { exportToCsv } from '../utils/exportCsv.ts';

export const DataQualityPage: React.FC = () => {
  const { dataQuality } = useData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <span>IoT Telemetry Data Quality & Sensor Health</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sensor bus uptime, packet completeness, latency metrics, and real-time anomaly detection
          </p>
        </div>
        <button
          onClick={() => exportToCsv('FactoryOps_Sensor_Quality', dataQuality)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors border border-slate-300 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>Export Sensor CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dataQuality.map(sensor => (
          <div key={sensor.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{sensor.sensor_name}</h3>
                <span className="font-mono text-emerald-800 text-xs">Host Machine: {sensor.machine_id}</span>
              </div>
              <StatusBadge status={sensor.status} size="sm" />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-2 rounded-md">
                <span className="text-[10px] text-slate-400 block font-medium">Uptime</span>
                <span className="font-bold text-emerald-700">{sensor.uptime_percentage}%</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-md">
                <span className="text-[10px] text-slate-400 block font-medium">Completeness</span>
                <span className="font-bold text-slate-900">{sensor.data_completeness_pct}%</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-md">
                <span className="text-[10px] text-slate-400 block font-medium">Latency</span>
                <span className="font-bold text-slate-700">{sensor.latency_ms} ms</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Anomalies flagged: {sensor.anomalies_detected}</span>
              <span>Last sync: {sensor.last_sync}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
