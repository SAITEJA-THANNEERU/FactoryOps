import React, { useState, useRef, useEffect } from 'react';
import {
  Filter,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Download,
  RefreshCw,
  Printer,
  Share2,
  Check
} from 'lucide-react';

import { formatNumber, formatWholeNumber, formatCompactNumber, safeNumber } from '../../utils/formatters.ts';

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
    } else {
      // Find filter bar on page and scroll smoothly or highlight
      const filterBar = document.querySelector('.bg-white.border.border-slate-200.rounded-xl') || document.querySelector('select');
      if (filterBar) {
        filterBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
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
    <div className={`w-full bg-white border border-[#191923]/10 rounded-xl px-4 py-2.5 mb-2 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
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
              isFilterActive
                ? 'bg-[#0E79B2] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-white hover:text-[#0E79B2]'
            }`}
            title="Toggle Operational Filter Pane"
            aria-label="Toggle Filter Pane"
          >
            <Filter className="w-3.5 h-3.5" />
            {isFilterActive && (
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
      {/* Top Header: Icon + Label + Expand Arrow */}
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
        <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200/70 group-hover:bg-[#0E79B2]/10 group-hover:border-[#0E79B2]/30 flex items-center justify-center text-slate-400 group-hover:text-[#0E79B2] transition-colors shrink-0">
          <span className="text-[10px] font-bold">↗</span>
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
  return (
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
        {rightAction ? (
          <div className="shrink-0">{rightAction}</div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 text-[10px] font-bold shrink-0 hover:text-[#0E79B2] transition-colors cursor-pointer">
            ↗
          </div>
        )}
      </div>
      <div className="flex-1 p-2.5 sm:p-3 overflow-hidden relative bg-white">
        {children}
      </div>
    </div>
  );
};
