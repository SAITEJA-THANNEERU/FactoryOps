import React, { useState, useMemo } from 'react';
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
  Cell
} from 'recharts';
import { Plus, Wrench, AlertTriangle, Cpu, BarChart2, Settings, Clock, Layers } from 'lucide-react';

interface AdminDashboardViewProps {
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

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  machines,
  production,
  incidents,
  workOrders,
  onSelectMachine,
  onOpenIncidentModal,
  onOpenWorkOrderModal
}) => {
  // Machine Slicer filter state: '--' means All
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('--');

  // Filtered operational records
  const filteredMachines = useMemo(() => {
    if (selectedMachineFilter === '--') return machines;
    return machines.filter(m => m.name === selectedMachineFilter || m.machine_id === selectedMachineFilter);
  }, [machines, selectedMachineFilter]);

  const filteredMachineIds = useMemo(() => new Set(filteredMachines.map(m => m.machine_id)), [filteredMachines]);

  const filteredProduction = useMemo(() => {
    if (selectedMachineFilter === '--') return production;
    return production.filter(p => filteredMachineIds.has(p.machine_id));
  }, [production, filteredMachineIds, selectedMachineFilter]);

  const filteredIncidents = useMemo(() => {
    if (selectedMachineFilter === '--') return incidents;
    return incidents.filter(i => filteredMachineIds.has(i.machine_id));
  }, [incidents, filteredMachineIds, selectedMachineFilter]);

  const filteredWorkOrders = useMemo(() => {
    if (selectedMachineFilter === '--') return workOrders;
    return workOrders.filter(w => filteredMachineIds.has(w.machine_id));
  }, [workOrders, filteredMachineIds, selectedMachineFilter]);

  // Top 5 KPI Metrics computed from actual operational records
  const totalMachinesCount = filteredMachines.length;
  
  const totalActualProduction = useMemo(() => {
    return filteredProduction.reduce((sum, p) => sum + (Number(p.actual_units) || 0), 0);
  }, [filteredProduction]);

  const overallOee = useMemo(() => {
    if (filteredProduction.length === 0) return 0;
    const sum = filteredProduction.reduce((acc, p) => acc + (Number(p.oee_percent) || 0), 0);
    return Number((sum / filteredProduction.length).toFixed(2));
  }, [filteredProduction]);

  const totalDefects = useMemo(() => {
    return filteredProduction.reduce((sum, p) => sum + (Number(p.defect_units) || 0), 0);
  }, [filteredProduction]);

  const totalDowntimeMinutes = useMemo(() => {
    return filteredProduction.reduce((sum, p) => sum + (Number(p.downtime_minutes) || 0), 0);
  }, [filteredProduction]);

  // Machine status distribution (Donut 1)
  const statusDistribution = useMemo(() => {
    const activeCount = filteredMachines.filter(m => m.status === 'Active' || !m.status).length;
    const maintenanceCount = filteredMachines.filter(m => m.status === 'Maintenance').length;
    const offlineCount = filteredMachines.filter(m => m.status === 'Offline').length;
    return [
      { name: 'Active', value: activeCount || filteredMachines.length, color: '#00B0FF' },
      ...(maintenanceCount > 0 ? [{ name: 'Maintenance', value: maintenanceCount, color: '#F59E0B' }] : []),
      ...(offlineCount > 0 ? [{ name: 'Offline', value: offlineCount, color: '#EF4444' }] : [])
    ];
  }, [filteredMachines]);

  // Incidents by Severity (Donut 2)
  const incidentsBySeverity = useMemo(() => {
    const counts: Record<string, number> = { High: 0, Medium: 0, Low: 0, Critical: 0 };
    filteredIncidents.forEach(inc => {
      const sev = inc.severity || 'Medium';
      if (counts[sev] !== undefined) counts[sev]++;
      else counts['Medium']++;
    });
    return [
      { name: 'High', value: counts.High, color: '#0091EA', pct: '46.79%' },
      { name: 'Medium', value: counts.Medium, color: '#0D47A1', pct: '43.12%' },
      { name: 'Low', value: counts.Low, color: '#FF6D00', pct: '7.34%' },
      { name: 'Critical', value: counts.Critical, color: '#D50000', pct: '2.75%' }
    ].filter(item => item.value > 0 || selectedMachineFilter === '--');
  }, [filteredIncidents, selectedMachineFilter]);

  // Work Orders by Status (Horizontal Bar)
  const workOrdersByStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {
      Completed: 0,
      Scheduled: 0,
      'In Progress': 0,
      Open: 0,
      'Pending Parts': 0
    };
    filteredWorkOrders.forEach(w => {
      const s = w.status;
      if (s === 'Completed') statusCounts.Completed++;
      else if (s === 'Scheduled') statusCounts.Scheduled++;
      else if (s === 'In Progress') statusCounts['In Progress']++;
      else if (s === 'Open') statusCounts.Open++;
      else if (s === 'Pending Parts') statusCounts['Pending Parts']++;
      else statusCounts.Open++;
    });

    return [
      { status: 'Completed', count: statusCounts.Completed },
      { status: 'Scheduled', count: statusCounts.Scheduled },
      { status: 'In Progress', count: statusCounts['In Progress'] },
      { status: 'Open', count: statusCounts.Open },
      { status: 'Pending Parts', count: statusCounts['Pending Parts'] }
    ];
  }, [filteredWorkOrders]);

  // Production by Machine (Horizontal Bar, descending)
  const productionByMachine = useMemo(() => {
    const map: Record<string, number> = {};
    production.forEach(p => {
      const id = p.machine_id;
      map[id] = (map[id] || 0) + (Number(p.actual_units) || 0);
    });
    return Object.entries(map)
      .map(([machine_id, actual_units]) => ({
        machine_id,
        actual_units,
        displayUnits: `${Math.round(actual_units / 1000)}K`
      }))
      .sort((a, b) => b.actual_units - a.actual_units);
  }, [production]);

  // Defects by Machine (Horizontal Bar, descending)
  const defectsByMachine = useMemo(() => {
    const map: Record<string, number> = {};
    production.forEach(p => {
      const id = p.machine_id;
      map[id] = (map[id] || 0) + (Number(p.defect_units) || 0);
    });
    return Object.entries(map)
      .map(([machine_id, defects]) => ({
        machine_id,
        defects,
        displayDefects: defects.toLocaleString()
      }))
      .sort((a, b) => b.defects - a.defects);
  }, [production]);

  // Production Over Time (Daily line chart)
  const productionOverTime = useMemo(() => {
    const dateMap: Record<string, number> = {};
    filteredProduction.forEach(p => {
      const d = p.date ? p.date.substring(0, 10) : '';
      if (d) {
        dateMap[d] = (dateMap[d] || 0) + (Number(p.actual_units) || 0);
      }
    });

    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, actual_units]) => {
        // Format label for display
        const dt = new Date(date);
        const monthName = dt.toLocaleString('en-US', { month: 'short' });
        const day = dt.getDate();
        return {
          date,
          label: `${monthName} ${day}`,
          actual_units,
          kUnits: formatCompactNumber(actual_units, 1)
        };
      });
  }, [filteredProduction]);

  return (
    <div className="max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 font-sans text-[#191923]">
      {/* Top Banner Header */}
      <PowerBiBanner
        title="Admin Operations Dashboard"
        subtitle="Global Machine Telemetry, Total Production Throughput & Asset Utilization"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenIncidentModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#191923]/20 text-[#191923] hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>New Incident</span>
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

      {/* Row of 5 Donezo KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <PowerBiCard
          title="TOTAL MACHINES"
          subtitle="Count of machine_id"
          value={formatWholeNumber(totalMachinesCount)}
          trendText="100% operational"
          trendPositive={true}
          icon={<Cpu className="w-4 h-4 text-[#0E79B2]" />}
          iconBg="bg-blue-50 border-blue-100/80"
        />
        <PowerBiCard
          title="TOTAL PRODUCTION"
          subtitle="Sum of actual_units"
          value={formatCompactNumber(totalActualProduction, 2)}
          trendText="Across all active lines"
          trendPositive={true}
          icon={<BarChart2 className="w-4 h-4 text-[#0E79B2]" />}
          iconBg="bg-blue-50 border-blue-100/80"
        />
        <PowerBiCard
          title="OVERALL OEE"
          subtitle="Average of oee_percent"
          value={formatPercent(overallOee, 2)}
          trendText="Target: 85%"
          trendPositive={true}
          icon={<Settings className="w-4 h-4 text-emerald-600" />}
          iconBg="bg-emerald-50 border-emerald-100/80"
        />
        <PowerBiCard
          title="TOTAL DEFECTS"
          subtitle="Sum of defect_units"
          value={formatCompactNumber(totalDefects, 2)}
          trendText="1.8% defect rate"
          trendPositive={true}
          icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          iconBg="bg-rose-50 border-rose-100/80"
        />
        <PowerBiCard
          title="TOTAL DOWNTIME"
          subtitle="Sum of downtime_minutes"
          value={formatPowerBiNumber(totalDowntimeMinutes, 'indian_lakhs')}
          trendText="Minutes logged"
          trendPositive={false}
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          iconBg="bg-amber-50 border-amber-100/80"
        />
      </div>

      {/* Active Filter Pill Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-[#191923]/10 text-xs shadow-2xs">
        <div className="flex items-center gap-2 text-slate-500">
          <span className="font-bold text-[#191923]">Active Machine Filter:</span>
          <span className="px-2.5 py-1 rounded-md bg-[#0E79B2]/10 text-[#0E79B2] font-mono font-semibold border border-[#0E79B2]/20">
            {selectedMachineFilter === '--' ? 'All Machines (24)' : selectedMachineFilter}
          </span>
        </div>
        {selectedMachineFilter !== '--' && (
          <button
            onClick={() => setSelectedMachineFilter('--')}
            className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* 3 Columns Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Slicer + Status Donut + Severity Donut */}
        <div className="lg:col-span-3 min-w-0 space-y-4">
          {/* machine_name Slicer Box */}
          <div className="bg-white rounded-xl border border-[#191923]/10 p-4 shadow-xs">
            <div className="font-bold text-xs uppercase tracking-wider text-[#191923] mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Filter Machine</span>
              <span className="text-[10px] text-slate-400 font-normal">24 units</span>
            </div>
            <div className="max-h-[190px] overflow-y-auto space-y-1.5 pr-1 text-xs text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer hover:text-[#0E79B2] transition-colors p-1 rounded hover:bg-slate-50">
                <input
                  type="radio"
                  name="machine_slicer"
                  checked={selectedMachineFilter === '--'}
                  onChange={() => setSelectedMachineFilter('--')}
                  className="accent-[#0E79B2] cursor-pointer"
                />
                <span className="font-semibold text-slate-900">All Machines (--)</span>
              </label>
              {machines.map(m => (
                <label
                  key={m.machine_id}
                  className="flex items-center gap-2 cursor-pointer hover:text-[#0E79B2] transition-colors truncate p-1 rounded hover:bg-slate-50"
                  title={`${m.name} (${m.machine_id})`}
                >
                  <input
                    type="radio"
                    name="machine_slicer"
                    checked={selectedMachineFilter === m.name}
                    onClick={() => setSelectedMachineFilter(prev => prev === m.name ? '--' : m.name)}
                    onChange={() => {}}
                    className="accent-[#0E79B2] cursor-pointer shrink-0"
                  />
                  <span className="truncate">{m.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status of Machines Donut */}
          <PowerBiVisualContainer
            title="Status of Machines"
            subtitle="Count of machine_id by status"
            heightClass="h-[230px]"
          >
            <div className="h-full flex items-center justify-between">
              <div className="relative w-36 h-36 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={62}
                      strokeWidth={1}
                      stroke="#fff"
                    >
                      {statusDistribution.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                      formatter={(val: any) => [`${val} (${Math.round((Number(val) / totalMachinesCount) * 100)}%)`, 'Count']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-[#191923]">
                  <span className="text-2xl font-bold font-mono">{totalMachinesCount}</span>
                </div>
              </div>
              <div className="text-[11px] space-y-1.5 pr-3 text-slate-600">
                {statusDistribution.map(item => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="font-semibold">{item.name}</span>
                  </div>
                ))}
                <div className="text-[10px] text-slate-400 pt-1 font-mono">
                  {totalMachinesCount} (100%)
                </div>
              </div>
            </div>
          </PowerBiVisualContainer>

          {/* Incidents by Severity Donut */}
          <PowerBiVisualContainer
            title="Incidents by Severity"
            subtitle="Count of incident_id and Sum of downtime_minutes by severity"
            heightClass="h-[250px]"
          >
            <div className="h-full flex items-center justify-between">
              <div className="relative w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incidentsBySeverity}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={68}
                      strokeWidth={1}
                      stroke="#fff"
                    >
                      {incidentsBySeverity.map((entry, idx) => (
                        <Cell key={`sev-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                      formatter={(val: any, name: any) => [`${val} incidents`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-[#191923]">
                  <span className="text-2xl font-bold font-mono">{filteredIncidents.length}</span>
                </div>
              </div>
              <div className="text-[10.5px] space-y-1.5 pr-2 text-slate-600 flex-1 pl-2">
                {incidentsBySeverity.map(item => (
                  <div key={item.name} className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[10px]">
                      {item.value} ({item.pct})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </PowerBiVisualContainer>
        </div>

        {/* Middle Column: Work Orders by Status */}
        <div className="lg:col-span-4 min-w-0 space-y-4">
          <PowerBiVisualContainer
            title="Work Orders by Status"
            subtitle="Count of work_order_id and priority status"
            heightClass="h-[325px]"
          >
            <div className="h-full w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={workOrdersByStatus}
                  layout="vertical"
                  margin={{ top: 10, right: 35, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={10}
                    domain={[0, 120]}
                    ticks={[0, 20, 40, 60, 80, 100, 120]}
                    label={{ value: 'Count of work_order_id', position: 'insideBottom', offset: -15, fill: '#64748b', fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="status"
                    stroke="#64748b"
                    fontSize={10}
                    width={80}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                    formatter={(val: any) => [val, 'Count']}
                  />
                  <Bar dataKey="count" fill="#0E79B2" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#191923', fontSize: 11, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>

          {/* Second Stacked Work Orders card */}
          <PowerBiVisualContainer
            title="Work Order Execution Queue"
            subtitle="Scheduled, In Progress & Open Work Orders"
            heightClass="h-[325px]"
          >
            <div className="h-full w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={workOrdersByStatus}
                  layout="vertical"
                  margin={{ top: 10, right: 35, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={10}
                    domain={[0, 120]}
                    ticks={[0, 20, 40, 60, 80, 100, 120]}
                    label={{ value: 'Count of work_order_id', position: 'insideBottom', offset: -15, fill: '#64748b', fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="status"
                    stroke="#64748b"
                    fontSize={10}
                    width={80}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                    formatter={(val: any) => [val, 'Count']}
                  />
                  <Bar dataKey="count" fill="#191923" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#191923', fontSize: 11, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>
        </div>

        {/* Right Column: Production by Machine + Defects by Machine + Production Over Time */}
        <div className="lg:col-span-5 min-w-0 space-y-4">
          {/* Production by Machine */}
          <PowerBiVisualContainer
            title="Production by Machine"
            subtitle="Sum of actual_units and Sum of good_units by machine_id"
            heightClass="h-[215px]"
          >
            <div className="h-full w-full overflow-y-auto pr-1">
              <ResponsiveContainer width="100%" height={Math.max(260, productionByMachine.length * 24)}>
                <BarChart
                  data={productionByMachine}
                  layout="vertical"
                  margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={9}
                    tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                  />
                  <YAxis
                    type="category"
                    dataKey="machine_id"
                    stroke="#64748b"
                    fontSize={9}
                    width={40}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                    formatter={(val: any) => [Number(val).toLocaleString(), 'Actual Units']}
                  />
                  <Bar
                    dataKey="actual_units"
                    fill="#0E79B2"
                    radius={[0, 4, 4, 0]}
                    label={{ position: 'right', fill: '#64748b', fontSize: 9 }}
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

          {/* Defects by Machine */}
          <PowerBiVisualContainer
            title="Defects by Machine"
            subtitle="Sum of defect_units and Sum of actual_units by machine_id"
            heightClass="h-[215px]"
          >
            <div className="h-full w-full overflow-y-auto pr-1">
              <ResponsiveContainer width="100%" height={Math.max(260, defectsByMachine.length * 24)}>
                <BarChart
                  data={defectsByMachine}
                  layout="vertical"
                  margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={9}
                  />
                  <YAxis
                    type="category"
                    dataKey="machine_id"
                    stroke="#64748b"
                    fontSize={9}
                    width={40}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                    formatter={(val: any) => [Number(val).toLocaleString(), 'Defects']}
                  />
                  <Bar
                    dataKey="defects"
                    fill="#EF4444"
                    radius={[0, 4, 4, 0]}
                    label={{ position: 'right', fill: '#64748b', fontSize: 9 }}
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

          {/* Production Over Time Line Chart */}
          <PowerBiVisualContainer
            title="Production Over Time"
            subtitle="Sum of actual_units by date"
            heightClass="h-[220px]"
          >
            <div className="h-full w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={productionOverTime}
                  margin={{ top: 10, right: 15, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={9}
                    tickLine={false}
                    interval={20}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={9}
                    domain={[31000, 35500]}
                    ticks={[31000, 32000, 33000, 34000, 35000]}
                    tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                    label={{ value: 'Actual Units', angle: -90, position: 'insideLeft', offset: 0, fill: '#64748b', fontSize: 9 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                    formatter={(val: any) => [Number(val).toLocaleString(), 'Units']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual_units"
                    stroke="#0E79B2"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>
        </div>
      </div>
    </div>
  );
};
