import { useEffect } from 'react';

let activeModalsCount = 0;
let savedOverflowStyle: string | null = null;

/**
 * Custom hook to lock body scrolling whenever a modal is open.
 * Uses reference counting so nested modals keep the body scroll locked
 * until all modals are closed, at which point normal body scrolling is restored.
 */
export function useLockBodyScroll(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    if (activeModalsCount === 0) {
      savedOverflowStyle = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeModalsCount++;

    return () => {
      activeModalsCount = Math.max(0, activeModalsCount - 1);
      if (activeModalsCount === 0) {
        document.body.style.overflow = savedOverflowStyle !== null ? savedOverflowStyle : '';
        savedOverflowStyle = null;
      }
    };
  }, [isOpen]);
}
