import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { useRouter } from '../../contexts/RouterContext.tsx';
import type { User, Factory } from '../../types/index.ts';
import {
  Users,
  Search,
  Filter,
  Eye,
  Mail,
  Building2,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

export const SuperAdminUsersPage: React.FC = () => {
  const { navigate } = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [factoryFilter, setFactoryFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('factory') || 'all';
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allUsers, allFactories] = await Promise.all([
        api.users.getAll(),
        api.factories.getAll()
      ]);
      setUsers(allUsers);
      setFactories(allFactories);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (factoryFilter !== 'all') {
      if (factoryFilter === 'global') {
        if (u.factory_id !== null) return false;
      } else if (u.factory_id !== factoryFilter) {
        return false;
      }
    }
    if (search) {
      const q = search.toLowerCase();
      const match =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.factory_name && u.factory_name.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading Tenant Users...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tenant Users Directory</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {filteredUsers.length} of {users.length} Users
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-tenant identity and role mapping across all connected factories
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Roster</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          {/* Search */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or plant..."
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Role:</span>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-emerald-600"
            >
              <option value="all">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="FACTORY_OWNER">Factory Owner</option>
              <option value="FACTORY_MANAGER">Factory Manager</option>
            </select>
          </div>

          {/* Factory Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Plant Tenant:</span>
            <select
              value={factoryFilter}
              onChange={e => setFactoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-700 focus:outline-hidden focus:border-emerald-600"
            >
              <option value="all">All Plants & Global</option>
              <option value="global">Global (Super Admin)</option>
              {factories.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setSearch('');
            setRoleFilter('all');
            setFactoryFilter('all');
          }}
          className="text-slate-500 hover:text-slate-800 text-xs font-medium"
        >
          Reset Filters
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Factory Tenant</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.map(user => {
                const isCopied = copiedEmail === user.email;
                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{user.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{user.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-700">{user.email}</span>
                        <button
                          onClick={() => handleCopy(user.email)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                          title="Copy Email"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          user.role === 'SUPER_ADMIN'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : user.role === 'FACTORY_OWNER'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {user.factory_id ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-900">{user.factory_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">({user.factory_id})</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-purple-700 font-medium italic">Global (All Plants)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {user.factory_id ? (
                        <button
                          onClick={() => navigate(`/super-admin/factories/${user.factory_id}`)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3 h-3 text-slate-600" />
                          <span>Inspect Plant</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs italic">System Admin</span>
                      )}
                    </td>
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
