import React, { createContext, useContext } from 'react';
import { FocusModeContext, useIsFocusMode } from './dashboard/PowerBiComponents.tsx';

interface TableLayoutContextType {
  isFocusMode: boolean;
}

const TableLayoutContext = createContext<TableLayoutContextType>({
  isFocusMode: false,
});

export const useTableLayout = (): TableLayoutContextType => {
  const context = useContext(TableLayoutContext);
  const isFocus = useIsFocusMode();
  return {
    isFocusMode: context.isFocusMode || isFocus,
  };
};

export { FocusModeContext, useIsFocusMode };

interface TableLayoutProviderProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightNormal?: string;
  className?: string;
  scrollClassName?: string;
}

/**
 * Centralized, reusable TableLayoutProvider architecture
 * Manages responsive table container sizing, available width/height,
 * sticky headers, fixed footer summaries, internal vertical scrolling,
 * and seamless Visual Focus Mode expansion.
 */
export const TableLayoutProvider: React.FC<TableLayoutProviderProps> = ({
  children,
  footer,
  maxHeightNormal = 'max-h-[250px]',
  className = '',
  scrollClassName = '',
}) => {
  const isFocusMode = useIsFocusMode();

  return (
    <TableLayoutContext.Provider value={{ isFocusMode }}>
      <div
        className={`w-full flex flex-col justify-between h-full min-h-0 ${
          isFocusMode ? 'flex-1 focus-mode-table-wrapper' : ''
        } ${className}`}
      >
        <div
          className={`w-full overflow-x-auto overflow-y-auto text-xs ${
            isFocusMode
              ? 'flex-1 min-h-0 h-full max-h-none'
              : maxHeightNormal
          } ${scrollClassName}`}
        >
          {children}
        </div>

        {footer && (
          <div className="shrink-0 bg-slate-50 border-t border-slate-200 z-10">
            {footer}
          </div>
        )}
      </div>
    </TableLayoutContext.Provider>
  );
};
