import React, { useState, useMemo } from 'react';
import type { Machine, WorkOrder, MaintenanceRecord, Incident, SOP } from '../../types/index.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { useData } from '../../contexts/DataContext.tsx';
import { TechnicianAssignmentCard } from '../technician/TechnicianAssignmentCard.tsx';
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
import {
  Wrench,
  ArrowUpRight,
  ClipboardList,
  Clock,
  Settings,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  User,
  Star,
  Layers,
  Inbox,
  Filter,
  Briefcase,
  Calendar,
  Building2
} from 'lucide-react';

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
  const { user } = useAuth();
  const {
    technicianProfiles,
    technicianAssignments,
    acceptTechnicianAssignment,
    rejectTechnicianAssignment,
    requestAssignmentReassignment,
    startAssignmentRepair,
    updateAssignmentProgress,
    resolveAssignment
  } = useData();

  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'PENDING ACCEPTANCE' | 'IN PROGRESS' | 'RESOLVED_PENDING_VERIFICATION' | 'OVERDUE'>('ALL');

  // Find profile of logged in technician or default to first profile
  const myProfile = useMemo(() => {
    if (!user) return technicianProfiles[0] || null;
    return technicianProfiles.find(p => p.user_id === user.id || p.email === user.email) || technicianProfiles[0] || null;
  }, [technicianProfiles, user]);

  // Filter assignments for this technician
  const myAssignments = useMemo(() => {
    let list = technicianAssignments;
    if (user?.role === 'TECHNICIAN') {
      list = list.filter(a => {
        const matchesUserId = a.technician_id === user.id;
        const matchesEmail = a.technician_email?.toLowerCase() === user.email?.toLowerCase();
        const matchesProfile = myProfile && (a.technician_id === myProfile.id || a.technician_id === myProfile.user_id);
        const matchesName = user.name && a.technician_name && (
          a.technician_name.toLowerCase().includes(user.name.toLowerCase().split(' ')[0]) ||
          user.name.toLowerCase().includes(a.technician_name.toLowerCase().split(' ')[0])
        );
        return matchesUserId || matchesEmail || matchesProfile || matchesName;
      });
    } else if (myProfile) {
      list = list.filter(a => a.technician_id === myProfile.user_id || a.technician_id === myProfile.id || a.technician_email === myProfile.email);
    }
    return list;
  }, [technicianAssignments, user, myProfile]);

  const filteredAssignments = useMemo(() => {
    if (assignmentFilter === 'ALL') return myAssignments;
    if (assignmentFilter === 'OVERDUE') return myAssignments.filter(a => a.is_overdue);
    if (assignmentFilter === 'PENDING ACCEPTANCE') {
      return myAssignments.filter(a => {
        const st = (a.status || '').toUpperCase().trim();
        return st === 'PENDING ACCEPTANCE' || st === 'PENDING_ACCEPTANCE' || st === 'PENDING';
      });
    }
    if (assignmentFilter === 'IN PROGRESS') {
      return myAssignments.filter(a => {
        const st = (a.status || '').toUpperCase().trim();
        return st === 'IN PROGRESS' || st === 'IN_PROGRESS';
      });
    }
    if (assignmentFilter === 'RESOLVED_PENDING_VERIFICATION') {
      return myAssignments.filter(a => {
        const st = (a.status || '').toUpperCase().trim();
        return st === 'RESOLVED_PENDING_VERIFICATION' || st === 'RESOLVED';
      });
    }
    return myAssignments.filter(a => a.status === assignmentFilter);
  }, [myAssignments, assignmentFilter]);

  const pendingAcceptanceCount = useMemo(() => {
    return myAssignments.filter(a => {
      const st = (a.status || '').toUpperCase().trim();
      return st === 'PENDING ACCEPTANCE' || st === 'PENDING_ACCEPTANCE' || st === 'PENDING';
    }).length;
  }, [myAssignments]);

  const inProgressCount = useMemo(() => {
    return myAssignments.filter(a => {
      const st = (a.status || '').toUpperCase().trim();
      return st === 'IN PROGRESS' || st === 'IN_PROGRESS';
    }).length;
  }, [myAssignments]);

  const awaitingVerificationCount = useMemo(() => {
    return myAssignments.filter(a => {
      const st = (a.status || '').toUpperCase().trim();
      return st === 'RESOLVED_PENDING_VERIFICATION' || st === 'RESOLVED';
    }).length;
  }, [myAssignments]);

  const overdueCount = useMemo(() => {
    return myAssignments.filter(a => a.is_overdue).length;
  }, [myAssignments]);

  // Machine lookup map
  const machineMap = useMemo(() => {
    const map = new Map<string, Machine>();
    machines.forEach(m => {
      map.set(m.machine_id, m);
      if (m.id) map.set(m.id, m);
    });
    return map;
  }, [machines]);

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
        technician_name: m.technician_name || m.technician || 'Ramesh Varma'
      };
    });
  }, [maintenance, machineMap]);

  const totalMaintenanceDuration = useMemo(() => {
    return maintenance.reduce((sum, m) => sum + (Number(m.duration_minutes) || 0), 0);
  }, [maintenance]);

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
    <div className="max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans text-slate-900">
      {/* 1. TECHNICIAN PROFILE HEADER CARD (White, FactoryOps Reference Matching) */}
      {myProfile && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#794628] text-white font-black text-base flex items-center justify-center shrink-0 shadow-2xs">
                {(myProfile.name || 'Technician').split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    {myProfile.name || 'Ramesh Varma'} <span className="font-semibold text-slate-600 text-sm">(Senior Technician)</span>
                  </h2>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100/90 text-amber-950 border border-amber-300">
                    {myProfile.specialisation || 'Mechanical Technician'}
                  </span>
                  {myProfile.secondary_specialisations?.map((sec, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100/90 text-blue-950 border border-blue-300">
                      {sec}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1 font-medium">
                  <span className="flex items-center gap-1">
                    <span>Factory: <strong className="text-slate-900 font-bold">Apex Precision (FAC-001)</strong></span>
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Shift: <strong className="text-slate-900 font-bold">{myProfile.shift || 'Morning (06:00 – 14:00)'}</strong></span>
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                    <span>Experience: <strong className="text-slate-900 font-bold">{myProfile.experience_years || 8} years</strong></span>
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1 text-amber-700 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    {myProfile.rating || 4.9} / 5.0
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Availability Status & Active Workload */}
            <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-6">
              <div>
                <span className="text-[11px] text-slate-500 block font-bold uppercase tracking-wider mb-1">
                  Availability Status
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                  myProfile.availability_status === 'AVAILABLE' || myProfile.availability_status === 'Available'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    myProfile.availability_status === 'AVAILABLE' || myProfile.availability_status === 'Available' ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                  }`} />
                  {myProfile.availability_status || 'Available'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 block font-bold uppercase tracking-wider mb-1">
                  Active Workload
                </span>
                <div className="text-lg text-slate-900 font-mono font-black">
                  {myAssignments.filter(a => a.status === 'IN PROGRESS' || a.status === 'PENDING ACCEPTANCE' || a.status === 'ACCEPTED').length} / {myProfile.max_concurrent_assignments || 3} Tasks
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {myProfile.completed_repairs_count || 3} repairs completed
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: KEY PERFORMANCE INDICATORS */}
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

      {/* SECTION 6: OPERATIONAL ANALYTICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

        <div className="min-w-0 md:col-span-2 lg:col-span-1">
          <PowerBiVisualContainer
            title="INCIDENTS BY SEVERITY"
            subtitle="Distribution of incident severity"
            heightClass="h-[340px]"
          >
            <div className="h-full flex flex-col justify-between">
              <div className="flex items-center justify-center gap-3 text-[10.5px] text-slate-700 pt-1">
                {incidentsBySeverity.map(entry => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                    <span className="font-semibold">{entry.name}</span>
                  </div>
                ))}
              </div>

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
