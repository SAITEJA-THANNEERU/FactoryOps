import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Filter,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Download,
  RefreshCw,
  Printer,
  Share2,
  Check,
  X
} from 'lucide-react';

import { formatNumber, formatWholeNumber, formatCompactNumber, safeNumber } from '../../utils/formatters.ts';
import { useFilters } from '../../contexts/FilterContext.tsx';
import { useLockBodyScroll } from '../../utils/useLockBodyScroll.ts';

/**
 * Power BI Executive & Operational Number Formatter
 * Formats numbers consistently with max 2 decimals and safe null/NaN checks:
 * - 3080386 -> 3.08M (compact) or 3,080,386 (whole)
 * - 264914 -> 264.91K
 */
export function formatPowerBiNumber(
  val: number | string | null | undefined,
  style: 'compact' | 'indian_lakhs' | 'raw' | 'kilo_precise' | 'decimal2' = 'compact'
): string {
  const num = safeNumber(val);

  if (style === 'compact') {
    return formatCompactNumber(num, 2);
  }

  if (style === 'indian_lakhs') {
    const isWhole = Math.abs(num - Math.round(num)) < 0.001;
    const parts = formatNumber(num, isWhole ? 0 : 2, 0).split('.');
    let intPart = parts[0].replace(/,/g, '');
    const decPart = parts[1] || '';
    const isNeg = intPart.startsWith('-');
    if (isNeg) intPart = intPart.substring(1);

    if (intPart.length > 3) {
      const lastThree = intPart.substring(intPart.length - 3);
      const otherNumbers = intPart.substring(0, intPart.length - 3);
      const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      intPart = withCommas + ',' + lastThree;
    }
    const formattedInt = (isNeg ? '-' : '') + intPart;
    return decPart ? `${formattedInt}.${decPart}` : formattedInt;
  }

  if (style === 'kilo_precise') {
    const thousands = num / 1_000;
    return `${formatNumber(thousands, 2, 0)}K`;
  }

  if (style === 'decimal2') {
    return formatNumber(num, 2, 2);
  }

  return formatWholeNumber(num);
}

/**
 * Power BI & Operations Top Banner Header
 * Styled with crisp typography hierarchy and executive action buttons
 */
interface PowerBiBannerProps {
  title: string;
  theme?: 'black' | 'blue' | 'modern';
  onFilterClick?: () => void;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PowerBiBanner: React.FC<PowerBiBannerProps> = ({
  title,
  subtitle = 'Austin Gigafactory • Real-Time Industrial Operations & Equipment Intelligence',
  onFilterClick,
  actions
}) => {
  const {
    selectedLine,
    setSelectedLine,
    selectedShift,
    setSelectedShift,
    selectedStatus,
    setSelectedStatus,
    timeRange,
    setTimeRange,
    resetFilters
  } = useFilters();

  const [isFilterActive, setIsFilterActive] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const optionsRef = useRef<HTMLDivElement>(null);

  // Close options dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setIsOptionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterToggle = () => {
    setIsFilterActive(prev => !prev);
    if (onFilterClick) {
      onFilterClick();
    }
  };

  const handleFocusModeToggle = () => {
    setIsFocusMode(prev => {
      const next = !prev;
      if (next) {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  };

  const handleExportCsv = () => {
    setIsOptionsOpen(false);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Metric,Value,Status,Timestamp\n' +
      `"Dashboard","${title}","Active","${new Date().toISOString()}"\n` +
      '"Factory","Austin Gigafactory","Operational","Live Telemetry"\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefreshFeed = () => {
    setIsRefreshing(true);
    setIsOptionsOpen(false);
    window.dispatchEvent(new CustomEvent('factoryops:refresh'));
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handlePrintReport = () => {
    setIsOptionsOpen(false);
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setIsOptionsOpen(false);
    }, 1500);
  };

  return (
    <div className="w-full mb-2">
      <div className={`w-full bg-white border border-[#191923]/10 rounded-xl px-4 py-2.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
        isFocusMode ? 'ring-2 ring-[#0E79B2] shadow-lg' : ''
      }`}>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#191923]">
              {title}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isRefreshing ? 'animate-spin' : 'animate-pulse'}`}></span>
              <span>{isRefreshing ? 'Syncing...' : 'Live Data'}</span>
            </span>
            {isFocusMode && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0E79B2] border border-blue-200">
                Focus Mode
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-slate-500 font-medium">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 relative">
          {actions}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200/80">
            {/* Button 1: Toggle Filter Pane */}
            <button
              onClick={handleFilterToggle}
              className={`p-1.5 rounded transition-colors cursor-pointer relative ${
                isFilterActive || selectedLine !== 'all' || selectedShift !== 'all' || selectedStatus !== 'all'
                  ? 'bg-[#0E79B2] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-white hover:text-[#0E79B2]'
              }`}
              title="Toggle Operational Filter Pane"
              aria-label="Toggle Filter Pane"
            >
              <Filter className="w-3.5 h-3.5" />
              {(isFilterActive || selectedLine !== 'all' || selectedShift !== 'all' || selectedStatus !== 'all') && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
              )}
            </button>

            {/* Button 2: Focus Mode */}
            <button
              onClick={handleFocusModeToggle}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                isFocusMode
                  ? 'bg-[#191923] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-white hover:text-[#0E79B2]'
              }`}
              title={isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
              aria-label="Focus Mode"
            >
              {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Button 3: Dashboard Options Dropdown */}
            <div className="relative" ref={optionsRef}>
              <button
                onClick={() => setIsOptionsOpen(prev => !prev)}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  isOptionsOpen
                    ? 'bg-slate-200 text-slate-900'
                    : 'text-slate-600 hover:bg-white hover:text-[#0E79B2]'
                }`}
                title="Dashboard Options & Actions"
                aria-label="Dashboard Options"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Options Dropdown Menu */}
              {isOptionsOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 font-bold text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Dashboard Actions
                  </div>

                  <button
                    onClick={handleExportCsv}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium text-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0E79B2]" />
                    <span>Export CSV Telemetry</span>
                  </button>

                  <button
                    onClick={handleRefreshFeed}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium text-slate-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh Live Stream</span>
                  </button>

                  <button
                    onClick={handlePrintReport}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium text-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5 text-purple-600" />
                    <span>Print Executive Summary</span>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={handleCopyLink}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium text-slate-700"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Share Dashboard URL</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Operational Filter Drawer Panel */}
      {isFilterActive && (
        <div className="w-full bg-slate-50 border border-slate-200/90 rounded-xl p-3 mb-3 shadow-inner animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#0E79B2]" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Operational Filter Console
              </span>
            </div>
            <button
              onClick={() => setIsFilterActive(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-slate-500 font-bold mb-1 text-[11px]">Production Line</label>
              <select
                value={selectedLine}
                onChange={e => setSelectedLine(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-slate-800 font-medium focus:outline-hidden focus:border-[#0E79B2]"
              >
                <option value="all">All Lines</option>
                <option value="Line 1 - Machining">Line 1 - Machining</option>
                <option value="Line 2 - Assembly">Line 2 - Assembly</option>
                <option value="Line 3 - Quality">Line 3 - Quality</option>
                <option value="Line 4 - Coating">Line 4 - Coating</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1 text-[11px]">Shift</label>
              <select
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-slate-800 font-medium focus:outline-hidden focus:border-[#0E79B2]"
              >
                <option value="all">All Shifts</option>
                <option value="A">Shift A (Morning)</option>
                <option value="B">Shift B (Afternoon)</option>
                <option value="C">Shift C (Night)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1 text-[11px]">Equipment Status</label>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-slate-800 font-medium focus:outline-hidden focus:border-[#0E79B2]"
              >
                <option value="all">All Statuses</option>
                <option value="running">Running</option>
                <option value="warning">Warning</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-bold mb-1 text-[11px]">Telemetry Period</label>
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-slate-800 font-medium focus:outline-hidden focus:border-[#0E79B2]"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="ytd">Year to Date</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-end justify-between lg:justify-end gap-2 pt-1">
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
              >
                Reset
              </button>
              <button
                onClick={() => setIsFilterActive(false)}
                className="px-3 py-1.5 bg-[#0E79B2] hover:bg-[#0c6799] text-white rounded-lg font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Standard Donezo-style KPI Metric Card
 * Top row: Metric name + circular arrow icon
 * Middle row: Bold tabular numeral value
 * Bottom row: Subtitle/trend descriptor
 */
interface PowerBiCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  headerBg?: string;
  headerTextColor?: string;
  bodyBg?: string;
  bodyTextColor?: string;
  borderColor?: string;
  fontSerif?: boolean;
  trendText?: string;
  trendPositive?: boolean;
  icon?: React.ReactNode;
  iconBg?: string;
}

export const PowerBiCard: React.FC<PowerBiCardProps> = ({
  title,
  subtitle,
  value,
  trendText,
  trendPositive = true,
  icon,
  iconBg = 'bg-blue-50 text-[#0E79B2] border-blue-100'
}) => {
  return (
    <div className="bg-white border border-slate-200/90 hover:border-[#0E79B2]/40 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all duration-200 motion-reduce:transition-none hover:-translate-y-0.5 flex flex-col justify-between group">
      {/* Top Header: Icon + Label */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <div className={`p-1.5 rounded-lg border shrink-0 transition-transform duration-200 group-hover:scale-105 ${iconBg}`}>
              {icon}
            </div>
          )}
          <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider truncate">
            {title}
          </span>
        </div>
      </div>

      {/* Primary Metric Value */}
      <div className="my-1">
        <div className="text-xl sm:text-2xl font-extrabold text-[#191923] font-mono tracking-tight tabular-nums">
          {value}
        </div>
      </div>

      {/* Bottom Subtitle / Comparison Descriptor */}
      <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500">
        <span className="truncate">{subtitle || 'Live operational telemetry'}</span>
        {trendText && (
          <span className={`inline-flex items-center gap-1 font-bold shrink-0 ml-1.5 px-2 py-0.5 rounded-full text-[10px] border ${
            trendPositive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
              : 'bg-amber-50 text-amber-700 border-amber-200/80'
          }`}>
            {trendText}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Modern Visual Container Box with clean white card & header
 */
interface PowerBiVisualContainerProps {
  title: string;
  subtitle?: string;
  headerBg?: string;
  headerTextColor?: string;
  bodyBg?: string;
  borderColor?: string;
  children: React.ReactNode;
  heightClass?: string;
  rightAction?: React.ReactNode;
}

export const PowerBiVisualContainer: React.FC<PowerBiVisualContainerProps> = ({
  title,
  subtitle,
  children,
  heightClass = 'h-[300px]',
  rightAction
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Lock body scroll when Visual Focus Mode is active
  useLockBodyScroll(isExpanded);

  // Escape key listener to close Visual Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  return (
    <>
      <div className={`bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 motion-reduce:transition-none overflow-hidden flex flex-col ${heightClass}`}>
        <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="truncate pr-2">
            <h2 className="text-xs font-bold text-[#191923] uppercase tracking-wide truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {rightAction && <div className="shrink-0">{rightAction}</div>}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="w-6 h-6 rounded-lg bg-slate-50 hover:bg-[#0E79B2]/10 border border-slate-200/70 hover:border-[#0E79B2]/30 flex items-center justify-center text-slate-500 hover:text-[#0E79B2] text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
              title="Expand Visual Focus Mode (↗)"
              aria-label="Expand Visual Focus Mode"
            >
              ↗
            </button>
          </div>
        </div>
        <div className="flex-1 p-2.5 sm:p-3 overflow-hidden relative bg-white">
          {children}
        </div>
      </div>

      {/* Visual Focus Mode Center Modal Portal */}
      {isExpanded &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setIsExpanded(false)}
          >
            <div
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl h-[82vh] max-h-[900px] flex flex-col overflow-hidden relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Focus Mode Header */}
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="truncate pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#0E79B2]/10 text-[#0E79B2] border border-[#0E79B2]/20 font-mono">
                      Visual Focus Mode
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-[#191923] tracking-wide truncate">
                      {title}
                    </h2>
                  </div>
                  {subtitle && (
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {rightAction && <div className="shrink-0">{rightAction}</div>}
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer flex items-center justify-center border border-slate-200"
                    title="Close Visual Focus Mode (Esc)"
                    aria-label="Close Visual Focus Mode"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Focus Mode Body with fully interactive visual content */}
              <div className="flex-1 p-4 sm:p-6 overflow-auto bg-white relative flex flex-col min-h-0">
                {children}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
