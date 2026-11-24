import fs from 'fs';
import path from 'path';
import { db } from '../server/db.ts';

function escapeSql(str: any): string {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'number' || typeof str === 'boolean') return `${str}`;
  if (Array.isArray(str)) {
    const escapedItems = str.map(s => `"${String(s).replace(/"/g, '\\"')}"`).join(',');
    return `'${escapedItems}'::text[]`;
  }
  return `'${String(str).replace(/'/g, "''")}'`;
}

function generateSql(): string {
  let sql = `-- ======================================================================
-- FACTORYOPS SUPABASE DATABASE SCHEMA & INITIAL SEED
-- Multi-Factory Industrial Operations & Maintenance Platform
-- Run this script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ======================================================================

-- 1. CLEANUP (OPTIONAL: UNCOMMENT IF YOU WANT A COMPLETE FRESH RESET)
-- DROP TABLE IF EXISTS data_quality_metrics CASCADE;
-- DROP TABLE IF EXISTS sops CASCADE;
-- DROP TABLE IF EXISTS work_orders CASCADE;
-- DROP TABLE IF EXISTS incidents CASCADE;
-- DROP TABLE IF EXISTS maintenance_records CASCADE;
-- DROP TABLE IF EXISTS production_records CASCADE;
-- DROP TABLE IF EXISTS machines CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS factories CASCADE;

-- 2. CREATE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. FACTORIES TABLE
CREATE TABLE IF NOT EXISTS factories (
    id TEXT PRIMARY KEY,
    factory_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    industry TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Operational',
    capacity TEXT NOT NULL,
    established_year INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TEXT
);

-- 4. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    salt TEXT,
    role TEXT NOT NULL,
    factory_id TEXT REFERENCES factories(id) ON DELETE SET NULL,
    factory_name TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. MACHINES TABLE
CREATE TABLE IF NOT EXISTS machines (
    id TEXT PRIMARY KEY,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    machine_name TEXT,
    type TEXT NOT NULL,
    machine_type TEXT,
    line TEXT NOT NULL,
    line_id TEXT,
    line_name TEXT,
    station_number TEXT,
    manufacturer TEXT,
    model TEXT,
    serial_number TEXT,
    target_cycle_time_seconds NUMERIC(6,2),
    rated_capacity_uph NUMERIC(6,2),
    power_rating_kw NUMERIC(6,2),
    maintenance_interval_days NUMERIC(6,2),
    status TEXT NOT NULL DEFAULT 'running',
    health_score NUMERIC(5,2) NOT NULL DEFAULT 85.0,
    temperature_c NUMERIC(5,2) NOT NULL DEFAULT 65.0,
    vibration_mms NUMERIC(5,2) NOT NULL DEFAULT 2.0,
    pressure_bar NUMERIC(5,2) NOT NULL DEFAULT 6.0,
    speed_rpm NUMERIC(7,2) NOT NULL DEFAULT 1200,
    oee NUMERIC(5,2) NOT NULL DEFAULT 85.0,
    operator TEXT NOT NULL,
    install_date DATE,
    last_service_date DATE
);

-- 6. PRODUCTION RECORDS TABLE
CREATE TABLE IF NOT EXISTS production_records (
    id TEXT PRIMARY KEY,
    production_id TEXT,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL,
    machine_name TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    date TEXT,
    shift TEXT NOT NULL,
    line_id TEXT,
    line_name TEXT,
    station_number TEXT,
    product_id TEXT,
    product_name TEXT,
    target_units INTEGER NOT NULL,
    planned_units INTEGER,
    actual_units INTEGER NOT NULL,
    defective_units INTEGER NOT NULL DEFAULT 0,
    defect_units INTEGER DEFAULT 0,
    scrap_kg NUMERIC(8,2) NOT NULL DEFAULT 0.0,
    downtime_minutes NUMERIC(8,2) DEFAULT 0.0,
    speed_rpm NUMERIC(7,2),
    temperature_c NUMERIC(5,2),
    vibration_mms NUMERIC(5,2),
    cycle_time_sec NUMERIC(6,2) NOT NULL DEFAULT 45.0,
    operator TEXT NOT NULL,
    operator_id TEXT,
    operator_name TEXT,
    remarks TEXT
);

-- 7. MAINTENANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS maintenance_records (
    id TEXT PRIMARY KEY,
    maintenance_id TEXT,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL,
    machine_name TEXT,
    line_id TEXT,
    line_name TEXT,
    station_number TEXT,
    type TEXT NOT NULL,
    maintenance_type TEXT,
    status TEXT NOT NULL DEFAULT 'Scheduled',
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    start_time TEXT,
    end_time TEXT,
    technician TEXT NOT NULL,
    technician_id TEXT,
    technician_name TEXT,
    failure_category TEXT,
    problem_description TEXT,
    action_taken TEXT,
    parts_replaced TEXT,
    parts_cost NUMERIC(10,2) DEFAULT 0.0,
    labor_cost NUMERIC(10,2) DEFAULT 0.0,
    cost_usd NUMERIC(10,2) NOT NULL DEFAULT 0.0,
    total_cost NUMERIC(10,2) DEFAULT 0.0,
    downtime_minutes NUMERIC(8,2) DEFAULT 0.0,
    downtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0.0,
    description TEXT NOT NULL,
    logged_timestamp TEXT,
    calculated_duration TEXT
);

-- 8. INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL UNIQUE,
    production_id TEXT,
    maintenance_id TEXT,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL,
    machine_name TEXT,
    line_id TEXT,
    line_name TEXT,
    station_number TEXT,
    product_id TEXT,
    product_name TEXT,
    incident_type TEXT,
    severity TEXT NOT NULL DEFAULT 'Medium',
    failure_category TEXT,
    title TEXT NOT NULL,
    problem_description TEXT,
    description TEXT,
    root_cause TEXT,
    action_taken TEXT,
    downtime_minutes NUMERIC(8,2) DEFAULT 0.0,
    defect_units INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Open',
    reported_by TEXT NOT NULL,
    technician_id TEXT,
    technician_name TEXT,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    remarks TEXT
);

-- 9. WORK ORDERS TABLE
CREATE TABLE IF NOT EXISTS work_orders (
    id TEXT PRIMARY KEY,
    work_order_id TEXT NOT NULL UNIQUE,
    maintenance_id TEXT,
    incident_id TEXT,
    production_id TEXT,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    machine_id TEXT NOT NULL,
    machine_name TEXT,
    line_id TEXT,
    line_name TEXT,
    station_number TEXT,
    work_order_type TEXT,
    title TEXT NOT NULL,
    problem_description TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Pending',
    assigned_to TEXT NOT NULL,
    technician_id TEXT,
    technician_name TEXT,
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creation_timestamp TEXT,
    start_time TEXT,
    end_time TEXT,
    completed_at TIMESTAMPTZ,
    estimated_hours NUMERIC(5,2) NOT NULL DEFAULT 2.0,
    actual_hours NUMERIC(5,2),
    duration_minutes NUMERIC(8,2),
    downtime_minutes NUMERIC(8,2),
    labor_hours NUMERIC(5,2),
    labor_cost NUMERIC(10,2),
    parts_cost NUMERIC(10,2),
    total_cost NUMERIC(10,2),
    parts_required TEXT,
    parts_replaced TEXT,
    root_cause TEXT,
    action_taken TEXT,
    service_provider TEXT
);

-- 10. SOPS (STANDARD OPERATING PROCEDURES) TABLE
CREATE TABLE IF NOT EXISTS sops (
    id TEXT PRIMARY KEY,
    sop_id TEXT NOT NULL UNIQUE,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    machine_type TEXT NOT NULL,
    category TEXT NOT NULL,
    version TEXT NOT NULL,
    last_updated DATE NOT NULL,
    author TEXT NOT NULL,
    steps TEXT[] NOT NULL DEFAULT '{}',
    safety_precautions TEXT[] NOT NULL DEFAULT '{}',
    target_audience TEXT NOT NULL
);

-- 11. DATA QUALITY METRICS TABLE
CREATE TABLE IF NOT EXISTS data_quality_metrics (
    id TEXT PRIMARY KEY,
    factory_id TEXT NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    sensor_name TEXT NOT NULL,
    machine_id TEXT NOT NULL,
    uptime_percentage NUMERIC(5,2) NOT NULL DEFAULT 99.0,
    data_completeness_pct NUMERIC(5,2) NOT NULL DEFAULT 99.0,
    latency_ms INTEGER NOT NULL DEFAULT 25,
    anomalies_detected INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Healthy',
    last_sync TEXT NOT NULL
);

-- 12. CREATE OPTIMIZED INDEXES
CREATE INDEX IF NOT EXISTS idx_machines_factory ON machines(factory_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
CREATE INDEX IF NOT EXISTS idx_production_factory ON production_records(factory_id);
CREATE INDEX IF NOT EXISTS idx_production_machine ON production_records(machine_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_factory ON maintenance_records(factory_id);
CREATE INDEX IF NOT EXISTS idx_incidents_factory ON incidents(factory_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_factory ON work_orders(factory_id);
CREATE INDEX IF NOT EXISTS idx_sops_factory ON sops(factory_id);
CREATE INDEX IF NOT EXISTS idx_dq_factory ON data_quality_metrics(factory_id);

-- 13. CONFIGURE ROW LEVEL SECURITY (RLS) FOR API / ANON ACCESS
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Allow full access for anon key (all operations)
CREATE POLICY "Public full access to factories" ON factories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to machines" ON machines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to production" ON production_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to maintenance" ON maintenance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to incidents" ON incidents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to work_orders" ON work_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to sops" ON sops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public full access to data_quality" ON data_quality_metrics FOR ALL USING (true) WITH CHECK (true);

-- ======================================================================
-- 14. INITIAL SEED DATA
-- ======================================================================

`;

  // Seed Factories
  sql += `-- Seed Factories\n`;
  for (const f of db.factories) {
    sql += `INSERT INTO factories (id, factory_code, name, location, industry, owner_name, status, capacity, established_year, created_at, last_activity)
VALUES (${escapeSql(f.id)}, ${escapeSql(f.factory_code)}, ${escapeSql(f.name)}, ${escapeSql(f.location)}, ${escapeSql(f.industry)}, ${escapeSql(f.owner_name)}, ${escapeSql(f.status)}, ${escapeSql(f.capacity)}, ${f.established_year}, ${escapeSql(f.created_at)}, ${escapeSql(f.last_activity)})
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, status = EXCLUDED.status, last_activity = EXCLUDED.last_activity;\n`;
  }
  sql += `\n`;

  // Seed Users
  sql += `-- Seed Users\n`;
  for (const u of db.users) {
    sql += `INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES (${escapeSql(u.id)}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.password_hash)}, ${escapeSql(u.salt)}, ${escapeSql(u.role)}, ${escapeSql(u.factory_id)}, ${escapeSql(u.factory_name)}, ${escapeSql(u.status)}, ${escapeSql(u.created_at)})
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;\n`;
  }
  sql += `\n`;

  // Seed Machines
  sql += `-- Seed Machines (${db.machines.length} units)\n`;
  for (const m of db.machines) {
    sql += `INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES (${escapeSql(m.id)}, ${escapeSql(m.factory_id)}, ${escapeSql(m.machine_id)}, ${escapeSql(m.name)}, ${escapeSql(m.machine_name || m.name)}, ${escapeSql(m.type)}, ${escapeSql(m.machine_type || m.type)}, ${escapeSql(m.line)}, ${escapeSql(m.line_id || '')}, ${escapeSql(m.line_name || m.line)}, ${escapeSql(m.station_number || '')}, ${escapeSql(m.manufacturer || '')}, ${escapeSql(m.model || '')}, ${escapeSql(m.serial_number || '')}, ${escapeSql(m.status)}, ${m.health_score}, ${m.temperature_c}, ${m.vibration_mms}, ${m.pressure_bar}, ${m.speed_rpm}, ${m.oee}, ${escapeSql(m.operator)}, ${escapeSql(m.install_date)}, ${escapeSql(m.last_service_date)})
ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += `\n`;

  // Seed Incidents
  sql += `-- Seed Incidents\n`;
  for (const inc of db.incidents) {
    sql += `INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES (${escapeSql(inc.id)}, ${escapeSql(inc.incident_id)}, ${escapeSql(inc.production_id)}, ${escapeSql(inc.maintenance_id)}, ${escapeSql(inc.factory_id)}, ${escapeSql(inc.machine_id)}, ${escapeSql(inc.machine_name || inc.machine_id)}, ${escapeSql(inc.line_id || '')}, ${escapeSql(inc.line_name || '')}, ${escapeSql(inc.title)}, ${escapeSql(inc.problem_description || inc.title)}, ${escapeSql(inc.description)}, ${escapeSql(inc.severity)}, ${escapeSql(inc.failure_category || '')}, ${escapeSql(inc.status)}, ${escapeSql(inc.reported_by)}, ${escapeSql(inc.technician_name || inc.reported_by)}, ${escapeSql(inc.reported_at)}, ${escapeSql(inc.resolved_at)}, ${escapeSql(inc.root_cause)}, ${escapeSql(inc.action_taken)}, ${escapeSql(inc.resolution_notes)})
ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += `\n`;

  // Seed Work Orders
  sql += `-- Seed Work Orders\n`;
  for (const wo of db.workOrders) {
    sql += `INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES (${escapeSql(wo.id)}, ${escapeSql(wo.work_order_id)}, ${escapeSql(wo.maintenance_id)}, ${escapeSql(wo.incident_id)}, ${escapeSql(wo.production_id)}, ${escapeSql(wo.factory_id)}, ${escapeSql(wo.machine_id)}, ${escapeSql(wo.machine_name || wo.machine_id)}, ${escapeSql(wo.line_id || '')}, ${escapeSql(wo.line_name || '')}, ${escapeSql(wo.work_order_type || 'Corrective')}, ${escapeSql(wo.title)}, ${escapeSql(wo.problem_description || wo.title)}, ${escapeSql(wo.priority)}, ${escapeSql(wo.status)}, ${escapeSql(wo.assigned_to)}, ${escapeSql(wo.technician_name || wo.assigned_to)}, ${escapeSql(wo.due_date)}, ${escapeSql(wo.created_at)}, ${escapeSql(wo.completed_at)}, ${wo.estimated_hours}, ${escapeSql(wo.actual_hours)}, ${escapeSql(wo.parts_required)}, ${escapeSql(wo.failure_category || '')}, ${escapeSql(wo.action_taken || '')})
ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += `\n`;

  // Seed Maintenance Records
  sql += `-- Seed Maintenance Records\n`;
  for (const mr of db.maintenance) {
    sql += `INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES (${escapeSql(mr.id)}, ${escapeSql(mr.maintenance_id || mr.id)}, ${escapeSql(mr.factory_id)}, ${escapeSql(mr.machine_id)}, ${escapeSql(mr.machine_name || mr.machine_id)}, ${escapeSql(mr.line_id || '')}, ${escapeSql(mr.line_name || '')}, ${escapeSql(mr.type)}, ${escapeSql(mr.maintenance_type || mr.type)}, ${escapeSql(mr.status)}, ${escapeSql(mr.scheduled_date)}, ${escapeSql(mr.completed_date)}, ${escapeSql(mr.technician)}, ${escapeSql(mr.technician_name || mr.technician)}, ${escapeSql(mr.description)}, ${escapeSql(mr.problem_description || mr.description)}, ${mr.cost_usd}, ${mr.downtime_hours}, ${escapeSql(mr.failure_category || '')}, ${escapeSql(mr.action_taken || '')}, ${escapeSql(mr.parts_replaced || '')})
ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += `\n`;

  // Seed SOPs
  sql += `-- Seed SOPs\n`;
  for (const sop of db.sops) {
    const stepsArray = `{${sop.steps.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
    const safetyArray = `{${sop.safety_precautions.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
    sql += `INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES (${escapeSql(sop.id)}, ${escapeSql(sop.sop_id)}, ${escapeSql(sop.factory_id)}, ${escapeSql(sop.title)}, ${escapeSql(sop.machine_type)}, ${escapeSql(sop.category)}, ${escapeSql(sop.version)}, ${escapeSql(sop.last_updated)}, ${escapeSql(sop.author)}, '${stepsArray}', '${safetyArray}', ${escapeSql(sop.target_audience)})
ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += `\n`;

  // Seed Data Quality Metrics
  sql += `-- Seed Data Quality Metrics\n`;
  for (const dq of db.dataQuality) {
    sql += `INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES (${escapeSql(dq.id)}, ${escapeSql(dq.factory_id)}, ${escapeSql(dq.sensor_name)}, ${escapeSql(dq.machine_id)}, ${dq.uptime_percentage}, ${dq.data_completeness_pct}, ${dq.latency_ms}, ${dq.anomalies_detected}, ${escapeSql(dq.status)}, ${escapeSql(dq.last_sync)})
ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += `\n`;

  // Seed sample production records (limit to 300 to keep SQL light & fast)
  sql += `-- Seed Production Records\n`;
  const prodSample = db.production.slice(0, 300);
  for (const pr of prodSample) {
    sql += `INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES (${escapeSql(pr.id)}, ${escapeSql(pr.production_id || pr.id)}, ${escapeSql(pr.factory_id)}, ${escapeSql(pr.machine_id)}, ${escapeSql(pr.timestamp)}, ${escapeSql(pr.shift)}, ${pr.target_units}, ${pr.planned_units || pr.target_units}, ${pr.actual_units}, ${pr.defective_units}, ${pr.defect_units || pr.defective_units}, ${pr.scrap_kg}, ${pr.cycle_time_sec}, ${escapeSql(pr.operator)}, ${escapeSql(pr.operator_name || pr.operator)})
ON CONFLICT (id) DO NOTHING;\n`;
  }

  sql += `\n-- End of FactoryOps Schema and Seed Script\n`;
  return sql;
}

const outputPath = path.resolve(process.cwd(), 'supabase-schema.sql');
fs.writeFileSync(outputPath, generateSql(), 'utf-8');
console.log(`Generated ${outputPath} successfully.`);
