import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Bell,
  Clock,
  Database,
  Check,
  Save,
  Download
} from 'lucide-react';

export const SuperAdminSettingsPage: React.FC = () => {
  const [sessionTimeoutHours, setSessionTimeoutHours] = useState('24');
  const [syncIntervalSec, setSyncIntervalSec] = useState('30');
  const [criticalIncidentEscalation, setCriticalIncidentEscalation] = useState(true);
  const [auditLogRetentionDays, setAuditLogRetentionDays] = useState('90');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Global Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-tenant governance, security timeout configurations, and data pipeline policies
          </p>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Platform policies updated and synchronized successfully across all 5 tenant namespaces.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Security & Access Section */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Security & Multi-Tenant Session Control</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Session Inactivity Timeout (Hours)</label>
              <select
                value={sessionTimeoutHours}
                onChange={e => setSessionTimeoutHours(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-800 focus:outline-hidden focus:border-emerald-600"
              >
                <option value="8">8 Hours (Standard Single Shift)</option>
                <option value="12">12 Hours (Extended Shift)</option>
                <option value="24">24 Hours (Full Operational Day)</option>
                <option value="48">48 Hours (Weekend Coverage)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Bearer token lifetime issued via secure authentication</p>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Audit Log Retention Policy</label>
              <select
                value={auditLogRetentionDays}
                onChange={e => setAuditLogRetentionDays(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-800 focus:outline-hidden focus:border-emerald-600"
              >
                <option value="30">30 Days</option>
                <option value="90">90 Days (Recommended)</option>
                <option value="180">180 Days (Semi-Annual Audit)</option>
                <option value="365">365 Days (Annual Compliance)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Tenant incident and maintenance activity logs</p>
            </div>
          </div>
        </div>

        {/* Data Pipeline & Telemetry */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-900">Telemetry Ingestion & Edge Sync</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Dataset Telemetry Ingestion Frequency</label>
              <select
                value={syncIntervalSec}
                onChange={e => setSyncIntervalSec(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-slate-800 focus:outline-hidden focus:border-emerald-600"
              >
                <option value="10">10 Seconds (High Density)</option>
                <option value="30">30 Seconds (Default Balanced)</option>
                <option value="60">60 Seconds (Low Latency)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Critical Anomaly Notification Hook</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="notifHook"
                  checked={criticalIncidentEscalation}
                  onChange={e => setCriticalIncidentEscalation(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="notifHook" className="text-slate-800 font-medium cursor-pointer">
                  Auto-escalate Critical Incidents to Plant Owner & Super Admin
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Global Policies</span>
          </button>
        </div>
      </form>
    </div>
  );
};
