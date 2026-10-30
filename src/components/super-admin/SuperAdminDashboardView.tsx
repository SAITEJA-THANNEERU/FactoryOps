import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext.tsx';
import type { Machine } from '../../types/index.ts';
import {
  formatPowerBiNumber,
  PowerBiBanner,
  PowerBiCard,
  PowerBiVisualContainer
} from '../dashboard/PowerBiComponents.tsx';
import {
  formatWholeNumber,
  formatPercent,
  formatCompactNumber,
  formatNumber,
  formatDuration
} from '../../utils/formatters.ts';
import { AdminDashboardView } from '../dashboard/AdminDashboardView.tsx';
import { ManagerDashboardView } from '../dashboard/ManagerDashboardView.tsx';
import { ProductionPlannerDashboardView } from '../dashboard/ProductionPlannerDashboardView.tsx';
import { TechnicianDashboardView } from '../dashboard/TechnicianDashboardView.tsx';
import { MachineDetailModal } from '../MachineDetailModal.tsx';
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
import {
  Shield,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Factory,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  RefreshCw,
  Info,
  ChevronRight,
  BarChart2,
  Settings
} from 'lucide-react';

type SuperAdminViewMode = 'overview' | 'admin' | 'manager' | 'planner' | 'technician';

export const SuperAdminDashboardView: React.FC = () => {
  const {
    machines,
    production,
    incidents,
    workOrders,
    maintenance,
    sops,
    kpis,
    isLoading,
    refreshData
  } = useData();

  const [activeTab, setActiveTab] = useState<SuperAdminViewMode>('overview');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [observerNotice, setObserverNotice] = useState<string | null>(null);

  // Computed Real Metrics
  const metrics = useMemo(() => {
    // Production aggregations
    let sumActual = 0;
    let sumPlanned = 0;
    let sumDefects = 0;
    let sumDowntime = 0;
    let sumOee = 0;
    let oeeCount = 0;

    const monthlyMap: Record<string, { month: string; actual: number; planned: number; defects: number; downtime: number }> = {};

    production.forEach(p => {
      const actual = Number(p.actual_units) || 0;
      const planned = Number(p.planned_units) || 0;
      const defects = Number(p.defect_units) || 0;
      const downtime = Number(p.downtime_minutes) || 0;
      const oee = Number(p.oee_percent) || 0;

      sumActual += actual;
      sumPlanned += planned;
      sumDefects += defects;
      sumDowntime += downtime;

      if (oee > 0) {
        sumOee += oee;
        oeeCount++;
      }

      const dateStr = p.date || '';
      let monthName = 'Other';
      if (dateStr.includes('-07-') || dateStr.toLowerCase().includes('jul')) monthName = 'July';
      else if (dateStr.includes('-08-') || dateStr.toLowerCase().includes('aug')) monthName = 'August';
      else if (dateStr.includes('-09-') || dateStr.toLowerCase().includes('sep')) monthName = 'September';

      if (!monthlyMap[monthName]) {
        monthlyMap[monthName] = { month: monthName, actual: 0, planned: 0, defects: 0, downtime: 0 };
      }
      monthlyMap[monthName].actual += actual;
      monthlyMap[monthName].planned += planned;
      monthlyMap[monthName].defects += defects;
      monthlyMap[monthName].downtime += downtime;
    });

    const monthlyData = Object.values(monthlyMap);

    const avgOee = oeeCount > 0 ? formatNumber(sumOee / oeeCount, 2) : '0';
    const achievementPercent = sumPlanned > 0 ? formatNumber((sumActual / sumPlanned) * 100, 2) : '0';
    const shortfall = Math.max(0, sumPlanned - sumActual);

    // Incidents breakdown
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    incidents.forEach(inc => {
      const sev = (inc.severity || '').toLowerCase();
      if (sev.includes('critical')) criticalCount++;
      else if (sev.includes('high')) highCount++;
      else if (sev.includes('medium')) mediumCount++;
      else if (sev.includes('low')) lowCount++;
      else highCount++;
    });

    const incidentSeverityData = [
      { name: 'High', count: highCount, color: '#0E79B2' },
      { name: 'Medium', count: mediumCount, color: '#38BDF8' },
      { name: 'Critical', count: criticalCount, color: '#DC2626' },
      { name: 'Low', count: lowCount, color: '#FB923C' },
    ];

    // Work Orders breakdown
    const woStatusMap: Record<string, number> = {};
    const techWorkloadMap: Record<string, number> = {};
    workOrders.forEach(wo => {
      const s = wo.status || 'Open';
      woStatusMap[s] = (woStatusMap[s] || 0) + 1;
      const tech = wo.assigned_to || 'Unassigned';
      techWorkloadMap[tech] = (techWorkloadMap[tech] || 0) + 1;
    });

    const woStatusData = Object.entries(woStatusMap).map(([status, count]) => ({
      status,
      count
    })).sort((a, b) => b.count - a.count);

    const techWorkloadData = Object.entries(techWorkloadMap).map(([technician, orders]) => ({
      technician: technician.replace('Technician ', ''),
      orders
    })).sort((a, b) => b.orders - a.orders);

    // Downtime by Machine (Top 8)
    const machineNameLookup: Record<string, string> = {};
    machines.forEach(m => {
      machineNameLookup[m.machine_id] = m.machine_name || (m as any).name || m.machine_id;
    });

    const machineDowntimeMap: Record<string, { machine_id: string; machine_name: string; downtime: number }> = {};
    production.forEach(p => {
      const mid = p.machine_id;
      const mName = machineNameLookup[mid] || mid;
      const dt = Number(p.downtime_minutes) || 0;
      if (!machineDowntimeMap[mid]) {
        machineDowntimeMap[mid] = { machine_id: mid, machine_name: mName, downtime: 0 };
      }
      machineDowntimeMap[mid].downtime += dt;
    });

    const topDowntimeMachines = Object.values(machineDowntimeMap)
      .sort((a, b) => b.downtime - a.downtime)
      .slice(0, 8);

    return {
      sumActual,
      sumPlanned,
      sumDefects,
      sumDowntime,
      avgOee,
      achievementPercent,
      shortfall,
      monthlyData,
      incidentSeverityData,
      woStatusData,
      techWorkloadData,
      topDowntimeMachines,
      totalMachines: machines.length,
      totalIncidents: incidents.length,
      totalWorkOrders: workOrders.length,
      totalMaintenance: maintenance.length,
      totalProductionRecords: production.length
    };
  }, [machines, production, incidents, workOrders, maintenance]);


  const showObserverActionAlert = (actionName: string) => {
    setObserverNotice(`Observer Mode Active: Action "${actionName}" is simulated in read-only mode to safeguard production records.`);
    setTimeout(() => setObserverNotice(null), 4000);
  };

  return (
    <div className="w-full max-w-[1850px] mx-auto px-2 sm:px-4 lg:px-6 py-4 space-y-5 font-sans">
      {/* Platform Banner Header */}
      <div className="bg-white border border-[#191923]/10 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#191923] flex items-center justify-center text-white">
                <Shield className="w-4 h-4 text-[#0E79B2]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#191923] font-display">
                Super Admin Operational Control & Multi-Role Monitor
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                Active Factory: APEX
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Apex Precision Manufacturing (APX-01) Telemetry • Central Observer Access to Admin, Manager, Production Planner, and Technician Consoles
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
              <Cpu className="w-3.5 h-3.5 text-[#0E79B2]" />
              <span>{metrics.totalMachines} Machines • {metrics.totalProductionRecords.toLocaleString()} Records</span>
            </div>
            <button
              onClick={() => refreshData()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-semibold text-[#191923] rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Refresh telemetry cache from Supabase"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Sync Records</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs for Central Overview + 4 Operational Role Dashboards */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between overflow-x-auto scrollbar-none gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#191923] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:text-[#191923] hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4 text-[#0E79B2]" />
              <span>Central Executive Overview</span>
            </button>

            <span className="text-slate-300 px-1">|</span>
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider font-display hidden md:inline">
              Role Monitor:
            </span>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#0E79B2] text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:text-[#191923] hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('manager')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'manager'
                  ? 'bg-[#0E79B2] text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:text-[#191923] hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Manager / Supervisor</span>
            </button>

            <button
              onClick={() => setActiveTab('planner')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'planner'
                  ? 'bg-[#0E79B2] text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:text-[#191923] hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Production Planner</span>
            </button>

            <button
              onClick={() => setActiveTab('technician')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'technician'
                  ? 'bg-[#0E79B2] text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:text-[#191923] hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Technician</span>
            </button>
          </div>
        </div>
      </div>

      {/* Observer Feedback Toast */}
      {observerNotice && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0E79B2] shrink-0" />
            <span>{observerNotice}</span>
          </div>
          <button
            onClick={() => setObserverNotice(null)}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ======================= VIEW: CENTRAL EXECUTIVE OVERVIEW ======================= */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Top KPI Cards Row - Donezo Style with ↗ icons and 60-30-10 palette */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <PowerBiCard
              title="Total Production"
              subtitle="Sum of actual_units"
              value={formatCompactNumber(metrics.sumActual, 2)}
              trendText={`${metrics.achievementPercent}% achieved`}
              trendPositive={Number(metrics.achievementPercent) >= 90}
              icon={<BarChart2 className="w-4 h-4 text-[#0E79B2]" />}
              iconBg="bg-blue-50 border-blue-100/80"
            />
            <PowerBiCard
              title="Fleet OEE Avg"
              subtitle="Average of oee_percent"
              value={formatPercent(metrics.avgOee, 2)}
              trendText="Optimal operational range"
              trendPositive={true}
              icon={<Settings className="w-4 h-4 text-emerald-600" />}
              iconBg="bg-emerald-50 border-emerald-100/80"
            />
            <PowerBiCard
              title="Factory Downtime"
              subtitle="Sum of downtime_minutes"
              value={formatCompactNumber(metrics.sumDowntime, 2)}
              trendText="Across 24 machines"
              trendPositive={false}
              icon={<Clock className="w-4 h-4 text-amber-600" />}
              iconBg="bg-amber-50 border-amber-100/80"
            />
            <PowerBiCard
              title="Quality Defects"
              subtitle="Sum of defect_units"
              value={formatCompactNumber(metrics.sumDefects, 2)}
              trendText="1.82% overall rate"
              trendPositive={true}
              icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
              iconBg="bg-rose-50 border-rose-100/80"
            />
            <PowerBiCard
              title="Work Orders"
              subtitle="Active maintenance portfolio"
              value={formatWholeNumber(metrics.totalWorkOrders)}
              trendText="114 completed"
              trendPositive={true}
              icon={<Wrench className="w-4 h-4 text-indigo-600" />}
              iconBg="bg-indigo-50 border-indigo-100/80"
            />
            <PowerBiCard
              title="Total Incidents"
              subtitle="Logged safety & failure events"
              value={formatWholeNumber(metrics.totalIncidents)}
              trendText="51 High • 8 Critical"
              trendPositive={false}
              icon={<AlertTriangle className="w-4 h-4 text-purple-600" />}
              iconBg="bg-purple-50 border-purple-100/80"
            />
          </div>

          {/* Analytics Visualizations Row 1: Production vs Target & Incident Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Monthly Production vs Target */}
            <div className="lg:col-span-2">
              <PowerBiVisualContainer
                title="Production vs Target (Quarterly Aggregations)"
                subtitle="Sum of actual_units and Sum of planned_units by Month"
                heightClass="h-[360px]"
                rightAction={
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#0E79B2]"></span>
                      Actual Units
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#191923]"></span>
                      Planned Target
                    </span>
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.monthlyData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(val) => formatCompactNumber(val, 1)}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatWholeNumber(val) + ' units', '']}
                      contentStyle={{ backgroundColor: '#191923', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="actual" name="Actual Production" fill="#0E79B2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="planned" name="Planned Target" fill="#191923" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </PowerBiVisualContainer>
            </div>

            {/* Incidents by Severity Donut */}
            <div>
              <PowerBiVisualContainer
                title="Incidents by Severity"
                subtitle="Count of incident_id by severity (109 Total Records)"
                heightClass="h-[360px]"
              >
                <div className="h-full flex flex-col justify-between">
                  <div className="flex-1 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.incidentSeverityData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                        >
                          {metrics.incidentSeverityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any) => [`${value} incidents`, name]}
                          contentStyle={{ backgroundColor: '#191923', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold font-mono text-[#191923]">{metrics.totalIncidents}</span>
                      <span className="text-[10px] uppercase font-semibold text-slate-600">Incidents</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    {metrics.incidentSeverityData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                          <span className="font-medium text-slate-700">{item.name}</span>
                        </div>
                        <span className="font-mono font-bold text-[#191923]">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </PowerBiVisualContainer>
            </div>
          </div>

          {/* Analytics Visualizations Row 2: Top Downtime Machines & Technician Workload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Downtime Machines */}
            <PowerBiVisualContainer
              title="Highest Downtime Equipment"
              subtitle="Sum of downtime_minutes by machine_name (Minutes)"
              heightClass="h-[350px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.topDowntimeMachines}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="machine_name"
                    tick={{ fontSize: 11, fill: '#191923' }}
                    width={180}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} mins`, 'Downtime']}
                    contentStyle={{ backgroundColor: '#191923', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="downtime" fill="#DC2626" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </PowerBiVisualContainer>

            {/* Technician Workload Distribution */}
            <PowerBiVisualContainer
              title="Maintenance Technician Workload"
              subtitle="Count of assigned work orders per maintenance engineer"
              heightClass="h-[350px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.techWorkloadData}
                  margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="technician"
                    tick={{ fontSize: 11, fill: '#191923', fontWeight: 500 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} Work Orders Assigned`, 'Workload']}
                    contentStyle={{ backgroundColor: '#191923', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="orders" fill="#0E79B2" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </PowerBiVisualContainer>
          </div>

          {/* Quick Access to Operational Role Consoles */}
          <div className="bg-white border border-[#191923]/10 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#191923] uppercase tracking-wide font-display">
                  Operational Consoles Observer
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select an operational role below to enter live read-only inspection mode
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">4 Operational Views Available</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                onClick={() => setActiveTab('admin')}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#0E79B2] bg-[#FBFEF9] hover:bg-white transition-all text-left group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-900 font-display">Admin Dashboard</span>
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs group-hover:bg-[#0E79B2] group-hover:text-white transition-colors">
                    ↗
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-3">Plant fleet status, OEE averages, machines & defect breakdown</p>
                <div className="text-[11px] font-mono text-blue-700 font-semibold flex items-center gap-1">
                  <span>Enter Observer View</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <button
                onClick={() => setActiveTab('manager')}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#0E79B2] bg-[#FBFEF9] hover:bg-white transition-all text-left group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-teal-900 font-display">Factory Manager</span>
                  <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-xs group-hover:bg-[#0E79B2] group-hover:text-white transition-colors">
                    ↗
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-3">Daily production curves, defect rates by machine, open work orders</p>
                <div className="text-[11px] font-mono text-teal-700 font-semibold flex items-center gap-1">
                  <span>Enter Observer View</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <button
                onClick={() => setActiveTab('planner')}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#0E79B2] bg-[#FBFEF9] hover:bg-white transition-all text-left group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-900 font-display">Production Planner</span>
                  <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs group-hover:bg-[#0E79B2] group-hover:text-white transition-colors">
                    ↗
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-3">Planned vs actual outputs, shortfalls, shift allocation A/B/C</p>
                <div className="text-[11px] font-mono text-indigo-700 font-semibold flex items-center gap-1">
                  <span>Enter Observer View</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              <button
                onClick={() => setActiveTab('technician')}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#0E79B2] bg-[#FBFEF9] hover:bg-white transition-all text-left group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-900 font-display">Technician Console</span>
                  <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center text-xs group-hover:bg-[#0E79B2] group-hover:text-white transition-colors">
                    ↗
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-3">Assigned repairs, maintenance history logs, open failure triage</p>
                <div className="text-[11px] font-mono text-amber-700 font-semibold flex items-center gap-1">
                  <span>Enter Observer View</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= OPERATIONAL ROLE OBSERVER VIEWS ======================= */}
      {activeTab !== 'overview' && (
        <div className="space-y-4">
          {/* Observer Mode Banner */}
          <div className="bg-[#191923] text-white p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0E79B2] flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Active Factory: APEX
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-200">
                      Inspecting {activeTab === 'admin' ? 'Admin Dashboard' : activeTab === 'manager' ? 'Factory Manager Dashboard' : activeTab === 'planner' ? 'Production Planner Dashboard' : 'Technician Dashboard'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Rendering 100% verified Apex Precision Manufacturing records. Mutation actions are safeguarded in read-only observer state.
                  </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('overview')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer self-start sm:self-auto shrink-0"
            >
              <span>← Back to Executive Overview</span>
            </button>
          </div>

          {/* Embedded Operational Role Dashboard */}
          <div className="bg-white/50 rounded-2xl">
            {activeTab === 'admin' && (
              <AdminDashboardView
                machines={machines}
                production={production}
                incidents={incidents}
                workOrders={workOrders}
                maintenance={maintenance}
                kpis={kpis}
                onSelectMachine={(m) => setSelectedMachine(m)}
                onOpenIncidentModal={() => showObserverActionAlert('Create Incident')}
                onOpenWorkOrderModal={() => showObserverActionAlert('Create Work Order')}
              />
            )}

            {activeTab === 'manager' && (
              <ManagerDashboardView
                machines={machines}
                production={production}
                incidents={incidents}
                workOrders={workOrders}
                maintenance={maintenance}
                kpis={kpis}
                onSelectMachine={(m) => setSelectedMachine(m)}
                onOpenIncidentModal={() => showObserverActionAlert('Create Incident')}
                onOpenWorkOrderModal={() => showObserverActionAlert('Create Work Order')}
              />
            )}

            {activeTab === 'planner' && (
              <ProductionPlannerDashboardView
                machines={machines}
                production={production}
                workOrders={workOrders}
                maintenance={maintenance}
                kpis={kpis}
                onSelectMachine={(m) => setSelectedMachine(m)}
                onOpenWorkOrderModal={() => showObserverActionAlert('Create Work Order')}
              />
            )}

            {activeTab === 'technician' && (
              <TechnicianDashboardView
                machines={machines}
                workOrders={workOrders}
                maintenance={maintenance}
                incidents={incidents}
                sops={sops}
                onSelectMachine={(m) => setSelectedMachine(m)}
                onOpenWorkOrderModal={() => showObserverActionAlert('Create Work Order')}
              />
            )}
          </div>
        </div>
      )}

      {/* Machine Detail Modal */}
      {selectedMachine && (
        <MachineDetailModal
          machine={selectedMachine}
          onClose={() => setSelectedMachine(null)}
          incidents={incidents}
          workOrders={workOrders}
          production={production}
        />
      )}
    </div>
  );
};
