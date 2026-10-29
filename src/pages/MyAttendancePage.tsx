import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { api } from '../services/api.ts';
import type { AttendanceRecord, FactoryLocation } from '../types/index.ts';
import {
  MapPin,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Navigation,
  Loader2,
  ShieldCheck,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
  UserCheck,
  AlertCircle,
  HelpCircle,
  Send,
  Building2,
  History
} from 'lucide-react';

export const MyAttendancePage: React.FC = () => {
  const { user, activeFactory } = useAuth();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [factoryLocation, setFactoryLocation] = useState<FactoryLocation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Absence reporting modal state
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState<boolean>(false);
  const [absenceDate, setAbsenceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [absenceReason, setAbsenceReason] = useState<string>('Sick Leave');
  const [absenceNotes, setAbsenceNotes] = useState<string>('');
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState<boolean>(false);
  const [absenceError, setAbsenceError] = useState<string | null>(null);

  // Selected record for detailed inspector
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Calendar month navigation
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [attData, locData] = await Promise.all([
        api.attendance.getMyAttendance(),
        api.attendance.getFactoryLocation()
      ]);
      setRecords(attData.records);
      setTodayRecord(attData.todayRecord);
      setFactoryLocation(locData);
    } catch (err: any) {
      console.error('Failed to load attendance records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Request GPS and Mark Present
  const handleMarkPresent = () => {
    setGpsError(null);
    setSuccessNotice(null);

    if (!('geolocation' in navigator)) {
      setGpsError('GPS Geolocation is not supported by your browser or device.');
      return;
    }

    setIsCheckingIn(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const latitude = Number(pos.coords.latitude.toFixed(6));
          const longitude = Number(pos.coords.longitude.toFixed(6));

          const res = await api.attendance.checkIn({ latitude, longitude });
          setTodayRecord(res.record);
          setRecords(prev => [res.record, ...prev.filter(r => r.id !== res.record.id)]);
          setSuccessNotice(
            `Attendance verified! Checked in at ${res.record.check_in_time} (${res.record.distance_meters}m from factory center).`
          );
        } catch (err: any) {
          setGpsError(err.message || 'Check-in failed. Please verify your location.');
        } finally {
          setIsCheckingIn(false);
        }
      },
      err => {
        setIsCheckingIn(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location permission denied. Please allow GPS access in your browser settings to verify attendance.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError('GPS position unavailable. Please check your network connection or device sensors.');
        } else if (err.code === err.TIMEOUT) {
          setGpsError('GPS request timed out. Please try again.');
        } else {
          setGpsError(`GPS Error: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Submit absence report
  const handleReportAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    setAbsenceError(null);
    setIsSubmittingAbsence(true);

    try {
      const res = await api.attendance.reportAbsence({
        date: absenceDate,
        reason: absenceReason,
        notes: absenceNotes.trim() || undefined
      });

      if (absenceDate === todayStr) {
        setTodayRecord(res.record);
      }
      setRecords(prev => [res.record, ...prev.filter(r => r.id !== res.record.id)]);
      setIsAbsenceModalOpen(false);
      setAbsenceNotes('');
      setSuccessNotice(`Absence report submitted for ${absenceDate} (${absenceReason}).`);
    } catch (err: any) {
      setAbsenceError(err.message || 'Failed to submit absence report.');
    } finally {
      setIsSubmittingAbsence(false);
    }
  };

  // Monthly Calendar Generation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; record?: AttendanceRecord; isSunday: boolean }[] = [];

    // Leading empty days from prev month
    for (let i = 0; i < firstDay; i++) {
      days.push({ dateStr: '', dayNum: 0, isCurrentMonth: false, isSunday: false });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const isSunday = dateObj.getDay() === 0;
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const record = records.find(r => r.attendance_date === dateStr);

      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        record,
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

  // Month Statistics
  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

    const monthRecords = records.filter(r => r.attendance_date.startsWith(prefix));
    const presentCount = monthRecords.filter(r => r.status === 'Present').length;
    const absentCount = monthRecords.filter(r => r.status === 'Absent').length;

    return {
      present: presentCount,
      absent: absentCount,
      total: presentCount + absentCount
    };
  }, [currentDate, records]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#0E79B2]" />
            <h1 className="text-2xl font-bold text-[#191923] tracking-tight">My Attendance</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Location-verified daily check-in, geofence radius status, and personal calendar
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAbsenceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Report Absence</span>
          </button>
        </div>
      </div>

      {/* Today's Check-In Hero Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#0E79B2]/5 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Left: Today's Status */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-4 h-4 text-[#0E79B2]" />
              <span className="font-semibold text-slate-800">
                Today: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-600">Attendance Status:</span>
              {todayRecord ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    todayRecord.status === 'Present'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {todayRecord.status === 'Present' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  )}
                  <span>{todayRecord.status}</span>
                  {todayRecord.status === 'Present' && <span>({todayRecord.check_in_time})</span>}
                  {todayRecord.status === 'Absent' && todayRecord.absence_reason && (
                    <span>• {todayRecord.absence_reason}</span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Not Marked Yet</span>
                </span>
              )}
            </div>

            {/* Geofence verification details */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#191923] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#0E79B2]" />
                  <span>Factory Location: {activeFactory?.name || 'Apex Precision Manufacturing'}</span>
                </span>
                <span className="font-mono text-[11px] font-bold bg-blue-100 text-[#0E79B2] px-2 py-0.5 rounded-full">
                  Geofence: 1.0 km (1,000m)
                </span>
              </div>

              {factoryLocation && (
                <p className="text-[11px] text-slate-500">
                  {factoryLocation.address || 'Designated industrial facility perimeter'} • Center: ({factoryLocation.latitude.toFixed(4)}, {factoryLocation.longitude.toFixed(4)})
                </p>
              )}

              {todayRecord?.is_verified && todayRecord.distance_meters !== null && (
                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 pt-1 border-t border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    GPS Distance Verified: {todayRecord.distance_meters} metres from center (Verification: {todayRecord.verification_method})
                  </span>
                </div>
              )}
            </div>

            {/* Error or Success alerts */}
            {gpsError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{gpsError}</span>
              </div>
            )}

            {successNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successNotice}</span>
              </div>
            )}
          </div>

          {/* Right: Check-In Action Button */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center space-y-3">
            {todayRecord ? (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-slate-900">Today's Record Submitted</div>
                <p className="text-[11px] text-slate-500">
                  Status: <strong className="text-slate-800">{todayRecord.status}</strong> recorded at {todayRecord.check_in_time}. Duplicate check-ins are prevented.
                </p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-[#0E79B2]/10 text-[#0E79B2] flex items-center justify-center mx-auto">
                  <Navigation className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#191923]">Ready to Check In?</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Your device will verify you are within 1 km of the plant.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleMarkPresent}
                  disabled={isCheckingIn}
                  className="w-full py-3 px-4 bg-[#0E79B2] hover:bg-[#0c6799] active:bg-[#0a5680] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCheckingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying GPS Location...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      <span>Mark Present (GPS Check-In)</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Monthly Calendar & Attendance History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Attendance Calendar */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#0E79B2]" />
              <h2 className="text-base font-bold text-[#191923]">Monthly Attendance Calendar</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title="Previous Month"
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
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Month Summary Bar */}
          <div className="flex items-center gap-4 text-xs font-semibold pb-1">
            <span className="text-slate-500">Month Summary:</span>
            <span className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Present: {monthStats.present}</span>
            </span>
            <span className="flex items-center gap-1.5 text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Absent: {monthStats.absent}</span>
            </span>
          </div>

          {/* Calendar Grid */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 bg-slate-100/80 border-b border-slate-200 text-center text-[11px] font-bold text-slate-600 py-2">
              <span className="text-rose-600">Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-white">
              {calendarDays.map((day, idx) => {
                if (!day.isCurrentMonth) {
                  return <div key={idx} className="h-16 sm:h-20 bg-slate-50/50" />;
                }

                const isToday = day.dateStr === todayStr;
                const rec = day.record;
                const isPresent = rec?.status === 'Present';
                const isAbsent = rec?.status === 'Absent';

                return (
                  <div
                    key={idx}
                    onClick={() => rec && setSelectedRecord(rec)}
                    className={`h-16 sm:h-20 p-1.5 relative transition-colors ${
                      rec ? 'cursor-pointer hover:bg-slate-50' : ''
                    } ${isToday ? 'bg-blue-50/40 ring-1 ring-[#0E79B2] ring-inset' : ''} ${
                      day.isSunday ? 'bg-slate-50/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={`font-semibold ${isToday ? 'text-[#0E79B2] font-bold' : day.isSunday ? 'text-slate-400' : 'text-slate-700'}`}>
                        {day.dayNum}
                      </span>
                      {isToday && (
                        <span className="text-[9px] font-bold uppercase text-[#0E79B2]">Today</span>
                      )}
                    </div>

                    <div className="mt-1">
                      {isPresent && (
                        <div className="p-1 rounded bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-semibold truncate flex items-center gap-1" title={`Present at ${rec.check_in_time}`}>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{rec.check_in_time.slice(0, 5)}</span>
                        </div>
                      )}

                      {isAbsent && (
                        <div className="p-1 rounded bg-rose-50 border border-rose-200 text-[10px] text-rose-800 font-semibold truncate flex items-center gap-1" title={`Absent: ${rec.absence_reason || 'Leave'}`}>
                          <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span className="truncate">{rec.absence_reason || 'Absent'}</span>
                        </div>
                      )}

                      {!rec && !day.isSunday && day.dateStr < todayStr && (
                        <span className="text-[9px] text-slate-400 italic block mt-1">Unmarked</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Attendance History & Detail Drawer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#0E79B2]" />
              <h3 className="text-sm font-bold text-[#191923]">Recent Attendance Logs</h3>
            </div>
            <span className="font-mono text-[10px] font-semibold text-slate-500">
              {records.length} records
            </span>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {records.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No attendance logs found for this account.
              </div>
            ) : (
              records.slice(0, 15).map(record => (
                <div
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                    selectedRecord?.id === record.id
                      ? 'border-[#0E79B2] bg-blue-50/70 ring-1 ring-[#0E79B2]'
                      : 'border-slate-200 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-900">{record.attendance_date}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        record.status === 'Present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Time: {record.check_in_time}</span>
                    {record.distance_meters !== null ? (
                      <span className="font-mono text-emerald-700 font-medium">
                        {record.distance_meters}m verified
                      </span>
                    ) : (
                      <span className="text-slate-400">{record.absence_reason || 'Offsite'}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Record Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">Attendance Record Details</h3>
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
                <span className="text-slate-500 font-medium">Date</span>
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
                  <span className="text-slate-500 font-medium">GPS Geofence Distance</span>
                  <span className="font-mono font-bold text-emerald-700">{selectedRecord.distance_meters} metres (within 1 km)</span>
                </div>
              )}
              {selectedRecord.latitude !== null && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Recorded Coordinates</span>
                  <span className="font-mono text-slate-700">{selectedRecord.latitude}, {selectedRecord.longitude}</span>
                </div>
              )}
              {selectedRecord.verification_notes && (
                <div className="py-1">
                  <span className="text-slate-500 font-medium block mb-0.5">Audit Notes</span>
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

      {/* Report Absence Modal */}
      {isAbsenceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-[#191923] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0E79B2]" />
                <h3 className="font-bold text-sm">Report Employee Absence</h3>
              </div>
              <button
                onClick={() => setIsAbsenceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportAbsence} className="p-5 space-y-3.5 text-xs">
              {absenceError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                  {absenceError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Absence Date</label>
                <input
                  type="date"
                  value={absenceDate}
                  onChange={e => setAbsenceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-hidden focus:border-[#0E79B2]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Absence</label>
                <select
                  value={absenceReason}
                  onChange={e => setAbsenceReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-hidden focus:border-[#0E79B2]"
                >
                  <option value="Sick Leave">Sick Leave (Medical / Illness)</option>
                  <option value="Emergency">Emergency (Family / Urgent Situation)</option>
                  <option value="Casual Leave">Casual Leave (Prior Planned)</option>
                  <option value="Off-Site Duty">Off-Site Duty (Authorized External Plant Work)</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Explanation / Notes</label>
                <textarea
                  rows={3}
                  value={absenceNotes}
                  onChange={e => setAbsenceNotes(e.target.value)}
                  placeholder="Provide details for supervisor and admin review..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#0E79B2]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAbsenceModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAbsence}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0E79B2] hover:bg-[#0c6799] text-white font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAbsence ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Absence</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
