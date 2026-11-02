import React, { useState, useMemo } from 'react';
import type { TechnicianProfile, TechnicianIncidentAssignment } from '../../types/index.ts';
import {
  Users,
  Search,
  Filter,
  Star,
  Sparkles,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Phone,
  Mail,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Layers,
  ShieldCheck,
  Check
} from 'lucide-react';

interface TechnicianWorkloadTableProps {
  technicians: TechnicianProfile[];
  assignments?: TechnicianIncidentAssignment[];
  onAssignTask?: (technician: TechnicianProfile) => void;
  onViewTechnicianDetails?: (technician: TechnicianProfile) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  hideHeaderCard?: boolean;
}

export const TechnicianWorkloadTable: React.FC<TechnicianWorkloadTableProps> = ({
  technicians,
  assignments = [],
  onAssignTask,
  onViewTechnicianDetails,
  isLoading = false,
  onRefresh,
  hideHeaderCard = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialisation, setSelectedSpecialisation] = useState<string>('ALL');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('ALL');
  const [expandedTechId, setExpandedTechId] = useState<string | null>(null);

  // Compute live workload stats
  const stats = useMemo(() => {
    const total = technicians.length;
    const available = technicians.filter(t => t.availability_status === 'AVAILABLE' || t.availability_status === 'Available').length;
    const busy = technicians.filter(t => t.availability_status === 'BUSY' || t.availability_status === 'Busy' || t.availability_status === 'On Task').length;
    const totalActiveTasks = assignments.filter(a => a.status === 'IN PROGRESS' || a.status === 'PENDING ACCEPTANCE' || a.status === 'ACCEPTED').length;
    const avgLoadPercent = total > 0
      ? Math.round(
          (technicians.reduce((sum, t) => sum + ((t.current_workload || 0) / (t.max_concurrent_assignments || 3)), 0) / total) * 100
        )
      : 0;

    return { total, available, busy, totalActiveTasks, avgLoadPercent };
  }, [technicians, assignments]);

  // Unique specialisations
  const allSpecialisations = useMemo(() => {
    const set = new Set<string>();
    technicians.forEach(t => {
      if (t.specialisation) set.add(t.specialisation);
    });
    return Array.from(set);
  }, [technicians]);

  // Filtered technicians list
  const filteredTechnicians = useMemo(() => {
    return technicians.filter(t => {
      // Search
      const searchMatch = !searchTerm.trim() ||
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.specialisation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.technical_skills && t.technical_skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())));

      if (!searchMatch) return false;

      // Specialisation filter
      if (selectedSpecialisation !== 'ALL' && t.specialisation !== selectedSpecialisation) {
        return false;
      }

      // Availability filter
      if (selectedAvailability !== 'ALL') {
        const status = (t.availability_status || '').toUpperCase();
        if (selectedAvailability === 'AVAILABLE' && status !== 'AVAILABLE') return false;
        if (selectedAvailability === 'BUSY' && status !== 'BUSY' && status !== 'ON TASK') return false;
        if (selectedAvailability === 'ON_LEAVE' && status !== 'ON LEAVE' && status !== 'ON_LEAVE') return false;
      }

      return true;
    });
  }, [technicians, searchTerm, selectedSpecialisation, selectedAvailability]);

  // Helper: map specialisation to accent color with high-contrast light backgrounds
  const getSpecialisationBadge = (spec: string) => {
    switch (spec) {
      case 'Automation & Robotics Technician':
        return {
          bg: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
          dot: 'bg-purple-600'
        };
      case 'Mechanical Technician':
        return {
          bg: 'bg-sky-100 text-sky-800 border-sky-300 font-bold',
          dot: 'bg-sky-600'
        };
      case 'Electrical Technician':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
          dot: 'bg-amber-600'
        };
      case 'CNC Technician':
        return {
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
          dot: 'bg-indigo-600'
        };
      case 'Hydraulic & Pneumatic Technician':
        return {
          bg: 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
          dot: 'bg-teal-600'
        };
      case 'Instrumentation Technician':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
          dot: 'bg-rose-600'
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300 font-bold',
          dot: 'bg-slate-600'
        };
    }
  };

  // Helper: Get active assignments for a technician
  const getTechnicianActiveAssignments = (tech: TechnicianProfile) => {
    const techId = tech.user_id || tech.id;
    const techEmail = tech.email?.toLowerCase();
    return assignments.filter(a => {
      const matchId = a.technician_id === techId || a.technician_id === tech.id || a.technician_id === tech.user_id;
      const matchEmail = a.technician_email?.toLowerCase() === techEmail;
      const isActive = a.status !== 'VERIFIED' && a.status !== 'CLOSED' && a.status !== 'REJECTED';
      return (matchId || matchEmail) && isActive;
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Metric Cards */}
      {!hideHeaderCard && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-700 text-xs mb-1">
              <span className="font-bold text-slate-900">Total Technicians</span>
              <Users className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono my-1">
              {stats.total}
            </div>
            <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              Apex Precision Roster
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-700 text-xs mb-1">
              <span className="font-bold text-slate-900">Available Now</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono my-1">
              {stats.available}
              <span className="text-xs text-slate-500 font-medium ml-1">/ {stats.total}</span>
            </div>
            <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Ready for Dispatch
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-700 text-xs mb-1">
              <span className="font-bold text-slate-900">Active In-Flight Tasks</span>
              <Wrench className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-sky-600 font-mono my-1">
              {stats.totalActiveTasks}
            </div>
            <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              Live Machine Repairs
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-700 text-xs mb-1">
              <span className="font-bold text-slate-900">Team Capacity Utilization</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono flex items-center gap-2 my-1">
              <span>{stats.avgLoadPercent}%</span>
              <div className="w-16 h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    stats.avgLoadPercent >= 80 ? 'bg-rose-500' : stats.avgLoadPercent >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, stats.avgLoadPercent)}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-slate-600 font-medium">
              {stats.avgLoadPercent >= 80 ? 'Near Max Capacity' : 'Healthy Headroom'}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search technician by name, ID, skill..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Specialisation filter */}
          <select
            value={selectedSpecialisation}
            onChange={e => setSelectedSpecialisation(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Specialisations ({allSpecialisations.length})</option>
            {allSpecialisations.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Availability filter */}
          <select
            value={selectedAvailability}
            onChange={e => setSelectedAvailability(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Availability</option>
            <option value="AVAILABLE">Available Now</option>
            <option value="BUSY">Busy / On Task</option>
            <option value="ON_LEAVE">On Leave</option>
          </select>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh live data from Supabase"
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <table className="w-full text-left text-xs text-slate-800">
          <thead className="bg-slate-100/90 text-slate-800 border-b border-slate-200 uppercase tracking-wider text-[10px] font-bold sticky top-0 z-10">
            <tr>
              <th className="py-3.5 px-3.5">Technician Profile</th>
              <th className="py-3.5 px-3.5">Specialisation</th>
              <th className="py-3.5 px-3.5">Core Technical Skills</th>
              <th className="py-3.5 px-3.5">Status & Shift</th>
              <th className="py-3.5 px-3.5">Workload & Capacity</th>
              <th className="py-3.5 px-3.5">Active Assignments</th>
              <th className="py-3.5 px-3.5">Quality Rating</th>
              <th className="py-3.5 px-3.5 text-right">Manager Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {filteredTechnicians.map(tech => {
              const isAvailable = tech.availability_status === 'AVAILABLE' || tech.availability_status === 'Available';
              const maxCap = tech.max_concurrent_assignments || 3;
              const load = tech.current_workload || 0;
              const loadPercent = Math.min(100, Math.round((load / maxCap) * 100));
              const activeTasks = getTechnicianActiveAssignments(tech);
              const badgeStyle = getSpecialisationBadge(tech.specialisation);
              const isExpanded = expandedTechId === (tech.user_id || tech.id);

              return (
                <React.Fragment key={tech.id || tech.user_id}>
                  <tr className="hover:bg-slate-50/80 transition-colors group">
                    {/* Technician Name & Avatar */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 border border-indigo-700 flex items-center justify-center font-bold text-white shadow-xs">
                            {(tech.name || tech.technician_name || 'TC').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            title={`Status: ${tech.availability_status}`}
                          />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{tech.name}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                              {tech.user_id || tech.id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-mono flex items-center gap-2 mt-0.5">
                            <span className="truncate max-w-[150px]">{tech.email}</span>
                            {tech.phone && (
                              <span className="text-slate-400 hidden sm:inline">• {tech.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Specialisation */}
                    <td className="py-3 px-3.5">
                      <div className="space-y-1">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border block w-max ${badgeStyle.bg}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${badgeStyle.dot} mr-1.5`} />
                          {tech.specialisation}
                        </span>
                        <div className="text-[10px] text-slate-600 font-medium">
                          {tech.experience_years} years industry experience
                        </div>
                      </div>
                    </td>

                    {/* Technical Skills */}
                    <td className="py-3 px-3.5 max-w-[220px]">
                      <div className="flex flex-wrap gap-1">
                        {(tech.technical_skills || []).slice(0, 2).map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-medium text-[10px]"
                          >
                            {skill}
                          </span>
                        ))}
                        {(tech.technical_skills || []).length > 2 && (
                          <button
                            type="button"
                            onClick={() => setExpandedTechId(isExpanded ? null : (tech.user_id || tech.id || null))}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer underline ml-1"
                          >
                            {isExpanded ? 'Hide' : `+${(tech.technical_skills || []).length - 2} more`}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Availability & Shift */}
                    <td className="py-3 px-3.5">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            isAvailable
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                            }`}
                          />
                          {tech.availability_status || 'AVAILABLE'}
                        </span>
                        <div className="text-[10px] text-slate-600 font-medium">
                          {tech.shift || 'General Shift'}
                        </div>
                      </div>
                    </td>

                    {/* Workload Gauge */}
                    <td className="py-3 px-3.5 min-w-[130px]">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className="font-bold text-slate-900">{load} / {maxCap} Tasks</span>
                          <span className={loadPercent >= 100 ? 'text-rose-600 font-bold' : loadPercent >= 60 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                            {loadPercent}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              loadPercent >= 100
                                ? 'bg-rose-500'
                                : loadPercent >= 60
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${loadPercent}%` }}
                          />
                        </div>
                        {loadPercent >= 100 && (
                          <span className="text-[9px] text-rose-600 font-bold flex items-center gap-0.5 mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> At Max Capacity
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Active Incident Tasks */}
                    <td className="py-3 px-3.5">
                      {activeTasks.length > 0 ? (
                        <div className="space-y-1">
                          {activeTasks.map(asn => (
                            <div
                              key={asn.id}
                              className="px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[10px] space-y-0.5"
                            >
                              <div className="flex items-center justify-between gap-1 font-mono">
                                <span className="font-bold text-indigo-700">{asn.incident_id}</span>
                                <span className={`text-[9px] px-1 rounded uppercase font-bold ${
                                  asn.status === 'IN PROGRESS' ? 'bg-sky-100 text-sky-800' :
                                  asn.status === 'PENDING ACCEPTANCE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'
                                }`}>
                                  {asn.status.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="text-slate-700 font-medium truncate max-w-[140px]">
                                {asn.machine_name}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No active repairs</span>
                      )}
                    </td>

                    {/* Quality & Rating */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1 font-bold text-slate-900">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{tech.rating || 4.8}</span>
                      </div>
                      <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                        {tech.completed_repairs_count || 40}+ resolved
                      </div>
                    </td>

                    {/* Quick Manager Action */}
                    <td className="py-3 px-3.5 text-right">
                      {onAssignTask && (
                        <button
                          type="button"
                          onClick={() => onAssignTask(tech)}
                          disabled={loadPercent >= 100}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-100" />
                          <span>Assign Repair</span>
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Skills & Details Drawer Row */}
                  {isExpanded && (
                    <tr className="bg-slate-50/90 border-t border-b border-slate-200">
                      <td colSpan={8} className="p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <div className="text-slate-800 font-bold mb-1 flex items-center gap-1.5">
                              <Award className="w-4 h-4 text-indigo-600" /> Professional Certifications
                            </div>
                            <div className="space-y-1">
                              {(tech.certifications || ['Standard FactoryOps Industrial Certification']).map((cert: string, cIdx: number) => (
                                <div key={cIdx} className="text-slate-700 font-medium flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>{cert}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="text-slate-800 font-bold mb-1 flex items-center gap-1.5">
                              <Wrench className="w-4 h-4 text-sky-600" /> Complete Skill Matrix
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(tech.technical_skills || []).map((sk: string, skIdx: number) => (
                                <span
                                  key={skIdx}
                                  className="px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-800 font-medium text-[11px]"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="text-slate-800 font-bold mb-1 flex items-center gap-1.5">
                              <Layers className="w-4 h-4 text-purple-600" /> Secondary Specialisations
                            </div>
                            <div className="space-y-1">
                              {(tech.secondary_specialisations || []).length > 0 ? (
                                tech.secondary_specialisations!.map((sec: string, secIdx: number) => (
                                  <span
                                    key={secIdx}
                                    className="inline-block mr-1.5 px-2 py-0.5 rounded bg-purple-100 border border-purple-300 text-purple-800 font-bold text-[10px]"
                                  >
                                    {sec}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500 italic">None registered</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {filteredTechnicians.length === 0 && (
          <div className="p-8 text-center text-slate-600 space-y-2">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-medium">No technicians found matching filter criteria.</p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedSpecialisation('ALL');
                setSelectedAvailability('ALL');
              }}
              className="text-xs text-indigo-600 hover:underline font-bold"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
