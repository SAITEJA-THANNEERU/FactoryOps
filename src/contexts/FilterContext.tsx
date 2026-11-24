import React, { createContext, useContext, useState } from 'react';

interface FilterContextType {
  selectedLine: string;
  setSelectedLine: (line: string) => void;
  selectedShift: string;
  setSelectedShift: (shift: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  selectedMachine: string;
  setSelectedMachine: (m: string) => void;
  selectedPriority: string;
  setSelectedPriority: (p: string) => void;
  selectedSeverity: string;
  setSelectedSeverity: (s: string) => void;
  selectedWorkOrderStatus: string;
  setSelectedWorkOrderStatus: (w: string) => void;
  timeRange: string;
  setTimeRange: (range: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  resetFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedWorkOrderStatus, setSelectedWorkOrderStatus] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const resetFilters = () => {
    setSelectedLine('all');
    setSelectedShift('all');
    setSelectedStatus('all');
    setSelectedMachine('all');
    setSelectedPriority('all');
    setSelectedSeverity('all');
    setSelectedWorkOrderStatus('all');
    setTimeRange('7d');
    setSearchQuery('');
  };

  return (
    <FilterContext.Provider
      value={{
        selectedLine,
        setSelectedLine,
        selectedShift,
        setSelectedShift,
        selectedStatus,
        setSelectedStatus,
        selectedMachine,
        setSelectedMachine,
        selectedPriority,
        setSelectedPriority,
        selectedSeverity,
        setSelectedSeverity,
        selectedWorkOrderStatus,
        setSelectedWorkOrderStatus,
        timeRange,
        setTimeRange,
        searchQuery,
        setSearchQuery,
        resetFilters
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};
