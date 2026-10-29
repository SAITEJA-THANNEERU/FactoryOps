export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER_SUPERVISOR'
  | 'TECHNICIAN'
  | 'PRODUCTION_PLANNER'
  | 'FACTORY_OWNER'
  | 'FACTORY_MANAGER'
  | 'SUPERVISOR'
  | 'OPERATOR'
  | 'ANALYST';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  factory_id: string | null;
  factory_name?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Factory {
  id: string;
  factory_code: string;
  name: string;
  location: string;
  industry: string;
  owner_name: string;
  status: 'Operational' | 'Maintenance Alert' | 'Production Slowdown';
  capacity: string;
  established_year: number;
  created_at: string;
  machine_count?: number;
  running_count?: number;
  oee?: number;
  active_incidents?: number;
  open_work_orders?: number;
  last_activity?: string;
}

export type MachineStatus = 'running' | 'warning' | 'maintenance' | 'offline' | 'Active' | 'Maintenance' | 'Offline';

export interface Machine {
  // Database / CSV original columns
  machine_id: string;
  machine_name?: string;
  line_id?: string;
  line_name?: string;
  station_number?: string;
  machine_type?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  installation_date?: string;
  target_cycle_time_seconds?: number;
  rated_capacity_uph?: number;
  power_rating_kw?: number;
  maintenance_interval_days?: number;

  // Normalized application model properties
  id: string;
  factory_id?: string;
  name: string;
  type: string;
  line: string;
  status: MachineStatus;
  health_score: number;
  temperature_c: number;
  vibration_mms: number;
  pressure_bar: number;
  speed_rpm: number;
  oee: number;
  operator: string;
  install_date: string;
  last_service_date: string;
}

export type ShiftType = 'Morning' | 'Afternoon' | 'Night' | 'A' | 'B' | 'C' | string;

export interface ProductionRecord {
  // Database / CSV original columns
  production_id?: string;
  timestamp: string;
  date?: string;
  shift: ShiftType;
  line_id?: string;
  line_name?: string;
  machine_id: string;
  machine_name?: string;
  station_number?: string;
  product_id?: string;
  product_name?: string;
  planned_units?: number;
  actual_units: number;
  good_units?: number;
  defect_units?: number;
  planned_downtime_minutes?: number;
  unplanned_downtime_minutes?: number;
  downtime_minutes?: number;
  target_cycle_time_seconds?: number;
  actual_cycle_time_seconds?: number;
  availability_percent?: number;
  performance_percent?: number;
  quality_percent?: number;
  oee_percent?: number;
  changeover_minutes?: number;
  status?: string;
  operator_id?: string;
  operator_name?: string;
  remarks?: string;
  speed_rpm?: number;
  temperature_c?: number;
  vibration_mms?: number;

  // Normalized application model properties
  id: string;
  factory_id?: string;
  target_units: number;
  defective_units: number;
  scrap_kg: number;
  cycle_time_sec: number;
  operator: string;
}

export type MaintenanceType = 'Preventive' | 'Corrective' | 'Predictive' | 'Emergency' | 'Inspection' | 'Changeover Alignment' | 'Calibration' | string;
export type MaintenanceStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Pending Approval' | 'Cancelled' | string;

export interface MaintenanceRecord {
  // Database / CSV original columns
  maintenance_id?: string;
  machine_id: string;
  machine_name?: string;
  line_id?: string;
  line_name?: string;
  station_number?: string;
  start_time?: string;
  end_time?: string;
  maintenance_type?: MaintenanceType;
  priority?: string;
  technician_id?: string;
  technician_name?: string;
  failure_category?: string;
  problem_description?: string;
  root_cause?: string;
  action_taken?: string;
  duration_minutes?: number;
  downtime_minutes?: number;
  labor_hours?: number;
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
  parts_replaced?: string;
  work_order_id?: string;
  service_provider?: string;
  sign_off_by?: string;
  remarks?: string;
  logged_timestamp?: string;
  calculated_duration?: number;

  // Normalized application model properties
  id: string;
  factory_id?: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  scheduled_date: string;
  completed_date?: string;
  technician: string;
  description: string;
  cost_usd: number;
  downtime_hours: number;
}

export type IncidentSeverity = 'Critical' | 'High' | 'Medium' | 'Low' | string;
export type IncidentStatus = 'Open' | 'Investigating' | 'Resolved' | 'Closed' | string;

export interface Incident {
  // Database / CSV original columns
  incident_id?: string;
  production_id?: string;
  maintenance_id?: string;
  timestamp?: string;
  date?: string;
  shift?: string;
  line_id?: string;
  line_name?: string;
  machine_id: string;
  machine_name?: string;
  station_number?: string;
  product_id?: string;
  product_name?: string;
  incident_type?: string;
  failure_category?: string;
  problem_description?: string;
  root_cause?: string;
  action_taken?: string;
  downtime_minutes?: number;
  defect_units?: number;
  technician_id?: string;
  technician_name?: string;
  remarks?: string;

  // Normalized application model properties
  id: string;
  factory_id?: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reported_by: string;
  reported_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export type WorkOrderPriority = 'Critical' | 'High' | 'Medium' | 'Low' | string;
export type WorkOrderStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled' | string;

export interface WorkOrder {
  // Database / CSV original columns
  work_order_id?: string;
  maintenance_id?: string;
  incident_id?: string;
  production_id?: string;
  creation_timestamp?: string;
  start_time?: string;
  end_time?: string;
  work_order_type?: string;
  line_id?: string;
  line_name?: string;
  machine_id: string;
  machine_name?: string;
  station_number?: string;
  technician_id?: string;
  technician_name?: string;
  failure_category?: string;
  problem_description?: string;
  duration_minutes?: number;
  downtime_minutes?: number;
  labor_hours?: number;
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
  parts_replaced?: string;
  root_cause?: string;
  action_taken?: string;
  service_provider?: string;

  // Normalized application model properties
  id: string;
  factory_id?: string;
  title: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assigned_to: string;
  due_date: string;
  created_at: string;
  completed_at?: string;
  estimated_hours: number;
  actual_hours?: number;
  parts_required?: string;
}

export interface SOP {
  id: string;
  sop_id: string;
  factory_id: string;
  title: string;
  machine_type: string;
  category: 'Operating Procedure' | 'Safety Protocol' | 'Maintenance Guide' | 'Quality Inspection' | 'Maintenance & Setup' | string;
  version: string;
  last_updated: string;
  author: string;
  steps: string[];
  safety_precautions: string[];
  target_audience: string;
}

export interface DataQualityMetric {
  id: string;
  factory_id: string;
  sensor_name: string;
  machine_id: string;
  uptime_percentage: number;
  data_completeness_pct: number;
  latency_ms: number;
  anomalies_detected: number;
  status: 'Healthy' | 'Degraded' | 'Critical';
  last_sync: string;
}

export interface FactoryKPIs {
  factory_id: string;
  factory_name: string;
  total_machines: number;
  running_machines: number;
  warning_machines: number;
  maintenance_machines: number;
  offline_machines: number;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  total_production_units: number;
  target_production_units: number;
  defective_units: number;
  defect_rate_pct: number;
  downtime_hours: number;
  active_incidents: number;
  critical_incidents: number;
  open_work_orders: number;
  pending_maintenance: number;
  avg_health_score: number;
}

export interface SuperAdminOverview {
  total_factories: number;
  active_factories: number;
  total_users: number;
  total_machines: number;
  total_production: number;
  active_incidents: number;
  open_work_orders: number;
  overall_oee: number;
  overall_health: number;
  factories: (Factory & {
    kpis: FactoryKPIs;
  })[];
}

export interface AuthSession {
  token: string;
  user: User;
  factory?: Factory | null;
}

// Attendance & Geolocation Types
export interface FactoryLocation {
  id: string;
  factory_id: string;
  latitude: number;
  longitude: number;
  radius_meters: number; // 1000m (1 km)
  address?: string;
  updated_at: string;
  updated_by: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Pending';
export type AbsenceReason = 'Sick Leave' | 'Emergency' | 'Casual Leave' | 'Off-Site Duty' | 'Other';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  factory_id: string;
  attendance_date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  status: AttendanceStatus;
  check_in_time: string; // HH:mm:ss
  latitude: number | null;
  longitude: number | null;
  distance_meters: number | null;
  is_verified: boolean;
  verification_method: 'GPS_GEOFENCE' | 'MANUAL_AUDITED_EXCEPTION';
  verification_notes?: string;
  absence_reason?: AbsenceReason;
  absence_notes?: string;
  created_at: string;
}

export interface AttendanceAuditLog {
  id: string;
  attendance_id?: string;
  action: 'CHECK_IN' | 'ABSENCE_REPORT' | 'MANUAL_CORRECTION' | 'LOCATION_UPDATE';
  performed_by_id: string;
  performed_by_name: string;
  performed_by_role: UserRole;
  details: string;
  timestamp: string;
}

export interface AttendanceSummaryKPIs {
  totalExpected: number;
  presentToday: number;
  absentToday: number;
  attendanceRatePct: number;
  onTimeCheckIns: number;
}

export interface SparePart {
  id: string;
  part_number: string;
  name: string;
  category: string;
  factory_id: string;
  stock_quantity: number;
  min_reorder_level: number;
  unit_cost_usd: number;
  supplier: string;
  location_bin: string;
  last_restocked_at?: string;
  machine_compatibility?: string[];
  created_at?: string;
}

export interface SystemAuditLog {
  id: string;
  factory_id?: string;
  user_id: string;
  user_name: string;
  user_role: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: string;
  timestamp: string;
}

