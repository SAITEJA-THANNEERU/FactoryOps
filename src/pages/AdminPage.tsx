import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useRouter } from '../contexts/RouterContext.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { api } from '../services/api.ts';
import type { FactoryLocation } from '../types/index.ts';
import { LocationMapModal } from '../components/attendance/LocationMapModal.tsx';
import { AddPersonnelModal } from '../components/AddPersonnelModal.tsx';
import { SystemAuditLogView } from '../components/SystemAuditLogView.tsx';
import {
  Settings,
  Users,
  Building2,
  Info,
  MapPin,
  CalendarCheck,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Database,
  RefreshCw,
  UserPlus,
  Trash2,
  AlertCircle
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user, activeFactory } = useAuth();
  const { navigate } = useRouter();
  const { syncSupabase } = useData();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [factoryLocation, setFactoryLocation] = useState<FactoryLocation | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'FACTORY_OWNER' || user?.role === 'SUPER_ADMIN';
  const isManager = user?.role === 'FACTORY_MANAGER' || user?.role === 'MANAGER_SUPERVISOR';

  const loadData = () => {
    api.users.getAll().then(setUsersList).catch(() => {});
    api.attendance.getFactoryLocation()
      .then(loc => setFactoryLocation(loc))
      .catch(() => {});
    api.system.getStatus()
      .then(setDbStatus)
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncSupabase();
      setSyncFeedback({
        success: res.success,
        message: res.message || 'Synchronization completed',
        details: res.details
      });
      loadData();
    } catch (err: any) {
      setSyncFeedback({
        success: false,
        message: err.message || 'Sync failed'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === user?.id) {
      alert('You cannot delete your own active account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove user "${name}" from the factory roster?`)) {
      return;
    }

    setDeletingUserId(id);
    try {
      await api.users.delete(id);
      setUsersList(prev => prev.filter(u => u.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to remove user');
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          <span>Plant Administration & Database Operations</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tenant identity, persistent database sync, plant telemetry settings, and access control
        </p>
      </div>

      {/* Role permission notice if Factory Manager */}
      {isManager && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-950">Factory Manager Role (Restricted Administrative Scope)</h4>
            <p className="text-amber-800 mt-0.5">
              As a Factory Manager, you have operational read and write privileges over machines, production logs, work orders, and incidents. However, global tenant configurations, tenant deletion, and administrative credentials are reserved for the <strong>Factory Owner</strong> and <strong>Super Admin</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Database Synchronization Status Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Database Synchronization & Cloud Storage</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dual-write architecture syncing Supabase PostgreSQL cloud tables and server persistent storage
            </p>
          </div>
          <button
            onClick={handleSyncToSupabase}
            disabled={isSyncing || !isAdmin}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
              isAdmin
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Tables...' : 'Sync to Supabase Cloud'}</span>
          </button>
        </div>

        {syncFeedback && (
          <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
            syncFeedback.success
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border border-amber-200 text-amber-900'
          }`}>
            {syncFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{syncFeedback.message}</p>
              {syncFeedback.details && (
                <p className="text-[11px] opacity-80 mt-0.5">
                  Synced: {JSON.stringify(syncFeedback.details)}
                </p>
              )}
            </div>
          </div>
        )}

        {!dbStatus?.hasServiceRoleKey && (
          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-950">Supabase Cloud Direct Write & RLS Configuration</h4>
                <p className="text-blue-800 mt-0.5 text-[11px] leading-relaxed">
                  The application is currently communicating with Supabase using your <strong>anon publishable key</strong>. Because Row Level Security (RLS) is active on PostgreSQL tables without public write permissions, database mutations are securely stored in the server's persistent disk store as a safe fallback.
                </p>
                <div className="mt-2 text-[11px] text-blue-950 bg-white/70 rounded-md p-2.5 border border-blue-200 space-y-1">
                  <span className="font-semibold block text-slate-900">How to activate direct Supabase Cloud writes:</span>
                  <ol className="list-decimal ml-4 space-y-1 text-slate-800">
                    <li>Copy your <strong>service_role (secret)</strong> key from Supabase Dashboard (<span className="font-mono text-[10px]">Project Settings &gt; API &gt; Project API Keys</span>).</li>
                    <li>Configure <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900">SUPABASE_SERVICE_ROLE_KEY=your_secret_key</code> on the server (in your <code className="font-mono">.env</code> file).</li>
                    <li>Execute <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900">supabase-rls-setup.sql</code> in the Supabase SQL Editor to establish foreign key entities.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium block">Supabase Connection:</span>
            <div className="flex items-center gap-1.5 mt-1 font-semibold text-slate-800">
              <span className={`w-2 h-2 rounded-full ${dbStatus?.isSupabaseHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="truncate">{dbStatus?.supabaseUrl ? 'fnkldnopljxbmsoofhzh.supabase.co' : 'Configured'}</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Role: {dbStatus?.hasServiceRoleKey ? 'Service Role (Full Access)' : 'Anon (Publishable / RLS Protected)'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium block">Data Storage Architecture:</span>
            <span className="font-semibold text-slate-800 mt-1 block">
              Supabase + File Persistent Store
            </span>
            <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
              Survives restarts & server reloads
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium block">Active Operational Records:</span>
            <span className="font-mono text-slate-800 font-semibold mt-1 block">
              {dbStatus?.activeCounts?.machines ?? 0} machines • {dbStatus?.activeCounts?.work_orders ?? 0} WOs • {dbStatus?.activeCounts?.incidents ?? 0} inc
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Production: {dbStatus?.activeCounts?.production_records ?? 0} | Maint: {dbStatus?.activeCounts?.maintenance_records ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Factory Profile Details */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Plant Profile Information</span>
          </h2>
          <span className="font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {activeFactory?.factory_code}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500">Factory Name:</span>
            <p className="text-slate-900 font-semibold mt-0.5">{activeFactory?.name}</p>
          </div>
          <div>
            <span className="text-slate-500">Location:</span>
            <p className="text-slate-900 font-semibold mt-0.5">{activeFactory?.location}</p>
          </div>
          <div>
            <span className="text-slate-500">Industry Sector:</span>
            <p className="text-slate-900 font-semibold mt-0.5">{activeFactory?.industry}</p>
          </div>
          <div>
            <span className="text-slate-500">Plant Owner:</span>
            <p className="text-slate-900 font-semibold mt-0.5">{activeFactory?.owner_name}</p>
          </div>
          <div>
            <span className="text-slate-500">Rated Monthly Capacity:</span>
            <p className="text-slate-900 font-semibold mt-0.5">{activeFactory?.capacity}</p>
          </div>
          <div>
            <span className="text-slate-500">Year Established:</span>
            <p className="text-slate-900 font-semibold mt-0.5">{activeFactory?.established_year}</p>
          </div>
        </div>
      </div>

      {/* Attendance & Geofencing Management */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Attendance Management & 1 km Factory Geofence</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure factory GPS boundary coordinates. Technicians, Planners, and Managers must be within 1,000 meters to check in.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLocationModalOpen(true)}
              disabled={!isAdmin}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors ${
                isAdmin
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title={isAdmin ? 'Set factory coordinates' : 'Only Admins can update factory location'}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Set Factory Location</span>
            </button>
            <button
              onClick={() => navigate('/admin-attendance')}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Attendance Hub</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {locationSuccess && (
          <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{locationSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
          <div>
            <span className="text-slate-500 block font-medium">Plant Geo Center:</span>
            <span className="text-slate-900 font-bold mt-0.5 block truncate">
              {factoryLocation?.address || activeFactory?.name || 'Hyderabad Plant'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">GPS Latitude:</span>
            <span className="font-mono text-slate-900 font-semibold mt-0.5 block">
              {factoryLocation?.latitude ? factoryLocation.latitude.toFixed(6) : '17.443500'}° N
            </span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">GPS Longitude:</span>
            <span className="font-mono text-slate-900 font-semibold mt-0.5 block">
              {factoryLocation?.longitude ? factoryLocation.longitude.toFixed(6) : '78.377200'}° E
            </span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Attendance Radius:</span>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded text-[11px] mt-0.5 border border-emerald-300">
              <ShieldCheck className="w-3 h-3" />
              {factoryLocation?.radius_meters || 1000} meters (1.0 km)
            </span>
          </div>
        </div>
      </div>

      {/* Local Plant Users Roster with Full CRUD */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Authorized Plant Personnel ({usersList.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Role-based accounts with secure cryptographic authentication
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Personnel</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                {isAdmin && <th className="py-2.5 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {usersList.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-emerald-700 font-medium">Active</td>
                  {isAdmin && (
                    <td className="py-2.5 px-3 text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          disabled={deletingUserId === u.id}
                          title="Remove user account"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Audit Logs View */}
      <SystemAuditLogView />

      {/* Set Factory Location Modal */}
      {isLocationModalOpen && (
        <LocationMapModal
          isOpen={isLocationModalOpen}
          currentLocation={factoryLocation}
          onClose={() => setIsLocationModalOpen(false)}
          onLocationSaved={(newLoc) => {
            setFactoryLocation(newLoc);
            setLocationSuccess(`Factory GPS coordinates updated to ${newLoc.latitude.toFixed(6)}, ${newLoc.longitude.toFixed(6)} with 1 km geofence.`);
            setTimeout(() => setLocationSuccess(null), 5000);
          }}
        />
      )}

      {/* Add Personnel Modal */}
      {isAddUserModalOpen && (
        <AddPersonnelModal
          isOpen={isAddUserModalOpen}
          onClose={() => setIsAddUserModalOpen(false)}
          factoryId={activeFactory?.id}
          onUserAdded={(newUser) => {
            setUsersList(prev => [...prev, newUser]);
          }}
        />
      )}
    </div>
  );
};
