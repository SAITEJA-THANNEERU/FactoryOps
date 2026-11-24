import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Machine,
  ProductionRecord,
  MaintenanceRecord,
  Incident,
  WorkOrder,
  SOP,
  DataQualityMetric,
  FactoryKPIs,
  TechnicianProfile,
  TechnicianIncidentAssignment,
  AppNotification,
  NotificationPriority,
  NotificationType
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from './AuthContext.tsx';

export interface OperationalNotification {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  severity?: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  priority: NotificationPriority;
  notification_type: NotificationType;
  related_module: string;
  related_record_id?: string;
  targetPath: string;
  read: boolean;
  is_read: boolean;
  meta: string;
  recipient_role?: string;
  recipient_user_id?: string | null;
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
  technicianProfiles: TechnicianProfile[];
  technicianAssignments: TechnicianIncidentAssignment[];
  notifications: OperationalNotification[];
  unreadNotificationsCount: number;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  refreshTechnicians: () => Promise<void>;
  refreshTechnicianAssignments: (status?: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
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
  assignTechnicianToIncident: (data: Partial<TechnicianIncidentAssignment>) => Promise<TechnicianIncidentAssignment>;
  acceptTechnicianAssignment: (id: string, notes?: string) => Promise<TechnicianIncidentAssignment>;
  rejectTechnicianAssignment: (id: string, rejectionReason: string) => Promise<TechnicianIncidentAssignment>;
  requestAssignmentReassignment: (id: string, reassignmentReason: string) => Promise<TechnicianIncidentAssignment>;
  reviewAssignmentReassignment: (id: string, payload: { decision: 'APPROVE' | 'REJECT'; new_technician_id?: string; manager_notes?: string }) => Promise<TechnicianIncidentAssignment>;
  startAssignmentRepair: (id: string, notes?: string) => Promise<TechnicianIncidentAssignment>;
  updateAssignmentProgress: (id: string, payload: { progress_percent: number; diagnosis_notes: string; additional_problems_found?: string }) => Promise<TechnicianIncidentAssignment>;
  resolveAssignment: (id: string, payload: { confirmed_root_cause: string; actions_taken: string; parts_used?: any[]; actual_repair_hours: number; resolution_remarks?: string }) => Promise<TechnicianIncidentAssignment>;
  verifyAssignment: (id: string, payload: { decision: 'APPROVE' | 'REJECT'; verification_notes?: string; quality_rating?: number; rework_instructions?: string }) => Promise<TechnicianIncidentAssignment>;
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
  const [technicianProfiles, setTechnicianProfiles] = useState<TechnicianProfile[]>([]);
  const [technicianAssignments, setTechnicianAssignments] = useState<TechnicianIncidentAssignment[]>([]);
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
  const [serverNotifications, setServerNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTechnicians = useCallback(async () => {
    try {
      const data = await api.technicians.getAll();
      setTechnicianProfiles(data);
    } catch (err) {
      console.warn('Failed to load technician profiles:', err);
    }
  }, []);

  const refreshTechnicianAssignments = useCallback(async (status?: string) => {
    try {
      const data = await api.technicianAssignments.getAll(status);
      setTechnicianAssignments(data);
    } catch (err) {
      console.warn('Failed to load technician assignments:', err);
    }
  }, []);

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
      setTechnicianProfiles([]);
      setTechnicianAssignments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Single-factory mode: Apex (FAC-001) is the sole active factory
    const factoryId = activeFactory?.id || 'FAC-001';
    // Only roles authorized to view Data Quality (Admin, Super Admin) query the data-quality endpoint
    const canViewDataQuality = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'FACTORY_OWNER';

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
        notificationsData,
        techsData,
        assignmentsData
      ] = await Promise.all([
        api.machines.getAll(factoryId).catch(() => []),
        api.production.getAll(factoryId).catch(() => []),
        api.maintenance.getAll(factoryId).catch(() => []),
        api.incidents.getAll(factoryId).catch(() => []),
        api.workOrders.getAll(factoryId).catch(() => []),
        api.sops.getAll(factoryId).catch(() => []),
        canViewDataQuality ? api.dataQuality.getAll(factoryId).catch(() => []) : Promise.resolve([]),
        api.factories.getStats(factoryId).catch(() => null),
        api.notifications.getAll().catch(() => null),
        api.technicians.getAll().catch(() => []),
        api.technicianAssignments.getAll().catch(() => [])
      ]);

      setMachines(machinesData);
      setProduction(productionData);
      setMaintenance(maintenanceData);
      setIncidents(incidentsData);
      setWorkOrders(workOrdersData);
      setSops(sopsData);
      setDataQuality(dataQualityData);
      setKpis(kpiData);
      setTechnicianProfiles(techsData || []);
      setTechnicianAssignments(assignmentsData || []);

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

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.notifications.getAll('all');
      setServerNotifications(res.notifications || []);
    } catch (err) {
      console.warn('Failed to load role notifications:', err);
    }
  }, [isAuthenticated]);

  // Connect to Real-time SSE Notification Stream
  useEffect(() => {
    if (!isAuthenticated) {
      setServerNotifications([]);
      return;
    }

    refreshNotifications();

    const token = localStorage.getItem('factoryops_auth_token');
    if (!token) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connectSSE() {
      try {
        const url = `/api/notifications/stream?token=${encodeURIComponent(token!)}`;
        eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'NOTIFICATION' && data.notification) {
              setServerNotifications(prev => {
                const exists = prev.some(n => n.id === data.notification.id);
                if (exists) return prev;
                return [data.notification, ...prev];
              });
            } else if (data.type === 'NOTIFICATION_READ' && Array.isArray(data.ids)) {
              const readSet = new Set(data.ids);
              setServerNotifications(prev =>
                prev.map(n => readSet.has(n.id) ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
              );
              setReadNotificationIds(prev => {
                const next = new Set(prev);
                data.ids.forEach((id: string) => next.add(id));
                return next;
              });
            } else if (data.type === 'NOTIFICATION_DELETED' && data.id) {
              setServerNotifications(prev => prev.filter(n => n.id !== data.id));
            }
          } catch {}
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.warn('Failed to connect notification stream:', err);
      }
    }

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [isAuthenticated, refreshNotifications]);

  // Unified notifications list combining persistent database notifications & real-time telemetry
  const notifications = React.useMemo<OperationalNotification[]>(() => {
    const list: OperationalNotification[] = serverNotifications.map(sn => {
      const isRead = sn.is_read || readNotificationIds.has(sn.id);
      return {
        id: sn.id,
        type: sn.related_module.toLowerCase().includes('machine') ? 'machine' :
              sn.related_module.toLowerCase().includes('order') ? 'work_order' : 'incident',
        title: sn.title,
        description: sn.message,
        timestamp: new Date(sn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
        severity: sn.priority === 'CRITICAL' ? 'Critical' : sn.priority === 'HIGH' ? 'High' : sn.priority === 'MEDIUM' ? 'Medium' : 'Low',
        priority: sn.priority,
        notification_type: sn.notification_type,
        related_module: sn.related_module,
        related_record_id: sn.related_record_id,
        targetPath: sn.target_path,
        read: isRead,
        is_read: isRead,
        meta: sn.meta || `${sn.related_module} • ${sn.priority} Priority`,
        recipient_role: sn.recipient_role,
        recipient_user_id: sn.recipient_user_id
      };
    });

    return list.filter(n => !clearedNotificationIds.has(n.id));
  }, [serverNotifications, readNotificationIds, clearedNotificationIds]);

  const unreadNotificationsCount = React.useMemo(() => {
    return notifications.filter(n => !n.read && !n.is_read).length;
  }, [notifications]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    setReadNotificationIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('factoryops_read_notifications', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });

    setServerNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
    );

    try {
      await api.notifications.markRead(id);
    } catch (e) {
      console.warn('Failed to sync notification markRead with server:', e);
    }
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    const allIds = notifications.map(n => n.id);
    setReadNotificationIds(prev => {
      const next = new Set(prev);
      allIds.forEach(id => next.add(id));
      try {
        localStorage.setItem('factoryops_read_notifications', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });

    setServerNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );

    try {
      await api.notifications.markAllRead();
    } catch (e) {
      console.warn('Failed to sync markAllRead with server:', e);
    }
  }, [notifications]);

  const clearAllNotifications = useCallback(async () => {
    setClearedNotificationIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      try {
        localStorage.setItem('factoryops_cleared_notifications', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    setServerNotifications([]);
  }, [notifications]);

  const deleteNotification = useCallback(async (id: string) => {
    setServerNotifications(prev => prev.filter(n => n.id !== id));
    setClearedNotificationIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem('factoryops_cleared_notifications', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    try {
      await api.notifications.delete(id);
    } catch (e) {
      console.warn('Failed to delete notification:', e);
    }
  }, []);

  const assignTechnicianToIncident = useCallback(async (data: Partial<TechnicianIncidentAssignment>) => {
    const res = await api.technicianAssignments.assign(data);
    await refreshTechnicianAssignments();
    await refreshTechnicians();
    return res;
  }, [refreshTechnicianAssignments, refreshTechnicians]);

  const acceptTechnicianAssignment = useCallback(async (id: string, notes?: string) => {
    const res = await api.technicianAssignments.accept(id, notes);
    await refreshTechnicianAssignments();
    return res;
  }, [refreshTechnicianAssignments]);

  const rejectTechnicianAssignment = useCallback(async (id: string, rejectionReason: string) => {
    const res = await api.technicianAssignments.reject(id, rejectionReason);
    await refreshTechnicianAssignments();
    await refreshTechnicians();
    return res;
  }, [refreshTechnicianAssignments, refreshTechnicians]);

  const requestAssignmentReassignment = useCallback(async (id: string, reassignmentReason: string) => {
    const res = await api.technicianAssignments.requestReassignment(id, reassignmentReason);
    await refreshTechnicianAssignments();
    return res;
  }, [refreshTechnicianAssignments]);

  const reviewAssignmentReassignment = useCallback(async (id: string, payload: { decision: 'APPROVE' | 'REJECT'; new_technician_id?: string; manager_notes?: string }) => {
    const res = await api.technicianAssignments.reviewReassignment(id, payload);
    await refreshTechnicianAssignments();
    await refreshTechnicians();
    return res;
  }, [refreshTechnicianAssignments, refreshTechnicians]);

  const startAssignmentRepair = useCallback(async (id: string, notes?: string) => {
    const res = await api.technicianAssignments.startRepair(id, notes);
    await refreshTechnicianAssignments();
    return res;
  }, [refreshTechnicianAssignments]);

  const updateAssignmentProgress = useCallback(async (id: string, payload: { progress_percent: number; diagnosis_notes: string; additional_problems_found?: string }) => {
    const res = await api.technicianAssignments.progressUpdate(id, payload);
    await refreshTechnicianAssignments();
    return res;
  }, [refreshTechnicianAssignments]);

  const resolveAssignment = useCallback(async (id: string, payload: { confirmed_root_cause: string; actions_taken: string; parts_used?: any[]; actual_repair_hours: number; resolution_remarks?: string }) => {
    const res = await api.technicianAssignments.resolve(id, payload);
    await refreshTechnicianAssignments();
    return res;
  }, [refreshTechnicianAssignments]);

  const verifyAssignment = useCallback(async (id: string, payload: { decision: 'APPROVE' | 'REJECT'; verification_notes?: string; quality_rating?: number; rework_instructions?: string }) => {
    const res = await api.technicianAssignments.verify(id, payload);
    await refreshTechnicianAssignments();
    await refreshTechnicians();
    await refreshData();
    return res;
  }, [refreshTechnicianAssignments, refreshTechnicians, refreshData]);

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
        technicianProfiles,
        technicianAssignments,
        notifications,
        unreadNotificationsCount,
        isLoading,
        error,
        refreshData,
        refreshTechnicians,
        refreshTechnicianAssignments,
        refreshNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        deleteNotification,
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
        syncSupabase,
        assignTechnicianToIncident,
        acceptTechnicianAssignment,
        rejectTechnicianAssignment,
        requestAssignmentReassignment,
        reviewAssignmentReassignment,
        startAssignmentRepair,
        updateAssignmentProgress,
        resolveAssignment,
        verifyAssignment
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
