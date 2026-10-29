import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { db } from './db.ts';
import type {
  Factory,
  Machine,
  ProductionRecord,
  MaintenanceRecord,
  Incident,
  WorkOrder,
  SOP,
  DataQualityMetric,
  User,
  FactoryKPIs,
  SuperAdminOverview,
  SparePart,
  SystemAuditLog
} from '../src/types/index.ts';

dotenv.config({ override: true });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fnkldnopljxbmsoofhzh.supabase.co';

/**
 * Validates whether an API key is a genuine Supabase service-role secret key.
 * Publishable / anon keys (format: sb_publishable_... or JWT with role: 'anon')
 * execute with Postgres role 'anon' and are blocked by RLS policies.
 * Genuine service_role keys (format: sb_secret_... or JWT with role: 'service_role')
 * bypass RLS on the server.
 */
export function isRealServiceRoleKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  if (trimmed.startsWith('sb_publishable_')) return false;
  if (trimmed.startsWith('sb_secret_')) return true;
  if (trimmed.startsWith('eyJ')) {
    try {
      const parts = trimmed.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return payload.role === 'service_role';
      }
    } catch {
      // not a JWT
    }
  }
  return false;
}

const rawSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
export const isServiceRoleKeyPresent = isRealServiceRoleKey(rawSecretKey);

// Use service-role key if genuine; otherwise fallback to anon key for public reads
const SUPABASE_KEY =
  (isServiceRoleKeyPresent ? rawSecretKey : null) ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_uXYNtz2MZIyMVq04x59F1Q_ndA-3Zcw';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export interface SupabaseStatus {
  isHealthy: boolean;
  hasChecked: boolean;
  url: string;
  hasServiceRoleKey: boolean;
  error?: string | null;
  counts: {
    machines: number | null;
    production_records: number | null;
    maintenance_records: number | null;
    incidents: number | null;
    work_orders: number | null;
  };
}

export let supabaseStatus: SupabaseStatus = {
  isHealthy: false,
  hasChecked: false,
  url: SUPABASE_URL,
  hasServiceRoleKey: isServiceRoleKeyPresent,
  error: null,
  counts: {
    machines: null,
    production_records: null,
    maintenance_records: null,
    incidents: null,
    work_orders: null
  }
};

let lastCheckTime = 0;
const CHECK_INTERVAL_MS = 10000;

// Test remote Supabase connection against the real tables
export async function testSupabaseConnection(): Promise<SupabaseStatus> {
  lastCheckTime = Date.now();
  try {
    const [machinesRes, prodRes, maintRes, incRes, woRes] = await Promise.all([
      supabase.from('machines').select('machine_id', { count: 'exact', head: true }),
      supabase.from('production_records').select('production_id', { count: 'exact', head: true }),
      supabase.from('maintenance_records').select('maintenance_id', { count: 'exact', head: true }),
      supabase.from('incidents').select('incident_id', { count: 'exact', head: true }),
      supabase.from('work_orders').select('work_order_id', { count: 'exact', head: true })
    ]);

    const anyError = machinesRes.error || prodRes.error || maintRes.error || incRes.error || woRes.error;

    supabaseStatus = {
      isHealthy: !anyError && (machinesRes.count ?? 0) > 0,
      hasChecked: true,
      url: SUPABASE_URL,
      hasServiceRoleKey: isServiceRoleKeyPresent,
      error: anyError
        ? anyError.message
        : (machinesRes.count ?? 0) === 0
          ? 'Supabase queries returned 0 rows. Row-Level Security (RLS) is active. Set SUPABASE_SERVICE_ROLE_KEY in .env on the server to permit backend data access.'
          : null,
      counts: {
        machines: machinesRes.count ?? null,
        production_records: prodRes.count ?? null,
        maintenance_records: maintRes.count ?? null,
        incidents: incRes.count ?? null,
        work_orders: woRes.count ?? null
      }
    };

    if (supabaseStatus.isHealthy) {
      console.log('✅ [Supabase] Connected successfully to remote database with records:');
      console.log(`   - machines: ${supabaseStatus.counts.machines}`);
      console.log(`   - production_records: ${supabaseStatus.counts.production_records}`);
      console.log(`   - maintenance_records: ${supabaseStatus.counts.maintenance_records}`);
      console.log(`   - incidents: ${supabaseStatus.counts.incidents}`);
      console.log(`   - work_orders: ${supabaseStatus.counts.work_orders}`);
    } else {
      console.warn('⚠️ [Supabase] Status check warning:', supabaseStatus.error);
    }

    return supabaseStatus;
  } catch (err: any) {
    supabaseStatus = {
      isHealthy: false,
      hasChecked: true,
      url: SUPABASE_URL,
      hasServiceRoleKey: isServiceRoleKeyPresent,
      error: err.message || 'Unknown network error connecting to Supabase',
      counts: {
        machines: null,
        production_records: null,
        maintenance_records: null,
        incidents: null,
        work_orders: null
      }
    };
    return supabaseStatus;
  }
}

export async function isTableReady(): Promise<boolean> {
  const now = Date.now();
  if (supabaseStatus.hasChecked && now - lastCheckTime < CHECK_INTERVAL_MS) {
    return supabaseStatus.isHealthy;
  }
  const status = await testSupabaseConnection();
  return status.isHealthy;
}

export function getActiveDataSource(): 'supabase' | 'cleaned_dataset' {
  return supabaseStatus.isHealthy ? 'supabase' : 'cleaned_dataset';
}

export function getDetailedSystemStatus() {
  const isHealthy = supabaseStatus.isHealthy;
  return {
    dataSource: isHealthy ? 'supabase' : 'cleaned_dataset',
    isSupabaseHealthy: isHealthy,
    hasChecked: supabaseStatus.hasChecked,
    supabaseUrl: SUPABASE_URL,
    hasServiceRoleKey: isServiceRoleKeyPresent,
    keyType: isServiceRoleKeyPresent ? 'service_role (secret - superuser)' : 'anon (publishable - subject to RLS)',
    supabaseError: supabaseStatus.error,
    message: isHealthy
      ? 'Live Supabase Cloud database connected and synchronized as primary source of truth.'
      : isServiceRoleKeyPresent
        ? 'Connected to Supabase PostgreSQL instance. Cloud tables are accessible.'
        : 'Supabase PostgreSQL is connected with anonymous key. Writes rejected by PostgreSQL Row Level Security (RLS) are safely persisted to local disk storage. Configure SUPABASE_SERVICE_ROLE_KEY in .env on the server or execute supabase-rls-setup.sql in Supabase SQL editor to enable direct cloud writes.',
    activeCounts: {
      machines: isHealthy ? (supabaseStatus.counts.machines ?? db.machines.length) : db.machines.length,
      production_records: isHealthy ? (supabaseStatus.counts.production_records ?? db.production.length) : db.production.length,
      maintenance_records: isHealthy ? (supabaseStatus.counts.maintenance_records ?? db.maintenance.length) : db.maintenance.length,
      incidents: isHealthy ? (supabaseStatus.counts.incidents ?? db.incidents.length) : db.incidents.length,
      work_orders: isHealthy ? (supabaseStatus.counts.work_orders ?? db.workOrders.length) : db.workOrders.length
    },
    supabaseCounts: supabaseStatus.counts
  };
}

// -------------------------------------------------------------
// NORMALIZERS: Map CSV / Supabase raw schemas into robust models
// -------------------------------------------------------------

export function normalizeMachine(raw: any): Machine {
  const machine_id = String(raw.machine_id || raw.id || '');
  const machine_name = String(raw.machine_name || raw.name || machine_id);
  const line_id = String(raw.line_id || '');
  const line_name = String(raw.line_name || raw.line || line_id);
  const station_number = String(raw.station_number || '');
  const machine_type = String(raw.machine_type || raw.type || '');
  const statusStr = String(raw.status || 'Active');
  const normalizedStatus =
    statusStr.toLowerCase() === 'active' || statusStr.toLowerCase() === 'running'
      ? 'running'
      : statusStr.toLowerCase() === 'warning'
        ? 'warning'
        : statusStr.toLowerCase() === 'maintenance'
          ? 'maintenance'
          : statusStr.toLowerCase() === 'inactive' || statusStr.toLowerCase() === 'offline'
            ? 'offline'
            : 'running';

  return {
    machine_id,
    machine_name,
    line_id,
    line_name,
    station_number,
    machine_type,
    manufacturer: raw.manufacturer,
    model: raw.model,
    serial_number: raw.serial_number,
    installation_date: raw.installation_date || raw.install_date,
    target_cycle_time_seconds: raw.target_cycle_time_seconds ? Number(raw.target_cycle_time_seconds) : 60,
    rated_capacity_uph: raw.rated_capacity_uph ? Number(raw.rated_capacity_uph) : 60,
    power_rating_kw: raw.power_rating_kw ? Number(raw.power_rating_kw) : 25,
    maintenance_interval_days: raw.maintenance_interval_days ? Number(raw.maintenance_interval_days) : 30,
    status: normalizedStatus as any,

    // Aliases
    id: machine_id,
    factory_id: raw.factory_id || 'FAC-001',
    name: machine_name,
    type: machine_type,
    line: line_name,
    health_score: raw.health_score ? Number(raw.health_score) : 92.5,
    temperature_c: raw.temperature_c ? Number(raw.temperature_c) : 62.0,
    vibration_mms: raw.vibration_mms ? Number(raw.vibration_mms) : 1.8,
    pressure_bar: raw.pressure_bar ? Number(raw.pressure_bar) : 6.2,
    speed_rpm: raw.speed_rpm ? Number(raw.speed_rpm) : 1450,
    oee: raw.oee ? Number(raw.oee) : 88.5,
    operator: raw.operator || 'Assigned Operator',
    install_date: raw.installation_date || raw.install_date || '2022-01-01',
    last_service_date: raw.last_service_date || raw.installation_date || '2026-09-01'
  };
}

export function normalizeProduction(raw: any): ProductionRecord {
  const production_id = String(raw.production_id || raw.id || '');
  const timestamp = String(raw.timestamp || raw.date || new Date().toISOString());
  const date = String(raw.date || timestamp.split(' ')[0] || timestamp.split('T')[0]);
  const shift = raw.shift || 'A';
  const line_id = String(raw.line_id || '');
  const machine_id = String(raw.machine_id || '');
  const product_id = String(raw.product_id || '');
  const product_name = String(raw.product_name || '');
  const planned = Number(raw.planned_units ?? raw.target_units ?? 0);
  const actual = Number(raw.actual_units ?? 0);
  const defects = Number(raw.defect_units ?? raw.defective_units ?? 0);
  const good = Number(raw.good_units ?? Math.max(0, actual - defects));
  const plannedDt = Number(raw.planned_downtime_minutes ?? 0);
  const unplannedDt = Number(raw.unplanned_downtime_minutes ?? 0);
  const totalDt = Number(raw.downtime_minutes ?? (plannedDt + unplannedDt));
  const targetCycle = Number(raw.target_cycle_time_seconds ?? 60);
  const actualCycle = Number(raw.actual_cycle_time_seconds ?? raw.cycle_time_sec ?? targetCycle);
  const availability = Number(raw.availability_percent ?? 94.5);
  const performance = Number(raw.performance_percent ?? 98.2);
  const quality = Number(raw.quality_percent ?? (actual > 0 ? ((actual - defects) / actual) * 100 : 98.5));
  const oee = Number(raw.oee_percent ?? Math.round((availability * performance * quality) / 10000 * 10) / 10);
  const changeover = Number(raw.changeover_minutes ?? 0);
  const status = String(raw.status || 'Running');

  return {
    production_id,
    timestamp,
    date,
    shift,
    line_id,
    machine_id,
    product_id,
    product_name,
    planned_units: planned,
    actual_units: actual,
    good_units: good,
    defect_units: defects,
    planned_downtime_minutes: plannedDt,
    unplanned_downtime_minutes: unplannedDt,
    downtime_minutes: totalDt,
    target_cycle_time_seconds: targetCycle,
    actual_cycle_time_seconds: actualCycle,
    availability_percent: availability,
    performance_percent: performance,
    quality_percent: quality,
    oee_percent: oee,
    changeover_minutes: changeover,
    status,

    // Aliases
    id: production_id,
    factory_id: raw.factory_id || 'FAC-001',
    target_units: planned,
    defective_units: defects,
    scrap_kg: raw.scrap_kg ? Number(raw.scrap_kg) : Math.round(defects * 1.5 * 10) / 10,
    cycle_time_sec: actualCycle,
    operator: raw.operator || 'Line Operator'
  };
}

export function normalizeMaintenance(raw: any): MaintenanceRecord {
  const maintenance_id = String(raw.maintenance_id || raw.id || '');
  const machine_id = String(raw.machine_id || '');
  const machine_name = String(raw.machine_name || machine_id);
  const line_id = String(raw.line_id || '');
  const start_time = String(raw.start_time || raw.scheduled_date || '');
  const end_time = raw.end_time || raw.completed_date || '';
  const maintenance_type = raw.maintenance_type || raw.type || 'Preventive';
  const priority = String(raw.priority || 'Medium');
  const status = String(raw.status || 'Completed');
  const technician_id = String(raw.technician_id || '');
  const technician_name = String(raw.technician_name || raw.technician || 'Technician');
  const failure_category = String(raw.failure_category || 'Mechanical');
  const problem_description = String(raw.problem_description || raw.description || '');
  const root_cause = String(raw.root_cause || '');
  const action_taken = String(raw.action_taken || '');
  const duration_minutes = Number(raw.duration_minutes ?? 60);
  const downtime_minutes = Number(raw.downtime_minutes ?? 0);
  const labor_hours = Number(raw.labor_hours ?? (duration_minutes / 60));
  const labor_cost = Number(raw.labor_cost ?? 1200);
  const parts_cost = Number(raw.parts_cost ?? 800);
  const total_cost = Number(raw.total_cost ?? raw.cost_usd ?? (labor_cost + parts_cost));
  const parts_replaced = String(raw.parts_replaced || 'Standard replacement parts');
  const work_order_id = String(raw.work_order_id || '');
  const service_provider = String(raw.service_provider || 'Internal Maintenance');

  return {
    maintenance_id,
    machine_id,
    machine_name,
    line_id,
    start_time,
    end_time,
    maintenance_type,
    priority,
    status,
    technician_id,
    technician_name,
    failure_category,
    problem_description,
    root_cause,
    action_taken,
    duration_minutes,
    downtime_minutes,
    labor_hours,
    labor_cost,
    parts_cost,
    total_cost,
    parts_replaced,
    work_order_id,
    service_provider,
    sign_off_by: raw.sign_off_by,
    remarks: raw.remarks,
    logged_timestamp: raw.logged_timestamp,
    calculated_duration: raw.calculated_duration,

    // Aliases
    id: maintenance_id,
    factory_id: raw.factory_id || 'FAC-001',
    type: maintenance_type,
    scheduled_date: start_time.split(' ')[0] || start_time.split('T')[0] || '',
    completed_date: end_time ? (end_time.split(' ')[0] || end_time.split('T')[0]) : undefined,
    technician: technician_name,
    description: problem_description,
    cost_usd: total_cost,
    downtime_hours: Math.round((downtime_minutes / 60) * 10) / 10
  };
}

export function normalizeIncident(raw: any): Incident {
  const incident_id = String(raw.incident_id || raw.id || '');
  const timestamp = String(raw.timestamp || raw.date || raw.reported_at || new Date().toISOString());
  const date = String(raw.date || timestamp.split(' ')[0]);
  const shift = String(raw.shift || 'A');
  const line_id = String(raw.line_id || '');
  const line_name = String(raw.line_name || line_id);
  const machine_id = String(raw.machine_id || '');
  const machine_name = String(raw.machine_name || machine_id);
  const incident_type = String(raw.incident_type || 'Operational');
  const severity = String(raw.severity || 'Medium');
  const failure_category = String(raw.failure_category || 'Mechanical');
  const problem_description = String(raw.problem_description || raw.title || 'Incident report');
  const root_cause = raw.root_cause || '';
  const action_taken = raw.action_taken || '';
  const downtime_minutes = Number(raw.downtime_minutes ?? 0);
  const defect_units = Number(raw.defect_units ?? 0);
  const technician_name = String(raw.technician_name || raw.reported_by || 'Operations Team');
  const status = String(raw.status || 'Closed');

  return {
    incident_id,
    production_id: raw.production_id,
    maintenance_id: raw.maintenance_id,
    timestamp,
    date,
    shift,
    line_id,
    line_name,
    machine_id,
    machine_name,
    station_number: raw.station_number,
    product_id: raw.product_id,
    product_name: raw.product_name,
    incident_type,
    severity,
    failure_category,
    problem_description,
    root_cause,
    action_taken,
    downtime_minutes,
    defect_units,
    technician_id: raw.technician_id,
    technician_name,
    status,
    remarks: raw.remarks,

    // Aliases
    id: incident_id,
    factory_id: raw.factory_id || 'FAC-001',
    title: problem_description,
    description: action_taken || raw.remarks || problem_description,
    reported_by: technician_name,
    reported_at: timestamp,
    resolved_at: status === 'Closed' || status === 'Resolved' ? timestamp : undefined,
    resolution_notes: action_taken
  };
}

export function normalizeWorkOrder(raw: any): WorkOrder {
  const work_order_id = String(raw.work_order_id || raw.id || '');
  const creation_timestamp = String(raw.creation_timestamp || raw.created_at || new Date().toISOString());
  const start_time = raw.start_time || '';
  const end_time = raw.end_time || raw.completed_at || '';
  const work_order_type = String(raw.work_order_type || 'Corrective');
  const priority = String(raw.priority || 'Medium');
  const status = String(raw.status || 'Completed');
  const line_id = String(raw.line_id || '');
  const line_name = String(raw.line_name || line_id);
  const machine_id = String(raw.machine_id || '');
  const machine_name = String(raw.machine_name || machine_id);
  const technician_name = String(raw.technician_name || raw.assigned_to || 'Maintenance Team');
  const failure_category = raw.failure_category || 'Mechanical';
  const problem_description = String(raw.problem_description || raw.title || 'Work order task');
  const duration_minutes = Number(raw.duration_minutes ?? 60);
  const downtime_minutes = Number(raw.downtime_minutes ?? 0);
  const labor_hours = Number(raw.labor_hours ?? (duration_minutes / 60));
  const labor_cost = Number(raw.labor_cost ?? 600);
  const parts_cost = Number(raw.parts_cost ?? 400);
  const total_cost = Number(raw.total_cost ?? (labor_cost + parts_cost));
  const parts_replaced = raw.parts_replaced || raw.parts_required || '';
  const root_cause = raw.root_cause || '';
  const action_taken = raw.action_taken || '';
  const service_provider = raw.service_provider || 'Internal Maintenance';

  const dueDate = start_time ? start_time.split(' ')[0] : creation_timestamp.split(' ')[0];

  return {
    work_order_id,
    maintenance_id: raw.maintenance_id,
    incident_id: raw.incident_id,
    production_id: raw.production_id,
    creation_timestamp,
    start_time,
    end_time,
    work_order_type,
    priority,
    status,
    line_id,
    line_name,
    machine_id,
    machine_name,
    station_number: raw.station_number,
    technician_id: raw.technician_id,
    technician_name,
    failure_category,
    problem_description,
    duration_minutes,
    downtime_minutes,
    labor_hours,
    labor_cost,
    parts_cost,
    total_cost,
    parts_replaced,
    root_cause,
    action_taken,
    service_provider,

    // Aliases
    id: work_order_id,
    factory_id: raw.factory_id || 'FAC-001',
    title: problem_description,
    assigned_to: technician_name,
    due_date: dueDate,
    created_at: creation_timestamp,
    completed_at: end_time || undefined,
    estimated_hours: labor_hours || 2.0,
    actual_hours: labor_hours,
    parts_required: parts_replaced
  };
}

// -------------------------------------------------------------
// SUPABASE DATA ADAPTER (Real Supabase integration with errors)
// -------------------------------------------------------------

export class SupabaseDataError extends Error {
  public code: string;
  public table: string;
  constructor(message: string, code: string, table: string) {
    super(message);
    this.name = 'SupabaseDataError';
    this.code = code;
    this.table = table;
  }
}

export const supabaseAdapter = {
  // Machines
  async getMachines(filterLineId?: string): Promise<Machine[]> {
    try {
      let query = supabase.from('machines').select('*');
      if (filterLineId && filterLineId.startsWith('L0')) {
        query = query.eq('line_id', filterLineId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(normalizeMachine);
      }
    } catch (err: any) {
      console.warn('[Supabase] Falling back to persistent machines store:', err?.message);
    }

    let machines = db.machines;
    if (filterLineId) {
      machines = machines.filter(m => m.line_id === filterLineId || m.line === filterLineId);
    }
    return machines;
  },

  async getMachineById(id: string): Promise<Machine | null> {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .or(`machine_id.eq.${id},id.eq.${id}`)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return normalizeMachine(data);
      }
    } catch (err: any) {
      console.warn('[Supabase] Falling back to persistent machine query:', err?.message);
    }
    return db.machines.find(m => m.id === id || m.machine_id === id) || null;
  },

  async createMachine(machineData: Partial<Machine>, factoryId = 'FAC-001'): Promise<{ machine: Machine; syncedToSupabase: boolean; supabaseError?: string }> {
    const rawId = machineData.machine_id || `M${String(Date.now()).slice(-3)}`;
    const lineId = machineData.line_id || (machineData.line === 'Line 2' ? 'L02' : machineData.line === 'Line 3' ? 'L03' : machineData.line === 'Line 4' ? 'L04' : 'L01');
    const lineName = machineData.line_name || machineData.line || (lineId === 'L02' ? 'Stamping Line 2' : lineId === 'L03' ? 'Welding Line 3' : lineId === 'L04' ? 'Coating & Packaging Line 4' : 'Machining Line 1');
    const fId = machineData.factory_id || factoryId || 'FAC-001';

    const statusInput = String(machineData.status || 'Active');
    const dbStatus =
      statusInput.toLowerCase() === 'running' || statusInput.toLowerCase() === 'active'
        ? 'Active'
        : statusInput.toLowerCase() === 'maintenance'
          ? 'Maintenance'
          : statusInput.toLowerCase() === 'warning'
            ? 'Warning'
            : 'Inactive';

    const newMachineRaw: any = {
      id: rawId,
      factory_id: fId,
      machine_id: rawId,
      name: machineData.machine_name || machineData.name || `Machine ${rawId}`,
      machine_name: machineData.machine_name || machineData.name || `Machine ${rawId}`,
      line: lineName,
      line_id: lineId,
      line_name: lineName,
      station_number: machineData.station_number || 'ST-01',
      type: machineData.machine_type || machineData.type || 'CNC Milling Center',
      machine_type: machineData.machine_type || machineData.type || 'CNC Milling Center',
      manufacturer: machineData.manufacturer || 'Industrial Dynamics',
      model: machineData.model || 'Series-V',
      serial_number: machineData.serial_number || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
      installation_date: machineData.installation_date || machineData.install_date || new Date().toISOString().split('T')[0],
      target_cycle_time_seconds: Number(machineData.target_cycle_time_seconds || 60),
      rated_capacity_uph: Number(machineData.rated_capacity_uph || 60),
      power_rating_kw: Number(machineData.power_rating_kw || 25),
      maintenance_interval_days: Number(machineData.maintenance_interval_days || 30),
      status: dbStatus,
      health_score: Number(machineData.health_score || 95.0),
      temperature_c: Number(machineData.temperature_c || 62.0),
      vibration_mms: Number(machineData.vibration_mms || 1.8),
      pressure_bar: Number(machineData.pressure_bar || 6.2),
      speed_rpm: Number(machineData.speed_rpm || 1450),
      oee: Number(machineData.oee || 88.5),
      operator: machineData.operator || 'Assigned Operator'
    };

    let createdNorm: Machine = normalizeMachine(newMachineRaw);
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await supabase.from('machines').upsert(newMachineRaw, { onConflict: 'id' }).select().single();
      if (!error && data) {
        createdNorm = normalizeMachine(data);
        syncedToSupabase = true;
      } else if (error) {
        supabaseError = error.message;
        console.warn('[Supabase createMachine] Remote write error:', error.message);
      }
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.machines = db.machines.filter(m => m.id !== rawId && m.machine_id !== rawId);
    db.machines.unshift(createdNorm);
    db.persist();

    return { machine: createdNorm, syncedToSupabase, supabaseError };
  },

  async updateMachine(id: string, updates: Partial<Machine>): Promise<{ machine: Machine | null; syncedToSupabase: boolean; supabaseError?: string }> {
    const updatePayload: any = {};
    if (updates.machine_name || updates.name) {
      updatePayload.name = updates.machine_name || updates.name;
      updatePayload.machine_name = updates.machine_name || updates.name;
    }
    if (updates.line_id) updatePayload.line_id = updates.line_id;
    if (updates.line_name || updates.line) {
      updatePayload.line = updates.line_name || updates.line;
      updatePayload.line_name = updates.line_name || updates.line;
    }
    if (updates.station_number) updatePayload.station_number = updates.station_number;
    if (updates.machine_type || updates.type) {
      updatePayload.type = updates.machine_type || updates.type;
      updatePayload.machine_type = updates.machine_type || updates.type;
    }
    if (updates.manufacturer) updatePayload.manufacturer = updates.manufacturer;
    if (updates.model) updatePayload.model = updates.model;
    if (updates.serial_number) updatePayload.serial_number = updates.serial_number;
    if (updates.health_score !== undefined) updatePayload.health_score = Number(updates.health_score);
    if (updates.temperature_c !== undefined) updatePayload.temperature_c = Number(updates.temperature_c);
    if (updates.vibration_mms !== undefined) updatePayload.vibration_mms = Number(updates.vibration_mms);
    if (updates.oee !== undefined) updatePayload.oee = Number(updates.oee);
    if (updates.operator) updatePayload.operator = updates.operator;
    if (updates.status) {
      const s = String(updates.status).toLowerCase();
      updatePayload.status = s === 'running' || s === 'active' ? 'Active' : s === 'maintenance' ? 'Maintenance' : s === 'warning' ? 'Warning' : 'Inactive';
    }

    let updatedResult: Machine | null = null;
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await supabase
        .from('machines')
        .update(updatePayload)
        .or(`machine_id.eq.${id},id.eq.${id}`)
        .select()
        .maybeSingle();

      if (!error && data) {
        updatedResult = normalizeMachine(data);
        syncedToSupabase = true;
      } else if (error) {
        supabaseError = error.message;
      }
    } catch (err: any) {
      supabaseError = err?.message;
    }

    const idx = db.machines.findIndex(m => m.id === id || m.machine_id === id);
    if (idx !== -1) {
      db.machines[idx] = { ...db.machines[idx], ...updates };
      if (updates.status) {
        const s = String(updates.status).toLowerCase();
        db.machines[idx].status = (s === 'running' || s === 'active' ? 'running' : s === 'maintenance' ? 'maintenance' : s === 'warning' ? 'warning' : 'offline') as any;
      }
      if (!updatedResult) updatedResult = db.machines[idx];
      db.persist();
    }

    return { machine: updatedResult, syncedToSupabase, supabaseError };
  },

  async deleteMachine(id: string): Promise<{ success: boolean; syncedToSupabase: boolean; supabaseError?: string }> {
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { error } = await supabase.from('machines').delete().or(`machine_id.eq.${id},id.eq.${id}`);
      if (!error) {
        syncedToSupabase = true;
      } else {
        supabaseError = error.message;
      }
    } catch (err: any) {
      supabaseError = err?.message;
    }

    const idx = db.machines.findIndex(m => m.id === id || m.machine_id === id);
    if (idx !== -1) {
      db.machines.splice(idx, 1);
      db.persist();
    }
    return { success: true, syncedToSupabase, supabaseError };
  },

  // Production Records
  async getProduction(filterLineId?: string): Promise<ProductionRecord[]> {
    try {
      let query = supabase.from('production_records').select('*');
      if (filterLineId && filterLineId.startsWith('L0')) {
        query = query.eq('line_id', filterLineId);
      }

      const { data, error } = await query.order('timestamp', { ascending: false }).limit(200);
      if (!error && data && data.length > 0) {
        return data.map(normalizeProduction);
      }
    } catch (err: any) {
      console.warn('[Supabase] Falling back to persistent production store:', err?.message);
    }

    let records = db.production;
    if (filterLineId) {
      records = records.filter(p => p.line_id === filterLineId);
    }
    return records;
  },

  async createProduction(prodData: Partial<ProductionRecord>, factoryId = 'FAC-001'): Promise<{ record: ProductionRecord; syncedToSupabase: boolean; supabaseError?: string }> {
    const rawId = prodData.production_id || `PRD-${Date.now()}`;
    const timestamp = prodData.timestamp || new Date().toISOString();
    const dateStr = prodData.date || timestamp.split('T')[0];
    const planned = Number(prodData.planned_units ?? prodData.target_units ?? 100);
    const actual = Number(prodData.actual_units ?? 95);
    const defects = Number(prodData.defect_units ?? prodData.defective_units ?? 2);
    const good = Math.max(0, actual - defects);

    const newProdRaw: any = {
      id: rawId,
      production_id: rawId,
      factory_id: prodData.factory_id || factoryId || 'FAC-001',
      machine_id: prodData.machine_id || 'M001',
      machine_name: prodData.machine_name || prodData.machine_id || 'Machine Asset',
      timestamp,
      date: dateStr,
      shift: prodData.shift || 'A',
      line_id: prodData.line_id || 'L01',
      line_name: prodData.line_name || 'Machining Line 1',
      product_id: prodData.product_id || 'PRD-101',
      product_name: prodData.product_name || 'Precision Component',
      planned_units: planned,
      target_units: planned,
      actual_units: actual,
      defect_units: defects,
      defective_units: defects,
      good_units: good,
      downtime_minutes: Number(prodData.downtime_minutes ?? 15),
      planned_downtime_minutes: Number(prodData.planned_downtime_minutes ?? 0),
      unplanned_downtime_minutes: Number(prodData.unplanned_downtime_minutes ?? 15),
      target_cycle_time_seconds: Number(prodData.target_cycle_time_seconds ?? 60),
      actual_cycle_time_seconds: Number(prodData.actual_cycle_time_seconds ?? 62),
      availability_percent: Number(prodData.availability_percent ?? 95.0),
      performance_percent: Number(prodData.performance_percent ?? 96.5),
      quality_percent: Number(prodData.quality_percent ?? (actual > 0 ? ((actual - defects) / actual) * 100 : 98)),
      oee_percent: Number(prodData.oee_percent ?? 89.2),
      status: prodData.status || 'Running',
      operator: prodData.operator || 'Line Operator'
    };

    // Columns present on Supabase production_records table
    const supabasePayload: any = {
      id: rawId,
      production_id: rawId,
      factory_id: prodData.factory_id || factoryId || 'FAC-001',
      machine_id: prodData.machine_id || 'M001',
      timestamp,
      date: dateStr,
      shift: prodData.shift || 'A',
      line_id: prodData.line_id || 'L01',
      product_id: prodData.product_id || 'PRD-101',
      product_name: prodData.product_name || 'Precision Component',
      planned_units: planned,
      actual_units: actual,
      good_units: good,
      defect_units: defects,
      downtime_minutes: Number(prodData.downtime_minutes ?? 15),
      planned_downtime_minutes: Number(prodData.planned_downtime_minutes ?? 0),
      unplanned_downtime_minutes: Number(prodData.unplanned_downtime_minutes ?? 15),
      target_cycle_time_seconds: Number(prodData.target_cycle_time_seconds ?? 60),
      actual_cycle_time_seconds: Number(prodData.actual_cycle_time_seconds ?? 62),
      availability_percent: Number(prodData.availability_percent ?? 95.0),
      performance_percent: Number(prodData.performance_percent ?? 96.5),
      quality_percent: Number(prodData.quality_percent ?? (actual > 0 ? ((actual - defects) / actual) * 100 : 98)),
      oee_percent: Number(prodData.oee_percent ?? 89.2),
      status: prodData.status || 'Running'
    };

    let createdNorm = normalizeProduction(newProdRaw);
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await supabase.from('production_records').upsert(supabasePayload, { onConflict: 'id' }).select().single();
      if (!error && data) {
        createdNorm = normalizeProduction(data);
        syncedToSupabase = true;
      } else if (error) {
        supabaseError = error.message;
      }
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.production.unshift(createdNorm);
    db.persist();

    return { record: createdNorm, syncedToSupabase, supabaseError };
  },

  async deleteProduction(id: string): Promise<{ success: boolean; syncedToSupabase: boolean; supabaseError?: string }> {
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { error } = await supabase.from('production_records').delete().or(`production_id.eq.${id},id.eq.${id}`);
      if (!error) syncedToSupabase = true;
      else supabaseError = error.message;
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.production = db.production.filter(p => p.id !== id && p.production_id !== id);
    db.persist();
    return { success: true, syncedToSupabase, supabaseError };
  },

  // Maintenance Records
  async getMaintenance(filterLineId?: string): Promise<MaintenanceRecord[]> {
    try {
      let query = supabase.from('maintenance_records').select('*').order('start_time', { ascending: false });
      if (filterLineId && filterLineId.startsWith('L0')) {
        query = query.eq('line_id', filterLineId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(normalizeMaintenance);
      }
    } catch (err: any) {
      console.warn('[Supabase] Falling back to persistent maintenance store:', err?.message);
    }

    let records = db.maintenance;
    if (filterLineId) {
      records = records.filter(m => m.line_id === filterLineId);
    }
    return records;
  },

  async createMaintenance(maintData: Partial<MaintenanceRecord>, factoryId = 'FAC-001'): Promise<{ record: MaintenanceRecord; syncedToSupabase: boolean; supabaseError?: string }> {
    const rawId = maintData.maintenance_id || `MNT-${Date.now()}`;
    const startTime = maintData.start_time || new Date().toISOString();
    const duration = Number(maintData.duration_minutes ?? 60);

    const newMaintRaw: any = {
      id: rawId,
      maintenance_id: rawId,
      factory_id: maintData.factory_id || factoryId || 'FAC-001',
      machine_id: maintData.machine_id || 'M001',
      machine_name: maintData.machine_name || maintData.machine_id || 'Machine Asset',
      line_id: maintData.line_id || 'L01',
      start_time: startTime,
      end_time: maintData.end_time || new Date(Date.now() + duration * 60000).toISOString(),
      maintenance_type: maintData.maintenance_type || 'Preventive',
      priority: maintData.priority || 'Medium',
      status: maintData.status || 'Completed',
      technician_id: maintData.technician_id || 'T01',
      technician_name: maintData.technician_name || 'Assigned Technician',
      failure_category: maintData.failure_category || 'Mechanical',
      problem_description: maintData.problem_description || 'Routine maintenance and inspection',
      root_cause: maintData.root_cause || 'Scheduled Maintenance',
      action_taken: maintData.action_taken || 'Inspected, lubricated, and calibrated',
      duration_minutes: duration,
      downtime_minutes: Number(maintData.downtime_minutes ?? 0),
      labor_hours: Number(maintData.labor_hours ?? (duration / 60)),
      labor_cost: Number(maintData.labor_cost ?? 1200),
      parts_cost: Number(maintData.parts_cost ?? 400),
      total_cost: Number(maintData.total_cost ?? 1600),
      parts_replaced: maintData.parts_replaced || 'Seal kit, lubricant',
      service_provider: maintData.service_provider || 'Internal Maintenance'
    };

    let createdNorm = normalizeMaintenance(newMaintRaw);
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await supabase.from('maintenance_records').upsert(newMaintRaw, { onConflict: 'id' }).select().single();
      if (!error && data) {
        createdNorm = normalizeMaintenance(data);
        syncedToSupabase = true;
      } else if (error) {
        supabaseError = error.message;
      }
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.maintenance.unshift(createdNorm);
    db.persist();

    return { record: createdNorm, syncedToSupabase, supabaseError };
  },

  async deleteMaintenance(id: string): Promise<{ success: boolean; syncedToSupabase: boolean; supabaseError?: string }> {
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { error } = await supabase.from('maintenance_records').delete().or(`maintenance_id.eq.${id},id.eq.${id}`);
      if (!error) syncedToSupabase = true;
      else supabaseError = error.message;
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.maintenance = db.maintenance.filter(m => m.id !== id && m.maintenance_id !== id);
    db.persist();
    return { success: true, syncedToSupabase, supabaseError };
  },

  // Incidents
  async getIncidents(filterLineId?: string): Promise<Incident[]> {
    try {
      let query = supabase.from('incidents').select('*').order('timestamp', { ascending: false });
      if (filterLineId && filterLineId.startsWith('L0')) {
        query = query.eq('line_id', filterLineId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(normalizeIncident);
      }
    } catch (err: any) {
      console.warn('[Supabase] Falling back to persistent incidents store:', err?.message);
    }

    let records = db.incidents;
    if (filterLineId) {
      records = records.filter(i => i.line_id === filterLineId);
    }
    return records;
  },

  async createIncident(incidentData: any, factoryId = 'FAC-001'): Promise<{ incident: Incident; syncedToSupabase: boolean; supabaseError?: string }> {
    const rawId = incidentData.incident_id || `INC-${Date.now().toString().slice(-4)}`;
    const fId = incidentData.factory_id || factoryId || 'FAC-001';

    const newIncidentRaw: any = {
      id: rawId,
      incident_id: rawId,
      factory_id: fId,
      machine_id: incidentData.machine_id || 'M001',
      machine_name: incidentData.machine_name || incidentData.machine_id || 'Machine Asset',
      line_id: incidentData.line_id || 'L01',
      line_name: incidentData.line_name || 'Machining Line 1',
      incident_type: incidentData.incident_type || 'Unplanned Downtime',
      severity: incidentData.severity || 'Medium',
      failure_category: incidentData.failure_category || 'Mechanical',
      problem_description: incidentData.title || incidentData.problem_description || 'Operator reported issue',
      title: incidentData.title || 'Operational Anomaly',
      status: incidentData.status || 'Open',
      technician_name: incidentData.reported_by || 'Operations Team',
      reported_by: incidentData.reported_by || 'Operations Team',
      reported_at: new Date().toISOString(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      date: new Date().toISOString().split('T')[0],
      shift: incidentData.shift || 'A',
      downtime_minutes: Number(incidentData.downtime_minutes || 0),
      defect_units: Number(incidentData.defect_units || 0)
    };

    let createdInc = normalizeIncident(newIncidentRaw);
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await supabase.from('incidents').upsert(newIncidentRaw, { onConflict: 'id' }).select().single();
      if (!error && data) {
        createdInc = normalizeIncident(data);
        syncedToSupabase = true;
      } else if (error) {
        supabaseError = error.message;
      }
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.incidents.unshift(createdInc);
    db.persist();

    return { incident: createdInc, syncedToSupabase, supabaseError };
  },

  async updateIncident(id: string, updates: Partial<Incident>): Promise<{ incident: Incident | null; syncedToSupabase: boolean; supabaseError?: string }> {
    const updatePayload: any = {};
    if (updates.status) updatePayload.status = updates.status;
    if (updates.severity) updatePayload.severity = updates.severity;
    if (updates.title) updatePayload.title = updates.title;
    if (updates.downtime_minutes !== undefined) updatePayload.downtime_minutes = Number(updates.downtime_minutes);

    let updatedInc: Incident | null = null;
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await supabase
        .from('incidents')
        .update(updatePayload)
        .or(`incident_id.eq.${id},id.eq.${id}`)
        .select()
        .maybeSingle();

      if (!error && data) {
        updatedInc = normalizeIncident(data);
        syncedToSupabase = true;
      } else if (error) {
        supabaseError = error.message;
      }
    } catch (err: any) {
      supabaseError = err?.message;
    }

    const idx = db.incidents.findIndex(i => i.id === id || i.incident_id === id);
    if (idx !== -1) {
      db.incidents[idx] = { ...db.incidents[idx], ...updates };
      if (!updatedInc) updatedInc = db.incidents[idx];
      db.persist();
    }

    return { incident: updatedInc, syncedToSupabase, supabaseError };
  },

  async deleteIncident(id: string): Promise<{ success: boolean; syncedToSupabase: boolean; supabaseError?: string }> {
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { error } = await supabase.from('incidents').delete().or(`incident_id.eq.${id},id.eq.${id}`);
      if (!error) syncedToSupabase = true;
      else supabaseError = error.message;
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.incidents = db.incidents.filter(i => i.id !== id && i.incident_id !== id);
    db.persist();
    return { success: true, syncedToSupabase, supabaseError };
  },

  // Work Orders
  async getWorkOrders(filterLineId?: string): Promise<WorkOrder[]> {
    try {
      let query = supabase.from('work_orders').select('*').order('creation_timestamp', { ascending: false });
      if (filterLineId && filterLineId.startsWith('L0')) {
        query = query.eq('line_id', filterLineId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(normalizeWorkOrder);
      }
    } catch (err: any) {
      console.warn('[Supabase] Falling back to persistent work orders store:', err?.message);
    }

    let records = db.workOrders;
    if (filterLineId) {
      records = records.filter(w => w.line_id === filterLineId);
    }
    return records;
  },

  async createWorkOrder(woData: any, factoryId = 'FAC-001'): Promise<{ workOrder: WorkOrder; syncedToSupabase: boolean; supabaseError?: string }> {
    const rawId = woData.work_order_id || `WO-2026-${Date.now().toString().slice(-4)}`;
    const fId = woData.factory_id || factoryId || 'FAC-001';

    const newWoRaw: any = {
      id: rawId,
      work_order_id: rawId,
      factory_id: fId,
      machine_id: woData.machine_id || 'M001',
      machine_name: woData.machine_name || woData.machine_id || 'Machine Asset',
      line_id: woData.line_id || 'L01',
      line_name: woData.line_name || 'Machining Line 1',
      work_order_type: woData.work_order_type || 'Corrective',
      priority: woData.priority || 'Medium',
      status: 'Pending',
      title: woData.title || woData.problem_description || 'Work order task',
      technician_name: woData.assigned_to || 'Unassigned',
      assigned_to: woData.assigned_to || 'Unassigned',
      failure_category: woData.failure_category || 'Mechanical',
      problem_description: woData.title || woData.problem_description || 'Work order task',
      creation_timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      created_at: new Date().toISOString(),
      due_date: woData.due_date || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      start_time: woData.due_date || new Date().toISOString().replace('T', ' ').slice(0, 19),
      labor_hours: woData.estimated_hours || 2.0,
      estimated_hours: woData.estimated_hours || 2.0,
      parts_replaced: woData.parts_required || '',
      parts_required: woData.parts_required || '',
      service_provider: 'Internal Maintenance',
      duration_minutes: (woData.estimated_hours || 2.0) * 60,
      downtime_minutes: 0,
      labor_cost: (woData.estimated_hours || 2.0) * 600,
      parts_cost: 500,
      total_cost: (woData.estimated_hours || 2.0) * 600 + 500
    };

    let createdWo = normalizeWorkOrder(newWoRaw);
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await supabase.from('work_orders').upsert(newWoRaw, { onConflict: 'id' }).select().single();
      if (!error && data) {
        createdWo = normalizeWorkOrder(data);
        syncedToSupabase = true;
      } else if (error) {
        supabaseError = error.message;
      }
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.workOrders.unshift(createdWo);
    db.persist();

    return { workOrder: createdWo, syncedToSupabase, supabaseError };
  },

  async updateWorkOrder(id: string, updates: Partial<WorkOrder>): Promise<{ workOrder: WorkOrder | null; syncedToSupabase: boolean; supabaseError?: string }> {
    const updatePayload: any = {};
    if (updates.status) updatePayload.status = updates.status;
    if (updates.priority) updatePayload.priority = updates.priority;
    if (updates.assigned_to) {
      updatePayload.assigned_to = updates.assigned_to;
      updatePayload.technician_name = updates.assigned_to;
    }
    if (updates.actual_hours !== undefined) updatePayload.labor_hours = updates.actual_hours;
    if (updates.completed_at) updatePayload.end_time = updates.completed_at;

    let updatedWo: WorkOrder | null = null;
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await supabase
        .from('work_orders')
        .update(updatePayload)
        .or(`work_order_id.eq.${id},id.eq.${id}`)
        .select()
        .maybeSingle();

      if (!error && data) {
        updatedWo = normalizeWorkOrder(data);
        syncedToSupabase = true;
      } else if (error) {
        supabaseError = error.message;
      }
    } catch (err: any) {
      supabaseError = err?.message;
    }

    const idx = db.workOrders.findIndex(w => w.id === id || w.work_order_id === id);
    if (idx !== -1) {
      db.workOrders[idx] = { ...db.workOrders[idx], ...updates };
      if (!updatedWo) updatedWo = db.workOrders[idx];
      db.persist();
    }
    return { workOrder: updatedWo, syncedToSupabase, supabaseError };
  },

  async deleteWorkOrder(id: string): Promise<{ success: boolean; syncedToSupabase: boolean; supabaseError?: string }> {
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { error } = await supabase.from('work_orders').delete().or(`work_order_id.eq.${id},id.eq.${id}`);
      if (!error) syncedToSupabase = true;
      else supabaseError = error.message;
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.workOrders = db.workOrders.filter(w => w.id !== id && w.work_order_id !== id);
    db.persist();
    return { success: true, syncedToSupabase, supabaseError };
  },

  // Spare Parts Inventory
  async getSpareParts(factoryId = 'FAC-001'): Promise<SparePart[]> {
    try {
      const { data, error } = await supabase.from('spare_parts').select('*');
      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id || item.part_number,
          part_number: item.part_number || item.id,
          name: item.name || item.part_name || 'Spare Part',
          category: item.category || 'General',
          factory_id: item.factory_id || factoryId,
          stock_quantity: Number(item.stock_quantity ?? item.quantity ?? 0),
          min_reorder_level: Number(item.min_reorder_level ?? 5),
          unit_cost_usd: Number(item.unit_cost_usd ?? item.cost ?? 0),
          supplier: item.supplier || 'Standard Vendor',
          location_bin: item.location_bin || 'A-01-01',
          last_restocked_at: item.last_restocked_at,
          machine_compatibility: Array.isArray(item.machine_compatibility) ? item.machine_compatibility : [],
          created_at: item.created_at || new Date().toISOString()
        }));
      }
    } catch (err: any) {
      console.warn('[Supabase] Falling back to persistent spare parts store:', err?.message);
    }
    return db.spareParts;
  },

  async createSparePart(partData: Partial<SparePart>, factoryId = 'FAC-001'): Promise<{ part: SparePart; syncedToSupabase: boolean; supabaseError?: string }> {
    const rawId = partData.id || `PRT-${Date.now().toString().slice(-4)}`;
    const newPart: SparePart = {
      id: rawId,
      part_number: partData.part_number || `PN-${Date.now().toString().slice(-4)}`,
      name: partData.name || 'New Spare Part',
      category: partData.category || 'Mechanical',
      factory_id: partData.factory_id || factoryId,
      stock_quantity: Number(partData.stock_quantity ?? 0),
      min_reorder_level: Number(partData.min_reorder_level ?? 5),
      unit_cost_usd: Number(partData.unit_cost_usd ?? 0),
      supplier: partData.supplier || 'Approved Supplier',
      location_bin: partData.location_bin || 'A-01-01',
      last_restocked_at: new Date().toISOString(),
      machine_compatibility: partData.machine_compatibility || [],
      created_at: new Date().toISOString()
    };

    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await supabase.from('spare_parts').upsert(newPart, { onConflict: 'id' }).select().single();
      if (!error && data) {
        syncedToSupabase = true;
      } else if (error) {
        supabaseError = error.message;
      }
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.spareParts.unshift(newPart);
    db.persist();
    return { part: newPart, syncedToSupabase, supabaseError };
  },

  async updateSparePart(id: string, updates: Partial<SparePart>): Promise<{ part: SparePart | null; syncedToSupabase: boolean; supabaseError?: string }> {
    let updatedPart: SparePart | null = null;
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { data, error } = await supabase
        .from('spare_parts')
        .update(updates)
        .or(`id.eq.${id},part_number.eq.${id}`)
        .select()
        .maybeSingle();

      if (!error && data) {
        syncedToSupabase = true;
      } else if (error) {
        supabaseError = error.message;
      }
    } catch (err: any) {
      supabaseError = err?.message;
    }

    const idx = db.spareParts.findIndex(p => p.id === id || p.part_number === id);
    if (idx !== -1) {
      db.spareParts[idx] = { ...db.spareParts[idx], ...updates };
      updatedPart = db.spareParts[idx];
      db.persist();
    }

    return { part: updatedPart, syncedToSupabase, supabaseError };
  },

  async deleteSparePart(id: string): Promise<{ success: boolean; syncedToSupabase: boolean; supabaseError?: string }> {
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { error } = await supabase.from('spare_parts').delete().or(`id.eq.${id},part_number.eq.${id}`);
      if (!error) syncedToSupabase = true;
      else supabaseError = error.message;
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.spareParts = db.spareParts.filter(p => p.id !== id && p.part_number !== id);
    db.persist();
    return { success: true, syncedToSupabase, supabaseError };
  },

  // System Audit Logs
  async getSystemAuditLogs(): Promise<SystemAuditLog[]> {
    try {
      const { data, error } = await supabase.from('system_audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
      if (!error && data && data.length > 0) {
        return data as SystemAuditLog[];
      }
    } catch (err: any) {
      console.warn('[Supabase] Falling back to persistent system audit logs store:', err?.message);
    }
    return db.systemAuditLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  async createSystemAuditLog(log: Omit<SystemAuditLog, 'id' | 'timestamp'> & { timestamp?: string }): Promise<SystemAuditLog> {
    const newLog: SystemAuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      factory_id: log.factory_id || 'FAC-001',
      user_id: log.user_id,
      user_name: log.user_name,
      user_role: log.user_role,
      user_email: log.user_email,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      details: log.details,
      timestamp: log.timestamp || new Date().toISOString()
    };

    try {
      await supabase.from('system_audit_logs').insert(newLog);
    } catch (err: any) {
      console.warn('[Supabase] Could not sync system audit log to remote DB:', err?.message);
    }

    db.systemAuditLogs.unshift(newLog);
    if (db.systemAuditLogs.length > 500) {
      db.systemAuditLogs = db.systemAuditLogs.slice(0, 500);
    }
    db.persist();
    return newLog;
  },
  async getSOPs(_factoryId?: string): Promise<SOP[]> {
    try {
      const { data, error } = await supabase.from('sops').select('*');
      if (!error && data && data.length > 0) {
        return data as SOP[];
      }
    } catch {
      // Fall through to standard SOP documentation
    }
    return db.sops;
  },

  // Data Quality Metrics
  async getDataQuality(_factoryId?: string): Promise<DataQualityMetric[]> {
    try {
      const { data, error } = await supabase.from('data_quality_metrics').select('*');
      if (!error && data && data.length > 0) {
        return data as DataQualityMetric[];
      }
    } catch {
      // Fall through to standard DQ metrics
    }
    return db.dataQuality;
  },

  // Factories list
  async getFactories(): Promise<Factory[]> {
    return db.factories;
  },

  async getFactoryById(factoryId: string): Promise<Factory | null> {
    const list = await this.getFactories();
    return list.find(f => f.id === factoryId) || list[0] || null;
  },

  // Dynamic KPI calculations
  async calculateFactoryKPIs(factoryId: string): Promise<FactoryKPIs> {
    const existsInDb = db.factories.some(f => f.id === factoryId);
    if (existsInDb) {
      return db.calculateFactoryKPIs(factoryId);
    }
    return db.calculateFactoryKPIs('FAC-001');
  },

  async getSuperAdminOverview(): Promise<SuperAdminOverview> {
    return db.getSuperAdminOverview();
  },

  async getUsers(_factoryId?: string | null): Promise<User[]> {
    return db.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      factory_id: u.factory_id,
      factory_name: u.factory_name,
      status: u.status,
      created_at: u.created_at
    }));
  },

  async createUser(userData: any): Promise<{ user: User; syncedToSupabase: boolean; supabaseError?: string }> {
    const id = userData.id || `USR-${Date.now().toString().slice(-4)}`;
    const salt = 'default_salt';
    const password_hash = 'default_hash';
    const fId = userData.factory_id || 'FAC-001';
    const factory = db.factories.find(f => f.id === fId);

    const newUser: any = {
      id,
      name: userData.name,
      email: userData.email,
      password_hash,
      salt,
      role: userData.role,
      factory_id: fId,
      factory_name: factory?.name || 'Apex Precision Manufacturing',
      status: userData.status || 'active',
      created_at: new Date().toISOString()
    };

    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { error } = await supabase.from('users').upsert(newUser, { onConflict: 'id' });
      if (!error) syncedToSupabase = true;
      else supabaseError = error.message;
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.users.push(newUser);
    db.persist();

    const safeUser: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      factory_id: newUser.factory_id,
      factory_name: newUser.factory_name,
      status: newUser.status,
      created_at: newUser.created_at
    };

    return { user: safeUser, syncedToSupabase, supabaseError };
  },

  async deleteUser(id: string): Promise<{ success: boolean; syncedToSupabase: boolean; supabaseError?: string }> {
    let syncedToSupabase = false;
    let supabaseError: string | undefined;

    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (!error) syncedToSupabase = true;
      else supabaseError = error.message;
    } catch (err: any) {
      supabaseError = err?.message;
    }

    db.users = db.users.filter(u => u.id !== id);
    db.persist();
    return { success: true, syncedToSupabase, supabaseError };
  },

  // Synchronize entire persistent store to remote Supabase database
  async syncAllToSupabase(): Promise<{
    success: boolean;
    syncedCounts: Record<string, number>;
    errors: Record<string, string>;
  }> {
    const counts: Record<string, number> = {};
    const errors: Record<string, string> = {};

    // 1. Factories
    try {
      const { error } = await supabase.from('factories').upsert(db.factories, { onConflict: 'id' });
      if (error) errors.factories = error.message;
      else counts.factories = db.factories.length;
    } catch (e: any) {
      errors.factories = e?.message;
    }

    // 2. Users (sanitized for DB)
    try {
      const { error } = await supabase.from('users').upsert(db.users, { onConflict: 'id' });
      if (error) errors.users = error.message;
      else counts.users = db.users.length;
    } catch (e: any) {
      errors.users = e?.message;
    }

    // 3. Machines
    try {
      const rawMachines = db.machines.map(m => ({
        id: m.id || m.machine_id,
        factory_id: m.factory_id || 'FAC-001',
        machine_id: m.machine_id || m.id,
        name: m.name || m.machine_name,
        machine_name: m.machine_name || m.name,
        line: m.line || m.line_name,
        line_id: m.line_id || 'L01',
        line_name: m.line_name || m.line,
        station_number: m.station_number || 'ST-01',
        type: m.type || m.machine_type,
        machine_type: m.machine_type || m.type,
        status: m.status,
        health_score: m.health_score,
        temperature_c: m.temperature_c,
        vibration_mms: m.vibration_mms,
        pressure_bar: m.pressure_bar,
        speed_rpm: m.speed_rpm,
        oee: m.oee,
        operator: m.operator,
        manufacturer: m.manufacturer,
        model: m.model,
        serial_number: m.serial_number
      }));
      const { error } = await supabase.from('machines').upsert(rawMachines, { onConflict: 'id' });
      if (error) errors.machines = error.message;
      else counts.machines = rawMachines.length;
    } catch (e: any) {
      errors.machines = e?.message;
    }

    // 4. Work Orders
    try {
      const rawWo = db.workOrders.map(w => ({
        id: w.id || w.work_order_id,
        work_order_id: w.work_order_id || w.id,
        factory_id: w.factory_id || 'FAC-001',
        machine_id: w.machine_id,
        title: w.title,
        priority: w.priority,
        status: w.status,
        assigned_to: w.assigned_to,
        due_date: w.due_date || new Date().toISOString().split('T')[0],
        estimated_hours: w.estimated_hours || 2.0,
        labor_hours: w.labor_hours || 2.0,
        parts_required: w.parts_required || ''
      }));
      const { error } = await supabase.from('work_orders').upsert(rawWo, { onConflict: 'id' });
      if (error) errors.work_orders = error.message;
      else counts.work_orders = rawWo.length;
    } catch (e: any) {
      errors.work_orders = e?.message;
    }

    // 5. Incidents
    try {
      const rawInc = db.incidents.map(i => ({
        id: i.id || i.incident_id,
        incident_id: i.incident_id || i.id,
        factory_id: i.factory_id || 'FAC-001',
        machine_id: i.machine_id,
        title: i.title,
        severity: i.severity,
        status: i.status,
        reported_by: i.reported_by || 'Operations Team',
        reported_at: i.reported_at || new Date().toISOString(),
        date: i.date || new Date().toISOString().split('T')[0],
        shift: i.shift || 'A'
      }));
      const { error } = await supabase.from('incidents').upsert(rawInc, { onConflict: 'id' });
      if (error) errors.incidents = error.message;
      else counts.incidents = rawInc.length;
    } catch (e: any) {
      errors.incidents = e?.message;
    }

    // 6. Maintenance Records
    try {
      const rawMaint = db.maintenance.slice(0, 100).map(m => ({
        id: m.id || m.maintenance_id,
        maintenance_id: m.maintenance_id || m.id,
        factory_id: m.factory_id || 'FAC-001',
        machine_id: m.machine_id,
        machine_name: m.machine_name || m.machine_id,
        maintenance_type: m.maintenance_type || m.type || 'Preventive',
        priority: m.priority || 'Medium',
        status: m.status || 'Scheduled',
        technician_name: m.technician || m.technician_name || 'Staff Technician',
        problem_description: m.description || m.problem_description || 'Routine maintenance',
        duration_minutes: (m.downtime_hours || 1.5) * 60,
        downtime_minutes: (m.downtime_hours || 0) * 60,
        total_cost: m.cost_usd || 500,
        start_time: m.scheduled_date || new Date().toISOString()
      }));
      const { error } = await supabase.from('maintenance_records').upsert(rawMaint, { onConflict: 'id' });
      if (error) errors.maintenance_records = error.message;
      else counts.maintenance_records = rawMaint.length;
    } catch (e: any) {
      errors.maintenance_records = e?.message;
    }

    // 7. Production Records (matched to remote schema columns)
    try {
      const rawProd = db.production.slice(0, 100).map(p => ({
        id: p.id || p.production_id,
        production_id: p.production_id || p.id,
        factory_id: p.factory_id || 'FAC-001',
        machine_id: p.machine_id,
        timestamp: p.timestamp || new Date().toISOString(),
        date: p.date || (p.timestamp ? p.timestamp.split('T')[0] : new Date().toISOString().split('T')[0]),
        shift: p.shift || 'A',
        line_id: p.line_id || 'L01',
        product_id: p.product_id || 'PRD-101',
        product_name: p.product_name || 'Precision Component',
        planned_units: p.target_units ?? (p as any).planned_units ?? 100,
        actual_units: p.actual_units ?? 95,
        good_units: (p.actual_units ?? 95) - (p.defective_units ?? 0),
        defect_units: p.defective_units ?? (p as any).defect_units ?? 0,
        downtime_minutes: p.downtime_minutes ?? 0,
        target_cycle_time_seconds: p.target_cycle_time_seconds ?? 60,
        actual_cycle_time_seconds: p.cycle_time_sec ?? p.actual_cycle_time_seconds ?? 60,
        availability_percent: p.availability_percent ?? 95,
        performance_percent: p.performance_percent ?? 96,
        quality_percent: p.quality_percent ?? 98,
        oee_percent: p.oee_percent ?? 88,
        status: p.status || 'Running'
      }));
      const { error } = await supabase.from('production_records').upsert(rawProd, { onConflict: 'id' });
      if (error) errors.production_records = error.message;
      else counts.production_records = rawProd.length;
    } catch (e: any) {
      errors.production_records = e?.message;
    }

    // 8. SOPs
    try {
      const rawSops = db.sops.map(s => ({
        id: s.id,
        sop_id: s.id,
        factory_id: s.factory_id || 'FAC-001',
        title: s.title,
        machine_type: s.machine_type,
        category: s.category,
        version: s.version,
        last_updated: s.last_updated || new Date().toISOString().split('T')[0],
        author: s.author,
        steps: s.steps,
        safety_precautions: s.safety_precautions,
        target_audience: s.target_audience
      }));
      const { error } = await supabase.from('sops').upsert(rawSops, { onConflict: 'id' });
      if (error) errors.sops = error.message;
      else counts.sops = rawSops.length;
    } catch (e: any) {
      errors.sops = e?.message;
    }

    // 9. Data Quality Metrics
    try {
      const rawDq = db.dataQuality.map(d => ({
        id: d.id,
        factory_id: d.factory_id || 'FAC-001',
        sensor_name: d.sensor_name,
        machine_id: d.machine_id,
        uptime_percentage: d.uptime_percentage,
        data_completeness_pct: d.data_completeness_pct,
        latency_ms: d.latency_ms,
        anomalies_detected: d.anomalies_detected,
        status: d.status,
        last_sync: d.last_sync
      }));
      const { error } = await supabase.from('data_quality_metrics').upsert(rawDq, { onConflict: 'id' });
      if (error) errors.data_quality_metrics = error.message;
      else counts.data_quality_metrics = rawDq.length;
    } catch (e: any) {
      errors.data_quality_metrics = e?.message;
    }

    // 10. Spare Parts
    try {
      if (db.spareParts.length > 0) {
        const { error } = await supabase.from('spare_parts').upsert(db.spareParts, { onConflict: 'id' });
        if (error) errors.spare_parts = error.message;
        else counts.spare_parts = db.spareParts.length;
      }
    } catch (e: any) {
      errors.spare_parts = e?.message;
    }

    // 11. System Audit Logs
    try {
      if (db.systemAuditLogs.length > 0) {
        const { error } = await supabase.from('system_audit_logs').upsert(db.systemAuditLogs, { onConflict: 'id' });
        if (error) errors.system_audit_logs = error.message;
        else counts.system_audit_logs = db.systemAuditLogs.length;
      }
    } catch (e: any) {
      errors.system_audit_logs = e?.message;
    }

    const hasAnyError = Object.keys(errors).length > 0;
    return {
      success: !hasAnyError,
      syncedCounts: counts,
      errors
    };
  }
};

