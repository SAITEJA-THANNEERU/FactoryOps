import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { api } from '../services/api.ts';
import type { AttendanceRecord } from '../types/index.ts';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldCheck,
  UserCheck,
  Filter,
  RefreshCw,
  Wrench
} from 'lucide-react';

export const ManagerAttendancePage: React.FC = () => {
  const { user, activeFactory } = useAuth();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [kpis, setKpis] = useState<{
    totalTeamTechnicians: number;
    presentToday: number;
    absentToday: number;
    attendanceRatePct: number;
  }>({
    totalTeamTechnicians: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRatePct: 0
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTechnician, setSearchTechnician] = useState<string>('');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Month navigation
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.attendance.getManagerAttendance({
        status: filterStatus === 'ALL' ? undefined : filterStatus,
        employee: searchTechnician.trim() || undefined,
        date: selectedDateFilter || undefined
      });

      const verifiedTeamRecords = data.records.filter(
        r => r.user_role === 'TECHNICIAN' || r.user_role === 'OPERATOR' || r.user_role === 'PRODUCTION_PLANNER'
      );

      setRecords(verifiedTeamRecords);
      setKpis(data.kpis);
    } catch (err: any) {
      console.error('Failed to load manager attendance records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, selectedDateFilter]);

  // Calendar generation for Manager (Technicians Only)
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-[#0E79B2]" />
            <h1 className="text-2xl font-bold text-[#191923] tracking-tight">
              Technician Attendance Calendar
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisor overview of plant maintenance team attendance & GPS geofence verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Scope: Technician Team Only</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-slate-400 text-xs font-semibold">Assigned Technicians</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
            {kpis.totalTeamTechnicians}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Maintenance Crew</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-emerald-700 text-xs font-semibold">Present Today</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1 font-mono">
            {kpis.presentToday}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">On Plant Floor</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-rose-700 text-xs font-semibold">Absent Today</div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1 font-mono">
            {kpis.absentToday}
          </div>
          <div className="text-[10px] text-rose-600 mt-0.5">Reported Absence</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="text-[#0E79B2] text-xs font-semibold">Turnout Rate</div>
          <div className="text-2xl font-extrabold text-[#0E79B2] mt-1 font-mono">
            {kpis.attendanceRatePct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Team Attendance</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0 sm:min-w-[240px]">
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

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTechnician}
              onChange={e => setSearchTechnician(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadData()}
              placeholder="Filter by technician name..."
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
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Technician Calendar & Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Technician Calendar */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#0E79B2]" />
              <h2 className="text-base font-bold text-[#191923]">Monthly Team Calendar</h2>
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
                        <span className="text-[9px] text-slate-300 italic block mt-2 text-center">Off</span>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Technician Attendance Records */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-[#191923]">Technician Check-Ins</h3>
              <p className="text-[11px] text-slate-500">
                {selectedDateFilter ? `Date: ${selectedDateFilter}` : 'Recent team attendance'}
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              {records.length} logs
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {records.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No technician attendance records found for this period.
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
                    <span className="font-mono text-[10px]">Technician</span>
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

      {/* Record Inspector Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#0E79B2]" />
                <h3 className="font-bold text-slate-900">Technician Attendance Record</h3>
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
                <span className="text-slate-500 font-medium">Technician Name</span>
                <span className="font-bold text-slate-900">{selectedRecord.user_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Email</span>
                <span className="font-mono text-slate-800">{selectedRecord.user_email}</span>
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
              {selectedRecord.distance_meters !== null && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Geofence Distance</span>
                  <span className="font-mono font-bold text-emerald-700">{selectedRecord.distance_meters}m from factory center</span>
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
    </div>
  );
};
