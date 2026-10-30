import React, { useState, useMemo, useEffect } from 'react';
import type { Machine, ProductionRecord, WorkOrder, MaintenanceRecord, FactoryKPIs } from '../../types/index.ts';
import {
  formatPowerBiNumber,
  PowerBiBanner,
  PowerBiCard,
  PowerBiVisualContainer
} from './PowerBiComponents.tsx';
import {
  formatWholeNumber,
  formatPercent,
  formatCompactNumber,
  formatNumber
} from '../../utils/formatters.ts';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  ChevronDown,
  ChevronRight,
  Wrench,
  Search,
  Filter,
  Layers,
  ArrowUpRight,
  SlidersHorizontal,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart2,
  Target
} from 'lucide-react';

interface ProductionPlannerDashboardViewProps {
  machines: Machine[];
  production: ProductionRecord[];
  workOrders: WorkOrder[];
  maintenance: MaintenanceRecord[];
  kpis: FactoryKPIs | null;
  onSelectMachine: (machine: Machine) => void;
  onOpenWorkOrderModal: () => void;
}

export const ProductionPlannerDashboardView: React.FC<ProductionPlannerDashboardViewProps> = ({
  machines,
  production,
  workOrders,
  onSelectMachine,
  onOpenWorkOrderModal
}) => {
  // Slicers state: multi-select for machines with synchronized Select all
  const [selectedMachineIds, setSelectedMachineIds] = useState<Set<string>>(() => {
    return new Set(machines.map(m => m.machine_id));
  });
  const [selectedShift, setSelectedShift] = useState<string>('all'); // 'all' | 'A' | 'B' | 'C'
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all'); // 'all' | 'Qtr 1' | 'Qtr 2' | 'Qtr 3' | 'Qtr 4'
  const [isDateExpanded, setIsDateExpanded] = useState<boolean>(true);
  
  // UI filter controls state
  const [machineSearchQuery, setMachineSearchQuery] = useState<string>('');
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  // Synchronize when machines list loads or changes
  useEffect(() => {
    if (machines.length > 0) {
      setSelectedMachineIds(prev => {
        if (prev.size === 0 || prev.size === machines.length) {
          return new Set(machines.map(m => m.machine_id));
        }
        return prev;
      });
    }
  }, [machines]);

  const allMachineIds = useMemo(() => machines.map(m => m.machine_id), [machines]);
  const isAllSelected = machines.length > 0 && selectedMachineIds.size === machines.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMachineIds(new Set());
    } else {
      setSelectedMachineIds(new Set(allMachineIds));
    }
  };

  const handleToggleMachine = (machineId: string) => {
    setSelectedMachineIds(prev => {
      const next = new Set(prev);
      if (next.has(machineId)) {
        next.delete(machineId);
      } else {
        next.add(machineId);
      }
      return next;
    });
  };

  // Filtered machine options based on slicer search
  const filteredSlicerMachines = useMemo(() => {
    if (!machineSearchQuery.trim()) return machines;
    const q = machineSearchQuery.toLowerCase();
    return machines.filter(m => 
      m.machine_id.toLowerCase().includes(q) || 
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.type && m.type.toLowerCase().includes(q))
    );
  }, [machines, machineSearchQuery]);

  // Filtered production data based on slicers
  const filteredProduction = useMemo(() => {
    return production.filter(p => {
      // Machine filter
      if (!isAllSelected) {
        if (selectedMachineIds.size === 0) return false;
        if (!selectedMachineIds.has(p.machine_id)) return false;
      }
      // Shift filter
      if (selectedShift !== 'all' && p.shift !== selectedShift) {
        return false;
      }
      // Date / Quarter filter
      if (selectedQuarter !== 'all' && p.date) {
        const month = new Date(p.date).getMonth(); // 0=Jan..11=Dec
        const qtrMap: Record<string, number[]> = {
          'Qtr 1': [0, 1, 2],
          'Qtr 2': [3, 4, 5],
          'Qtr 3': [6, 7, 8],
          'Qtr 4': [9, 10, 11]
        };
        const validMonths = qtrMap[selectedQuarter];
        if (validMonths && !validMonths.includes(month)) return false;
      }
      return true;
    });
  }, [production, isAllSelected, selectedMachineIds, selectedShift, selectedQuarter]);

  // Filtered work orders
  const filteredWorkOrders = useMemo(() => {
    if (isAllSelected) return workOrders;
    if (selectedMachineIds.size === 0) return [];
    return workOrders.filter(w => selectedMachineIds.has(w.machine_id));
  }, [workOrders, isAllSelected, selectedMachineIds]);

  // Section 4 Aggregated KPIs
  const actualProductionTotal = useMemo(() => {
    return filteredProduction.reduce((sum, p) => sum + (Number(p.actual_units) || 0), 0);
  }, [filteredProduction]);

  const plannedProductionTotal = useMemo(() => {
    return filteredProduction.reduce((sum, p) => sum + (Number(p.planned_units) || 0), 0);
  }, [filteredProduction]);

  const achievementPctVal = useMemo(() => {
    if (plannedProductionTotal === 0) return 0;
    return (actualProductionTotal / plannedProductionTotal) * 100;
  }, [actualProductionTotal, plannedProductionTotal]);

  const achievementPct = useMemo(() => {
    return formatPercent(achievementPctVal, 2);
  }, [achievementPctVal]);

  const productionShortfallNum = useMemo(() => {
    return plannedProductionTotal - actualProductionTotal;
  }, [actualProductionTotal, plannedProductionTotal]);

  const productionShortfall = useMemo(() => {
    return formatCompactNumber(productionShortfallNum, 2);
  }, [productionShortfallNum]);

  const totalDefects = useMemo(() => {
    return filteredProduction.reduce((sum, p) => sum + (Number(p.defect_units) || 0), 0);
  }, [filteredProduction]);

  const totalGoodUnits = useMemo(() => {
    return Math.max(0, actualProductionTotal - totalDefects);
  }, [actualProductionTotal, totalDefects]);

  // Quality Distribution Donut (good units vs defect units)
  const qualityDistribution = useMemo(() => {
    return [
      { name: 'Good Units', value: totalGoodUnits, color: '#0E79B2' },
      { name: 'Defect Units', value: totalDefects, color: '#EF4444' }
    ];
  }, [totalGoodUnits, totalDefects]);

  // Actual Production by Machine
  const productionByMachine = useMemo(() => {
    const map: Record<string, { actual: number; plannedSum: number; oeeSum: number; count: number }> = {};
    production.forEach(p => {
      const id = p.machine_id;
      if (!map[id]) {
        map[id] = { actual: 0, plannedSum: 0, oeeSum: 0, count: 0 };
      }
      map[id].actual += Number(p.actual_units) || 0;
      map[id].plannedSum += Number(p.planned_units) || 0;
      map[id].oeeSum += Number(p.oee_percent) || 0;
      map[id].count++;
    });

    return Object.entries(map)
      .map(([machine_id, data]) => ({
        machine_id,
        actual_units: data.actual,
        sum_oee: Number(formatNumber(data.oeeSum, 2)),
        avg_planned: Math.round(data.plannedSum / data.count),
        displayUnits: formatCompactNumber(data.actual, 1)
      }))
      .sort((a, b) => b.actual_units - a.actual_units);
  }, [production]);

  // Planned vs Actual Production Trend (Dual line chart)
  const productionTrend = useMemo(() => {
    const dateMap: Record<string, { actual: number; planned: number }> = {};
    filteredProduction.forEach(p => {
      const d = p.date ? p.date.substring(0, 10) : '';
      if (d) {
        if (!dateMap[d]) dateMap[d] = { actual: 0, planned: 0 };
        dateMap[d].actual += Number(p.actual_units) || 0;
        dateMap[d].planned += Number(p.planned_units) || 0;
      }
    });

    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const dt = new Date(date);
        const monthName = dt.toLocaleString('en-US', { month: 'short' });
        const day = dt.getDate();
        return {
          date,
          label: `${monthName} ${day}`,
          actual: data.actual,
          planned: data.planned
        };
      });
  }, [filteredProduction]);

  // Work Orders by Status
  const workOrdersByStatus = useMemo(() => {
    const counts: Record<string, number> = {
      Completed: 0,
      Scheduled: 0,
      'In Progress': 0,
      Open: 0,
      'Pending Parts': 0
    };
    filteredWorkOrders.forEach(w => {
      if (counts[w.status] !== undefined) counts[w.status]++;
      else counts.Open++;
    });

    return [
      { status: 'Completed', count: counts.Completed },
      { status: 'Scheduled', count: counts.Scheduled },
      { status: 'In Progress', count: counts['In Progress'] },
      { status: 'Open', count: counts.Open },
      { status: 'Pending Parts', count: counts['Pending Parts'] }
    ];
  }, [filteredWorkOrders]);

  // Actual Production by Shift
  const productionByShift = useMemo(() => {
    const shiftData: Record<string, { actual: number; planned: number; oeeSum: number; count: number }> = {
      A: { actual: 0, planned: 0, oeeSum: 0, count: 0 },
      B: { actual: 0, planned: 0, oeeSum: 0, count: 0 },
      C: { actual: 0, planned: 0, oeeSum: 0, count: 0 }
    };

    filteredProduction.forEach(p => {
      const s = p.shift;
      if (s && shiftData[s]) {
        shiftData[s].actual += Number(p.actual_units) || 0;
        shiftData[s].planned += Number(p.planned_units) || 0;
        shiftData[s].oeeSum += Number(p.oee_percent) || 0;
        shiftData[s].count++;
      }
    });

    return ['A', 'B', 'C'].map(shift => ({
      shift: `Shift ${shift}`,
      rawShift: shift,
      actual: shiftData[shift].actual,
      planned: shiftData[shift].planned,
      avgOee: shiftData[shift].count > 0 ? formatNumber(shiftData[shift].oeeSum / shiftData[shift].count, 2) : '0',
      displayActual: formatCompactNumber(shiftData[shift].actual, 2)
    }));
  }, [filteredProduction]);

  // Section 7 Table: Machine Schedule and Target vs Actual
  const machineScheduleTableData = useMemo(() => {
    // Map machines to production records
    const rowMap: Record<string, {
      machine_id: string;
      machine_name: string;
      type: string;
      shift: string;
      planned: number;
      actual: number;
      defects: number;
      oeeSum: number;
      count: number;
      status: string;
    }> = {};

    filteredProduction.forEach(p => {
      const id = p.machine_id;
      const mObj = machines.find(m => m.machine_id === id);
      if (!rowMap[id]) {
        rowMap[id] = {
          machine_id: id,
          machine_name: p.machine_name || mObj?.name || `Machine ${id}`,
          type: mObj?.type || p.line_name || 'Production Line',
          shift: p.shift || 'A',
          planned: 0,
          actual: 0,
          defects: 0,
          oeeSum: 0,
          count: 0,
          status: mObj?.status || 'running'
        };
      }
      rowMap[id].planned += Number(p.planned_units) || 0;
      rowMap[id].actual += Number(p.actual_units) || 0;
      rowMap[id].defects += Number(p.defect_units) || 0;
      rowMap[id].oeeSum += Number(p.oee_percent) || 0;
      rowMap[id].count++;
    });

    let rows = Object.values(rowMap).map(r => {
      const achievement = r.planned > 0 ? (r.actual / r.planned) * 100 : 0;
      const variance = r.actual - r.planned;
      const avgOee = r.count > 0 ? r.oeeSum / r.count : 0;

      return {
        ...r,
        achievement,
        variance,
        avgOee
      };
    });

    // Apply table search query
    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase();
      rows = rows.filter(r => 
        r.machine_id.toLowerCase().includes(q) ||
        r.machine_name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.shift.toLowerCase().includes(q)
      );
    }

    return rows.sort((a, b) => b.planned - a.planned);
  }, [filteredProduction, machines, tableSearchQuery]);

  // Custom Machine Tooltip
  const CustomMachineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xl text-xs space-y-1.5 z-50 text-slate-800 min-w-[220px]">
          <div className="flex justify-between items-center gap-4 border-b border-slate-100 pb-1">
            <span className="text-slate-500 font-semibold">Machine ID</span>
            <span className="font-bold text-slate-900 font-mono">{data.machine_id}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-500">Actual Production</span>
            <span className="font-bold text-[#0E79B2] font-mono">{formatWholeNumber(data.actual_units)} units</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-500">Planned Target</span>
            <span className="font-bold text-slate-700 font-mono">{formatWholeNumber(data.avg_planned)} units</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-slate-500">Average OEE</span>
            <span className="font-bold text-emerald-600 font-mono">{formatNumber(data.sum_oee, 2)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Render Filter Sidebar / Drawer Content
  const renderFilterPanel = () => (
    <div className="space-y-4">
      {/* MACHINE ID Slicer */}
      <div className="bg-white rounded-xl border border-[#191923]/10 overflow-hidden shadow-xs">
        <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#0E79B2]" />
            <span className="font-bold text-[11px] tracking-wider uppercase text-[#191923]">
              MACHINE ID
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono font-medium">
            {selectedMachineIds.size}/{machines.length}
          </span>
        </div>
        
        {/* Machine Search input */}
        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search machine..."
              value={machineSearchQuery}
              onChange={(e) => setMachineSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#0E79B2] focus:border-[#0E79B2]"
            />
            {machineSearchQuery && (
              <button 
                onClick={() => setMachineSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="p-2 max-h-[180px] overflow-y-auto space-y-0.5 text-xs text-slate-700">
          <label className="flex items-center gap-2 cursor-pointer hover:text-[#0E79B2] p-1.5 rounded-md hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleToggleSelectAll}
              className="rounded border-slate-300 text-[#0E79B2] focus:ring-[#0E79B2] accent-[#0E79B2] cursor-pointer"
            />
            <span className="font-bold text-slate-900">Select all ({machines.length})</span>
          </label>
          {filteredSlicerMachines.map(m => (
            <label key={m.machine_id} className="flex items-center gap-2 cursor-pointer hover:text-[#0E79B2] p-1.5 rounded-md hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={selectedMachineIds.has(m.machine_id)}
                onChange={() => handleToggleMachine(m.machine_id)}
                className="rounded border-slate-300 text-[#0E79B2] focus:ring-[#0E79B2] accent-[#0E79B2] cursor-pointer"
              />
              <span className="font-mono text-slate-800">{m.machine_id}</span>
              {m.name && <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{m.name}</span>}
            </label>
          ))}
          {filteredSlicerMachines.length === 0 && (
            <div className="text-[11px] text-slate-400 p-2 text-center">No machines match filter</div>
          )}
        </div>
      </div>

      {/* SHIFT Slicer */}
      <div className="bg-white rounded-xl border border-[#191923]/10 overflow-hidden shadow-xs">
        <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#0E79B2]" />
            <span className="font-bold text-[11px] tracking-wider uppercase text-[#191923]">
              SHIFT
            </span>
          </div>
          {selectedShift !== 'all' && (
            <button
              onClick={() => setSelectedShift('all')}
              className="text-[10px] text-[#0E79B2] font-semibold hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <div className="p-2 space-y-1 text-xs text-slate-700">
          <label className="flex items-center gap-2 cursor-pointer hover:text-[#0E79B2] p-1.5 rounded-md hover:bg-slate-50 transition-colors">
            <input
              type="radio"
              name="planner_shift"
              checked={selectedShift === 'all'}
              onChange={() => setSelectedShift('all')}
              className="accent-[#0E79B2] cursor-pointer"
            />
            <span className={`font-semibold ${selectedShift === 'all' ? 'text-[#0E79B2]' : 'text-slate-800'}`}>
              All Shifts
            </span>
          </label>
          {['A', 'B', 'C'].map(shift => (
            <label key={shift} className="flex items-center gap-2 cursor-pointer hover:text-[#0E79B2] p-1.5 rounded-md hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                name="planner_shift"
                checked={selectedShift === shift}
                onChange={() => setSelectedShift(shift)}
                className="accent-[#0E79B2] cursor-pointer"
              />
              <span className={`font-semibold ${selectedShift === shift ? 'text-[#0E79B2]' : 'text-slate-800'}`}>
                Shift {shift}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* DATE Hierarchy Slicer */}
      <div className="bg-white rounded-xl border border-[#191923]/10 overflow-hidden shadow-xs">
        <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#0E79B2]" />
            <span className="font-bold text-[11px] tracking-wider uppercase text-[#191923]">
              DATE RANGE
            </span>
          </div>
          {selectedQuarter !== 'all' && (
            <button
              onClick={() => setSelectedQuarter('all')}
              className="text-[10px] text-[#0E79B2] font-semibold hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <div className="p-2 text-xs space-y-1">
          <div
            className="flex items-center justify-between cursor-pointer font-bold select-none text-[#191923] p-1.5 hover:bg-slate-50 rounded-md transition-colors"
            onClick={() => setIsDateExpanded(!isDateExpanded)}
          >
            <div className="flex items-center gap-1.5">
              {isDateExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              <span>Year 2026</span>
            </div>
            <span className="text-[10px] text-slate-400 font-normal">Active</span>
          </div>
          {isDateExpanded && (
            <div className="pl-4 space-y-1 text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer hover:text-[#0E79B2] p-1 rounded-md transition-colors">
                <input
                  type="radio"
                  name="planner_qtr"
                  checked={selectedQuarter === 'all'}
                  onChange={() => setSelectedQuarter('all')}
                  className="accent-[#0E79B2] cursor-pointer"
                />
                <span className={selectedQuarter === 'all' ? 'font-bold text-[#0E79B2]' : ''}>Full Year</span>
              </label>
              {['Qtr 1', 'Qtr 2', 'Qtr 3', 'Qtr 4'].map(qtr => (
                <label key={qtr} className="flex items-center gap-2 cursor-pointer hover:text-[#0E79B2] p-1 rounded-md transition-colors">
                  <input
                    type="radio"
                    name="planner_qtr"
                    checked={selectedQuarter === qtr}
                    onChange={() => setSelectedQuarter(qtr)}
                    className="accent-[#0E79B2] cursor-pointer"
                  />
                  <span className={selectedQuarter === qtr ? 'font-bold text-[#0E79B2]' : ''}>{qtr}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1850px] mx-auto px-3 sm:px-5 lg:px-6 py-3 space-y-4 font-sans text-[#191923]">
      {/* SECTION 2: DASHBOARD TITLE AND ACTIONS */}
      <PowerBiBanner
        title="Production Planner Dashboard"
        subtitle="Shift Schedules, Line Targets, Output Shortfall & Machine Scheduling"
        onFilterClick={() => setIsMobileFilterOpen(prev => !prev)}
        actions={
          <div className="flex items-center gap-2">
            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setIsMobileFilterOpen(prev => !prev)}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors border border-slate-200 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#0E79B2]" />
              <span>Filters</span>
            </button>
            <button
              onClick={onOpenWorkOrderModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0E79B2] hover:bg-[#0E79B2]/90 text-white transition-colors shadow-2xs cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>+ Work Order</span>
            </button>
          </div>
        }
      />

      {/* Mobile Collapsible Filter Drawer */}
      {isMobileFilterOpen && (
        <div className="lg:hidden bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#0E79B2]" />
              <span>Production Filters</span>
            </h3>
            <button
              onClick={() => setIsMobileFilterOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {renderFilterPanel()}
        </div>
      )}

      {/* Desktop Main Layout: SECTION 3 (Left Sidebar Filters) + Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* SECTION 3: FILTER PANEL (Desktop Left Sidebar) */}
        <aside className="hidden lg:block lg:col-span-3 min-w-0 sticky top-3">
          {renderFilterPanel()}
        </aside>

        {/* Right Dashboard Area (Col 9 on Desktop) */}
        <main className="col-span-1 lg:col-span-9 space-y-4 min-w-0">
          
          {/* SECTION 4: KEY PERFORMANCE INDICATORS */}
          <section className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Key Performance Indicators
              </h2>
              <span className="text-[10.5px] text-slate-400 font-medium">
                {filteredProduction.length} records in scope
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* KPI 1: Actual Production */}
              <PowerBiCard
                title="ACTUAL PRODUCTION"
                subtitle="Sum of actual_units"
                value={actualProductionTotal.toLocaleString('en-US')}
                trendText="Live verified"
                trendPositive={true}
                icon={<BarChart2 className="w-4 h-4 text-[#0E79B2]" />}
                iconBg="bg-blue-50 border-blue-100/80"
              />

              {/* KPI 2: Planned Production */}
              <PowerBiCard
                title="PLANNED PRODUCTION"
                subtitle="Sum of planned_units"
                value={plannedProductionTotal.toLocaleString('en-US')}
                trendText="Scheduled targets"
                trendPositive={true}
                icon={<Target className="w-4 h-4 text-purple-600" />}
                iconBg="bg-purple-50 border-purple-100/80"
              />

              {/* KPI 3: Achievement % */}
              <PowerBiCard
                title="ACHIEVEMENT %"
                subtitle="Production Achievement"
                value={achievementPct}
                trendText={achievementPctVal >= 90 ? "On track" : "Below target"}
                trendPositive={achievementPctVal >= 90}
                icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                iconBg="bg-emerald-50 border-emerald-100/80"
              />

              {/* KPI 4: Production Shortfall */}
              <PowerBiCard
                title="PRODUCTION SHORTFALL"
                subtitle="Units variance to plan"
                value={productionShortfall}
                trendText={productionShortfallNum > 0 ? "Shortfall gap" : "Surplus output"}
                trendPositive={productionShortfallNum <= 0}
                icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                iconBg="bg-amber-50 border-amber-100/80"
              />
            </div>
          </section>

          {/* SECTION 5: MAIN PRODUCTION ANALYTICS */}
          <section className="space-y-1.5">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Main Production Analytics
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
              {/* Chart A: Planned vs Actual Trend (7 cols) */}
              <div className="lg:col-span-7 min-w-0">
                <PowerBiVisualContainer
                  title="PLANNED VS ACTUAL PRODUCTION TREND"
                  subtitle="Daily Output Trajectory & Planned Target Comparison"
                  heightClass="h-[300px]"
                >
                  <div className="h-full w-full pt-1 flex flex-col justify-between">
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={productionTrend}
                          margin={{ top: 10, right: 15, left: -10, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis
                            dataKey="label"
                            stroke="#94a3b8"
                            fontSize={9.5}
                            tickLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            stroke="#94a3b8"
                            fontSize={9.5}
                            tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                            formatter={(val: any, name: any) => [Number(val).toLocaleString() + ' units', name]}
                          />
                          <Line
                            type="monotone"
                            name="Planned Target"
                            dataKey="planned"
                            stroke="#94a3b8"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            name="Actual Output"
                            dataKey="actual"
                            stroke="#0E79B2"
                            strokeWidth={2.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-5 text-[10.5px] text-slate-600 pt-1.5 border-t border-slate-100 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-[#94a3b8] border-b border-dashed border-[#94a3b8]"></span>
                        <span className="font-medium">Planned Target</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-1 rounded-full bg-[#0E79B2]"></span>
                        <span className="font-bold text-[#0E79B2]">Actual Production</span>
                      </div>
                    </div>
                  </div>
                </PowerBiVisualContainer>
              </div>

              {/* Chart B: Actual Production by Machine (5 cols) */}
              <div className="lg:col-span-5 min-w-0">
                <PowerBiVisualContainer
                  title="ACTUAL PRODUCTION BY MACHINE"
                  subtitle="Volume Ranking, OEE & Planned Targets"
                  heightClass="h-[300px]"
                >
                  <div className="h-full w-full overflow-y-auto pr-1">
                    <ResponsiveContainer width="100%" height={Math.max(250, productionByMachine.length * 22)}>
                      <BarChart
                        data={productionByMachine}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis
                          type="number"
                          stroke="#94a3b8"
                          fontSize={9}
                          tickFormatter={(v) => `${Math.round(v / 1000)}K`}
                        />
                        <YAxis
                          type="category"
                          dataKey="machine_id"
                          stroke="#64748b"
                          fontSize={9}
                          width={40}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomMachineTooltip />} />
                        <Bar
                          dataKey="actual_units"
                          fill="#0E79B2"
                          radius={[0, 4, 4, 0]}
                          label={{ position: 'right', fill: '#64748b', fontSize: 8.5, formatter: (v: any) => `${Math.round(Number(v) / 1000)}K` }}
                          onClick={(entry: any) => {
                            const m = machines.find(x => x.machine_id === entry?.machine_id);
                            if (m) onSelectMachine(m);
                          }}
                          className="cursor-pointer"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </PowerBiVisualContainer>
              </div>
            </div>
          </section>

          {/* SECTION 6: SECONDARY OPERATIONAL ANALYTICS */}
          <section className="space-y-1.5">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Secondary Operational Analytics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Chart A: Actual Production by Shift */}
              <PowerBiVisualContainer
                title="ACTUAL PRODUCTION BY SHIFT"
                subtitle="Output Distribution across Shifts A, B, C"
                heightClass="h-[260px]"
              >
                <div className="h-full w-full pt-1 flex flex-col justify-between">
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={productionByShift}
                        margin={{ top: 15, right: 10, left: -10, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="shift" stroke="#64748b" fontSize={10} tickLine={false} />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={9}
                          tickFormatter={(v) => formatCompactNumber(v, 1)}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                          formatter={(val: any) => [formatWholeNumber(val) + ' units', 'Actual Output']}
                        />
                        <Bar
                          dataKey="actual"
                          fill="#0E79B2"
                          radius={[4, 4, 0, 0]}
                          label={{ position: 'top', fill: '#191923', fontSize: 9.5, fontWeight: 'bold', formatter: (v: any) => formatCompactNumber(v, 1) }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-[10px] text-slate-500 text-center border-t border-slate-100 pt-1 shrink-0">
                    Shift output compares baseline yield per 8-hr window
                  </div>
                </div>
              </PowerBiVisualContainer>

              {/* Chart B: Production Quality */}
              <PowerBiVisualContainer
                title="PRODUCTION QUALITY"
                subtitle="Good Output vs Defective Units"
                heightClass="h-[260px]"
              >
                <div className="h-full flex flex-col justify-between p-1">
                  <div className="relative w-32 h-32 mx-auto my-auto">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={qualityDistribution}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={36}
                          outerRadius={54}
                          strokeWidth={2}
                          stroke="#fff"
                        >
                          {qualityDistribution.map((entry, idx) => (
                            <Cell key={`cell-qual-${idx}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                          formatter={(val: any, name: any) => [Number(val).toLocaleString() + ' units', name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-[#191923]">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Defects</span>
                      <span className="text-xs font-extrabold font-mono text-[#EF4444]">
                        {formatCompactNumber(totalDefects, 1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-5 text-[10.5px] text-slate-600 border-t border-slate-100 pt-1.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0E79B2]"></span>
                      <span className="font-medium">Good Output</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
                      <span className="font-bold text-[#EF4444]">Defects ({formatCompactNumber(totalDefects, 1)})</span>
                    </div>
                  </div>
                </div>
              </PowerBiVisualContainer>

              {/* Chart C: Work Orders by Status */}
              <PowerBiVisualContainer
                title="WORK ORDERS BY STATUS"
                subtitle="Status Breakdown for Assigned Machines"
                heightClass="h-[260px]"
                rightAction={
                  <button
                    onClick={onOpenWorkOrderModal}
                    className="flex items-center gap-1 px-2 py-0.5 bg-[#0E79B2] hover:bg-[#0E79B2]/90 text-white rounded-md text-[10px] font-semibold transition-colors cursor-pointer"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>New WO</span>
                  </button>
                }
              >
                <div className="h-full w-full pt-1 flex flex-col justify-between">
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={workOrdersByStatus}
                        layout="vertical"
                        margin={{ top: 5, right: 25, left: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis
                          type="number"
                          stroke="#94a3b8"
                          fontSize={9}
                        />
                        <YAxis
                          type="category"
                          dataKey="status"
                          stroke="#64748b"
                          fontSize={9}
                          width={80}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', color: '#191923', fontSize: '11px', borderRadius: '8px' }}
                          formatter={(val: any) => [val + ' orders', 'Count']}
                        />
                        <Bar
                          dataKey="count"
                          fill="#191923"
                          radius={[0, 4, 4, 0]}
                          label={{ position: 'right', fill: '#191923', fontSize: 9.5, fontWeight: 'bold' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-[10px] text-slate-500 text-center border-t border-slate-100 pt-1 shrink-0">
                    Total {filteredWorkOrders.length} work orders in active scope
                  </div>
                </div>
              </PowerBiVisualContainer>
            </div>
          </section>

          {/* SECTION 7: PRODUCTION SCHEDULE AND TARGET VS ACTUAL TABLE */}
          <section className="space-y-3">
            <div className="bg-white border border-[#191923]/10 rounded-xl shadow-xs overflow-hidden">
              {/* Table Header Controls */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <div>
                  <h2 className="text-sm font-bold text-[#191923] uppercase tracking-wide">
                    PRODUCTION SCHEDULE & TARGET VS ACTUAL
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Machine-level targets, actual output, performance variance, and OEE tracking
                  </p>
                </div>

                {/* Table Search Filter */}
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search machines or shift..."
                    value={tableSearchQuery}
                    onChange={(e) => setTableSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0E79B2] focus:border-[#0E79B2] text-slate-800"
                  />
                  {tableSearchQuery && (
                    <button
                      onClick={() => setTableSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Responsive Scrollable Table Container: Fixed Header, 15 Visible Rows Scrollable Body, Fixed Summary Footer */}
              <div className="w-full overflow-x-auto">
                <div className="overflow-y-auto max-h-[615px] relative border-t border-slate-200">
                  <table className="w-full min-w-[950px] text-left text-xs text-slate-700 border-collapse">
                    {/* Fixed Sticky Table Header */}
                    <thead className="sticky top-0 z-20 bg-slate-100 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider shadow-xs border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 bg-slate-100">Machine ID</th>
                        <th className="py-2.5 px-4 bg-slate-100">Machine Name / Type</th>
                        <th className="py-2.5 px-4 bg-slate-100 text-center">Shift</th>
                        <th className="py-2.5 px-4 bg-slate-100 text-right">Planned Units</th>
                        <th className="py-2.5 px-4 bg-slate-100 text-right">Actual Units</th>
                        <th className="py-2.5 px-4 bg-slate-100 text-right">Achievement %</th>
                        <th className="py-2.5 px-4 bg-slate-100 text-right">Variance</th>
                        <th className="py-2.5 px-4 bg-slate-100 text-right">Average OEE</th>
                        <th className="py-2.5 px-4 bg-slate-100 text-center">Status</th>
                        <th className="py-2.5 px-4 bg-slate-100 text-center">Actions</th>
                      </tr>
                    </thead>

                    {/* Vertically Scrollable Table Body (15 rows visible) */}
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {machineScheduleTableData.map((row) => {
                        const isShortfall = row.variance < 0;
                        const mObj = machines.find(m => m.machine_id === row.machine_id);

                        return (
                          <tr 
                            key={row.machine_id}
                            className="hover:bg-slate-50/80 transition-colors group h-[41px]"
                          >
                            {/* Machine ID */}
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                              {row.machine_id}
                            </td>

                            {/* Machine Name / Type */}
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-slate-800">{row.machine_name}</div>
                              <div className="text-[10px] text-slate-400">{row.type}</div>
                            </td>

                            {/* Shift */}
                            <td className="py-2.5 px-4 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                Shift {row.shift}
                              </span>
                            </td>

                            {/* Planned Units */}
                            <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-700 tabular-nums">
                              {formatWholeNumber(row.planned)}
                            </td>

                            {/* Actual Units */}
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0E79B2] tabular-nums">
                              {formatWholeNumber(row.actual)}
                            </td>

                            {/* Achievement % */}
                            <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                              <span className={row.achievement >= 90 ? 'text-emerald-600' : 'text-amber-600'}>
                                {formatPercent(row.achievement, 1)}
                              </span>
                            </td>

                            {/* Variance */}
                            <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                              <span className={`inline-flex items-center gap-1 ${isShortfall ? 'text-[#EF4444]' : 'text-emerald-600'}`}>
                                {isShortfall ? (
                                  <>
                                    <TrendingDown className="w-3 h-3 shrink-0" />
                                    <span>{formatWholeNumber(row.variance)}</span>
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="w-3 h-3 shrink-0" />
                                    <span>+{formatWholeNumber(row.variance)}</span>
                                  </>
                                )}
                              </span>
                            </td>

                            {/* Average OEE */}
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-800 tabular-nums">
                              {formatNumber(row.avgOee, 1)}%
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                row.status.toLowerCase() === 'running' || row.status.toLowerCase() === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : row.status.toLowerCase() === 'warning'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  row.status.toLowerCase() === 'running' || row.status.toLowerCase() === 'active'
                                    ? 'bg-emerald-500'
                                    : row.status.toLowerCase() === 'warning'
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}></span>
                                <span className="capitalize">{row.status}</span>
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-4 text-center">
                              <button
                                onClick={() => {
                                  if (mObj) onSelectMachine(mObj);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#0E79B2] hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                              >
                                <span>Inspect</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {machineScheduleTableData.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                            No machine schedule records match the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>

                    {/* Permanently Visible Non-Scrolling Sticky Summary / Footer */}
                    {machineScheduleTableData.length > 0 && (
                      <tfoot className="sticky bottom-0 z-20 bg-slate-50 font-bold text-xs text-slate-900 border-t-2 border-slate-200 shadow-md">
                        <tr>
                          <td colSpan={3} className="py-2.5 px-4 uppercase tracking-wider text-slate-600 bg-slate-50">
                            Total / Summary ({machineScheduleTableData.length} Machines)
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-800 bg-slate-50">
                            {formatWholeNumber(machineScheduleTableData.reduce((acc, r) => acc + r.planned, 0))}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-[#0E79B2] bg-slate-50">
                            {formatWholeNumber(machineScheduleTableData.reduce((acc, r) => acc + r.actual, 0))}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-emerald-600 bg-slate-50">
                            {formatPercent(
                              machineScheduleTableData.reduce((acc, r) => acc + r.planned, 0) > 0
                                ? (machineScheduleTableData.reduce((acc, r) => acc + r.actual, 0) / machineScheduleTableData.reduce((acc, r) => acc + r.planned, 0)) * 100
                                : 0,
                              1
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-800 bg-slate-50">
                            {formatWholeNumber(machineScheduleTableData.reduce((acc, r) => acc + r.variance, 0))}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-800 bg-slate-50">
                            {formatNumber(
                              machineScheduleTableData.reduce((acc, r) => acc + r.avgOee, 0) / machineScheduleTableData.length,
                              1
                            )}%
                          </td>
                          <td colSpan={2} className="bg-slate-50"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};
