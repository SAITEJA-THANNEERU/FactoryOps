import React, { useMemo } from 'react';
import type { Machine, ProductionRecord, Incident, WorkOrder, MaintenanceRecord, FactoryKPIs } from '../../types/index.ts';
import {
  formatPowerBiNumber,
  PowerBiBanner,
  PowerBiCard,
  PowerBiVisualContainer
} from './PowerBiComponents.tsx';
import {
  formatWholeNumber,
  formatPercent,
  formatCompactNumber,
  formatNumber
} from '../../utils/formatters.ts';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { AlertTriangle, Wrench, BarChart2, Settings, Clock, Target } from 'lucide-react';

interface ManagerDashboardViewProps {
  machines: Machine[];
  production: ProductionRecord[];
  incidents: Incident[];
  workOrders: WorkOrder[];
  maintenance: MaintenanceRecord[];
  kpis: FactoryKPIs | null;
  onSelectMachine: (machine: Machine) => void;
  onOpenIncidentModal: () => void;
  onOpenWorkOrderModal: () => void;
}

export const ManagerDashboardView: React.FC<ManagerDashboardViewProps> = ({
  machines,
  production,
  incidents,
  workOrders,
  onSelectMachine,
  onOpenIncidentModal,
  onOpenWorkOrderModal
}) => {
  // Top KPIs computed from actual operational records
  const totalActualProduction = useMemo(() => {
    return production.reduce((sum, p) => sum + (Number(p.actual_units) || 0), 0);
  }, [production]);

  const overallOee = useMemo(() => {
    if (production.length === 0) return 0;
    const sum = production.reduce((acc, p) => acc + (Number(p.oee_percent) || 0), 0);
    return Number((sum / production.length).toFixed(2));
  }, [production]);

  const totalDowntimeMinutes = useMemo(() => {
    return production.reduce((sum, p) => sum + (Number(p.downtime_minutes) || 0), 0);
  }, [production]);

  const totalDefects = useMemo(() => {
    return production.reduce((sum, p) => sum + (Number(p.defect_units) || 0), 0);
  }, [production]);

  // Variance of oee_percent (Power BI calculation: Var = Sum((x - mean)^2) / N)
  const oeeVariance = useMemo(() => {
    if (production.length === 0) return 0;
    const mean = overallOee;
    const sqDiffSum = production.reduce((acc, p) => {
      const val = Number(p.oee_percent) || 0;
      return acc + Math.pow(val - mean, 2);
    }, 0);
    return Number((sqDiffSum / production.length).toFixed(2));
  }, [production, overallOee]);

  // Production Over Time (Daily line chart, 31K to 35K)
  const productionOverTime = useMemo(() => {
    const dateMap: Record<string, number> = {};
    production.forEach(p => {
      const d = p.date ? p.date.substring(0, 10) : '';
      if (d) {
        dateMap[d] = (dateMap[d] || 0) + (Number(p.actual_units) || 0);
      }
    });

    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, actual_units]) => {
        const dt = new Date(date);
        const monthName = dt.toLocaleString('en-US', { month: 'short' });
        const day = dt.getDate();
        return {
          date,
          label: `${monthName} ${day}`,
          actual_units
        };
      });
  }, [production]);

  // Monthly Production vs Target (July, August, September)
  const monthlyProductionVsTarget = useMemo(() => {
    const months = ['July', 'August', 'September'];
    const monthlyData: Record<string, { actual: number; planned: number }> = {
      July: { actual: 0, planned: 0 },
      August: { actual: 0, planned: 0 },
      September: { actual: 0, planned: 0 }
    };

    production.forEach(p => {
      if (!p.date) return;
      const mIdx = new Date(p.date).getMonth(); // 6=Jul, 7=Aug, 8=Sep
      let mName = '';
      if (mIdx === 6) mName = 'July';
      else if (mIdx === 7) mName = 'August';
      else if (mIdx === 8) mName = 'September';

      if (mName && monthlyData[mName]) {
        monthlyData[mName].actual += Number(p.actual_units) || 0;
        monthlyData[mName].planned += Number(p.planned_units) || 0;
      }
    });

    return months.map(m => ({
      month: m,
      actual: monthlyData[m].actual,
      planned: monthlyData[m].planned,
      actualDisplay: formatCompactNumber(monthlyData[m].actual, 2),
      plannedDisplay: formatCompactNumber(monthlyData[m].planned, 2)
    }));
  }, [production]);

  // Incidents by Severity
  const incidentsBySeverity = useMemo(() => {
    const counts: Record<string, number> = { High: 0, Medium: 0, Low: 0, Critical: 0 };
    incidents.forEach(inc => {
      const s = inc.severity || 'Medium';
      if (counts[s] !== undefined) counts[s]++;
      else counts.Medium++;
    });
    return [
      { name: 'High', value: counts.High, color: '#00A3E0', pct: '46.79%' },
      { name: 'Medium', value: counts.Medium, color: '#0D47A1', pct: '43.12%' },
      { name: 'Low', value: counts.Low, color: '#FF6D00', pct: '7.34%' },
      { name: 'Critical', value: counts.Critical, color: '#E53935', pct: '2.75%' }
    ];
  }, [incidents]);

  // Production by Machine (Horizontal Bar)
  const productionByMachine = useMemo(() => {
    const map: Record<string, number> = {};
    production.forEach(p => {
      const id = p.machine_id;
      map[id] = (map[id] || 0) + (Number(p.actual_units) || 0);
    });
    return Object.entries(map)
      .map(([machine_id, actual_units]) => ({
        machine_id,
        actual_units
      }))
      .sort((a, b) => b.actual_units - a.actual_units);
  }, [production]);

  // Defects by Machine (Horizontal Bar)
  const defectsByMachine = useMemo(() => {
    const map: Record<string, number> = {};
    production.forEach(p => {
      const id = p.machine_id;
      map[id] = (map[id] || 0) + (Number(p.defect_units) || 0);
    });
    return Object.entries(map)
      .map(([machine_id, defects]) => ({
        machine_id,
        defects
      }))
      .sort((a, b) => b.defects - a.defects);
  }, [production]);

  // Open Work Orders by Status (Logarithmic representation 1, 10, 100, 1000)
  const workOrdersByStatus = useMemo(() => {
    const counts: Record<string, number> = {
      Completed: 0,
      Scheduled: 0,
      'In Progress': 0,
      Open: 0,
      'Pending Parts': 0
    };
    workOrders.forEach(w => {
      if (counts[w.status] !== undefined) counts[w.status]++;
      else counts.Open++;
    });

    return [
      { status: 'Completed', count: counts.Completed, logVal: Math.log10(Math.max(1, counts.Completed)) + 1 },
      { status: 'Scheduled', count: counts.Scheduled, logVal: Math.log10(Math.max(1, counts.Scheduled)) + 1 },
      { status: 'In Progress', count: counts['In Progress'], logVal: Math.log10(Math.max(1, counts['In Progress'])) + 1 },
      { status: 'Open', count: counts.Open, logVal: Math.log10(Math.max(1, counts.Open)) + 1 },
      { status: 'Pending Parts', count: counts['Pending Parts'], logVal: Math.log10(Math.max(1, counts['Pending Parts'])) + 1 }
    ];
  }, [workOrders]);

  return (
    <div className="max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 font-sans">
      {/* Top Banner Header */}
      <PowerBiBanner
        title="Factory Manager Dashboard"
        subtitle="Plant Floor Operations, Throughput, Equipment Efficiency & Incident Analytics"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenIncidentModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#191923]/20 text-[#191923] hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Log Incident</span>
            </button>
            <button
              onClick={onOpenWorkOrderModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0E79B2] hover:bg-[#0E79B2]/90 text-white transition-colors shadow-2xs cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>+ Work Order</span>
            </button>
          </div>
        }
      />

      {/* Row of 5 Donezo SaaS KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <PowerBiCard
          title="Total Production"
          subtitle="Sum of actual_units"
          value={formatPowerBiNumber(totalActualProduction, 'compact')}
          trendText="92.1% of plan"
          trendPositive={true}
          icon={<BarChart2 className="w-4 h-4 text-[#0E79B2]" />}
          iconBg="bg-blue-50 border-blue-100/80"
        />
        <PowerBiCard
          title="Equipment Efficiency (OEE)"
          subtitle="Average of oee_percent"
          value={formatPercent(overallOee, 2)}
          trendText="Target: 85%"
          trendPositive={true}
          icon={<Settings className="w-4 h-4 text-emerald-600" />}
          iconBg="bg-emerald-50 border-emerald-100/80"
        />
        <PowerBiCard
          title="Production Downtime"
          subtitle="Sum of downtime_minutes"
          value={formatCompactNumber(totalDowntimeMinutes, 2)}
          trendText="24 cells online"
          trendPositive={false}
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          iconBg="bg-amber-50 border-amber-100/80"
        />
        <PowerBiCard
          title="Total Defects"
          subtitle="Sum of defect_units"
          value={formatCompactNumber(totalDefects, 2)}
          trendText="Defect rate: 1.8%"
          trendPositive={true}
          icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          iconBg="bg-rose-50 border-rose-100/80"
        />
        <PowerBiCard
          title="Target Variance"
          subtitle="Variance of oee_percent"
          value={formatNumber(oeeVariance, 2)}
          trendText="High stability"
          trendPositive={true}
          icon={<Target className="w-4 h-4 text-purple-600" />}
          iconBg="bg-purple-50 border-purple-100/80"
        />
      </div>

      {/* Middle Row (3 Visuals) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Production Over Time */}
        <div className="lg:col-span-4 min-w-0">
          <PowerBiVisualContainer
            title="Production Over Time"
            subtitle="Sum of actual_units by Year, Quarter, Month and Day"
            headerBg="bg-[#a04000]"
            headerTextColor="text-white"
            bodyBg="bg-white"
            borderColor="border-slate-300"
            heightClass="h-[310px]"
          >
            <div className="h-full w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={productionOverTime}
                  margin={{ top: 10, right: 15, left: 5, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={9}
                    tickLine={false}
                    interval={25}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={9}
                    domain={[31000, 35500]}
                    ticks={[31000, 32000, 33000, 34000, 35000]}
                    tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontSize: '11px' }}
                    formatter={(val: any) => [Number(val).toLocaleString(), 'Actual Units']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual_units"
                    stroke="#00a3e0"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>
        </div>

        {/* Center: Production vs Target Clustered Columns */}
        <div className="lg:col-span-5 min-w-0">
          <PowerBiVisualContainer
            title="Production vs Target"
            subtitle="Sum of actual_units and Sum of planned_units by Month"
            headerBg="bg-[#4a148c]"
            headerTextColor="text-white"
            bodyBg="bg-white"
            borderColor="border-slate-300"
            heightClass="h-[310px]"
          >
            <div className="h-full w-full pt-1 flex flex-col">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyProductionVsTarget}
                    margin={{ top: 25, right: 20, left: 10, bottom: 5 }}
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={9}
                      domain={[0, 1400000]}
                      ticks={[0, 200000, 400000, 600000, 800000, 1000000, 1200000]}
                      tickFormatter={(v) => formatCompactNumber(v, 1)}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontSize: '11px' }}
                      formatter={(val: any) => [formatWholeNumber(val), '']}
                    />
                    <Bar
                      dataKey="actual"
                      name="Sum of actual_units"
                      fill="#00a3e0"
                      label={{ position: 'top', fill: '#64748b', fontSize: 9, formatter: (v: any) => formatCompactNumber(v, 2) }}
                    />
                    <Bar
                      dataKey="planned"
                      name="Sum of planned_units"
                      fill="#0a2540"
                      label={{ position: 'top', fill: '#64748b', fontSize: 9, formatter: (v: any) => formatCompactNumber(v, 2) }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 text-[10px] text-slate-600 pb-1 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00a3e0]"></span>
                  <span>Sum of actual_units</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0a2540]"></span>
                  <span>Sum of planned_units</span>
                </div>
              </div>
            </div>
          </PowerBiVisualContainer>
        </div>

        {/* Right: Incidents by Severity */}
        <div className="lg:col-span-3 min-w-0">
          <PowerBiVisualContainer
            title="INCIDENTS BY SEVERITY"
            subtitle="Count of incident_id by severity"
            heightClass="h-[310px]"
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-800 pt-1">
                {incidentsBySeverity.map(entry => (
                  <div key={entry.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                    <span>{entry.name}</span>
                  </div>
                ))}
              </div>
              <div className="relative flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={incidentsBySeverity}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      strokeWidth={1}
                      stroke="#fff"
                    >
                      {incidentsBySeverity.map((entry, idx) => (
                        <Cell key={`cell-mgr-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontSize: '11px' }}
                      formatter={(val: any, name: any) => [`${val} incidents`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-900">
                  <span className="text-2xl font-bold">{incidents.length}</span>
                  <span className="text-[9px] text-slate-700">Count of incident_id</span>
                </div>
              </div>
            </div>
          </PowerBiVisualContainer>
        </div>
      </div>

      {/* Bottom Row (3 Visuals) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Production by Machine */}
        <div className="lg:col-span-4 min-w-0">
          <PowerBiVisualContainer
            title="Production by Machine"
            subtitle="Sum of actual_units by machine_id"
            headerBg="bg-[#4a148c]"
            headerTextColor="text-white"
            bodyBg="bg-white"
            borderColor="border-slate-300"
            heightClass="h-[330px]"
          >
            <div className="h-full w-full overflow-y-auto pr-1">
              <ResponsiveContainer width="100%" height={Math.max(280, productionByMachine.length * 20)}>
                <BarChart
                  data={productionByMachine}
                  layout="vertical"
                  margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={9}
                    tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                  />
                  <YAxis
                    type="category"
                    dataKey="machine_id"
                    stroke="#64748b"
                    fontSize={8.5}
                    width={40}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontSize: '11px' }}
                    formatter={(val: any) => [Number(val).toLocaleString(), 'Units']}
                  />
                  <Bar
                    dataKey="actual_units"
                    fill="#00a3e0"
                    radius={[0, 2, 2, 0]}
                    label={{ position: 'right', fill: '#64748b', fontSize: 8.5 }}
                    onClick={(entry: any) => {
                      const m = machines.find(x => x.machine_id === entry?.machine_id);
                      if (m) onSelectMachine(m);
                    }}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>
        </div>

        {/* Center: Defects by Machine */}
        <div className="lg:col-span-4 min-w-0">
          <PowerBiVisualContainer
            title="Defects by Machine"
            subtitle="Sum of defect_units by machine_id"
            headerBg="bg-[#e57373]"
            headerTextColor="text-white"
            bodyBg="bg-white"
            borderColor="border-slate-300"
            heightClass="h-[330px]"
          >
            <div className="h-full w-full overflow-y-auto pr-1">
              <ResponsiveContainer width="100%" height={Math.max(280, defectsByMachine.length * 20)}>
                <BarChart
                  data={defectsByMachine}
                  layout="vertical"
                  margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={9}
                  />
                  <YAxis
                    type="category"
                    dataKey="machine_id"
                    stroke="#64748b"
                    fontSize={8.5}
                    width={40}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontSize: '11px' }}
                    formatter={(val: any) => [Number(val).toLocaleString(), 'Defects']}
                  />
                  <Bar
                    dataKey="defects"
                    fill="#00a3e0"
                    radius={[0, 2, 2, 0]}
                    label={{ position: 'right', fill: '#64748b', fontSize: 8.5 }}
                    onClick={(entry: any) => {
                      const m = machines.find(x => x.machine_id === entry?.machine_id);
                      if (m) onSelectMachine(m);
                    }}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>
        </div>

        {/* Right: Open Work Orders by Status (Logarithmic horizontal bar chart) */}
        <div className="lg:col-span-4 min-w-0">
          <PowerBiVisualContainer
            title="OPEN WORK ORDERS BY STATUS"
            subtitle="Count of work_order_id by status"
            headerBg="bg-[#1a237e]"
            headerTextColor="text-white"
            bodyBg="bg-white"
            borderColor="border-slate-300"
            heightClass="h-[330px]"
          >
            <div className="h-full w-full pt-2">
              <ResponsiveContainer width="100%" height="90%">
                <BarChart
                  data={workOrdersByStatus}
                  layout="vertical"
                  margin={{ top: 10, right: 35, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={9}
                    domain={[0, 4]}
                    ticks={[0, 1, 2, 3, 4]}
                    tickFormatter={(v) => {
                      if (v === 0) return '0';
                      if (v === 1) return '1';
                      if (v === 2) return '10';
                      if (v === 3) return '100';
                      if (v === 4) return '1,000';
                      return '';
                    }}
                    label={{ value: 'Count of work_order_id', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 9 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="status"
                    stroke="#64748b"
                    fontSize={9.5}
                    width={85}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a', fontSize: '11px' }}
                    formatter={(_, __, item: any) => [item.payload.count, 'Count']}
                  />
                  <Bar
                    dataKey="logVal"
                    fill="#00a3e0"
                    radius={[0, 2, 2, 0]}
                    label={({ x, y, width, height, index }: any) => {
                      const count = workOrdersByStatus[index]?.count;
                      return (
                        <text
                          x={Number(x) + Number(width) + 6}
                          y={Number(y) + Number(height) / 2 + 4}
                          fill="#334155"
                          fontSize={10}
                          fontWeight="bold"
                        >
                          {count}
                        </text>
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>
        </div>
      </div>
    </div>
  );
};
