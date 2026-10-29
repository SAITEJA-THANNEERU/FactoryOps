import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { api } from '../services/api.ts';
import type { AttendanceRecord, FactoryLocation, AttendanceAuditLog, AttendanceSummaryKPIs } from '../types/index.ts';
import { LocationMapModal } from '../components/attendance/LocationMapModal.tsx';
import {
  Calendar as CalendarIcon,
  MapPin,
  CheckCircle2,
  XCircle,
  Download,
  Filter,
  Search,
  Building2,
  Users,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Clock,
  Settings,
  PlusCircle,
  FileText,
  UserCheck,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export const AdminAttendancePage: React.FC = () => {
  const { user, activeFactory } = useAuth();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [kpis, setKpis] = useState<AttendanceSummaryKPIs>({
    totalExpected: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRatePct: 0,
    onTimeCheckIns: 0
  });
  const [auditLogs, setAuditLogs] = useState<AttendanceAuditLog[]>([]);
  const [factoryLocation, setFactoryLocation] = useState<FactoryLocation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchEmployee, setSearchEmployee] = useState<string>('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');

  // Modals
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);

  // Manual Exception Form state
  const [manualUserId, setManualUserId] = useState<string>('USR-012');
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualStatus, setManualStatus] = useState<'Present' | 'Absent'>('Present');
  const [manualReason, setManualReason] = useState<string>('Device GPS Hardware Failure');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [isSubmittingException, setIsSubmittingException] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Calendar month state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [attData, locData] = await Promise.all([
        api.attendance.getAdminAttendance({
          role: filterRole === 'ALL' ? undefined : filterRole,
          status: filterStatus === 'ALL' ? undefined : filterStatus,
          employee: searchEmployee.trim() || undefined,
          date: selectedDateFilter || undefined
        }),
        api.attendance.getFactoryLocation()
      ]);

      setRecords(attData.records);
      setKpis(attData.kpis);
      setAuditLogs(attData.auditLogs || []);
      setFactoryLocation(locData);
    } catch (err: any) {
      console.error('Failed to load admin attendance records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterRole, filterStatus, selectedDateFilter]);

  // Calendar generation for Admin
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; dayRecords: AttendanceRecord[]; isSunday: boolean }[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ dateStr: '', dayNum: 0, isCurrentMonth: false, dayRecords: [], isSunday: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const isSunday = dateObj.getDay() === 0;
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const dayRecords = records.filter(r => r.attendance_date === dateStr);

      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        dayRecords,
        isSunday
      });
    }

    return days;
  }, [currentDate, records]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      'Attendance Date',
      'Employee Name',
      'Employee Email',
      'Role',
      'Status',
      'Check-In Time',
      'GPS Distance (m)',
      'Verified',
      'Method',
      'Absence Reason',
      'Notes'
    ];

    const rows = records.map(r => [
      r.attendance_date,
      `"${r.user_name}"`,
      r.user_email,
      r.user_role,
      r.status,
      r.check_in_time,
      r.distance_meters !== null ? r.distance_meters : 'N/A',
      r.is_verified ? 'Yes' : 'No',
      r.verification_method,
      r.absence_reason || 'N/A',
      `"${(r.verification_notes || r.absence_notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FactoryOps_Attendance_${activeFactory?.id || 'APX'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit Manual Exception
  const handleSaveManualException = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingException(true);
    try {
      await api.attendance.createManualException({
        user_id: manualUserId,
        attendance_date: manualDate,
        status: manualStatus,
        reason: manualReason,
        notes: manualNotes.trim() || undefined
      });

      setIsManualModalOpen(false);
      setManualNotes('');
      setActionNotice(`Manual exception recorded and audited for ${manualDate}.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit manual exception.');
    } finally {
      setIsSubmittingException(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#0E79B2]" />
            <h1 className="text-2xl font-bold text-[#191923] tracking-tight">
              Attendance Management & Geofence Control
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin multi-role attendance calendar, 1 km geofence configuration, and audited exceptions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Set Factory Location Button */}
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0E79B2] hover:bg-[#0c6799] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>Set Factory Location</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Manual Exception</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Geofence Status Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
              Active Geofence Boundary
            </span>
          </div>
          <h3 className="text-base font-bold text-white">
            {activeFactory?.name || 'Apex Precision Manufacturing'} (1,000 m / 1.0 km radius)
          </h3>
          <p className="text-xs text-slate-300">
            {factoryLocation?.address || 'Sanath Nagar Industrial Estate, Hyderabad, Telangana'} • Center: ({factoryLocation?.latitude?.toFixed(4) || '17.4435'}, {factoryLocation?.longitude?.toFixed(4) || '78.3772'})
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsLocationModalOpen(true)}
          className="self-start sm:self-auto px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Update Location Coordinates
        </button>
      </div>

      {/* Attendance Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-slate-400 text-xs font-semibold">Total Expected</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
            {kpis.totalExpected}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active Workforce</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-emerald-700 text-xs font-semibold">Present Today</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1 font-mono">
            {kpis.presentToday}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">GPS Geofence Verified</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-rose-700 text-xs font-semibold">Absent Today</div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1 font-mono">
            {kpis.absentToday}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5">Reported Leaves</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-[#0E79B2] text-xs font-semibold">Attendance Rate</div>
          <div className="text-2xl font-extrabold text-[#0E79B2] mt-1 font-mono">
            {kpis.attendanceRatePct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Floor Turnout</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-indigo-700 text-xs font-semibold">On-Time Shift Starts</div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-1 font-mono">
            {kpis.onTimeCheckIns}
          </div>
          <div className="text-[10px] text-indigo-600 mt-0.5">Before 08:30 AM</div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Role:</span>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-hidden focus:border-[#0E79B2]"
            >
              <option value="ALL">All Operational Roles</option>
              <option value="TECHNICIAN">Technicians Only</option>
              <option value="PRODUCTION_PLANNER">Production Planners Only</option>
              <option value="MANAGER_SUPERVISOR">Managers / Supervisors Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-hidden focus:border-[#0E79B2]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Present">Present (Verified)</option>
              <option value="Absent">Absent (Reported Leave)</option>
            </select>
          </div>

          {/* Employee Name Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchEmployee}
              onChange={e => setSearchEmployee(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadData()}
              placeholder="Search employee name or email..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:border-[#0E79B2]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedDateFilter && (
            <button
              onClick={() => setSelectedDateFilter('')}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md font-medium"
            >
              Clear Date Filter ({selectedDateFilter})
            </button>
          )}

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Refresh Attendance Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content: Admin Interactive Calendar & Employee Attendance Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Monthly Calendar */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#0E79B2]" />
              <h2 className="text-base font-bold text-[#191923]">Admin Monthly Attendance Calendar</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-xs text-slate-800 min-w-[130px] text-center">
                {monthName}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Click on any date to filter the employee roster to that specific day.
          </p>

          {/* Calendar Grid */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-100/80 border-b border-slate-200 text-center text-[11px] font-bold text-slate-600 py-2">
              <span className="text-rose-600">Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-white">
              {calendarDays.map((day, idx) => {
                if (!day.isCurrentMonth) {
                  return <div key={idx} className="h-20 bg-slate-50/50" />;
                }

                const isToday = day.dateStr === todayStr;
                const isSelected = selectedDateFilter === day.dateStr;
                const presentCount = day.dayRecords.filter(r => r.status === 'Present').length;
                const absentCount = day.dayRecords.filter(r => r.status === 'Absent').length;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDateFilter(day.dateStr === selectedDateFilter ? '' : day.dateStr)}
                    className={`h-20 p-1.5 relative transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-100/60 ring-2 ring-[#0E79B2] ring-inset'
                        : isToday
                        ? 'bg-blue-50/30'
                        : 'hover:bg-slate-50'
                    } ${day.isSunday ? 'bg-slate-50/40' : ''}`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${isSelected ? 'text-[#0E79B2] font-bold' : isToday ? 'text-[#0E79B2] font-bold' : day.isSunday ? 'text-slate-400' : 'text-slate-700'}`}>
                        {day.dayNum}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-bold uppercase text-[#0E79B2]">Today</span>
                      )}
                    </div>

                    {day.dayRecords.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {presentCount > 0 && (
                          <div className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold truncate flex items-center justify-between">
                            <span>Present</span>
                            <span className="font-mono">{presentCount}</span>
                          </div>
                        )}
                        {absentCount > 0 && (
                          <div className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold truncate flex items-center justify-between">
                            <span>Absent</span>
                            <span className="font-mono">{absentCount}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      !day.isSunday && day.dateStr < todayStr && (
                        <span className="text-[9px] text-slate-300 italic block mt-2 text-center">No logs</span>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Employee Level Attendance Details Roster */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#191923]">Employee Records</h3>
              <p className="text-[11px] text-slate-500">
                {selectedDateFilter ? `Filtered by ${selectedDateFilter}` : 'Showing all recent check-ins'}
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {records.length} logs
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {records.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No attendance records match the selected criteria.
              </div>
            ) : (
              records.map(record => (
                <div
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                    selectedRecord?.id === record.id
                      ? 'border-[#0E79B2] bg-blue-50/70 ring-1 ring-[#0E79B2]'
                      : 'border-slate-200 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-900 truncate max-w-[160px]">{record.user_name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        record.status === 'Present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 font-mono text-[10px] text-slate-700">
                      {record.user_role === 'TECHNICIAN' ? 'Technician' :
                       record.user_role === 'PRODUCTION_PLANNER' ? 'Planner' :
                       record.user_role === 'MANAGER_SUPERVISOR' ? 'Manager' : record.user_role}
                    </span>
                    <span>{record.attendance_date}</span>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="text-slate-500">Time: {record.check_in_time}</span>
                    {record.distance_meters !== null ? (
                      <span className="font-mono text-emerald-700 font-medium">
                        {record.distance_meters}m (verified)
                      </span>
                    ) : (
                      <span className="text-rose-700 font-medium">{record.absence_reason || 'Absent'}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Location Configuration Modal */}
      <LocationMapModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={factoryLocation}
        onLocationSaved={newLoc => {
          setFactoryLocation(newLoc);
          loadData();
        }}
      />

      {/* Record Inspector Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#0E79B2]" />
                <h3 className="font-bold text-slate-900">Employee Check-In Audit</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Employee Name</span>
                <span className="font-bold text-slate-900">{selectedRecord.user_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Corporate Email</span>
                <span className="font-mono text-slate-800">{selectedRecord.user_email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Role</span>
                <span className="font-semibold text-slate-800">{selectedRecord.user_role}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Attendance Date</span>
                <span className="font-bold text-slate-800">{selectedRecord.attendance_date}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Status</span>
                <span className={`font-bold px-2 py-0.5 rounded ${selectedRecord.status === 'Present' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {selectedRecord.status}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Check-In Time</span>
                <span className="font-mono font-semibold text-slate-800">{selectedRecord.check_in_time}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Verification Method</span>
                <span className="font-semibold text-slate-800">{selectedRecord.verification_method}</span>
              </div>
              {selectedRecord.distance_meters !== null && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Geofence Distance</span>
                  <span className="font-mono font-bold text-emerald-700">{selectedRecord.distance_meters}m from plant center (limit: 1000m)</span>
                </div>
              )}
              {selectedRecord.latitude !== null && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Device Coordinates</span>
                  <span className="font-mono text-slate-700">{selectedRecord.latitude}, {selectedRecord.longitude}</span>
                </div>
              )}
              {selectedRecord.verification_notes && (
                <div className="py-1">
                  <span className="text-slate-500 font-medium block mb-0.5">Verification Notes</span>
                  <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono text-[11px]">
                    {selectedRecord.verification_notes}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Manual Exception Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-[#191923] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#0E79B2]" />
                <h3 className="font-bold text-sm">Authorized Attendance Exception</h3>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualException} className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-500 text-[11px]">
                Admins may manually correct attendance records when verified GPS hardware fails. All corrections are logged with your administrative identity in the permanent audit trail.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Employee</label>
                <select
                  value={manualUserId}
                  onChange={e => setManualUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:border-[#0E79B2]"
                >
                  <option value="USR-012">Ramesh Varma (Technician)</option>
                  <option value="USR-015">Priya Sundaram (Production Planner)</option>
                  <option value="USR-007">Amit Deshmukh (Manager/Supervisor)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Attendance Date</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={e => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-hidden focus:border-[#0E79B2]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Corrected Status</label>
                <select
                  value={manualStatus}
                  onChange={e => setManualStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-hidden focus:border-[#0E79B2]"
                >
                  <option value="Present">Present (Verified Physical Attendance)</option>
                  <option value="Absent">Absent (Authorized Leave / Offsite)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Justification Reason</label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={e => setManualReason(e.target.value)}
                  placeholder="e.g. Device GPS Hardware Failure / Biometric Verification Passed"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-[#0E79B2]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Notes</label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  placeholder="Administrative authorization context..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:border-[#0E79B2]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingException}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0E79B2] hover:bg-[#0c6799] text-white font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <span>Submit Audited Correction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
