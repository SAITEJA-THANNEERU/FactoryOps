import React from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { CheckCircle2 } from 'lucide-react';
import {
  formatWholeNumber,
  formatPercent,
  formatScrap
} from '../utils/formatters.ts';

export const QualityPage: React.FC = () => {
  const { kpis, production } = useData();

  const totalDefects = production.reduce((acc, p) => acc + p.defective_units, 0);
  const totalScrapKg = production.reduce((acc, p) => acc + p.scrap_kg, 0);
  const fpy = kpis?.quality ?? 98.8;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Quality Assurance & Defect Tracking</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          First-Pass Yield (FPY), defect classification, scrap generation, and compliance
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">First-Pass Yield</span>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{formatPercent(fpy, 2)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Defective Units</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{formatWholeNumber(totalDefects)} units</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Cumulative Scrap</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{formatScrap(totalScrapKg)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Inspection Pass Rate</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">99.4%</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Defect Distribution by Machine</h2>
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold z-10">
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-3">Machine ID</th>
                <th className="py-2.5 px-3">Shift</th>
                <th className="py-2.5 px-3">Defective Units</th>
                <th className="py-2.5 px-3">Scrap (kg)</th>
                <th className="py-2.5 px-3">Yield Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {production.slice(0, 15).map(p => {
                const yieldRate = p.actual_units > 0
                  ? ((p.actual_units - p.defective_units) / p.actual_units) * 100
                  : 100;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-emerald-800 font-semibold">{p.machine_id}</td>
                    <td className="py-2.5 px-3">{p.shift}</td>
                    <td className="py-2.5 px-3 text-rose-600 font-semibold">{formatWholeNumber(p.defective_units)}</td>
                    <td className="py-2.5 px-3">{formatScrap(p.scrap_kg)}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">{formatPercent(yieldRate, 1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
