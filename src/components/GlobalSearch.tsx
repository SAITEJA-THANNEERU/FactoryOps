import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../contexts/DataContext.tsx';
import { useRouter } from '../contexts/RouterContext.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import {
  Search,
  X,
  Cpu,
  AlertTriangle,
  ClipboardList,
  BookOpen,
  ArrowRight,
  CornerDownLeft,
  Loader2,
  Wrench,
  TrendingUp
} from 'lucide-react';
import type { Machine, Incident, WorkOrder, SOP, MaintenanceRecord, ProductionRecord } from '../types/index.ts';

interface SearchResultItem {
  id: string;
  category: 'Machines' | 'Incidents' | 'Work Orders' | 'Maintenance' | 'Production' | 'SOPs';
  title: string;
  subtitle: string;
  code: string;
  badge: string;
  badgeStyle: string;
  targetPath: string;
  original: Machine | Incident | WorkOrder | SOP | MaintenanceRecord | ProductionRecord;
}

interface GlobalSearchProps {
  onSelectMachine?: (machine: Machine) => void;
  mobileTriggerOnly?: boolean;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectMachine }) => {
  const { machines, incidents, workOrders, maintenance, production, sops } = useData();
  const { user } = useAuth();
  const { navigate } = useRouter();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Debounce input by 150ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Global hotkey: ⌘K or Ctrl+K to open & focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setIsMobileModalOpen(true);
        } else {
          setIsOpen(true);
          inputRef.current?.focus();
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setIsMobileModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus mobile input when mobile modal opens
  useEffect(() => {
    if (isMobileModalOpen) {
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    }
  }, [isMobileModalOpen]);

  // Handle outside clicks to close desktop dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute matched items using real authorized records
  const searchResults = useMemo<SearchResultItem[]>(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return [];

    const results: SearchResultItem[] = [];

    // 1. Search Machines
    machines.forEach(m => {
      const match =
        (m.machine_id && m.machine_id.toLowerCase().includes(q)) ||
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.machine_name && m.machine_name.toLowerCase().includes(q)) ||
        (m.line && m.line.toLowerCase().includes(q)) ||
        (m.type && m.type.toLowerCase().includes(q)) ||
        (m.operator && m.operator.toLowerCase().includes(q));

      if (match) {
        results.push({
          id: `m-${m.machine_id || m.id}`,
          category: 'Machines',
          title: m.name || m.machine_name || m.machine_id,
          subtitle: `${m.line} • ${m.type || 'Equipment'} • Op: ${m.operator || 'Unassigned'}`,
          code: m.machine_id,
          badge: m.status ? m.status.toUpperCase() : 'ONLINE',
          badgeStyle:
            m.status === 'running'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : m.status === 'warning'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-rose-50 text-rose-700 border-rose-200',
          targetPath: '/machines',
          original: m
        });
      }
    });

    // 2. Search Incidents
    incidents.forEach(inc => {
      const match =
        (inc.incident_id && inc.incident_id.toLowerCase().includes(q)) ||
        (inc.title && inc.title.toLowerCase().includes(q)) ||
        (inc.description && inc.description.toLowerCase().includes(q)) ||
        (inc.machine_id && inc.machine_id.toLowerCase().includes(q)) ||
        (inc.failure_category && inc.failure_category.toLowerCase().includes(q));

      if (match) {
        results.push({
          id: `inc-${inc.id || inc.incident_id}`,
          category: 'Incidents',
          title: inc.title,
          subtitle: `${inc.machine_id} • ${inc.failure_category || 'Mechanical'} • ${inc.status}`,
          code: inc.incident_id || inc.id || 'INC',
          badge: inc.severity || 'Medium',
          badgeStyle:
            inc.severity === 'Critical'
              ? 'bg-rose-100 text-rose-800 border-rose-300'
              : inc.severity === 'High'
              ? 'bg-orange-100 text-orange-800 border-orange-300'
              : 'bg-amber-100 text-amber-800 border-amber-300',
          targetPath: '/incidents',
          original: inc
        });
      }
    });

    // 3. Search Work Orders
    workOrders.forEach(wo => {
      const match =
        (wo.work_order_id && wo.work_order_id.toLowerCase().includes(q)) ||
        (wo.title && wo.title.toLowerCase().includes(q)) ||
        (wo.machine_id && wo.machine_id.toLowerCase().includes(q)) ||
        (wo.assigned_to && wo.assigned_to.toLowerCase().includes(q));

      if (match) {
        results.push({
          id: `wo-${wo.id || wo.work_order_id}`,
          category: 'Work Orders',
          title: wo.title,
          subtitle: `Machine: ${wo.machine_id} • Assigned: ${wo.assigned_to || 'None'}`,
          code: wo.work_order_id || wo.id || 'WO',
          badge: wo.priority || 'Medium',
          badgeStyle:
            wo.priority === 'Critical'
              ? 'bg-rose-100 text-rose-800 border-rose-300'
              : 'bg-blue-100 text-[#0E79B2] border-blue-300',
          targetPath: '/work-orders',
          original: wo
        });
      }
    });

    // 4. Search Maintenance
    maintenance.forEach(m => {
      const match =
        (m.machine_id && m.machine_id.toLowerCase().includes(q)) ||
        (m.type && m.type.toLowerCase().includes(q)) ||
        (m.technician && m.technician.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q));

      if (match) {
        results.push({
          id: `maint-${m.id}`,
          category: 'Maintenance',
          title: `${m.type} on ${m.machine_id}`,
          subtitle: `${m.technician} • Scheduled: ${m.scheduled_date} • ${m.status}`,
          code: m.machine_id,
          badge: m.status,
          badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          targetPath: '/maintenance',
          original: m
        });
      }
    });

    // 5. Search Production Runs
    production.slice(0, 100).forEach(p => {
      const match =
        (p.machine_id && p.machine_id.toLowerCase().includes(q)) ||
        ((p as any).product_name && (p as any).product_name.toLowerCase().includes(q)) ||
        (p.operator && p.operator.toLowerCase().includes(q)) ||
        (p.shift && p.shift.toLowerCase() === q);

      if (match) {
        results.push({
          id: `prod-${p.id}`,
          category: 'Production',
          title: `Shift ${p.shift}: Machine ${p.machine_id}`,
          subtitle: `${p.actual_units || 0} units • Op: ${p.operator || 'Staff'}`,
          code: p.machine_id,
          badge: `Shift ${p.shift}`,
          badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200',
          targetPath: '/production',
          original: p
        });
      }
    });

    // 6. Search SOPs
    sops.forEach(sop => {
      const match =
        (sop.id && sop.id.toLowerCase().includes(q)) ||
        (sop.title && sop.title.toLowerCase().includes(q)) ||
        (sop.category && sop.category.toLowerCase().includes(q)) ||
        (sop.machine_type && sop.machine_type.toLowerCase().includes(q));

      if (match) {
        results.push({
          id: `sop-${sop.id}`,
          category: 'SOPs',
          title: sop.title,
          subtitle: `Category: ${sop.category} • Target: ${sop.machine_type}`,
          code: sop.id,
          badge: 'SOP',
          badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          targetPath: '/sops',
          original: sop
        });
      }
    });

    return results.slice(0, 16);
  }, [debouncedQuery, machines, incidents, workOrders, maintenance, production, sops]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  const handleSelectItem = (item: SearchResultItem) => {
    setIsOpen(false);
    setIsMobileModalOpen(false);
    const targetCode = item.code || (item.original as any)?.id || query.trim();
    const cleanQuery = query.trim();
    setQuery('');
    const sep = item.targetPath.includes('?') ? '&' : '?';
    navigate(`${item.targetPath}${sep}highlight=${encodeURIComponent(targetCode)}&search=${encodeURIComponent(cleanQuery || targetCode)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      if (!isOpen) { setIsOpen(true); return; }
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, searchResults.length));
    } else if (e.key === 'ArrowUp') {
      if (!isOpen) { setIsOpen(true); return; }
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + searchResults.length) % Math.max(1, searchResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0 && selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleSelectItem(searchResults[selectedIndex]);
      } else if (searchResults.length > 0) {
        handleSelectItem(searchResults[0]);
      } else if (query.trim()) {
        const raw = query.trim();
        setIsOpen(false);
        setIsMobileModalOpen(false);
        setQuery('');
        navigate(`/machines?highlight=${encodeURIComponent(raw)}&search=${encodeURIComponent(raw)}`);
      }
    }
  };

  const getCategoryIcon = (category: SearchResultItem['category']) => {
    switch (category) {
      case 'Machines':
        return <Cpu className="w-4 h-4 text-emerald-600" />;
      case 'Incidents':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'Work Orders':
        return <ClipboardList className="w-4 h-4 text-[#0E79B2]" />;
      case 'Maintenance':
        return <Wrench className="w-4 h-4 text-emerald-600" />;
      case 'Production':
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case 'SOPs':
        return <BookOpen className="w-4 h-4 text-indigo-600" />;
    }
  };

  // Group items by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResultItem[]> = {};
    searchResults.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [searchResults]);

  return (
    <>
      {/* Mobile Search Button (Visible on mobile screens < 640px) */}
      <button
        onClick={() => setIsMobileModalOpen(true)}
        className="sm:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        title="Open Global Search"
        aria-label="Open Global Search"
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Desktop & Tablet Search Bar (sm and up: 640px+) */}
      <div ref={containerRef} className="hidden sm:flex flex-1 max-w-xl lg:max-w-2xl min-w-[220px] mx-2 relative">
        <div className="w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search machines, work orders, incidents... (⌘K)"
            className="w-full pl-9 pr-14 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-[#191923] placeholder-slate-400 focus:outline-hidden focus:border-[#0E79B2] focus:ring-1 focus:ring-[#0E79B2] focus:bg-white transition-all shadow-2xs font-normal"
          />

          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setQuery('');
                  inputRef.current?.focus();
                }}
                aria-label="Clear search query"
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded shadow-2xs select-none">
                ⌘K
              </kbd>
            )}
          </div>
        </div>

        {/* Dropdown Results Box */}
        {isOpen && debouncedQuery && (
          <div className="absolute top-full left-0 w-full min-w-[340px] sm:min-w-[480px] lg:min-w-[580px] max-w-2xl mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 text-xs">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <Search className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                  <p className="font-semibold text-slate-700 text-xs">No records found</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    No equipment, incidents, or work orders match "{debouncedQuery}".
                  </p>
                </div>
              ) : (
                Object.entries(groupedResults).map(([cat, items]) => (
                  <div key={cat} className="p-2">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>{cat}</span>
                      <span>{items.length}</span>
                    </div>

                    <div className="space-y-0.5 mt-1">
                      {items.map(item => {
                        const globalIdx = searchResults.findIndex(r => r.id === item.id);
                        const isSelected = globalIdx === selectedIndex;

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/80 text-[#0E79B2]' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className="p-1 rounded-md bg-slate-100 shrink-0">
                                {getCategoryIcon(item.category)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                                    {item.code}
                                  </span>
                                  <span className="font-bold truncate text-xs text-slate-900">
                                    {item.title}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {item.subtitle}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-semibold border px-1.5 py-0.2 rounded ${item.badgeStyle}`}>
                                {item.badge}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Dropdown Footer */}
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3 text-slate-400" /> Select to navigate
              </span>
              <span>
                {searchResults.length} operational record{searchResults.length !== 1 ? 's' : ''} found
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Search Modal Overlay */}
      {isMobileModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col p-4">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] w-full max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header / Input */}
            <div className="p-3 bg-[#191923] text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-[#0E79B2] shrink-0" />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search machines, work orders, incidents..."
                className="flex-1 bg-transparent border-0 text-white placeholder-slate-400 text-xs focus:outline-hidden"
              />
              {query && (
                <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsMobileModalOpen(false)}
                className="text-xs text-slate-300 hover:text-white px-2 py-1 rounded"
              >
                Cancel
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 text-xs">
              {debouncedQuery === '' ? (
                <div className="p-6 text-center text-slate-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-semibold text-slate-700">Type to search factory assets</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Search by machine ID (M003), incident, work order or SOP
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <p className="font-semibold text-slate-700">No matching records found</p>
                </div>
              ) : (
                searchResults.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="p-3 hover:bg-slate-50 flex items-center justify-between rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="p-1 rounded bg-slate-100 shrink-0">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1 rounded bg-slate-100 text-slate-700">
                            {item.code}
                          </span>
                          <span className="font-bold truncate text-xs text-slate-900">
                            {item.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
