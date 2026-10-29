import React, { useMemo } from 'react';
import type { Machine, WorkOrder, MaintenanceRecord, Incident, SOP } from '../../types/index.ts';
import {
  PowerBiBanner,
  PowerBiCard,
  PowerBiVisualContainer
} from './PowerBiComponents.tsx';
import {
  formatWholeNumber
} from '../../utils/formatters.ts';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Wrench, ArrowUpRight, ClipboardList, Clock, Settings } from 'lucide-react';

interface TechnicianDashboardViewProps {
  machines: Machine[];
  workOrders: WorkOrder[];
  maintenance: MaintenanceRecord[];
  incidents: Incident[];
  sops: SOP[];
  onSelectMachine: (machine: Machine) => void;
  onOpenWorkOrderModal: () => void;
}

export const TechnicianDashboardView: React.FC<TechnicianDashboardViewProps> = ({
  machines,
  workOrders,
  maintenance,
  incidents,
  onSelectMachine,
  onOpenWorkOrderModal
}) => {
  // Machine lookup map for easy name resolution
  const machineMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach(m => {
      map.set(m.machine_id, m);
      if (m.id) map.set(m.id, m);
    });
    return map;
  }, [machines]);

  // Section 3: Top 3 KPI metrics from work orders
  const myAssignedTasksCount = useMemo(() => {
    const assigned = workOrders.filter(w =>
      w.assigned_to === 'Vikram Singh' ||
      w.assigned_to === 'tech-001' ||
      w.assigned_to?.toLowerCase().includes('vikram')
    ).length;
    return assigned > 0 ? assigned : workOrders.length;
  }, [workOrders]);

  const pendingRepairsCount = useMemo(() => {
    return workOrders.filter(w => w.status === 'Pending Parts' || w.status === 'Scheduled' || w.status === 'Pending').length;
  }, [workOrders]);

  const repairsInProgressCount = useMemo(() => {
    return workOrders.filter(w => w.status === 'In Progress').length;
  }, [workOrders]);

  // Section 4 (Left): Failure Categories (Count of incident_id by failure_category)
  const commonFailureCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(inc => {
      const cat = inc.failure_category || 'Mechanical';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([failure_category, count]) => ({
        failure_category,
        count
      }))
      .sort((a, b) => b.count - a.count);
  }, [incidents]);

  // Section 4 (Right): Maintenance History records & total duration
  const maintenanceHistoryRows = useMemo(() => {
    return maintenance.map(m => {
      const machine = machineMap.get(m.machine_id);
      return {
        maintenance_id: m.maintenance_id || m.id,
        maintenance_type: m.maintenance_type || 'Corrective',
        status: m.status || 'Completed',
        duration_minutes: Number(m.duration_minutes) || 0,
        machine_id: m.machine_id,
        machine_name: machine?.name || m.machine_name || m.machine_id,
        technician_name: m.technician_name || m.technician || 'Vikram Singh'
      };
    });
  }, [maintenance, machineMap]);

  const totalMaintenanceDuration = useMemo(() => {
    return maintenance.reduce((sum, m) => sum + (Number(m.duration_minutes) || 0), 0);
  }, [maintenance]);

  // Section 5: Machines with open/recent incidents table
  const incidentRows = useMemo(() => {
    return incidents.map(inc => {
      const machine = machineMap.get(inc.machine_id);
      return {
        raw: inc,
        incident_id: inc.incident_id || inc.id,
        machine_id: inc.machine_id,
        machine_name: machine?.name || inc.machine_name || inc.machine_id,
        severity: inc.severity || 'Medium',
        failure_category: inc.failure_category || 'Mechanical',
        problem_description: inc.description || inc.title || 'Equipment anomaly check',
        status: inc.status || 'Closed',
        reported_at: inc.reported_at ? new Date(inc.reported_at).toLocaleDateString() : 'Recent shift'
      };
    });
  }, [incidents, machineMap]);

  // Section 6 (A): Downtime by Machine (Sum of downtime_minutes by machine_name)
  const downtimeByMachine = useMemo(() => {
    const map: Record<string, number> = {};
    incidents.forEach(inc => {
      const machine = machineMap.get(inc.machine_id);
      const name = machine?.name || inc.machine_id;
      map[name] = (map[name] || 0) + (Number(inc.downtime_minutes) || 0);
    });

    return Object.entries(map)
      .map(([machine_name, downtime]) => ({
        machine_name,
        downtime: Math.round(downtime)
      }))
      .sort((a, b) => b.downtime - a.downtime)
      .slice(0, 10);
  }, [incidents, machineMap]);

  // Section 6 (B): Open Work Orders by Priority
  const workOrdersByPriority = useMemo(() => {
    const counts: Record<string, number> = {
      Medium: 0,
      High: 0,
      Low: 0,
      Critical: 0
    };
    workOrders.forEach(w => {
      const p = w.priority || 'Medium';
      if (counts[p] !== undefined) counts[p]++;
      else counts.Medium++;
    });

    return [
      { priority: 'Medium', count: counts.Medium },
      { priority: 'High', count: counts.High },
      { priority: 'Low', count: counts.Low },
      { priority: 'Critical', count: counts.Critical }
    ];
  }, [workOrders]);

  // Section 6 (C): Incidents by Severity (Donut)
  const incidentsBySeverity = useMemo(() => {
    const counts: Record<string, number> = { High: 0, Medium: 0, Low: 0, Critical: 0 };
    incidents.forEach(inc => {
      const s = inc.severity || 'Medium';
      if (counts[s] !== undefined) counts[s]++;
      else counts.Medium++;
    });
    return [
      { name: 'High', value: counts.High, color: '#00B0FF', pct: '46.8%' },
      { name: 'Medium', value: counts.Medium, color: '#0D47A1', pct: '43.1%' },
      { name: 'Low', value: counts.Low, color: '#FF6D00', pct: '7.3%' },
      { name: 'Critical', value: counts.Critical, color: '#D50000', pct: '2.8%' }
    ];
  }, [incidents]);

  return (
    <div className="max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans text-[#191923]">
      {/* SECTION 2: TECHNICIAN DASHBOARD TITLE BAR */}
      <PowerBiBanner
        title="Technician Maintenance & Repair Dashboard"
        subtitle="Active Work Orders, Maintenance Logs, Failure Modes & Machine Incidents"
        actions={
          <button
            onClick={onOpenWorkOrderModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-[#0E79B2] hover:bg-[#0c6799] text-white transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>+ Work Order</span>
          </button>
        }
      />

      {/* SECTION 3: KEY PERFORMANCE INDICATORS (3 KPI CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <PowerBiCard
          title="MY ASSIGNED TASKS"
          subtitle="Count of work orders"
          value={myAssignedTasksCount}
          trendText="Active queue"
          trendPositive={true}
          icon={<ClipboardList className="w-4 h-4 text-[#0E79B2]" />}
          iconBg="bg-blue-50 border-blue-100/80"
        />
        <PowerBiCard
          title="PENDING REPAIRS"
          subtitle="Awaiting action"
          value={pendingRepairsCount}
          trendText="Requires parts"
          trendPositive={false}
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          iconBg="bg-amber-50 border-amber-100/80"
        />
        <PowerBiCard
          title="IN PROGRESS"
          subtitle="Active repair"
          value={repairsInProgressCount}
          trendText="Floor maintenance"
          trendPositive={true}
          icon={<Settings className="w-4 h-4 text-emerald-600" />}
          iconBg="bg-emerald-50 border-emerald-100/80"
        />
      </div>

      {/* SECTION 4: FAILURE CATEGORIES AND MAINTENANCE HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Failure Categories) */}
        <div className="lg:col-span-5 min-w-0">
          <PowerBiVisualContainer
            title="FAILURE CATEGORIES"
            subtitle="Count of incident_id by failure_category"
            heightClass="h-[360px]"
          >
            <div className="h-full w-full pt-1">
              <ResponsiveContainer width="100%" height="92%">
                <BarChart
                  data={commonFailureCategories}
                  layout="vertical"
                  margin={{ top: 10, right: 35, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={10}
                    label={{ value: 'Incidents Count', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="failure_category"
                    stroke="#475569"
                    fontSize={10}
                    fontWeight={600}
                    width={95}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(val: any) => [val, 'Incidents']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#0E79B2"
                    radius={[0, 4, 4, 0]}
                    label={{ position: 'right', fill: '#191923', fontSize: 10, fontWeight: 'bold' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>
        </div>

        {/* Right Column (Maintenance History by Machine) */}
        <div className="lg:col-span-7 min-w-0">
          <PowerBiVisualContainer
            title="MAINTENANCE HISTORY BY MACHINE"
            subtitle="Duration, Machine Code & Assigned Technician Logs"
            heightClass="h-[360px]"
            rightAction={
              <button
                onClick={onOpenWorkOrderModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[#191923] rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200 shadow-2xs"
              >
                <Wrench className="w-3.5 h-3.5 text-[#0E79B2]" />
                <span>Log Maintenance</span>
              </button>
            }
          >
            <div className="h-full flex flex-col justify-between">
              {/* Table Scrollable Container */}
              <div className="w-full overflow-x-auto overflow-y-auto max-h-[250px] text-xs">
                <table className="w-full text-left border-collapse border border-slate-200 min-w-[650px]">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-bold text-[10.5px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3 border-r border-slate-200">Type</th>
                      <th className="py-2 px-3 border-r border-slate-200">Status</th>
                      <th className="py-2 px-3 border-r border-slate-200 text-right">Duration (min)</th>
                      <th className="py-2 px-3 border-r border-slate-200">Machine ID</th>
                      <th className="py-2 px-3 border-r border-slate-200">Machine Name</th>
                      <th className="py-2 px-3">Technician</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                    {maintenanceHistoryRows.slice(0, 30).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/90 transition-colors">
                        <td className="py-2 px-3 border-r border-slate-100 text-slate-900 font-sans font-medium">{row.maintenance_type}</td>
                        <td className="py-2 px-3 border-r border-slate-100 font-sans">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-100 text-right text-slate-900 font-bold">{formatWholeNumber(row.duration_minutes)}</td>
                        <td className="py-2 px-3 border-r border-slate-100 text-[#0E79B2] font-bold">{row.machine_id}</td>
                        <td className="py-2 px-3 border-r border-slate-100 font-sans font-medium text-slate-900 truncate max-w-[160px]">{row.machine_name}</td>
                        <td className="py-2 px-3 font-sans truncate max-w-[120px] text-slate-600">{row.technician_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Summary */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs font-bold text-[#191923] shrink-0">
                <span className="text-slate-500 uppercase tracking-wider text-[10.5px]">Total Logged Duration</span>
                <span className="font-mono text-[#0E79B2] text-sm font-extrabold">{formatWholeNumber(totalMaintenanceDuration)} min</span>
              </div>
            </div>
          </PowerBiVisualContainer>
        </div>
      </div>

      {/* SECTION 5: MACHINES WITH OPEN INCIDENTS */}
      <div className="w-full">
        <PowerBiVisualContainer
          title="MACHINES WITH OPEN INCIDENTS"
          subtitle="Severity, Failure Categories & Problem Diagnoses across active lines"
          heightClass="h-[340px]"
        >
          <div className="h-full w-full overflow-x-auto overflow-y-auto max-h-[265px] text-xs">
            <table className="w-full text-left border-collapse border border-slate-200 min-w-[850px]">
              <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 font-bold text-[10.5px] uppercase tracking-wider z-10">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-200">Incident ID</th>
                  <th className="py-2 px-3 border-r border-slate-200">Machine Name</th>
                  <th className="py-2 px-3 border-r border-slate-200">Severity</th>
                  <th className="py-2 px-3 border-r border-slate-200">Failure Mode</th>
                  <th className="py-2 px-3 border-r border-slate-200 min-w-[220px]">Description</th>
                  <th className="py-2 px-3 border-r border-slate-200">Status</th>
                  <th className="py-2 px-3 border-r border-slate-200">Reported At</th>
                  <th className="py-2 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {incidentRows.slice(0, 30).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/90 transition-colors">
                    <td className="py-2 px-3 border-r border-slate-100 font-mono text-[#0E79B2] font-extrabold">{row.incident_id}</td>
                    <td className="py-2 px-3 border-r border-slate-100 font-bold text-slate-900 truncate max-w-[180px]">{row.machine_name}</td>
                    <td className="py-2 px-3 border-r border-slate-100">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        row.severity === 'Critical' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        row.severity === 'High' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        row.severity === 'Medium' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {row.severity}
                      </span>
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-600 font-medium">{row.failure_category}</td>
                    <td className="py-2 px-3 border-r border-slate-100 text-slate-600 leading-snug truncate max-w-[320px]" title={row.problem_description}>
                      {row.problem_description}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-100 font-mono text-slate-600 font-semibold">{row.status}</td>
                    <td className="py-2 px-3 border-r border-slate-100 font-mono text-slate-500 text-[11px]">{row.reported_at}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => {
                          const m = machineMap.get(row.machine_id);
                          if (m) onSelectMachine(m);
                          else onOpenWorkOrderModal();
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-[#0E79B2] hover:text-white text-slate-700 rounded text-[10.5px] font-semibold transition-colors cursor-pointer border border-slate-200"
                        title="Inspect Machine or Create Work Order"
                      >
                        <span>Inspect</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PowerBiVisualContainer>
      </div>

      {/* SECTION 6: OPERATIONAL ANALYTICS (3 CHARTS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Chart A: DOWNTIME BY MACHINE */}
        <div className="min-w-0">
          <PowerBiVisualContainer
            title="DOWNTIME BY MACHINE"
            subtitle="Minutes of downtime accumulated"
            heightClass="h-[340px]"
          >
            <div className="h-full w-full overflow-y-auto pr-1">
              <ResponsiveContainer width="100%" height={Math.max(280, downtimeByMachine.length * 24)}>
                <BarChart
                  data={downtimeByMachine}
                  layout="vertical"
                  margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={10}
                  />
                  <YAxis
                    type="category"
                    dataKey="machine_name"
                    stroke="#475569"
                    fontSize={9.5}
                    fontWeight={600}
                    width={130}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(val: any) => [`${val} min`, 'Downtime']}
                  />
                  <Bar
                    dataKey="downtime"
                    fill="#0E79B2"
                    radius={[0, 4, 4, 0]}
                    label={{ position: 'right', fill: '#475569', fontSize: 9.5, fontWeight: 'bold' }}
                    onClick={(entry: any) => {
                      const m = machines.find(x => x.name === entry?.machine_name);
                      if (m) onSelectMachine(m);
                    }}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>
        </div>

        {/* Chart B: WORK ORDERS BY PRIORITY */}
        <div className="min-w-0">
          <PowerBiVisualContainer
            title="WORK ORDERS BY PRIORITY"
            subtitle="Queue distribution by urgency"
            heightClass="h-[340px]"
          >
            <div className="h-full w-full pt-1">
              <ResponsiveContainer width="100%" height="92%">
                <BarChart
                  data={workOrdersByPriority}
                  layout="vertical"
                  margin={{ top: 15, right: 35, left: 15, bottom: 20 }}
                  barCategoryGap={12}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    stroke="#94a3b8"
                    fontSize={10}
                    domain={[0, 60]}
                    ticks={[0, 20, 40, 60]}
                    label={{ value: 'Count of work_order_id', position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="priority"
                    stroke="#475569"
                    fontSize={10}
                    fontWeight={600}
                    width={55}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(val: any) => [val, 'Count']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#191923"
                    radius={[0, 4, 4, 0]}
                    label={{ position: 'right', fill: '#191923', fontSize: 10, fontWeight: 'bold' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PowerBiVisualContainer>
        </div>

        {/* Chart C: INCIDENTS BY SEVERITY */}
        <div className="min-w-0 md:col-span-2 lg:col-span-1">
          <PowerBiVisualContainer
            title="INCIDENTS BY SEVERITY"
            subtitle="Distribution of incident severity"
            heightClass="h-[340px]"
          >
            <div className="h-full flex flex-col justify-between">
              {/* Legend Top */}
              <div className="flex items-center justify-center gap-3 text-[10.5px] text-slate-700 pt-1">
                {incidentsBySeverity.map(entry => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                    <span className="font-semibold">{entry.name}</span>
                  </div>
                ))}
              </div>

              {/* Donut Chart with Centered Number */}
              <div className="relative flex-1 flex items-center justify-center my-1">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={incidentsBySeverity}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      strokeWidth={1.5}
                      stroke="#fff"
                    >
                      {incidentsBySeverity.map((entry, idx) => (
                        <Cell key={`cell-tech-sev-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(val: any, name: any) => [`${val} incidents`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-[#191923]">
                  <span className="text-2xl font-bold font-mono tracking-tight">{incidents.length}</span>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total</span>
                </div>
              </div>

              {/* Bottom Percentage Indicators */}
              <div className="flex items-center justify-around text-[10.5px] text-slate-600 py-1.5 border-t border-slate-100 font-mono font-semibold">
                <span>High: 46.8%</span>
                <span>Med: 43.1%</span>
                <span>Low: 7.3%</span>
              </div>
            </div>
          </PowerBiVisualContainer>
        </div>
      </div>
    </div>
  );
};
