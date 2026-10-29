import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { FactoryLocation, AttendanceRecord, AttendanceAuditLog, AttendanceSummaryKPIs } from '../types';
import {
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Building2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Navigation,
  Search,
  Filter,
  Users,
  FileText,
  Send,
  Loader2
} from 'lucide-react';

export const AttendanceHubPage: React.FC = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER_SUPERVISOR' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<'my' | 'team' | 'admin'>('my');

  // Personal state
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [factoryLocation, setFactoryLocation] = useState<FactoryLocation | null>(null);
  const [loadingMy, setLoadingMy] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Absence modal
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('Sick Leave');
  const [absenceNotes, setAbsenceNotes] = useState('');

  // Team & Admin State
  const [adminRecords, setAdminRecords] = useState<AttendanceRecord[]>([]);
  const [adminKPIs, setAdminKPIs] = useState<AttendanceSummaryKPIs | null>(null);
  const [auditLogs, setAuditLogs] = useState<AttendanceAuditLog[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // Geofence Config State
  const [geoLat, setGeoLat] = useState<number>(17.4435);
  const [geoLng, setGeoLng] = useState<number>(78.3772);
  const [geoAddress, setGeoAddress] = useState<string>('');
  const [savingLocation, setSavingLocation] = useState(false);

  // Fetch Personal Attendance
  const fetchMyData = async () => {
    try {
      setLoadingMy(true);
      const [myRes, locRes] = await Promise.all([
        api.attendance.getMyAttendance(),
        api.attendance.getFactoryLocation()
      ]);
      setMyRecords(myRes.records);
      setTodayRecord(myRes.todayRecord);
      setFactoryLocation(locRes);
      setGeoLat(locRes.latitude);
      setGeoLng(locRes.longitude);
      setGeoAddress(locRes.address || '');
    } catch (err: any) {
      console.error('Error fetching personal attendance:', err);
    } finally {
      setLoadingMy(false);
    }
  };

  // Fetch Admin / Team Attendance
  const fetchAdminData = async () => {
    try {
      setLoadingAdmin(true);
      if (isAdmin) {
        const res = await api.attendance.getAdminAttendance({ date: filterDate });
        setAdminRecords(res.records);
        setAdminKPIs(res.kpis);
        setAuditLogs(res.auditLogs);
      } else if (isManager) {
        const res = await api.attendance.getManagerAttendance({ date: filterDate });
        setAdminRecords(res.records);
        setAdminKPIs({
          totalExpected: res.kpis.totalTeamTechnicians,
          presentToday: res.kpis.presentToday,
          absentToday: res.kpis.absentToday,
          attendanceRatePct: res.kpis.attendanceRatePct,
          onTimeCheckIns: res.kpis.presentToday
        });
      }
    } catch (err: any) {
      console.error('Error fetching admin attendance:', err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    fetchMyData();
  }, []);

  useEffect(() => {
    if (activeTab === 'admin' || activeTab === 'team') {
      fetchAdminData();
    }
  }, [activeTab, filterDate]);

  // Trigger GPS Check-In
  const handleGPSCheckIn = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setCheckingIn(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentCoords({ lat, lng });

        try {
          const res = await api.attendance.checkIn({ latitude: lat, longitude: lng });
          setTodayRecord(res.record);
          fetchMyData();
        } catch (err: any) {
          setGpsError(err.message || 'Check-in failed');
        } finally {
          setCheckingIn(false);
        }
      },
      err => {
        setCheckingIn(false);
        setGpsError(`GPS Access Error: ${err.message}. Please enable location permissions in browser.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Submit Absence
  const handleReportAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.attendance.reportAbsence({
        date: today,
        reason: absenceReason,
        notes: absenceNotes
      });
      setTodayRecord(res.record);
      setIsAbsenceModalOpen(false);
      fetchMyData();
    } catch (err: any) {
      alert(err.message || 'Failed to report absence');
    }
  };

  // Save Factory Geofence Location
  const handleSaveGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLocation(true);
    try {
      await api.attendance.setFactoryLocation({
        latitude: geoLat,
        longitude: geoLng,
        address: geoAddress
      });
      alert('Factory 1km Geofence location updated successfully!');
      fetchMyData();
    } catch (err: any) {
      alert(err.message || 'Failed to save factory location');
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto font-sans text-[#191923]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#191923] flex items-center gap-3">
            <UserCheck className="w-6 h-6 text-[#0E79B2]" />
            Attendance & Geofence Verification Center
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Employee attendance, GPS verification, absence tracking, and team auditing.
          </p>
        </div>

        {/* Light Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'my'
                ? 'bg-white text-[#191923] shadow-2xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Check-In & History
          </button>

          {isManager && (
            <button
              onClick={() => setActiveTab('team')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'team'
                  ? 'bg-white text-[#191923] shadow-2xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Team Attendance
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-white text-[#191923] shadow-2xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin Geofence & Audit
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: MY CHECK-IN & HISTORY */}
      {activeTab === 'my' && (
        <div className="space-y-6">
          {/* Today's Attendance Card */}
          <div className="bg-white border border-[#191923]/10 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-[#0E79B2] uppercase tracking-wider">Today's Attendance</span>
                <h2 className="text-lg sm:text-xl font-bold text-[#191923] mt-0.5">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
              </div>

              {todayRecord ? (
                <div className="flex items-center gap-3">
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border ${
                      todayRecord.status === 'Present'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {todayRecord.status === 'Present' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-amber-600" />
                    )}
                    <span>Status: {todayRecord.status.toUpperCase()}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleGPSCheckIn}
                    disabled={checkingIn}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Navigation className={`w-4 h-4 ${checkingIn ? 'animate-spin' : ''}`} />
                    <span>{checkingIn ? 'Verifying GPS Location...' : 'Mark Present (GPS Check-In)'}</span>
                  </button>

                  <button
                    onClick={() => setIsAbsenceModalOpen(true)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Report Absence
                  </button>
                </div>
              )}
            </div>

            {/* Error or Distance details */}
            {gpsError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{gpsError}</span>
              </div>
            )}

            {factoryLocation && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block font-medium">Assigned Factory Geofence</span>
                  <span className="text-slate-900 font-bold flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-[#0E79B2]" /> {factoryLocation.address || 'Austin Gigafactory'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block font-medium">Boundary Distance Constraint</span>
                  <span className="text-emerald-700 font-bold font-mono mt-0.5 block">
                    Within 1.0 km (1,000 meters)
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block font-medium">Verification Protocol</span>
                  <span className="text-slate-800 font-semibold flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Hardware Geofence Lock
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Personal History Table (15 records visible with sticky header) */}
          <div className="bg-white border border-[#191923]/10 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[#191923] flex items-center gap-2 uppercase tracking-wide">
              <Clock className="w-4 h-4 text-[#0E79B2]" />
              Personal Attendance History Log
            </h3>

            <div className="overflow-x-auto min-w-[700px]">
              <div className="overflow-y-auto max-h-[615px] border border-slate-200 rounded-lg relative">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 bg-slate-100">Date</th>
                      <th className="py-2.5 px-4 bg-slate-100">Check-In Time</th>
                      <th className="py-2.5 px-4 bg-slate-100">Status</th>
                      <th className="py-2.5 px-4 bg-slate-100">GPS Distance</th>
                      <th className="py-2.5 px-4 bg-slate-100">Verification Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {myRecords.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors h-[41px]">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{r.attendance_date}</td>
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-700">{r.check_in_time}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                              r.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">
                          {r.distance_meters !== null ? `${r.distance_meters} m` : 'N/A'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.verification_notes || r.verification_method}
                        </td>
                      </tr>
                    ))}
                    {myRecords.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          No personal attendance records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {myRecords.length > 0 && (
                    <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-bold text-xs text-slate-800 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-slate-600 bg-slate-50">
                          Total Personal Logs Recorded: {myRecords.length}
                        </td>
                        <td colSpan={2} className="py-2.5 px-4 text-right text-emerald-700 bg-slate-50">
                          Verified Present Rate: {Math.round((myRecords.filter(r => r.status === 'Present').length / Math.max(1, myRecords.length)) * 100)}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2 & 3: TEAM / ADMIN ATTENDANCE */}
      {(activeTab === 'team' || activeTab === 'admin') && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          {adminKPIs && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-[#191923]/10 rounded-xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Expected Workforce</span>
                <div className="text-2xl font-bold text-[#191923] font-mono mt-1">{adminKPIs.totalExpected}</div>
              </div>

              <div className="bg-white border border-[#191923]/10 rounded-xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Verified Present Today</span>
                <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">{adminKPIs.presentToday}</div>
              </div>

              <div className="bg-white border border-[#191923]/10 rounded-xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Reported Absences</span>
                <div className="text-2xl font-bold text-amber-600 font-mono mt-1">{adminKPIs.absentToday}</div>
              </div>

              <div className="bg-white border border-[#191923]/10 rounded-xl p-4 shadow-xs">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Attendance Rate</span>
                <div className="text-2xl font-bold text-[#0E79B2] font-mono mt-1">{adminKPIs.attendanceRatePct}%</div>
              </div>
            </div>
          )}

          {/* Admin Geofence Configuration Box */}
          {activeTab === 'admin' && isAdmin && (
            <div className="bg-white border border-[#191923]/10 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#191923] flex items-center gap-2 uppercase tracking-wide">
                <MapPin className="w-4 h-4 text-[#0E79B2]" />
                Factory GPS Geofence Coordinate Configuration
              </h3>

              <form onSubmit={handleSaveGeofence} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Factory Center Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={geoLat}
                    onChange={e => setGeoLat(parseFloat(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-mono focus:ring-1 focus:ring-[#0E79B2]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Factory Center Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={geoLng}
                    onChange={e => setGeoLng(parseFloat(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-mono focus:ring-1 focus:ring-[#0E79B2]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Plant Premises Address</label>
                  <input
                    type="text"
                    required
                    value={geoAddress}
                    onChange={e => setGeoAddress(e.target.value)}
                    placeholder="e.g. Austin Gigafactory, Industrial Pkwy"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-1 focus:ring-[#0E79B2]"
                  />
                </div>

                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingLocation}
                    className="px-4 py-2 bg-[#0E79B2] hover:bg-[#0c6799] text-white font-bold rounded-lg shadow-2xs transition-colors text-xs cursor-pointer"
                  >
                    {savingLocation ? 'Updating Geofence...' : 'Update Factory 1km Geofence'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Records Table (15 records visible with sticky header) */}
          <div className="bg-white border border-[#191923]/10 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-[#191923] flex items-center gap-2 uppercase tracking-wide">
                <Users className="w-4 h-4 text-[#0E79B2]" />
                Workforce Attendance Verification Records
              </h3>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-semibold">Filter Date:</span>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono font-semibold"
                />
              </div>
            </div>

            <div className="overflow-x-auto min-w-[700px]">
              <div className="overflow-y-auto max-h-[615px] border border-slate-200 rounded-lg relative">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 bg-slate-100">Employee</th>
                      <th className="py-2.5 px-4 bg-slate-100">Role</th>
                      <th className="py-2.5 px-4 bg-slate-100">Date</th>
                      <th className="py-2.5 px-4 bg-slate-100">Check-In Time</th>
                      <th className="py-2.5 px-4 bg-slate-100">Status</th>
                      <th className="py-2.5 px-4 bg-slate-100">GPS Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {adminRecords.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors h-[41px]">
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900">{r.user_name}</div>
                          <div className="text-[10.5px] text-slate-400">{r.user_email}</div>
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-700">{r.user_role}</td>
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-800">{r.attendance_date}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{r.check_in_time}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                              r.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.verification_notes || r.verification_method}
                        </td>
                      </tr>
                    ))}
                    {adminRecords.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          No team attendance records found for this date.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {adminRecords.length > 0 && (
                    <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-bold text-xs text-slate-800 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-slate-600 bg-slate-50">
                          Total Workforce Records: {adminRecords.length}
                        </td>
                        <td colSpan={3} className="py-2.5 px-4 text-right text-[#0E79B2] bg-slate-50">
                          Present Today: {adminRecords.filter(r => r.status === 'Present').length} | Absences: {adminRecords.filter(r => r.status === 'Absent').length}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Absence Modal */}
      {isAbsenceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <h2 className="text-base font-bold text-[#191923] flex items-center gap-2 uppercase tracking-wide border-b border-slate-100 pb-3">
              <XCircle className="w-5 h-5 text-amber-600" />
              Report Employee Absence
            </h2>

            <form onSubmit={handleReportAbsence} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Absence Reason *</label>
                <select
                  value={absenceReason}
                  onChange={e => setAbsenceReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-medium focus:ring-1 focus:ring-[#0E79B2]"
                >
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Off-Site Duty">Off-Site Duty</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Absence Explanation / Notes</label>
                <textarea
                  rows={3}
                  value={absenceNotes}
                  onChange={e => setAbsenceNotes(e.target.value)}
                  placeholder="Provide additional details or supervisor notification notes..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-[#0E79B2]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAbsenceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  Submit Absence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceHubPage;
