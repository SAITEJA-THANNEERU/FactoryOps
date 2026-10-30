import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useRouter } from '../../contexts/RouterContext.tsx';
import type { Factory, FactoryKPIs } from '../../types/index.ts';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import {
  Building2,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  Users,
  Download,
  RefreshCw,
  MapPin,
  Cpu
} from 'lucide-react';

export const SuperAdminFactoriesPage: React.FC = () => {
  const { navigate } = useRouter();
  const [factories, setFactories] = useState<(Factory & { kpis: FactoryKPIs })[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'oee' | 'machines' | 'incidents'>('name');

  const loadFactories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const overview = await api.superAdmin.getOverview();
      setFactories(overview.factories);
    } catch (err: any) {
      setError(err.message || 'Failed to load factories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFactories();
  }, []);

  const locations = Array.from(new Set(factories.map(f => f.location.split(',')[0].trim())));

  // Filtering & Sorting
  const filtered = factories.filter(f => {
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (locationFilter !== 'all' && !f.location.toLowerCase().includes(locationFilter.toLowerCase())) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        f.name.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.owner_name.toLowerCase().includes(q) ||
        f.industry.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'oee') return b.kpis.oee - a.kpis.oee;
    if (sortBy === 'machines') return b.kpis.total_machines - a.kpis.total_machines;
    if (sortBy === 'incidents') return b.kpis.active_incidents - a.kpis.active_incidents;
    return a.name.localeCompare(b.name);
  });

  const exportSummaryCsv = () => {
    const headers = ['Factory ID,Name,Location,Industry,Owner,Machines,Running,OEE,Incidents,Work Orders,Status'];
    const rows = filtered.map(f =>
      `"${f.id}","${f.name}","${f.location}","${f.industry}","${f.owner_name}",${f.kpis.total_machines},${f.kpis.running_machines},${f.kpis.oee}%,${f.kpis.active_incidents},${f.kpis.open_work_orders},"${f.status}"`
    );
    const blob = new Blob([[...headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factoryops-tenants-summary-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading Factory Management...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Factory Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              1 Active Plant: APEX
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Active manufacturing plant: Apex Precision Manufacturing (Hyderabad, Telangana) • APX-01
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportSummaryCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          {/* Search */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, city..."
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-emerald-600"
            >
              <option value="all">All Statuses</option>
              <option value="Operational">Operational</option>
              <option value="Maintenance Alert">Maintenance Alert</option>
              <option value="Production Slowdown">Production Slowdown</option>
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Location:</span>
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-emerald-600"
            >
              <option value="all">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-emerald-600"
            >
              <option value="name">Factory Name</option>
              <option value="oee">OEE (High to Low)</option>
              <option value="machines">Machine Count</option>
              <option value="incidents">Active Incidents</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setSearch('');
            setStatusFilter('all');
            setLocationFilter('all');
            setSortBy('name');
          }}
          className="text-slate-500 hover:text-slate-800 text-xs font-medium"
        >
          Reset Filters
        </button>
      </div>

      {/* Factories Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Factory ID</th>
                <th className="py-3 px-4">Factory Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Industry</th>
                <th className="py-3 px-4">Plant Owner</th>
                <th className="py-3 px-4">Machines</th>
                <th className="py-3 px-4">OEE</th>
                <th className="py-3 px-4">Incidents</th>
                <th className="py-3 px-4">Work Orders</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map(factory => (
                <tr
                  key={factory.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-medium text-emerald-800">
                    {factory.id}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{factory.name}</div>
                    <div className="text-[10px] text-slate-500">Cap: {factory.capacity}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{factory.location}</td>
                  <td className="py-3 px-4 text-slate-600">{factory.industry}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{factory.owner_name}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900">{factory.kpis.running_machines}</span>
                    <span className="text-slate-400">/{factory.kpis.total_machines}</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-800">
                    {factory.kpis.oee}%
                  </td>
                  <td className="py-3 px-4">
                    {factory.kpis.active_incidents > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {factory.kpis.active_incidents} active
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">
                    {factory.kpis.open_work_orders} open
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={factory.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {factory.last_activity}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => navigate(`/super-admin/factories/${factory.id}`)}
                        className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-2xs flex items-center gap-1"
                        title="Inspect factory overview & records"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => navigate(`/super-admin/users?factory=${factory.id}`)}
                        className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium text-xs transition-colors shadow-2xs flex items-center gap-1"
                        title="View users belonging to this factory"
                      >
                        <Users className="w-3 h-3 text-slate-500" />
                        <span>Users</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
