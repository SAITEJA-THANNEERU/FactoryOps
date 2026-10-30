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
  Cell,
  Legend
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
  // Defect Rate Period Filter: 'all' | '2026-07' | '2026-08' | '2026-09'
  const [defectPeriodFilter, setDefectPeriodFilter] = useState<'all' | '2026-07' | '2026-08' | '2026-09'>('all');
  // Priority queue toggle: 'pending' (pending workload only) vs 'all' (all work orders)
  const [priorityQueueMode, setPriorityQueueMode] = useState<'pending' | 'all'>('pending');

  // Enforce unique Apex registered machines (24 unique registered units)
  const uniqueApexMachines = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach(m => {
      const id = m.machine_id || m.id;
      if (id && !map.has(id)) {
        map.set(id, m);
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.machine_id || a.id).localeCompare(b.machine_id || b.id));
  }, [machines]);

  const machineNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    uniqueApexMachines.forEach(m => {
      const id = m.machine_id || m.id;
      map[id] = m.name || m.machine_name || id;
    });
    return map;
  }, [uniqueApexMachines]);

  // Filtered operational records
  const filteredMachines = useMemo(() => {
    if (selectedMachineFilter === '--') return uniqueApexMachines;
    return uniqueApexMachines.filter(m => {
      const id = m.machine_id || m.id;
      const name = m.name || m.machine_name;
      return name === selectedMachineFilter || id === selectedMachineFilter;
    });
  }, [uniqueApexMachines, selectedMachineFilter]);

  const filteredMachineIds = useMemo(() => new Set(filteredMachines.map(m => m.machine_id || m.id)), [filteredMachines]);

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
  const totalRegisteredCount = uniqueApexMachines.length;
  const totalTelemetryCount = filteredProduction.length;
  
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

  // Machine status distribution (Donut 1 - based on unique registered machines)
  const statusDistribution = useMemo(() => {
    let activeCount = 0;
    let maintenanceCount = 0;
    let faultedCount = 0;
    let offlineCount = 0;

    filteredMachines.forEach(m => {
      const s = (m.status || '').toLowerCase();
      if (s === 'maintenance') maintenanceCount++;
      else if (s === 'warning' || s === 'faulted') faultedCount++;
      else if (s === 'offline' || s === 'inactive') offlineCount++;
      else activeCount++; // 'running', 'active', 'operational'
    });

    const total = filteredMachines.length || 1;
    return [
      { name: 'Active', value: activeCount, color: '#00B0FF', pct: `${Math.round((activeCount / total) * 100)}%` },
      ...(maintenanceCount > 0 ? [{ name: 'Maintenance', value: maintenanceCount, color: '#F59E0B', pct: `${Math.round((maintenanceCount / total) * 100)}%` }] : []),
      ...(faultedCount > 0 ? [{ name: 'Faulted', value: faultedCount, color: '#EF4444', pct: `${Math.round((faultedCount / total) * 100)}%` }] : []),
      ...(offlineCount > 0 ? [{ name: 'Offline', value: offlineCount, color: '#64748B', pct: `${Math.round((offlineCount / total) * 100)}%` }] : [])
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
    const total = filteredIncidents.length || 1;
    return [
      { name: 'High', value: counts.High, color: '#0091EA', pct: `${((counts.High / total) * 100).toFixed(1)}%` },
      { name: 'Medium', value: counts.Medium, color: '#0D47A1', pct: `${((counts.Medium / total) * 100).toFixed(1)}%` },
      { name: 'Low', value: counts.Low, color: '#FF6D00', pct: `${((counts.Low / total) * 100).toFixed(1)}%` },
      { name: 'Critical', value: counts.Critical, color: '#D50000', pct: `${((counts.Critical / total) * 100).toFixed(1)}%` }
    ].filter(item => item.value > 0 || selectedMachineFilter === '--');
  }, [filteredIncidents, selectedMachineFilter]);

  // 1. Work Orders by Status: Overall status distribution of all work orders
  const workOrdersByStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    filteredWorkOrders.forEach(w => {
      const s = w.status || 'Open';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const total = filteredWorkOrders.length || 1;
    const colorMap: Record<string, string> = {
      Completed: '#10B981',
      Scheduled: '#3B82F6',
      'In Progress': '#0E79B2',
      'Pending Parts': '#F59E0B',
      Open: '#EF4444',
      Cancelled: '#94A3B8'
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      pct: `${((count / total) * 100).toFixed(1)}%`,
      color: colorMap[status] || '#64748B'
    })).sort((a, b) => b.count - a.count);
  }, [filteredWorkOrders]);

  // 2. Work Order Priority & Execution Queue: Priority-based maintenance workload
  const workOrderPriorityWorkload = useMemo(() => {
    const priorities = ['Critical', 'High', 'Medium', 'Low'];

    return priorities.map(priority => {
      const orders = filteredWorkOrders.filter(w => (w.priority || '').toLowerCase() === priority.toLowerCase());
      
      const inProgress = orders.filter(w => w.status === 'In Progress').length;
      const scheduled = orders.filter(w => w.status === 'Scheduled' || w.status === 'Assigned').length;
      const open = orders.filter(w => w.status === 'Open').length;
      const pendingParts = orders.filter(w => w.status === 'Pending Parts' || w.status === 'On Hold').length;
      const completed = orders.filter(w => w.status === 'Completed').length;
      const totalPending = inProgress + scheduled + open + pendingParts;

      return {
        priority,
        inProgress,
        scheduled,
        open,
        pendingParts,
        completed,
        totalPending,
        totalAll: orders.length
      };
    });
  }, [filteredWorkOrders]);

  const totalPendingWorkOrders = useMemo(() => {
    return workOrderPriorityWorkload.reduce((sum, p) => sum + p.totalPending, 0);
  }, [workOrderPriorityWorkload]);

  // Production by Machine (Horizontal Bar, descending)
  const productionByMachine = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProduction.forEach(p => {
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
  }, [filteredProduction]);

  // 3. Machine-Wise Defect Rate (%) = (Total Defects / Total Units Produced) * 100
  const machineDefectRates = useMemo(() => {
    let targetProduction = production;
    if (defectPeriodFilter !== 'all') {
      targetProduction = targetProduction.filter(p => (p.date || '').startsWith(defectPeriodFilter));
    }
    if (selectedMachineFilter !== '--') {
      targetProduction = targetProduction.filter(p => filteredMachineIds.has(p.machine_id));
    }

    const machineStats: Record<string, { actualUnits: number; defectUnits: number; logsCount: number }> = {};
    
    // Initialize with filtered machines so all registered units appear
    filteredMachines.forEach(m => {
      const id = m.machine_id || m.id;
      machineStats[id] = { actualUnits: 0, defectUnits: 0, logsCount: 0 };
    });

    targetProduction.forEach(p => {
      const id = p.machine_id;
      if (!machineStats[id]) {
        machineStats[id] = { actualUnits: 0, defectUnits: 0, logsCount: 0 };
      }
      machineStats[id].actualUnits += Number(p.actual_units) || 0;
      machineStats[id].defectUnits += Number(p.defect_units) || 0;
      machineStats[id].logsCount++;
    });

    return Object.entries(machineStats)
      .map(([machine_id, stats]) => {
        const name = machineNameMap[machine_id] || machine_id;
        const actual = stats.actualUnits;
        const defects = stats.defectUnits;
        // Formula: (Total Defects / Total Units Produced) * 100
        const rate = actual > 0 ? (defects / actual) * 100 : 0;
        const goodUnits = Math.max(0, actual - defects);
        const goodRate = actual > 0 ? (goodUnits / actual) * 100 : 100;

        return {
          machine_id,
          name,
          actual_units: actual,
          defect_units: defects,
          good_units: goodUnits,
          defectRate: Number(rate.toFixed(2)),
          goodRate: Number(goodRate.toFixed(2)),
          logsCount: stats.logsCount,
          displayRate: `${rate.toFixed(2)}%`,
          displayUnits: formatCompactNumber(actual, 1),
          displayDefects: defects.toLocaleString()
        };
      })
      .sort((a, b) => b.defectRate - a.defectRate); // Ranked descending by defect rate
  }, [production, defectPeriodFilter, selectedMachineFilter, filteredMachineIds, filteredMachines, machineNameMap]);

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
          subtitle="Unique registered Apex units"
          value={formatWholeNumber(totalMachinesCount)}
          trendText={`${totalTelemetryCount.toLocaleString()} Telemetry Logs`}
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
            {selectedMachineFilter === '--' ? `All Machines (${totalRegisteredCount} units)` : selectedMachineFilter}
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
              <span className="text-[10px] text-slate-400 font-normal">{totalRegisteredCount} units</span>
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
              {uniqueApexMachines.map(m => {
                const id = m.machine_id || m.id;
                const name = m.name || m.machine_name || id;
                return (
                  <label
                    key={id}
                    className="flex items-center gap-2 cursor-pointer hover:text-[#0E79B2] transition-colors truncate p-1 rounded hover:bg-slate-50"
                    title={`${name} (${id})`}
                  >
                    <input
                      type="radio"
                      name="machine_slicer"
                      checked={selectedMachineFilter === name || selectedMachineFilter === id}
                      onClick={() => setSelectedMachineFilter(prev => (prev === name || prev === id) ? '--' : id)}
                      onChange={() => {}}
                      className="accent-[#0E79B2] cursor-pointer shrink-0"
                    />
                    <span className="truncate">{id} • {name}</span>
                  </label>
                );
              })}
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

        {/* Middle Column: Work Orders by Status + Work Order Priority & Execution Queue */}
        <div className="lg:col-span-4 min-w-0 space-y-4">
          {/* Visual 1: Work Orders by Status */}
          <PowerBiVisualContainer
            title="Work Orders by Status"
            subtitle="Overall distribution across all work order lifecycle statuses"
            heightClass="h-[325px]"
            rightAction={
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {filteredWorkOrders.length} Total
              </span>
            }
          >
            <div className="h-full w-full pt-1 flex flex-col justify-between">
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={workOrdersByStatus}
                    layout="vertical"
                    margin={{ top: 8, right: 40, left: 15, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      stroke="#94a3b8"
                      fontSize={10}
                      label={{ value: 'Count of work_order_id', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 10 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="status"
                      stroke="#64748b"
                      fontSize={10}
                      width={85}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                      formatter={(val: any, _, item: any) => [`${val} orders (${item?.payload?.pct})`, 'Total']}
                    />
                    <Bar
                      dataKey="count"
                      radius={[0, 4, 4, 0]}
                      label={{ position: 'right', fill: '#191923', fontSize: 11, fontWeight: 'bold' }}
                    >
                      {workOrdersByStatus.map((entry, idx) => (
                        <Cell key={`status-cell-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] text-slate-500 gap-1 px-1">
                {workOrdersByStatus.map(s => (
                  <div key={s.status} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }}></span>
                    <span className="font-medium text-slate-700">{s.status}:</span>
                    <span className="font-mono font-bold text-slate-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </PowerBiVisualContainer>

          {/* Visual 2: Work Order Priority & Execution Queue */}
          <PowerBiVisualContainer
            title="WORK ORDER PRIORITY & EXECUTION QUEUE"
            subtitle="Maintenance tasks requiring technician action grouped by priority"
            heightClass="h-[325px]"
            rightAction={
              <button
                onClick={() => setPriorityQueueMode(prev => prev === 'pending' ? 'all' : 'pending')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                  priorityQueueMode === 'pending'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Toggle between pending execution workload and all orders"
              >
                {priorityQueueMode === 'pending' ? `Pending Queue (${totalPendingWorkOrders})` : `All Orders (${filteredWorkOrders.length})`}
              </button>
            }
          >
            <div className="h-full w-full pt-1 flex flex-col justify-between">
              <div className="flex-1 min-h-[200px] pb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={workOrderPriorityWorkload}
                    layout="vertical"
                    margin={{ top: 8, right: 35, left: 15, bottom: 22 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      stroke="#94a3b8"
                      fontSize={10}
                      label={{ value: priorityQueueMode === 'pending' ? 'Pending Maintenance Workload (Units)' : 'Total Work Orders (Units)', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 10 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="priority"
                      stroke="#64748b"
                      fontSize={10}
                      width={60}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                      formatter={(val: any, name: any) => [`${val} orders`, name]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconSize={8}
                      wrapperStyle={{
                        fontSize: '10px',
                        lineHeight: '14px',
                        paddingTop: '6px',
                        bottom: '-2px',
                        left: 0,
                        right: 0,
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center'
                      }}
                    />
                    <Bar dataKey="open" name="Open" stackId="queue" fill="#EF4444" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="scheduled" name="Scheduled" stackId="queue" fill="#6366F1" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="inProgress" name="In Progress" stackId="queue" fill="#0E79B2" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pendingParts" name="Pending Parts" stackId="queue" fill="#F59E0B" radius={priorityQueueMode === 'pending' ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
                    {priorityQueueMode === 'all' && (
                      <Bar dataKey="completed" name="Completed" stackId="queue" fill="#10B981" radius={[0, 4, 4, 0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] px-1 text-slate-600">
                <span className="font-semibold text-slate-800">
                  {priorityQueueMode === 'pending' ? 'Active Attention Required:' : 'Priority Distribution:'}
                </span>
                <span className="font-mono text-xs font-bold text-amber-700">
                  {totalPendingWorkOrders} Pending Workload Orders
                </span>
              </div>
            </div>
          </PowerBiVisualContainer>
        </div>

        {/* Right Column: Production by Machine + Machine-Wise Defect Rate (%) + Production Over Time */}
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
                      const m = uniqueApexMachines.find(x => (x.machine_id || x.id) === entry?.machine_id);
                      if (m) onSelectMachine(m);
                    }}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>

          {/* Visual 3: MACHINE-WISE DEFECT RATE (%) */}
          <PowerBiVisualContainer
            title="MACHINE-WISE DEFECT RATE (%)"
            subtitle="(Total Defects / Total Units Produced) × 100 • Ranked descending"
            heightClass="h-[215px]"
            rightAction={
              <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setDefectPeriodFilter('all')}
                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded transition-colors cursor-pointer ${
                    defectPeriodFilter === 'all' ? 'bg-[#0E79B2] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="All time production periods"
                >
                  All
                </button>
                <button
                  onClick={() => setDefectPeriodFilter('2026-07')}
                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded transition-colors cursor-pointer ${
                    defectPeriodFilter === '2026-07' ? 'bg-[#0E79B2] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="July 2026 telemetry"
                >
                  Jul
                </button>
                <button
                  onClick={() => setDefectPeriodFilter('2026-08')}
                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded transition-colors cursor-pointer ${
                    defectPeriodFilter === '2026-08' ? 'bg-[#0E79B2] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="August 2026 telemetry"
                >
                  Aug
                </button>
                <button
                  onClick={() => setDefectPeriodFilter('2026-09')}
                  className={`px-1.5 py-0.5 text-[9px] font-semibold rounded transition-colors cursor-pointer ${
                    defectPeriodFilter === '2026-09' ? 'bg-[#0E79B2] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="September 2026 telemetry"
                >
                  Sep
                </button>
              </div>
            }
          >
            <div className="h-full w-full overflow-y-auto pr-1">
              <ResponsiveContainer width="100%" height={Math.max(260, machineDefectRates.length * 24)}>
                <BarChart
                  data={machineDefectRates}
                  layout="vertical"
                  margin={{ top: 5, right: 45, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={9}
                    domain={[0, 2.5]}
                    ticks={[0, 0.5, 1.0, 1.5, 2.0, 2.5]}
                    tickFormatter={(v) => `${v}%`}
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
                    formatter={(_val: any, _name: any, item: any) => {
                      const p = item?.payload;
                      return [
                        `${p?.displayRate} (${p?.displayDefects} defects / ${p?.actual_units?.toLocaleString()} units) - ${p?.goodRate}% Good`,
                        p?.name || p?.machine_id
                      ];
                    }}
                  />
                  <Bar
                    dataKey="defectRate"
                    fill="#E11D48"
                    radius={[0, 4, 4, 0]}
                    label={{
                      position: 'right',
                      fill: '#BE123C',
                      fontSize: 9,
                      fontWeight: 600,
                      formatter: (v: any) => `${v}%`
                    }}
                    onClick={(entry: any) => {
                      const m = uniqueApexMachines.find(x => (x.machine_id || x.id) === entry?.machine_id);
                      if (m) onSelectMachine(m);
                    }}
                    className="cursor-pointer"
                  >
                    {machineDefectRates.map((entry, idx) => {
                      const color = entry.defectRate >= 1.92 ? '#BE123C' : entry.defectRate >= 1.85 ? '#E11D48' : '#FB7185';
                      return <Cell key={`defect-cell-${idx}`} fill={color} />;
                    })}
                  </Bar>
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
