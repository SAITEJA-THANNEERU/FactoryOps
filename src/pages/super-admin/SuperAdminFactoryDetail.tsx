import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useRouter } from '../../contexts/RouterContext.tsx';
import type {
  Factory,
  FactoryKPIs,
  Machine,
  ProductionRecord,
  MaintenanceRecord,
  Incident,
  WorkOrder
} from '../../types/index.ts';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { SeverityBadge } from '../../components/SeverityBadge.tsx';
import { PriorityBadge } from '../../components/PriorityBadge.tsx';
import { MachineDetailModal } from '../../components/MachineDetailModal.tsx';
import {
  ArrowLeft,
  Building2,
  Cpu,
  TrendingUp,
  Wrench,
  AlertTriangle,
  ClipboardList,
  BarChart3,
  RefreshCw,
  Gauge,
  CheckCircle2,
  Calendar,
  Layers,
  Info
} from 'lucide-react';
import {
  formatDuration,
  formatPercent,
  formatWholeNumber,
  formatCurrency
} from '../../utils/formatters.ts';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface SuperAdminFactoryDetailPageProps {
  factoryId: string;
}

export const SuperAdminFactoryDetailPage: React.FC<SuperAdminFactoryDetailPageProps> = ({
  factoryId
}) => {
  const { navigate } = useRouter();
  const [factory, setFactory] = useState<(Factory & { kpis: FactoryKPIs }) | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [production, setProduction] = useState<ProductionRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'machines' | 'production' | 'maintenance' | 'incidents' | 'work-orders' | 'analytics'
  >('overview');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadFactoryData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [facData, machinesData, prodData, maintData, incData, woData] = await Promise.all([
        api.factories.getById(factoryId),
        api.machines.getAll(factoryId),
        api.production.getAll(factoryId),
        api.maintenance.getAll(factoryId),
        api.incidents.getAll(factoryId),
        api.workOrders.getAll(factoryId)
      ]);
      setFactory(facData);
      setMachines(machinesData);
      setProduction(prodData);
      setMaintenance(maintData);
      setIncidents(incData);
      setWorkOrders(woData);
    } catch (err: any) {
      setError(err.message || 'Failed to load factory details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFactoryData();
  }, [factoryId]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading Factory Records ({factoryId})...</p>
      </div>
    );
  }

  if (error || !factory) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/super-admin/factories')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Factories</span>
        </button>
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
          {error || 'Factory not found'}
        </div>
      </div>
    );
  }

  const kpis = factory.kpis;

  // Production chart data (last 7 days)
  const productionByDateMap: Record<string, { target: number; actual: number }> = {};
  production.forEach(p => {
    const date = p.timestamp.split('T')[0].substring(5);
    if (!productionByDateMap[date]) {
      productionByDateMap[date] = { target: 0, actual: 0 };
    }
    productionByDateMap[date].target += p.target_units;
    productionByDateMap[date].actual += p.actual_units;
  });
  const chartData = Object.entries(productionByDateMap)
    .slice(-7)
    .map(([date, v]) => ({ date, actual: v.actual, target: v.target }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Navigation Bar: Back & Inspection Warning */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/super-admin/factories')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Factories</span>
          </button>
          <div className="h-4 w-px bg-slate-300 hidden sm:block" />
          <div className="text-xs text-slate-500 hidden sm:block">
            Tenant Oversight: <strong className="text-slate-900">{factory.name}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <Info className="w-3.5 h-3.5 text-amber-600" />
            <span>Super Admin Read-Only Inspection</span>
          </span>
        </div>
      </div>

      {/* Factory Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Building2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{factory.name}</h1>
                <StatusBadge status={factory.status} size="sm" />
                <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {factory.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {factory.location} • {factory.industry} • Owner: <strong className="text-slate-700">{factory.owner_name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-600 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
            <div>
              <span className="text-slate-400 block text-[10px]">Capacity</span>
              <span className="font-semibold text-slate-900">{factory.capacity}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Est. Year</span>
              <span className="font-semibold text-slate-900">{factory.established_year}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">OEE Benchmark</span>
              <span className="font-bold text-emerald-700">{kpis.oee}%</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-t border-slate-200 mt-5 pt-3 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Overview', icon: Building2 },
            { id: 'machines', label: `Machines (${machines.length})`, icon: Cpu },
            { id: 'production', label: 'Production', icon: TrendingUp },
            { id: 'maintenance', label: `Maintenance (${maintenance.length})`, icon: Wrench },
            { id: 'incidents', label: `Incidents (${incidents.length})`, icon: AlertTriangle },
            { id: 'work-orders', label: `Work Orders (${workOrders.length})`, icon: ClipboardList },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Overall OEE</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{kpis.oee}%</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Avail: {kpis.availability}%</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Connected Machines</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.total_machines}</div>
              <div className="text-[10px] text-emerald-600 mt-0.5">{kpis.running_machines} running</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Production Output</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {formatWholeNumber(kpis.total_production_units)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Actual Units</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Defect Rate</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{formatPercent(kpis.defect_rate_pct, 2)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{formatWholeNumber(kpis.defective_units)} units</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Active Incidents</span>
              <div className="text-2xl font-bold text-amber-600 mt-1">{formatWholeNumber(kpis.active_incidents)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Under Triage</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
              <span className="text-[11px] font-medium text-slate-500">Open Work Orders</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{formatWholeNumber(kpis.open_work_orders)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{formatDuration(kpis.downtime_hours, 'h')} downtime</div>
            </div>
          </div>

          {/* Production Output Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-2">Production Output vs Target (Units)</h2>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '0.375rem',
                      fontSize: '12px'
                    }}
                  />
                  <Area type="monotone" dataKey="target" stroke="#94a3b8" fill="#f1f5f9" />
                  <Area type="monotone" dataKey="actual" stroke="#059669" fill="#d1fae5" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Machines Tab */}
      {activeTab === 'machines' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-semibold text-sm text-slate-900">
            Connected Plant Machinery ({machines.length})
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold z-10">
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-3 px-4">Machine ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Line</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Health</th>
                  <th className="py-3 px-4">Temp</th>
                  <th className="py-3 px-4">Vibration</th>
                  <th className="py-3 px-4">OEE</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {machines.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-medium text-emerald-800">{m.machine_id}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{m.name}</td>
                    <td className="py-3 px-4 text-slate-600">{m.type}</td>
                    <td className="py-3 px-4 text-slate-600">{m.line}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={m.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{m.health_score}%</td>
                    <td className="py-3 px-4">{m.temperature_c}°C</td>
                    <td className="py-3 px-4">{m.vibration_mms} mm/s</td>
                    <td className="py-3 px-4 font-bold text-emerald-800">{m.oee}%</td>
                    <td className="py-3 px-4 text-slate-600">{m.operator}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedMachine(m)}
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium"
                      >
                        Telemetry
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Production Tab */}
      {activeTab === 'production' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-semibold text-sm text-slate-900">
            Production Records ({production.length})
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold z-10">
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Machine ID</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Target Units</th>
                  <th className="py-3 px-4">Actual Units</th>
                  <th className="py-3 px-4">Defects</th>
                  <th className="py-3 px-4">Scrap (kg)</th>
                  <th className="py-3 px-4">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {production.slice(0, 25).map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-slate-500">
                      {new Date(p.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-emerald-800">{p.machine_id}</td>
                    <td className="py-2.5 px-4">{p.shift}</td>
                    <td className="py-2.5 px-4">{p.target_units}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{p.actual_units}</td>
                    <td className="py-2.5 px-4 text-rose-600 font-semibold">{p.defective_units}</td>
                    <td className="py-2.5 px-4">{p.scrap_kg} kg</td>
                    <td className="py-2.5 px-4 text-slate-600">{p.operator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-semibold text-sm text-slate-900">
            Maintenance History & Scheduled Tasks ({maintenance.length})
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold z-10">
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-3 px-4">Machine ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Technician</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Downtime</th>
                  <th className="py-3 px-4">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {maintenance.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-medium text-emerald-800">{m.machine_id}</td>
                    <td className="py-3 px-4 font-medium">{m.type}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={m.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{m.scheduled_date}</td>
                    <td className="py-3 px-4">{m.technician}</td>
                    <td className="py-3 px-4 max-w-xs text-slate-600">{m.description}</td>
                    <td className="py-3 px-4 font-medium text-amber-700">{formatDuration(m.downtime_hours, 'h')}</td>
                    <td className="py-3 px-4 text-emerald-700 font-medium">{formatCurrency(m.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === 'incidents' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-semibold text-sm text-slate-900">
            Plant Incident Log ({incidents.length})
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold z-10">
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Machine ID</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reported By</th>
                  <th className="py-3 px-4">Reported At</th>
                  <th className="py-3 px-4">Root Cause Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {incidents.map(inc => (
                  <tr key={inc.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-medium text-emerald-800">{inc.incident_id}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{inc.machine_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{inc.title}</td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={inc.severity} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inc.status} size="sm" />
                    </td>
                    <td className="py-3 px-4">{inc.reported_by}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(inc.reported_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-600">{inc.root_cause || 'Under investigation'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Work Orders Tab */}
      {activeTab === 'work-orders' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-semibold text-sm text-slate-900">
            Work Orders Dispatched ({workOrders.length})
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold z-10">
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="py-3 px-4">WO ID</th>
                  <th className="py-3 px-4">Machine ID</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Est. Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {workOrders.map(wo => (
                  <tr key={wo.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-medium text-emerald-800">{wo.work_order_id}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{wo.machine_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{wo.title}</td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={wo.priority} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={wo.status} size="sm" />
                    </td>
                    <td className="py-3 px-4">{wo.assigned_to}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{wo.due_date}</td>
                    <td className="py-3 px-4 font-medium">{formatDuration(wo.estimated_hours, 'h')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">OEE Decomposition for {factory.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
              <span className="text-xs text-slate-500 font-medium">Availability</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">{kpis.availability}%</div>
              <p className="text-[11px] text-slate-500 mt-1">Uptime vs planned schedule</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
              <span className="text-xs text-slate-500 font-medium">Performance</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">{kpis.performance}%</div>
              <p className="text-[11px] text-slate-500 mt-1">Speed efficiency factor</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
              <span className="text-xs text-slate-500 font-medium">Quality</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">{kpis.quality}%</div>
              <p className="text-[11px] text-slate-500 mt-1">First-pass pass rate</p>
            </div>
          </div>
        </div>
      )}

      {/* Machine Detail Modal */}
      <MachineDetailModal
        machine={selectedMachine}
        onClose={() => setSelectedMachine(null)}
        incidents={incidents}
        workOrders={workOrders}
        production={production}
      />
    </div>
  );
};
