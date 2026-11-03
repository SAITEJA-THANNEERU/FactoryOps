import type {
  User,
  Factory,
  Machine,
  ProductionRecord,
  MaintenanceRecord,
  Incident,
  WorkOrder,
  SOP,
  DataQualityMetric,
  FactoryKPIs,
  SuperAdminOverview,
  FactoryLocation,
  AttendanceRecord,
  AttendanceAuditLog,
  AttendanceSummaryKPIs,
  SparePart,
  SystemAuditLog,
  TechnicianProfile,
  TechnicianIncidentAssignment,
  TechnicianRecommendationResult,
  AppNotification
} from '../types/index.ts';

const TOKEN_KEY = 'factoryops_auth_token';

class ApiService {
  private inspectingFactoryId: string | null = null;

  public setInspectingFactoryId(factoryId: string | null) {
    this.inspectingFactoryId = factoryId;
  }

  public getInspectingFactoryId(): string | null {
    return this.inspectingFactoryId;
  }

  public getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public setToken(token: string | null) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Attach active inspecting factory header if set (for Super Admin)
    if (this.inspectingFactoryId) {
      headers['x-factory-id'] = this.inspectingFactoryId;
    }

    // If query string needs factory_id appended
    let url = endpoint;
    if (this.inspectingFactoryId && !endpoint.includes('factory_id=')) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}factory_id=${encodeURIComponent(this.inspectingFactoryId)}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const text = await response.text();
    let data: any;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      if (response.status === 403) {
        throw new Error(`Forbidden: You do not have permission to access '${endpoint}' (403)`);
      }
      if (response.status === 401) {
        throw new Error('Session expired or unauthorized');
      }
      // If response is HTML or non-JSON
      if (text.trim().startsWith('<')) {
        throw new Error(
          `API endpoint '${endpoint}' returned HTML instead of JSON (${response.status} ${response.statusText}). ` +
          `Backend server route may be unavailable.`
        );
      }
      throw new Error(`Failed to parse response as JSON (${response.status}): ${text.slice(0, 100)}`);
    }

    // For non-login routes, a 401 indicates session expiration
    if (response.status === 401) {
      if (!endpoint.includes('/api/auth/login')) {
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('factoryops:unauthorized'));
        throw new Error(data?.error || 'Session expired or unauthorized');
      } else {
        throw new Error(data?.error || 'Invalid email/username or password');
      }
    }

    if (!response.ok) {
      throw new Error(data?.error || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  // --- Auth ---
  public auth = {
    login: async (credentials: { email?: string; username?: string; password: string }) => {
      const res = await this.request<{ success?: boolean; token: string; user: User; factory: Factory | null }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      if (res.token) {
        this.setToken(res.token);
      }
      return res;
    },
    register: async (payload: { name: string; email: string; password: string; role: string; factory_id?: string }) => {
      return this.request<{ success: boolean; message: string; user: User; factory: Factory | null }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    logout: async () => {
      try {
        await this.request('/api/auth/logout', { method: 'POST' });
      } catch {
        // Ignore logout errors
      } finally {
        this.setToken(null);
        this.setInspectingFactoryId(null);
      }
    },
    me: async () => {
      return this.request<{ user: User; factory: Factory | null }>('/api/auth/me');
    },
    refresh: async () => {
      return this.request<{ success: boolean; message: string; expiresAt: number }>('/api/auth/refresh', {
        method: 'POST'
      });
    }
  };

  // --- Super Admin ---
  public superAdmin = {
    getOverview: async (): Promise<SuperAdminOverview> => {
      return this.request<SuperAdminOverview>('/api/super-admin/overview');
    }
  };

  // --- Factories ---
  public factories = {
    getAll: async (): Promise<Factory[]> => {
      return this.request<Factory[]>('/api/factories');
    },
    getById: async (id: string): Promise<Factory & { kpis: FactoryKPIs }> => {
      return this.request<Factory & { kpis: FactoryKPIs }>(`/api/factories/${id}`);
    },
    getStats: async (id: string): Promise<FactoryKPIs> => {
      return this.request<FactoryKPIs>(`/api/factories/${id}/stats`);
    }
  };

  // --- Machines ---
  public machines = {
    getAll: async (factoryId?: string): Promise<Machine[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<Machine[]>(`/api/machines${q}`);
    },
    getById: async (id: string): Promise<Machine> => {
      return this.request<Machine>(`/api/machines/${id}`);
    },
    create: async (machineData: Partial<Machine>): Promise<Machine> => {
      return this.request<Machine>('/api/machines', {
        method: 'POST',
        body: JSON.stringify(machineData)
      });
    },
    update: async (id: string, updates: Partial<Machine>): Promise<Machine> => {
      return this.request<Machine>(`/api/machines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },
    updateStatus: async (id: string, status: string): Promise<Machine> => {
      return this.request<Machine>(`/api/machines/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },
    delete: async (id: string): Promise<{ success: boolean; machine_id: string }> => {
      return this.request<{ success: boolean; machine_id: string }>(`/api/machines/${id}`, {
        method: 'DELETE'
      });
    },
    updateThresholds: async (data: { machine_id: string; max_temperature_c?: number; max_vibration_mms?: number }) => {
      return this.request<{ success: boolean; machine: Machine }>('/api/machines/thresholds', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  };

  // --- Production ---
  public production = {
    getAll: async (factoryId?: string): Promise<ProductionRecord[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<ProductionRecord[]>(`/api/production${q}`);
    },
    getPaginated: async (params: { page?: number; limit?: number | string; shift?: string; search?: string; factoryId?: string }) => {
      const query = new URLSearchParams();
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      if (params.shift) query.append('shift', params.shift);
      if (params.search) query.append('search', params.search);
      if (params.factoryId) query.append('factory_id', params.factoryId);
      const q = query.toString() ? `?${query.toString()}` : '';
      return this.request<{
        records: ProductionRecord[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`/api/production${q}`);
    },
    create: async (data: Partial<ProductionRecord>): Promise<ProductionRecord> => {
      return this.request<ProductionRecord>('/api/production', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    delete: async (id: string): Promise<{ success: boolean; id: string }> => {
      return this.request<{ success: boolean; id: string }>(`/api/production/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // --- Spare Parts Inventory ---
  public inventory = {
    getAll: async (factoryId?: string): Promise<SparePart[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<SparePart[]>(`/api/inventory${q}`);
    },
    create: async (data: Partial<SparePart>): Promise<SparePart> => {
      return this.request<SparePart>('/api/inventory', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    update: async (id: string, updates: Partial<SparePart>): Promise<SparePart> => {
      return this.request<SparePart>(`/api/inventory/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    },
    delete: async (id: string): Promise<{ success: boolean; id: string }> => {
      return this.request<{ success: boolean; id: string }>(`/api/inventory/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // --- System Audit Logs ---
  public auditLogs = {
    getAll: async (): Promise<SystemAuditLog[]> => {
      return this.request<SystemAuditLog[]>('/api/audit-logs');
    }
  };

  // --- Maintenance ---
  public maintenance = {
    getAll: async (factoryId?: string): Promise<MaintenanceRecord[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<MaintenanceRecord[]>(`/api/maintenance${q}`);
    },
    create: async (data: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> => {
      return this.request<MaintenanceRecord>('/api/maintenance', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    delete: async (id: string): Promise<{ success: boolean; id: string }> => {
      return this.request<{ success: boolean; id: string }>(`/api/maintenance/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // --- Incidents ---
  public incidents = {
    getAll: async (factoryId?: string): Promise<Incident[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<Incident[]>(`/api/incidents${q}`);
    },
    create: async (data: { machine_id: string; title: string; description: string; severity: string; factory_id?: string }): Promise<Incident> => {
      return this.request<Incident>('/api/incidents', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    update: async (id: string, updates: Partial<Incident>): Promise<Incident> => {
      return this.request<Incident>(`/api/incidents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    },
    delete: async (id: string): Promise<{ success: boolean; id: string }> => {
      return this.request<{ success: boolean; id: string }>(`/api/incidents/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // --- Work Orders ---
  public workOrders = {
    getAll: async (factoryId?: string): Promise<WorkOrder[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<WorkOrder[]>(`/api/work-orders${q}`);
    },
    create: async (data: {
      machine_id: string;
      title: string;
      priority: string;
      assigned_to: string;
      due_date: string;
      estimated_hours: number;
      parts_required?: string;
      factory_id?: string;
    }): Promise<WorkOrder> => {
      return this.request<WorkOrder>('/api/work-orders', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    update: async (id: string, updates: Partial<WorkOrder>): Promise<WorkOrder> => {
      return this.request<WorkOrder>(`/api/work-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
    },
    delete: async (id: string): Promise<{ success: boolean; id: string }> => {
      return this.request<{ success: boolean; id: string }>(`/api/work-orders/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // --- SOPs ---
  public sops = {
    getAll: async (factoryId?: string): Promise<SOP[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<SOP[]>(`/api/sops${q}`);
    }
  };

  // --- Data Quality ---
  public dataQuality = {
    getAll: async (factoryId?: string): Promise<DataQualityMetric[]> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      try {
        return await this.request<DataQualityMetric[]>(`/api/data-quality${q}`);
      } catch (err: any) {
        if (err?.message?.includes('403') || err?.message?.includes('Forbidden') || err?.message?.includes('not authorized')) {
          return [];
        }
        throw err;
      }
    }
  };

  // --- Users ---
  public users = {
    getAll: async (): Promise<User[]> => {
      return this.request<User[]>('/api/users');
    },
    create: async (data: { name: string; email: string; role: string; factory_id?: string }): Promise<User> => {
      return this.request<User>('/api/users', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    delete: async (id: string): Promise<{ success: boolean; id: string }> => {
      return this.request<{ success: boolean; id: string }>(`/api/users/${id}`, {
        method: 'DELETE'
      });
    }
  };

  // --- Notifications ---
  public notifications = {
    getAll: async (filter: 'all' | 'unread' | 'read' = 'all') => {
      return this.request<{
        notifications: AppNotification[];
        unreadCount: number;
        readIds: string[];
      }>(`/api/notifications?filter=${filter}`);
    },
    markRead: async (idOrIds: string | string[]) => {
      const payload = typeof idOrIds === 'string' ? { id: idOrIds } : { ids: idOrIds };
      return this.request<{ success: boolean; markedReadIds: string[] }>('/api/notifications/mark-read', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    markAllRead: async () => {
      return this.request<{ success: boolean; unreadCount: number; markedReadIds: string[] }>('/api/notifications/mark-all-read', {
        method: 'POST'
      });
    },
    delete: async (id: string) => {
      return this.request<{ success: boolean; id: string }>(`/api/notifications/${id}`, {
        method: 'DELETE'
      });
    },
    create: async (data: Partial<AppNotification>) => {
      return this.request<AppNotification>('/api/notifications', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }
  };

  // --- System & Database Status ---
  public system = {
    getStatus: async () => {
      return this.request<{
        dataSource: 'supabase' | 'cleaned_dataset';
        isSupabaseHealthy: boolean;
        hasChecked: boolean;
        supabaseUrl: string;
        hasServiceRoleKey: boolean;
        supabaseError?: string | null;
        message: string;
        activeCounts: {
          machines: number;
          production_records: number;
          maintenance_records: number;
          incidents: number;
          work_orders: number;
        };
        supabaseCounts: Record<string, number | null>;
        ai: {
          configured: boolean;
          model: string;
        };
      }>('/api/system/status');
    },
    syncSupabase: async () => {
      return this.request<{
        success: boolean;
        message: string;
        counts?: Record<string, number>;
        details?: any;
        warning?: string;
      }>('/api/supabase/sync', {
        method: 'POST'
      });
    }
  };

  public supabase = {
    sync: async () => {
      return this.system.syncSupabase();
    }
  };

  // --- AI Operations Copilot ---
  public ai = {
    getStatus: async () => {
      return this.request<{
        configured: boolean;
        model: string;
        provider: string;
        status: string;
        message: string;
      }>('/api/ai/status');
    },
    chat: async (
      message: string,
      history?: { role: string; text: string }[]
    ): Promise<{
      reply: string;
      isLiveAi?: boolean;
      model?: string;
      timestamp: string;
      error?: string;
    }> => {
      return this.request<{
        reply: string;
        isLiveAi?: boolean;
        model?: string;
        timestamp: string;
        error?: string;
      }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message, history })
      });
    }
  };

  // --- Attendance & Location Geofence ---
  public attendance = {
    getFactoryLocation: async (factoryId?: string): Promise<FactoryLocation> => {
      const q = factoryId ? `?factory_id=${encodeURIComponent(factoryId)}` : '';
      return this.request<FactoryLocation>(`/api/attendance/factory-location${q}`);
    },
    setFactoryLocation: async (payload: {
      factory_id?: string;
      latitude: number;
      longitude: number;
      address?: string;
    }): Promise<{ success: boolean; message: string; location: FactoryLocation }> => {
      return this.request<{ success: boolean; message: string; location: FactoryLocation }>('/api/attendance/factory-location', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    checkIn: async (payload: {
      latitude: number;
      longitude: number;
    }): Promise<{ success: boolean; message: string; record: AttendanceRecord }> => {
      return this.request<{ success: boolean; message: string; record: AttendanceRecord }>('/api/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    reportAbsence: async (payload: {
      date: string;
      reason: string;
      notes?: string;
    }): Promise<{ success: boolean; message: string; record: AttendanceRecord }> => {
      return this.request<{ success: boolean; message: string; record: AttendanceRecord }>('/api/attendance/absence', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    getMyAttendance: async (): Promise<{
      records: AttendanceRecord[];
      todayRecord: AttendanceRecord | null;
      today: string;
    }> => {
      return this.request<{
        records: AttendanceRecord[];
        todayRecord: AttendanceRecord | null;
        today: string;
      }>('/api/attendance/my');
    },
    getAdminAttendance: async (filters?: {
      date?: string;
      role?: string;
      status?: string;
      employee?: string;
    }): Promise<{
      records: AttendanceRecord[];
      kpis: AttendanceSummaryKPIs;
      auditLogs: AttendanceAuditLog[];
    }> => {
      const params = new URLSearchParams();
      if (filters?.date) params.append('date', filters.date);
      if (filters?.role) params.append('role', filters.role);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.employee) params.append('employee', filters.employee);
      const query = params.toString() ? `?${params.toString()}` : '';
      return this.request<{
        records: AttendanceRecord[];
        kpis: AttendanceSummaryKPIs;
        auditLogs: AttendanceAuditLog[];
      }>(`/api/attendance/admin${query}`);
    },
    getManagerAttendance: async (filters?: {
      date?: string;
      status?: string;
      employee?: string;
    }): Promise<{
      records: AttendanceRecord[];
      kpis: {
        totalTeamTechnicians: number;
        presentToday: number;
        absentToday: number;
        attendanceRatePct: number;
      };
    }> => {
      const params = new URLSearchParams();
      if (filters?.date) params.append('date', filters.date);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.employee) params.append('employee', filters.employee);
      const query = params.toString() ? `?${params.toString()}` : '';
      return this.request<{
        records: AttendanceRecord[];
        kpis: {
          totalTeamTechnicians: number;
          presentToday: number;
          absentToday: number;
          attendanceRatePct: number;
        };
      }>(`/api/attendance/manager${query}`);
    },
    createManualException: async (payload: {
      user_id: string;
      attendance_date: string;
      status: 'Present' | 'Absent';
      reason: string;
      notes?: string;
    }): Promise<{ success: boolean; message: string; record: AttendanceRecord }> => {
      return this.request<{ success: boolean; message: string; record: AttendanceRecord }>('/api/attendance/manual-exception', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  };

  // --- Technician Management & AI Assignment ---
  public technicians = {
    getAll: async (): Promise<TechnicianProfile[]> => {
      return this.request<TechnicianProfile[]>('/api/technicians');
    }
  };

  public technicianAssignments = {
    getAll: async (status?: string): Promise<TechnicianIncidentAssignment[]> => {
      const q = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
      return this.request<TechnicianIncidentAssignment[]>(`/api/technician-assignments${q}`);
    },
    recommend: async (incidentId: string): Promise<TechnicianRecommendationResult> => {
      return this.request<TechnicianRecommendationResult>('/api/technician-assignments/recommend', {
        method: 'POST',
        body: JSON.stringify({ incident_id: incidentId })
      });
    },
    assign: async (data: Partial<TechnicianIncidentAssignment>): Promise<TechnicianIncidentAssignment> => {
      return this.request<TechnicianIncidentAssignment>('/api/technician-assignments', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    accept: async (id: string, notes?: string): Promise<TechnicianIncidentAssignment> => {
      return this.request<TechnicianIncidentAssignment>(`/api/technician-assignments/${id}/accept`, {
        method: 'POST',
        body: JSON.stringify({ notes })
      });
    },
    reject: async (id: string, rejectionReason: string): Promise<TechnicianIncidentAssignment> => {
      return this.request<TechnicianIncidentAssignment>(`/api/technician-assignments/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason: rejectionReason })
      });
    },
    requestReassignment: async (id: string, reassignmentReason: string): Promise<TechnicianIncidentAssignment> => {
      return this.request<TechnicianIncidentAssignment>(`/api/technician-assignments/${id}/request-reassignment`, {
        method: 'POST',
        body: JSON.stringify({ reassignment_reason: reassignmentReason })
      });
    },
    reviewReassignment: async (id: string, payload: { decision: 'APPROVE' | 'REJECT'; new_technician_id?: string; manager_notes?: string }): Promise<TechnicianIncidentAssignment> => {
      return this.request<TechnicianIncidentAssignment>(`/api/technician-assignments/${id}/review-reassignment`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    startRepair: async (id: string, notes?: string): Promise<TechnicianIncidentAssignment> => {
      return this.request<TechnicianIncidentAssignment>(`/api/technician-assignments/${id}/start-repair`, {
        method: 'POST',
        body: JSON.stringify({ notes })
      });
    },
    progressUpdate: async (id: string, payload: { progress_percent: number; diagnosis_notes: string; additional_problems_found?: string }): Promise<TechnicianIncidentAssignment> => {
      return this.request<TechnicianIncidentAssignment>(`/api/technician-assignments/${id}/progress-update`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    resolve: async (id: string, payload: { confirmed_root_cause: string; actions_taken: string; parts_used?: any[]; actual_repair_hours: number; resolution_remarks?: string }): Promise<TechnicianIncidentAssignment> => {
      return this.request<TechnicianIncidentAssignment>(`/api/technician-assignments/${id}/resolve`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    },
    verify: async (id: string, payload: { decision: 'APPROVE' | 'REJECT'; verification_notes?: string; quality_rating?: number; rework_instructions?: string }): Promise<TechnicianIncidentAssignment> => {
      return this.request<TechnicianIncidentAssignment>(`/api/technician-assignments/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  };
}

export const api = new ApiService();
