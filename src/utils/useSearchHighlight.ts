import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from '../contexts/RouterContext.tsx';

/**
 * Universal Search Highlighting & Auto-Scroll Hook
 * Supports case-insensitive matching, special character safety, delayed rendering auto-scroll,
 * and automatic fadeout on interaction across Machines, Incidents, Maintenance, Work Orders, and Production.
 */
export function useSearchHighlight() {
  const { highlightId, searchParamQuery, clearHighlight } = useRouter();
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const scrolledRef = useRef<boolean>(false);

  useEffect(() => {
    if (highlightId || searchParamQuery) {
      const target = (highlightId || searchParamQuery || '').trim().toLowerCase();
      setActiveHighlight(target);
      scrolledRef.current = false;

      // Auto clear visual glow after 6 seconds
      const timer = setTimeout(() => {
        setActiveHighlight(null);
      }, 6000);

      return () => clearTimeout(timer);
    } else {
      setActiveHighlight(null);
    }
  }, [highlightId, searchParamQuery]);

  /**
   * Evaluates whether a given item or record matches the active search / highlight criteria
   */
  const isHighlighted = useCallback(
    (primaryId?: string | null, ...matchStrings: (string | null | undefined)[]): boolean => {
      if (!activeHighlight) return false;
      const target = activeHighlight.toLowerCase();

      // Check primary ID
      if (primaryId && primaryId.toLowerCase() === target) return true;
      if (primaryId && primaryId.toLowerCase().includes(target)) return true;

      // Check additional matching strings (e.g. machine_id, title, code)
      for (const str of matchStrings) {
        if (!str) continue;
        const lower = str.toLowerCase();
        if (lower === target || lower.includes(target)) {
          return true;
        }
      }

      return false;
    },
    [activeHighlight]
  );

  /**
   * Ref callback to auto-scroll matching element smoothly into view
   */
  const highlightRef = useCallback((element: HTMLElement | null) => {
    if (element && !scrolledRef.current) {
      scrolledRef.current = true;
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
    }
  }, []);

  const highlightClass =
    'ring-2 ring-[#0E79B2] ring-offset-2 bg-blue-50/80 shadow-md transition-all duration-500 rounded-lg';

  return {
    highlightId: activeHighlight,
    searchQuery: searchParamQuery,
    isHighlighted,
    highlightRef,
    highlightClass,
    clearHighlight
  };
}
