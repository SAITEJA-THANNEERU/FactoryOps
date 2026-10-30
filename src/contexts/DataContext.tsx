import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Machine,
  ProductionRecord,
  MaintenanceRecord,
  Incident,
  WorkOrder,
  SOP,
  DataQualityMetric,
  FactoryKPIs
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from './AuthContext.tsx';

export interface OperationalNotification {
  id: string;
  type: 'incident' | 'work_order' | 'machine';
  title: string;
  description: string;
  timestamp: string;
  severity?: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  targetPath: string;
  read: boolean;
  meta: string;
}

interface DataContextType {
  machines: Machine[];
  production: ProductionRecord[];
  maintenance: MaintenanceRecord[];
  incidents: Incident[];
  workOrders: WorkOrder[];
  sops: SOP[];
  dataQuality: DataQualityMetric[];
  kpis: FactoryKPIs | null;
  notifications: OperationalNotification[];
  unreadNotificationsCount: number;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  clearAllNotifications: () => void;
  createIncident: (data: { machine_id: string; title: string; description: string; severity: string }) => Promise<Incident>;
  createWorkOrder: (data: {
    machine_id: string;
    title: string;
    priority: string;
    assigned_to: string;
    due_date: string;
    estimated_hours: number;
    parts_required?: string;
  }) => Promise<WorkOrder>;
  updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => Promise<WorkOrder>;
  deleteWorkOrder: (id: string) => Promise<boolean>;
  updateIncident: (id: string, updates: Partial<Incident>) => Promise<Incident>;
  deleteIncident: (id: string) => Promise<boolean>;
  createMachine: (data: Partial<Machine>) => Promise<Machine>;
  updateMachine: (id: string, updates: Partial<Machine>) => Promise<Machine>;
  updateMachineStatus: (id: string, status: string) => Promise<Machine>;
  deleteMachine: (id: string) => Promise<boolean>;
  createProductionRecord: (data: Partial<ProductionRecord>) => Promise<ProductionRecord>;
  deleteProductionRecord: (id: string) => Promise<boolean>;
  createMaintenanceRecord: (data: Partial<MaintenanceRecord>) => Promise<MaintenanceRecord>;
  deleteMaintenanceRecord: (id: string) => Promise<boolean>;
  syncSupabase: () => Promise<{ success: boolean; message: string; details?: any }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeFactory, isAuthenticated } = useAuth();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [production, setProduction] = useState<ProductionRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [sops, setSops] = useState<SOP[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualityMetric[]>([]);
  const [kpis, setKpis] = useState<FactoryKPIs | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('factoryops_read_notifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [clearedNotificationIds, setClearedNotificationIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('factoryops_cleared_notifications');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      setMachines([]);
      setProduction([]);
      setMaintenance([]);
      setIncidents([]);
      setWorkOrders([]);
      setSops([]);
      setDataQuality([]);
      setKpis(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Single-factory mode: Apex (FAC-001) is the sole active factory
    const factoryId = activeFactory?.id || 'FAC-001';

    try {
      const [
        machinesData,
        productionData,
        maintenanceData,
        incidentsData,
        workOrdersData,
        sopsData,
        dataQualityData,
        kpiData,
        notificationsData
      ] = await Promise.all([
        api.machines.getAll(factoryId),
        api.production.getAll(factoryId),
        api.maintenance.getAll(factoryId),
        api.incidents.getAll(factoryId),
        api.workOrders.getAll(factoryId),
        api.sops.getAll(factoryId),
        api.dataQuality.getAll(factoryId),
        api.factories.getStats(factoryId),
        api.notifications.getAll().catch(() => null)
      ]);

      setMachines(machinesData);
      setProduction(productionData);
      setMaintenance(maintenanceData);
      setIncidents(incidentsData);
      setWorkOrders(workOrdersData);
      setSops(sopsData);
      setDataQuality(dataQualityData);
      setKpis(kpiData);

      if (notificationsData?.readIds) {
        setReadNotificationIds(prev => {
          const merged = new Set(prev);
          notificationsData.readIds.forEach(id => merged.add(id));
          try {
            localStorage.setItem('factoryops_read_notifications', JSON.stringify(Array.from(merged)));
          } catch {}
          return merged;
        });
      }
    } catch (err: any) {
      console.error('Error fetching factory data:', err);
      setError(err.message || 'Failed to load factory operational records');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.role, activeFactory]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const createIncident = async (data: { machine_id: string; title: string; description: string; severity: string }) => {
    const newInc = await api.incidents.create(data);
    setIncidents(prev => [newInc, ...prev]);
    if (activeFactory) {
      const updatedKpis = await api.factories.getStats(activeFactory.id);
      setKpis(updatedKpis);
    }
    return newInc;
  };

  const createWorkOrder = async (data: {
    machine_id: string;
    title: string;
    priority: string;
    assigned_to: string;
    due_date: string;
    estimated_hours: number;
    parts_required?: string;
  }) => {
    const newWo = await api.workOrders.create(data);
    setWorkOrders(prev => [newWo, ...prev]);
    if (activeFactory) {
      const updatedKpis = await api.factories.getStats(activeFactory.id);
      setKpis(updatedKpis);
    }
    return newWo;
  };

  const updateWorkOrder = async (id: string, updates: Partial<WorkOrder>) => {
    const updated = await api.workOrders.update(id, updates);
    setWorkOrders(prev => prev.map(wo => (wo.id === id || wo.work_order_id === id ? updated : wo)));
    if (activeFactory) {
      api.factories.getStats(activeFactory.id).then(setKpis).catch(console.error);
    }
    return updated;
  };

  const deleteWorkOrder = async (id: string) => {
    const res = await api.workOrders.delete(id);
    if (res.success) {
      setWorkOrders(prev => prev.filter(wo => wo.id !== id && wo.work_order_id !== id));
      if (activeFactory) {
        api.factories.getStats(activeFactory.id).then(setKpis).catch(console.error);
      }
      return true;
    }
    return false;
  };

  const updateIncident = async (id: string, updates: Partial<Incident>) => {
    const updated = await api.incidents.update(id, updates);
    setIncidents(prev => prev.map(inc => (inc.id === id || inc.incident_id === id ? updated : inc)));
    if (activeFactory) {
      api.factories.getStats(activeFactory.id).then(setKpis).catch(console.error);
    }
    return updated;
  };

  const deleteIncident = async (id: string) => {
    const res = await api.incidents.delete(id);
    if (res.success) {
      setIncidents(prev => prev.filter(inc => inc.id !== id && inc.incident_id !== id));
      if (activeFactory) {
        api.factories.getStats(activeFactory.id).then(setKpis).catch(console.error);
      }
      return true;
    }
    return false;
  };

  const createMachine = async (data: Partial<Machine>) => {
    const newMachine = await api.machines.create(data);
    setMachines(prev => [newMachine, ...prev]);
    if (activeFactory) {
      api.factories.getStats(activeFactory.id).then(setKpis).catch(console.error);
    }
    return newMachine;
  };

  const updateMachine = async (id: string, updates: Partial<Machine>) => {
    const updated = await api.machines.update(id, updates);
    setMachines(prev => prev.map(m => (m.id === id || m.machine_id === id ? updated : m)));
    if (activeFactory) {
      api.factories.getStats(activeFactory.id).then(setKpis).catch(console.error);
    }
    return updated;
  };

  const updateMachineStatus = async (id: string, status: string) => {
    const updated = await api.machines.updateStatus(id, status);
    setMachines(prev => prev.map(m => (m.id === id || m.machine_id === id ? updated : m)));
    if (activeFactory) {
      api.factories.getStats(activeFactory.id).then(setKpis).catch(console.error);
    }
    return updated;
  };

  const deleteMachine = async (id: string) => {
    const res = await api.machines.delete(id);
    if (res.success) {
      setMachines(prev => prev.filter(m => m.id !== id && m.machine_id !== id));
      if (activeFactory) {
        api.factories.getStats(activeFactory.id).then(setKpis).catch(console.error);
      }
      return true;
    }
    return false;
  };

  const createProductionRecord = async (data: Partial<ProductionRecord>) => {
    const newRecord = await api.production.create(data);
    setProduction(prev => [newRecord, ...prev]);
    if (activeFactory) {
      api.factories.getStats(activeFactory.id).then(setKpis).catch(console.error);
    }
    return newRecord;
  };

  const deleteProductionRecord = async (id: string) => {
    const res = await api.production.delete(id);
    if (res.success) {
      setProduction(prev => prev.filter(p => p.id !== id && (p as any).record_id !== id));
      if (activeFactory) {
        api.factories.getStats(activeFactory.id).then(setKpis).catch(console.error);
      }
      return true;
    }
    return false;
  };

  const createMaintenanceRecord = async (data: Partial<MaintenanceRecord>) => {
    const newRecord = await api.maintenance.create(data);
    setMaintenance(prev => [newRecord, ...prev]);
    if (activeFactory) {
      api.factories.getStats(activeFactory.id).then(setKpis).catch(console.error);
    }
    return newRecord;
  };

  const deleteMaintenanceRecord = async (id: string) => {
    const res = await api.maintenance.delete(id);
    if (res.success) {
      setMaintenance(prev => prev.filter(m => m.id !== id && m.maintenance_id !== id));
      if (activeFactory) {
        api.factories.getStats(activeFactory.id).then(setKpis).catch(console.error);
      }
      return true;
    }
    return false;
  };

  const syncSupabase = async () => {
    const res = await api.supabase.sync();
    await refreshData();
    return res;
  };

  // Derive notifications from live plant telemetry and incidents
  const notifications = React.useMemo<OperationalNotification[]>(() => {
    const list: OperationalNotification[] = [];

    // 1. Incidents
    incidents.forEach(inc => {
      if (inc.status !== 'Closed') {
        const id = `inc-${inc.id || inc.incident_id}`;
        const isRead = readNotificationIds.has(id) ||
                       (inc.id ? readNotificationIds.has(`inc-${inc.id}`) : false) ||
                       (inc.incident_id ? readNotificationIds.has(`inc-${inc.incident_id}`) : false);
        list.push({
          id,
          type: 'incident',
          title: `${inc.severity} Incident: ${inc.incident_id || inc.id}`,
          description: `${inc.title} - ${inc.description || 'Equipment anomaly'}`,
          timestamp: inc.reported_at ? new Date(inc.reported_at).toLocaleString() : 'Recent shift',
          severity: (inc.severity as any) || 'High',
          targetPath: '/incidents',
          read: isRead,
          meta: `Machine: ${inc.machine_id} • Status: ${inc.status}`
        });
      }
    });

    // 2. Urgent / Active Work Orders
    workOrders.forEach(wo => {
      if (wo.status === 'Pending Parts' || wo.status === 'In Progress' || wo.priority === 'Critical' || wo.priority === 'High') {
        const id = `wo-${wo.id || wo.work_order_id}`;
        const isRead = readNotificationIds.has(id) ||
                       (wo.id ? readNotificationIds.has(`wo-${wo.id}`) : false) ||
                       (wo.work_order_id ? readNotificationIds.has(`wo-${wo.work_order_id}`) : false);
        list.push({
          id,
          type: 'work_order',
          title: `Work Order: ${wo.work_order_id || wo.id}`,
          description: `${wo.title} (${wo.priority} Priority)`,
          timestamp: wo.created_at ? new Date(wo.created_at).toLocaleString() : 'Active order',
          severity: (wo.priority as any) || 'Medium',
          targetPath: '/work-orders',
          read: isRead,
          meta: `Assigned: ${wo.assigned_to || 'Unassigned'} • Due: ${wo.due_date || 'ASAP'}`
        });
      }
    });

    // 3. Machines in Warning or Offline
    machines.forEach(m => {
      if (m.status === 'warning') {
        const id = `mach-${m.id || m.machine_id}`;
        const isRead = readNotificationIds.has(id) ||
                       (m.id ? readNotificationIds.has(`mach-${m.id}`) : false) ||
                       (m.machine_id ? readNotificationIds.has(`mach-${m.machine_id}`) : false);
        list.push({
          id,
          type: 'machine',
          title: `Telemetry Alert: ${m.machine_id || m.id}`,
          description: `${m.name} operating at elevated telemetry (${m.temperature_c}°C / ${m.vibration_mms} mm/s)`,
          timestamp: 'Live reading',
          severity: 'High',
          targetPath: '/machines',
          read: isRead,
          meta: `Line: ${m.line} • Health: ${m.health_score}%`
        });
      }
    });

    return list.filter(n => !clearedNotificationIds.has(n.id));
  }, [incidents, workOrders, machines, readNotificationIds, clearedNotificationIds]);

  const unreadNotificationsCount = React.useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    setReadNotificationIds(prev => {
      const next = new Set(prev);
      next.add(id);

      // Also mark ID variations
      if (id.startsWith('inc-')) {
        const raw = id.replace('inc-', '');
        const found = incidents.find(i => String(i.id) === raw || String(i.incident_id) === raw);
        if (found) {
          if (found.id) next.add(`inc-${found.id}`);
          if (found.incident_id) next.add(`inc-${found.incident_id}`);
        }
      } else if (id.startsWith('wo-')) {
        const raw = id.replace('wo-', '');
        const found = workOrders.find(w => String(w.id) === raw || String(w.work_order_id) === raw);
        if (found) {
          if (found.id) next.add(`wo-${found.id}`);
          if (found.work_order_id) next.add(`wo-${found.work_order_id}`);
        }
      } else if (id.startsWith('mach-')) {
        const raw = id.replace('mach-', '');
        const found = machines.find(m => String(m.id) === raw || String(m.machine_id) === raw);
        if (found) {
          if (found.id) next.add(`mach-${found.id}`);
          if (found.machine_id) next.add(`mach-${found.machine_id}`);
        }
      }

      try {
        localStorage.setItem('factoryops_read_notifications', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });

    try {
      await api.notifications.markRead(id);
    } catch (e) {
      console.warn('Failed to sync notification markRead with server:', e);
    }
  }, [incidents, workOrders, machines]);

  const markAllNotificationsAsRead = useCallback(async () => {
    setReadNotificationIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      incidents.forEach(inc => {
        if (inc.id) next.add(`inc-${inc.id}`);
        if (inc.incident_id) next.add(`inc-${inc.incident_id}`);
      });
      workOrders.forEach(wo => {
        if (wo.id) next.add(`wo-${wo.id}`);
        if (wo.work_order_id) next.add(`wo-${wo.work_order_id}`);
      });
      machines.forEach(m => {
        if (m.id) next.add(`mach-${m.id}`);
        if (m.machine_id) next.add(`mach-${m.machine_id}`);
      });

      try {
        localStorage.setItem('factoryops_read_notifications', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });

    try {
      const allIds = notifications.map(n => n.id);
      await api.notifications.markAllRead(allIds);
    } catch (e) {
      console.warn('Failed to sync markAllRead with server:', e);
    }
  }, [notifications, incidents, workOrders, machines]);

  const clearAllNotifications = useCallback(() => {
    setClearedNotificationIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      try {
        localStorage.setItem('factoryops_cleared_notifications', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  }, [notifications]);

  return (
    <DataContext.Provider
      value={{
        machines,
        production,
        maintenance,
        incidents,
        workOrders,
        sops,
        dataQuality,
        kpis,
        notifications,
        unreadNotificationsCount,
        isLoading,
        error,
        refreshData,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        createIncident,
        updateIncident,
        deleteIncident,
        createWorkOrder,
        updateWorkOrder,
        deleteWorkOrder,
        createMachine,
        updateMachine,
        updateMachineStatus,
        deleteMachine,
        createProductionRecord,
        deleteProductionRecord,
        createMaintenanceRecord,
        deleteMaintenanceRecord,
        syncSupabase
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
