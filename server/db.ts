import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  Factory,
  User,
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
  SparePart,
  SystemAuditLog,
  TechnicianProfile,
  TechnicianIncidentAssignment,
  AppNotification,
  NotificationPriority,
  NotificationType
} from '../src/types/index.ts';

// Haversine distance calculator (returns distance in meters between two lat/lon points)
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Password hashing utility with PBKDF2
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(hash));
}

// In-Memory Database with multi-factory data
interface StoredUser extends User {
  password_hash: string;
  salt: string;
}

class FactoryOpsDatabase {
  public factories: Factory[] = [];
  public users: StoredUser[] = [];
  public machines: Machine[] = [];
  public production: ProductionRecord[] = [];
  public maintenance: MaintenanceRecord[] = [];
  public incidents: Incident[] = [];
  public workOrders: WorkOrder[] = [];
  public sops: SOP[] = [];
  public dataQuality: DataQualityMetric[] = [];
  public factoryLocations: FactoryLocation[] = [];
  public attendanceRecords: AttendanceRecord[] = [];
  public attendanceAuditLogs: AttendanceAuditLog[] = [];
  public spareParts: SparePart[] = [];
  public systemAuditLogs: SystemAuditLog[] = [];
  public technicianProfiles: TechnicianProfile[] = [];
  public technicianAssignments: TechnicianIncidentAssignment[] = [];
  public notifications: AppNotification[] = [];
  public readNotificationIds: Set<string> = new Set();
  public sessions: Map<string, { userId: string; role: string; factoryId: string | null; expiresAt: number }> = new Map();

  private persistentFile = path.resolve(process.cwd(), 'server/data/persistent-store.json');

  constructor() {
    if (!this.loadPersistentState()) {
      this.seedDatabase();
      this.persist();
    }
  }

  public persist() {
    try {
      const dir = path.dirname(this.persistentFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const state = {
        factories: this.factories,
        users: this.users,
        machines: this.machines,
        production: this.production,
        maintenance: this.maintenance,
        incidents: this.incidents,
        workOrders: this.workOrders,
        sops: this.sops,
        dataQuality: this.dataQuality,
        factoryLocations: this.factoryLocations,
        attendanceRecords: this.attendanceRecords,
        attendanceAuditLogs: this.attendanceAuditLogs,
        spareParts: this.spareParts,
        systemAuditLogs: this.systemAuditLogs,
        technicianProfiles: this.technicianProfiles,
        technicianAssignments: this.technicianAssignments,
        notifications: this.notifications
      };
      fs.writeFileSync(this.persistentFile, JSON.stringify(state, null, 2), 'utf8');
    } catch (err: any) {
      console.warn('[FactoryOpsDatabase] Warning: Failed to persist database to disk:', err?.message);
    }
  }

  private loadPersistentState(): boolean {
    try {
      if (fs.existsSync(this.persistentFile)) {
        const raw = fs.readFileSync(this.persistentFile, 'utf8');
        const state = JSON.parse(raw);
        if (state.machines && state.machines.length > 0) {
          // Enforce Apex as the sole active factory throughout FactoryOps
          const apexFactory = {
            id: 'FAC-001',
            factory_code: 'APX-01',
            name: 'Apex Precision Manufacturing',
            location: 'Hyderabad, Telangana',
            industry: 'Automotive Components',
            owner_name: 'Rajesh Kumar',
            status: 'Operational' as const,
            capacity: '45,000 units/mo',
            established_year: 2014,
            created_at: '2023-01-15T08:00:00Z',
            last_activity: 'Just now'
          };
          this.factories = [apexFactory];

          // All operational users belong to Apex
          this.users = (state.users || []).map((u: any) => {
            if (u.role === 'SUPER_ADMIN') {
              return { ...u, factory_id: null, factory_name: undefined };
            }
            return {
              ...u,
              factory_id: 'FAC-001',
              factory_name: 'Apex Precision Manufacturing'
            };
          });

          // Retain exclusively Apex records
          this.machines = (state.machines || []).filter((m: any) => !m.factory_id || m.factory_id === 'FAC-001');
          this.production = (state.production || []).filter((p: any) => !p.factory_id || p.factory_id === 'FAC-001');
          this.maintenance = (state.maintenance || []).filter((m: any) => !m.factory_id || m.factory_id === 'FAC-001');
          this.incidents = (state.incidents || []).filter((i: any) => !i.factory_id || i.factory_id === 'FAC-001');
          this.workOrders = (state.workOrders || []).filter((w: any) => !w.factory_id || w.factory_id === 'FAC-001');
          this.sops = (state.sops || []).filter((s: any) => !s.factory_id || s.factory_id === 'FAC-001');
          this.dataQuality = (state.dataQuality || []).filter((d: any) => !d.factory_id || d.factory_id === 'FAC-001');
          this.factoryLocations = (state.factoryLocations || []).filter((l: any) => l.factory_id === 'FAC-001');
          this.attendanceRecords = (state.attendanceRecords || []).filter((a: any) => !a.factory_id || a.factory_id === 'FAC-001');
          this.spareParts = (state.spareParts || []).filter((p: any) => !p.factory_id || p.factory_id === 'FAC-001');
          this.attendanceAuditLogs = state.attendanceAuditLogs || [];
          this.systemAuditLogs = (state.systemAuditLogs || []).filter((s: any) => !s.factory_id || s.factory_id === 'FAC-001');
          this.technicianProfiles = (state.technicianProfiles || []).filter((p: any) => !p.factory_id || p.factory_id === 'FAC-001');
          this.technicianAssignments = (state.technicianAssignments || []).filter((a: any) => !a.factory_id || a.factory_id === 'FAC-001');

          this.ensureTechnicianUsers();

          if (this.spareParts.length === 0) {
            this.seedSpareParts();
          }

          this.seedTechnicianProfiles();
          this.seedTechnicianAssignments();

          // Merge any saved assignments from state over the seed assignments
          if (Array.isArray(state.technicianAssignments) && state.technicianAssignments.length > 0) {
            for (const savedAsn of state.technicianAssignments) {
              const idx = this.technicianAssignments.findIndex(a => a.id === savedAsn.id);
              if (idx !== -1) {
                this.technicianAssignments[idx] = { ...this.technicianAssignments[idx], ...savedAsn };
              } else {
                this.technicianAssignments.push(savedAsn);
              }
            }
          }

          const todayStr = '2026-10-30';
          if (!this.attendanceRecords.some(r => r.user_id === 'USR-015' && r.attendance_date === todayStr)) {
            this.attendanceRecords.unshift({
              id: `ATT-USR-015-${todayStr}`,
              user_id: 'USR-015',
              user_name: 'Priya Sundaram',
              user_email: 'planner.apex@factoryops.com',
              user_role: 'PRODUCTION_PLANNER',
              factory_id: 'FAC-001',
              attendance_date: todayStr,
              timestamp: `${todayStr}T08:41:34.000Z`,
              status: 'Present',
              check_in_time: '08:41:34',
              latitude: 17.4435,
              longitude: 78.3772,
              distance_meters: 2,
              is_verified: true,
              verification_method: 'GPS_GEOFENCE',
              verification_notes: 'GPS location verified within 1 km geofence (2m from factory center)',
              created_at: `${todayStr}T08:41:34.000Z`
            });
          }

          if (Array.isArray(state.notifications) && state.notifications.length >= 10) {
            this.notifications = state.notifications;
          } else {
            this.seedNotifications();
          }

          this.persist();
          console.log(`✅ [FactoryOpsDatabase] Single-Factory System (APEX): Loaded ${this.machines.length} machines, ${this.production.length} production runs, ${this.workOrders.length} work orders, ${this.users.length} users, ${this.notifications.length} notifications.`);
          return true;
        }
      }
    } catch (err: any) {
      console.warn('[FactoryOpsDatabase] Could not load persistent state, falling back to seed:', err?.message);
    }
    return false;
  }

  private seedDatabase() {
    // 1. Seed the Single Project Factory (APEX)
    this.factories = [
      {
        id: 'FAC-001',
        factory_code: 'APX-01',
        name: 'Apex Precision Manufacturing',
        location: 'Hyderabad, Telangana',
        industry: 'Automotive Components',
        owner_name: 'Rajesh Kumar',
        status: 'Operational',
        capacity: '45,000 units/mo',
        established_year: 2014,
        created_at: '2023-01-15T08:00:00Z',
        last_activity: 'Just now'
      }
    ];

    // 2. Seed Users with securely hashed passwords - all operational users belong to Apex
    const seedUser = (
      id: string,
      name: string,
      email: string,
      plainPass: string,
      role: User['role'],
      factoryId: string | null
    ) => {
      const salt = generateSalt();
      const hash = hashPassword(plainPass, salt);
      const factory = factoryId ? this.factories.find(f => f.id === factoryId) : null;
      this.users.push({
        id,
        name,
        email,
        password_hash: hash,
        salt,
        role,
        factory_id: factoryId,
        factory_name: factory?.name,
        status: 'active',
        created_at: new Date().toISOString()
      });
    };

    // 1. Super Admin (Global Administrator)
    seedUser('USR-001', 'Super Admin Officer', 'superadmin@factoryops.com', 'SuperAdmin@123', 'SUPER_ADMIN', null);

    // 2. Admins (Primary Role) + Legacy Owner Aliases (Associated with Apex)
    seedUser('USR-002', 'Rajesh Kumar (Plant Admin)', 'admin.apex@factoryops.com', 'Admin@123', 'ADMIN', 'FAC-001');
    seedUser('USR-002L', 'Rajesh Kumar', 'owner.apex@factoryops.com', 'Factory@123', 'ADMIN', 'FAC-001');
    seedUser('USR-003', 'Vikram Malhotra (Plant Admin)', 'admin.nova@factoryops.com', 'Admin@123', 'ADMIN', 'FAC-001');
    seedUser('USR-003L', 'Vikram Malhotra', 'owner.nova@factoryops.com', 'Factory@123', 'ADMIN', 'FAC-001');
    seedUser('USR-004', 'Suresh Raman (Plant Admin)', 'admin.vertex@factoryops.com', 'Admin@123', 'ADMIN', 'FAC-001');
    seedUser('USR-004L', 'Suresh Raman', 'owner.vertex@factoryops.com', 'Factory@123', 'ADMIN', 'FAC-001');
    seedUser('USR-005', 'Ananya Sharma', 'owner.primetech@factoryops.com', 'Factory@123', 'ADMIN', 'FAC-001');
    seedUser('USR-006', 'K. Swaminathan', 'owner.orion@factoryops.com', 'Factory@123', 'ADMIN', 'FAC-001');

    // 3. Manager / Supervisors (Primary Role - Associated with Apex)
    seedUser('USR-007', 'Amit Deshmukh (Manager/Supervisor)', 'manager.apex@factoryops.com', 'Manager@123', 'MANAGER_SUPERVISOR', 'FAC-001');
    seedUser('USR-008', 'Neha Joshi (Manager/Supervisor)', 'manager.nova@factoryops.com', 'Manager@123', 'MANAGER_SUPERVISOR', 'FAC-001');
    seedUser('USR-009', 'Karthik Raja (Manager/Supervisor)', 'manager.vertex@factoryops.com', 'Manager@123', 'MANAGER_SUPERVISOR', 'FAC-001');
    seedUser('USR-010', 'Rahul Hegde', 'manager.primetech@factoryops.com', 'Manager@123', 'MANAGER_SUPERVISOR', 'FAC-001');
    seedUser('USR-011', 'Manoj Pillai', 'manager.orion@factoryops.com', 'Manager@123', 'MANAGER_SUPERVISOR', 'FAC-001');

    // 4. Technicians (Primary Role - Associated with Apex)
    seedUser('USR-012', 'Ramesh Varma (Senior Technician)', 'tech.apex@factoryops.com', 'Tech@123', 'TECHNICIAN', 'FAC-001');
    seedUser('USR-013', 'Anil Sharma (Technician)', 'tech.nova@factoryops.com', 'Tech@123', 'TECHNICIAN', 'FAC-001');
    seedUser('USR-014', 'Praveen Nair (Technician)', 'tech.vertex@factoryops.com', 'Tech@123', 'TECHNICIAN', 'FAC-001');
    seedUser('USR-018', 'Vikram Singh (Automation & Robotics Tech)', 'tech.robotics@factoryops.com', 'Tech@123', 'TECHNICIAN', 'FAC-001');
    seedUser('USR-019', 'Rajesh Menon (Hydraulics & Pneumatics Tech)', 'tech.hydraulics@factoryops.com', 'Tech@123', 'TECHNICIAN', 'FAC-001');
    seedUser('USR-020', 'Sunita Rao (Instrumentation & Controls Tech)', 'tech.instruments@factoryops.com', 'Tech@123', 'TECHNICIAN', 'FAC-001');

    // 5. Production Planners (Primary Role - Associated with Apex)
    seedUser('USR-015', 'Priya Sundaram (Production Planner)', 'planner.apex@factoryops.com', 'Planner@123', 'PRODUCTION_PLANNER', 'FAC-001');
    seedUser('USR-016', 'Siddharth Rao (Production Planner)', 'planner.nova@factoryops.com', 'Planner@123', 'PRODUCTION_PLANNER', 'FAC-001');
    seedUser('USR-017', 'Deepa Krishnan (Production Planner)', 'planner.vertex@factoryops.com', 'Planner@123', 'PRODUCTION_PLANNER', 'FAC-001');

    // 3. Seed Factory Operational Data from intended Cleaned Datasets (APEX ONLY)
    this.loadCleanedDatasetsForApex(); // Apex (FAC-001) - 24 Cleaned Machines, 6,480 Production Runs, 210 Maintenance, 109 Incidents, 129 Work Orders
    this.seedAttendanceData();
    this.seedSpareParts();
    this.seedTechnicianProfiles();
    this.seedTechnicianAssignments();
    this.seedNotifications();
  }

  // --- SEED SPARE PARTS INVENTORY ---
  public seedSpareParts() {
    this.spareParts = [
      {
        id: 'PRT-1001',
        part_number: 'SKF-7014-ACD',
        name: 'Spindle High-Precision Ceramic Bearing',
        category: 'Mechanical',
        factory_id: 'FAC-001',
        stock_quantity: 4,
        min_reorder_level: 5,
        unit_cost_usd: 480,
        supplier: 'SKF Industrial Motion',
        location_bin: 'A-12-04',
        last_restocked_at: '2026-09-10T10:00:00Z',
        machine_compatibility: ['APX-CNC-01', 'APX-CNC-02', 'APX-CNC-04', 'M001'],
        created_at: '2026-08-01T08:00:00Z'
      },
      {
        id: 'PRT-1002',
        part_number: 'VTN-OR-K50',
        name: 'Hydraulic Valve Block Viton O-Ring Seal Kit',
        category: 'Hydraulics',
        factory_id: 'FAC-001',
        stock_quantity: 28,
        min_reorder_level: 10,
        unit_cost_usd: 45,
        supplier: 'Parker Hannifin',
        location_bin: 'B-04-18',
        last_restocked_at: '2026-09-20T14:30:00Z',
        machine_compatibility: ['APX-PRS-01', 'APX-PRS-02', 'APX-PRS-03'],
        created_at: '2026-08-01T08:00:00Z'
      },
      {
        id: 'PRT-1003',
        part_number: 'TCH-TIP-12M',
        name: 'MIG Welding Torch Heavy Duty Contact Tip 1.2mm',
        category: 'Consumables',
        factory_id: 'FAC-001',
        stock_quantity: 120,
        min_reorder_level: 50,
        unit_cost_usd: 12,
        supplier: 'Tregaskiss Automation',
        location_bin: 'C-01-05',
        last_restocked_at: '2026-10-01T09:00:00Z',
        machine_compatibility: ['APX-ROB-01', 'APX-ROB-02', 'APX-ROB-03'],
        created_at: '2026-08-01T08:00:00Z'
      },
      {
        id: 'PRT-1004',
        part_number: 'SMT-NZL-0201',
        name: 'High-Precision Pick & Place Vacuum Nozzle Type 0201',
        category: 'Tooling',
        factory_id: 'FAC-001',
        stock_quantity: 2,
        min_reorder_level: 6,
        unit_cost_usd: 210,
        supplier: 'Fuji High-Speed Systems',
        location_bin: 'D-08-02',
        last_restocked_at: '2026-08-15T11:00:00Z',
        machine_compatibility: ['PRM-SMT-01', 'PRM-SMT-02'],
        created_at: '2026-08-01T08:00:00Z'
      },
      {
        id: 'PRT-1005',
        part_number: 'HYD-FLT-20U',
        name: 'Hydraulic Main Return Line Filter Element (20 Micron)',
        category: 'Hydraulics',
        factory_id: 'FAC-001',
        stock_quantity: 15,
        min_reorder_level: 8,
        unit_cost_usd: 85,
        supplier: 'Hydac Fluidtech',
        location_bin: 'B-06-11',
        last_restocked_at: '2026-09-25T16:00:00Z',
        machine_compatibility: ['APX-PRS-01', 'ORN-FRG-01'],
        created_at: '2026-08-01T08:00:00Z'
      },
      {
        id: 'PRT-1006',
        part_number: 'SRV-CBL-05M',
        name: 'Heavy Duty Encoder Servo Drive Cable 5-Meter',
        category: 'Electrical',
        factory_id: 'FAC-001',
        stock_quantity: 3,
        min_reorder_level: 4,
        unit_cost_usd: 320,
        supplier: 'Siemens Automation',
        location_bin: 'E-02-09',
        last_restocked_at: '2026-09-05T13:15:00Z',
        machine_compatibility: ['APX-CNC-03', 'VTX-ROB-01'],
        created_at: '2026-08-01T08:00:00Z'
      },
      {
        id: 'PRT-1007',
        part_number: 'SEN-TCK-800',
        name: 'Thermocouple Temperature Probe Type K (-50 to +800°C)',
        category: 'Electrical',
        factory_id: 'FAC-001',
        stock_quantity: 22,
        min_reorder_level: 10,
        unit_cost_usd: 65,
        supplier: 'Omron Industrial',
        location_bin: 'E-05-14',
        last_restocked_at: '2026-10-02T08:30:00Z',
        machine_compatibility: ['PRM-RFL-01', 'ORN-FRG-02'],
        created_at: '2026-08-01T08:00:00Z'
      },
      {
        id: 'PRT-1008',
        part_number: 'PRX-M12-IND',
        name: 'M12 Inductive Proximity Sensor PNP Normally Open',
        category: 'Sensors',
        factory_id: 'FAC-001',
        stock_quantity: 35,
        min_reorder_level: 15,
        unit_cost_usd: 42,
        supplier: 'Balluff Automation',
        location_bin: 'E-08-01',
        last_restocked_at: '2026-10-03T10:20:00Z',
        machine_compatibility: ['APX-CNC-01', 'APX-PRS-02', 'VTX-PNT-01'],
        created_at: '2026-08-01T08:00:00Z'
      }
    ];
  }

  // --- SEED ATTENDANCE DATA & FACTORY LOCATIONS ---
  private seedAttendanceData() {
    // 1. Initial Factory Locations
    this.factoryLocations = [
      {
        id: 'LOC-FAC-001',
        factory_id: 'FAC-001',
        latitude: 17.4435,
        longitude: 78.3772,
        radius_meters: 1000,
        address: 'Sanath Nagar Industrial Estate, Hyderabad, Telangana 500018',
        updated_at: new Date().toISOString(),
        updated_by: 'Rajesh Kumar (Plant Admin)'
      },
      {
        id: 'LOC-FAC-002',
        factory_id: 'FAC-002',
        latitude: 18.5204,
        longitude: 73.8567,
        radius_meters: 1000,
        address: 'Bhosari Industrial Area, Pune, Maharashtra 411026',
        updated_at: new Date().toISOString(),
        updated_by: 'Vikram Malhotra (Plant Admin)'
      },
      {
        id: 'LOC-FAC-003',
        factory_id: 'FAC-003',
        latitude: 13.0827,
        longitude: 80.2707,
        radius_meters: 1000,
        address: 'Ambattur Industrial Estate, Chennai, Tamil Nadu 600058',
        updated_at: new Date().toISOString(),
        updated_by: 'Suresh Raman (Plant Admin)'
      }
    ];

    // Initial audit log
    this.attendanceAuditLogs = [
      {
        id: 'LOG-001',
        action: 'LOCATION_UPDATE',
        performed_by_id: 'USR-002',
        performed_by_name: 'Rajesh Kumar',
        performed_by_role: 'ADMIN',
        details: 'Configured Apex Precision factory boundary: Lat 17.4435, Lon 78.3772 with 1000m geofence radius',
        timestamp: new Date(Date.now() - 30 * 86400000).toISOString()
      }
    ];

    // Seed 14 days of realistic attendance history (excluding today so employee can Mark Present today!)
    const targetUsers = [
      { id: 'USR-012', name: 'Ramesh Varma', email: 'tech.apex@factoryops.com', role: 'TECHNICIAN' as const },
      { id: 'USR-015', name: 'Priya Sundaram', email: 'planner.apex@factoryops.com', role: 'PRODUCTION_PLANNER' as const },
      { id: 'USR-007', name: 'Amit Deshmukh', email: 'manager.apex@factoryops.com', role: 'MANAGER_SUPERVISOR' as const }
    ];

    const now = new Date();
    for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
      const recordDate = new Date(now.getTime() - dayOffset * 86400000);
      const dayOfWeek = recordDate.getDay();
      if (dayOfWeek === 0) continue; // Skip Sundays

      const yyyy = recordDate.getFullYear();
      const mm = String(recordDate.getMonth() + 1).padStart(2, '0');
      const dd = String(recordDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      targetUsers.forEach((u, uIdx) => {
        // Ramesh had a casual leave 6 days ago
        if (u.id === 'USR-012' && dayOffset === 6) {
          this.attendanceRecords.push({
            id: `ATT-${u.id}-${dateStr}`,
            user_id: u.id,
            user_name: u.name,
            user_email: u.email,
            user_role: u.role,
            factory_id: 'FAC-001',
            attendance_date: dateStr,
            timestamp: new Date(recordDate.setHours(8, 0, 0)).toISOString(),
            status: 'Absent',
            check_in_time: '08:00:00',
            latitude: null,
            longitude: null,
            distance_meters: null,
            is_verified: true,
            verification_method: 'MANUAL_AUDITED_EXCEPTION',
            absence_reason: 'Casual Leave',
            absence_notes: 'Prior approved family commitment leave',
            created_at: new Date(recordDate.setHours(8, 0, 0)).toISOString()
          });
          return;
        }

        // Priya had sick leave 9 days ago
        if (u.id === 'USR-015' && dayOffset === 9) {
          this.attendanceRecords.push({
            id: `ATT-${u.id}-${dateStr}`,
            user_id: u.id,
            user_name: u.name,
            user_email: u.email,
            user_role: u.role,
            factory_id: 'FAC-001',
            attendance_date: dateStr,
            timestamp: new Date(recordDate.setHours(8, 30, 0)).toISOString(),
            status: 'Absent',
            check_in_time: '08:30:00',
            latitude: null,
            longitude: null,
            distance_meters: null,
            is_verified: true,
            verification_method: 'MANUAL_AUDITED_EXCEPTION',
            absence_reason: 'Sick Leave',
            absence_notes: 'Viral fever reported to supervisor',
            created_at: new Date(recordDate.setHours(8, 30, 0)).toISOString()
          });
          return;
        }

        // Normal verified check-in
        const checkInHour = 7;
        const checkInMin = 45 + (dayOffset * 3 + uIdx * 5) % 25;
        const checkInSec = (dayOffset * 7) % 60;
        const timeStr = `0${checkInHour}:${String(checkInMin).padStart(2, '0')}:${String(checkInSec).padStart(2, '0')}`;
        const distance = 80 + ((dayOffset * 37 + uIdx * 53) % 450); // 80m to 530m from factory center (well inside 1000m)

        // slight jitter around 17.4435, 78.3772
        const latJitter = 17.4435 + ((dayOffset % 5) - 2) * 0.001;
        const lonJitter = 78.3772 + (((dayOffset + uIdx) % 5) - 2) * 0.001;

        this.attendanceRecords.push({
          id: `ATT-${u.id}-${dateStr}`,
          user_id: u.id,
          user_name: u.name,
          user_email: u.email,
          user_role: u.role,
          factory_id: 'FAC-001',
          attendance_date: dateStr,
          timestamp: new Date(recordDate.setHours(checkInHour, checkInMin, checkInSec)).toISOString(),
          status: 'Present',
          check_in_time: timeStr,
          latitude: Number(latJitter.toFixed(6)),
          longitude: Number(lonJitter.toFixed(6)),
          distance_meters: distance,
          is_verified: true,
          verification_method: 'GPS_GEOFENCE',
          verification_notes: `Verified within 1km geofence (${distance}m from factory center)`,
          created_at: new Date(recordDate.setHours(checkInHour, checkInMin, checkInSec)).toISOString()
        });
      });
    }

    const todayStr = '2026-10-30';
    if (!this.attendanceRecords.some(r => r.user_id === 'USR-015' && r.attendance_date === todayStr)) {
      this.attendanceRecords.unshift({
        id: `ATT-USR-015-${todayStr}`,
        user_id: 'USR-015',
        user_name: 'Priya Sundaram',
        user_email: 'planner.apex@factoryops.com',
        user_role: 'PRODUCTION_PLANNER',
        factory_id: 'FAC-001',
        attendance_date: todayStr,
        timestamp: `${todayStr}T08:41:34.000Z`,
        status: 'Present',
        check_in_time: '08:41:34',
        latitude: 17.4435,
        longitude: 78.3772,
        distance_meters: 2,
        is_verified: true,
        verification_method: 'GPS_GEOFENCE',
        verification_notes: 'GPS location verified within 1 km geofence (2m from factory center)',
        created_at: `${todayStr}T08:41:34.000Z`
      });
    }
  }

  // --- SEED FACTORY A: Cleaned Industrial Datasets for Apex Precision (FAC-001) ---
  private loadCleanedDatasetsForApex() {
    const factoryId = 'FAC-001';
    const cwd = process.cwd();
    const assetsDir = path.resolve(cwd, 'public/assets/aistudio');

    const machineFile = path.join(assetsDir, 'Machine_Data_Cleaned_7cf076c3.csv');
    const prodFile = path.join(assetsDir, 'Production_Data_Cleaned_Updated_fc7bb91c.csv');
    const maintFile = path.join(assetsDir, 'Maintenance_Data_Cleaned_Updated_4021b41e.csv');
    const incFile = path.join(assetsDir, 'Incident_Data_Cleaned_Updated_cef3b97d.csv');
    const woFile = path.join(assetsDir, 'Work_Order_Data_Cleaned_Updated_3276fbb2.csv');

    // Parse CSV helper supporting double-quoted fields with embedded commas
    const parseCsv = (filePath: string): Record<string, string>[] => {
      if (!fs.existsSync(filePath)) return [];
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (!lines.length) return [];

      const parseLine = (line: string): string[] => {
        const res: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const c = line[i];
          if (c === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (c === ',' && !inQuotes) {
            res.push(cur);
            cur = '';
          } else {
            cur += c;
          }
        }
        res.push(cur);
        return res;
      };

      const headers = parseLine(lines[0]).map(h => h.trim());
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = parseLine(lines[i]);
        const obj: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = vals[j] ?? '';
        }
        rows.push(obj);
      }
      return rows;
    };

    // 1. Machines (24 cleaned units across Line 1 to Line 4)
    const rawMachines = parseCsv(machineFile);
    if (rawMachines.length > 0) {
      for (const m of rawMachines) {
        const mId = m.machine_id;
        const lineName = m.line_name || (m.line_id === 'L01' ? 'Machining Line 1' : m.line_id === 'L02' ? 'Stamping Line 2' : m.line_id === 'L03' ? 'Welding Line 3' : 'Coating & Packaging Line 4');
        const statusStr = (m.status || 'Active').toLowerCase();
        const normStatus = statusStr === 'active' || statusStr === 'running' ? 'running' : statusStr === 'warning' ? 'warning' : statusStr === 'maintenance' ? 'maintenance' : 'offline';

        const num = parseInt(mId.replace(/\D/g, ''), 10) || 1;
        const temp = 58 + ((num * 3.7) % 24);
        const vib = 1.2 + ((num * 0.45) % 2.5);
        const oee = 84 + ((num * 4) % 12);
        const health = Math.max(68, Math.min(98, 100 - (vib * 6) - (temp > 75 ? (temp - 75) * 1.5 : 0)));

        this.machines.push({
          id: mId,
          machine_id: mId,
          machine_name: m.machine_name || mId,
          name: m.machine_name || mId,
          line_id: m.line_id,
          line_name: lineName,
          line: lineName,
          station_number: m.station_number || 'ST-01',
          machine_type: m.machine_type || 'Industrial Asset',
          type: m.machine_type || 'Industrial Asset',
          manufacturer: m.manufacturer || 'Industrial Dynamics',
          model: m.model || 'Series-V',
          serial_number: m.serial_number || `SN-${mId}`,
          installation_date: m.installation_date || '2022-01-01',
          install_date: m.installation_date || '2022-01-01',
          last_service_date: '2026-09-15',
          target_cycle_time_seconds: Number(m.target_cycle_time_seconds) || 60,
          rated_capacity_uph: Number(m.rated_capacity_uph) || 60,
          power_rating_kw: Number(m.power_rating_kw) || 25,
          maintenance_interval_days: Number(m.maintenance_interval_days) || 30,
          status: normStatus as any,
          health_score: Math.round(health * 10) / 10,
          temperature_c: Math.round(temp * 10) / 10,
          vibration_mms: Math.round(vib * 10) / 10,
          pressure_bar: Math.round((5.5 + (num % 3) * 0.5) * 10) / 10,
          speed_rpm: 1200 + (num % 5) * 100,
          oee: Math.round(oee * 10) / 10,
          operator: 'Line Operator',
          factory_id: factoryId
        });
      }
    }

    // 2. Production (6,480 shift runs)
    const rawProd = parseCsv(prodFile);
    if (rawProd.length > 0) {
      for (const p of rawProd) {
        const prodId = p.production_id || `PRD-${Date.now()}`;
        const planned = Number(p.planned_units || 0);
        const actual = Number(p.actual_units || 0);
        const defect = Number(p.defect_units || 0);
        const good = Number(p.good_units || Math.max(0, actual - defect));
        const plannedDt = Number(p.planned_downtime_minutes || 0);
        const unplannedDt = Number(p.unplanned_downtime_minutes || 0);
        const totalDt = Number(p.downtime_minutes || (plannedDt + unplannedDt));
        const targetCycle = Number(p.target_cycle_time_seconds || 60);
        const actualCycle = Number(p.actual_cycle_time_seconds || targetCycle);
        const avail = Number(p.availability_percent || 94.5);
        const perf = Number(p.performance_percent || 98.2);
        const qual = Number(p.quality_percent || (actual > 0 ? ((actual - defect) / actual) * 100 : 98.5));
        const oee = Number(p.oee_percent || Math.round((avail * perf * qual) / 10000 * 10) / 10);

        this.production.push({
          id: prodId,
          production_id: prodId,
          factory_id: factoryId,
          machine_id: p.machine_id,
          timestamp: p.timestamp || new Date().toISOString(),
          date: p.date || (p.timestamp ? p.timestamp.split(' ')[0] : '2026-07-01'),
          shift: p.shift || 'A',
          line_id: p.line_id,
          product_id: p.product_id,
          product_name: p.product_name,
          planned_units: planned,
          target_units: planned,
          actual_units: actual,
          good_units: good,
          defect_units: defect,
          defective_units: defect,
          planned_downtime_minutes: plannedDt,
          unplanned_downtime_minutes: unplannedDt,
          downtime_minutes: totalDt,
          target_cycle_time_seconds: targetCycle,
          actual_cycle_time_seconds: actualCycle,
          cycle_time_sec: actualCycle,
          availability_percent: avail,
          performance_percent: perf,
          quality_percent: qual,
          oee_percent: oee,
          changeover_minutes: Number(p.changeover_minutes || 0),
          status: p.status || 'Running',
          scrap_kg: Number(p.scrap_kg || Math.round((defect * 0.45) * 10) / 10),
          operator: p.operator || p.operator_name || 'Shift Operator',
          operator_name: p.operator_name || p.operator || 'Shift Operator',
          line_name: p.line_name || p.line_id
        });
      }
    }

    // 3. Maintenance Records (210 logs)
    const rawMaint = parseCsv(maintFile);
    if (rawMaint.length > 0) {
      for (const m of rawMaint) {
        const mntId = m.maintenance_id;
        const dur = Number(m.duration_minutes || 60);
        const dt = Number(m.downtime_minutes || 0);
        const laborHours = Number(m.labor_hours || (dur / 60));
        const totalCost = Number(m.total_cost || 0);

        this.maintenance.push({
          id: mntId,
          maintenance_id: mntId,
          factory_id: factoryId,
          machine_id: m.machine_id,
          machine_name: m.machine_name || m.machine_id,
          line_id: m.line_id,
          type: (m.maintenance_type as any) || 'Preventive',
          maintenance_type: (m.maintenance_type as any) || 'Preventive',
          priority: m.priority || 'Medium',
          status: (m.status as any) || 'Completed',
          scheduled_date: m.start_time ? m.start_time.split(' ')[0] : '2026-07-01',
          start_time: m.start_time,
          end_time: m.end_time,
          completed_date: m.end_time ? m.end_time.split(' ')[0] : undefined,
          technician: m.technician_name || 'Maintenance Staff',
          technician_id: m.technician_id,
          technician_name: m.technician_name || 'Maintenance Staff',
          description: m.problem_description || 'Routine Service',
          problem_description: m.problem_description,
          root_cause: m.root_cause,
          action_taken: m.action_taken,
          duration_minutes: dur,
          downtime_minutes: dt,
          downtime_hours: Math.round((dt / 60) * 10) / 10,
          labor_hours: laborHours,
          labor_cost: Number(m.labor_cost || 0),
          parts_cost: Number(m.parts_cost || 0),
          total_cost: totalCost,
          cost_usd: totalCost,
          parts_replaced: m.parts_replaced,
          work_order_id: m.work_order_id,
          service_provider: m.service_provider
        });
      }
    }

    // 4. Incidents (109 logs)
    const rawInc = parseCsv(incFile);
    if (rawInc.length > 0) {
      for (const inc of rawInc) {
        const incId = inc.incident_id;
        this.incidents.push({
          id: incId,
          incident_id: incId,
          factory_id: factoryId,
          production_id: inc.production_id,
          maintenance_id: inc.maintenance_id,
          machine_id: inc.machine_id,
          machine_name: inc.machine_name || inc.machine_id,
          line_id: inc.line_id,
          line_name: inc.line_name,
          station_number: inc.station_number,
          product_id: inc.product_id,
          product_name: inc.product_name,
          incident_type: inc.incident_type || 'Unplanned Downtime',
          title: inc.problem_description || 'Operational Incident',
          problem_description: inc.problem_description || 'Operational Incident',
          description: inc.action_taken || inc.remarks || inc.problem_description,
          severity: inc.severity || 'Medium',
          status: inc.status || 'Closed',
          reported_by: inc.technician_name || 'Floor Supervisor',
          technician_id: inc.technician_id,
          technician_name: inc.technician_name,
          reported_at: inc.timestamp || new Date().toISOString(),
          timestamp: inc.timestamp || new Date().toISOString(),
          date: inc.date || (inc.timestamp ? inc.timestamp.split(' ')[0] : '2026-07-01'),
          shift: inc.shift || 'A',
          downtime_minutes: Number(inc.downtime_minutes || 0),
          defect_units: Number(inc.defect_units || 0),
          failure_category: inc.failure_category || 'Mechanical',
          root_cause: inc.root_cause,
          action_taken: inc.action_taken,
          remarks: inc.remarks
        });
      }
    }

    // 5. Work Orders (129 orders)
    const rawWo = parseCsv(woFile);
    if (rawWo.length > 0) {
      for (const w of rawWo) {
        const woId = w.work_order_id;
        const dur = Number(w.duration_minutes || 60);
        const dt = Number(w.downtime_minutes || 0);
        const laborH = Number(w.labor_hours || (dur / 60));
        const totalC = Number(w.total_cost || 0);
        const due = w.start_time ? w.start_time.split(' ')[0] : (w.creation_timestamp ? w.creation_timestamp.split(' ')[0] : '2026-07-01');

        this.workOrders.push({
          id: woId,
          work_order_id: woId,
          factory_id: factoryId,
          maintenance_id: w.maintenance_id,
          incident_id: w.incident_id,
          production_id: w.production_id,
          machine_id: w.machine_id,
          machine_name: w.machine_name || w.machine_id,
          line_id: w.line_id,
          line_name: w.line_name,
          station_number: w.station_number,
          work_order_type: w.work_order_type || 'Corrective',
          title: w.problem_description || 'Maintenance Action',
          problem_description: w.problem_description || 'Maintenance Action',
          priority: w.priority || 'Medium',
          status: w.status || 'Completed',
          assigned_to: w.technician_name || 'Senior Field Tech',
          technician_id: w.technician_id,
          technician_name: w.technician_name || 'Senior Field Tech',
          due_date: due,
          created_at: w.creation_timestamp || new Date().toISOString(),
          creation_timestamp: w.creation_timestamp || new Date().toISOString(),
          start_time: w.start_time,
          end_time: w.end_time,
          completed_at: w.end_time || undefined,
          estimated_hours: laborH,
          actual_hours: laborH,
          duration_minutes: dur,
          downtime_minutes: dt,
          labor_hours: laborH,
          labor_cost: Number(w.labor_cost || 0),
          parts_cost: Number(w.parts_cost || 0),
          total_cost: totalC,
          parts_required: w.parts_replaced,
          parts_replaced: w.parts_replaced,
          failure_category: w.failure_category,
          root_cause: w.root_cause,
          action_taken: w.action_taken,
          service_provider: w.service_provider
        });
      }
    }

    // 6. Standard Operating Procedures (SOPs) for Apex
    this.sops.push(
      {
        id: 'SOP-001',
        sop_id: 'SOP-CNC-501',
        factory_id: factoryId,
        title: '5-Axis CNC Milling Warm-up and Zero Referencing Protocol',
        machine_type: 'CNC Machining Center',
        category: 'Operating Procedure',
        version: 'v3.2',
        last_updated: '2026-08-15',
        author: 'Chief Process Engineer',
        steps: [
          'Verify pneumatic supply pressure is stabilized above 6.0 bar before powering control cabinet.',
          'Execute spindle low-RPM ramp-up sequence (500 RPM -> 3000 RPM over 8 minutes) to distribute lubricant.',
          'Engage automatic tool length measurement probe and confirm stylus runout is < 0.003mm.',
          'Run dry-cycle Axis referencing cycle G28 Z0 followed by X0 Y0 and record position offsets.'
        ],
        safety_precautions: [
          'Never bypass interlock switches on the safety enclosure doors during automatic cycle.',
          'Eye and ear protection mandatory within 5 meters of operating milling enclosure.',
          'Confirm flood coolant sump level is above 75% indicator mark before initiating spindle.'
        ],
        target_audience: 'Operators & Setup Technicians'
      },
      {
        id: 'SOP-002',
        sop_id: 'SOP-PRS-402',
        factory_id: factoryId,
        title: 'Hydraulic Stamping Press Die Changeover & Tonnage Calibration',
        machine_type: 'Servo Hydraulic Press',
        category: 'Maintenance & Setup',
        version: 'v2.8',
        last_updated: '2026-07-20',
        author: 'Senior Tooling Specialist',
        steps: [
          'Engage mechanical safety lock pins on upper press slide before entering die bed area.',
          'Depressurize secondary hydraulic accumulator circuit to 0 bar and verify gauge reads zero.',
          'Disconnect quick-release hydraulic manifold couplings for upper clamping cylinders.',
          'Use overhead crane with certified 4-leg wire rope sling to hoist upper die set (rated >= 5 metric tons).'
        ],
        safety_precautions: [
          'Dual palm pushbuttons must be verified operational prior to entering semi-automatic run mode.',
          'Lockout/Tagout (LOTO) procedure mandatory on main 415V electrical breaker during die positioning.',
          'Safety light curtain alignment test must pass optical verification grid check.'
        ],
        target_audience: 'Die Setters & Tooling Engineers'
      },
      {
        id: 'SOP-003',
        sop_id: 'SOP-ROB-303',
        factory_id: factoryId,
        title: 'Robotic MIG Welding Torch Maintenance & Wire Feed Calibration',
        machine_type: 'Articulated Robot Welder',
        category: 'Preventive Maintenance',
        version: 'v4.0',
        last_updated: '2026-09-02',
        author: 'Automation Reliability Lead',
        steps: [
          'Power off welding power source and activate teach pendant teach mode with E-stop depressed.',
          'Remove gas nozzle and contact tip; inspect for spatter accumulation and bore wear.',
          'Clean gas diffuser holes with brass nozzle reamer and apply anti-spatter ceramic coating.',
          'Inspect wire feeder drive rolls; check grooving for 1.2mm wire alignment and set roll pressure.',
          'Execute automated torch cleaning station cycle (wire cut, ream, and anti-spatter spray).'
        ],
        safety_precautions: [
          'Hot work zone: welding torch remains above 200°C for up to 20 minutes post-weld.',
          'Inspect shielding gas (82% Ar / 18% CO2) cylinder regulator for high-pressure leaks.',
          'UV-rated welding curtains must be secured and interlocked to the safety zone scanner.'
        ],
        target_audience: 'Weld Technicians & Maintenance'
      },
      {
        id: 'SOP-004',
        sop_id: 'SOP-EMG-101',
        factory_id: factoryId,
        title: 'Emergency Machine Shutdown & Incident Triage Protocol',
        machine_type: 'All Machinery',
        category: 'Emergency & Safety',
        version: 'v5.1',
        last_updated: '2026-09-12',
        author: 'Director of Plant Safety',
        steps: [
          'Depress nearest Emergency Stop (E-Stop) pushbutton immediately upon observing hazard or collision.',
          'Alert Line Supervisor and press floor emergency notification beacon.',
          'Isolate electrical disconnect switch if safe to do so; attach red LOTO padlock.',
          'Log incident in FactoryOps system with machine ID, timestamp, and observed failure symptoms.'
        ],
        safety_precautions: [
          'Do not attempt to clear jammed workpieces or scrap until all kinetic and hydraulic energy is dissipated.',
          'Maintain clear perimeter of 3 meters around quarantined equipment until maintenance arrives.'
        ],
        target_audience: 'All Plant Personnel'
      }
    );

    // 7. Data Quality Metrics for Apex
    this.dataQuality.push(
      {
        id: 'DQ-001',
        factory_id: factoryId,
        sensor_name: 'Spindle Vibration Accelerometer (X/Y/Z)',
        machine_id: 'M001',
        uptime_percentage: 99.8,
        data_completeness_pct: 99.4,
        latency_ms: 18,
        anomalies_detected: 0,
        status: 'Healthy',
        last_sync: '12 seconds ago'
      },
      {
        id: 'DQ-002',
        factory_id: factoryId,
        sensor_name: 'Main Hydraulic Ram Pressure Transducer',
        machine_id: 'M007',
        uptime_percentage: 98.2,
        data_completeness_pct: 97.1,
        latency_ms: 45,
        anomalies_detected: 2,
        status: 'Degraded',
        last_sync: '45 seconds ago'
      },
      {
        id: 'DQ-003',
        factory_id: factoryId,
        sensor_name: 'Thermographic Bearing Temperature Probe',
        machine_id: 'M004',
        uptime_percentage: 99.9,
        data_completeness_pct: 99.9,
        latency_ms: 12,
        anomalies_detected: 0,
        status: 'Healthy',
        last_sync: '5 seconds ago'
      },
      {
        id: 'DQ-004',
        factory_id: factoryId,
        sensor_name: 'Weld Current & Voltage Telemetry Core',
        machine_id: 'M013',
        uptime_percentage: 99.4,
        data_completeness_pct: 98.8,
        latency_ms: 22,
        anomalies_detected: 1,
        status: 'Healthy',
        last_sync: '18 seconds ago'
      }
    );
  }

  // --- SEED FACTORY A: Apex Precision Manufacturing (FAC-001) ---
  private seedFactoryA() {
    const factoryId = 'FAC-001';
    if (this.machines.some(m => m.factory_id === factoryId)) {
      return;
    }
    const lines = ['Engine Block Line A', 'Transmission Line B', 'Chassis Line C'];
    const operators = ['Ramesh V.', 'Sanjay P.', 'Gita K.', 'Deepak R.', 'Arun M.'];

    // 15 Machines
    const machineTypes = [
      { prefix: 'APX-CNC', type: '5-Axis CNC Milling', count: 6, line: lines[0] },
      { prefix: 'APX-PRS', type: 'Hydraulic Stamping Press 500T', count: 4, line: lines[1] },
      { prefix: 'APX-ROB', type: '6-Axis Robotic Welder', count: 3, line: lines[2] },
      { prefix: 'APX-CMM', type: 'Coordinate Measuring Machine', count: 1, line: lines[0] },
      { prefix: 'APX-WLD', type: 'Laser Welding Cell', count: 1, line: lines[2] },
    ];

    let mIdx = 1;
    for (const group of machineTypes) {
      for (let i = 1; i <= group.count; i++) {
        const machineId = `${group.prefix}-${String(i).padStart(2, '0')}`;
        // Status distribution: 12 running, 2 warning, 1 maintenance
        let status: Machine['status'] = 'running';
        let health = 92 - (mIdx % 5);
        let temp = 62 + (mIdx * 1.5) % 15;
        let vib = 1.8 + (mIdx * 0.2) % 1.5;
        let oee = 88.5 + ((mIdx * 3) % 8) - 2;

        if (mIdx === 7) {
          status = 'warning';
          health = 74;
          temp = 81.5;
          vib = 3.8;
          oee = 79.2;
        } else if (mIdx === 12) {
          status = 'warning';
          health = 71;
          temp = 83.0;
          vib = 4.1;
          oee = 76.5;
        } else if (mIdx === 15) {
          status = 'maintenance';
          health = 58;
          temp = 42.0;
          vib = 0.5;
          oee = 0;
        }

        this.machines.push({
          id: `M-A${mIdx}`,
          factory_id: factoryId,
          machine_id: machineId,
          name: `${group.type} #${i}`,
          type: group.type,
          line: group.line,
          status,
          health_score: health,
          temperature_c: Math.round(temp * 10) / 10,
          vibration_mms: Math.round(vib * 10) / 10,
          pressure_bar: Math.round((5.8 + (mIdx % 3) * 0.4) * 10) / 10,
          speed_rpm: 1450 + (mIdx % 4) * 50,
          oee: Math.round(oee * 10) / 10,
          operator: operators[(mIdx - 1) % operators.length],
          install_date: '2021-04-12',
          last_service_date: '2026-09-18'
        });
        mIdx++;
      }
    }

    // Production Records for Apex
    const shifts: ('Morning' | 'Afternoon' | 'Night')[] = ['Morning', 'Afternoon', 'Night'];
    for (let day = 1; day <= 14; day++) {
      const dateStr = new Date(Date.now() - (14 - day) * 86400000).toISOString().split('T')[0];
      for (const shift of shifts) {
        for (let m = 1; m <= 6; m++) {
          const mId = `APX-CNC-0${m}`;
          const target = 160;
          const actual = m === 5 ? 135 : 155 + (day % 3) * 3;
          const defective = m === 5 ? 4 : (day % 2);
          this.production.push({
            id: `PRD-A-${day}-${shift}-${m}`,
            factory_id: factoryId,
            machine_id: mId,
            timestamp: `${dateStr}T${shift === 'Morning' ? '06:00:00' : shift === 'Afternoon' ? '14:00:00' : '22:00:00'}Z`,
            shift,
            target_units: target,
            actual_units: actual,
            defective_units: defective,
            scrap_kg: Math.round((defective * 1.8 + 0.4) * 10) / 10,
            cycle_time_sec: 42 + (m % 3),
            operator: operators[m % operators.length]
          });
        }
      }
    }

    // Incidents for Apex
    this.incidents.push(
      {
        id: 'INC-A01',
        incident_id: 'INC-2026-0104',
        factory_id: factoryId,
        machine_id: 'APX-PRS-03',
        title: 'Hydraulic Seal Micro-leakage & Pressure Drop',
        description: 'Intermittent pressure drops noticed on valve block manifold. Pressure fluctuated between 4.2 and 5.9 bar.',
        severity: 'Medium',
        status: 'Investigating',
        reported_by: 'Sanjay P.',
        reported_at: '2026-10-05T14:22:00Z',
        root_cause: 'Seal wear at primary piston fitting under high thermal cycle.'
      },
      {
        id: 'INC-A02',
        incident_id: 'INC-2026-0098',
        factory_id: factoryId,
        machine_id: 'APX-CNC-04',
        title: 'Spindle Bearing Thermal Warning (>82°C)',
        description: 'Vibration frequency anomaly detected on axis Z with thermal buildup exceeding standard threshold.',
        severity: 'High',
        status: 'Open',
        reported_by: 'Ramesh V.',
        reported_at: '2026-10-06T01:10:00Z'
      },
      {
        id: 'INC-A03',
        incident_id: 'INC-2026-0087',
        factory_id: factoryId,
        machine_id: 'APX-ROB-02',
        title: 'Welding Torch Tip Cladding Oxidation',
        description: 'Automated torch cleaner nozzle blockage caused partial cladding splatter.',
        severity: 'Low',
        status: 'Resolved',
        reported_by: 'Deepak R.',
        reported_at: '2026-10-04T09:15:00Z',
        resolved_at: '2026-10-04T16:30:00Z',
        root_cause: 'Gas shield flow restrictor clogged.',
        resolution_notes: 'Cleaned nozzle, calibrated gas mix, passed QA verification.'
      }
    );

    // Maintenance for Apex
    this.maintenance.push(
      {
        id: 'MNT-A01',
        factory_id: factoryId,
        machine_id: 'APX-WLD-01',
        type: 'Preventive',
        status: 'In Progress',
        scheduled_date: '2026-10-06',
        technician: 'Kishore B. (Senior Tech)',
        description: 'Bi-annual optics calibration, chiller flush, and laser power meter alignment.',
        cost_usd: 1250,
        downtime_hours: 4.5
      },
      {
        id: 'MNT-A02',
        factory_id: factoryId,
        machine_id: 'APX-CNC-02',
        type: 'Predictive',
        status: 'Scheduled',
        scheduled_date: '2026-10-08',
        technician: 'Anil S.',
        description: 'Spindle vibration harmonic analysis and grease replenishing.',
        cost_usd: 480,
        downtime_hours: 2.0
      },
      {
        id: 'MNT-A03',
        factory_id: factoryId,
        machine_id: 'APX-PRS-01',
        type: 'Preventive',
        status: 'Completed',
        scheduled_date: '2026-09-30',
        completed_date: '2026-09-30',
        technician: 'Kishore B.',
        description: 'Filter replacement, hydraulic fluid flush, pressure transducer zeroing.',
        cost_usd: 820,
        downtime_hours: 3.0
      }
    );

    // Work Orders for Apex
    this.workOrders.push(
      {
        id: 'WO-A01',
        work_order_id: 'WO-2026-0412',
        factory_id: factoryId,
        machine_id: 'APX-CNC-04',
        title: 'Spindle Bearing Re-alignment and Lubricant Purge',
        priority: 'High',
        status: 'In Progress',
        assigned_to: 'Ramesh Varma (Senior Technician)',
        due_date: '2026-10-18',
        created_at: '2026-10-06T02:00:00Z',
        estimated_hours: 4,
        parts_required: 'SKF Ceramic Hybrid Bearing Set, Mobil Vactra #2'
      },
      {
        id: 'WO-A02',
        work_order_id: 'WO-2026-0395',
        factory_id: factoryId,
        machine_id: 'APX-PRS-03',
        title: 'Manifold High-Pressure O-Ring Seal Replacement',
        priority: 'Critical',
        status: 'In Progress',
        assigned_to: 'Ramesh Varma (Senior Technician)',
        due_date: '2026-10-11', // Overdue (earlier than today Oct 14)
        created_at: '2026-10-05T15:30:00Z',
        estimated_hours: 3,
        parts_required: 'Viton 90 Durometer High-Temp Seal Kit'
      },
      {
        id: 'WO-A03',
        work_order_id: 'WO-2026-0380',
        factory_id: factoryId,
        machine_id: 'APX-CMM-01',
        title: 'Granite Table Levelling & Laser Interferometer Verification',
        priority: 'Low',
        status: 'Completed',
        assigned_to: 'Ramesh Varma (Senior Technician)',
        due_date: '2026-10-02',
        created_at: '2026-09-29T10:00:00Z',
        completed_at: '2026-10-01T17:00:00Z',
        estimated_hours: 6,
        actual_hours: 5.5
      },
      {
        id: 'WO-A04',
        work_order_id: 'WO-2026-0428',
        factory_id: factoryId,
        machine_id: 'APX-ROB-02',
        title: 'Robotic Arm Axis 4 Servo Harmonic Drive Greasing',
        priority: 'Medium',
        status: 'Pending',
        assigned_to: 'Ramesh Varma (Senior Technician)',
        due_date: '2026-10-16',
        created_at: '2026-10-12T08:00:00Z',
        estimated_hours: 2,
        parts_required: 'Harmonic grease cartridge, Seal ring'
      },
      {
        id: 'WO-A05',
        work_order_id: 'WO-2026-0435',
        factory_id: factoryId,
        machine_id: 'APX-WLD-01',
        title: 'Fiber Laser Optic Chiller De-ionizing Filter Exchange',
        priority: 'High',
        status: 'Pending',
        assigned_to: 'Anil S.',
        due_date: '2026-10-15',
        created_at: '2026-10-13T11:20:00Z',
        estimated_hours: 2.5,
        parts_required: '0.2 Micron Chiller Cartridge'
      }
    );

    // SOPs for Apex
    this.sops.push(
      {
        id: 'SOP-A01',
        sop_id: 'SOP-CNC-501',
        factory_id: factoryId,
        title: '5-Axis CNC Milling Warm-up and Zero Referencing Protocol',
        machine_type: '5-Axis CNC Milling',
        category: 'Operating Procedure',
        version: 'v3.2',
        last_updated: '2026-08-15',
        author: 'Chief Process Engineer',
        steps: [
          'Verify pneumatic supply pressure is stabilized above 6.0 bar before powering control cabinet.',
          'Execute spindle low-RPM ramp-up sequence (500 RPM -> 3000 RPM over 8 minutes) to distribute lubricant.',
          'Engage automatic tool length measurement probe and confirm stylus runout is < 0.003mm.',
          'Reference G54 datum using electronic touch-probe against hardened fixture gauge.'
        ],
        safety_precautions: [
          'Safety enclosure interlock must never be bypassed during spindle test cycles.',
          'Always wear Class 1 impact-resistant eye protection and anti-slip safety footwear.'
        ],
        target_audience: 'CNC Machinists & Machine Operators'
      },
      {
        id: 'SOP-A02',
        sop_id: 'SOP-PRS-204',
        factory_id: factoryId,
        title: 'Hydraulic Stamping Press 500T Die Setup & Pressure Relief Procedure',
        machine_type: 'Hydraulic Stamping Press 500T',
        category: 'Safety Protocol',
        version: 'v2.1',
        last_updated: '2026-07-20',
        author: 'Safety Director',
        steps: [
          'Lockout/Tagout (LOTO) main 415V electrical breaker and bleed residual hydraulic cylinder energy.',
          'Inspect die bolsters and clamp bolts with calibrated torque wrench (450 Nm).',
          'Align photoelectric light curtains and perform mandatory break-test before releasing interlocks.',
          'Perform initial slow-stroke test with sacrificial aluminum blank to inspect draw depth.'
        ],
        safety_precautions: [
          'Two-hand anti-tie-down control stations must be tested before every shift.',
          'Die safety blocks must be physically placed under the ram during tooling adjustment.'
        ],
        target_audience: 'Press Operators & Tool-and-Die Technicians'
      }
    );

    // Data Quality for Apex
    this.dataQuality.push(
      {
        id: 'DQ-A01',
        factory_id: factoryId,
        sensor_name: 'Spindle Temperature & Accelerometer Bus',
        machine_id: 'APX-CNC-01',
        uptime_percentage: 99.8,
        data_completeness_pct: 99.4,
        latency_ms: 18,
        anomalies_detected: 0,
        status: 'Healthy',
        last_sync: '12 seconds ago'
      },
      {
        id: 'DQ-A02',
        factory_id: factoryId,
        sensor_name: 'Hydraulic Pressure Transducer',
        machine_id: 'APX-PRS-03',
        uptime_percentage: 98.2,
        data_completeness_pct: 97.1,
        latency_ms: 45,
        anomalies_detected: 2,
        status: 'Degraded',
        last_sync: '45 seconds ago'
      }
    );
  }

  // --- SEED FACTORY B: Nova Industrial Systems (FAC-002) ---
  private seedFactoryB() {
    const factoryId = 'FAC-002';
    const lines = ['Turbine Blades Line 1', 'Heavy Gearboxes Line 2', 'Precision Shafts Line 3'];
    const operators = ['Sunil M.', 'Prashant T.', 'Sneha R.', 'Vinod B.'];

    // 18 Machines
    const machineTypes = [
      { prefix: 'NOV-MIL', type: 'Vertical Machining Center', count: 6, line: lines[0] },
      { prefix: 'NOV-LTH', type: 'Heavy Duty CNC Lathe', count: 6, line: lines[1] },
      { prefix: 'NOV-GRD', type: 'Cylindrical Surface Grinder', count: 4, line: lines[2] },
      { prefix: 'NOV-ASM', type: 'Robotic Gearbox Assembly Station', count: 2, line: lines[1] }
    ];

    let mIdx = 1;
    for (const group of machineTypes) {
      for (let i = 1; i <= group.count; i++) {
        const machineId = `${group.prefix}-${String(i).padStart(2, '0')}`;
        let status: Machine['status'] = 'running';
        let health = 88 - (mIdx % 6);
        let temp = 65 + (mIdx * 1.8) % 18;
        let vib = 2.1 + (mIdx * 0.25) % 1.8;
        let oee = 84.0 + ((mIdx * 2.5) % 7) - 2;

        if (mIdx === 4) {
          status = 'warning';
          health = 73;
          temp = 79.4;
          vib = 3.9;
          oee = 78.1;
        } else if (mIdx === 9) {
          status = 'warning';
          health = 75;
          temp = 81.2;
          vib = 4.2;
          oee = 75.8;
        } else if (mIdx === 14) {
          status = 'warning';
          health = 70;
          temp = 83.5;
          vib = 4.4;
          oee = 74.2;
        } else if (mIdx === 18) {
          status = 'maintenance';
          health = 54;
          temp = 38.0;
          vib = 0.2;
          oee = 0;
        }

        this.machines.push({
          id: `M-B${mIdx}`,
          factory_id: factoryId,
          machine_id: machineId,
          name: `${group.type} #${i}`,
          type: group.type,
          line: group.line,
          status,
          health_score: health,
          temperature_c: Math.round(temp * 10) / 10,
          vibration_mms: Math.round(vib * 10) / 10,
          pressure_bar: Math.round((6.1 + (mIdx % 3) * 0.3) * 10) / 10,
          speed_rpm: 1200 + (mIdx % 5) * 80,
          oee: Math.round(oee * 10) / 10,
          operator: operators[(mIdx - 1) % operators.length],
          install_date: '2020-08-19',
          last_service_date: '2026-09-12'
        });
        mIdx++;
      }
    }

    // Production for Nova
    for (let day = 1; day <= 14; day++) {
      const dateStr = new Date(Date.now() - (14 - day) * 86400000).toISOString().split('T')[0];
      for (const shift of ['Morning', 'Afternoon', 'Night'] as const) {
        for (let m = 1; m <= 6; m++) {
          const mId = `NOV-MIL-0${m}`;
          const target = 140;
          const actual = m === 4 ? 118 : 134 + (day % 4) * 2;
          const defective = m === 4 ? 6 : (day % 3);
          this.production.push({
            id: `PRD-B-${day}-${shift}-${m}`,
            factory_id: factoryId,
            machine_id: mId,
            timestamp: `${dateStr}T${shift === 'Morning' ? '06:00:00' : shift === 'Afternoon' ? '14:00:00' : '22:00:00'}Z`,
            shift,
            target_units: target,
            actual_units: actual,
            defective_units: defective,
            scrap_kg: Math.round((defective * 2.2 + 0.6) * 10) / 10,
            cycle_time_sec: 48 + (m % 4),
            operator: operators[m % operators.length]
          });
        }
      }
    }

    // Incidents for Nova
    this.incidents.push(
      {
        id: 'INC-B01',
        incident_id: 'INC-2026-0210',
        factory_id: factoryId,
        machine_id: 'NOV-LTH-03',
        title: 'Chucking Hydraulic Pressure Deviation',
        description: 'Automatic bar feeder reported clamping pressure drop below 35 bar minimum threshold.',
        severity: 'High',
        status: 'Open',
        reported_by: 'Sunil M.',
        reported_at: '2026-10-06T03:15:00Z'
      },
      {
        id: 'INC-B02',
        incident_id: 'INC-2026-0205',
        factory_id: factoryId,
        machine_id: 'NOV-GRD-02',
        title: 'Coolant Flow Rate Sensor Stoppage',
        description: 'Flow meter indicated zero flow while pump motor remained energized. Preventative interlock tripped.',
        severity: 'Medium',
        status: 'Investigating',
        reported_by: 'Prashant T.',
        reported_at: '2026-10-05T18:40:00Z',
        root_cause: 'Particulate sludge clogging fine mesh suction strainer.'
      }
    );

    // Maintenance for Nova
    this.maintenance.push(
      {
        id: 'MNT-B01',
        factory_id: factoryId,
        machine_id: 'NOV-ASM-02',
        type: 'Predictive',
        status: 'Scheduled',
        scheduled_date: '2026-10-09',
        technician: 'Sagar N.',
        description: 'Harmonic drive backlash calibration on wrist axes J4 & J5.',
        cost_usd: 950,
        downtime_hours: 3.5
      },
      {
        id: 'MNT-B02',
        factory_id: factoryId,
        machine_id: 'NOV-LTH-01',
        type: 'Preventive',
        status: 'Completed',
        scheduled_date: '2026-09-28',
        completed_date: '2026-09-28',
        technician: 'Sagar N.',
        description: 'Turret index coupling alignment and hydraulic filter swap.',
        cost_usd: 620,
        downtime_hours: 2.5
      }
    );

    // Work Orders for Nova
    this.workOrders.push(
      {
        id: 'WO-B01',
        work_order_id: 'WO-2026-0501',
        factory_id: factoryId,
        machine_id: 'NOV-LTH-03',
        title: 'Chuck Cylinder Rotary Joint Seal Inspection',
        priority: 'High',
        status: 'Pending',
        assigned_to: 'Sagar N.',
        due_date: '2026-10-07',
        created_at: '2026-10-06T03:30:00Z',
        estimated_hours: 3.5,
        parts_required: 'Kitagawa Hydraulic Cylinder Rotary Joint Kit'
      },
      {
        id: 'WO-B02',
        work_order_id: 'WO-2026-0488',
        factory_id: factoryId,
        machine_id: 'NOV-GRD-02',
        title: 'Coolant Sump Ultrasonic Cleaning & Micron Filter Renewal',
        priority: 'Medium',
        status: 'In Progress',
        assigned_to: 'Maintenance Crew B',
        due_date: '2026-10-06',
        created_at: '2026-10-05T19:00:00Z',
        estimated_hours: 2.0,
        parts_required: '10 Micron Bag Filters x 4, Castrol Hysol Coolant 50L'
      }
    );

    // SOPs for Nova
    this.sops.push(
      {
        id: 'SOP-B01',
        sop_id: 'SOP-LTH-301',
        factory_id: factoryId,
        title: 'Heavy CNC Lathe Chuck Pressure Verification and Hard Jaw Boring',
        machine_type: 'Heavy Duty CNC Lathe',
        category: 'Operating Procedure',
        version: 'v2.0',
        last_updated: '2026-09-01',
        author: 'Lead Tooling Specialist',
        steps: [
          'Verify gripping force using dynamic wireless chuck force gauge at 1500 RPM.',
          'Clock soft jaws with dial indicator to ensure concentricity within 0.015mm.',
          'Execute pre-programmed boring cycle with light 0.2mm depth-of-cut pass.'
        ],
        safety_precautions: [
          'Never leave chuck wrench in chuck under any circumstance.',
          'Ensure chip conveyor is running and interlocked before starting cycle.'
        ],
        target_audience: 'Lathe Operators'
      }
    );

    // Data Quality for Nova
    this.dataQuality.push({
      id: 'DQ-B01',
      factory_id: factoryId,
      sensor_name: 'Vibration & Acoustic Emission Array',
      machine_id: 'NOV-MIL-01',
      uptime_percentage: 99.1,
      data_completeness_pct: 98.7,
      latency_ms: 22,
      anomalies_detected: 1,
      status: 'Healthy',
      last_sync: '18 seconds ago'
    });
  }

  // --- SEED FACTORY C: Vertex Auto Components (FAC-003) ---
  private seedFactoryC() {
    const factoryId = 'FAC-003';
    const lines = ['Body Shop Line', 'Paint Shop Line', 'Final Assembly Line'];
    const operators = ['Murugan C.', 'Jayanthi S.', 'Venkatesh P.'];

    // 16 Machines
    const machineTypes = [
      { prefix: 'VTX-STP', type: 'Progressive Stamping Press', count: 5, line: lines[0] },
      { prefix: 'VTX-ROB', type: 'Spot Welding Robot', count: 5, line: lines[0] },
      { prefix: 'VTX-PNT', type: 'Automated Electrostatic Paint Booth', count: 3, line: lines[1] },
      { prefix: 'VTX-QC', type: 'Automated Optical Inspection Cell', count: 3, line: lines[2] }
    ];

    let mIdx = 1;
    for (const group of machineTypes) {
      for (let i = 1; i <= group.count; i++) {
        const machineId = `${group.prefix}-${String(i).padStart(2, '0')}`;
        let status: Machine['status'] = 'running';
        let health = 94 - (mIdx % 5);
        let oee = 90.0 + ((mIdx * 1.5) % 5);

        if (mIdx === 6) {
          status = 'warning';
          health = 77;
          oee = 83.2;
        } else if (mIdx === 16) {
          status = 'maintenance';
          health = 60;
          oee = 0;
        }

        this.machines.push({
          id: `M-C${mIdx}`,
          factory_id: factoryId,
          machine_id: machineId,
          name: `${group.type} #${i}`,
          type: group.type,
          line: group.line,
          status,
          health_score: health,
          temperature_c: Math.round((55 + (mIdx % 10)) * 10) / 10,
          vibration_mms: Math.round((1.4 + (mIdx % 5) * 0.2) * 10) / 10,
          pressure_bar: 5.5,
          speed_rpm: 1500,
          oee: Math.round(oee * 10) / 10,
          operator: operators[(mIdx - 1) % operators.length],
          install_date: '2022-02-14',
          last_service_date: '2026-09-24'
        });
        mIdx++;
      }
    }

    // Incidents for Vertex
    this.incidents.push({
      id: 'INC-C01',
      incident_id: 'INC-2026-0301',
      factory_id: factoryId,
      machine_id: 'VTX-ROB-03',
      title: 'Spot Welder Current Density Fluctuation',
      description: 'Secondary current dropped by 8% during outer door panel tack sequence.',
      severity: 'Medium',
      status: 'Open',
      reported_by: 'Murugan C.',
      reported_at: '2026-10-06T00:45:00Z'
    });

    // Work Orders for Vertex
    this.workOrders.push({
      id: 'WO-C01',
      work_order_id: 'WO-2026-0610',
      factory_id: factoryId,
      machine_id: 'VTX-ROB-03',
      title: 'Electrode Tip Dresser Maintenance and Transformer Check',
      priority: 'Medium',
      status: 'Pending',
      assigned_to: 'R. Balaji',
      due_date: '2026-10-08',
      created_at: '2026-10-06T01:00:00Z',
      estimated_hours: 2.5
    });

    // Maintenance for Vertex
    this.maintenance.push({
      id: 'MNT-C01',
      factory_id: factoryId,
      machine_id: 'VTX-PNT-01',
      type: 'Preventive',
      status: 'Completed',
      scheduled_date: '2026-10-01',
      completed_date: '2026-10-01',
      technician: 'R. Balaji',
      description: 'Electrostatic atomizer bell cup cleaning and voltage curve audit.',
      cost_usd: 1100,
      downtime_hours: 3.0
    });

    // SOPs for Vertex
    this.sops.push({
      id: 'SOP-C01',
      sop_id: 'SOP-WLD-101',
      factory_id: factoryId,
      title: 'Robotic Spot Welding Tip Dressing & Force Calibration Protocol',
      machine_type: 'Spot Welding Robot',
      category: 'Quality Inspection',
      version: 'v1.4',
      last_updated: '2026-08-10',
      author: 'Body Shop Quality Lead',
      steps: [
        'Inspect electrode cap wear profile with optical gauge.',
        'Run auto-dress cycle for 1.8 seconds.',
        'Validate clamp force with calibrated load cell.'
      ],
      safety_precautions: ['Ensure robot cell gate is e-stopped during cell entry.'],
      target_audience: 'Robotics Technicians'
    });

    // Data Quality for Vertex
    this.dataQuality.push({
      id: 'DQ-C01',
      factory_id: factoryId,
      sensor_name: 'Current Transformer Telemetry Bus',
      machine_id: 'VTX-ROB-01',
      uptime_percentage: 99.9,
      data_completeness_pct: 99.8,
      latency_ms: 12,
      anomalies_detected: 0,
      status: 'Healthy',
      last_sync: '5 seconds ago'
    });
  }

  // --- SEED FACTORY D: PrimeTech Manufacturing (FAC-004) ---
  private seedFactoryD() {
    const factoryId = 'FAC-004';
    const lines = ['SMT High-Speed Line 1', 'SMT High-Speed Line 2', 'Testing & Packaging Line'];
    const operators = ['Pooja N.', 'Chethan K.', 'Divya S.'];

    // 20 Machines
    const machineTypes = [
      { prefix: 'PRM-SMT', type: 'High-Speed SMT Pick & Place', count: 8, line: lines[0] },
      { prefix: 'PRM-AOI', type: '3D Automated Optical Inspection', count: 4, line: lines[1] },
      { prefix: 'PRM-RFL', type: 'Nitrogen Reflow Oven 12-Zone', count: 4, line: lines[1] },
      { prefix: 'PRM-TST', type: 'In-Circuit ICT / Functional Tester', count: 4, line: lines[2] }
    ];

    let mIdx = 1;
    for (const group of machineTypes) {
      for (let i = 1; i <= group.count; i++) {
        const machineId = `${group.prefix}-${String(i).padStart(2, '0')}`;
        let status: Machine['status'] = 'running';
        let health = 85 - (mIdx % 7);
        let oee = 78.0 + ((mIdx * 1.8) % 6);

        if (mIdx === 2 || mIdx === 7 || mIdx === 11 || mIdx === 15) {
          status = 'warning';
          health = 71;
          oee = 72.5;
        } else if (mIdx === 20) {
          status = 'maintenance';
          health = 52;
          oee = 0;
        }

        this.machines.push({
          id: `M-D${mIdx}`,
          factory_id: factoryId,
          machine_id: machineId,
          name: `${group.type} #${i}`,
          type: group.type,
          line: group.line,
          status,
          health_score: health,
          temperature_c: Math.round((48 + (mIdx % 8)) * 10) / 10,
          vibration_mms: 0.8,
          pressure_bar: 6.0,
          speed_rpm: 2800,
          oee: Math.round(oee * 10) / 10,
          operator: operators[(mIdx - 1) % operators.length],
          install_date: '2023-01-10',
          last_service_date: '2026-09-10'
        });
        mIdx++;
      }
    }

    // Incidents for PrimeTech
    this.incidents.push({
      id: 'INC-D01',
      incident_id: 'INC-2026-0415',
      factory_id: factoryId,
      machine_id: 'PRM-SMT-02',
      title: 'Feeder Reel Feeder Jamming Error 402',
      description: 'Component mispick rate exceeded 0.05% on 0201 capacitor reels.',
      severity: 'Medium',
      status: 'Open',
      reported_by: 'Pooja N.',
      reported_at: '2026-10-06T02:30:00Z'
    });

    // Work Orders for PrimeTech
    this.workOrders.push({
      id: 'WO-D01',
      work_order_id: 'WO-2026-0720',
      factory_id: factoryId,
      machine_id: 'PRM-SMT-02',
      title: 'Vacuum Nozzle Ultrasonic Cleaning & Feeder Calibration',
      priority: 'High',
      status: 'In Progress',
      assigned_to: 'Naveen K.',
      due_date: '2026-10-06',
      created_at: '2026-10-06T02:45:00Z',
      estimated_hours: 1.5
    });

    // Maintenance for PrimeTech
    this.maintenance.push({
      id: 'MNT-D01',
      factory_id: factoryId,
      machine_id: 'PRM-RFL-01',
      type: 'Preventive',
      status: 'Completed',
      scheduled_date: '2026-09-29',
      completed_date: '2026-09-29',
      technician: 'Naveen K.',
      description: 'Flux condensation collector cleanout and thermal profile audit.',
      cost_usd: 750,
      downtime_hours: 2.0
    });

    // SOPs for PrimeTech
    this.sops.push({
      id: 'SOP-D01',
      sop_id: 'SOP-SMT-401',
      factory_id: factoryId,
      title: 'SMT Feeder Setup and Solder Paste Height Inspection',
      machine_type: 'High-Speed SMT Pick & Place',
      category: 'Operating Procedure',
      version: 'v4.1',
      last_updated: '2026-09-15',
      author: 'SMT Process Lead',
      steps: [
        'Scan QR barcode on component reel and verify BOM line.',
        'Apply solder paste with stainless stencil (120 micron).',
        'Verify paste volume on SPI system before releasing PCB.'
      ],
      safety_precautions: ['ESD wrist strap and anti-static smock mandatory.'],
      target_audience: 'SMT Line Operators'
    });

    // Data Quality for PrimeTech
    this.dataQuality.push({
      id: 'DQ-D01',
      factory_id: factoryId,
      sensor_name: 'Feeder Vacuum Pressure Sensor Bus',
      machine_id: 'PRM-SMT-01',
      uptime_percentage: 97.5,
      data_completeness_pct: 96.2,
      latency_ms: 35,
      anomalies_detected: 4,
      status: 'Degraded',
      last_sync: '30 seconds ago'
    });
  }

  // --- SEED FACTORY E: Orion Industrial Works (FAC-005) ---
  private seedFactoryE() {
    const factoryId = 'FAC-005';
    const lines = ['Heavy Forging Line', 'Precision Machining Line'];
    const operators = ['Kuppuswamy R.', 'Dhandapani M.', 'Palanisamy V.'];

    // 12 Machines
    const machineTypes = [
      { prefix: 'ORN-FRG', type: 'Hydraulic Open-Die Forging Press 2000T', count: 4, line: lines[0] },
      { prefix: 'ORN-TRN', type: 'Heavy Vertical Boring Mill', count: 4, line: lines[1] },
      { prefix: 'ORN-PLN', type: 'Double-Housing Planer Mill', count: 2, line: lines[1] },
      { prefix: 'ORN-QC', type: 'Ultrasonic Flaw Detector & CMM', count: 2, line: lines[1] }
    ];

    let mIdx = 1;
    for (const group of machineTypes) {
      for (let i = 1; i <= group.count; i++) {
        const machineId = `${group.prefix}-${String(i).padStart(2, '0')}`;
        let status: Machine['status'] = 'running';
        let health = 86 - (mIdx % 5);
        let oee = 86.0 + ((mIdx * 2) % 4);

        if (mIdx === 3) {
          status = 'warning';
          health = 74;
          oee = 79.5;
        } else if (mIdx === 12) {
          status = 'maintenance';
          health = 55;
          oee = 0;
        }

        this.machines.push({
          id: `M-E${mIdx}`,
          factory_id: factoryId,
          machine_id: machineId,
          name: `${group.type} #${i}`,
          type: group.type,
          line: group.line,
          status,
          health_score: health,
          temperature_c: Math.round((70 + (mIdx % 12)) * 10) / 10,
          vibration_mms: 3.2,
          pressure_bar: 8.5,
          speed_rpm: 650,
          oee: Math.round(oee * 10) / 10,
          operator: operators[(mIdx - 1) % operators.length],
          install_date: '2016-11-20',
          last_service_date: '2026-09-05'
        });
        mIdx++;
      }
    }

    // Incidents for Orion
    this.incidents.push({
      id: 'INC-E01',
      incident_id: 'INC-2026-0509',
      factory_id: factoryId,
      machine_id: 'ORN-FRG-02',
      title: 'Forging Ram Guide Rail Thermal Expansion Alert',
      description: 'Lube oil temperature elevated to 68°C; thermal sensor triggered yellow caution.',
      severity: 'High',
      status: 'Open',
      reported_by: 'Kuppuswamy R.',
      reported_at: '2026-10-06T03:00:00Z'
    });

    // Work Orders for Orion
    this.workOrders.push({
      id: 'WO-E01',
      work_order_id: 'WO-2026-0811',
      factory_id: factoryId,
      machine_id: 'ORN-FRG-02',
      title: 'Oil Heat Exchanger Descaling & Flow Check',
      priority: 'High',
      status: 'Pending',
      assigned_to: 'N. Muthusamy',
      due_date: '2026-10-07',
      created_at: '2026-10-06T03:10:00Z',
      estimated_hours: 4.0
    });

    // Maintenance for Orion
    this.maintenance.push({
      id: 'MNT-E01',
      factory_id: factoryId,
      machine_id: 'ORN-TRN-01',
      type: 'Predictive',
      status: 'Completed',
      scheduled_date: '2026-09-25',
      completed_date: '2026-09-25',
      technician: 'N. Muthusamy',
      description: 'Hydrostatic table pocket pressure balancing and gib readjustment.',
      cost_usd: 1400,
      downtime_hours: 5.0
    });

    // SOPs for Orion
    this.sops.push({
      id: 'SOP-E01',
      sop_id: 'SOP-FRG-501',
      factory_id: factoryId,
      title: '2000T Forging Press Die Preheat and Hydraulic Balancing',
      machine_type: 'Hydraulic Open-Die Forging Press 2000T',
      category: 'Safety Protocol',
      version: 'v2.2',
      last_updated: '2026-07-30',
      author: 'Heavy Forge Superintendent',
      steps: [
        'Preheat die blocks with radiant gas heaters to 220°C before striking.',
        'Confirm hydraulic accumulator bank charge pressure at 280 bar.',
        'Cycle ram in inching mode to verify slide gib clearance.'
      ],
      safety_precautions: [
        'Full heat-reflective apron, Kevlar arm guards, and face shield required.',
        'Never stand in front of anvil opening during upset stroke.'
      ],
      target_audience: 'Forge Operators'
    });

    // Data Quality for Orion
    this.dataQuality.push({
      id: 'DQ-E01',
      factory_id: factoryId,
      sensor_name: 'Hydraulic Pressure & Thermal Transducer Bus',
      machine_id: 'ORN-FRG-01',
      uptime_percentage: 98.9,
      data_completeness_pct: 98.1,
      latency_ms: 28,
      anomalies_detected: 1,
      status: 'Healthy',
      last_sync: '20 seconds ago'
    });
  }

  // --- KPI Calculation Engine (Dynamic from Data) ---
  public calculateFactoryKPIs(factoryId: string): FactoryKPIs {
    const factory = this.factories.find(f => f.id === factoryId);
    const machines = this.machines.filter(m => m.factory_id === factoryId);
    const incidents = this.incidents.filter(i => i.factory_id === factoryId);
    const workOrders = this.workOrders.filter(w => w.factory_id === factoryId);
    const maintenance = this.maintenance.filter(m => m.factory_id === factoryId);
    const production = this.production.filter(p => p.factory_id === factoryId);

    const totalMachines = machines.length;
    const runningMachines = machines.filter(m => m.status === 'running').length;
    const warningMachines = machines.filter(m => m.status === 'warning').length;
    const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;
    const offlineMachines = machines.filter(m => m.status === 'offline').length;

    // Calculate dynamic OEE: average of running & warning machines
    const activeMachinesWithOee = machines.filter(m => m.status !== 'offline' && m.status !== 'maintenance');
    const avgOee = activeMachinesWithOee.length > 0
      ? activeMachinesWithOee.reduce((sum, m) => sum + m.oee, 0) / activeMachinesWithOee.length
      : 85.0;

    const avgHealth = machines.length > 0
      ? machines.reduce((sum, m) => sum + m.health_score, 0) / machines.length
      : 80.0;

    // Production calculation
    const totalProd = production.reduce((sum, p) => sum + (p.actual_units || 0), 0);
    const targetProd = production.reduce((sum, p) => sum + (p.planned_units ?? p.target_units ?? 0), 0);
    const defectiveProd = production.reduce((sum, p) => sum + (p.defect_units ?? p.defective_units ?? 0), 0);
    const defectRate = totalProd > 0 ? (defectiveProd / totalProd) * 100 : 1.2;

    const downtimeHours = maintenance.reduce((sum, m) => sum + (m.downtime_hours || (m.downtime_minutes ? m.downtime_minutes / 60 : 0)), 0);
    const activeIncidents = incidents.filter(i => i.status === 'Open' || i.status === 'Investigating').length;
    const criticalIncidents = incidents.filter(i => (i.status === 'Open' || i.status === 'Investigating') && (i.severity === 'Critical' || i.severity === 'High')).length;
    const openWorkOrders = workOrders.filter(w => w.status === 'Pending' || w.status === 'In Progress').length;
    const pendingMaintenance = maintenance.filter(m => m.status === 'Scheduled' || m.status === 'In Progress').length;

    // Standard OEE components
    const availability = Math.min(98.5, Math.max(75, 100 - (maintenanceMachines * 4.5) - (warningMachines * 1.5)));
    const quality = Math.min(99.8, Math.max(90, 100 - defectRate));
    const performance = Math.min(99.0, Math.max(80, (avgOee / (availability * quality / 10000))));

    return {
      factory_id: factoryId,
      factory_name: factory?.name || 'Unknown Factory',
      total_machines: totalMachines,
      running_machines: runningMachines,
      warning_machines: warningMachines,
      maintenance_machines: maintenanceMachines,
      offline_machines: offlineMachines,
      oee: Math.round(avgOee * 10) / 10,
      availability: Math.round(availability * 10) / 10,
      performance: Math.round(performance * 10) / 10,
      quality: Math.round(quality * 10) / 10,
      total_production_units: totalProd > 0 ? totalProd : 28400,
      target_production_units: targetProd > 0 ? targetProd : 30000,
      defective_units: defectiveProd > 0 ? defectiveProd : 290,
      defect_rate_pct: Math.round(defectRate * 100) / 100,
      downtime_hours: Math.round(downtimeHours * 10) / 10,
      active_incidents: activeIncidents,
      critical_incidents: criticalIncidents,
      open_work_orders: openWorkOrders,
      pending_maintenance: pendingMaintenance,
      avg_health_score: Math.round(avgHealth * 10) / 10
    };
  }

  // --- Super Admin Overview ---
  public getSuperAdminOverview(): SuperAdminOverview {
    const factoriesWithKpis = this.factories.map(f => {
      const kpis = this.calculateFactoryKPIs(f.id);
      return {
        ...f,
        machine_count: kpis.total_machines,
        running_count: kpis.running_machines,
        oee: kpis.oee,
        active_incidents: kpis.active_incidents,
        open_work_orders: kpis.open_work_orders,
        kpis
      };
    });

    const totalMachines = factoriesWithKpis.reduce((acc, f) => acc + f.kpis.total_machines, 0);
    const totalProduction = factoriesWithKpis.reduce((acc, f) => acc + f.kpis.total_production_units, 0);
    const activeIncidents = factoriesWithKpis.reduce((acc, f) => acc + f.kpis.active_incidents, 0);
    const openWorkOrders = factoriesWithKpis.reduce((acc, f) => acc + f.kpis.open_work_orders, 0);
    const overallOee = factoriesWithKpis.reduce((acc, f) => acc + f.kpis.oee, 0) / factoriesWithKpis.length;
    const overallHealth = factoriesWithKpis.reduce((acc, f) => acc + f.kpis.avg_health_score, 0) / factoriesWithKpis.length;

    return {
      total_factories: this.factories.length,
      active_factories: this.factories.filter(f => f.status === 'Operational').length,
      total_users: this.users.length,
      total_machines: totalMachines,
      total_production: totalProduction,
      active_incidents: activeIncidents,
      open_work_orders: openWorkOrders,
      overall_oee: Math.round(overallOee * 10) / 10,
      overall_health: Math.round(overallHealth * 10) / 10,
      factories: factoriesWithKpis
    };
  }

  // --- Data Access with Strict Factory Isolation ---
  public getMachinesForFactory(factoryId: string): Machine[] {
    return this.machines.filter(m => m.factory_id === factoryId);
  }

  public getProductionForFactory(factoryId: string): ProductionRecord[] {
    return this.production.filter(p => p.factory_id === factoryId);
  }

  public getMaintenanceForFactory(factoryId: string): MaintenanceRecord[] {
    return this.maintenance.filter(m => m.factory_id === factoryId);
  }

  public getIncidentsForFactory(factoryId: string): Incident[] {
    return this.incidents.filter(i => i.factory_id === factoryId);
  }

  public getWorkOrdersForFactory(factoryId: string): WorkOrder[] {
    return this.workOrders.filter(w => w.factory_id === factoryId);
  }

  public getSOPsForFactory(factoryId: string): SOP[] {
    return this.sops.filter(s => s.factory_id === factoryId);
  }

  public getDataQualityForFactory(factoryId: string): DataQualityMetric[] {
    return this.dataQuality.filter(d => d.factory_id === factoryId);
  }

  // --- TECHNICIAN MANAGEMENT & RESOLUTION METHODS ---
  public ensureTechnicianUsers() {
    const techUsersToEnsure = [
      {
        id: 'USR-018',
        name: 'Vikram Singh (Automation & Robotics Tech)',
        email: 'tech.robotics@factoryops.com',
        role: 'TECHNICIAN' as const,
        factory_id: 'FAC-001',
        factory_name: 'Apex Precision Manufacturing'
      },
      {
        id: 'USR-019',
        name: 'Rajesh Menon (Hydraulics & Pneumatics Tech)',
        email: 'tech.hydraulics@factoryops.com',
        role: 'TECHNICIAN' as const,
        factory_id: 'FAC-001',
        factory_name: 'Apex Precision Manufacturing'
      },
      {
        id: 'USR-020',
        name: 'Sunita Rao (Instrumentation & Controls Tech)',
        email: 'tech.instruments@factoryops.com',
        role: 'TECHNICIAN' as const,
        factory_id: 'FAC-001',
        factory_name: 'Apex Precision Manufacturing'
      }
    ];

    for (const u of techUsersToEnsure) {
      if (!this.users.some(existing => existing.id === u.id || existing.email === u.email)) {
        const salt = generateSalt();
        const hash = hashPassword('Tech@123', salt);
        this.users.push({
          id: u.id,
          name: u.name,
          email: u.email,
          password_hash: hash,
          salt,
          role: u.role,
          factory_id: u.factory_id,
          factory_name: u.factory_name,
          status: 'active',
          created_at: new Date().toISOString()
        });
      }
    }
  }

  public seedTechnicianProfiles() {
    this.technicianProfiles = [
      {
        id: 'TECH-001',
        user_id: 'USR-012',
        name: 'Ramesh Varma',
        email: 'tech.apex@factoryops.com',
        specialisation: 'Mechanical Technician',
        secondary_specialisations: ['CNC Technician'],
        technical_skills: [
          'Spindle Alignment',
          'Bearing Replacement',
          'Vibration Analysis',
          'Gearbox Overhaul',
          'Precision Machining',
          'Dial Indicator Calibration'
        ],
        experience_years: 9,
        assigned_factory_id: 'FAC-001',
        assigned_factory_name: 'Apex Precision Manufacturing',
        availability_status: 'AVAILABLE',
        current_workload: 1,
        active_assignments_count: 1,
        max_concurrent_assignments: 3,
        certifications: ['ISO 18436 Vibration Cat II', 'SKF Certified Maintenance Specialist'],
        shift: 'Morning (06:00 - 14:00)',
        phone: '+91 98490 12012',
        rating: 4.9,
        completed_repairs_count: 87,
        created_at: '2024-01-10T08:00:00Z',
        updated_at: new Date().toISOString()
      },
      {
        id: 'TECH-002',
        user_id: 'USR-013',
        name: 'Anil Sharma',
        email: 'tech.nova@factoryops.com',
        specialisation: 'Electrical Technician',
        secondary_specialisations: ['Instrumentation Technician'],
        technical_skills: [
          'PLC Diagnostics',
          'VFD Configuration',
          'Control Panel Wiring',
          'Thermal Imaging',
          'Power Distribution 415V',
          'Relay Logic'
        ],
        experience_years: 7,
        assigned_factory_id: 'FAC-001',
        assigned_factory_name: 'Apex Precision Manufacturing',
        availability_status: 'AVAILABLE',
        current_workload: 1,
        active_assignments_count: 1,
        max_concurrent_assignments: 3,
        certifications: ['Certified Electrical Safety Worker (NFPA 70E)', 'Siemens S7-1200 Certified'],
        shift: 'General (09:00 - 17:30)',
        phone: '+91 98490 12013',
        rating: 4.8,
        completed_repairs_count: 64,
        created_at: '2024-02-15T08:00:00Z',
        updated_at: new Date().toISOString()
      },
      {
        id: 'TECH-003',
        user_id: 'USR-014',
        name: 'Praveen Nair',
        email: 'tech.vertex@factoryops.com',
        specialisation: 'CNC Technician',
        secondary_specialisations: ['Mechanical Technician'],
        technical_skills: [
          'Fanuc 31i Diagnostics',
          'Ballscrew Backlash Calibration',
          'Tool Changer Alignment',
          'G-Code Optimization',
          'Linear Guide Rail Replacement'
        ],
        experience_years: 6,
        assigned_factory_id: 'FAC-001',
        assigned_factory_name: 'Apex Precision Manufacturing',
        availability_status: 'BUSY',
        current_workload: 2,
        active_assignments_count: 2,
        max_concurrent_assignments: 2,
        certifications: ['Fanuc Certified Maintenance Specialist', 'Heidenhain Linear Encoders'],
        shift: 'Afternoon (14:00 - 22:00)',
        phone: '+91 98490 12014',
        rating: 4.7,
        completed_repairs_count: 53,
        created_at: '2024-03-01T08:00:00Z',
        updated_at: new Date().toISOString()
      },
      {
        id: 'TECH-004',
        user_id: 'USR-018',
        name: 'Vikram Singh',
        email: 'tech.robotics@factoryops.com',
        specialisation: 'Automation & Robotics Technician',
        secondary_specialisations: ['Electrical Technician'],
        technical_skills: [
          'KUKA KRC4 Programming',
          'ABB IRC5 Calibration',
          'EOAT Pneumatics',
          'Safety Interlock Wiring',
          'Servo Drive Tuning',
          'Industrial Ethernet'
        ],
        experience_years: 8,
        assigned_factory_id: 'FAC-001',
        assigned_factory_name: 'Apex Precision Manufacturing',
        availability_status: 'AVAILABLE',
        current_workload: 1,
        active_assignments_count: 1,
        max_concurrent_assignments: 3,
        certifications: ['KUKA System Integrator Certified', 'FANUC Robotics Core Operations'],
        shift: 'Morning (06:00 - 14:00)',
        phone: '+91 98490 12018',
        rating: 4.9,
        completed_repairs_count: 72,
        created_at: '2024-04-10T08:00:00Z',
        updated_at: new Date().toISOString()
      },
      {
        id: 'TECH-005',
        user_id: 'USR-019',
        name: 'Rajesh Menon',
        email: 'tech.hydraulics@factoryops.com',
        specialisation: 'Hydraulic & Pneumatic Technician',
        secondary_specialisations: ['Mechanical Technician'],
        technical_skills: [
          'Proportional Valve Calibration',
          'Accumulator Charging',
          'High-Pressure Hose Crimp',
          'Pneumatic Manifold Troubleshooting',
          'Oil Contamination Testing',
          'Hydrostatic Pressure Testing'
        ],
        experience_years: 11,
        assigned_factory_id: 'FAC-001',
        assigned_factory_name: 'Apex Precision Manufacturing',
        availability_status: 'AVAILABLE',
        current_workload: 1,
        active_assignments_count: 1,
        max_concurrent_assignments: 3,
        certifications: ['IFPS Certified Hydraulic Specialist', 'Parker Fluid Power Cert'],
        shift: 'General (09:00 - 17:30)',
        phone: '+91 98490 12019',
        rating: 4.95,
        completed_repairs_count: 115,
        created_at: '2024-01-05T08:00:00Z',
        updated_at: new Date().toISOString()
      },
      {
        id: 'TECH-006',
        user_id: 'USR-020',
        name: 'Sunita Rao',
        email: 'tech.instruments@factoryops.com',
        specialisation: 'Instrumentation Technician',
        secondary_specialisations: ['Electrical Technician'],
        technical_skills: [
          '4-20mA Loop Calibration',
          'RTD & Thermocouple Verification',
          'Flowmeter Tuning',
          'SCADA I/O Mapping',
          'Pressure Transmitter Calibration',
          'PID Loop Tuning'
        ],
        experience_years: 5,
        assigned_factory_id: 'FAC-001',
        assigned_factory_name: 'Apex Precision Manufacturing',
        availability_status: 'AVAILABLE',
        current_workload: 0,
        active_assignments_count: 0,
        max_concurrent_assignments: 3,
        certifications: ['ISA Certified Control Systems Technician (CCST)', 'Yokogawa Instrumentation'],
        shift: 'General (09:00 - 17:30)',
        phone: '+91 98490 12020',
        rating: 4.85,
        completed_repairs_count: 48,
        created_at: '2024-05-12T08:00:00Z',
        updated_at: new Date().toISOString()
      }
    ];
  }

  public seedTechnicianAssignments() {
    this.technicianAssignments = [
      {
        id: 'ASN-2026-001',
        incident_id: 'INC-0001',
        incident_title: 'Spindle Bearing Thermal Runaway & Excessive Vibration',
        incident_description: 'High frequency harmonic chatter and 4.8 mm/s RMS vibration detected on CNC Milling spindle axis.',
        machine_id: 'M001',
        machine_name: 'Apex 5-Axis CNC Machining Center 01',
        machine_code: 'APX-CNC-01',
        machine_location: 'Bay 1 - Heavy Machining',
        factory_id: 'FAC-001',
        factory_name: 'Apex Precision Manufacturing',
        technician_id: 'USR-012',
        technician_name: 'Ramesh Varma',
        technician_email: 'tech.apex@factoryops.com',
        technician_specialisation: 'Mechanical Technician',
        status: 'IN PROGRESS',
        priority: 'High',
        assigned_date: '2026-10-30T09:00:00Z',
        due_date: '2026-11-01T18:00:00Z',
        is_overdue: false,
        assigned_by_id: 'USR-007',
        assigned_by_name: 'Amit Deshmukh (Manager/Supervisor)',
        assigned_by_role: 'MANAGER_SUPERVISOR',
        accepted_at: '2026-10-30T09:18:22Z',
        repair_started_at: '2026-10-30T10:15:00Z',
        repair_progress_percent: 50,
        repair_notes: 'Initial inspection confirmed cage wear on rear tandem bearing. Spindle disassembled and cleaned.',
        identified_issue: 'Excessive spindle bearing vibration and temperature rising above 78°C',
        root_cause_analysis: 'High radial preload caused thermal breakdown of lubricant and micro-spalling on inner race',
        recommended_resolution: 'Extract ceramic hybrid bearing set SKF-7014, check shaft runout, re-seat with precision spacer',
        required_tools: ['Spindle Puller Set', 'Dial Test Indicator (0.001mm)', 'Torque Wrench 40Nm', 'Bearing Induction Heater'],
        spare_parts_required: [
          {
            part_id: 'PRT-1001',
            part_number: 'SKF-7014-ACD',
            part_name: 'Spindle High-Precision Ceramic Bearing',
            quantity: 2,
            is_in_stock: true,
            status: 'Reserved'
          }
        ],
        estimated_repair_hours: 3.5,
        ai_recommendation_details: {
          match_score: 96,
          reasoning: 'Ramesh Varma has 9 years of mechanical experience, ISO vibration certification, and direct spindle bearing expertise.',
          required_specialisation: 'Mechanical Technician',
          matched_skills: ['Spindle Alignment', 'Bearing Replacement', 'Vibration Analysis']
        },
        progress_updates: [
          {
            id: 'UPD-001',
            timestamp: '2026-10-30T10:30:00Z',
            progress_percent: 25,
            diagnosis_notes: 'Spindle casing opened. Confirmed bearing race scoring.',
            additional_problems_found: 'Minor lubrication line buildup cleared with solvent flush.',
            updated_by_id: 'USR-012',
            updated_by_name: 'Ramesh Varma'
          },
          {
            id: 'UPD-002',
            timestamp: '2026-10-30T13:45:00Z',
            progress_percent: 50,
            diagnosis_notes: 'Defective bearing extracted cleanly without shaft scoring. Preparing new bearing install.',
            updated_by_id: 'USR-012',
            updated_by_name: 'Ramesh Varma'
          }
        ],
        history: [
          {
            timestamp: '2026-10-30T09:00:00Z',
            action: 'ASSIGNED',
            performed_by_id: 'USR-007',
            performed_by_name: 'Amit Deshmukh',
            performed_by_role: 'MANAGER_SUPERVISOR',
            notes: 'AI recommendation approved by manager Amit Deshmukh.'
          },
          {
            timestamp: '2026-10-30T09:18:22Z',
            action: 'ACCEPTED',
            performed_by_id: 'USR-012',
            performed_by_name: 'Ramesh Varma',
            performed_by_role: 'TECHNICIAN',
            notes: 'Technician accepted assignment and scheduled bay arrival.'
          },
          {
            timestamp: '2026-10-30T10:15:00Z',
            action: 'STARTED_REPAIR',
            performed_by_id: 'USR-012',
            performed_by_name: 'Ramesh Varma',
            performed_by_role: 'TECHNICIAN',
            notes: 'LOTO applied and repair initiated.'
          }
        ],
        created_at: '2026-10-30T09:00:00Z',
        updated_at: '2026-10-30T13:45:00Z'
      },
      {
        id: 'ASN-2026-002',
        incident_id: 'INC-0073',
        incident_title: 'Seal Micro-Extrusion & Hydraulic Tonnage Loss',
        incident_description: 'Hydraulic ram cylinder oil weeping and pressure decay from 220 bar to 165 bar during full stroke clamping.',
        machine_id: 'M007',
        machine_name: 'Hydraulic Stamping Press 01',
        machine_code: 'APX-PRS-01',
        machine_location: 'Bay 3 - Stamping & Forming',
        factory_id: 'FAC-001',
        factory_name: 'Apex Precision Manufacturing',
        technician_id: 'USR-019',
        technician_name: 'Rajesh Menon',
        technician_email: 'tech.hydraulics@factoryops.com',
        technician_specialisation: 'Hydraulic & Pneumatic Technician',
        status: 'RESOLVED_PENDING_VERIFICATION',
        priority: 'High',
        assigned_date: '2026-10-29T10:00:00Z',
        due_date: '2026-10-30T18:00:00Z',
        is_overdue: false,
        assigned_by_id: 'USR-007',
        assigned_by_name: 'Amit Deshmukh (Manager/Supervisor)',
        assigned_by_role: 'MANAGER_SUPERVISOR',
        accepted_at: '2026-10-29T10:12:00Z',
        repair_started_at: '2026-10-29T11:00:00Z',
        resolved_at: '2026-10-30T15:30:00Z',
        repair_progress_percent: 100,
        identified_issue: 'Hydraulic ram oil seal degradation and pressure droop during 120-ton cycle',
        root_cause_analysis: 'Thermal fatigue of primary polyurethane chevron seal due to contaminated fluid particulate spike',
        recommended_resolution: 'Depressurize accumulator, replace valve block seal kit VTN-OR-K50, filter fluid, bleed air',
        required_tools: ['Hydraulic Pressure Gauge Kit (0-400 Bar)', 'Spanner Set 32mm', 'Fluid Bleed Hose'],
        spare_parts_required: [
          {
            part_id: 'PRT-1002',
            part_number: 'VTN-OR-K50',
            part_name: 'Hydraulic Valve Block Viton O-Ring Seal Kit',
            quantity: 1,
            is_in_stock: true,
            status: 'Used'
          }
        ],
        estimated_repair_hours: 4.0,
        ai_recommendation_details: {
          match_score: 98,
          reasoning: 'Rajesh Menon has 11 years experience as IFPS certified fluid power specialist, perfect match for high pressure hydraulics.',
          required_specialisation: 'Hydraulic & Pneumatic Technician',
          matched_skills: ['Proportional Valve Calibration', 'High-Pressure Hose Crimp', 'Pneumatic Manifold Troubleshooting']
        },
        resolution_submission: {
          confirmed_root_cause: 'Particulate contamination caused abrasion and micro-extrusion of main ram cylinder wiper seal and valve block O-ring.',
          actions_taken: 'Replaced primary Viton O-ring seal kit VTN-OR-K50, executed 10-micron oil filtration loop, bled air from valve manifold, and calibrated system to 220 bar.',
          parts_used: [
            {
              part_id: 'PRT-1002',
              part_number: 'VTN-OR-K50',
              part_name: 'Hydraulic Valve Block Viton O-Ring Seal Kit',
              quantity: 1
            }
          ],
          actual_repair_hours: 3.8,
          resolution_remarks: 'Hydraulic pressure test completed: 220 bar holding steady under 10 continuous load cycles with zero leakage.',
          submitted_at: '2026-10-30T15:30:00Z'
        },
        history: [
          {
            timestamp: '2026-10-29T10:00:00Z',
            action: 'ASSIGNED',
            performed_by_id: 'USR-007',
            performed_by_name: 'Amit Deshmukh',
            performed_by_role: 'MANAGER_SUPERVISOR',
            notes: 'High priority hydraulic incident assigned.'
          },
          {
            timestamp: '2026-10-29T10:12:00Z',
            action: 'ACCEPTED',
            performed_by_id: 'USR-019',
            performed_by_name: 'Rajesh Menon',
            performed_by_role: 'TECHNICIAN'
          },
          {
            timestamp: '2026-10-29T11:00:00Z',
            action: 'STARTED_REPAIR',
            performed_by_id: 'USR-019',
            performed_by_name: 'Rajesh Menon',
            performed_by_role: 'TECHNICIAN'
          },
          {
            timestamp: '2026-10-30T15:30:00Z',
            action: 'MARKED_RESOLVED',
            performed_by_id: 'USR-019',
            performed_by_name: 'Rajesh Menon',
            performed_by_role: 'TECHNICIAN',
            notes: 'Submitted for manager sign-off and verification.'
          }
        ],
        created_at: '2026-10-29T10:00:00Z',
        updated_at: '2026-10-30T15:30:00Z'
      },
      {
        id: 'ASN-2026-003',
        incident_id: 'INC-0013',
        incident_title: 'MIG Welder Robotic Arm Axis 4 Servo Position Jitter',
        incident_description: 'Positional tracking error 0.6mm on Wrist Axis 4 during seam welding of chassis sub-frame.',
        machine_id: 'M013',
        machine_name: 'Robotic MIG Welding Cell 01',
        machine_code: 'APX-ROB-01',
        machine_location: 'Bay 2 - Robotic Assembly',
        factory_id: 'FAC-001',
        factory_name: 'Apex Precision Manufacturing',
        technician_id: 'USR-018',
        technician_name: 'Vikram Singh',
        technician_email: 'tech.robotics@factoryops.com',
        technician_specialisation: 'Automation & Robotics Technician',
        status: 'PENDING ACCEPTANCE',
        priority: 'Critical',
        assigned_date: '2026-10-28T14:00:00Z',
        due_date: '2026-10-29T18:00:00Z',
        is_overdue: true,
        assigned_by_id: 'USR-007',
        assigned_by_name: 'Amit Deshmukh (Manager/Supervisor)',
        assigned_by_role: 'MANAGER_SUPERVISOR',
        repair_progress_percent: 0,
        identified_issue: 'Wrist Axis 4 servo driver tracking variance > 0.5mm causing rough weld bead profile',
        root_cause_analysis: 'Optical resolver cable shielding abrasion and high electrical noise from high frequency arc stabilizer',
        recommended_resolution: 'Replace resolver cable harness, verify ferrite chokes on 400V drive leads, recalibrate axis home offset',
        required_tools: ['KUKA SmartPAD Teach Pendant', 'Oscilloscope Fluke 190', 'Hex Calibration Pin Set'],
        spare_parts_required: [
          {
            part_id: 'PRT-1003',
            part_number: 'TCH-TIP-12M',
            part_name: 'MIG Welding Torch Heavy Duty Contact Tip 1.2mm',
            quantity: 4,
            is_in_stock: true,
            status: 'Reserved'
          }
        ],
        estimated_repair_hours: 3.0,
        ai_recommendation_details: {
          match_score: 95,
          reasoning: 'Vikram Singh is a certified KUKA robotics specialist with deep experience in robotic wrist kinematics and servo tuning.',
          required_specialisation: 'Automation & Robotics Technician',
          matched_skills: ['KUKA KRC4 Programming', 'Servo Drive Tuning', 'Safety Interlock Wiring']
        },
        history: [
          {
            timestamp: '2026-10-28T14:00:00Z',
            action: 'ASSIGNED',
            performed_by_id: 'USR-007',
            performed_by_name: 'Amit Deshmukh',
            performed_by_role: 'MANAGER_SUPERVISOR',
            notes: 'Critical robotic cell downtime assignment.'
          }
        ],
        created_at: '2026-10-28T14:00:00Z',
        updated_at: '2026-10-28T14:00:00Z'
      },
      {
        id: 'ASN-2026-004',
        incident_id: 'INC-0083',
        incident_title: 'VFD Over-Torque Trip on Drive Shaft Conveyor',
        incident_description: 'ABB ACS880 drive tripped on error 3210 (Overcurrent) during high acceleration step.',
        machine_id: 'M005',
        machine_name: 'Shaft Induction Hardening Unit 01',
        machine_code: 'APX-IND-01',
        machine_location: 'Bay 1 - Thermal Treatment',
        factory_id: 'FAC-001',
        factory_name: 'Apex Precision Manufacturing',
        technician_id: 'USR-013',
        technician_name: 'Anil Sharma',
        technician_email: 'tech.nova@factoryops.com',
        technician_specialisation: 'Electrical Technician',
        status: 'PENDING ACCEPTANCE',
        priority: 'Medium',
        assigned_date: '2026-10-30T11:00:00Z',
        due_date: '2026-10-31T20:00:00Z',
        is_overdue: false,
        assigned_by_id: 'USR-007',
        assigned_by_name: 'Amit Deshmukh (Manager/Supervisor)',
        assigned_by_role: 'MANAGER_SUPERVISOR',
        repair_progress_percent: 0,
        identified_issue: 'Intermittent VFD trip under mechanical load transients',
        root_cause_analysis: 'Motor thermal resistance shift and current loop gain parameter too aggressive for winter ambient',
        recommended_resolution: 'Run motor ID run, adjust acceleration ramp from 1.8s to 2.4s, inspect motor terminal box for moisture',
        required_tools: ['Fluke 87V Industrial Multimeter', 'Insulated Screwdriver Set 1000V', 'Megger Insulation Tester'],
        spare_parts_required: [],
        estimated_repair_hours: 2.0,
        ai_recommendation_details: {
          match_score: 92,
          reasoning: 'Anil Sharma is skilled in VFD parameter optimization, motor protection relays, and 415V electrical panels.',
          required_specialisation: 'Electrical Technician',
          matched_skills: ['VFD Configuration', 'PLC Diagnostics', 'Thermal Imaging']
        },
        history: [
          {
            timestamp: '2026-10-30T11:00:00Z',
            action: 'ASSIGNED',
            performed_by_id: 'USR-007',
            performed_by_name: 'Amit Deshmukh',
            performed_by_role: 'MANAGER_SUPERVISOR',
            notes: 'Medium severity electrical drive troubleshooting assigned.'
          }
        ],
        created_at: '2026-10-30T11:00:00Z',
        updated_at: '2026-10-30T11:00:00Z'
      },
      {
        id: 'ASN-2026-005',
        incident_id: 'INC-0021',
        incident_title: 'Secondary Spindle Runout Deviation on Milling Center',
        incident_description: 'Excessive spindle axial runout > 8 microns measured on finish cut stage.',
        machine_id: 'M001',
        machine_name: 'Apex 5-Axis CNC Machining Center 01',
        machine_code: 'APX-CNC-01',
        machine_location: 'Bay 1 - Heavy Machining',
        factory_id: 'FAC-001',
        factory_name: 'Apex Precision Manufacturing',
        technician_id: 'USR-012',
        technician_name: 'Ramesh Varma',
        technician_email: 'tech.apex@factoryops.com',
        technician_specialisation: 'Mechanical Technician',
        status: 'PENDING ACCEPTANCE',
        priority: 'High',
        assigned_date: '2026-10-31T08:00:00Z',
        due_date: '2026-11-02T18:00:00Z',
        is_overdue: false,
        assigned_by_id: 'USR-007',
        assigned_by_name: 'Amit Deshmukh (Manager/Supervisor)',
        assigned_by_role: 'MANAGER_SUPERVISOR',
        repair_progress_percent: 0,
        identified_issue: 'Secondary spindle taper contamination causing tool holder runout',
        root_cause_analysis: 'Debris accumulation on BT40 taper contact face',
        recommended_resolution: 'Clean spindle taper with cleaning arbor, verify drawbar clamping force',
        required_tools: ['Taper Cleaning Stick', 'Clamping Force Gauge', 'Dial Indicator (0.001mm)'],
        spare_parts_required: [],
        estimated_repair_hours: 1.5,
        ai_recommendation_details: {
          match_score: 94,
          reasoning: 'Ramesh Varma is primary mechanical technician for Apex Bay 1.',
          required_specialisation: 'Mechanical Technician',
          matched_skills: ['Spindle Alignment', 'Precision Machining']
        },
        history: [
          {
            timestamp: '2026-10-31T08:00:00Z',
            action: 'ASSIGNED',
            performed_by_id: 'USR-007',
            performed_by_name: 'Amit Deshmukh',
            performed_by_role: 'MANAGER_SUPERVISOR',
            notes: 'Assigned for immediate taper inspection and runout verification.'
          }
        ],
        created_at: '2026-10-31T08:00:00Z',
        updated_at: '2026-10-31T08:00:00Z'
      }
    ];
  }

  public getTechnicianProfiles(factoryId: string = 'FAC-001'): TechnicianProfile[] {
    return this.technicianProfiles.filter(p => !p.assigned_factory_id || p.assigned_factory_id === factoryId);
  }

  public getTechnicianProfile(technicianId: string): TechnicianProfile | undefined {
    return this.technicianProfiles.find(p => p.id === technicianId || p.user_id === technicianId);
  }

  public updateTechnicianProfile(technicianId: string, updates: Partial<TechnicianProfile>): TechnicianProfile | undefined {
    const idx = this.technicianProfiles.findIndex(p => p.id === technicianId || p.user_id === technicianId);
    if (idx === -1) return undefined;
    this.technicianProfiles[idx] = {
      ...this.technicianProfiles[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.persist();
    return this.technicianProfiles[idx];
  }

  public getTechnicianAssignments(filter?: {
    technician_id?: string;
    factory_id?: string;
    status?: string;
  }): TechnicianIncidentAssignment[] {
    let list = this.technicianAssignments;
    if (filter?.factory_id) {
      list = list.filter(a => a.factory_id === filter.factory_id);
    }
    if (filter?.technician_id) {
      list = list.filter(a => a.technician_id === filter.technician_id);
    }
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter(a => a.status === filter.status);
    }

    // Refresh dynamic overdue status
    const now = new Date().getTime();
    return list.map(item => {
      const isPastDue = item.due_date ? new Date(item.due_date).getTime() < now : false;
      const isCompleted = item.status === 'VERIFIED' || item.status === 'CLOSED';
      return {
        ...item,
        is_overdue: isPastDue && !isCompleted
      };
    });
  }

  public getTechnicianAssignment(id: string): TechnicianIncidentAssignment | undefined {
    const item = this.technicianAssignments.find(a => a.id === id);
    if (!item) return undefined;
    const now = new Date().getTime();
    const isPastDue = item.due_date ? new Date(item.due_date).getTime() < now : false;
    const isCompleted = item.status === 'VERIFIED' || item.status === 'CLOSED';
    return {
      ...item,
      is_overdue: isPastDue && !isCompleted
    };
  }

  public createTechnicianAssignment(data: Partial<TechnicianIncidentAssignment>): TechnicianIncidentAssignment {
    const newId = `ASN-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const assignment: TechnicianIncidentAssignment = {
      id: newId,
      incident_id: data.incident_id || 'INC-0001',
      incident_title: data.incident_title || 'Unscheduled Maintenance Incident',
      incident_description: data.incident_description || '',
      machine_id: data.machine_id || 'M001',
      machine_name: data.machine_name || 'Machine Unit',
      machine_code: data.machine_code,
      machine_location: data.machine_location,
      factory_id: data.factory_id || 'FAC-001',
      factory_name: data.factory_name || 'Apex Precision Manufacturing',
      technician_id: data.technician_id || 'USR-012',
      technician_name: data.technician_name || 'Ramesh Varma',
      technician_email: data.technician_email || 'technician@factoryops.com',
      technician_specialisation: data.technician_specialisation || 'Mechanical Technician',
      status: 'PENDING ACCEPTANCE',
      priority: data.priority || 'Medium',
      assigned_date: nowIso,
      due_date: data.due_date || new Date(Date.now() + 48 * 3600000).toISOString(),
      is_overdue: false,
      assigned_by_id: data.assigned_by_id || 'USR-007',
      assigned_by_name: data.assigned_by_name || 'Manager',
      assigned_by_role: data.assigned_by_role || 'MANAGER_SUPERVISOR',
      repair_progress_percent: 0,
      identified_issue: data.identified_issue || data.incident_title,
      root_cause_analysis: data.root_cause_analysis,
      recommended_resolution: data.recommended_resolution,
      required_tools: data.required_tools || [],
      spare_parts_required: data.spare_parts_required || [],
      estimated_repair_hours: data.estimated_repair_hours || 2.5,
      ai_recommendation_details: data.ai_recommendation_details,
      progress_updates: [],
      history: [
        {
          timestamp: nowIso,
          action: 'ASSIGNED',
          performed_by_id: data.assigned_by_id || 'USR-007',
          performed_by_name: data.assigned_by_name || 'Manager',
          performed_by_role: data.assigned_by_role || 'MANAGER_SUPERVISOR',
          notes: 'Incident assigned to technician'
        }
      ],
      created_at: nowIso,
      updated_at: nowIso
    };

    this.technicianAssignments.unshift(assignment);

    // Update technician profile workload
    const tech = this.technicianProfiles.find(p => p.user_id === assignment.technician_id || p.id === assignment.technician_id);
    if (tech) {
      tech.current_workload = (tech.current_workload || 0) + 1;
      tech.active_assignments_count = (tech.active_assignments_count || 0) + 1;
      if (tech.current_workload >= (tech.max_concurrent_assignments || 3)) {
        tech.availability_status = 'BUSY';
      }
    }

    this.persist();
    return assignment;
  }

  public updateTechnicianAssignment(id: string, updates: Partial<TechnicianIncidentAssignment>): TechnicianIncidentAssignment | undefined {
    const idx = this.technicianAssignments.findIndex(a => a.id === id);
    if (idx === -1) return undefined;

    const prev = this.technicianAssignments[idx];
    const prevStatus = prev.status;
    const newStatus = updates.status || prevStatus;

    // Merge updates
    const merged: TechnicianIncidentAssignment = {
      ...prev,
      ...updates,
      updated_at: new Date().toISOString()
    };

    // If new history entry provided in updates, append
    if (updates.history && Array.isArray(updates.history)) {
      merged.history = updates.history;
    }

    this.technicianAssignments[idx] = merged;

    // Recalculate technician profile counts if status changed
    if (newStatus !== prevStatus) {
      const isNowFinished = newStatus === 'CLOSED' || newStatus === 'VERIFIED' || newStatus === 'REJECTED';
      const wasFinished = prevStatus === 'CLOSED' || prevStatus === 'VERIFIED' || prevStatus === 'REJECTED';

      const tech = this.technicianProfiles.find(p => p.user_id === merged.technician_id || p.id === merged.technician_id);
      if (tech) {
        if (isNowFinished && !wasFinished) {
          tech.current_workload = Math.max(0, (tech.current_workload || 1) - 1);
          tech.active_assignments_count = Math.max(0, (tech.active_assignments_count || 1) - 1);
          if (newStatus === 'VERIFIED' || newStatus === 'CLOSED') {
            tech.completed_repairs_count = (tech.completed_repairs_count || 0) + 1;
          }
          if (tech.current_workload < (tech.max_concurrent_assignments || 3) && tech.availability_status === 'BUSY') {
            tech.availability_status = 'AVAILABLE';
          }
        } else if (!isNowFinished && wasFinished) {
          tech.current_workload = (tech.current_workload || 0) + 1;
          tech.active_assignments_count = (tech.active_assignments_count || 0) + 1;
        }
      }
    }

    this.persist();
    return merged;
  }

  // --- AI RECOMMENDATION LOGIC ---
  public recommendTechnicianForIncident(incidentId: string) {
    const incident = this.incidents.find(i => i.id === incidentId);
    const machine = incident ? this.machines.find(m => m.id === incident.machine_id) : undefined;
    const factoryId = incident?.factory_id || 'FAC-001';

    const textToAnalyze = [
      incident?.title || '',
      incident?.description || '',
      incident?.incident_type || '',
      machine?.name || '',
      machine?.machine_type || ''
    ].join(' ').toLowerCase();

    // Determine target primary specialisation and required skills
    let targetSpec: TechnicianProfile['specialisation'] = 'Mechanical Technician';
    let secondarySpec: TechnicianProfile['specialisation'] = 'CNC Technician';
    let requiredSkills: string[] = ['Spindle Alignment', 'Bearing Replacement', 'Vibration Analysis'];
    let requiredTools: string[] = ['Dial Test Indicator (0.001mm)', 'Torque Wrench 40Nm', 'Bearing Induction Heater'];
    let suggestedParts: any[] = [];
    let estHours = 3.0;

    if (textToAnalyze.includes('robot') || textToAnalyze.includes('welder') || textToAnalyze.includes('kuka') || textToAnalyze.includes('abb') || textToAnalyze.includes('servo') || textToAnalyze.includes('gripper') || textToAnalyze.includes('teach pendant')) {
      targetSpec = 'Automation & Robotics Technician';
      secondarySpec = 'Electrical Technician';
      requiredSkills = ['KUKA KRC4 Programming', 'ABB IRC5 Calibration', 'EOAT Pneumatics', 'Servo Drive Tuning'];
      requiredTools = ['KUKA SmartPAD Teach Pendant', 'Oscilloscope Fluke 190', 'Hex Calibration Pin Set'];
      suggestedParts = this.spareParts.filter(p => p.machine_compatibility?.some(c => c.includes('ROB') || c.includes('M013'))).slice(0, 2);
      estHours = 3.5;
    } else if (textToAnalyze.includes('hydraulic') || textToAnalyze.includes('pneumatic') || textToAnalyze.includes('pressure') || textToAnalyze.includes('ram') || textToAnalyze.includes('valve') || textToAnalyze.includes('oil weeping') || textToAnalyze.includes('leak') || textToAnalyze.includes('cylinder') || textToAnalyze.includes('tonnage')) {
      targetSpec = 'Hydraulic & Pneumatic Technician';
      secondarySpec = 'Mechanical Technician';
      requiredSkills = ['Proportional Valve Calibration', 'Accumulator Charging', 'High-Pressure Hose Crimp', 'Pneumatic Manifold Troubleshooting'];
      requiredTools = ['Hydraulic Pressure Gauge Kit (0-400 Bar)', 'Spanner Set 32mm', 'Fluid Bleed Hose'];
      suggestedParts = this.spareParts.filter(p => p.category === 'Hydraulics' || p.machine_compatibility?.some(c => c.includes('PRS') || c.includes('M007'))).slice(0, 2);
      estHours = 4.0;
    } else if (textToAnalyze.includes('cnc') || textToAnalyze.includes('spindle') || textToAnalyze.includes('grinder') || textToAnalyze.includes('chatter') || textToAnalyze.includes('backlash') || textToAnalyze.includes('milling') || textToAnalyze.includes('lathe') || textToAnalyze.includes('g-code')) {
      targetSpec = 'CNC Technician';
      secondarySpec = 'Mechanical Technician';
      requiredSkills = ['Fanuc 31i Diagnostics', 'Ballscrew Backlash Calibration', 'Tool Changer Alignment', 'G-Code Optimization'];
      requiredTools = ['Dial Test Indicator (0.001mm)', 'Magnetic Base', 'Spindle Runout Arbor', 'Torque Wrench 10-100Nm'];
      suggestedParts = this.spareParts.filter(p => p.category === 'Mechanical' || p.machine_compatibility?.some(c => c.includes('CNC') || c.includes('M001'))).slice(0, 2);
      estHours = 3.0;
    } else if (textToAnalyze.includes('sensor') || textToAnalyze.includes('optical') || textToAnalyze.includes('scanner') || textToAnalyze.includes('ndt') || textToAnalyze.includes('laser') || textToAnalyze.includes('loop') || textToAnalyze.includes('transmitter') || textToAnalyze.includes('scada')) {
      targetSpec = 'Instrumentation Technician';
      secondarySpec = 'Electrical Technician';
      requiredSkills = ['4-20mA Loop Calibration', 'RTD & Thermocouple Verification', 'SCADA I/O Mapping', 'Pressure Transmitter Calibration'];
      requiredTools = ['Fluke 789 ProcessMeter', 'Laser Alignment Sensor', 'Thermocouple Calibrator'];
      suggestedParts = this.spareParts.filter(p => p.category === 'Consumables').slice(0, 2);
      estHours = 2.5;
    } else if (textToAnalyze.includes('power') || textToAnalyze.includes('electrical') || textToAnalyze.includes('vfd') || textToAnalyze.includes('trip') || textToAnalyze.includes('breaker') || textToAnalyze.includes('overcurrent') || textToAnalyze.includes('voltage') || textToAnalyze.includes('short') || textToAnalyze.includes('motor')) {
      targetSpec = 'Electrical Technician';
      secondarySpec = 'Instrumentation Technician';
      requiredSkills = ['PLC Diagnostics', 'VFD Configuration', 'Control Panel Wiring', 'Thermal Imaging'];
      requiredTools = ['Fluke 87V Industrial Multimeter', 'Insulated Screwdriver Set 1000V', 'Megger Insulation Tester'];
      suggestedParts = [];
      estHours = 2.0;
    }

    // Fallback spare part if none matched
    if (suggestedParts.length === 0 && this.spareParts.length > 0) {
      suggestedParts = [this.spareParts[0]];
    }

    // Evaluate all technicians for this factory
    const profiles = this.getTechnicianProfiles(factoryId);
    const scoredCandidates = profiles.map(tech => {
      let score = 0;
      const matchedSkills: string[] = [];

      // 1. Specialisation matching
      if (tech.specialisation === targetSpec) {
        score += 50;
      } else if (tech.secondary_specialisations?.includes(targetSpec) || tech.specialisation === secondarySpec) {
        score += 28;
      } else {
        score += 10;
      }

      // 2. Technical skill overlap
      for (const reqSkill of requiredSkills) {
        if (tech.technical_skills.some(ts => ts.toLowerCase().includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(ts.toLowerCase()))) {
          matchedSkills.push(reqSkill);
          score += 8;
        }
      }

      // 3. Availability status
      if (tech.availability_status === 'AVAILABLE') {
        score += 20;
      } else if (tech.availability_status === 'BUSY') {
        score += 5;
      } else {
        score -= 40;
      }

      // 4. Current Workload penalty
      score -= (tech.current_workload || 0) * 6;

      // 5. Rating and experience boost
      score += Math.round((tech.rating || 4.5) * 2) + Math.min(10, Math.round(tech.experience_years * 0.8));

      // Calculate match percentage (clamped between 35% and 99%)
      const matchPercentage = Math.min(99, Math.max(35, Math.round((score / 115) * 100)));

      let reasoning = '';
      if (tech.specialisation === targetSpec && tech.availability_status === 'AVAILABLE') {
        reasoning = `Direct specialisation match in ${targetSpec} with verified skills in ${matchedSkills.join(', ') || 'required systems'}. Currently available with manageable workload (${tech.current_workload} active).`;
      } else if (tech.specialisation === targetSpec && tech.availability_status === 'BUSY') {
        reasoning = `High skill match for ${targetSpec}, but currently has ${tech.current_workload} active assignments.`;
      } else if (matchedSkills.length > 0) {
        reasoning = `Secondary match with competencies in ${matchedSkills.join(', ')}.`;
      } else {
        reasoning = `Cross-domain technician with general electro-mechanical troubleshooting capabilities.`;
      }

      return {
        technician: tech,
        score,
        match_percentage: matchPercentage,
        matched_skills: matchedSkills,
        reasoning
      };
    });

    // Rank descending by score
    scoredCandidates.sort((a, b) => b.score - a.score);
    const topMatch = scoredCandidates[0];

    return {
      recommended_technician: topMatch.technician,
      recommended_score: topMatch.score,
      recommended_percentage: topMatch.match_percentage,
      reasoning: `AI recommends ${topMatch.technician.name} (${topMatch.technician.specialisation}): ${topMatch.reasoning}`,
      required_specialisation: targetSpec,
      secondary_specialisation: secondarySpec,
      required_skills: requiredSkills,
      suggested_spare_parts: suggestedParts.map(p => ({
        part_id: p.id,
        part_number: p.part_number,
        part_name: p.name,
        quantity: 1,
        is_in_stock: p.stock_quantity > 0,
        status: p.stock_quantity > 0 ? 'In Stock' : 'Low Stock'
      })),
      required_tools: requiredTools,
      estimated_repair_hours: estHours,
      all_candidates: scoredCandidates
    };
  }

  // ==========================================
  // ROLE-BASED NOTIFICATIONS METHODS
  // ==========================================

  public seedNotifications() {
    this.notifications = [
      // 1. SUPER ADMIN NOTIFICATIONS
      {
        id: 'NOTIF-SA-001',
        recipient_user_id: null,
        recipient_role: 'SUPER_ADMIN',
        factory_id: 'FAC-001',
        title: 'Platform Security Event Logged',
        message: 'Security Audit: Administrative and role access events recorded across enterprise nodes.',
        notification_type: 'security_event',
        priority: 'HIGH',
        related_module: 'security',
        related_record_id: 'SEC-LOG-901',
        target_path: '/super-admin/overview',
        is_read: false,
        created_at: new Date(Date.now() - 25 * 60000).toISOString(),
        meta: 'System Security • Global Governance'
      },
      {
        id: 'NOTIF-SA-002',
        recipient_user_id: null,
        recipient_role: 'SUPER_ADMIN',
        factory_id: 'FAC-001',
        title: 'Critical Enterprise Telemetry Warning',
        message: 'Spindle vibration runaway flagged on APX-CNC-01 at Apex Precision Manufacturing.',
        notification_type: 'incident',
        priority: 'CRITICAL',
        related_module: 'incidents',
        related_record_id: 'INC-2026-001',
        target_path: '/incidents',
        is_read: false,
        created_at: new Date(Date.now() - 40 * 60000).toISOString(),
        meta: 'Apex APX-01 • Critical Fleet Alarm'
      },
      {
        id: 'NOTIF-SA-003',
        recipient_user_id: null,
        recipient_role: 'SUPER_ADMIN',
        factory_id: 'FAC-002',
        title: 'Cross-Factory Operational Sync',
        message: 'Nova Industrial plant reports 92.4% target output compliance on morning shift.',
        notification_type: 'system_health',
        priority: 'LOW',
        related_module: 'system',
        related_record_id: 'FAC-002',
        target_path: '/super-admin/overview',
        is_read: true,
        created_at: new Date(Date.now() - 180 * 60000).toISOString(),
        read_at: new Date(Date.now() - 100 * 60000).toISOString(),
        meta: 'Nova Plant • Shift Status'
      },

      // 2. ADMIN NOTIFICATIONS (Apex Precision FAC-001)
      {
        id: 'NOTIF-ADM-001',
        recipient_user_id: null,
        recipient_role: 'ADMIN',
        factory_id: 'FAC-001',
        title: 'Critical Machine Breakdown (Spindle Runaway)',
        message: 'APX-CNC-01 reached 4.8 mm/s vibration threshold on Heavy Machining line.',
        notification_type: 'machine_failure',
        priority: 'CRITICAL',
        related_module: 'machines',
        related_record_id: 'APX-CNC-01',
        target_path: '/machines',
        is_read: false,
        created_at: new Date(Date.now() - 35 * 60000).toISOString(),
        meta: 'Machine Alert • Bay 1'
      },
      {
        id: 'NOTIF-ADM-002',
        recipient_user_id: null,
        recipient_role: 'ADMIN',
        factory_id: 'FAC-001',
        title: 'Inventory Shortage: Critical Ceramic Bearing',
        message: 'SKF-7014-ACD ceramic bearings at 3 units (reorder threshold is 5). Immediate replenishment recommended.',
        notification_type: 'inventory_shortage',
        priority: 'HIGH',
        related_module: 'inventory',
        related_record_id: 'PRT-1001',
        target_path: '/inventory',
        is_read: false,
        created_at: new Date(Date.now() - 75 * 60000).toISOString(),
        meta: 'Inventory • Low Stock'
      },
      {
        id: 'NOTIF-ADM-003',
        recipient_user_id: null,
        recipient_role: 'ADMIN',
        factory_id: 'FAC-001',
        title: 'New Corrective Work Order Dispatched',
        message: 'Work Order WO-2026-1024 issued for Bay 1 Hydraulic Maintenance.',
        notification_type: 'work_order',
        priority: 'MEDIUM',
        related_module: 'work_orders',
        related_record_id: 'WO-2026-1024',
        target_path: '/work-orders',
        is_read: true,
        created_at: new Date(Date.now() - 210 * 60000).toISOString(),
        read_at: new Date(Date.now() - 150 * 60000).toISOString(),
        meta: 'Work Order • Bay 1'
      },

      // 3. MANAGER / SUPERVISOR NOTIFICATIONS
      {
        id: 'NOTIF-MGR-001',
        recipient_user_id: null,
        recipient_role: 'MANAGER_SUPERVISOR',
        factory_id: 'FAC-001',
        title: 'Verification Required: Spindle Bearing Repair Completed',
        message: 'Technician Ramesh Varma completed repair on Apex 5-Axis CNC Milling Center 01. Ready for supervisor inspection and quality sign-off.',
        notification_type: 'repair_verification',
        priority: 'HIGH',
        related_module: 'incidents',
        related_record_id: 'ACM-2026-001',
        target_path: '/manager-dashboard',
        is_read: false,
        created_at: new Date(Date.now() - 15 * 60000).toISOString(),
        meta: 'Verification Sign-Off • ACM-2026-001'
      },
      {
        id: 'NOTIF-MGR-002',
        recipient_user_id: null,
        recipient_role: 'MANAGER_SUPERVISOR',
        factory_id: 'FAC-001',
        title: 'High Severity Incident Requires Attention',
        message: 'Hydraulic line pressure drop detected on Cylindrical Grinder M004. Incident reported by Operator.',
        notification_type: 'incident',
        priority: 'HIGH',
        related_module: 'incidents',
        related_record_id: 'INC-2026-002',
        target_path: '/incidents',
        is_read: false,
        created_at: new Date(Date.now() - 55 * 60000).toISOString(),
        meta: 'Incident Dispatch • INC-2026-002'
      },
      {
        id: 'NOTIF-MGR-003',
        recipient_user_id: null,
        recipient_role: 'MANAGER_SUPERVISOR',
        factory_id: 'FAC-001',
        title: 'Overdue Maintenance Task Notice',
        message: 'Preventative spindle backlash calibration on M002 has exceeded target shift schedule.',
        notification_type: 'work_order',
        priority: 'MEDIUM',
        related_module: 'work_orders',
        related_record_id: 'WO-2026-1019',
        target_path: '/work-orders',
        is_read: true,
        created_at: new Date(Date.now() - 240 * 60000).toISOString(),
        read_at: new Date(Date.now() - 180 * 60000).toISOString(),
        meta: 'Maintenance • Overdue'
      },

      // 4. PRODUCTION PLANNER NOTIFICATIONS
      {
        id: 'NOTIF-PLN-001',
        recipient_user_id: null,
        recipient_role: 'PRODUCTION_PLANNER',
        factory_id: 'FAC-001',
        title: 'Production Target Deviation Alert',
        message: 'Heavy Machining Line 1 output is running 16% below planned hourly target (122 vs 145 units/hr).',
        notification_type: 'production_shortfall',
        priority: 'HIGH',
        related_module: 'production',
        related_record_id: 'PRD-LINE-1',
        target_path: '/production',
        is_read: false,
        created_at: new Date(Date.now() - 20 * 60000).toISOString(),
        meta: 'Target Shortfall • Line 1'
      },
      {
        id: 'NOTIF-PLN-002',
        recipient_user_id: null,
        recipient_role: 'PRODUCTION_PLANNER',
        factory_id: 'FAC-001',
        title: 'Machine Downtime Impacting Shift Schedule',
        message: 'CNC Milling Center 01 outage directly affects Batch #4102 shaft delivery timeline.',
        notification_type: 'production_delay',
        priority: 'HIGH',
        related_module: 'production',
        related_record_id: 'APX-CNC-01',
        target_path: '/planner-dashboard',
        is_read: false,
        created_at: new Date(Date.now() - 50 * 60000).toISOString(),
        meta: 'Schedule Impact • Batch #4102'
      },
      {
        id: 'NOTIF-PLN-003',
        recipient_user_id: null,
        recipient_role: 'PRODUCTION_PLANNER',
        factory_id: 'FAC-001',
        title: 'Machine Availability Update',
        message: 'Vertical Machining Center M002 cleared for operation following coolant flush.',
        notification_type: 'machine_telemetry',
        priority: 'LOW',
        related_module: 'machines',
        related_record_id: 'M002',
        target_path: '/machines',
        is_read: true,
        created_at: new Date(Date.now() - 300 * 60000).toISOString(),
        read_at: new Date(Date.now() - 220 * 60000).toISOString(),
        meta: 'Capacity Restored • M002'
      },

      // 5. TECHNICIAN NOTIFICATIONS (Assigned to Ramesh Varma USR-012)
      {
        id: 'NOTIF-TCH-001',
        recipient_user_id: 'USR-012',
        recipient_role: 'TECHNICIAN',
        factory_id: 'FAC-001',
        title: 'Action Required: Incident Assignment (Spindle Thermal Runaway)',
        message: 'Assigned to incident ACM-2026-001 on Apex 5-Axis CNC Milling Center 01. Review diagnostics and accept or request reassignment.',
        notification_type: 'technician_assignment',
        priority: 'CRITICAL',
        related_module: 'incidents',
        related_record_id: 'ACM-2026-001',
        target_path: '/technician-dashboard',
        is_read: false,
        created_at: new Date(Date.now() - 30 * 60000).toISOString(),
        meta: 'Assigned by Amit Deshmukh • Due in 2.5 hrs'
      },
      {
        id: 'NOTIF-TCH-002',
        recipient_user_id: 'USR-012',
        recipient_role: 'TECHNICIAN',
        factory_id: 'FAC-001',
        title: 'Upcoming Maintenance Deadline',
        message: 'Scheduled spindle dynamic balance check on Bay 1 milling units due by end of shift.',
        notification_type: 'work_order',
        priority: 'MEDIUM',
        related_module: 'work_orders',
        related_record_id: 'WO-2026-1022',
        target_path: '/work-orders',
        is_read: false,
        created_at: new Date(Date.now() - 80 * 60000).toISOString(),
        meta: 'Scheduled Task • Bay 1'
      },
      {
        id: 'NOTIF-TCH-003',
        recipient_user_id: 'USR-012',
        recipient_role: 'TECHNICIAN',
        factory_id: 'FAC-001',
        title: 'Repair Verification & Sign-Off Approved',
        message: 'Supervisor Amit Deshmukh approved your spindle runout repair (Rating: 5/5 Stars). Machine cleared for production.',
        notification_type: 'repair_verification',
        priority: 'LOW',
        related_module: 'incidents',
        related_record_id: 'ACM-2026-005',
        target_path: '/technician-dashboard',
        is_read: true,
        created_at: new Date(Date.now() - 360 * 60000).toISOString(),
        read_at: new Date(Date.now() - 300 * 60000).toISOString(),
        meta: 'Sign-Off Complete • 5/5 Stars'
      }
    ];
  }

  public getNotifications(userId: string, role: string, factoryId: string, filter?: 'all' | 'unread'): AppNotification[] {
    let list = this.notifications.filter(n => {
      // 1. Factory matching (Super Admin can see all, others only their factory)
      if (role !== 'SUPER_ADMIN' && n.factory_id && n.factory_id !== factoryId) {
        return false;
      }

      // 2. Role & Recipient matching
      if (role === 'SUPER_ADMIN') {
        return true;
      }

      if (role === 'TECHNICIAN') {
        // Technicians only see notifications specifically addressed to them or broadcast to all technicians
        if (n.recipient_user_id) {
          return n.recipient_user_id === userId;
        }
        return n.recipient_role === 'TECHNICIAN' || n.recipient_role === 'ALL';
      }

      // For Admin, Manager, Production Planner:
      if (n.recipient_user_id) {
        return n.recipient_user_id === userId;
      }
      return n.recipient_role === role || n.recipient_role === 'ALL';
    });

    if (filter === 'unread') {
      list = list.filter(n => !n.is_read);
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }

  public createNotification(data: Omit<AppNotification, 'id' | 'created_at' | 'is_read'>): AppNotification {
    const newNotif: AppNotification = {
      ...data,
      id: `NOTIF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      created_at: new Date().toISOString(),
      is_read: false
    };
    this.notifications.unshift(newNotif);
    this.persist();
    return newNotif;
  }

  public markNotificationAsRead(id: string, userId: string, role: string): boolean {
    const notif = this.notifications.find(n => n.id === id);
    if (!notif) return false;

    // Security check: only recipient or matching role can mark as read
    if (role !== 'SUPER_ADMIN') {
      if (notif.recipient_user_id && notif.recipient_user_id !== userId) {
        return false;
      }
      if (!notif.recipient_user_id && notif.recipient_role !== role && notif.recipient_role !== 'ALL') {
        return false;
      }
    }

    notif.is_read = true;
    notif.read_at = new Date().toISOString();
    this.readNotificationIds.add(id);
    this.persist();
    return true;
  }

  public markAllNotificationsAsRead(userId: string, role: string, factoryId: string): string[] {
    const userNotifs = this.getNotifications(userId, role, factoryId, 'unread');
    const now = new Date().toISOString();
    const markedIds: string[] = [];
    userNotifs.forEach(n => {
      n.is_read = true;
      n.read_at = now;
      this.readNotificationIds.add(n.id);
      markedIds.push(n.id);
    });
    if (markedIds.length > 0) this.persist();
    return markedIds;
  }

  public clearNotification(id: string, userId: string, role: string): boolean {
    const idx = this.notifications.findIndex(n => n.id === id);
    if (idx === -1) return false;
    const notif = this.notifications[idx];
    if (role !== 'SUPER_ADMIN') {
      if (notif.recipient_user_id && notif.recipient_user_id !== userId) {
        return false;
      }
      if (!notif.recipient_user_id && notif.recipient_role !== role && notif.recipient_role !== 'ALL') {
        return false;
      }
    }
    this.notifications.splice(idx, 1);
    this.persist();
    return true;
  }
}

export const db = new FactoryOpsDatabase();
