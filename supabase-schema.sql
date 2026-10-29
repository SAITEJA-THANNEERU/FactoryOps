-- ======================================================================
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

-- Seed Factories
INSERT INTO factories (id, factory_code, name, location, industry, owner_name, status, capacity, established_year, created_at, last_activity)
VALUES ('FAC-001', 'APX-01', 'Apex Precision Manufacturing', 'Hyderabad, Telangana', 'Automotive Components', 'Rajesh Kumar', 'Operational', '45,000 units/mo', 2014, '2023-01-15T08:00:00Z', '10 mins ago')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, status = EXCLUDED.status, last_activity = EXCLUDED.last_activity;
INSERT INTO factories (id, factory_code, name, location, industry, owner_name, status, capacity, established_year, created_at, last_activity)
VALUES ('FAC-002', 'NOV-02', 'Nova Industrial Systems', 'Pune, Maharashtra', 'Engineering Components', 'Vikram Malhotra', 'Operational', '38,000 units/mo', 2017, '2023-03-20T09:30:00Z', '25 mins ago')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, status = EXCLUDED.status, last_activity = EXCLUDED.last_activity;
INSERT INTO factories (id, factory_code, name, location, industry, owner_name, status, capacity, established_year, created_at, last_activity)
VALUES ('FAC-003', 'VTX-03', 'Vertex Auto Components', 'Chennai, Tamil Nadu', 'Automotive', 'Suresh Raman', 'Operational', '52,000 units/mo', 2011, '2023-05-10T10:15:00Z', '5 mins ago')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, status = EXCLUDED.status, last_activity = EXCLUDED.last_activity;
INSERT INTO factories (id, factory_code, name, location, industry, owner_name, status, capacity, established_year, created_at, last_activity)
VALUES ('FAC-004', 'PRM-04', 'PrimeTech Manufacturing', 'Bengaluru, Karnataka', 'Electronics', 'Ananya Sharma', 'Production Slowdown', '80,000 units/mo', 2019, '2023-08-01T11:00:00Z', '1 hour ago')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, status = EXCLUDED.status, last_activity = EXCLUDED.last_activity;
INSERT INTO factories (id, factory_code, name, location, industry, owner_name, status, capacity, established_year, created_at, last_activity)
VALUES ('FAC-005', 'ORN-05', 'Orion Industrial Works', 'Coimbatore, Tamil Nadu', 'Heavy Engineering', 'K. Swaminathan', 'Maintenance Alert', '25,000 units/mo', 2008, '2023-11-12T14:45:00Z', '40 mins ago')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, status = EXCLUDED.status, last_activity = EXCLUDED.last_activity;

-- Seed Users
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-001', 'Super Admin Officer', 'superadmin@factoryops.com', '1235f7e0c413849b4d9ad55a1850b2713326287b5c3e3b1d93da0dbba763554f99049c068244ba1da0b3651c5758257730cce0f167999dc8bd3ddb78f65c3cfa', 'eaa3d95487230eb7189dc3dbc8f022db', 'SUPER_ADMIN', NULL, NULL, 'active', '2026-10-28T10:52:48.015Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-002', 'Rajesh Kumar (Plant Admin)', 'admin.apex@factoryops.com', 'a27f915e7e4d0915ba4a7deb4d490083f0bbd27e0e58486eaec34d533f11ee4a9419143f1ec361bf30afae1c253d7bf7512c961b498cb1466eb1ea46b401517d', '72e0f10b7e152a0f91ee53c927656b43', 'ADMIN', 'FAC-001', 'Apex Precision Manufacturing', 'active', '2026-10-28T10:52:48.016Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-002L', 'Rajesh Kumar', 'owner.apex@factoryops.com', '745de18f0f6d473269a3863db9026c3a56eabccdfa242d2bede3cee2b24432e8a3e86e49e62d080a67f26895c7582c33747920db6dce74e87faafb6d18a4f599', '46d8632b21f3bc71729dacc0d07c045a', 'ADMIN', 'FAC-001', 'Apex Precision Manufacturing', 'active', '2026-10-28T10:52:48.017Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-003', 'Vikram Malhotra (Plant Admin)', 'admin.nova@factoryops.com', '39cd1dadfbe4176aacc85b43381a2691d1fd13e95c79df8c46237087fdb57e56665cfd9345a85de8442d8e8496ba0673f7624714b951e074554b46fa259e1b7b', '4a47aea51120e15aba1611e19dcbb0fd', 'ADMIN', 'FAC-002', 'Nova Industrial Systems', 'active', '2026-10-28T10:52:48.018Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-003L', 'Vikram Malhotra', 'owner.nova@factoryops.com', 'fc6135fdc668ad53f0e11a4900ae7b552117a02a1b00452f58aa48ffc7928e622d6f29fc63b450a7c0ef1ec6c67d21e5fbfc41f72b0785e8b222e1b15794247e', 'ff83352229fa2552009306b6537725d1', 'ADMIN', 'FAC-002', 'Nova Industrial Systems', 'active', '2026-10-28T10:52:48.019Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-004', 'Suresh Raman (Plant Admin)', 'admin.vertex@factoryops.com', '7c6d7e1cffb3ee959656435a8b204bec9697dcec24ed937ad24adf9e82be4ae855bbac31b84609c7de0a1b19ca53a1f11895e5a8dd2eff479587bf37c423e972', '6bcc73e8413ca68eb6dcc858fef4c41a', 'ADMIN', 'FAC-003', 'Vertex Auto Components', 'active', '2026-10-28T10:52:48.020Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-004L', 'Suresh Raman', 'owner.vertex@factoryops.com', '695e504a4edbc9723ec00e6e1bd7e70b77bcdaf711dce54c4ad85419c5f201eaad944df898f5b97ce8e72c1f449fa3cbbcf176d98b943e3f4b6864ace4fded61', '083eb97869030002177b161b9fcb0630', 'ADMIN', 'FAC-003', 'Vertex Auto Components', 'active', '2026-10-28T10:52:48.020Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-005', 'Ananya Sharma', 'owner.primetech@factoryops.com', '9b2d3545da32c8ab34b559b10e1dc53ab5882c9d1d5167b23b581ce96ca0387367bf760fe291117d95aaf57b1eda73eeaba748a0a194fa392f56698dad29c451', '865eb329993734f584231df42c1e6a04', 'ADMIN', 'FAC-004', 'PrimeTech Manufacturing', 'active', '2026-10-28T10:52:48.021Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-006', 'K. Swaminathan', 'owner.orion@factoryops.com', '0c5abad7c94ee080feaeb4dd7f4d6854e55ef3a723fae55b2aea1464fa1077f59efb044df7e806956e477c7aeaca04d0017cbcaf212cd811b942651b28414d2a', '7b6dcbaff36633d11a9734cc9ad0292c', 'ADMIN', 'FAC-005', 'Orion Industrial Works', 'active', '2026-10-28T10:52:48.022Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-007', 'Amit Deshmukh (Manager/Supervisor)', 'manager.apex@factoryops.com', '54979ec66ddf0699ea4761daff0f05328fd37e2a78a9435208a44284f52543921aff42183874b36f4df06f41c22cdacfc5761363849bec63869550ea7786013e', '5e1047bc9504952b3c3ca8ec6a2edc73', 'MANAGER_SUPERVISOR', 'FAC-001', 'Apex Precision Manufacturing', 'active', '2026-10-28T10:52:48.023Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-008', 'Neha Joshi (Manager/Supervisor)', 'manager.nova@factoryops.com', 'acd5e19c842988be82cbf01e2ced19d48122865497b48315a194d87580980c133b066e8d681d1bff75cf2ae50aa6b699b4792d31b49f0c81c749afe057016a85', 'd525495a2ab187814df95b1df8a5a1e0', 'MANAGER_SUPERVISOR', 'FAC-002', 'Nova Industrial Systems', 'active', '2026-10-28T10:52:48.024Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-009', 'Karthik Raja (Manager/Supervisor)', 'manager.vertex@factoryops.com', '3307194c56483af6c55fb091182bf7ce53d4b9480cf651b18a2ff949b25f193bbce21283de4a1e66f404f5b76cbe52c697ab8a06de4cb6c1d56975d1785ba557', '6e8b3a4aed96ba3dfe8f77b155fb6d00', 'MANAGER_SUPERVISOR', 'FAC-003', 'Vertex Auto Components', 'active', '2026-10-28T10:52:48.025Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-010', 'Rahul Hegde', 'manager.primetech@factoryops.com', '411e9607b44e6e1cdea1722b6529770e74858c0f0463553c897595460a68dd3cd26e12ceb8563f93434f89f1d906250cf9d0b7937dc5cad53ae843a423ace25a', 'a7e4deb1de4ec40f0d3f12f8b5921e70', 'MANAGER_SUPERVISOR', 'FAC-004', 'PrimeTech Manufacturing', 'active', '2026-10-28T10:52:48.025Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-011', 'Manoj Pillai', 'manager.orion@factoryops.com', 'e7bd349d096b441405b310496e5924c8fe2051aa7d3e99897ac07bddd3fc5e82133556948fd440589cc690662886882438f0598eb6a4a4776d39115ba6745c61', '1f85cd6cdab2addcc9dc33df3fb915c3', 'MANAGER_SUPERVISOR', 'FAC-005', 'Orion Industrial Works', 'active', '2026-10-28T10:52:48.026Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-012', 'Ramesh Varma (Senior Technician)', 'tech.apex@factoryops.com', '49a2a80c8265dea554e608d6fb12d22559712cac91d59d6462a3f576acbb537bca7a23f1a884f52594dd6afa50f53231701f3c440b8f959dd0d918c9511f76ec', '2f47502b41352397227bda79260468e7', 'TECHNICIAN', 'FAC-001', 'Apex Precision Manufacturing', 'active', '2026-10-28T10:52:48.027Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-013', 'Anil Sharma (Technician)', 'tech.nova@factoryops.com', '1dec7048bff009f09ba8e054090682393d4b948b14e55945f74add89f4afddb46c20c92a43ecf45b22396a3c145743e4b46603883fc5ce1b3cac0d9a8825352c', '40ae39456fa3da5e82051d91ca1e0600', 'TECHNICIAN', 'FAC-002', 'Nova Industrial Systems', 'active', '2026-10-28T10:52:48.028Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-014', 'Praveen Nair (Technician)', 'tech.vertex@factoryops.com', 'bc60206680a649bda068881e5fc77cd3a3e138313a85de1027c6b92a1ce1b253a9f358717a547ba777239e7bde94837ce79e6d90709c73fc7a6659d498a1d0a7', '3d8d9aa78facd7073444fadee34b7bb9', 'TECHNICIAN', 'FAC-003', 'Vertex Auto Components', 'active', '2026-10-28T10:52:48.028Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-015', 'Priya Sundaram (Production Planner)', 'planner.apex@factoryops.com', 'cec33c59633db789592c3b57c2c4c72d9b224b7e8a076796fb0053fdf05f6b632d7cd4416de19d0c889553b97035f1652c52dd3516fee2e8b6c6dbd776da9263', '54ec85fff189457cf5d1102d469805d3', 'PRODUCTION_PLANNER', 'FAC-001', 'Apex Precision Manufacturing', 'active', '2026-10-28T10:52:48.029Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-016', 'Siddharth Rao (Production Planner)', 'planner.nova@factoryops.com', '831e1173a1f29dd5abea09e6784495542ac9ddb39427d53bd79c8d5f60d70ebe043d23e7f2c843aa2d618fc4ec22f11ddf6b97a83ed854b570ef23aa424152a9', '896db0d0047accade5861f5e99283a8e', 'PRODUCTION_PLANNER', 'FAC-002', 'Nova Industrial Systems', 'active', '2026-10-28T10:52:48.030Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;
INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES ('USR-017', 'Deepa Krishnan (Production Planner)', 'planner.vertex@factoryops.com', '998cda06450de1860757921209bc1d0bc99fce4dc892a83e5d213035bdae17f66753f6179043a76d60f245242b4fd250a50d1491092796789fb1ec993df40875', 'a6b2b033b2835b8fa859dc8df790ea48', 'PRODUCTION_PLANNER', 'FAC-003', 'Vertex Auto Components', 'active', '2026-10-28T10:52:48.031Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, role = EXCLUDED.role, factory_id = EXCLUDED.factory_id;

-- Seed Machines (90 units)
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M020', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'Electrostatic Powder Coating Booth 01', 'Powder Coating Booth', 'Powder Coating Booth', 'Coating & Packaging Line 4', 'L04', 'Coating & Packaging Line 4', 'ST-02', 'Gema', 'MagicCompact', 'SN-L04-M020-2022', 'running', 83.8, 60, 2.7, 6.5, 1200, 92, 'Line Operator', '2022-11-12', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M017', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'Shot Blasting Chamber 01', 'Surface Shot Blaster', 'Surface Shot Blaster', 'Welding Line 3', 'L03', 'Welding Line 3', 'ST-05', 'Rösler', 'RWT-600', 'SN-L03-M017-2023', 'running', 91.9, 72.9, 1.4, 6.5, 1400, 92, 'Line Operator', '2023-03-05', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M015', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'Automated Resistance Spot Welder 01', 'Spot Welding Gantry', 'Spot Welding Gantry', 'Welding Line 3', 'L03', 'Welding Line 3', 'ST-03', 'ARO', 'Ergoflex 150', 'SN-L03-M015-2023', 'running', 82.3, 65.5, 3, 5.5, 1200, 84, 'Line Operator', '2023-02-01', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M013', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'Robotic MIG Welding Cell 01', 'Articulated Robot Welder', 'Articulated Robot Welder', 'Welding Line 3', 'L03', 'Welding Line 3', 'ST-01', 'Fanuc', 'ARC Mate 120iD', 'SN-L03-M013-2023', 'running', 87.7, 58.1, 2.1, 6, 1500, 88, 'Line Operator', '2023-01-10', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M012', 'FAC-001', 'M012', '3D Optical Scanner Station 01', '3D Optical Scanner Station 01', 'Optical Surface Scanner', 'Optical Surface Scanner', 'Stamping Line 2', 'L02', 'Stamping Line 2', 'ST-06', 'GOM', 'ATOS Q', 'SN-L02-M012-2021', 'running', 85.3, 78.4, 1.6, 5.5, 1400, 84, 'Line Operator', '2021-10-12', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M018', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'Laser Ultrasonic Weld Inspector 01', 'NDT Weld Inspection System', 'NDT Weld Inspection System', 'Welding Line 3', 'L03', 'Welding Line 3', 'ST-06', 'Olympus', 'OmniScan X3', 'SN-L03-M018-2023', 'running', 86.8, 76.6, 1.8, 5.5, 1500, 84, 'Line Operator', '2023-03-20', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M007', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'Hydraulic Stamping Press 01', 'Servo Hydraulic Press', 'Servo Hydraulic Press', 'Stamping Line 2', 'L02', 'Stamping Line 2', 'ST-01', 'Schuler', 'MSD-250', 'SN-L02-M007-2021', 'running', 88.9, 59.9, 1.9, 6, 1400, 88, 'Line Operator', '2021-08-10', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M004', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'Precision Cylindrical Grinder 01', 'CNC Cylindrical Grinder', 'CNC Cylindrical Grinder', 'Machining Line 1', 'L01', 'Machining Line 1', 'ST-04', 'Studer', 'S33 CNC', 'SN-L01-M004-2022', 'running', 82, 72.8, 3, 6, 1600, 88, 'Line Operator', '2022-04-12', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M014', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'Robotic MIG Welding Cell 02', 'Articulated Robot Welder', 'Articulated Robot Welder', 'Welding Line 3', 'L03', 'Welding Line 3', 'ST-02', 'ABB', 'IRB 1600ID', 'SN-L03-M014-2023', 'running', 85, 61.8, 2.5, 6.5, 1600, 92, 'Line Operator', '2023-01-15', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M006', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'Automated CMM Inspection Cell 01', 'Coordinate Measuring Machine', 'Coordinate Measuring Machine', 'Machining Line 1', 'L01', 'Machining Line 1', 'ST-06', 'Zeiss', 'DuraMax 500', 'SN-L01-M006-2022', 'running', 83.8, 80.2, 1.4, 5.5, 1300, 84, 'Line Operator', '2022-05-15', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M011', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'Sheet Edge Finishing Machine 01', 'Edge Deburrer & Beveler', 'Edge Deburrer & Beveler', 'Stamping Line 2', 'L02', 'Stamping Line 2', 'ST-05', 'Timesavers', '22-Series', 'SN-L02-M011-2021', 'running', 78.1, 74.7, 3.7, 6.5, 1300, 92, 'Line Operator', '2021-10-01', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M024', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'End-of-Line Palletizer Cell 01', 'Robotic Case Palletizer', 'Robotic Case Palletizer', 'Coating & Packaging Line 4', 'L04', 'Coating & Packaging Line 4', 'ST-06', 'Fanuc', 'M-410iC/185', 'SN-L04-M024-2022', 'running', 88, 74.8, 2, 5.5, 1600, 84, 'Line Operator', '2022-12-22', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M016', 'FAC-001', 'M016', 'Pneumatic Assembly Fixture 01', 'Pneumatic Assembly Fixture 01', 'Assembly Clamping Cell', 'Assembly Clamping Cell', 'Welding Line 3', 'L03', 'Welding Line 3', 'ST-04', 'KUKA', 'KR 16 R2010', 'SN-L03-M016-2023', 'running', 79.6, 69.2, 3.4, 6, 1300, 88, 'Line Operator', '2023-02-18', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M019', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'Automated 5-Stage Chemical Wash 01', 'Pre-Treatment Wash System', 'Pre-Treatment Wash System', 'Coating & Packaging Line 4', 'L04', 'Coating & Packaging Line 4', 'ST-01', 'Eisenmann', 'VarioClean 5', 'SN-L04-M019-2022', 'running', 78.6, 80.3, 2.3, 6, 1600, 88, 'Line Operator', '2022-11-05', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M003', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'Multi-Spindle Drilling Machine 01', 'Drilling & Tapping Machine', 'Drilling & Tapping Machine', 'Machining Line 1', 'L01', 'Machining Line 1', 'ST-03', 'Brother', 'Speedio S700', 'SN-L01-M003-2022', 'running', 84.7, 69.1, 2.6, 5.5, 1500, 84, 'Line Operator', '2022-04-05', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M005', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'Thermal Deburring Station 01', 'Deburring System', 'Deburring System', 'Machining Line 1', 'L01', 'Machining Line 1', 'ST-05', 'Extrude Hone', 'TEM-800', 'SN-L01-M005-2022', 'running', 77.1, 76.5, 3.5, 6.5, 1200, 92, 'Line Operator', '2022-05-01', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M010', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'High-Speed Turret Punch 01', 'Turret Punch Press', 'Turret Punch Press', 'Stamping Line 2', 'L02', 'Stamping Line 2', 'ST-04', 'Prima Power', 'Punch Genius', 'SN-L02-M010-2021', 'running', 80.8, 71, 3.2, 6, 1200, 88, 'Line Operator', '2021-09-15', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M008', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'Fiber Laser Cutting System 01', 'Fiber Laser Cutter', 'Fiber Laser Cutter', 'Stamping Line 2', 'L02', 'Stamping Line 2', 'ST-02', 'Trumpf', 'TruLaser 3030', 'SN-L02-M008-2021', 'running', 86.2, 63.6, 2.3, 6.5, 1500, 92, 'Line Operator', '2021-08-18', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M001', 'FAC-001', 'M001', 'CNC Turning Center 01', 'CNC Turning Center 01', 'CNC Lathe', 'CNC Lathe', 'Machining Line 1', 'L01', 'Machining Line 1', 'ST-01', 'DMG MORI', 'CTX beta 800', 'SN-L01-M001-2022', 'running', 90.1, 61.7, 1.7, 6, 1300, 88, 'Line Operator', '2022-03-15', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M002', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'Vertical Machining Center 01', '5-Axis Milling Machine', '5-Axis Milling Machine', 'Machining Line 1', 'L01', 'Machining Line 1', 'ST-02', 'Mazak', 'Variaxis i-700', 'SN-L01-M002-2022', 'running', 87.4, 65.4, 2.1, 6.5, 1400, 92, 'Line Operator', '2022-03-20', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M023', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'Protective Film Laminating Unit 01', 'Surface Laminator', 'Surface Laminator', 'Coating & Packaging Line 4', 'L04', 'Coating & Packaging Line 4', 'ST-05', 'Walco', '60A Series', 'SN-L04-M023-2022', 'running', 90.7, 71.1, 1.5, 6.5, 1500, 92, 'Line Operator', '2022-12-15', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M022', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'Multi-Head Automatic Riveter 01', 'Automated Riveting System', 'Automated Riveting System', 'Coating & Packaging Line 4', 'L04', 'Coating & Packaging Line 4', 'ST-04', 'BalTec', 'RNE 381', 'SN-L04-M022-2022', 'running', 78.4, 67.4, 3.6, 6, 1400, 88, 'Line Operator', '2022-12-02', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M021', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'Infrared Convection Curing Tunnel 01', 'Thermal Curing Tunnel', 'Thermal Curing Tunnel', 'Coating & Packaging Line 4', 'L04', 'Coating & Packaging Line 4', 'ST-03', 'Dürr', 'EcoInfrarot', 'SN-L04-M021-2022', 'running', 81.1, 63.7, 3.2, 5.5, 1300, 84, 'Line Operator', '2022-11-20', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M009', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'CNC Hydraulic Press Brake 01', 'CNC Press Brake', 'CNC Press Brake', 'Stamping Line 2', 'L02', 'Stamping Line 2', 'ST-03', 'Amada', 'HG-1003', 'SN-L02-M009-2021', 'running', 83.5, 67.3, 2.8, 5.5, 1600, 84, 'Line Operator', '2021-09-02', '2026-09-15')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B1', 'FAC-002', 'NOV-MIL-01', 'Vertical Machining Center #1', 'Vertical Machining Center #1', 'Vertical Machining Center', 'Vertical Machining Center', 'Turbine Blades Line 1', '', 'Turbine Blades Line 1', '', '', '', '', 'running', 87, 66.8, 2.4, 6.4, 1280, 84.5, 'Sunil M.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B2', 'FAC-002', 'NOV-MIL-02', 'Vertical Machining Center #2', 'Vertical Machining Center #2', 'Vertical Machining Center', 'Vertical Machining Center', 'Turbine Blades Line 1', '', 'Turbine Blades Line 1', '', '', '', '', 'running', 86, 68.6, 2.6, 6.7, 1360, 87, 'Prashant T.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B3', 'FAC-002', 'NOV-MIL-03', 'Vertical Machining Center #3', 'Vertical Machining Center #3', 'Vertical Machining Center', 'Vertical Machining Center', 'Turbine Blades Line 1', '', 'Turbine Blades Line 1', '', '', '', '', 'running', 85, 70.4, 2.9, 6.1, 1440, 82.5, 'Sneha R.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B4', 'FAC-002', 'NOV-MIL-04', 'Vertical Machining Center #4', 'Vertical Machining Center #4', 'Vertical Machining Center', 'Vertical Machining Center', 'Turbine Blades Line 1', '', 'Turbine Blades Line 1', '', '', '', '', 'warning', 73, 79.4, 3.9, 6.4, 1520, 78.1, 'Vinod B.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B5', 'FAC-002', 'NOV-MIL-05', 'Vertical Machining Center #5', 'Vertical Machining Center #5', 'Vertical Machining Center', 'Vertical Machining Center', 'Turbine Blades Line 1', '', 'Turbine Blades Line 1', '', '', '', '', 'running', 83, 74, 3.4, 6.7, 1200, 87.5, 'Sunil M.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B6', 'FAC-002', 'NOV-MIL-06', 'Vertical Machining Center #6', 'Vertical Machining Center #6', 'Vertical Machining Center', 'Vertical Machining Center', 'Turbine Blades Line 1', '', 'Turbine Blades Line 1', '', '', '', '', 'running', 88, 75.8, 3.6, 6.1, 1280, 83, 'Prashant T.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B7', 'FAC-002', 'NOV-LTH-01', 'Heavy Duty CNC Lathe #1', 'Heavy Duty CNC Lathe #1', 'Heavy Duty CNC Lathe', 'Heavy Duty CNC Lathe', 'Heavy Gearboxes Line 2', '', 'Heavy Gearboxes Line 2', '', '', '', '', 'running', 87, 77.6, 3.9, 6.4, 1360, 85.5, 'Sneha R.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B8', 'FAC-002', 'NOV-LTH-02', 'Heavy Duty CNC Lathe #2', 'Heavy Duty CNC Lathe #2', 'Heavy Duty CNC Lathe', 'Heavy Duty CNC Lathe', 'Heavy Gearboxes Line 2', '', 'Heavy Gearboxes Line 2', '', '', '', '', 'running', 86, 79.4, 2.3, 6.7, 1440, 88, 'Vinod B.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B9', 'FAC-002', 'NOV-LTH-03', 'Heavy Duty CNC Lathe #3', 'Heavy Duty CNC Lathe #3', 'Heavy Duty CNC Lathe', 'Heavy Duty CNC Lathe', 'Heavy Gearboxes Line 2', '', 'Heavy Gearboxes Line 2', '', '', '', '', 'warning', 75, 81.2, 4.2, 6.1, 1520, 75.8, 'Sunil M.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B10', 'FAC-002', 'NOV-LTH-04', 'Heavy Duty CNC Lathe #4', 'Heavy Duty CNC Lathe #4', 'Heavy Duty CNC Lathe', 'Heavy Duty CNC Lathe', 'Heavy Gearboxes Line 2', '', 'Heavy Gearboxes Line 2', '', '', '', '', 'running', 84, 65, 2.8, 6.4, 1200, 86, 'Prashant T.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B11', 'FAC-002', 'NOV-LTH-05', 'Heavy Duty CNC Lathe #5', 'Heavy Duty CNC Lathe #5', 'Heavy Duty CNC Lathe', 'Heavy Duty CNC Lathe', 'Heavy Gearboxes Line 2', '', 'Heavy Gearboxes Line 2', '', '', '', '', 'running', 83, 66.8, 3.1, 6.7, 1280, 88.5, 'Sneha R.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B12', 'FAC-002', 'NOV-LTH-06', 'Heavy Duty CNC Lathe #6', 'Heavy Duty CNC Lathe #6', 'Heavy Duty CNC Lathe', 'Heavy Duty CNC Lathe', 'Heavy Gearboxes Line 2', '', 'Heavy Gearboxes Line 2', '', '', '', '', 'running', 88, 68.6, 3.3, 6.1, 1360, 84, 'Vinod B.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B13', 'FAC-002', 'NOV-GRD-01', 'Cylindrical Surface Grinder #1', 'Cylindrical Surface Grinder #1', 'Cylindrical Surface Grinder', 'Cylindrical Surface Grinder', 'Precision Shafts Line 3', '', 'Precision Shafts Line 3', '', '', '', '', 'running', 87, 70.4, 3.6, 6.4, 1440, 86.5, 'Sunil M.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B14', 'FAC-002', 'NOV-GRD-02', 'Cylindrical Surface Grinder #2', 'Cylindrical Surface Grinder #2', 'Cylindrical Surface Grinder', 'Cylindrical Surface Grinder', 'Precision Shafts Line 3', '', 'Precision Shafts Line 3', '', '', '', '', 'warning', 70, 83.5, 4.4, 6.7, 1520, 74.2, 'Prashant T.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B15', 'FAC-002', 'NOV-GRD-03', 'Cylindrical Surface Grinder #3', 'Cylindrical Surface Grinder #3', 'Cylindrical Surface Grinder', 'Cylindrical Surface Grinder', 'Precision Shafts Line 3', '', 'Precision Shafts Line 3', '', '', '', '', 'running', 85, 74, 2.3, 6.1, 1200, 84.5, 'Sneha R.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B16', 'FAC-002', 'NOV-GRD-04', 'Cylindrical Surface Grinder #4', 'Cylindrical Surface Grinder #4', 'Cylindrical Surface Grinder', 'Cylindrical Surface Grinder', 'Precision Shafts Line 3', '', 'Precision Shafts Line 3', '', '', '', '', 'running', 84, 75.8, 2.5, 6.4, 1280, 87, 'Vinod B.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B17', 'FAC-002', 'NOV-ASM-01', 'Robotic Gearbox Assembly Station #1', 'Robotic Gearbox Assembly Station #1', 'Robotic Gearbox Assembly Station', 'Robotic Gearbox Assembly Station', 'Heavy Gearboxes Line 2', '', 'Heavy Gearboxes Line 2', '', '', '', '', 'running', 83, 77.6, 2.8, 6.7, 1360, 82.5, 'Sunil M.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-B18', 'FAC-002', 'NOV-ASM-02', 'Robotic Gearbox Assembly Station #2', 'Robotic Gearbox Assembly Station #2', 'Robotic Gearbox Assembly Station', 'Robotic Gearbox Assembly Station', 'Heavy Gearboxes Line 2', '', 'Heavy Gearboxes Line 2', '', '', '', '', 'maintenance', 54, 38, 0.2, 6.1, 1440, 0, 'Prashant T.', '2020-08-19', '2026-09-12')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C1', 'FAC-003', 'VTX-STP-01', 'Progressive Stamping Press #1', 'Progressive Stamping Press #1', 'Progressive Stamping Press', 'Progressive Stamping Press', 'Body Shop Line', '', 'Body Shop Line', '', '', '', '', 'running', 93, 56, 1.6, 5.5, 1500, 91.5, 'Murugan C.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C2', 'FAC-003', 'VTX-STP-02', 'Progressive Stamping Press #2', 'Progressive Stamping Press #2', 'Progressive Stamping Press', 'Progressive Stamping Press', 'Body Shop Line', '', 'Body Shop Line', '', '', '', '', 'running', 92, 57, 1.8, 5.5, 1500, 93, 'Jayanthi S.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C3', 'FAC-003', 'VTX-STP-03', 'Progressive Stamping Press #3', 'Progressive Stamping Press #3', 'Progressive Stamping Press', 'Progressive Stamping Press', 'Body Shop Line', '', 'Body Shop Line', '', '', '', '', 'running', 91, 58, 2, 5.5, 1500, 94.5, 'Venkatesh P.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C4', 'FAC-003', 'VTX-STP-04', 'Progressive Stamping Press #4', 'Progressive Stamping Press #4', 'Progressive Stamping Press', 'Progressive Stamping Press', 'Body Shop Line', '', 'Body Shop Line', '', '', '', '', 'running', 90, 59, 2.2, 5.5, 1500, 91, 'Murugan C.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C5', 'FAC-003', 'VTX-STP-05', 'Progressive Stamping Press #5', 'Progressive Stamping Press #5', 'Progressive Stamping Press', 'Progressive Stamping Press', 'Body Shop Line', '', 'Body Shop Line', '', '', '', '', 'running', 94, 60, 1.4, 5.5, 1500, 92.5, 'Jayanthi S.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C6', 'FAC-003', 'VTX-ROB-01', 'Spot Welding Robot #1', 'Spot Welding Robot #1', 'Spot Welding Robot', 'Spot Welding Robot', 'Body Shop Line', '', 'Body Shop Line', '', '', '', '', 'warning', 77, 61, 1.6, 5.5, 1500, 83.2, 'Venkatesh P.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C7', 'FAC-003', 'VTX-ROB-02', 'Spot Welding Robot #2', 'Spot Welding Robot #2', 'Spot Welding Robot', 'Spot Welding Robot', 'Body Shop Line', '', 'Body Shop Line', '', '', '', '', 'running', 92, 62, 1.8, 5.5, 1500, 90.5, 'Murugan C.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C8', 'FAC-003', 'VTX-ROB-03', 'Spot Welding Robot #3', 'Spot Welding Robot #3', 'Spot Welding Robot', 'Spot Welding Robot', 'Body Shop Line', '', 'Body Shop Line', '', '', '', '', 'running', 91, 63, 2, 5.5, 1500, 92, 'Jayanthi S.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C9', 'FAC-003', 'VTX-ROB-04', 'Spot Welding Robot #4', 'Spot Welding Robot #4', 'Spot Welding Robot', 'Spot Welding Robot', 'Body Shop Line', '', 'Body Shop Line', '', '', '', '', 'running', 90, 64, 2.2, 5.5, 1500, 93.5, 'Venkatesh P.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C10', 'FAC-003', 'VTX-ROB-05', 'Spot Welding Robot #5', 'Spot Welding Robot #5', 'Spot Welding Robot', 'Spot Welding Robot', 'Body Shop Line', '', 'Body Shop Line', '', '', '', '', 'running', 94, 55, 1.4, 5.5, 1500, 90, 'Murugan C.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C11', 'FAC-003', 'VTX-PNT-01', 'Automated Electrostatic Paint Booth #1', 'Automated Electrostatic Paint Booth #1', 'Automated Electrostatic Paint Booth', 'Automated Electrostatic Paint Booth', 'Paint Shop Line', '', 'Paint Shop Line', '', '', '', '', 'running', 93, 56, 1.6, 5.5, 1500, 91.5, 'Jayanthi S.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C12', 'FAC-003', 'VTX-PNT-02', 'Automated Electrostatic Paint Booth #2', 'Automated Electrostatic Paint Booth #2', 'Automated Electrostatic Paint Booth', 'Automated Electrostatic Paint Booth', 'Paint Shop Line', '', 'Paint Shop Line', '', '', '', '', 'running', 92, 57, 1.8, 5.5, 1500, 93, 'Venkatesh P.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C13', 'FAC-003', 'VTX-PNT-03', 'Automated Electrostatic Paint Booth #3', 'Automated Electrostatic Paint Booth #3', 'Automated Electrostatic Paint Booth', 'Automated Electrostatic Paint Booth', 'Paint Shop Line', '', 'Paint Shop Line', '', '', '', '', 'running', 91, 58, 2, 5.5, 1500, 94.5, 'Murugan C.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C14', 'FAC-003', 'VTX-QC-01', 'Automated Optical Inspection Cell #1', 'Automated Optical Inspection Cell #1', 'Automated Optical Inspection Cell', 'Automated Optical Inspection Cell', 'Final Assembly Line', '', 'Final Assembly Line', '', '', '', '', 'running', 90, 59, 2.2, 5.5, 1500, 91, 'Jayanthi S.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C15', 'FAC-003', 'VTX-QC-02', 'Automated Optical Inspection Cell #2', 'Automated Optical Inspection Cell #2', 'Automated Optical Inspection Cell', 'Automated Optical Inspection Cell', 'Final Assembly Line', '', 'Final Assembly Line', '', '', '', '', 'running', 94, 60, 1.4, 5.5, 1500, 92.5, 'Venkatesh P.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-C16', 'FAC-003', 'VTX-QC-03', 'Automated Optical Inspection Cell #3', 'Automated Optical Inspection Cell #3', 'Automated Optical Inspection Cell', 'Automated Optical Inspection Cell', 'Final Assembly Line', '', 'Final Assembly Line', '', '', '', '', 'maintenance', 60, 61, 1.6, 5.5, 1500, 0, 'Murugan C.', '2022-02-14', '2026-09-24')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D1', 'FAC-004', 'PRM-SMT-01', 'High-Speed SMT Pick & Place #1', 'High-Speed SMT Pick & Place #1', 'High-Speed SMT Pick & Place', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', '', 'SMT High-Speed Line 1', '', '', '', '', 'running', 84, 49, 0.8, 6, 2800, 79.8, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D2', 'FAC-004', 'PRM-SMT-02', 'High-Speed SMT Pick & Place #2', 'High-Speed SMT Pick & Place #2', 'High-Speed SMT Pick & Place', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', '', 'SMT High-Speed Line 1', '', '', '', '', 'warning', 71, 50, 0.8, 6, 2800, 72.5, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D3', 'FAC-004', 'PRM-SMT-03', 'High-Speed SMT Pick & Place #3', 'High-Speed SMT Pick & Place #3', 'High-Speed SMT Pick & Place', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', '', 'SMT High-Speed Line 1', '', '', '', '', 'running', 82, 51, 0.8, 6, 2800, 83.4, 'Divya S.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D4', 'FAC-004', 'PRM-SMT-04', 'High-Speed SMT Pick & Place #4', 'High-Speed SMT Pick & Place #4', 'High-Speed SMT Pick & Place', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', '', 'SMT High-Speed Line 1', '', '', '', '', 'running', 81, 52, 0.8, 6, 2800, 79.2, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D5', 'FAC-004', 'PRM-SMT-05', 'High-Speed SMT Pick & Place #5', 'High-Speed SMT Pick & Place #5', 'High-Speed SMT Pick & Place', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', '', 'SMT High-Speed Line 1', '', '', '', '', 'running', 80, 53, 0.8, 6, 2800, 81, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D6', 'FAC-004', 'PRM-SMT-06', 'High-Speed SMT Pick & Place #6', 'High-Speed SMT Pick & Place #6', 'High-Speed SMT Pick & Place', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', '', 'SMT High-Speed Line 1', '', '', '', '', 'running', 79, 54, 0.8, 6, 2800, 82.8, 'Divya S.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D7', 'FAC-004', 'PRM-SMT-07', 'High-Speed SMT Pick & Place #7', 'High-Speed SMT Pick & Place #7', 'High-Speed SMT Pick & Place', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', '', 'SMT High-Speed Line 1', '', '', '', '', 'warning', 71, 55, 0.8, 6, 2800, 72.5, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D8', 'FAC-004', 'PRM-SMT-08', 'High-Speed SMT Pick & Place #8', 'High-Speed SMT Pick & Place #8', 'High-Speed SMT Pick & Place', 'High-Speed SMT Pick & Place', 'SMT High-Speed Line 1', '', 'SMT High-Speed Line 1', '', '', '', '', 'running', 84, 48, 0.8, 6, 2800, 80.4, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D9', 'FAC-004', 'PRM-AOI-01', '3D Automated Optical Inspection #1', '3D Automated Optical Inspection #1', '3D Automated Optical Inspection', '3D Automated Optical Inspection', 'SMT High-Speed Line 2', '', 'SMT High-Speed Line 2', '', '', '', '', 'running', 83, 49, 0.8, 6, 2800, 82.2, 'Divya S.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D10', 'FAC-004', 'PRM-AOI-02', '3D Automated Optical Inspection #2', '3D Automated Optical Inspection #2', '3D Automated Optical Inspection', '3D Automated Optical Inspection', 'SMT High-Speed Line 2', '', 'SMT High-Speed Line 2', '', '', '', '', 'running', 82, 50, 0.8, 6, 2800, 78, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D11', 'FAC-004', 'PRM-AOI-03', '3D Automated Optical Inspection #3', '3D Automated Optical Inspection #3', '3D Automated Optical Inspection', '3D Automated Optical Inspection', 'SMT High-Speed Line 2', '', 'SMT High-Speed Line 2', '', '', '', '', 'warning', 71, 51, 0.8, 6, 2800, 72.5, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D12', 'FAC-004', 'PRM-AOI-04', '3D Automated Optical Inspection #4', '3D Automated Optical Inspection #4', '3D Automated Optical Inspection', '3D Automated Optical Inspection', 'SMT High-Speed Line 2', '', 'SMT High-Speed Line 2', '', '', '', '', 'running', 80, 52, 0.8, 6, 2800, 81.6, 'Divya S.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D13', 'FAC-004', 'PRM-RFL-01', 'Nitrogen Reflow Oven 12-Zone #1', 'Nitrogen Reflow Oven 12-Zone #1', 'Nitrogen Reflow Oven 12-Zone', 'Nitrogen Reflow Oven 12-Zone', 'SMT High-Speed Line 2', '', 'SMT High-Speed Line 2', '', '', '', '', 'running', 79, 53, 0.8, 6, 2800, 83.4, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D14', 'FAC-004', 'PRM-RFL-02', 'Nitrogen Reflow Oven 12-Zone #2', 'Nitrogen Reflow Oven 12-Zone #2', 'Nitrogen Reflow Oven 12-Zone', 'Nitrogen Reflow Oven 12-Zone', 'SMT High-Speed Line 2', '', 'SMT High-Speed Line 2', '', '', '', '', 'running', 85, 54, 0.8, 6, 2800, 79.2, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D15', 'FAC-004', 'PRM-RFL-03', 'Nitrogen Reflow Oven 12-Zone #3', 'Nitrogen Reflow Oven 12-Zone #3', 'Nitrogen Reflow Oven 12-Zone', 'Nitrogen Reflow Oven 12-Zone', 'SMT High-Speed Line 2', '', 'SMT High-Speed Line 2', '', '', '', '', 'warning', 71, 55, 0.8, 6, 2800, 72.5, 'Divya S.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D16', 'FAC-004', 'PRM-RFL-04', 'Nitrogen Reflow Oven 12-Zone #4', 'Nitrogen Reflow Oven 12-Zone #4', 'Nitrogen Reflow Oven 12-Zone', 'Nitrogen Reflow Oven 12-Zone', 'SMT High-Speed Line 2', '', 'SMT High-Speed Line 2', '', '', '', '', 'running', 83, 48, 0.8, 6, 2800, 82.8, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D17', 'FAC-004', 'PRM-TST-01', 'In-Circuit ICT / Functional Tester #1', 'In-Circuit ICT / Functional Tester #1', 'In-Circuit ICT / Functional Tester', 'In-Circuit ICT / Functional Tester', 'Testing & Packaging Line', '', 'Testing & Packaging Line', '', '', '', '', 'running', 82, 49, 0.8, 6, 2800, 78.6, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D18', 'FAC-004', 'PRM-TST-02', 'In-Circuit ICT / Functional Tester #2', 'In-Circuit ICT / Functional Tester #2', 'In-Circuit ICT / Functional Tester', 'In-Circuit ICT / Functional Tester', 'Testing & Packaging Line', '', 'Testing & Packaging Line', '', '', '', '', 'running', 81, 50, 0.8, 6, 2800, 80.4, 'Divya S.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D19', 'FAC-004', 'PRM-TST-03', 'In-Circuit ICT / Functional Tester #3', 'In-Circuit ICT / Functional Tester #3', 'In-Circuit ICT / Functional Tester', 'In-Circuit ICT / Functional Tester', 'Testing & Packaging Line', '', 'Testing & Packaging Line', '', '', '', '', 'running', 80, 51, 0.8, 6, 2800, 82.2, 'Pooja N.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-D20', 'FAC-004', 'PRM-TST-04', 'In-Circuit ICT / Functional Tester #4', 'In-Circuit ICT / Functional Tester #4', 'In-Circuit ICT / Functional Tester', 'In-Circuit ICT / Functional Tester', 'Testing & Packaging Line', '', 'Testing & Packaging Line', '', '', '', '', 'maintenance', 52, 52, 0.8, 6, 2800, 0, 'Chethan K.', '2023-01-10', '2026-09-10')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E1', 'FAC-005', 'ORN-FRG-01', 'Hydraulic Open-Die Forging Press 2000T #1', 'Hydraulic Open-Die Forging Press 2000T #1', 'Hydraulic Open-Die Forging Press 2000T', 'Hydraulic Open-Die Forging Press 2000T', 'Heavy Forging Line', '', 'Heavy Forging Line', '', '', '', '', 'running', 85, 71, 3.2, 8.5, 650, 88, 'Kuppuswamy R.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E2', 'FAC-005', 'ORN-FRG-02', 'Hydraulic Open-Die Forging Press 2000T #2', 'Hydraulic Open-Die Forging Press 2000T #2', 'Hydraulic Open-Die Forging Press 2000T', 'Hydraulic Open-Die Forging Press 2000T', 'Heavy Forging Line', '', 'Heavy Forging Line', '', '', '', '', 'running', 84, 72, 3.2, 8.5, 650, 86, 'Dhandapani M.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E3', 'FAC-005', 'ORN-FRG-03', 'Hydraulic Open-Die Forging Press 2000T #3', 'Hydraulic Open-Die Forging Press 2000T #3', 'Hydraulic Open-Die Forging Press 2000T', 'Hydraulic Open-Die Forging Press 2000T', 'Heavy Forging Line', '', 'Heavy Forging Line', '', '', '', '', 'warning', 74, 73, 3.2, 8.5, 650, 79.5, 'Palanisamy V.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E4', 'FAC-005', 'ORN-FRG-04', 'Hydraulic Open-Die Forging Press 2000T #4', 'Hydraulic Open-Die Forging Press 2000T #4', 'Hydraulic Open-Die Forging Press 2000T', 'Hydraulic Open-Die Forging Press 2000T', 'Heavy Forging Line', '', 'Heavy Forging Line', '', '', '', '', 'running', 82, 74, 3.2, 8.5, 650, 86, 'Kuppuswamy R.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E5', 'FAC-005', 'ORN-TRN-01', 'Heavy Vertical Boring Mill #1', 'Heavy Vertical Boring Mill #1', 'Heavy Vertical Boring Mill', 'Heavy Vertical Boring Mill', 'Precision Machining Line', '', 'Precision Machining Line', '', '', '', '', 'running', 86, 75, 3.2, 8.5, 650, 88, 'Dhandapani M.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E6', 'FAC-005', 'ORN-TRN-02', 'Heavy Vertical Boring Mill #2', 'Heavy Vertical Boring Mill #2', 'Heavy Vertical Boring Mill', 'Heavy Vertical Boring Mill', 'Precision Machining Line', '', 'Precision Machining Line', '', '', '', '', 'running', 85, 76, 3.2, 8.5, 650, 86, 'Palanisamy V.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E7', 'FAC-005', 'ORN-TRN-03', 'Heavy Vertical Boring Mill #3', 'Heavy Vertical Boring Mill #3', 'Heavy Vertical Boring Mill', 'Heavy Vertical Boring Mill', 'Precision Machining Line', '', 'Precision Machining Line', '', '', '', '', 'running', 84, 77, 3.2, 8.5, 650, 88, 'Kuppuswamy R.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E8', 'FAC-005', 'ORN-TRN-04', 'Heavy Vertical Boring Mill #4', 'Heavy Vertical Boring Mill #4', 'Heavy Vertical Boring Mill', 'Heavy Vertical Boring Mill', 'Precision Machining Line', '', 'Precision Machining Line', '', '', '', '', 'running', 83, 78, 3.2, 8.5, 650, 86, 'Dhandapani M.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E9', 'FAC-005', 'ORN-PLN-01', 'Double-Housing Planer Mill #1', 'Double-Housing Planer Mill #1', 'Double-Housing Planer Mill', 'Double-Housing Planer Mill', 'Precision Machining Line', '', 'Precision Machining Line', '', '', '', '', 'running', 82, 79, 3.2, 8.5, 650, 88, 'Palanisamy V.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E10', 'FAC-005', 'ORN-PLN-02', 'Double-Housing Planer Mill #2', 'Double-Housing Planer Mill #2', 'Double-Housing Planer Mill', 'Double-Housing Planer Mill', 'Precision Machining Line', '', 'Precision Machining Line', '', '', '', '', 'running', 86, 80, 3.2, 8.5, 650, 86, 'Kuppuswamy R.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E11', 'FAC-005', 'ORN-QC-01', 'Ultrasonic Flaw Detector & CMM #1', 'Ultrasonic Flaw Detector & CMM #1', 'Ultrasonic Flaw Detector & CMM', 'Ultrasonic Flaw Detector & CMM', 'Precision Machining Line', '', 'Precision Machining Line', '', '', '', '', 'running', 85, 81, 3.2, 8.5, 650, 88, 'Dhandapani M.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;
INSERT INTO machines (id, factory_id, machine_id, name, machine_name, type, machine_type, line, line_id, line_name, station_number, manufacturer, model, serial_number, status, health_score, temperature_c, vibration_mms, pressure_bar, speed_rpm, oee, operator, install_date, last_service_date)
VALUES ('M-E12', 'FAC-005', 'ORN-QC-02', 'Ultrasonic Flaw Detector & CMM #2', 'Ultrasonic Flaw Detector & CMM #2', 'Ultrasonic Flaw Detector & CMM', 'Ultrasonic Flaw Detector & CMM', 'Precision Machining Line', '', 'Precision Machining Line', '', '', '', '', 'maintenance', 55, 70, 3.2, 8.5, 650, 0, 'Palanisamy V.', '2016-11-20', '2026-09-05')
ON CONFLICT (id) DO NOTHING;

-- Seed Incidents
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0021', 'INC-0021', 'PRD-20260714-L01-M006-C', 'MNT-0018', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', 'Machining Line 1', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'Verified optical scales, updated calibration matrix', 'High', 'Sensor/Optical', 'Closed', 'Priya Nair', 'Priya Nair', '2026-07-14 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Verified optical scales, updated calibration matrix', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0106', 'INC-0106', 'PRD-20260908-L01-M002-C', 'MNT-0097', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', 'Machining Line 1', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'Checked X/Y/Z ballscrew backlash, cleaned mist collector', 'High', 'Mechanical', 'Closed', 'Amit Patel', 'Amit Patel', '2026-09-08 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Checked X/Y/Z ballscrew backlash, cleaned mist collector', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0108', 'INC-0108', 'PRD-20260908-L01-M004-C', 'MNT-0099', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'Checked parallelism, serviced diamond dresser', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-09-08 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Checked parallelism, serviced diamond dresser', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0083', 'INC-0083', 'PRD-20260819-L01-M005-A', 'MNT-0067', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', 'Machining Line 1', 'Drive shaft basket fixture loading check', 'Drive shaft basket fixture loading check', 'Installed custom stainless steel basket for long shafts', 'Medium', 'Tooling', 'Closed', 'Suresh Patil', 'Suresh Patil', '2026-08-19 06:00:00', NULL, 'Scheduled product changeover', 'Installed custom stainless steel basket for long shafts', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0073', 'INC-0073', 'PRD-20260815-L02-M007-A', 'MNT-0059', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Hydraulic ram cylinder oil weeping & degraded tonnage', 'Hydraulic ram cylinder oil weeping & degraded tonnage', 'Tightened gland seal, added anti-wear additive, monitored', 'High', 'Hydraulic', 'Investigating', 'Suresh Patil', 'Suresh Patil', '2026-08-15 07:30:00', NULL, 'Rod packing seal micro-extrusion', 'Tightened gland seal, added anti-wear additive, monitored', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0007', 'INC-0007', 'PRD-20260703-L01-M005-A', 'Not Linked', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', 'Machining Line 1', 'Gas mixture ignition delay', 'Gas mixture ignition delay', 'Cleaned ignition electrodes and checked gas ratio', 'Medium', 'Mechanical', 'Closed', 'Suresh Patil', 'Suresh Patil', '2026-07-03 06:00:00', NULL, 'Spark plug gap carbon buildup', 'Cleaned ignition electrodes and checked gas ratio', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0078', 'INC-0078', 'PRD-20260818-L01-M004-C', 'MNT-0062', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Bi-weekly grinder idle shift overhaul & steady rest check', 'Bi-weekly grinder idle shift overhaul & steady rest check', 'Replaced carbide pads on 3-point steady rest, greased quill', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-18 22:00:00', NULL, 'Scheduled bi-weekly maintenance', 'Replaced carbide pads on 3-point steady rest, greased quill', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0048', 'INC-0048', 'PRD-20260728-L02-M012-C', 'MNT-0040', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', 'Stamping Line 2', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 'Cleaned optical enclosure, checked turntable encoder', 'High', 'Sensor/Optical', 'Closed', 'Priya Nair', 'Priya Nair', '2026-07-28 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Cleaned optical enclosure, checked turntable encoder', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0063', 'INC-0063', 'PRD-20260811-L03-M013-C', 'MNT-0053', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', 'Welding Line 3', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 'Checked weld power calibration, replaced torch head', 'High', 'Electrical', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-08-11 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Checked weld power calibration, replaced torch head', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0099', 'INC-0099', 'PRD-20260903-L04-M019-A', 'MNT-0083', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', 'Coating & Packaging Line 4', 'Packaging changeover wash parameters setup', 'Packaging changeover wash parameters setup', 'Adjusted wash temperature to 55C and spray pressure', 'Medium', 'Chemical', 'Closed', 'Ananya Rao', 'Ananya Rao', '2026-09-03 06:00:00', NULL, 'Scheduled packaging line changeover', 'Adjusted wash temperature to 55C and spray pressure', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0060', 'INC-0060', 'PRD-20260807-L04-M021-A', 'Not Linked', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', 'Coating & Packaging Line 4', 'Zone 2 temperature reading fluctuation', 'Zone 2 temperature reading fluctuation', 'Replaced thermocouple connector and validated temperature', 'Medium', 'Thermal/Cooling', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-08-07 06:00:00', NULL, 'Thermocouple wire terminal oxidization', 'Replaced thermocouple connector and validated temperature', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0085', 'INC-0085', 'PRD-20260821-L03-M016-C', 'Not Linked', 'FAC-001', 'M016', 'Pneumatic Assembly Fixture 01', 'L03', 'Welding Line 3', 'Fixture toggle clamp 4 delayed retraction', 'Fixture toggle clamp 4 delayed retraction', 'Cleaned pneumatic silencer and lubricated cylinder', 'Low', 'Pneumatic', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-08-21 22:00:00', NULL, 'Solenoid valve exhaust port clogged', 'Cleaned pneumatic silencer and lubricated cylinder', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0033', 'INC-0033', 'PRD-20260721-L01-M003-A', 'MNT-0026', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Drilling spindle 3 excessive vibration & degraded speed', 'Drilling spindle 3 excessive vibration & degraded speed', 'Vibration analysis run, tensioner pulley adjusted', 'High', 'Mechanical', 'Closed', 'Amit Patel', 'Amit Patel', '2026-07-21 07:00:00', NULL, 'Severe bearing degradation in spindle head', 'Vibration analysis run, tensioner pulley adjusted', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0054', 'INC-0054', 'PRD-20260730-L04-M024-B', 'MNT-0046', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', 'Coating & Packaging Line 4', 'Palletizing pattern program selection', 'Palletizing pattern program selection', 'Loaded stacking recipe for packaging assembly boxes', 'Medium', 'Electrical', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-07-30 14:00:00', NULL, 'Scheduled packaging changeover', 'Loaded stacking recipe for packaging assembly boxes', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0002', 'INC-0002', 'PRD-20260701-L02-M007-A', 'Not Linked', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Pilot valve response lag', 'Pilot valve response lag', 'Flushed pilot stage and purged air from manifold', 'Medium', 'Hydraulic', 'Closed', 'Suresh Patil', 'Suresh Patil', '2026-07-01 06:00:00', NULL, 'Hydraulic fluid contamination', 'Flushed pilot stage and purged air from manifold', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0045', 'INC-0045', 'PRD-20260728-L02-M009-C', 'MNT-0037', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', 'Stamping Line 2', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 'Inspected backgauge ball screws, calibrated encoders', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-28 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Inspected backgauge ball screws, calibrated encoders', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0059', 'INC-0059', 'PRD-20260806-L02-M007-A', 'MNT-0050', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Slide cushion hydraulic pressure fluctuation', 'Slide cushion hydraulic pressure fluctuation', 'Cleaned valve cooling jacket, checked coil impedance', 'Medium', 'Hydraulic', 'Closed', 'Suresh Patil', 'Suresh Patil', '2026-08-06 09:30:00', NULL, 'Proportional valve coil overheating', 'Cleaned valve cooling jacket, checked coil impedance', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0100', 'INC-0100', 'PRD-20260903-L04-M020-A', 'MNT-0084', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', 'Coating & Packaging Line 4', 'Powder formulation changeover cleaning', 'Powder formulation changeover cleaning', 'Vacuumed booth floor, purged powder feed hoses', 'Medium', 'Tooling', 'Closed', 'Ananya Rao', 'Ananya Rao', '2026-09-03 06:00:00', NULL, 'Scheduled powder changeover', 'Vacuumed booth floor, purged powder feed hoses', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0014', 'INC-0014', 'PRD-20260711-L04-M022-A', 'MNT-0010', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', 'Coating & Packaging Line 4', 'Rivet feed track jam at station 2', 'Rivet feed track jam at station 2', 'Deburred feeder track and replaced escapement pin', 'Medium', 'Tooling', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-11 09:00:00', NULL, 'Burr on escapement track gate', 'Deburred feeder track and replaced escapement pin', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0086', 'INC-0086', 'Not Linked', 'Not Linked', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'L02', 'Stamping Line 2', 'Sharp edge flash on chassis bracket flange', 'Sharp edge flash on chassis bracket flange', 'Re-aligned belt tracking pneumatic actuator', 'Low', 'Tooling', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-23 22:00:00', NULL, 'Deburring scotch-brite belt tracking off center', 'Re-aligned belt tracking pneumatic actuator', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0074', 'INC-0074', 'PRD-20260815-L02-M007-B', 'Not Linked', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Stamping press tonnage erratic during progressive draw', 'Stamping press tonnage erratic during progressive draw', 'Reduced line rate to preserve tooling integrity', 'High', 'Hydraulic', 'Investigating', 'Suresh Patil', 'Suresh Patil', '2026-08-15 14:00:00', NULL, 'Main cylinder pressure seal breaking down', 'Reduced line rate to preserve tooling integrity', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0076', 'INC-0076', 'PRD-20260816-L02-M007-A', 'MNT-0060', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Main cylinder hydraulic seal blowout under 250T load', 'Main cylinder hydraulic seal blowout under 250T load', 'Disassembled cylinder head, replaced main seal kit', 'Critical', 'Hydraulic', 'Closed', 'Suresh Patil', 'Suresh Patil', '2026-08-16 06:15:00', NULL, 'Complete seal extrusion and servo pressure loss', 'Disassembled cylinder head, replaced main seal kit', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0109', 'INC-0109', 'PRD-20260908-L01-M005-C', 'MNT-0100', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', 'Machining Line 1', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'Cleaned gas mixing block, tested manifold pressure relief', 'High', 'Mechanical', 'Closed', 'Suresh Patil', 'Suresh Patil', '2026-09-08 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Cleaned gas mixing block, tested manifold pressure relief', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0067', 'INC-0067', 'PRD-20260811-L03-M017-C', 'MNT-0057', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', 'Welding Line 3', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 'Replaced manganese armor plates in blast zone', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-11 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Replaced manganese armor plates in blast zone', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0056', 'INC-0056', 'PRD-20260803-L01-M002-A', 'Not Linked', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', 'Machining Line 1', 'Tool changer arm pocket 8 carousel binding', 'Tool changer arm pocket 8 carousel binding', 'Flushed carousel drive track and lubricated cam indexer', 'Medium', 'Mechanical', 'Closed', 'Amit Patel', 'Amit Patel', '2026-08-03 06:00:00', NULL, 'Debris in tool magazine cam follower', 'Flushed carousel drive track and lubricated cam indexer', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0015', 'INC-0015', 'PRD-20260712-L03-M018-C', 'Not Linked', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'L03', 'Welding Line 3', 'Laser acoustic couplant bubble interference', 'Laser acoustic couplant bubble interference', 'Replaced membrane filter and stabilized air supply', 'Low', 'Sensor/Optical', 'Closed', 'Priya Nair', 'Priya Nair', '2026-07-12 22:00:00', NULL, 'Purge air pressure fluctuation', 'Replaced membrane filter and stabilized air supply', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0102', 'INC-0102', 'PRD-20260903-L04-M022-A', 'MNT-0086', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', 'Coating & Packaging Line 4', 'Rivet head spacing adjustment for final packaging', 'Rivet head spacing adjustment for final packaging', 'Repositioned pneumatic heads to 120mm center-to-center', 'Medium', 'Tooling', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-09-03 06:00:00', NULL, 'Scheduled tooling adjustment', 'Repositioned pneumatic heads to 120mm center-to-center', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0082', 'INC-0082', 'PRD-20260819-L01-M004-A', 'MNT-0066', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Drive shaft diameter grinding program load & dress', 'Drive shaft diameter grinding program load & dress', 'Dressed wheel step profile for bearing journal grinding', 'Medium', 'Tooling', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-19 06:00:00', NULL, 'Scheduled product changeover', 'Dressed wheel step profile for bearing journal grinding', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0061', 'INC-0061', 'PRD-20260808-L01-M003-B', 'Not Linked', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Spindle nose thermal expansion offset error', 'Spindle nose thermal expansion offset error', 'Topped chiller coolant and recalibrated tool length offsets', 'Medium', 'Mechanical', 'Closed', 'Amit Patel', 'Amit Patel', '2026-08-08 14:00:00', NULL, 'Spindle chiller fluid level low', 'Topped chiller coolant and recalibrated tool length offsets', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0040', 'INC-0040', 'PRD-20260725-L01-M001-A', 'Not Linked', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', 'Machining Line 1', 'Workpiece micro-slippage during rough turning', 'Workpiece micro-slippage during rough turning', 'Cleaned chuck serrations, adjusted clamping pressure', 'Medium', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-25 06:00:00', NULL, 'Hydraulic chuck cylinder pressure drop', 'Cleaned chuck serrations, adjusted clamping pressure', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0003', 'INC-0003', 'PRD-20260701-L03-M015-A', 'Not Linked', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', 'Welding Line 3', 'Spot weld gun cylinder pressure dip', 'Spot weld gun cylinder pressure dip', 'Replaced pneumatic regulator and recalibrated pressure', 'Medium', 'Pneumatic', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-01 06:00:00', NULL, 'Regulator internal diaphragm wear', 'Replaced pneumatic regulator and recalibrated pressure', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0096', 'INC-0096', 'PRD-20260831-L03-M014-B', 'MNT-0080', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', 'Welding Line 3', 'Upstream starvation idle period cell inspection', 'Upstream starvation idle period cell inspection', 'Inspected robot arm cables, cleaned weld torch mount', 'High', 'Electrical', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-08-31 15:30:00', NULL, 'Starved of subframes due to M013 robot breakdown', 'Inspected robot arm cables, cleaned weld torch mount', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0013', 'INC-0013', 'PRD-20260710-L03-M013-C', 'Not Linked', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', 'Welding Line 3', 'Welding wire drive slip during seam tracking', 'Welding wire drive slip during seam tracking', 'Blew out torch liner and adjusted drive roll tension', 'Medium', 'Electrical', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-07-10 22:00:00', NULL, 'Torch conduit liner friction', 'Blew out torch liner and adjusted drive roll tension', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0062', 'INC-0062', 'PRD-20260810-L02-M009-B', 'Not Linked', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', 'Stamping Line 2', 'Bracket bend flange length variance', 'Bracket bend flange length variance', 'Re-seated stop finger and torqued clamping bolts', 'Low', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-10 14:00:00', NULL, 'Backgauge X-axis stop finger loose', 'Re-seated stop finger and torqued clamping bolts', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0057', 'INC-0057', 'PRD-20260804-L01-M004-C', 'MNT-0049', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Bi-weekly grinder overhaul & filter service', 'Bi-weekly grinder overhaul & filter service', 'Flushed magnetic separator, replaced paper band filter roll', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-04 22:00:00', NULL, 'Bi-weekly scheduled overhaul', 'Flushed magnetic separator, replaced paper band filter roll', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0105', 'INC-0105', 'PRD-20260908-L01-M001-C', 'MNT-0096', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', 'Machining Line 1', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'Replaced hydraulic return filter, checked tailstock pressure', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-09-08 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Replaced hydraulic return filter, checked tailstock pressure', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0011', 'INC-0011', 'PRD-20260708-L03-M015-A', 'MNT-0007', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', 'Welding Line 3', 'Electrode cylinder pressure drop during squeeze', 'Electrode cylinder pressure drop during squeeze', 'Replaced pressure regulator and dressed copper tips', 'Medium', 'Pneumatic', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-07-08 11:00:00', NULL, 'Pneumatic regulator diaphragm micro-leak', 'Replaced pressure regulator and dressed copper tips', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0066', 'INC-0066', 'PRD-20260811-L03-M016-C', 'MNT-0056', 'FAC-001', 'M016', 'Pneumatic Assembly Fixture 01', 'L03', 'Welding Line 3', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 'Cleaned fixture datum pins, replaced main FRL unit', 'High', 'Pneumatic', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-08-11 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Cleaned fixture datum pins, replaced main FRL unit', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0005', 'INC-0005', 'PRD-20260702-L01-M004-B', 'Not Linked', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Grinding wheel surface glazing', 'Grinding wheel surface glazing', 'Re-positioned coolant nozzle and dressed wheel face', 'Medium', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-02 14:00:00', NULL, 'Coolant delivery nozzle misdirection', 'Re-positioned coolant nozzle and dressed wheel face', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0065', 'INC-0065', 'PRD-20260811-L03-M015-C', 'MNT-0055', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', 'Welding Line 3', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 'Overhauled secondary busbar connections, checked water flow', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-11 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Overhauled secondary busbar connections, checked water flow', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0072', 'INC-0072', 'PRD-20260814-L02-M007-C', 'Not Linked', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Ram tonnage drop during peak stamping phase', 'Ram tonnage drop during peak stamping phase', 'Adjusted relief setpoint, prepared seal replacement parts', 'High', 'Hydraulic', 'Investigating', 'Suresh Patil', 'Suresh Patil', '2026-08-14 22:00:00', NULL, 'Fluid bypass across worn primary chevron packing', 'Adjusted relief setpoint, prepared seal replacement parts', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0104', 'INC-0104', 'PRD-20260903-L04-M024-A', 'MNT-0088', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', 'Coating & Packaging Line 4', 'Final packaging palletizing pattern teach update', 'Final packaging palletizing pattern teach update', 'Taught pick-and-place waypoints for PRD-106 boxes', 'Medium', 'Electrical', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-09-03 06:00:00', NULL, 'Scheduled robot trajectory update', 'Taught pick-and-place waypoints for PRD-106 boxes', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0058', 'INC-0058', 'PRD-20260805-L03-M015-A', 'Not Linked', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', 'Welding Line 3', 'High weld expulsion and tip pitting', 'High weld expulsion and tip pitting', 'Dressed upper and lower welding tips', 'Medium', 'Tooling', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-05 06:00:00', NULL, 'Copper alloy electrode face mushrooming', 'Dressed upper and lower welding tips', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0093', 'INC-0093', 'PRD-20260828-L02-M010-B', 'MNT-0076', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', 'Stamping Line 2', 'Stripper spring fatigue on station 8 rectangular punch', 'Stripper spring fatigue on station 8 rectangular punch', 'Replaced urethane stripper springs and punch insert', 'Medium', 'Tooling', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-08-28 15:30:00', NULL, 'High-cycle mechanical fatigue failure', 'Replaced urethane stripper springs and punch insert', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0028', 'INC-0028', 'PRD-20260717-L02-M008-A', 'Not Linked', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', 'Stamping Line 2', 'Laser cut edge burr on corner contour', 'Laser cut edge burr on corner contour', 'Cleaned optical protective slide and centered beam', 'Medium', 'Sensor/Optical', 'Closed', 'Deepak Verma', 'Deepak Verma', '2026-07-17 06:00:00', NULL, 'Thermal drift in protective optical window', 'Cleaned optical protective slide and centered beam', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0019', 'INC-0019', 'PRD-20260714-L01-M004-C', 'MNT-0016', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'Replaced hydrostatic oil filter, checked runout', 'High', 'Hydraulic', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-14 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Replaced hydrostatic oil filter, checked runout', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0047', 'INC-0047', 'PRD-20260728-L02-M011-C', 'MNT-0039', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'L02', 'Stamping Line 2', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 'Cleaned extraction ducting, checked brush wear', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-28 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Cleaned extraction ducting, checked brush wear', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0031', 'INC-0031', 'PRD-20260720-L01-M003-B', 'Not Linked', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Increased drill chatter on station 3', 'Increased drill chatter on station 3', 'Checked belt tension and logged bearing vibration', 'High', 'Mechanical', 'Investigating', 'Amit Patel', 'Amit Patel', '2026-07-20 14:00:00', NULL, 'Bearing play widening under sustained load', 'Checked belt tension and logged bearing vibration', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0094', 'INC-0094', 'PRD-20260830-L04-M020-A', 'Not Linked', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', 'Coating & Packaging Line 4', 'Minor powder coating flow surge on gun 3', 'Minor powder coating flow surge on gun 3', 'Drained inline air trap, adjusted fluidization pressure', 'Low', 'Pneumatic', 'Closed', 'Ananya Rao', 'Ananya Rao', '2026-08-30 06:00:00', NULL, 'Compressed air moisture spike', 'Drained inline air trap, adjusted fluidization pressure', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0017', 'INC-0017', 'PRD-20260714-L01-M002-C', 'MNT-0014', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', 'Machining Line 1', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'Inspected tool changer arm, cleaned taper, adjusted belt', 'High', 'Mechanical', 'Closed', 'Amit Patel', 'Amit Patel', '2026-07-14 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Inspected tool changer arm, cleaned taper, adjusted belt', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0023', 'INC-0023', 'PRD-20260715-L01-M002-B', 'Not Linked', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', 'Machining Line 1', 'Fixture clamping alignment for changeover', 'Fixture clamping alignment for changeover', 'Aligned milling fixture datum and dialed in workpiece', 'Medium', 'Tooling', 'Closed', 'Amit Patel', 'Amit Patel', '2026-07-15 14:00:00', NULL, 'Scheduled product changeover', 'Aligned milling fixture datum and dialed in workpiece', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0064', 'INC-0064', 'PRD-20260811-L03-M014-C', 'MNT-0054', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', 'Welding Line 3', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 'Cleaned wire drive rolls, calibrated arc voltage sensor', 'High', 'Electrical', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-08-11 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Cleaned wire drive rolls, calibrated arc voltage sensor', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0006', 'INC-0006', 'PRD-20260702-L02-M012-C', 'Not Linked', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', 'Stamping Line 2', 'Camera photogrammetric calibration offset', 'Camera photogrammetric calibration offset', 'Ran automated master grid recalibration routine', 'Low', 'Sensor/Optical', 'Closed', 'Priya Nair', 'Priya Nair', '2026-07-02 22:00:00', NULL, 'Temperature shift in scanning cell', 'Ran automated master grid recalibration routine', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0098', 'INC-0098', 'PRD-20260901-L01-M004-C', 'MNT-0082', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Bi-weekly full-shift idle overhaul and guideway check', 'Bi-weekly full-shift idle overhaul and guideway check', 'Replaced axis guideway wipers, topped central Vactra 2', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-09-01 22:00:00', NULL, 'Scheduled bi-weekly maintenance', 'Replaced axis guideway wipers, topped central Vactra 2', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0008', 'INC-0008', 'PRD-20260704-L01-M005-A', 'MNT-0003', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', 'Machining Line 1', 'Slow chamber clamp cylinder actuation', 'Slow chamber clamp cylinder actuation', 'Flushed valve assembly and replaced return line filter', 'Medium', 'Hydraulic', 'Closed', 'Suresh Patil', 'Suresh Patil', '2026-07-04 10:15:00', NULL, 'Pilot valve sticking due to varnish', 'Flushed valve assembly and replaced return line filter', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0035', 'INC-0035', 'PRD-20260721-L01-M003-C', 'Not Linked', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Drill hole eccentricity out of spec', 'Drill hole eccentricity out of spec', 'Tagged defective parts, scheduled emergency overhaul', 'High', 'Mechanical', 'Closed', 'Amit Patel', 'Amit Patel', '2026-07-21 22:00:00', NULL, 'Radial spindle deflection under thrust load', 'Tagged defective parts, scheduled emergency overhaul', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0050', 'INC-0050', 'PRD-20260730-L04-M020-B', 'MNT-0042', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', 'Coating & Packaging Line 4', 'Powder color changeover booth purge', 'Powder color changeover booth purge', 'Automated fast-color purge of hopper and feed tubes', 'Medium', 'Tooling', 'Closed', 'Ananya Rao', 'Ananya Rao', '2026-07-30 14:00:00', NULL, 'Scheduled color changeover', 'Automated fast-color purge of hopper and feed tubes', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0075', 'INC-0075', 'PRD-20260815-L02-M007-C', 'Not Linked', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'High-pressure hydraulic spray weeping at rod seal gland', 'High-pressure hydraulic spray weeping at rod seal gland', 'Isolated high-pressure pump, emergency work order queued', 'High', 'Hydraulic', 'Investigating', 'Suresh Patil', 'Suresh Patil', '2026-08-15 22:00:00', NULL, 'Progressive seal tearing under full tonnage', 'Isolated high-pressure pump, emergency work order queued', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0090', 'INC-0090', 'PRD-20260825-L04-M022-C', 'MNT-0072', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', 'Coating & Packaging Line 4', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 'Dressed orbital riveting peen heads, checked brushes', 'High', 'Tooling', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-08-25 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Dressed orbital riveting peen heads, checked brushes', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0055', 'INC-0055', 'PRD-20260802-L02-M008-A', 'Not Linked', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', 'Stamping Line 2', 'Laser assist gas pressure alarm triggered', 'Laser assist gas pressure alarm triggered', 'Swapped nitrogen supply manifold and reset regulator', 'Medium', 'Pneumatic', 'Closed', 'Deepak Verma', 'Deepak Verma', '2026-08-02 06:00:00', NULL, 'Gas bottle manifold switchover delay', 'Swapped nitrogen supply manifold and reset regulator', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0027', 'INC-0027', 'PRD-20260715-L01-M006-B', 'Not Linked', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', 'Machining Line 1', 'Inspection routine program switch', 'Inspection routine program switch', 'Loaded CNC CMM macro and calibrated probe cluster', 'Medium', 'Sensor/Optical', 'Closed', 'Priya Nair', 'Priya Nair', '2026-07-15 14:00:00', NULL, 'Scheduled product changeover', 'Loaded CNC CMM macro and calibrated probe cluster', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0030', 'INC-0030', 'PRD-20260720-L01-M003-A', 'Not Linked', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Spindle 3 vibration spike and thermal warning', 'Spindle 3 vibration spike and thermal warning', 'Reduced spindle speed by 10% and added coolant flow', 'High', 'Mechanical', 'Investigating', 'Amit Patel', 'Amit Patel', '2026-07-20 06:00:00', NULL, 'Spindle bearing cage degradation', 'Reduced spindle speed by 10% and added coolant flow', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0026', 'INC-0026', 'PRD-20260715-L01-M005-B', 'Not Linked', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', 'Machining Line 1', 'Chamber basket nest swap', 'Chamber basket nest swap', 'Swapped carrier tooling and verified clamp clearance', 'Medium', 'Tooling', 'Closed', 'Suresh Patil', 'Suresh Patil', '2026-07-15 14:00:00', NULL, 'Scheduled product changeover', 'Swapped carrier tooling and verified clamp clearance', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0101', 'INC-0101', 'PRD-20260903-L04-M021-A', 'MNT-0085', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', 'Coating & Packaging Line 4', 'Curing oven speed and zone setpoint adjustment', 'Curing oven speed and zone setpoint adjustment', 'Set conveyor speed to 1.8 m/min, checked dampers', 'Medium', 'Thermal/Cooling', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-09-03 06:00:00', NULL, 'Scheduled thermal profile changeover', 'Set conveyor speed to 1.8 m/min, checked dampers', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0044', 'INC-0044', 'PRD-20260728-L02-M008-C', 'MNT-0036', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', 'Stamping Line 2', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 'Cleaned cutting optics, calibrated height sensor', 'High', 'Sensor/Optical', 'Closed', 'Deepak Verma', 'Deepak Verma', '2026-07-28 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Cleaned cutting optics, calibrated height sensor', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0036', 'INC-0036', 'PRD-20260721-L01-M004-C', 'MNT-0027', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Bi-weekly grinder idle shift spindle flange alignment', 'Bi-weekly grinder idle shift spindle flange alignment', 'Cleaned wheel flange, checked acoustic sensor', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-21 22:00:00', NULL, 'Routine bi-weekly overhaul', 'Cleaned wheel flange, checked acoustic sensor', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0037', 'INC-0037', 'PRD-20260722-L01-M003-B', 'MNT-0028', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Spindle 3 catastrophic bearing seizure during drilling', 'Spindle 3 catastrophic bearing seizure during drilling', 'Extracted spindle head, rebuilt unit with new bearings', 'Critical', 'Mechanical', 'Closed', 'Amit Patel', 'Amit Patel', '2026-07-22 15:10:00', NULL, 'Fatigue failure of angular contact bearing pack', 'Extracted spindle head, rebuilt unit with new bearings', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0042', 'INC-0042', 'PRD-20260727-L04-M020-B', 'Not Linked', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', 'Coating & Packaging Line 4', 'Powder coating film thickness variation', 'Powder coating film thickness variation', 'Purged injector pump, balanced fluidizing bed pressure', 'Medium', 'Electrical', 'Closed', 'Ananya Rao', 'Ananya Rao', '2026-07-27 14:00:00', NULL, 'Fluidized bed air pressure fluctuation', 'Purged injector pump, balanced fluidizing bed pressure', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0012', 'INC-0012', 'PRD-20260709-L02-M008-B', 'Not Linked', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', 'Stamping Line 2', 'Laser cut edge micro-burr on contour', 'Laser cut edge micro-burr on contour', 'Centered cutting nozzle and replaced cover slide', 'Medium', 'Sensor/Optical', 'Closed', 'Deepak Verma', 'Deepak Verma', '2026-07-09 14:00:00', NULL, 'Nozzle thermal expansion', 'Centered cutting nozzle and replaced cover slide', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0039', 'INC-0039', 'PRD-20260724-L02-M007-B', 'Not Linked', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Pressure valve weeping on auxiliary circuit', 'Pressure valve weeping on auxiliary circuit', 'Replaced hydraulic manifold O-ring, torqued flange', 'Medium', 'Hydraulic', 'Closed', 'Suresh Patil', 'Suresh Patil', '2026-07-24 14:00:00', NULL, 'O-ring extrusion under peak stamping shock', 'Replaced hydraulic manifold O-ring, torqued flange', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0020', 'INC-0020', 'PRD-20260714-L01-M005-C', 'MNT-0017', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', 'Machining Line 1', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'Cleaned combustion chamber, tested spark ignition', 'High', 'Mechanical', 'Closed', 'Suresh Patil', 'Suresh Patil', '2026-07-14 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Cleaned combustion chamber, tested spark ignition', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0018', 'INC-0018', 'PRD-20260714-L01-M003-C', 'MNT-0015', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Line 1 monthly planned shutdown extended PM', 'Line 1 monthly planned shutdown extended PM', 'Flushed gearcase, replaced timing belts, checked runout', 'High', 'Mechanical', 'Closed', 'Amit Patel', 'Amit Patel', '2026-07-14 22:00:00', NULL, 'Extended spindle maintenance', 'Flushed gearcase, replaced timing belts, checked runout', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0068', 'INC-0068', 'PRD-20260811-L03-M018-C', 'MNT-0058', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'L03', 'Welding Line 3', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 'Cleaned laser optics, updated inspection templates', 'High', 'Sensor/Optical', 'Closed', 'Priya Nair', 'Priya Nair', '2026-08-11 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Cleaned laser optics, updated inspection templates', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0004', 'INC-0004', 'PRD-20260701-L04-M023-A', 'Not Linked', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', 'Coating & Packaging Line 4', 'Protective film misalignment during feed', 'Protective film misalignment during feed', 'Re-centered film roll and recalibrated magnetic brake', 'Low', 'Mechanical', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-01 06:00:00', NULL, 'Unwind brake tension drift', 'Re-centered film roll and recalibrated magnetic brake', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0077', 'INC-0077', 'PRD-20260816-L02-M007-B', 'MNT-0061', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Post-breakdown servo pressure validation & PM', 'Post-breakdown servo pressure validation & PM', 'Flushed 200L oil, bled air pockets, verified tonnage', 'High', 'Hydraulic', 'Closed', 'Suresh Patil', 'Suresh Patil', '2026-08-16 14:00:00', NULL, 'Corrective maintenance validation', 'Flushed 200L oil, bled air pockets, verified tonnage', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0010', 'INC-0010', 'PRD-20260707-L01-M004-C', 'MNT-0006', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Scheduled full-shift idle overhaul and wheel truing', 'Scheduled full-shift idle overhaul and wheel truing', 'Re-dressed diamond wheel and calibrated tailstock center', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-07 22:00:00', NULL, 'Bi-weekly scheduled grinder overhaul', 'Re-dressed diamond wheel and calibrated tailstock center', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0092', 'INC-0092', 'PRD-20260825-L04-M024-C', 'MNT-0074', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', 'Coating & Packaging Line 4', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 'Replaced counterbalance grease, checked light curtain', 'High', 'Electrical', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-08-25 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Replaced counterbalance grease, checked light curtain', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0087', 'INC-0087', 'PRD-20260825-L04-M019-C', 'MNT-0069', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', 'Coating & Packaging Line 4', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 'Cleaned phosphate heating coils, replaced filter bags', 'High', 'Chemical', 'Closed', 'Ananya Rao', 'Ananya Rao', '2026-08-25 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Cleaned phosphate heating coils, replaced filter bags', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0084', 'INC-0084', 'PRD-20260819-L01-M006-A', 'MNT-0068', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', 'Machining Line 1', 'CMM program load for PRD-102 drive shaft', 'CMM program load for PRD-102 drive shaft', 'Loaded CAD inspection program, verified probe star tree', 'Medium', 'Sensor/Optical', 'Closed', 'Priya Nair', 'Priya Nair', '2026-08-19 06:00:00', NULL, 'Scheduled product changeover', 'Loaded CAD inspection program, verified probe star tree', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0107', 'INC-0107', 'PRD-20260908-L01-M003-C', 'MNT-0098', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Line 1 monthly planned shutdown extended PM', 'Line 1 monthly planned shutdown extended PM', 'Inspected rebuilt spindle 3, checked gear backlash', 'High', 'Mechanical', 'Closed', 'Amit Patel', 'Amit Patel', '2026-09-08 22:00:00', NULL, 'Post-rebuild inspection and PM', 'Inspected rebuilt spindle 3, checked gear backlash', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0025', 'INC-0025', 'PRD-20260715-L01-M004-B', 'Not Linked', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Grinding program reload and center dress', 'Grinding program reload and center dress', 'Loaded grinding profile recipe, dressed grinding wheel', 'Medium', 'Tooling', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-15 14:00:00', NULL, 'Scheduled product changeover', 'Loaded grinding profile recipe, dressed grinding wheel', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0071', 'INC-0071', 'PRD-20260814-L02-M007-B', 'Not Linked', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Persistent oil seepage on main ram piston shaft', 'Persistent oil seepage on main ram piston shaft', 'Added seal conditioner, reduced maximum speed profile', 'High', 'Hydraulic', 'Investigating', 'Suresh Patil', 'Suresh Patil', '2026-08-14 14:00:00', NULL, 'Seal degradation progressing under continuous cycle', 'Added seal conditioner, reduced maximum speed profile', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0016', 'INC-0016', 'PRD-20260714-L01-M001-C', 'MNT-0013', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', 'Machining Line 1', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'Checked turret indexing, replaced wipers, adjusted gibs', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-14 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Checked turret indexing, replaced wipers, adjusted gibs', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0089', 'INC-0089', 'PRD-20260825-L04-M021-C', 'MNT-0071', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', 'Coating & Packaging Line 4', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 'Cleaned recirculation blowers, greased bearings', 'High', 'Thermal/Cooling', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-08-25 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Cleaned recirculation blowers, greased bearings', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0088', 'INC-0088', 'PRD-20260825-L04-M020-C', 'MNT-0070', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', 'Coating & Packaging Line 4', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 'Replaced cyclone powder recovery cartridge filters', 'High', 'Electrical', 'Closed', 'Ananya Rao', 'Ananya Rao', '2026-08-25 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Replaced cyclone powder recovery cartridge filters', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0103', 'INC-0103', 'PRD-20260903-L04-M023-A', 'MNT-0087', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', 'Coating & Packaging Line 4', 'Protective film roll mounting & tension calibration', 'Protective film roll mounting & tension calibration', 'Loaded 650mm film roll, adjusted magnetic brake tension', 'Medium', 'Mechanical', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-09-03 06:00:00', NULL, 'Scheduled film roll mounting', 'Loaded 650mm film roll, adjusted magnetic brake tension', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0038', 'INC-0038', 'PRD-20260722-L01-M003-C', 'MNT-0029', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Post-breakdown spindle alignment & dynamic run-in', 'Post-breakdown spindle alignment & dynamic run-in', 'Executed 4-hour speed ramp test, verified thermal growth', 'High', 'Mechanical', 'Closed', 'Amit Patel', 'Amit Patel', '2026-07-22 22:00:00', NULL, 'Corrective maintenance verification', 'Executed 4-hour speed ramp test, verified thermal growth', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0041', 'INC-0041', 'PRD-20260726-L03-M014-A', 'Not Linked', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', 'Welding Line 3', 'Gas flow sensor triggered momentary arc stop', 'Gas flow sensor triggered momentary arc stop', 'Cleaned weld torch nozzle, replaced gas diffuser', 'Low', 'Electrical', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-07-26 06:00:00', NULL, 'Spatter buildup on gas diffuser shroud', 'Cleaned weld torch nozzle, replaced gas diffuser', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0081', 'INC-0081', 'PRD-20260819-L01-M003-A', 'MNT-0065', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Drill pitch adjustment for drive shaft', 'Drill pitch adjustment for drive shaft', 'Adjusted spindle center distances to 85mm pitch pattern', 'Medium', 'Tooling', 'Closed', 'Amit Patel', 'Amit Patel', '2026-08-19 06:00:00', NULL, 'Scheduled product changeover', 'Adjusted spindle center distances to 85mm pitch pattern', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0080', 'INC-0080', 'PRD-20260819-L01-M002-A', 'MNT-0064', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', 'Machining Line 1', 'Drive shaft milling fixture clamping setup', 'Drive shaft milling fixture clamping setup', 'Mounted pneumatic clamping vise, aligned zero coordinates', 'Medium', 'Tooling', 'Closed', 'Amit Patel', 'Amit Patel', '2026-08-19 06:00:00', NULL, 'Scheduled product changeover', 'Mounted pneumatic clamping vise, aligned zero coordinates', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0049', 'INC-0049', 'PRD-20260730-L04-M019-B', 'MNT-0041', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', 'Coating & Packaging Line 4', 'Coating changeover bath replenishment', 'Coating changeover bath replenishment', 'Drained rinse stage 2, refilled with DI water', 'Medium', 'Chemical', 'Closed', 'Ananya Rao', 'Ananya Rao', '2026-07-30 14:00:00', NULL, 'Scheduled coating recipe changeover', 'Drained rinse stage 2, refilled with DI water', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0079', 'INC-0079', 'PRD-20260819-L01-M001-A', 'MNT-0063', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', 'Machining Line 1', 'Shaft drive assembly changeover tooling swap', 'Shaft drive assembly changeover tooling swap', 'Replaced collet chuck with 3-jaw chuck for drive shaft', 'Medium', 'Tooling', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-19 06:00:00', NULL, 'Scheduled product changeover', 'Replaced collet chuck with 3-jaw chuck for drive shaft', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0091', 'INC-0091', 'PRD-20260825-L04-M023-C', 'MNT-0073', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', 'Coating & Packaging Line 4', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 'Checked roll nip alignment, replaced guillotine blade', 'High', 'Mechanical', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-08-25 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Checked roll nip alignment, replaced guillotine blade', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0070', 'INC-0070', 'PRD-20260814-L02-M007-A', 'Not Linked', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Cylinder packing gland oil weeping and tonnage drift', 'Cylinder packing gland oil weeping and tonnage drift', 'Tightened packing gland, monitored hydraulic pressure', 'High', 'Hydraulic', 'Investigating', 'Suresh Patil', 'Suresh Patil', '2026-08-14 06:00:00', NULL, 'Initial seal extrusion under high tonnage cycling', 'Tightened packing gland, monitored hydraulic pressure', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0043', 'INC-0043', 'PRD-20260728-L02-M007-C', 'MNT-0035', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 'Replaced servo pump filter, inspected ram slide gibs', 'High', 'Hydraulic', 'Closed', 'Suresh Patil', 'Suresh Patil', '2026-07-28 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Replaced servo pump filter, inspected ram slide gibs', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0046', 'INC-0046', 'PRD-20260728-L02-M010-C', 'MNT-0038', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', 'Stamping Line 2', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 'Checked auto-index backlash, lubricated ram crank', 'High', 'Tooling', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-28 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Checked auto-index backlash, lubricated ram crank', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0032', 'INC-0032', 'PRD-20260720-L01-M003-C', 'Not Linked', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Spindle 3 bearing temperature exceeded 65C', 'Spindle 3 bearing temperature exceeded 65C', 'Lubricated spindle quill and pre-warned maintenance', 'High', 'Mechanical', 'Investigating', 'Amit Patel', 'Amit Patel', '2026-07-20 22:00:00', NULL, 'Accelerated race pitting', 'Lubricated spindle quill and pre-warned maintenance', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0069', 'INC-0069', 'PRD-20260813-L04-M022-A', 'Not Linked', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', 'Coating & Packaging Line 4', 'Rivet escapement feed pin intermittent stick', 'Rivet escapement feed pin intermittent stick', 'Cleared debris, polished escapement slide track', 'Medium', 'Tooling', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-08-13 06:00:00', NULL, 'Metal shaving in escapement gate', 'Cleared debris, polished escapement slide track', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0001', 'INC-0001', 'PRD-20260701-L01-M002-A', 'Not Linked', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', 'Machining Line 1', 'Tool insert chipping on face mill', 'Tool insert chipping on face mill', 'Replaced face mill carbide inserts and adjusted feed', 'Medium', 'Tooling', 'Closed', 'Amit Patel', 'Amit Patel', '2026-07-01 06:00:00', NULL, 'High abrasive casting hardness', 'Replaced face mill carbide inserts and adjusted feed', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0051', 'INC-0051', 'PRD-20260730-L04-M021-B', 'MNT-0043', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', 'Coating & Packaging Line 4', 'Curing recipe temperature adjustment', 'Curing recipe temperature adjustment', 'Updated PID setpoints for 195C powder cure profile', 'Medium', 'Thermal/Cooling', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-07-30 14:00:00', NULL, 'Scheduled thermal profile changeover', 'Updated PID setpoints for 195C powder cure profile', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0097', 'INC-0097', 'PRD-20260831-L03-M015-B', 'MNT-0081', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', 'Welding Line 3', 'Upstream starvation idle period electrode check', 'Upstream starvation idle period electrode check', 'Aligned upper/lower weld guns, checked cooling flow', 'High', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-31 16:00:00', NULL, 'Starved of subframes due to M013 robot breakdown', 'Aligned upper/lower weld guns, checked cooling flow', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0052', 'INC-0052', 'PRD-20260730-L04-M022-B', 'MNT-0044', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', 'Coating & Packaging Line 4', 'Rivet size changeover tooling swap', 'Rivet size changeover tooling swap', 'Swapped riveting dies to 4.8mm mandrel tooling', 'Medium', 'Tooling', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-30 14:00:00', NULL, 'Scheduled hardware changeover', 'Swapped riveting dies to 4.8mm mandrel tooling', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0034', 'INC-0034', 'PRD-20260721-L01-M003-B', 'Not Linked', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Spindle 3 running at reduced RPM to prevent stall', 'Spindle 3 running at reduced RPM to prevent stall', 'Monitored spindle current and minimized feed rate', 'High', 'Mechanical', 'Closed', 'Amit Patel', 'Amit Patel', '2026-07-21 14:00:00', NULL, 'Bearing internal race spalling', 'Monitored spindle current and minimized feed rate', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0110', 'INC-0110', 'PRD-20260908-L01-M006-C', 'MNT-0101', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', 'Machining Line 1', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'Verified probe rack repeatability, cleaned granite table', 'High', 'Sensor/Optical', 'Closed', 'Priya Nair', 'Priya Nair', '2026-09-08 22:00:00', NULL, 'Monthly scheduled preventive overhaul', 'Verified probe rack repeatability, cleaned granite table', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0022', 'INC-0022', 'PRD-20260715-L01-M001-B', 'MNT-0019', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', 'Machining Line 1', 'Tool pocket setup & offset verification', 'Tool pocket setup & offset verification', 'Mounted boring bar holder, verified tool offsets', 'Medium', 'Tooling', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-15 14:00:00', NULL, 'Scheduled product changeover', 'Mounted boring bar holder, verified tool offsets', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0029', 'INC-0029', 'PRD-20260718-L03-M017-A', 'Not Linked', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', 'Welding Line 3', 'Incomplete shot blast coverage on weldment', 'Incomplete shot blast coverage on weldment', 'Re-tensioned elevator belt and cleared media chute', 'Medium', 'Mechanical', 'Closed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-18 06:00:00', NULL, 'Bucket elevator drive belt slack', 'Re-tensioned elevator belt and cleared media chute', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0095', 'INC-0095', 'PRD-20260831-L03-M013-B', 'MNT-0079', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', 'Welding Line 3', 'Robot axis 3 internal servo cable harness shearing', 'Robot axis 3 internal servo cable harness shearing', 'Replaced robot harness assembly, recalibrated mastering', 'Critical', 'Electrical', 'Closed', 'Vikram Singh', 'Vikram Singh', '2026-08-31 14:20:00', NULL, 'Torsional flex fatigue in articulated dress pack', 'Replaced robot harness assembly, recalibrated mastering', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0053', 'INC-0053', 'PRD-20260730-L04-M023-B', 'MNT-0045', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', 'Coating & Packaging Line 4', 'Film width changeover guide adjustment', 'Film width changeover guide adjustment', 'Adjusted unwind chuck core position for 800mm roll', 'Medium', 'Mechanical', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-30 14:00:00', NULL, 'Scheduled film width changeover', 'Adjusted unwind chuck core position for 800mm roll', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-0009', 'INC-0009', 'PRD-20260705-L02-M010-A', 'Not Linked', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', 'Stamping Line 2', 'Sheet clamp positioning lag', 'Sheet clamp positioning lag', 'Replaced urethane springs and aligned striker pin', 'Medium', 'Tooling', 'Closed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-05 06:00:00', NULL, 'Urethane stripper wear on station 12', 'Replaced urethane springs and aligned striker pin', NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-B01', 'INC-2026-0210', NULL, NULL, 'FAC-002', 'NOV-LTH-03', 'NOV-LTH-03', '', '', 'Chucking Hydraulic Pressure Deviation', 'Chucking Hydraulic Pressure Deviation', 'Automatic bar feeder reported clamping pressure drop below 35 bar minimum threshold.', 'High', '', 'Open', 'Sunil M.', 'Sunil M.', '2026-10-06T03:15:00Z', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-B02', 'INC-2026-0205', NULL, NULL, 'FAC-002', 'NOV-GRD-02', 'NOV-GRD-02', '', '', 'Coolant Flow Rate Sensor Stoppage', 'Coolant Flow Rate Sensor Stoppage', 'Flow meter indicated zero flow while pump motor remained energized. Preventative interlock tripped.', 'Medium', '', 'Investigating', 'Prashant T.', 'Prashant T.', '2026-10-05T18:40:00Z', NULL, 'Particulate sludge clogging fine mesh suction strainer.', NULL, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-C01', 'INC-2026-0301', NULL, NULL, 'FAC-003', 'VTX-ROB-03', 'VTX-ROB-03', '', '', 'Spot Welder Current Density Fluctuation', 'Spot Welder Current Density Fluctuation', 'Secondary current dropped by 8% during outer door panel tack sequence.', 'Medium', '', 'Open', 'Murugan C.', 'Murugan C.', '2026-10-06T00:45:00Z', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-D01', 'INC-2026-0415', NULL, NULL, 'FAC-004', 'PRM-SMT-02', 'PRM-SMT-02', '', '', 'Feeder Reel Feeder Jamming Error 402', 'Feeder Reel Feeder Jamming Error 402', 'Component mispick rate exceeded 0.05% on 0201 capacitor reels.', 'Medium', '', 'Open', 'Pooja N.', 'Pooja N.', '2026-10-06T02:30:00Z', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;
INSERT INTO incidents (id, incident_id, production_id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, title, problem_description, description, severity, failure_category, status, reported_by, technician_name, reported_at, resolved_at, root_cause, action_taken, resolution_notes)
VALUES ('INC-E01', 'INC-2026-0509', NULL, NULL, 'FAC-005', 'ORN-FRG-02', 'ORN-FRG-02', '', '', 'Forging Ram Guide Rail Thermal Expansion Alert', 'Forging Ram Guide Rail Thermal Expansion Alert', 'Lube oil temperature elevated to 68°C; thermal sensor triggered yellow caution.', 'High', '', 'Open', 'Kuppuswamy R.', 'Kuppuswamy R.', '2026-10-06T03:00:00Z', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Seed Work Orders
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0217', 'WO-2026-0217', 'Not Linked', 'INC-0007', 'PRD-20260703-L01-M005-A', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', 'Machining Line 1', 'Corrective', 'Gas mixture ignition delay', 'Gas mixture ignition delay', 'Medium', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-07-03', '2026-07-03 06:00:00', '2026-07-03 06:38:00', 0.38, 0.38, 'Spark plug ignition electrodes', 'Mechanical', 'Cleaned ignition electrodes and checked gas ratio')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0213', 'WO-2026-0213', 'Not Linked', 'INC-0003', 'PRD-20260701-L03-M015-A', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', 'Welding Line 3', 'Corrective', 'Spot weld gun cylinder pressure dip', 'Spot weld gun cylinder pressure dip', 'Medium', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-01', '2026-07-01 06:00:00', '2026-07-01 06:34:00', 0.41, 0.41, 'Pneumatic regulator diaphragm', 'Pneumatic', 'Replaced pneumatic regulator and recalibrated pressure')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0065', 'WO-2026-0065', 'MNT-0065', 'INC-0081', 'PRD-20260819-L01-M003-A', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Changeover Alignment', 'Multi-spindle head drill pitch adjustment for drive shaft', 'Multi-spindle head drill pitch adjustment for drive shaft', 'Medium', 'Completed', 'Amit Patel', 'Amit Patel', '2026-08-19', '2026-08-19 06:00:00', '2026-08-19 06:45:00', 0.75, 0.75, 'High-speed carbide drills (4x)', 'Tooling', 'Adjusted spindle center distances to 85mm pitch pattern')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0251', 'WO-2026-0251', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', 'Coating & Packaging Line 4', 'Preventive', 'Cyclone powder recovery cartridge filters inspection & fluidization test', 'Cyclone powder recovery cartridge filters inspection & fluidization test', 'Medium', 'In Progress', 'Ananya Rao', 'Ananya Rao', '2026-10-02', '2026-10-01 16:30:00', '2026-10-02 10:00:00', 1.5, 1.5, 'Fluidizing tile gasket, injector sleeve', 'Pneumatic', 'Inspecting porous floor tiles and injector air pressure')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0048', 'WO-2026-0048', 'MNT-0048', 'Not Linked', 'Not Linked', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', 'Machining Line 1', 'Preventive', 'Centralized grease cartridge replacement', 'Centralized grease cartridge replacement', 'Low', 'Completed', 'Amit Patel', 'Amit Patel', '2026-08-02', '2026-08-01 18:00:00', '2026-08-02 03:15:00', 1.25, 1.25, 'LHL 700g grease pack (2x)', 'Lubrication', 'Replaced LHL grease cartridge, bled distribution block')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0021', 'WO-2026-0021', 'MNT-0021', 'Not Linked', 'Not Linked', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', 'Stamping Line 2', 'Inspection', 'Bending crown crowning system calibration', 'Bending crown crowning system calibration', 'Low', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-17', '2026-07-16 18:00:00', '2026-07-17 17:15:00', 1.25, 1.25, 'Sensor cable clip, test bar', 'Mechanical', 'Checked hydraulic crowning cylinders under 100T load')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0008', 'WO-2026-0008', 'MNT-0008', 'Not Linked', 'Not Linked', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', 'Welding Line 3', 'Preventive', 'Blast wheel turbine blade wear inspection', 'Blast wheel turbine blade wear inspection', 'Medium', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-09', '2026-07-08 18:00:00', '2026-07-09 17:00:00', 1.5, 1.5, 'Turbine blades, control cage', 'Mechanical', 'Replaced turbine control cage and impeller blade set')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0003', 'WO-2026-0003', 'Not Linked', 'INC-0008', 'PRD-20260704-L01-M005-A', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', 'Machining Line 1', 'Corrective', 'Slow chamber clamp cylinder actuation', 'Slow chamber clamp cylinder actuation', 'Medium', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-07-04', '2026-07-04 10:15:00', '2026-07-04 11:45:00', 1.5, 1.5, 'Return line filter, seal ring', 'Hydraulic', 'Flushed valve assembly, replaced return line filter')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0080', 'WO-2026-0080', 'MNT-0080', 'INC-0096', 'PRD-20260831-L03-M014-B', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', 'Welding Line 3', 'Inspection', 'Upstream starvation idle period cell preventive inspection', 'Upstream starvation idle period cell preventive inspection', 'High', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-08-31', '2026-08-31 15:30:00', '2026-08-31 19:00:00', 3.5, 3.5, 'Torch nozzle, contact tips', 'Electrical', 'Inspected robot arm cables, cleaned weld torch mount')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0011', 'WO-2026-0011', 'MNT-0011', 'Not Linked', 'Not Linked', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', 'Coating & Packaging Line 4', 'Preventive', 'Robot axis 1-6 brake check and vacuum gripper pads', 'Robot axis 1-6 brake check and vacuum gripper pads', 'Low', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-07-12', '2026-07-11 18:00:00', '2026-07-12 12:45:00', 1.25, 1.25, 'Silicone vacuum suction cups', 'Electrical', 'Replaced suction cups on gripper head, verified vacuum')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0024', 'WO-2026-0024', 'MNT-0024', 'Not Linked', 'Not Linked', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', 'Coating & Packaging Line 4', 'Preventive', 'Stage 1 degreaser concentration and spray nozzle descaling', 'Stage 1 degreaser concentration and spray nozzle descaling', 'Medium', 'Completed', 'Ananya Rao', 'Ananya Rao', '2026-07-20', '2026-07-19 18:00:00', '2026-07-20 10:30:00', 1.5, 1.5, 'Vee-jet spray nozzles (4x), pump diaphragm', 'Chemical', 'Descaled 16 spray nozzles, adjusted chemical dosing pump')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0253', 'WO-2026-0253', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Preventive', 'Post-overhaul hydraulic valve manifold pressure tuning & oil analysis', 'Post-overhaul hydraulic valve manifold pressure tuning & oil analysis', 'High', 'In Progress', 'Suresh Patil', 'Suresh Patil', '2026-10-02', '2026-10-01 14:00:00', '2026-10-02 10:00:00', 2, 2, 'Manifold test port fittings, filter cartridge', 'Hydraulic', 'Verifying servo tonnage linearity across 50-250T')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0055', 'WO-2026-0055', 'MNT-0055', 'INC-0065', 'PRD-20260811-L03-M015-C', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', 'Welding Line 3', 'Preventive', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 'High', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-11', '2026-08-11 22:00:00', '2026-08-12 02:00:00', 4, 4, 'Flexible copper laminations, water flow sensor', 'Mechanical', 'Overhauled secondary busbar connections, checked water flow')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0023', 'WO-2026-0023', 'MNT-0023', 'Not Linked', 'Not Linked', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', 'Welding Line 3', 'Preventive', 'Gas flow regulator calibration and anti-spatter level', 'Gas flow regulator calibration and anti-spatter level', 'Low', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-07-19', '2026-07-18 18:00:00', '2026-07-19 14:15:00', 1.25, 1.25, 'Gas diffuser, nozzle insulation ring', 'Electrical', 'Replaced flow meter O-ring, topped anti-spatter reservoir')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0022', 'WO-2026-0022', 'MNT-0022', 'Not Linked', 'Not Linked', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', 'Welding Line 3', 'Preventive', 'MIG torch nozzle reamer station cleaning & liner replace', 'MIG torch nozzle reamer station cleaning & liner replace', 'Medium', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-07-18', '2026-07-17 18:00:00', '2026-07-18 11:45:00', 1.25, 1.25, 'Torch liner 3m, contact tips (5x)', 'Electrical', 'Replaced steel torch liner, checked wire feeder tension')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0020', 'WO-2026-0020', 'MNT-0020', 'Not Linked', 'Not Linked', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Preventive', 'Counterbalance cylinder pressure check and oil sampling', 'Counterbalance cylinder pressure check and oil sampling', 'Low', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-07-16', '2026-07-15 18:00:00', '2026-07-16 12:15:00', 1.25, 1.25, 'Sampling bottle, hydraulic breather filter', 'Hydraulic', 'Sampled ISO VG 46 oil, checked proportional valves')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0018', 'WO-2026-0018', 'MNT-0018', 'INC-0021', 'PRD-20260714-L01-M006-C', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', 'Machining Line 1', 'Preventive', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'High', 'Completed', 'Priya Nair', 'Priya Nair', '2026-07-14', '2026-07-14 22:00:00', '2026-07-15 02:00:00', 4, 4, 'Cleaning solvents, probe module seal', 'Sensor/Optical', 'Verified optical scales, updated calibration matrix')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0059', 'WO-2026-0059', 'MNT-0059', 'INC-0073', 'PRD-20260815-L02-M007-A', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Corrective', 'Hydraulic ram cylinder oil weeping and degraded tonnage', 'Hydraulic ram cylinder oil weeping and degraded tonnage', 'High', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-08-15', '2026-08-15 07:30:00', '2026-08-15 09:30:00', 2, 2, 'Secondary rod seal, hydraulic top-up oil', 'Hydraulic', 'Tightened gland seal, added anti-wear additive, monitored')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0063', 'WO-2026-0063', 'MNT-0063', 'INC-0079', 'PRD-20260819-L01-M001-A', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', 'Machining Line 1', 'Changeover Alignment', 'Shaft drive assembly changeover tooling swap', 'Shaft drive assembly changeover tooling swap', 'Medium', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-19', '2026-08-19 06:00:00', '2026-08-19 06:45:00', 0.75, 0.75, 'Hard jaws, chuck adapter plate', 'Tooling', 'Replaced collet chuck with 3-jaw chuck for drive shaft')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0049', 'WO-2026-0049', 'MNT-0049', 'INC-0057', 'PRD-20260804-L01-M004-C', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Preventive', 'Bi-weekly grinder full-shift overhaul and filtration clean', 'Bi-weekly grinder full-shift overhaul and filtration clean', 'High', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-04', '2026-08-04 18:00:00', '2026-08-05 06:00:00', 8, 8, 'Paper band filter roll, magnetic drum wiper', 'Mechanical', 'Flushed magnetic separator, replaced paper band filter roll')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0225', 'WO-2026-0225', 'Not Linked', 'INC-0026', 'PRD-20260715-L01-M005-B', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', 'Machining Line 1', 'Changeover Alignment', 'Chamber basket nest swap', 'Chamber basket nest swap', 'Medium', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-07-15', '2026-07-15 14:00:00', '2026-07-15 14:45:00', 0.75, 0.75, 'Basket nest adapter', 'Tooling', 'Swapped carrier tooling and verified clamp clearance')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0084', 'WO-2026-0084', 'MNT-0084', 'INC-0100', 'PRD-20260903-L04-M020-A', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', 'Coating & Packaging Line 4', 'Changeover Alignment', 'Powder formulation changeover cleaning', 'Powder formulation changeover cleaning', 'Medium', 'Completed', 'Ananya Rao', 'Ananya Rao', '2026-09-03', '2026-09-03 06:00:00', '2026-09-03 07:00:00', 1, 1, 'Hose coupling seals, injector insert', 'Tooling', 'Vacuumed booth floor, purged powder feed hoses')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0212', 'WO-2026-0212', 'Not Linked', 'INC-0002', 'PRD-20260701-L02-M007-A', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Corrective', 'Pilot valve response lag', 'Pilot valve response lag', 'Medium', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-07-01', '2026-07-01 06:00:00', '2026-07-01 06:40:00', 0.42, 0.42, 'Hydraulic filter element, pilot seal', 'Hydraulic', 'Flushed pilot stage and purged air from manifold')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0040', 'WO-2026-0040', 'MNT-0040', 'INC-0048', 'PRD-20260728-L02-M012-C', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', 'Stamping Line 2', 'Preventive', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 'High', 'Completed', 'Priya Nair', 'Priya Nair', '2026-07-28', '2026-07-28 22:00:00', '2026-07-29 02:00:00', 4, 4, 'Rotary table slip ring cleaning kit', 'Sensor/Optical', 'Cleaned optical enclosure, checked turntable encoder')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0026', 'WO-2026-0026', 'MNT-0026', 'INC-0033', 'PRD-20260721-L01-M003-A', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Corrective', 'Drilling spindle 3 excessive vibration & degraded speed', 'Drilling spindle 3 excessive vibration & degraded speed', 'High', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-21', '2026-07-21 07:00:00', '2026-07-21 08:30:00', 1.5, 1.5, 'Tensioner pulley, sensor lead', 'Mechanical', 'Vibration analysis run, tensioner pulley adjusted')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0057', 'WO-2026-0057', 'MNT-0057', 'INC-0067', 'PRD-20260811-L03-M017-C', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', 'Welding Line 3', 'Preventive', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 'High', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-11', '2026-08-11 22:00:00', '2026-08-12 02:00:00', 4, 4, 'Manganese wear liners (4x)', 'Mechanical', 'Replaced manganese protective armor plates in blast zone')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0230', 'WO-2026-0230', 'Not Linked', 'INC-0031', 'PRD-20260720-L01-M003-B', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Corrective', 'Increased drill chatter on station 3', 'Increased drill chatter on station 3', 'High', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-20', '2026-07-20 14:00:00', '2026-07-20 14:55:00', 0.67, 0.67, 'Drive belt tensioner', 'Mechanical', 'Checked belt tension and logged bearing vibration')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0232', 'WO-2026-0232', 'Not Linked', 'INC-0034', 'PRD-20260721-L01-M003-B', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Corrective', 'Spindle 3 running at reduced RPM to prevent stall', 'Spindle 3 running at reduced RPM to prevent stall', 'High', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-21', '2026-07-21 14:00:00', '2026-07-21 15:40:00', 1.33, 1.33, 'Drive belt, current sensor', 'Mechanical', 'Monitored spindle current and minimized feed rate')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0069', 'WO-2026-0069', 'MNT-0069', 'INC-0087', 'PRD-20260825-L04-M019-C', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', 'Coating & Packaging Line 4', 'Preventive', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 'High', 'Completed', 'Ananya Rao', 'Ananya Rao', '2026-08-25', '2026-08-25 22:00:00', '2026-08-26 02:00:00', 4, 4, 'Polypropylene filter bags (6x), tank gasket', 'Chemical', 'Cleaned phosphate tank heating coils, replaced filter bags')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0074', 'WO-2026-0074', 'MNT-0074', 'INC-0092', 'PRD-20260825-L04-M024-C', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', 'Coating & Packaging Line 4', 'Preventive', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 'High', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-08-25', '2026-08-25 22:00:00', '2026-08-26 02:00:00', -1, -1, 'Robot grease Kyodo Yushi, safety interlock sensor', 'Electrical', 'Replaced robot axis counterbalance grease, checked light curtain')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0072', 'WO-2026-0072', 'MNT-0072', 'INC-0090', 'PRD-20260825-L04-M022-C', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', 'Coating & Packaging Line 4', 'Preventive', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 'High', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-08-25', '2026-08-25 22:00:00', '2026-08-26 02:00:00', 4, 4, 'Orbital riveting peen heads (2x)', 'Tooling', 'Dressed orbital riveting peen heads, checked motor brushes')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0239', 'WO-2026-0239', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', 'Machining Line 1', 'Preventive', 'Combustion chamber spark plug cleaning and seal pack replacement', 'Combustion chamber spark plug cleaning and seal pack replacement', 'High', 'In Progress', 'Suresh Patil', 'Suresh Patil', '2026-10-02', '2026-10-01 18:30:00', '2026-10-02 08:30:00', 1.5, 1.5, 'Chamber seal ring, spark electrodes', 'Mechanical', 'Active overhaul of ignition assembly and chamber seals')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0005', 'WO-2026-0005', 'MNT-0005', 'Not Linked', 'Not Linked', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', 'Stamping Line 2', 'Inspection', 'Turret station 12 guide bushing clearance check', 'Turret station 12 guide bushing clearance check', 'Low', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-06', '2026-07-05 18:00:00', '2026-07-06 15:30:00', 1.5, 1.5, 'Shim set, guide pin', 'Tooling', 'Measured bore runout, adjusted striker alignment')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0002', 'WO-2026-0002', 'MNT-0002', 'Not Linked', 'Not Linked', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', 'Machining Line 1', 'Preventive', 'Spindle chiller filter inspection and coolant top-up', 'Spindle chiller filter inspection and coolant top-up', 'Low', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-03', '2026-07-02 18:00:00', '2026-07-03 03:00:00', 1.5, 1.5, 'Chiller filter cartridge', 'Electrical', 'Cleaned chiller intake filter, topped deionized coolant')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0243', 'WO-2026-0243', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', 'Stamping Line 2', 'Preventive', 'Monthly protective window replacement and capacitive height sensor check', 'Monthly protective window replacement and capacitive height sensor check', 'Medium', 'Scheduled', 'Deepak Verma', 'Deepak Verma', '2026-10-02', '2026-10-01 17:00:00', '2026-10-02 12:15:00', 1.25, 1.25, 'Protective cover slide, ceramic nozzle holder', 'Sensor/Optical', 'Scheduled optical centering and sensor calibration')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0010', 'WO-2026-0010', 'MNT-0010', 'INC-0014', 'PRD-20260711-L04-M022-A', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', 'Coating & Packaging Line 4', 'Corrective', 'Rivet feed track jam at station 2', 'Rivet feed track jam at station 2', 'Medium', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-11', '2026-07-11 09:00:00', '2026-07-11 10:15:00', 1.25, 1.25, 'Escapement guide pin, feed spring', 'Tooling', 'Deburred feeder track, replaced pneumatic escapement pin')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0252', 'WO-2026-0252', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', 'Coating & Packaging Line 4', 'Preventive', 'Vacuum gripper suction cups replacement and light curtain alignment', 'Vacuum gripper suction cups replacement and light curtain alignment', 'Low', 'Scheduled', 'Vikram Singh', 'Vikram Singh', '2026-10-02', '2026-10-02 08:30:00', '2026-10-02 14:15:00', 1.25, 1.25, 'Silicone vacuum suction cups (4x)', 'Electrical', 'Scheduled replacement of gripper suction pads and sensor test')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0235', 'WO-2026-0235', 'Not Linked', 'INC-0040', 'PRD-20260725-L01-M001-A', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', 'Machining Line 1', 'Corrective', 'Workpiece micro-slippage during rough turning', 'Workpiece micro-slippage during rough turning', 'Medium', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-25', '2026-07-25 06:00:00', '2026-07-25 06:35:00', 0.42, 0.42, 'Chuck jaw serration inserts', 'Mechanical', 'Cleaned chuck serrations, adjusted clamping pressure')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0061', 'WO-2026-0061', 'MNT-0061', 'Not Linked', 'PRD-20260816-L02-M007-B', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Preventive', 'Post-breakdown servo hydraulic pressure validation and PM', 'Post-breakdown servo hydraulic pressure validation and PM', 'High', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-08-16', '2026-08-16 14:00:00', '2026-08-16 20:00:00', 6, 6, 'Hydraulic oil HLP 46 (200L), high-pressure filters', 'Hydraulic', 'Flushed 200L oil, bled air pockets, verified tonnage sensor')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0034', 'WO-2026-0034', 'MNT-0034', 'Not Linked', 'Not Linked', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', 'Stamping Line 2', 'Calibration', '60-day stereo camera photogrammetric grid calibration', '60-day stereo camera photogrammetric grid calibration', 'High', 'Completed', 'Priya Nair', 'Priya Nair', '2026-07-27', '2026-07-26 18:00:00', '2026-07-27 16:30:00', 1.5, 1.5, 'Calibration target plate, optical lens wipes', 'Sensor/Optical', 'Calibrated blue light projector, verified reference artifact')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0221', 'WO-2026-0221', 'Not Linked', 'INC-0015', 'PRD-20260712-L03-M018-C', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'L03', 'Welding Line 3', 'Corrective', 'Laser acoustic couplant bubble interference', 'Laser acoustic couplant bubble interference', 'Low', 'Completed', 'Priya Nair', 'Priya Nair', '2026-07-12', '2026-07-12 22:00:00', '2026-07-12 22:33:00', 0.35, 0.35, 'Membrane filter', 'Sensor/Optical', 'Replaced membrane filter and stabilized air supply')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0075', 'WO-2026-0075', 'MNT-0075', 'Not Linked', 'Not Linked', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', 'Stamping Line 2', 'Preventive', 'Chiller deionized water filter and conductivity check', 'Chiller deionized water filter and conductivity check', 'Low', 'Completed', 'Deepak Verma', 'Deepak Verma', '2026-08-27', '2026-08-26 18:00:00', '2026-08-27 12:15:00', 1.25, 1.25, 'Deionizing resin cartridge', 'Sensor/Optical', 'Replaced deionizing resin canister, cleaned strainer')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0078', 'WO-2026-0078', 'MNT-0078', 'Not Linked', 'Not Linked', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', 'Welding Line 3', 'Preventive', 'Abrasive media elevator bucket belt tensioning', 'Abrasive media elevator bucket belt tensioning', 'Medium', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-30', '2026-08-29 18:00:00', '2026-08-30 15:30:00', 1.5, 1.5, 'Cast elevator buckets (4x), belt fasteners', 'Mechanical', 'Tensioned bucket belt, replaced 4 worn steel buckets')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0233', 'WO-2026-0233', 'Not Linked', 'INC-0035', 'PRD-20260721-L01-M003-C', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Corrective', 'Drill hole eccentricity out of spec', 'Drill hole eccentricity out of spec', 'High', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-21', '2026-07-21 22:00:00', '2026-07-21 23:35:00', 1.33, 1.33, 'Collet holder, thrust washer', 'Mechanical', 'Tagged defective parts, scheduled emergency overhaul')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0046', 'WO-2026-0046', 'MNT-0046', 'INC-0054', 'PRD-20260730-L04-M024-B', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', 'Coating & Packaging Line 4', 'Changeover Alignment', 'Palletizing pattern program selection', 'Palletizing pattern program selection', 'Medium', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-07-30', '2026-07-30 14:00:00', '2026-07-30 15:00:00', 1, 1, 'Photoelectric sensor lens', 'Electrical', 'Loaded stacking recipe for packaging assembly boxes')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0220', 'WO-2026-0220', 'Not Linked', 'INC-0013', 'PRD-20260710-L03-M013-C', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', 'Welding Line 3', 'Corrective', 'Welding wire drive slip during seam tracking', 'Welding wire drive slip during seam tracking', 'Medium', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-07-10', '2026-07-10 22:00:00', '2026-07-10 22:32:00', 0.37, 0.37, 'Torch conduit liner, drive roller', 'Electrical', 'Blew out torch liner and adjusted drive roll tension')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0229', 'WO-2026-0229', 'Not Linked', 'INC-0030', 'PRD-20260720-L01-M003-A', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Corrective', 'Spindle 3 vibration spike and thermal warning', 'Spindle 3 vibration spike and thermal warning', 'High', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-20', '2026-07-20 06:00:00', '2026-07-20 07:00:00', 0.67, 0.67, 'Synthetic spindle grease', 'Mechanical', 'Reduced spindle speed by 10% and added coolant flow')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0047', 'WO-2026-0047', 'MNT-0047', 'Not Linked', 'Not Linked', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', 'Machining Line 1', 'Inspection', 'Hydraulic power unit oil pressure and filter check', 'Hydraulic power unit oil pressure and filter check', 'Low', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-01', '2026-07-31 18:00:00', '2026-08-01 04:15:00', 1.25, 1.25, 'Pressure gauge seal, O-ring', 'Mechanical', 'Checked 45 bar system pressure, inspected relief valve')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0216', 'WO-2026-0216', 'Not Linked', 'INC-0006', 'PRD-20260702-L02-M012-C', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', 'Stamping Line 2', 'Calibration', 'Camera photogrammetric calibration offset', 'Camera photogrammetric calibration offset', 'Low', 'Completed', 'Priya Nair', 'Priya Nair', '2026-07-02', '2026-07-02 22:00:00', '2026-07-02 22:36:00', 0.35, 0.35, 'Calibration grid markers', 'Sensor/Optical', 'Ran automated master grid recalibration routine')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0051', 'WO-2026-0051', 'MNT-0051', 'Not Linked', 'Not Linked', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', 'Stamping Line 2', 'Preventive', 'Cutting gas assist pressure regulator inspection', 'Cutting gas assist pressure regulator inspection', 'Low', 'Completed', 'Deepak Verma', 'Deepak Verma', '2026-08-07', '2026-08-06 18:00:00', '2026-08-07 14:15:00', 1.25, 1.25, 'High-pressure gas filter element', 'Pneumatic', 'Calibrated nitrogen assist gas regulator up to 25 bar')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0238', 'WO-2026-0238', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', 'Machining Line 1', 'Preventive', 'Spindle collet clamping force hydraulic sensor calibration', 'Spindle collet clamping force hydraulic sensor calibration', 'Medium', 'Scheduled', 'Rajesh Sharma', 'Rajesh Sharma', '2026-10-02', '2026-10-01 16:00:00', '2026-10-02 09:30:00', 1.5, 1.5, 'Pressure switch seal, O-ring', 'Mechanical', 'Scheduled pressure switch calibration and seal replacement')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0067', 'WO-2026-0067', 'MNT-0067', 'INC-0083', 'PRD-20260819-L01-M005-A', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', 'Machining Line 1', 'Changeover Alignment', 'Drive shaft basket fixture loading check', 'Drive shaft basket fixture loading check', 'Medium', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-08-19', '2026-08-19 06:00:00', '2026-08-19 06:45:00', 0.75, 0.75, 'Basket guide rails, locking pin', 'Tooling', 'Installed custom stainless steel basket for long shafts')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0007', 'WO-2026-0007', 'MNT-0007', 'INC-0011', 'PRD-20260708-L03-M015-A', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', 'Welding Line 3', 'Corrective', 'Electrode cylinder pressure drop during squeeze', 'Electrode cylinder pressure drop during squeeze', 'Medium', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-07-08', '2026-07-08 11:00:00', '2026-07-08 12:15:00', 1.25, 1.25, 'Pneumatic regulator, electrode tips', 'Pneumatic', 'Replaced pressure regulator and dressed copper tips')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0050', 'WO-2026-0050', 'MNT-0050', 'INC-0059', 'PRD-20260806-L02-M007-A', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Corrective', 'Slide cushion hydraulic pressure fluctuation', 'Slide cushion hydraulic pressure fluctuation', 'Medium', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-08-06', '2026-08-06 09:30:00', '2026-08-06 11:00:00', 1.5, 1.5, 'Solenoid valve coil, connector', 'Hydraulic', 'Cleaned valve cooling jacket, checked coil impedance')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0215', 'WO-2026-0215', 'Not Linked', 'INC-0005', 'PRD-20260702-L01-M004-B', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Corrective', 'Grinding wheel surface glazing', 'Grinding wheel surface glazing', 'Medium', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-02', '2026-07-02 14:00:00', '2026-07-02 14:26:00', 0.27, 0.27, 'Diamond dressing stick', 'Mechanical', 'Re-positioned coolant nozzle and dressed wheel face')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0009', 'WO-2026-0009', 'MNT-0009', 'Not Linked', 'Not Linked', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', 'Coating & Packaging Line 4', 'Inspection', 'Cascade high-voltage generator diagnostic check', 'Cascade high-voltage generator diagnostic check', 'Low', 'Completed', 'Ananya Rao', 'Ananya Rao', '2026-07-10', '2026-07-09 18:00:00', '2026-07-10 14:15:00', 1.25, 1.25, 'Corona charging pins', 'Electrical', 'Tested kV output on guns 1-4, cleaned corona needles')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0012', 'WO-2026-0012', 'MNT-0012', 'Not Linked', 'Not Linked', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', 'Machining Line 1', 'Calibration', '60-day ruby stylus calibration and air bearing gap check', '60-day ruby stylus calibration and air bearing gap check', 'High', 'Completed', 'Priya Nair', 'Priya Nair', '2026-07-13', '2026-07-12 18:00:00', '2026-07-13 15:30:00', 1.5, 1.5, 'Stylus tip 3mm, air filter pack', 'Sensor/Optical', 'Calibrated master sphere, cleaned air bearing pads')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0056', 'WO-2026-0056', 'MNT-0056', 'INC-0066', 'PRD-20260811-L03-M016-C', 'FAC-001', 'M016', 'Pneumatic Assembly Fixture 01', 'L03', 'Welding Line 3', 'Preventive', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 'High', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-08-11', '2026-08-11 22:00:00', '2026-08-12 02:00:00', 4, 4, 'Filter regulator lubricator unit, datum pins', 'Pneumatic', 'Cleaned fixture datum pins, replaced main pneumatic FRL')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0250', 'WO-2026-0250', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'L03', 'Welding Line 3', 'Calibration', '60-day phased array acoustic calibration on subframe weld samples', '60-day phased array acoustic calibration on subframe weld samples', 'High', 'Scheduled', 'Priya Nair', 'Priya Nair', '2026-10-02', '2026-10-02 07:00:00', '2026-10-02 16:30:00', 1.5, 1.5, 'Ultrasonic couplant, test block', 'Sensor/Optical', 'Scheduled calibration traceable to NABL reference standard')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0037', 'WO-2026-0037', 'MNT-0037', 'INC-0045', 'PRD-20260728-L02-M009-C', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', 'Stamping Line 2', 'Preventive', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 'High', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-28', '2026-07-28 22:00:00', '2026-07-29 02:00:00', 4, 4, 'Ball screw wiper, linear scale cleaner', 'Mechanical', 'Inspected backgauge ball screws, calibrated encoders')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0060', 'WO-2026-0060', 'MNT-0060', 'INC-0076', 'PRD-20260816-L02-M007-A', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Breakdown', 'Main cylinder hydraulic seal blowout under 250T load', 'Main cylinder hydraulic seal blowout under 250T load', 'Critical', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-08-16', '2026-08-16 06:15:00', '2026-08-16 12:35:00', 6.33, 6.33, 'Complete 250T cylinder seal pack, servo pilot valve', 'Hydraulic', 'Isolated HPU, disassembled cylinder head, replaced main seal kit')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0222', 'WO-2026-0222', 'Not Linked', 'INC-0023', 'PRD-20260715-L01-M002-B', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', 'Machining Line 1', 'Changeover Alignment', 'Fixture clamping alignment for changeover', 'Fixture clamping alignment for changeover', 'Medium', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-15', '2026-07-15 14:00:00', '2026-07-15 14:45:00', 0.75, 0.75, 'Clamping studs, locator pins', 'Tooling', 'Aligned milling fixture datum and dialed in workpiece')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0227', 'WO-2026-0227', 'Not Linked', 'INC-0028', 'PRD-20260717-L02-M008-A', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', 'Stamping Line 2', 'Corrective', 'Laser cut edge burr on corner contour', 'Laser cut edge burr on corner contour', 'Medium', 'Completed', 'Deepak Verma', 'Deepak Verma', '2026-07-17', '2026-07-17 06:00:00', '2026-07-17 06:30:00', 0.33, 0.33, 'Optical protective window', 'Sensor/Optical', 'Cleaned optical protective slide and centered beam')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0016', 'WO-2026-0016', 'MNT-0016', 'INC-0019', 'PRD-20260714-L01-M004-C', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Preventive', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'High', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-14', '2026-07-14 22:00:00', '2026-07-15 02:00:00', 4, 4, 'Hydrostatic oil filter, seal kit', 'Hydraulic', 'Replaced hydrostatic oil filter, checked workhead runout')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0039', 'WO-2026-0039', 'MNT-0039', 'INC-0047', 'PRD-20260728-L02-M011-C', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'L02', 'Stamping Line 2', 'Preventive', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 'High', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-28', '2026-07-28 22:00:00', '2026-07-29 02:00:00', 4, 4, 'Exhaust seal gasket, brush segments', 'Mechanical', 'Cleaned extraction ducting, checked brush wear')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0004', 'WO-2026-0004', 'MNT-0004', 'Not Linked', 'Not Linked', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', 'Stamping Line 2', 'Preventive', 'Optical protective window inspection and beam centering', 'Optical protective window inspection and beam centering', 'Medium', 'Completed', 'Deepak Verma', 'Deepak Verma', '2026-07-05', '2026-07-04 18:00:00', '2026-07-05 10:00:00', 1.5, 1.5, 'Protective cover slide', 'Sensor/Optical', 'Cleaned protective glass, realigned nozzle centering')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0001', 'WO-2026-0001', 'MNT-0001', 'Not Linked', 'Not Linked', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', 'Machining Line 1', 'Preventive', 'Routine 30-day lubrication and chuck jaw inspection', 'Routine 30-day lubrication and chuck jaw inspection', 'Low', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-02', '2026-07-01 18:00:00', '2026-07-02 03:30:00', 1.5, 1.5, 'Chuck grease, wiper seals', 'Mechanical', 'Lubricated chuck guide ways, verified clamping force')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0014', 'WO-2026-0014', 'MNT-0014', 'INC-0017', 'PRD-20260714-L01-M002-C', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', 'Machining Line 1', 'Preventive', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'High', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-14', '2026-07-14 22:00:00', '2026-07-15 02:00:00', 4, 4, 'ATC drive belt, spindle pull stud seals', 'Mechanical', 'Inspected tool changer arm, cleaned taper, adjusted belt')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0244', 'WO-2026-0244', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', 'Stamping Line 2', 'Inspection', 'Crowning system calibration and backgauge vertical screw lubrication', 'Crowning system calibration and backgauge vertical screw lubrication', 'Low', 'Open', 'Rajesh Sharma', 'Rajesh Sharma', '2026-10-02', '2026-10-02 07:00:00', '2026-10-02 14:15:00', 1.25, 1.25, 'Linear guide wiper, grease pack', 'Mechanical', 'Work order queued for afternoon shift inspection')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0087', 'WO-2026-0087', 'MNT-0087', 'INC-0103', 'PRD-20260903-L04-M023-A', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', 'Coating & Packaging Line 4', 'Changeover Alignment', 'Protective film roll mounting and tension calibration', 'Protective film roll mounting and tension calibration', 'Medium', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-09-03', '2026-09-03 06:00:00', '2026-09-03 07:00:00', 1, 1, 'Film guide roller bush', 'Mechanical', 'Loaded 650mm film roll, adjusted magnetic brake tension')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0245', 'WO-2026-0245', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', 'Stamping Line 2', 'Corrective', 'Station 8 urethane stripper spring fatigue kit staging', 'Station 8 urethane stripper spring fatigue kit staging', 'Medium', 'Pending Parts', 'Ramesh Kumar', 'Ramesh Kumar', '2026-10-02', '2026-10-01 15:00:00', '2026-10-02 11:30:00', 1.5, 1.5, 'Urethane stripper springs (set of 4)', 'Tooling', 'Parts staged in tool crib awaiting scheduled tool change')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0033', 'WO-2026-0033', 'MNT-0033', 'Not Linked', 'Not Linked', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'L03', 'Welding Line 3', 'Calibration', '60-day phased array acoustic calibration on subframe weld sample', '60-day phased array acoustic calibration on subframe weld sample', 'High', 'Completed', 'Priya Nair', 'Priya Nair', '2026-07-26', '2026-07-25 18:00:00', '2026-07-26 15:00:00', 1.5, 1.5, 'Ultrasonic couplant, wedge membrane', 'Sensor/Optical', 'Calibrated wedge delay, normalized receiver sensitivity')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0042', 'WO-2026-0042', 'MNT-0042', 'INC-0050', 'PRD-20260730-L04-M020-B', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', 'Coating & Packaging Line 4', 'Changeover Alignment', 'Powder color changeover booth purge', 'Powder color changeover booth purge', 'Medium', 'Completed', 'Ananya Rao', 'Ananya Rao', '2026-07-30', '2026-07-30 14:00:00', '2026-07-30 15:00:00', 1, 1, 'Fluidized bed filter, injector sleeve', 'Tooling', 'Automated fast-color purge of hopper and feed tubes')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0058', 'WO-2026-0058', 'MNT-0058', 'INC-0068', 'PRD-20260811-L03-M018-C', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'L03', 'Welding Line 3', 'Preventive', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 'High', 'Completed', 'Priya Nair', 'Priya Nair', '2026-08-11', '2026-08-11 22:00:00', '2026-08-12 02:00:00', 4, 4, 'Optical filter, protective window', 'Sensor/Optical', 'Cleaned laser reception optics, updated inspection templates')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0226', 'WO-2026-0226', 'Not Linked', 'INC-0027', 'PRD-20260715-L01-M006-B', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', 'Machining Line 1', 'Changeover Alignment', 'Inspection routine program switch', 'Inspection routine program switch', 'Medium', 'Completed', 'Priya Nair', 'Priya Nair', '2026-07-15', '2026-07-15 14:00:00', '2026-07-15 14:45:00', -1, -1, 'Stylus cluster adapter', 'Sensor/Optical', 'Loaded CNC CMM macro and calibrated probe cluster')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0036', 'WO-2026-0036', 'MNT-0036', 'INC-0044', 'PRD-20260728-L02-M008-C', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', 'Stamping Line 2', 'Preventive', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 'High', 'Completed', 'Deepak Verma', 'Deepak Verma', '2026-07-28', '2026-07-28 22:00:00', '2026-07-29 02:00:00', 4, 4, 'Ceramic nozzle holder, focus lens seal', 'Sensor/Optical', 'Cleaned cutting optics, calibrated height sensor')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0027', 'WO-2026-0027', 'MNT-0027', 'INC-0036', 'PRD-20260721-L01-M004-C', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Preventive', 'Bi-weekly grinder idle shift spindle flange alignment', 'Bi-weekly grinder idle shift spindle flange alignment', 'High', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-21', '2026-07-21 22:00:00', '2026-07-22 06:00:00', 8, 8, 'Flange bolts, sensor cable, coolant nozzle', 'Mechanical', 'Cleaned wheel mount flange, checked acoustic emission sensor')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0028', 'WO-2026-0028', 'MNT-0028', 'INC-0037', 'PRD-20260722-L01-M003-B', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Breakdown', 'Spindle 3 catastrophic bearing seizure during drilling', 'Spindle 3 catastrophic bearing seizure during drilling', 'Critical', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-22', '2026-07-22 15:10:00', '2026-07-22 20:20:00', 5.17, 5.17, 'Angular contact bearing set, spindle shaft', 'Mechanical', 'Extracted spindle head, rebuilt unit with new bearings')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0237', 'WO-2026-0237', 'Not Linked', 'INC-0042', 'PRD-20260727-L04-M020-B', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', 'Coating & Packaging Line 4', 'Corrective', 'Powder coating film thickness variation', 'Powder coating film thickness variation', 'Medium', 'Completed', 'Ananya Rao', 'Ananya Rao', '2026-07-27', '2026-07-27 14:00:00', '2026-07-27 14:33:00', 0.38, 0.38, 'Injector venturi sleeve', 'Electrical', 'Purged injector pump, balanced fluidizing bed pressure')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0219', 'WO-2026-0219', 'Not Linked', 'INC-0012', 'PRD-20260709-L02-M008-B', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', 'Stamping Line 2', 'Corrective', 'Laser cut edge micro-burr on contour', 'Laser cut edge micro-burr on contour', 'Medium', 'Completed', 'Deepak Verma', 'Deepak Verma', '2026-07-09', '2026-07-09 14:00:00', '2026-07-09 14:26:00', 0.27, 0.27, 'Laser protective cover slide', 'Sensor/Optical', 'Centered cutting nozzle and replaced cover slide')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0234', 'WO-2026-0234', 'Not Linked', 'INC-0039', 'PRD-20260724-L02-M007-B', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Corrective', 'Pressure valve weeping on auxiliary circuit', 'Pressure valve weeping on auxiliary circuit', 'Medium', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-07-24', '2026-07-24 14:00:00', '2026-07-24 14:35:00', 0.42, 0.42, 'Hydraulic manifold O-ring', 'Hydraulic', 'Replaced hydraulic manifold O-ring, torqued flange')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0218', 'WO-2026-0218', 'Not Linked', 'INC-0009', 'PRD-20260705-L02-M010-A', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', 'Stamping Line 2', 'Corrective', 'Sheet clamp positioning lag', 'Sheet clamp positioning lag', 'Medium', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-05', '2026-07-05 06:00:00', '2026-07-05 06:35:00', 0.38, 0.38, 'Urethane stripper springs (4x)', 'Tooling', 'Replaced urethane springs and aligned striker pin')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0017', 'WO-2026-0017', 'MNT-0017', 'INC-0020', 'PRD-20260714-L01-M005-C', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', 'Machining Line 1', 'Preventive', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'High', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-07-14', '2026-07-14 22:00:00', '2026-07-15 02:00:00', 4, 4, 'Chamber seal ring, ignition electrodes', 'Mechanical', 'Cleaned combustion chamber, tested spark ignition plugs')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0015', 'WO-2026-0015', 'MNT-0015', 'INC-0018', 'PRD-20260714-L01-M003-C', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Preventive', 'Line 1 monthly planned shutdown extended PM', 'Line 1 monthly planned shutdown extended PM', 'High', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-14', '2026-07-14 22:00:00', '2026-07-15 04:40:00', 6.67, 6.67, 'Multi-spindle drive belt set, oil filter', 'Mechanical', 'Flushed spindle gearcase, replaced timing belts, checked runout')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0025', 'WO-2026-0025', 'MNT-0025', 'Not Linked', 'Not Linked', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', 'Coating & Packaging Line 4', 'Inspection', 'IR quartz heating element resistance check', 'IR quartz heating element resistance check', 'Low', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-07-20', '2026-07-19 18:00:00', '2026-07-20 16:15:00', 1.25, 1.25, 'IR element ceramic socket', 'Thermal/Cooling', 'Tested 24 IR emitter tubes, cleaned parabolic reflectors')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0246', 'WO-2026-0246', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', 'Stamping Line 2', 'Calibration', '60-day photogrammetric master artifact grid calibration', '60-day photogrammetric master artifact grid calibration', 'High', 'Scheduled', 'Priya Nair', 'Priya Nair', '2026-10-02', '2026-10-02 06:30:00', '2026-10-02 15:30:00', 1.5, 1.5, 'Calibration target plate, lens wipes', 'Sensor/Optical', 'Scheduled blue-light projector recalibration routine')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0214', 'WO-2026-0214', 'Not Linked', 'INC-0004', 'PRD-20260701-L04-M023-A', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', 'Coating & Packaging Line 4', 'Corrective', 'Protective film misalignment during feed', 'Protective film misalignment during feed', 'Low', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-01', '2026-07-01 06:00:00', '2026-07-01 06:35:00', 0.38, 0.38, 'Magnetic brake friction pad', 'Mechanical', 'Re-centered film roll and recalibrated magnetic brake')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0062', 'WO-2026-0062', 'MNT-0062', 'INC-0078', 'PRD-20260818-L01-M004-C', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Preventive', 'Bi-weekly grinder full-shift overhaul and steady rest check', 'Bi-weekly grinder full-shift overhaul and steady rest check', 'High', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-18', '2026-08-18 22:00:00', '2026-08-19 06:00:00', 8, 8, 'Carbide steady rest pads (3x), quill seals', 'Mechanical', 'Replaced carbide pads on 3-point steady rest, greased quill')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0006', 'WO-2026-0006', 'MNT-0006', 'INC-0010', 'PRD-20260707-L01-M004-C', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Preventive', 'Scheduled full-shift idle overhaul and wheel truing', 'Scheduled full-shift idle overhaul and wheel truing', 'High', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-07', '2026-07-07 22:00:00', '2026-07-08 06:00:00', 8, 8, 'Diamond dressing roll, spindle drive belt', 'Mechanical', 'Re-dressed diamond wheel, calibrated tailstock center')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0241', 'WO-2026-0241', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Preventive', 'Bi-weekly scheduled grinder idle overhaul and filtration roll replacement', 'Bi-weekly scheduled grinder idle overhaul and filtration roll replacement', 'High', 'Scheduled', 'Rajesh Sharma', 'Rajesh Sharma', '2026-10-02', '2026-10-02 08:00:00', '2026-10-03 06:00:00', 8, 8, 'Paper band filter roll, synthetic grease', 'Mechanical', 'Queued for shift C idle maintenance window')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0073', 'WO-2026-0073', 'MNT-0073', 'INC-0091', 'PRD-20260825-L04-M023-C', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', 'Coating & Packaging Line 4', 'Preventive', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 'High', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-08-25', '2026-08-25 22:00:00', '2026-08-26 02:00:00', 4, 4, 'Guillotine cross-cut blade, tension spring', 'Mechanical', 'Checked roll nip alignment, replaced cutting guillotine blade')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0248', 'WO-2026-0248', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', 'Welding Line 3', 'Preventive', 'Torch conduit liner replacement and gas diffuser check', 'Torch conduit liner replacement and gas diffuser check', 'Medium', 'Scheduled', 'Vikram Singh', 'Vikram Singh', '2026-10-02', '2026-10-02 07:30:00', '2026-10-02 12:45:00', 1.25, 1.25, 'Steel torch liner, gas diffuser', 'Electrical', 'Scheduled liner swap to maintain continuous arc stability')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0228', 'WO-2026-0228', 'Not Linked', 'INC-0029', 'PRD-20260718-L03-M017-A', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', 'Welding Line 3', 'Corrective', 'Incomplete shot blast coverage on weldment', 'Incomplete shot blast coverage on weldment', 'Medium', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-18', '2026-07-18 06:00:00', '2026-07-18 06:35:00', 0.38, 0.38, 'Elevator drive V-belt', 'Mechanical', 'Re-tensioned elevator belt and cleared media chute')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0085', 'WO-2026-0085', 'MNT-0085', 'INC-0101', 'PRD-20260903-L04-M021-A', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', 'Coating & Packaging Line 4', 'Changeover Alignment', 'Curing oven speed and zone setpoint adjustment', 'Curing oven speed and zone setpoint adjustment', 'Medium', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-09-03', '2026-09-03 06:00:00', '2026-09-03 07:00:00', 1, 1, 'Damper control link pin', 'Thermal/Cooling', 'Set conveyor speed to 1.8 m/min, checked blower dampers')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0224', 'WO-2026-0224', 'Not Linked', 'INC-0025', 'PRD-20260715-L01-M004-B', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Changeover Alignment', 'Grinding program reload and center dress', 'Grinding program reload and center dress', 'Medium', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-15', '2026-07-15 14:00:00', '2026-07-15 14:45:00', 0.75, 0.75, 'Diamond dresser profile insert', 'Tooling', 'Loaded grinding profile recipe, dressed grinding wheel')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0032', 'WO-2026-0032', 'MNT-0032', 'Not Linked', 'Not Linked', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', 'Coating & Packaging Line 4', 'Preventive', '45-day silicone laminating roller surface inspection', '45-day silicone laminating roller surface inspection', 'Low', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-25', '2026-07-24 18:00:00', '2026-07-25 11:15:00', 1.25, 1.25, 'Roller cleaner kit, bearing grease', 'Mechanical', 'Cleaned rubber applicator roller, checked nip pressure sensors')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0013', 'WO-2026-0013', 'MNT-0013', 'INC-0016', 'PRD-20260714-L01-M001-C', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', 'Machining Line 1', 'Preventive', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 'High', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-14', '2026-07-14 22:00:00', '2026-07-15 02:00:00', 4, 4, 'Turret wipers, hydraulic filter', 'Mechanical', 'Checked turret indexing, replaced way wipers, adjusted gibs')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0247', 'WO-2026-0247', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', 'Welding Line 3', 'Preventive', 'Post-dress pack replacement axis 3 motor current logging & mastering', 'Post-dress pack replacement axis 3 motor current logging & mastering', 'High', 'In Progress', 'Vikram Singh', 'Vikram Singh', '2026-10-02', '2026-10-01 19:00:00', '2026-10-02 10:00:00', 1.5, 1.5, 'Diagnostic cable adapter, terminal pins', 'Electrical', 'Verifying axis 3 RMS motor current below 4.5A threshold')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0082', 'WO-2026-0082', 'MNT-0082', 'INC-0098', 'PRD-20260901-L01-M004-C', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Preventive', 'Bi-weekly full-shift idle overhaul and linear guideway check', 'Bi-weekly full-shift idle overhaul and linear guideway check', 'High', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-09-01', '2026-09-01 22:00:00', '2026-09-02 06:00:00', 8, 8, 'Guideway wipers (set of 8), Vactra 2 oil', 'Mechanical', 'Replaced axis guideway wipers, topped central Mobil Vactra 2')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0249', 'WO-2026-0249', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', 'Welding Line 3', 'Inspection', 'Secondary busbar inspection and electrode dressing cutter sharpness check', 'Secondary busbar inspection and electrode dressing cutter sharpness check', 'Low', 'Open', 'Rajesh Sharma', 'Rajesh Sharma', '2026-10-02', '2026-10-02 08:00:00', '2026-10-02 14:45:00', 1.25, 1.25, 'Tip dresser cutter blades (pair)', 'Mechanical', 'Work order queued to rotate cutter inserts before shift B')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0071', 'WO-2026-0071', 'MNT-0071', 'INC-0089', 'PRD-20260825-L04-M021-C', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', 'Coating & Packaging Line 4', 'Preventive', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 'High', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-08-25', '2026-08-25 22:00:00', '2026-08-26 02:00:00', 4, 4, 'High-temp synthetic grease, blower belt', 'Thermal/Cooling', 'Cleaned recirculation blowers, greased high-temp bearings')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0086', 'WO-2026-0086', 'MNT-0086', 'INC-0102', 'PRD-20260903-L04-M022-A', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', 'Coating & Packaging Line 4', 'Changeover Alignment', 'Rivet head spacing adjustment for final packaging assembly', 'Rivet head spacing adjustment for final packaging assembly', 'Medium', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-09-03', '2026-09-03 06:00:00', '2026-09-03 07:00:00', 1, 1, 'Head clamping bolts, sensor bracket', 'Tooling', 'Repositioned pneumatic heads to 120mm center-to-center')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0029', 'WO-2026-0029', 'MNT-0029', 'INC-0038', 'PRD-20260722-L01-M003-C', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Preventive', 'Post-breakdown spindle alignment & dynamic run-in', 'Post-breakdown spindle alignment & dynamic run-in', 'High', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-22', '2026-07-22 22:00:00', '2026-07-23 04:40:00', 6.67, 6.67, 'Precision synthetic spindle oil, test stock', 'Mechanical', 'Executed 4-hour speed ramp test, verified thermal growth')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0236', 'WO-2026-0236', 'Not Linked', 'INC-0041', 'PRD-20260726-L03-M014-A', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', 'Welding Line 3', 'Corrective', 'Gas flow sensor triggered momentary arc stop', 'Gas flow sensor triggered momentary arc stop', 'Low', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-07-26', '2026-07-26 06:00:00', '2026-07-26 06:19:00', 0.18, 0.18, 'Gas diffuser, nozzle shroud', 'Electrical', 'Cleaned weld torch nozzle, replaced gas diffuser')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0066', 'WO-2026-0066', 'MNT-0066', 'INC-0082', 'PRD-20260819-L01-M004-A', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', 'Machining Line 1', 'Changeover Alignment', 'Drive shaft diameter grinding program load & dress', 'Drive shaft diameter grinding program load & dress', 'Medium', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-19', '2026-08-19 06:00:00', '2026-08-19 06:45:00', 0.75, 0.75, 'Diamond dressing tool, wheel coolant', 'Tooling', 'Dressed wheel step profile for bearing journal grinding')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0054', 'WO-2026-0054', 'MNT-0054', 'INC-0064', 'PRD-20260811-L03-M014-C', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', 'Welding Line 3', 'Preventive', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 'High', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-08-11', '2026-08-11 22:00:00', '2026-08-12 02:00:00', 4, 4, 'Wire drive rollers, liner conduit', 'Electrical', 'Cleaned wire drive rolls, calibrated arc voltage sensor')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0053', 'WO-2026-0053', 'MNT-0053', 'INC-0063', 'PRD-20260811-L03-M013-C', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', 'Welding Line 3', 'Preventive', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 'High', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-08-11', '2026-08-11 22:00:00', '2026-08-12 02:00:00', 4, 4, 'Water-cooled torch neck, power cable assembly', 'Electrical', 'Checked weld power source calibration, replaced torch head')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0076', 'WO-2026-0076', 'MNT-0076', 'INC-0093', 'PRD-20260828-L02-M010-B', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', 'Stamping Line 2', 'Corrective', 'Stripper spring fatigue on station 8 rectangular punch', 'Stripper spring fatigue on station 8 rectangular punch', 'Medium', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-08-28', '2026-08-28 15:30:00', '2026-08-28 17:00:00', 1.5, 1.5, 'Urethane stripper spring set, punch die', 'Tooling', 'Replaced urethane stripper springs and punch insert')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0081', 'WO-2026-0081', 'MNT-0081', 'INC-0097', 'PRD-20260831-L03-M015-B', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', 'Welding Line 3', 'Inspection', 'Upstream starvation idle period electrode alignment check', 'Upstream starvation idle period electrode alignment check', 'High', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-08-31', '2026-08-31 16:00:00', '2026-08-31 18:40:00', 2.67, 2.67, 'Electrode adapter shanks (pair)', 'Mechanical', 'Aligned upper and lower weld guns, checked water cooling flow')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0041', 'WO-2026-0041', 'MNT-0041', 'INC-0049', 'PRD-20260730-L04-M019-B', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', 'Coating & Packaging Line 4', 'Changeover Alignment', 'Coating changeover bath replenishment', 'Coating changeover bath replenishment', 'Medium', 'Completed', 'Ananya Rao', 'Ananya Rao', '2026-07-30', '2026-07-30 14:00:00', '2026-07-30 15:00:00', 1, 1, 'DI filter cartridge, pH probe buffer', 'Chemical', 'Drained rinse stage 2, refilled with DI water')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0052', 'WO-2026-0052', 'MNT-0052', 'Not Linked', 'Not Linked', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', 'Stamping Line 2', 'Inspection', 'Hydraulic clamp jaw tooth wear check on sheet gripper', 'Hydraulic clamp jaw tooth wear check on sheet gripper', 'Low', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-08-08', '2026-08-07 18:00:00', '2026-08-08 11:15:00', 1.25, 1.25, 'Serrated clamp pads (pair)', 'Tooling', 'Cleaned gripper serrated pads, checked clamping cylinder')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0064', 'WO-2026-0064', 'MNT-0064', 'INC-0080', 'PRD-20260819-L01-M002-A', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', 'Machining Line 1', 'Changeover Alignment', 'Drive shaft milling fixture clamping setup', 'Drive shaft milling fixture clamping setup', 'Medium', 'Completed', 'Amit Patel', 'Amit Patel', '2026-08-19', '2026-08-19 06:00:00', '2026-08-19 06:45:00', 0.75, 0.75, 'Vise soft jaws, locating keys', 'Tooling', 'Mounted pneumatic clamping vise, aligned zero coordinates')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0068', 'WO-2026-0068', 'MNT-0068', 'INC-0084', 'PRD-20260819-L01-M006-A', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', 'Machining Line 1', 'Changeover Alignment', 'CMM part program load for PRD-102 drive shaft', 'CMM part program load for PRD-102 drive shaft', 'Medium', 'Completed', 'Priya Nair', 'Priya Nair', '2026-08-19', '2026-08-19 06:00:00', '2026-08-19 06:45:00', 0.75, 0.75, 'Probe stylus extension carbon fiber', 'Sensor/Optical', 'Loaded CAD inspection program, verified probe star tree')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0031', 'WO-2026-0031', 'MNT-0031', 'Not Linked', 'Not Linked', 'FAC-001', 'M016', 'Pneumatic Assembly Fixture 01', 'L03', 'Welding Line 3', 'Preventive', '45-day clamping toggle cylinder seals inspection', '45-day clamping toggle cylinder seals inspection', 'Low', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-24', '2026-07-23 18:00:00', '2026-07-24 15:15:00', 1.25, 1.25, 'Pneumatic seal kits (4x), lithium grease', 'Pneumatic', 'Replaced rod seals on 4 clamping cylinders, greased linkages')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0035', 'WO-2026-0035', 'MNT-0035', 'INC-0043', 'PRD-20260728-L02-M007-C', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', 'Stamping Line 2', 'Preventive', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 'High', 'Completed', 'Suresh Patil', 'Suresh Patil', '2026-07-28', '2026-07-28 22:00:00', '2026-07-29 04:00:00', 6, 6, 'Main hydraulic filter element, guide wear plates', 'Hydraulic', 'Replaced servo pump filter, inspected ram slide gibs')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0038', 'WO-2026-0038', 'MNT-0038', 'INC-0046', 'PRD-20260728-L02-M010-C', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', 'Stamping Line 2', 'Preventive', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 'High', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-28', '2026-07-28 22:00:00', '2026-07-29 02:00:00', 4, 4, 'Index gear timing belt, crank oil', 'Tooling', 'Checked auto-index backlash, lubricated ram crank')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0231', 'WO-2026-0231', 'Not Linked', 'INC-0032', 'PRD-20260720-L01-M003-C', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Corrective', 'Spindle 3 bearing temperature exceeded 65C', 'Spindle 3 bearing temperature exceeded 65C', 'High', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-20', '2026-07-20 22:00:00', '2026-07-20 22:55:00', 0.67, 0.67, 'Spindle quill lubricant', 'Mechanical', 'Lubricated spindle quill and pre-warned maintenance')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0083', 'WO-2026-0083', 'MNT-0083', 'INC-0099', 'PRD-20260903-L04-M019-A', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', 'Coating & Packaging Line 4', 'Changeover Alignment', 'Packaging assembly changeover wash parameters setup', 'Packaging assembly changeover wash parameters setup', 'Medium', 'Completed', 'Ananya Rao', 'Ananya Rao', '2026-09-03', '2026-09-03 06:00:00', '2026-09-03 07:00:00', 1, 1, 'Pressure regulator valve seal', 'Chemical', 'Adjusted wash temperature to 55C and spray pressure')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0030', 'WO-2026-0030', 'MNT-0030', 'Not Linked', 'Not Linked', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'L02', 'Stamping Line 2', 'Preventive', '45-day deburring abrasive belt tracking adjustment', '45-day deburring abrasive belt tracking adjustment', 'Low', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-23', '2026-07-22 18:00:00', '2026-07-23 12:45:00', 1.25, 1.25, 'Scotch-Brite abrasive belts (2x)', 'Mechanical', 'Adjusted pneumatic tracking sensor, tensioned feed rollers')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0211', 'WO-2026-0211', 'Not Linked', 'INC-0001', 'PRD-20260701-L01-M002-A', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', 'Machining Line 1', 'Corrective', 'Tool insert chipping on face mill', 'Tool insert chipping on face mill', 'Medium', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-01', '2026-07-01 06:00:00', '2026-07-01 06:33:00', 0.38, 0.38, 'Carbide milling inserts (4x)', 'Tooling', 'Replaced face mill carbide inserts and adjusted feed')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0043', 'WO-2026-0043', 'MNT-0043', 'INC-0051', 'PRD-20260730-L04-M021-B', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', 'Coating & Packaging Line 4', 'Changeover Alignment', 'Curing recipe temperature adjustment', 'Curing recipe temperature adjustment', 'Medium', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-07-30', '2026-07-30 14:00:00', '2026-07-30 15:00:00', 1, 1, 'Thermocouple wire connector', 'Thermal/Cooling', 'Updated PID setpoints for 195C powder cure profile')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0240', 'WO-2026-0240', 'Not Linked', 'Not Linked', 'Not Linked', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Predictive', 'AI-triage predictive vibration trend monitoring & FFT re-balance', 'AI-triage predictive vibration trend monitoring & FFT re-balance', 'High', 'In Progress', 'Amit Patel', 'Amit Patel', '2026-10-02', '2026-10-02 06:00:00', '2026-10-02 09:00:00', 1.5, 1.5, 'Vibration sensor pad, test arbor', 'Mechanical', 'Conducting real-time FFT spectrum analysis on rebuilt spindle 3')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0079', 'WO-2026-0079', 'MNT-0079', 'INC-0095', 'PRD-20260831-L03-M013-B', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', 'Welding Line 3', 'Breakdown', 'Robot axis 3 internal servo cable harness shearing', 'Robot axis 3 internal servo cable harness shearing', 'Critical', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-08-31', '2026-08-31 14:20:00', '2026-08-31 19:00:00', 4.67, 4.67, 'Robot axis 3-6 dress pack harness, encoder plug', 'Electrical', 'Replaced internal robot harness assembly, recalibrated mastering')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0077', 'WO-2026-0077', 'MNT-0077', 'Not Linked', 'Not Linked', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', 'Welding Line 3', 'Preventive', 'Weld fixture grounding clamp resistance check', 'Weld fixture grounding clamp resistance check', 'Low', 'Completed', 'Vikram Singh', 'Vikram Singh', '2026-08-29', '2026-08-28 18:00:00', '2026-08-29 12:15:00', 1.25, 1.25, 'Braided copper grounding lead', 'Electrical', 'Cleaned copper ground clamp contact faces, replaced braided lead')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0070', 'WO-2026-0070', 'MNT-0070', 'INC-0088', 'PRD-20260825-L04-M020-C', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', 'Coating & Packaging Line 4', 'Preventive', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 'High', 'Completed', 'Ananya Rao', 'Ananya Rao', '2026-08-25', '2026-08-25 22:00:00', '2026-08-26 02:00:00', 4, 4, 'Cartridge filter elements (4x), venturi throat', 'Electrical', 'Replaced cyclone powder recovery cartridge filters')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0044', 'WO-2026-0044', 'MNT-0044', 'INC-0052', 'PRD-20260730-L04-M022-B', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', 'Coating & Packaging Line 4', 'Changeover Alignment', 'Rivet size changeover tooling swap', 'Rivet size changeover tooling swap', 'Medium', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-30', '2026-07-30 14:00:00', '2026-07-30 15:00:00', 1, 1, 'Riveting punch die set 4.8mm', 'Tooling', 'Swapped riveting dies to 4.8mm mandrel tooling')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0045', 'WO-2026-0045', 'MNT-0045', 'INC-0053', 'PRD-20260730-L04-M023-B', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', 'Coating & Packaging Line 4', 'Changeover Alignment', 'Film width changeover guide adjustment', 'Film width changeover guide adjustment', 'Medium', 'Completed', 'Ramesh Kumar', 'Ramesh Kumar', '2026-07-30', '2026-07-30 14:00:00', '2026-07-30 15:00:00', 1, 1, 'Brake pad friction lining', 'Mechanical', 'Adjusted unwind chuck core position for 800mm roll')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0019', 'WO-2026-0019', 'MNT-0019', 'INC-0022', 'PRD-20260715-L01-M001-B', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', 'Machining Line 1', 'Changeover Alignment', 'Tool pocket setup & offset verification', 'Tool pocket setup & offset verification', 'Medium', 'Completed', 'Rajesh Sharma', 'Rajesh Sharma', '2026-07-15', '2026-07-15 14:00:00', '2026-07-15 14:45:00', 0.75, 0.75, 'Tool shim, collet nut', 'Tooling', 'Mounted boring bar holder, set tool offsets for housing')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-2026-0223', 'WO-2026-0223', 'Not Linked', 'Not Linked', 'PRD-20260715-L01-M003-B', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', 'Machining Line 1', 'Changeover Alignment', 'Multi-spindle drill guide plate setup', 'Multi-spindle drill guide plate setup', 'Medium', 'Completed', 'Amit Patel', 'Amit Patel', '2026-07-15', '2026-07-15 14:00:00', '2026-07-15 14:45:00', 0.75, 0.75, 'Drill guide bushing plate', 'Tooling', 'Installed bushing plate and set drill penetration depth')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-B01', 'WO-2026-0501', NULL, NULL, NULL, 'FAC-002', 'NOV-LTH-03', 'NOV-LTH-03', '', '', 'Corrective', 'Chuck Cylinder Rotary Joint Seal Inspection', 'Chuck Cylinder Rotary Joint Seal Inspection', 'High', 'Pending', 'Sagar N.', 'Sagar N.', '2026-10-07', '2026-10-06T03:30:00Z', NULL, 3.5, NULL, 'Kitagawa Hydraulic Cylinder Rotary Joint Kit', '', '')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-B02', 'WO-2026-0488', NULL, NULL, NULL, 'FAC-002', 'NOV-GRD-02', 'NOV-GRD-02', '', '', 'Corrective', 'Coolant Sump Ultrasonic Cleaning & Micron Filter Renewal', 'Coolant Sump Ultrasonic Cleaning & Micron Filter Renewal', 'Medium', 'In Progress', 'Maintenance Crew B', 'Maintenance Crew B', '2026-10-06', '2026-10-05T19:00:00Z', NULL, 2, NULL, '10 Micron Bag Filters x 4, Castrol Hysol Coolant 50L', '', '')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-C01', 'WO-2026-0610', NULL, NULL, NULL, 'FAC-003', 'VTX-ROB-03', 'VTX-ROB-03', '', '', 'Corrective', 'Electrode Tip Dresser Maintenance and Transformer Check', 'Electrode Tip Dresser Maintenance and Transformer Check', 'Medium', 'Pending', 'R. Balaji', 'R. Balaji', '2026-10-08', '2026-10-06T01:00:00Z', NULL, 2.5, NULL, NULL, '', '')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-D01', 'WO-2026-0720', NULL, NULL, NULL, 'FAC-004', 'PRM-SMT-02', 'PRM-SMT-02', '', '', 'Corrective', 'Vacuum Nozzle Ultrasonic Cleaning & Feeder Calibration', 'Vacuum Nozzle Ultrasonic Cleaning & Feeder Calibration', 'High', 'In Progress', 'Naveen K.', 'Naveen K.', '2026-10-06', '2026-10-06T02:45:00Z', NULL, 1.5, NULL, NULL, '', '')
ON CONFLICT (id) DO NOTHING;
INSERT INTO work_orders (id, work_order_id, maintenance_id, incident_id, production_id, factory_id, machine_id, machine_name, line_id, line_name, work_order_type, title, problem_description, priority, status, assigned_to, technician_name, due_date, created_at, completed_at, estimated_hours, actual_hours, parts_required, failure_category, action_taken)
VALUES ('WO-E01', 'WO-2026-0811', NULL, NULL, NULL, 'FAC-005', 'ORN-FRG-02', 'ORN-FRG-02', '', '', 'Corrective', 'Oil Heat Exchanger Descaling & Flow Check', 'Oil Heat Exchanger Descaling & Flow Check', 'High', 'Pending', 'N. Muthusamy', 'N. Muthusamy', '2026-10-07', '2026-10-06T03:10:00Z', NULL, 4, NULL, NULL, '', '')
ON CONFLICT (id) DO NOTHING;

-- Seed Maintenance Records
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0008', 'MNT-0008', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-07-09', '2026-07-09', 'Rajesh Sharma', 'Rajesh Sharma', 'Blast wheel turbine blade wear inspection', 'Blast wheel turbine blade wear inspection', 11300, 0, '', 'Replaced turbine control cage and impeller blade set', 'Turbine blades, control cage')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0172', 'MNT-0172', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-09-06', '2026-09-06', 'Rajesh Sharma', 'Rajesh Sharma', 'Chamber rubber curtain labyrinth seal wear check', 'Chamber rubber curtain labyrinth seal wear check', 2700, 0, '', 'Replaced 3 hanging rubber strip curtains at entry vestibule', 'Heavy-duty rubber curtain strips (3x)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0155', 'MNT-0155', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-08-20', '2026-08-20', 'Ramesh Kumar', 'Ramesh Kumar', 'Rivet sensor fiber optic detection sensitivity check', 'Rivet sensor fiber optic detection sensitivity check', 1400, 0, '', 'Cleaned sensor lens, calibrated presence threshold', 'Fiber optic cable head, lens cleaner')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0183', 'MNT-0183', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-09-17', '2026-09-17', 'Suresh Patil', 'Suresh Patil', 'Exhaust fume ventilation damper actuator check', 'Exhaust fume ventilation damper actuator check', 1700, 0, '', 'Tested pneumatic rotary actuator on fume exhaust duct', 'Rotary actuator seal, limit switch')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0072', 'MNT-0072', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-08-25', '2026-08-26', 'Ramesh Kumar', 'Ramesh Kumar', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 8000, 4, '', 'Dressed orbital riveting peen heads, checked motor brushes', 'Orbital riveting peen heads (2x)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0091', 'MNT-0091', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', '', 'Corrective', 'Corrective', 'Completed', '2026-09-08', '2026-09-08', 'Deepak Verma', 'Deepak Verma', 'Cutting nozzle change and focus recalibration', 'Cutting nozzle change and focus recalibration', 2800, 0, '', 'Mounted 1.5mm copper cutting nozzle, centered beam', 'Laser copper nozzle 1.5mm, ceramic ring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0159', 'MNT-0159', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-08-24', '2026-08-24', 'Amit Patel', 'Amit Patel', 'Through-spindle coolant rotary union leak check', 'Through-spindle coolant rotary union leak check', 2500, 0, '', 'Inspected ceramic seal face on 70 bar rotary union', 'Rotary union seal ring, drain tube')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0003', 'MNT-0003', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', '', 'Corrective', 'Corrective', 'Completed', '2026-07-04', '2026-07-04', 'Suresh Patil', 'Suresh Patil', 'Slow chamber clamp cylinder actuation', 'Slow chamber clamp cylinder actuation', 5200, 0.7, '', 'Flushed valve assembly, replaced return line filter', 'Return line filter, seal ring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0087', 'MNT-0087', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-09-03', '2026-09-03', 'Ramesh Kumar', 'Ramesh Kumar', 'Protective film roll mounting and tension calibration', 'Protective film roll mounting and tension calibration', 1600, 0, '', 'Loaded 650mm film roll, adjusted magnetic brake tension', 'Film guide roller bush')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0001', 'MNT-0001', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-07-02', '2026-07-02', 'Rajesh Sharma', 'Rajesh Sharma', 'Routine 30-day lubrication and chuck jaw inspection', 'Routine 30-day lubrication and chuck jaw inspection', 2050, 0, '', 'Lubricated chuck guide ways, verified clamping force', 'Chuck grease, wiper seals')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0006', 'MNT-0006', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-07-07', '2026-07-08', 'Rajesh Sharma', 'Rajesh Sharma', 'Scheduled full-shift idle overhaul and wheel truing', 'Scheduled full-shift idle overhaul and wheel truing', 20900, 8, '', 'Re-dressed diamond wheel, calibrated tailstock center', 'Diamond dressing roll, spindle drive belt')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0193', 'MNT-0193', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-09-27', '2026-09-27', 'Rajesh Sharma', 'Rajesh Sharma', 'Electrode rapid advance stroke speed cushion test', 'Electrode rapid advance stroke speed cushion test', 1700, 0, '', 'Adjusted pneumatic cylinder end-cushion needle valve', 'Needle valve seal, cushion ring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0131', 'MNT-0131', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-07-26', '2026-07-26', 'Rajesh Sharma', 'Rajesh Sharma', 'Abrasive media hopper screen sieve inspection', 'Abrasive media hopper screen sieve inspection', 1350, 0, '', 'Cleared oversize flash debris from classifier screen', 'Screen clamp fastener, rubber seal')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0033', 'MNT-0033', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'L03', '', 'Calibration', 'Calibration', 'Completed', '2026-07-26', '2026-07-26', 'Priya Nair', 'Priya Nair', '60-day phased array acoustic calibration on subframe weld sample', '60-day phased array acoustic calibration on subframe weld sample', 6400, 0, '', 'Calibrated wedge delay, normalized receiver sensitivity', 'Ultrasonic couplant, wedge membrane')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0197', 'MNT-0197', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-10-01', '2026-10-01', 'Ananya Rao', 'Ananya Rao', 'Stage 2 rinse tank water overflow rate check', 'Stage 2 rinse tank water overflow rate check', 1450, 0, '', 'Cleaned overflow weir, adjusted fresh water makeup rate', 'Float valve seal, weir gasket')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0082', 'MNT-0082', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-09-01', '2026-09-02', 'Rajesh Sharma', 'Rajesh Sharma', 'Bi-weekly full-shift idle overhaul and linear guideway check', 'Bi-weekly full-shift idle overhaul and linear guideway check', 15500, 8, '', 'Replaced axis guideway wipers, topped central Mobil Vactra 2', 'Guideway wipers (set of 8), Vactra 2 oil')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0186', 'MNT-0186', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-09-20', '2026-09-20', 'Deepak Verma', 'Deepak Verma', 'X/Y helical rack and pinion drive backlash check', 'X/Y helical rack and pinion drive backlash check', 1800, 0, '', 'Measured backlash with dial indicator (<0.02mm)', 'Rack lubrication felt pinion, grease')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0102', 'MNT-0102', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-09-15', '2026-09-16', 'Rajesh Sharma', 'Rajesh Sharma', 'Bi-weekly grinder full-shift overhaul and tailstock alignment', 'Bi-weekly grinder full-shift overhaul and tailstock alignment', 17000, 8, '', 'Calibrated pneumatic tailstock quill, checked spindle bearings', 'Tailstock quill seals, synthetic grease')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0078', 'MNT-0078', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-08-30', '2026-08-30', 'Rajesh Sharma', 'Rajesh Sharma', 'Abrasive media elevator bucket belt tensioning', 'Abrasive media elevator bucket belt tensioning', 5900, 0, '', 'Tensioned bucket belt, replaced 4 worn steel buckets', 'Cast elevator buckets (4x), belt fasteners')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0126', 'MNT-0126', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-07-21', '2026-07-21', 'Rajesh Sharma', 'Rajesh Sharma', 'Proportional valve amplifier zero-offset calibration', 'Proportional valve amplifier zero-offset calibration', 1900, 0, '', 'Adjusted potentiometer zero balance on servo valve driver', 'Test potentiometer trimmer, fuse')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0023', 'MNT-0023', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-07-19', '2026-07-19', 'Vikram Singh', 'Vikram Singh', 'Gas flow regulator calibration and anti-spatter level', 'Gas flow regulator calibration and anti-spatter level', 2300, 0, '', 'Replaced flow meter O-ring, topped anti-spatter reservoir', 'Gas diffuser, nozzle insulation ring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0209', 'MNT-0209', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-10-02', '2026-10-02', 'Suresh Patil', 'Suresh Patil', 'Press hydraulic cooler plate heat exchanger efficiency', 'Press hydraulic cooler plate heat exchanger efficiency', 2800, 0, '', 'Backflushed water side of plate cooler, checked oil temp', 'Plate heat exchanger gasket, flush solvent')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0007', 'MNT-0007', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', '', 'Corrective', 'Corrective', 'Completed', '2026-07-08', '2026-07-08', 'Vikram Singh', 'Vikram Singh', 'Electrode cylinder pressure drop during squeeze', 'Electrode cylinder pressure drop during squeeze', 4300, 0.6, '', 'Replaced pressure regulator and dressed copper tips', 'Pneumatic regulator, electrode tips')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0017', 'MNT-0017', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-07-14', '2026-07-15', 'Suresh Patil', 'Suresh Patil', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 9900, 4, '', 'Cleaned combustion chamber, tested spark ignition plugs', 'Chamber seal ring, ignition electrodes')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0152', 'MNT-0152', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-08-17', '2026-08-17', 'Ananya Rao', 'Ananya Rao', 'Stage 4 passivation bath chemical concentration test', 'Stage 4 passivation bath chemical concentration test', 4000, 0, '', 'Sampled bath, added 12L zirconium passivation booster', 'Zirconium passivation chemistry 12L')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0144', 'MNT-0144', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-08-09', '2026-08-09', 'Ramesh Kumar', 'Ramesh Kumar', 'Sheet positioning pin pneumatic cylinders inspection', 'Sheet positioning pin pneumatic cylinders inspection', 3400, 0, '', 'Replaced 2 pneumatic locator cylinders, checked squareness', 'Locator pin cylinders (2x), flow controls')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0042', 'MNT-0042', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-07-30', '2026-07-30', 'Ananya Rao', 'Ananya Rao', 'Powder color changeover booth purge', 'Powder color changeover booth purge', 3600, 0, '', 'Automated fast-color purge of hopper and feed tubes', 'Fluidized bed filter, injector sleeve')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0205', 'MNT-0205', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-09-30', '2026-09-30', 'Amit Patel', 'Amit Patel', 'Post-overhaul 3-week vibration frequency FFT check', 'Post-overhaul 3-week vibration frequency FFT check', 1900, 0, '', 'Spectra analysis on all 4 spindles at 6000 RPM', 'Vibration sensor pad, connector cable')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0002', 'MNT-0002', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-07-03', '2026-07-03', 'Amit Patel', 'Amit Patel', 'Spindle chiller filter inspection and coolant top-up', 'Spindle chiller filter inspection and coolant top-up', 2700, 0, '', 'Cleaned chiller intake filter, topped deionized coolant', 'Chiller filter cartridge')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0202', 'MNT-0202', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-10-02', '2026-10-02', 'Vikram Singh', 'Vikram Singh', 'Pallet discharge turntable photoelectric safety mute sensor', 'Pallet discharge turntable photoelectric safety mute sensor', 1700, 0, '', 'Aligned polarized retroreflective sensors at turntable exit', 'Retroreflective target reflector, bracket')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0149', 'MNT-0149', 'FAC-001', 'M016', 'Pneumatic Assembly Fixture 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-08-14', '2026-08-14', 'Ramesh Kumar', 'Ramesh Kumar', 'Proximity sensor sensing gap on all 6 clamp cylinders', 'Proximity sensor sensing gap on all 6 clamp cylinders', 1400, 0, '', 'Adjusted sensor brackets, verified PLC input indicators', 'Inductive sensor bracket, M12 nut')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0164', 'MNT-0164', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-08-29', '2026-08-29', 'Rajesh Sharma', 'Rajesh Sharma', 'Optical safety light curtain alignment check', 'Optical safety light curtain alignment check', 1800, 0, '', 'Aligned transmitter and receiver columns along bed length', 'Optical mirror bracket, clean cloth')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0199', 'MNT-0199', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-10-01', '2026-10-01', 'Vikram Singh', 'Vikram Singh', 'Thermocouple calibration in zone 1-3 cure chamber', 'Thermocouple calibration in zone 1-3 cure chamber', 2300, 0, '', 'Calibrated 6 mineral insulated K-type thermocouples', 'Thermocouple K-type probe, terminal block')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0015', 'MNT-0015', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-07-14', '2026-07-15', 'Amit Patel', 'Amit Patel', 'Line 1 monthly planned shutdown extended PM', 'Line 1 monthly planned shutdown extended PM', 17300, 6.7, '', 'Flushed spindle gearcase, replaced timing belts, checked runout', 'Multi-spindle drive belt set, oil filter')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0085', 'MNT-0085', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-09-03', '2026-09-03', 'Vikram Singh', 'Vikram Singh', 'Curing oven speed and zone setpoint adjustment', 'Curing oven speed and zone setpoint adjustment', 1500, 0, '', 'Set conveyor speed to 1.8 m/min, checked blower dampers', 'Damper control link pin')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0161', 'MNT-0161', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-08-26', '2026-08-26', 'Suresh Patil', 'Suresh Patil', 'Hydraulic toggle clamping cylinder pressure relief test', 'Hydraulic toggle clamping cylinder pressure relief test', 2350, 0, '', 'Calibrated pressure relief setting to 210 bar', 'Relief valve cartridge seal')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0130', 'MNT-0130', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-07-25', '2026-07-25', 'Rajesh Sharma', 'Rajesh Sharma', 'Weld transformer primary cable lug torque verification', 'Weld transformer primary cable lug torque verification', 1800, 0, '', 'Torqued 8 power lugs to 45 Nm, applied thermal paste', 'Thermal compound, copper Belleville washers')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0018', 'MNT-0018', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-07-14', '2026-07-15', 'Priya Nair', 'Priya Nair', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 7200, 4, '', 'Verified optical scales, updated calibration matrix', 'Cleaning solvents, probe module seal')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0061', 'MNT-0061', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-08-16', '2026-08-16', 'Suresh Patil', 'Suresh Patil', 'Post-breakdown servo hydraulic pressure validation and PM', 'Post-breakdown servo hydraulic pressure validation and PM', 18300, 6, '', 'Flushed 200L oil, bled air pockets, verified tonnage sensor', 'Hydraulic oil HLP 46 (200L), high-pressure filters')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0114', 'MNT-0114', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'L03', '', 'Calibration', 'Calibration', 'Completed', '2026-07-07', '2026-07-07', 'Priya Nair', 'Priya Nair', 'Laser ultrasonic interferometer optical alignment check', 'Laser ultrasonic interferometer optical alignment check', 4100, 0, '', 'Cleaned optical beam splitter, verified laser frequency', 'Optics lens wipe, alignment target')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0005', 'MNT-0005', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-07-06', '2026-07-06', 'Ramesh Kumar', 'Ramesh Kumar', 'Turret station 12 guide bushing clearance check', 'Turret station 12 guide bushing clearance check', 1800, 0, '', 'Measured bore runout, adjusted striker alignment', 'Shim set, guide pin')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0056', 'MNT-0056', 'FAC-001', 'M016', 'Pneumatic Assembly Fixture 01', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-08-11', '2026-08-12', 'Ramesh Kumar', 'Ramesh Kumar', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 7100, 4, '', 'Cleaned fixture datum pins, replaced main pneumatic FRL', 'Filter regulator lubricator unit, datum pins')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0111', 'MNT-0111', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-07-04', '2026-07-04', 'Rajesh Sharma', 'Rajesh Sharma', 'Pneumatic cylinder force calibration and electrode gap', 'Pneumatic cylinder force calibration and electrode gap', 2000, 0, '', 'Calibrated load cell force measurement, set electrode stroke', 'Pneumatic fitting, sensor bracket')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0139', 'MNT-0139', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-08-04', '2026-08-04', 'Amit Patel', 'Amit Patel', 'Spindle 1-4 thermal sensor logging check', 'Spindle 1-4 thermal sensor logging check', 1650, 0, '', 'Verified PT100 bearing temperature readings under load', 'Thermal sensor cable clip, heat paste')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0167', 'MNT-0167', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-09-01', '2026-09-01', 'Priya Nair', 'Priya Nair', 'Scanner carbon-fiber arm counter-balance spring check', 'Scanner carbon-fiber arm counter-balance spring check', 2250, 0, '', 'Adjusted gas spring tension for neutral float', 'Gas spring strut, ball joint socket')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0195', 'MNT-0195', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-09-29', '2026-09-29', 'Rajesh Sharma', 'Rajesh Sharma', 'Chamber rotary worktable drive pinion gear wear check', 'Chamber rotary worktable drive pinion gear wear check', 2200, 0, '', 'Checked tooth mesh backlash on 2m rotary turntable', 'Pinion gear lubricant, seal gasket')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0201', 'MNT-0201', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-10-02', '2026-10-02', 'Ramesh Kumar', 'Ramesh Kumar', 'Film dancer roller position feedback potentiometer test', 'Film dancer roller position feedback potentiometer test', 1750, 0, '', 'Calibrated linear potentiometer on tension dancer arm', 'Linear potentiometer, tension spring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0045', 'MNT-0045', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-07-30', '2026-07-30', 'Ramesh Kumar', 'Ramesh Kumar', 'Film width changeover guide adjustment', 'Film width changeover guide adjustment', 1800, 0, '', 'Adjusted unwind chuck core position for 800mm roll', 'Brake pad friction lining')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0089', 'MNT-0089', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', '', 'Corrective', 'Corrective', 'Completed', '2026-09-08', '2026-09-08', 'Rajesh Sharma', 'Rajesh Sharma', 'Re-tooling setup for precision housing batch', 'Re-tooling setup for precision housing batch', 2200, 0, '', 'Replaced boring tool insert and set zero datum', 'Carbide insert CNMG (10x)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0187', 'MNT-0187', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-09-21', '2026-09-21', 'Rajesh Sharma', 'Rajesh Sharma', 'Backgauge R-axis vertical ball screw lubrication', 'Backgauge R-axis vertical ball screw lubrication', 1700, 0, '', 'Cleaned vertical column, applied grease to R-axis screw', 'Linear guide wiper, grease cartridge')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0206', 'MNT-0206', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-09-30', '2026-09-30', 'Rajesh Sharma', 'Rajesh Sharma', 'Grinding spindle motor vibration damper bushing check', 'Grinding spindle motor vibration damper bushing check', 3200, 0, '', 'Replaced rubber isolation mounts under motor base', 'Elastomer vibration isolator mounts (4x)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0189', 'MNT-0189', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-09-23', '2026-09-23', 'Rajesh Sharma', 'Rajesh Sharma', 'Conveyor belt tracking optical sensors alignment', 'Conveyor belt tracking optical sensors alignment', 1400, 0, '', 'Cleaned photoelectric tracking eyes on feed belt', 'Sensor lens cover, mounting clamp')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0009', 'MNT-0009', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-07-10', '2026-07-10', 'Ananya Rao', 'Ananya Rao', 'Cascade high-voltage generator diagnostic check', 'Cascade high-voltage generator diagnostic check', 2300, 0, '', 'Tested kV output on guns 1-4, cleaned corona needles', 'Corona charging pins')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0064', 'MNT-0064', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', '', 'Corrective', 'Corrective', 'Completed', '2026-08-19', '2026-08-19', 'Amit Patel', 'Amit Patel', 'Drive shaft milling fixture clamping setup', 'Drive shaft milling fixture clamping setup', 1700, 0, '', 'Mounted pneumatic clamping vise, aligned zero coordinates', 'Vise soft jaws, locating keys')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0067', 'MNT-0067', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', '', 'Corrective', 'Corrective', 'Completed', '2026-08-19', '2026-08-19', 'Suresh Patil', 'Suresh Patil', 'Drive shaft basket fixture loading check', 'Drive shaft basket fixture loading check', 1600, 0, '', 'Installed custom stainless steel basket for long shafts', 'Basket guide rails, locking pin')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0030', 'MNT-0030', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-07-23', '2026-07-23', 'Rajesh Sharma', 'Rajesh Sharma', '45-day deburring abrasive belt tracking adjustment', '45-day deburring abrasive belt tracking adjustment', 4500, 0, '', 'Adjusted pneumatic tracking sensor, tensioned feed rollers', 'Scotch-Brite abrasive belts (2x)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0165', 'MNT-0165', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-08-30', '2026-08-30', 'Ramesh Kumar', 'Ramesh Kumar', 'Slug vacuum extraction tube suction test', 'Slug vacuum extraction tube suction test', 1550, 0, '', 'Cleared slug chute obstruction, checked vacuum booster', 'Slug suction nozzle, flex hose')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0198', 'MNT-0198', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-10-01', '2026-10-01', 'Ananya Rao', 'Ananya Rao', 'Powder fluidizing plate porous tile pressure check', 'Powder fluidizing plate porous tile pressure check', 2150, 0, '', 'Cleaned porous polyethylene fluidizing floor tiles', 'Fluidizing tile gasket, air nozzle')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0136', 'MNT-0136', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-07-31', '2026-07-31', 'Vikram Singh', 'Vikram Singh', 'Pallet stretch wrapper film pre-stretch roller belt check', 'Pallet stretch wrapper film pre-stretch roller belt check', 3200, 0, '', 'Replaced polyurethane timing belt on film carriage', 'Pre-stretch timing belt, carriage guide wheels')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0192', 'MNT-0192', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-09-26', '2026-09-26', 'Vikram Singh', 'Vikram Singh', 'Wire feed spool brake tension calibration', 'Wire feed spool brake tension calibration', 1450, 0, '', 'Adjusted spool hub friction brake to prevent bird-nesting', 'Friction washer, spool lock pin')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0121', 'MNT-0121', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-07-16', '2026-07-16', 'Rajesh Sharma', 'Rajesh Sharma', 'Spindle collet clamping force hydraulic sensor check', 'Spindle collet clamping force hydraulic sensor check', 1750, 0, '', 'Tested collet chuck pressure switch calibration', 'Pressure switch seal, test bar')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0143', 'MNT-0143', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-08-08', '2026-08-08', 'Rajesh Sharma', 'Rajesh Sharma', 'Hydraulic upper tool clamping wedge pressure check', 'Hydraulic upper tool clamping wedge pressure check', 1800, 0, '', 'Bled pneumatic-hydraulic booster, checked clamping bars', 'Booster seal, clamping wedge shim')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0083', 'MNT-0083', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-09-03', '2026-09-03', 'Ananya Rao', 'Ananya Rao', 'Packaging assembly changeover wash parameters setup', 'Packaging assembly changeover wash parameters setup', 2100, 0, '', 'Adjusted wash temperature to 55C and spray pressure', 'Pressure regulator valve seal')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0160', 'MNT-0160', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-08-25', '2026-08-25', 'Amit Patel', 'Amit Patel', 'Spindle tap holder tension-compression float check', 'Spindle tap holder tension-compression float check', 2100, 0, '', 'Dressed tap chuck collets, checked axial float travel', 'Tapping collet ER20 (2x), spring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0140', 'MNT-0140', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-08-05', '2026-08-05', 'Suresh Patil', 'Suresh Patil', 'Combustion chamber cooling water jacket flush', 'Combustion chamber cooling water jacket flush', 3800, 0, '', 'Flushed cooling channels with descaling acid solution', 'Descaling agent, water hose coupler')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0044', 'MNT-0044', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-07-30', '2026-07-30', 'Ramesh Kumar', 'Ramesh Kumar', 'Rivet size changeover tooling swap', 'Rivet size changeover tooling swap', 4400, 0, '', 'Swapped riveting dies to 4.8mm mandrel tooling', 'Riveting punch die set 4.8mm')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0173', 'MNT-0173', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-09-07', '2026-09-07', 'Priya Nair', 'Priya Nair', 'Generation laser energy detector calibration check', 'Generation laser energy detector calibration check', 2600, 0, '', 'Calibrated pyroelectric energy sensor with reference meter', 'Pyroelectric sensor window, test filter')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0153', 'MNT-0153', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-08-18', '2026-08-18', 'Ananya Rao', 'Ananya Rao', 'Reciprocator linear drive belt tension and encoder check', 'Reciprocator linear drive belt tension and encoder check', 1950, 0, '', 'Checked tooth belt on vertical gun reciprocator mast', 'Reciprocator timing belt, guide slider')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0060', 'MNT-0060', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', '', 'Breakdown', 'Breakdown', 'Completed', '2026-08-16', '2026-08-16', 'Suresh Patil', 'Suresh Patil', 'Main cylinder hydraulic seal blowout under 250T load', 'Main cylinder hydraulic seal blowout under 250T load', 65500, 6.6, '', 'Isolated HPU, disassembled cylinder head, replaced main seal kit', 'Complete 250T cylinder seal pack, servo pilot valve')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0048', 'MNT-0048', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-08-02', '2026-08-02', 'Amit Patel', 'Amit Patel', 'Centralized grease cartridge replacement', 'Centralized grease cartridge replacement', 3500, 0, '', 'Replaced LHL grease cartridge, bled distribution block', 'LHL 700g grease pack (2x)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0075', 'MNT-0075', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-08-27', '2026-08-27', 'Deepak Verma', 'Deepak Verma', 'Chiller deionized water filter and conductivity check', 'Chiller deionized water filter and conductivity check', 5400, 0, '', 'Replaced deionizing resin canister, cleaned strainer', 'Deionizing resin cartridge')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0021', 'MNT-0021', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-07-17', '2026-07-17', 'Ramesh Kumar', 'Ramesh Kumar', 'Bending crown crowning system calibration', 'Bending crown crowning system calibration', 1700, 0, '', 'Checked hydraulic crowning cylinders under 100T load', 'Sensor cable clip, test bar')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0175', 'MNT-0175', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-09-09', '2026-09-09', 'Ananya Rao', 'Ananya Rao', 'Venturi powder injector nozzle throat wear check', 'Venturi powder injector nozzle throat wear check', 2900, 0, '', 'Measured internal bore wear on 4 PTFE injector inserts', 'PTFE injector inserts (4x)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0207', 'MNT-0207', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-10-01', '2026-10-01', 'Suresh Patil', 'Suresh Patil', 'Combustion chamber optical flame sensor optical cleanliness', 'Combustion chamber optical flame sensor optical cleanliness', 1800, 0, '', 'Cleaned sapphire view window for UV flame detector', 'Sapphire window O-ring, optic wipe')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0080', 'MNT-0080', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-08-31', '2026-08-31', 'Vikram Singh', 'Vikram Singh', 'Upstream starvation idle period cell preventive inspection', 'Upstream starvation idle period cell preventive inspection', 3700, 3.8, '', 'Inspected robot arm cables, cleaned weld torch mount', 'Torch nozzle, contact tips')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0203', 'MNT-0203', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-09-29', '2026-09-29', 'Rajesh Sharma', 'Rajesh Sharma', 'End-of-month coolant sump skimming and refractometer check', 'End-of-month coolant sump skimming and refractometer check', 2050, 0, '', 'Removed tramp oil, adjusted coolant concentration to 7.5%', 'Coolant concentrate 20L, tramp oil disc filter')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0096', 'MNT-0096', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-09-08', '2026-09-09', 'Rajesh Sharma', 'Rajesh Sharma', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 9300, 4, '', 'Replaced hydraulic return filter, checked tailstock pressure', 'Hydraulic filter, chuck lubrication pack')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0066', 'MNT-0066', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', '', 'Corrective', 'Corrective', 'Completed', '2026-08-19', '2026-08-19', 'Rajesh Sharma', 'Rajesh Sharma', 'Drive shaft diameter grinding program load & dress', 'Drive shaft diameter grinding program load & dress', 3700, 0, '', 'Dressed wheel step profile for bearing journal grinding', 'Diamond dressing tool, wheel coolant')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0076', 'MNT-0076', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', '', 'Corrective', 'Corrective', 'Completed', '2026-08-28', '2026-08-28', 'Ramesh Kumar', 'Ramesh Kumar', 'Stripper spring fatigue on station 8 rectangular punch', 'Stripper spring fatigue on station 8 rectangular punch', 4400, 0.6, '', 'Replaced urethane stripper springs and punch insert', 'Urethane stripper spring set, punch die')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0088', 'MNT-0088', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-09-03', '2026-09-03', 'Vikram Singh', 'Vikram Singh', 'Final packaging palletizing pattern teach pendant update', 'Final packaging palletizing pattern teach pendant update', 1700, 0, '', 'Taught pick-and-place waypoints for PRD-106 boxes', 'Robot teaching cable protector')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0040', 'MNT-0040', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-07-28', '2026-07-29', 'Priya Nair', 'Priya Nair', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 6200, 4, '', 'Cleaned carbon-fiber enclosure, checked turntable encoder', 'Rotary table slip ring cleaning kit')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0026', 'MNT-0026', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', '', 'Corrective', 'Corrective', 'Completed', '2026-07-21', '2026-07-21', 'Amit Patel', 'Amit Patel', 'Drilling spindle 3 excessive vibration and degraded speed', 'Drilling spindle 3 excessive vibration and degraded speed', 5700, 0.3, '', 'Performed vibration analysis, adjusted drive belt tension', 'Tensioner pulley, sensor lead')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0194', 'MNT-0194', 'FAC-001', 'M016', 'Pneumatic Assembly Fixture 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-09-28', '2026-09-28', 'Ramesh Kumar', 'Ramesh Kumar', 'Part present pneumatic back-pressure sensor test', 'Part present pneumatic back-pressure sensor test', 1500, 0, '', 'Tested air sensing nozzles at 4 part seat locations', 'Sensing nozzle, differential switch')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0073', 'MNT-0073', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-08-25', '2026-08-26', 'Ramesh Kumar', 'Ramesh Kumar', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 7000, 4, '', 'Checked roll nip alignment, replaced cutting guillotine blade', 'Guillotine cross-cut blade, tension spring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0163', 'MNT-0163', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-08-28', '2026-08-28', 'Deepak Verma', 'Deepak Verma', 'Beam dump cooling circuit thermal sensor inspect', 'Beam dump cooling circuit thermal sensor inspect', 2100, 0, '', 'Checked temperature interlock switch at 45C limit', 'Thermal switch, cooling tube')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0062', 'MNT-0062', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-08-18', '2026-08-19', 'Rajesh Sharma', 'Rajesh Sharma', 'Bi-weekly grinder full-shift overhaul and steady rest check', 'Bi-weekly grinder full-shift overhaul and steady rest check', 17100, 8, '', 'Replaced carbide pads on 3-point steady rest, greased quill', 'Carbide steady rest pads (3x), quill seals')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0027', 'MNT-0027', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-07-21', '2026-07-22', 'Rajesh Sharma', 'Rajesh Sharma', 'Bi-weekly grinder idle shift spindle flange alignment', 'Bi-weekly grinder idle shift spindle flange alignment', 15800, 8, '', 'Cleaned wheel mount flange, checked acoustic emission sensor', 'Flange bolts, sensor cable, coolant nozzle')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0013', 'MNT-0013', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-07-14', '2026-07-15', 'Rajesh Sharma', 'Rajesh Sharma', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 9700, 4, '', 'Checked turret indexing, replaced way wipers, adjusted gibs', 'Turret wipers, hydraulic filter')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0210', 'MNT-0210', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-10-02', '2026-10-02', 'Deepak Verma', 'Deepak Verma', 'Cutting head crash protection magnetic breakaway test', 'Cutting head crash protection magnetic breakaway test', 2000, 0, '', 'Tested breakaway sensor release force and instant shutoff', 'Breakaway spring pin, sensor connector')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0196', 'MNT-0196', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-09-30', '2026-09-30', 'Priya Nair', 'Priya Nair', 'Inspection head purge air drying filter replacement', 'Inspection head purge air drying filter replacement', 3200, 0, '', 'Replaced sub-micron coalescing air filter on optics box', 'Coalescing filter 0.01 um cartridge')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0134', 'MNT-0134', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-07-29', '2026-07-29', 'Vikram Singh', 'Vikram Singh', 'Curing tunnel entry/exit air curtain velocity check', 'Curing tunnel entry/exit air curtain velocity check', 1300, 0, '', 'Measured velocity profile across 1.2m slot opening', 'Air filter pad, anemometer battery')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0147', 'MNT-0147', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-08-12', '2026-08-12', 'Vikram Singh', 'Vikram Singh', 'Safety interlock gate switch and e-stop circuit test', 'Safety interlock gate switch and e-stop circuit test', 1550, 0, '', 'Tested redundant dual-channel safety relays on cell gates', 'Safety key interlock switch')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0135', 'MNT-0135', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-07-30', '2026-07-30', 'Ramesh Kumar', 'Ramesh Kumar', 'Rivet bowl vibratory feeder drive spring inspection', 'Rivet bowl vibratory feeder drive spring inspection', 1500, 0, '', 'Checked leaf spring mounting bolts, tightened to torque', 'Feeder leaf springs, rubber isolation feet')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0031', 'MNT-0031', 'FAC-001', 'M016', 'Pneumatic Assembly Fixture 01', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-07-24', '2026-07-24', 'Ramesh Kumar', 'Ramesh Kumar', '45-day clamping toggle cylinder seals inspection', '45-day clamping toggle cylinder seals inspection', 3800, 0, '', 'Replaced rod seals on 4 clamping cylinders, greased linkages', 'Pneumatic seal kits (4x), lithium grease')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0058', 'MNT-0058', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-08-11', '2026-08-12', 'Priya Nair', 'Priya Nair', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 7000, 4, '', 'Cleaned laser reception optics, updated inspection templates', 'Optical filter, protective window')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0010', 'MNT-0010', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-07-11', '2026-07-11', 'Ramesh Kumar', 'Ramesh Kumar', 'Rivet feed track jam at station 2', 'Rivet feed track jam at station 2', 2800, 0.5, '', 'Deburred feeder track, replaced pneumatic escapement pin', 'Escapement guide pin, feed spring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0200', 'MNT-0200', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-10-02', '2026-10-02', 'Ramesh Kumar', 'Ramesh Kumar', 'Hydraulic-pneumatic intensifier pressure output check', 'Hydraulic-pneumatic intensifier pressure output check', 2000, 0, '', 'Tested 300 bar intensifier stroke pressure curve', 'Intensifier high-pressure seal ring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0156', 'MNT-0156', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-08-21', '2026-08-21', 'Ramesh Kumar', 'Ramesh Kumar', 'Laminating roller pneumatic pressure cylinder balance', 'Laminating roller pneumatic pressure cylinder balance', 1700, 0, '', 'Checked pressure differential between left and right air rams', 'Pneumatic regulator, gauge fitting')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0112', 'MNT-0112', 'FAC-001', 'M016', 'Pneumatic Assembly Fixture 01', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-07-05', '2026-07-05', 'Ramesh Kumar', 'Ramesh Kumar', 'Clamping manifold quick-exhaust valve inspection', 'Clamping manifold quick-exhaust valve inspection', 2450, 0, '', 'Replaced 2 quick-exhaust valve diaphragms, checked cycle time', 'Quick exhaust diaphragms (2x), push-in fittings')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0105', 'MNT-0105', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-09-22', '2026-09-23', 'Rajesh Sharma', 'Rajesh Sharma', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 8700, 4, '', 'Adjusted hydraulic cylinder synchronization, checked backgauge', 'Hydraulic oil filter, sync sensor cable')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0092', 'MNT-0092', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', '', 'Corrective', 'Corrective', 'Completed', '2026-09-08', '2026-09-08', 'Rajesh Sharma', 'Rajesh Sharma', 'Punch and V-die tooling swap for bracket bending', 'Punch and V-die tooling swap for bracket bending', 3900, 0, '', 'Installed hardened 88-degree punch and 12mm V-die', 'Segmented punch clamps, die shims')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0142', 'MNT-0142', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-08-07', '2026-08-07', 'Deepak Verma', 'Deepak Verma', 'Shuttle table pallet changer drive chains lubrication', 'Shuttle table pallet changer drive chains lubrication', 1850, 0, '', 'Cleaned chain guides, lubricated heavy-duty link chain', 'Chain lubricant spray, wiper felt')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0178', 'MNT-0178', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-09-12', '2026-09-12', 'Ramesh Kumar', 'Ramesh Kumar', 'Film roll pneumatic chuck inflation pressure check', 'Film roll pneumatic chuck inflation pressure check', 1600, 0, '', 'Checked expanding bladder pneumatic chuck pressure at 5 bar', 'Chuck air valve core, inflation hose')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0141', 'MNT-0141', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-08-06', '2026-08-06', 'Priya Nair', 'Priya Nair', 'Environmental temperature/humidity sensor calibration', 'Environmental temperature/humidity sensor calibration', 1900, 0, '', 'Calibrated ambient monitoring system at 20.0C +/-0.5C', 'Temp sensor probe, calibration log')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0050', 'MNT-0050', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', '', 'Corrective', 'Corrective', 'Completed', '2026-08-06', '2026-08-06', 'Suresh Patil', 'Suresh Patil', 'Slide cushion hydraulic pressure fluctuation', 'Slide cushion hydraulic pressure fluctuation', 6000, 0.6, '', 'Cleaned valve cooling jacket, checked coil impedance', 'Solenoid valve coil, connector')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0054', 'MNT-0054', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-08-11', '2026-08-12', 'Vikram Singh', 'Vikram Singh', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 10800, 4, '', 'Cleaned wire drive rolls, calibrated arc voltage sensor', 'Wire drive rollers, liner conduit')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0122', 'MNT-0122', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', '', 'Corrective', 'Corrective', 'Completed', '2026-07-17', '2026-07-17', 'Amit Patel', 'Amit Patel', 'Chip conveyor belt minor squeaking noise', 'Chip conveyor belt minor squeaking noise', 1700, 0, '', 'Lubricated conveyor chain, tensioned drive motor', 'Conveyor pin, drive chain grease')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0020', 'MNT-0020', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-07-16', '2026-07-16', 'Suresh Patil', 'Suresh Patil', 'Counterbalance cylinder pressure check and oil sampling', 'Counterbalance cylinder pressure check and oil sampling', 3300, 0, '', 'Sampled ISO VG 46 oil, checked proportional valves', 'Sampling bottle, hydraulic breather filter')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0180', 'MNT-0180', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-09-14', '2026-09-14', 'Rajesh Sharma', 'Rajesh Sharma', 'Tailstock quill taper bore runout check', 'Tailstock quill taper bore runout check', 1450, 0, '', 'Cleaned MT4 Morse taper bore, blued test arbor', 'Morse taper wiper, bluing compound')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0113', 'MNT-0113', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-07-06', '2026-07-06', 'Rajesh Sharma', 'Rajesh Sharma', 'Separator air wash duct abrasive cleanliness check', 'Separator air wash duct abrasive cleanliness check', 1900, 0, '', 'Adjusted air wash baffle, purged fine dust residue', 'Air baffle gasket, inspection hatch seal')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0110', 'MNT-0110', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-07-03', '2026-07-03', 'Vikram Singh', 'Vikram Singh', 'Welding torch cooling water conductivity and flow test', 'Welding torch cooling water conductivity and flow test', 2250, 0, '', 'Flushed torch cooler radiator, checked flow sensor', 'Coolant filter cartridge, radiator cap')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0065', 'MNT-0065', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', '', 'Corrective', 'Corrective', 'Completed', '2026-08-19', '2026-08-19', 'Amit Patel', 'Amit Patel', 'Multi-spindle head drill pitch adjustment for drive shaft', 'Multi-spindle head drill pitch adjustment for drive shaft', 2300, 0, '', 'Adjusted spindle center distances to 85mm pitch pattern', 'High-speed carbide drills (4x)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0014', 'MNT-0014', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-07-14', '2026-07-15', 'Amit Patel', 'Amit Patel', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 10900, 4, '', 'Inspected tool changer arm, cleaned taper, adjusted belt', 'ATC drive belt, spindle pull stud seals')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0086', 'MNT-0086', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-09-03', '2026-09-03', 'Ramesh Kumar', 'Ramesh Kumar', 'Rivet head spacing adjustment for final packaging assembly', 'Rivet head spacing adjustment for final packaging assembly', 3000, 0, '', 'Repositioned pneumatic heads to 120mm center-to-center', 'Head clamping bolts, sensor bracket')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0038', 'MNT-0038', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-07-28', '2026-07-29', 'Ramesh Kumar', 'Ramesh Kumar', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 10400, 4, '', 'Checked auto-index station backlash, lubricated ram crank', 'Index gear timing belt, crank oil')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0101', 'MNT-0101', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-09-08', '2026-09-09', 'Priya Nair', 'Priya Nair', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 6600, 4, '', 'Verified probe rack repeatability, cleaned granite table', 'Stylus cleaning kit, air pressure regulator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0074', 'MNT-0074', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-08-25', '2026-08-26', 'Vikram Singh', 'Vikram Singh', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 11700, 4, '', 'Replaced robot axis counterbalance grease, checked light curtain', 'Robot grease Kyodo Yushi, safety interlock sensor')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0132', 'MNT-0132', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-07-27', '2026-07-27', 'Ananya Rao', 'Ananya Rao', 'Stage 5 RO water rinse conductivity sensor verification', 'Stage 5 RO water rinse conductivity sensor verification', 2000, 0, '', 'Calibrated conductivity probe against standard solution', 'Standard calibration fluid, probe guard')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0184', 'MNT-0184', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-09-18', '2026-09-18', 'Priya Nair', 'Priya Nair', 'Probe changer rack docking slot repeatability test', 'Probe changer rack docking slot repeatability test', 1800, 0, '', 'Ran automated probe exchange routine 25 times', 'Probe rack locking spring, cleaning pin')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0168', 'MNT-0168', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-09-02', '2026-09-02', 'Vikram Singh', 'Vikram Singh', 'Post-harness replacement robot axis 3 velocity profile check', 'Post-harness replacement robot axis 3 velocity profile check', 1800, 0, '', 'Logged servo motor torque and temperature over 50 cycles', 'Diagnostic cable adapter')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0170', 'MNT-0170', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-09-04', '2026-09-04', 'Rajesh Sharma', 'Rajesh Sharma', 'Electrode tip dressing cutter blade sharpness check', 'Electrode tip dressing cutter blade sharpness check', 2300, 0, '', 'Rotated cutter inserts to fresh cutting edges', 'Tip dresser cutter blades (pair)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0191', 'MNT-0191', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-09-25', '2026-09-25', 'Vikram Singh', 'Vikram Singh', 'Welding gun collision sensor deflection switch test', 'Welding gun collision sensor deflection switch test', 1750, 0, '', 'Tested mechanical breakout force and electrical trip limit', 'Collision sensor seal, trip switch')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0051', 'MNT-0051', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-08-07', '2026-08-07', 'Deepak Verma', 'Deepak Verma', 'Cutting gas assist pressure regulator inspection', 'Cutting gas assist pressure regulator inspection', 3400, 0, '', 'Calibrated nitrogen assist gas regulator up to 25 bar', 'High-pressure gas filter element')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0174', 'MNT-0174', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-09-08', '2026-09-08', 'Ananya Rao', 'Ananya Rao', 'Chemical dosing metering pump stroke calibration', 'Chemical dosing metering pump stroke calibration', 1900, 0, '', 'Verified dosing pump stroke delivery volume (150 mL/min)', 'Metering pump check valves, tubing')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0151', 'MNT-0151', 'FAC-001', 'M018', 'Laser Ultrasonic Weld Inspector 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-08-16', '2026-08-16', 'Priya Nair', 'Priya Nair', 'Ultrasonic scanning gantry X/Y linear encoder cleaning', 'Ultrasonic scanning gantry X/Y linear encoder cleaning', 2200, 0, '', 'Cleaned glass linear scales with optical solvent', 'Optical encoder cleaning kit')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0059', 'MNT-0059', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', '', 'Corrective', 'Corrective', 'Completed', '2026-08-15', '2026-08-15', 'Suresh Patil', 'Suresh Patil', 'Hydraulic ram cylinder oil weeping and degraded tonnage', 'Hydraulic ram cylinder oil weeping and degraded tonnage', 7300, 0.5, '', 'Tightened gland seal, added anti-wear additive, monitored', 'Secondary rod seal, hydraulic top-up oil')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0154', 'MNT-0154', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-08-19', '2026-08-19', 'Vikram Singh', 'Vikram Singh', 'Conveyor drive gearbox oil level and chain lubrication', 'Conveyor drive gearbox oil level and chain lubrication', 2300, 0, '', 'Topped synthetic gear oil ISO VG 320, checked seals', 'Synthetic gear oil VG 320 (3L)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0035', 'MNT-0035', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-07-28', '2026-07-29', 'Suresh Patil', 'Suresh Patil', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 24600, 6, '', 'Replaced main servo pump filter, inspected ram slide gibs', 'Main hydraulic filter element, guide wear plates')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0100', 'MNT-0100', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-09-08', '2026-09-09', 'Suresh Patil', 'Suresh Patil', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 8800, 4, '', 'Cleaned gas mixing block, tested manifold pressure relief', 'Gas valve O-rings, ignition cable')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0077', 'MNT-0077', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-08-29', '2026-08-29', 'Vikram Singh', 'Vikram Singh', 'Weld fixture grounding clamp resistance check', 'Weld fixture grounding clamp resistance check', 2900, 0, '', 'Cleaned copper ground clamp contact faces, replaced braided lead', 'Braided copper grounding lead')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0094', 'MNT-0094', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'L02', '', 'Corrective', 'Corrective', 'Completed', '2026-09-08', '2026-09-08', 'Rajesh Sharma', 'Rajesh Sharma', 'Conveyor feed roller gap setting for bracket thickness', 'Conveyor feed roller gap setting for bracket thickness', 1400, 0, '', 'Calibrated roller gap to 2.5mm material thickness', 'Digital indicator battery, guide strip')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0158', 'MNT-0158', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-08-23', '2026-08-23', 'Rajesh Sharma', 'Rajesh Sharma', 'Chuck cylinder stroke proximity limit switch check', 'Chuck cylinder stroke proximity limit switch check', 1600, 0, '', 'Cleaned limit switch contacts, checked stroke margin', 'Proximity switch M8, bracket')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0043', 'MNT-0043', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-07-30', '2026-07-30', 'Vikram Singh', 'Vikram Singh', 'Curing recipe temperature adjustment for new panel', 'Curing recipe temperature adjustment for new panel', 1400, 0, '', 'Updated PID setpoints for 195C powder cure profile', 'Thermocouple wire connector')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0116', 'MNT-0116', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-07-09', '2026-07-09', 'Ananya Rao', 'Ananya Rao', 'Powder spray gun ground continuity check', 'Powder spray gun ground continuity check', 1550, 0, '', 'Measured resistance of part hanger hooks to earth', 'Earth cable lug, contact burnishing pad')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0120', 'MNT-0120', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-07-13', '2026-07-13', 'Vikram Singh', 'Vikram Singh', 'Pallet conveyor roller chain tension and sprocket check', 'Pallet conveyor roller chain tension and sprocket check', 2000, 0, '', 'Lubricated drive chain, adjusted take-up bearing position', 'Roller chain link, chain spray lubricant')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0011', 'MNT-0011', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-07-12', '2026-07-12', 'Vikram Singh', 'Vikram Singh', 'Robot axis 1-6 brake check and vacuum gripper pads', 'Robot axis 1-6 brake check and vacuum gripper pads', 3700, 0, '', 'Replaced suction cups on gripper head, verified vacuum', 'Silicone vacuum suction cups')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0208', 'MNT-0208', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-10-01', '2026-10-01', 'Priya Nair', 'Priya Nair', 'Air bearing supply pressure filtration and dryer check', 'Air bearing supply pressure filtration and dryer check', 2100, 0, '', 'Cleaned 0.01 um membrane air filter, purged drain bowl', 'Membrane filter element, auto-drain seal')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0063', 'MNT-0063', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', '', 'Corrective', 'Corrective', 'Completed', '2026-08-19', '2026-08-19', 'Rajesh Sharma', 'Rajesh Sharma', 'Shaft drive assembly changeover tooling swap', 'Shaft drive assembly changeover tooling swap', 1750, 0, '', 'Replaced collet chuck with 3-jaw chuck for drive shaft', 'Hard jaws, chuck adapter plate')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0133', 'MNT-0133', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-07-28', '2026-07-28', 'Ananya Rao', 'Ananya Rao', 'Powder fluidizing air dryer desiccant check', 'Powder fluidizing air dryer desiccant check', 2700, 0, '', 'Replaced silica gel desiccant charge on air dryer', 'Molecular sieve desiccant 5kg')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0109', 'MNT-0109', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-07-02', '2026-07-02', 'Vikram Singh', 'Vikram Singh', 'MIG welding wire feed conduit and drive motor check', 'MIG welding wire feed conduit and drive motor check', 2050, 0, '', 'Cleaned drive rollers, blew out wire conduit', 'Drive roller V-groove, guide tube')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0084', 'MNT-0084', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-09-03', '2026-09-03', 'Ananya Rao', 'Ananya Rao', 'Powder formulation changeover cleaning', 'Powder formulation changeover cleaning', 2800, 0, '', 'Vacuumed booth floor, purged powder feed hoses', 'Hose coupling seals, injector insert')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0034', 'MNT-0034', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', '', 'Calibration', 'Calibration', 'Completed', '2026-07-27', '2026-07-27', 'Priya Nair', 'Priya Nair', '60-day stereo camera photogrammetric grid calibration', '60-day stereo camera photogrammetric grid calibration', 6100, 0, '', 'Calibrated blue light projector, verified reference artifact', 'Calibration target plate, optical lens wipes')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0150', 'MNT-0150', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-08-15', '2026-08-15', 'Rajesh Sharma', 'Rajesh Sharma', 'Blast turbine drive V-belt tension and amp draw check', 'Blast turbine drive V-belt tension and amp draw check', 2150, 0, '', 'Tensioned V-belts on both 22kW blast wheel motors', 'V-belt SPA 1600 (pair)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0028', 'MNT-0028', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', '', 'Breakdown', 'Breakdown', 'Completed', '2026-07-22', '2026-07-22', 'Amit Patel', 'Amit Patel', 'Spindle 3 catastrophic bearing seizure during drilling', 'Spindle 3 catastrophic bearing seizure during drilling', 50500, 5.3, '', 'Removed multi-spindle head, extracted seized spindle, rebuilt unit', 'Angular contact bearing set, spindle shaft')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0019', 'MNT-0019', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', '', 'Corrective', 'Corrective', 'Completed', '2026-07-15', '2026-07-15', 'Rajesh Sharma', 'Rajesh Sharma', 'Part changeover tool pocket setup & verification', 'Part changeover tool pocket setup & verification', 1350, 0, '', 'Mounted boring bar holder, set tool offsets for housing', 'Tool shim, collet nut')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0047', 'MNT-0047', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-08-01', '2026-08-01', 'Rajesh Sharma', 'Rajesh Sharma', 'Hydraulic power unit oil pressure and filter check', 'Hydraulic power unit oil pressure and filter check', 1950, 0, '', 'Checked 45 bar system pressure, inspected relief valve', 'Pressure gauge seal, O-ring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0057', 'MNT-0057', 'FAC-001', 'M017', 'Shot Blasting Chamber 01', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-08-11', '2026-08-12', 'Rajesh Sharma', 'Rajesh Sharma', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 20700, 4, '', 'Replaced manganese protective armor plates in blast zone', 'Manganese wear liners (4x)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0055', 'MNT-0055', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-08-11', '2026-08-12', 'Rajesh Sharma', 'Rajesh Sharma', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 9900, 4, '', 'Overhauled secondary busbar connections, checked water flow', 'Flexible copper laminations, water flow sensor')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0145', 'MNT-0145', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-08-10', '2026-08-10', 'Rajesh Sharma', 'Rajesh Sharma', 'Conveyor vacuum hold-down blower filter inspection', 'Conveyor vacuum hold-down blower filter inspection', 1600, 0, '', 'Cleaned intake filter mesh, checked motor amp draw', 'Intake wire mesh filter, blower gasket')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0068', 'MNT-0068', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', '', 'Corrective', 'Corrective', 'Completed', '2026-08-19', '2026-08-19', 'Priya Nair', 'Priya Nair', 'CMM part program load for PRD-102 drive shaft', 'CMM part program load for PRD-102 drive shaft', 1900, 0, '', 'Loaded CAD inspection program, verified probe star tree', 'Probe stylus extension carbon fiber')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0093', 'MNT-0093', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', '', 'Corrective', 'Corrective', 'Completed', '2026-09-08', '2026-09-08', 'Ramesh Kumar', 'Ramesh Kumar', 'Turret tool configuration change for chassis bracket', 'Turret tool configuration change for chassis bracket', 4700, 0, '', 'Installed cluster punch and forming die in stations 5 & 7', 'Cluster punch insert, guide bushing')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0128', 'MNT-0128', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-07-23', '2026-07-23', 'Rajesh Sharma', 'Rajesh Sharma', 'Brush oscillation mechanism eccentric bearing check', 'Brush oscillation mechanism eccentric bearing check', 2050, 0, '', 'Checked bearing play, greased eccentric drive link', 'Eccentric shaft seal, lithium grease')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0125', 'MNT-0125', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-07-20', '2026-07-20', 'Deepak Verma', 'Deepak Verma', 'Laser focal position sensor zero calibration check', 'Laser focal position sensor zero calibration check', 2400, 0, '', 'Verified motorized focus drive linearity over +/-15mm', 'Focus test lens paper, optical wipe')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0119', 'MNT-0119', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-07-12', '2026-07-12', 'Ramesh Kumar', 'Ramesh Kumar', 'Anti-static ionizer bar discharge efficiency check', 'Anti-static ionizer bar discharge efficiency check', 1600, 0, '', 'Cleaned emitter pins on ionizer bar with alcohol', 'Ionizer emitter pins (4x)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0090', 'MNT-0090', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', '', 'Corrective', 'Corrective', 'Completed', '2026-09-08', '2026-09-08', 'Suresh Patil', 'Suresh Patil', 'Die clamping setup and hydraulic bolster alignment', 'Die clamping setup and hydraulic bolster alignment', 3500, 0, '', 'Clamped chassis bracket progressive stamping die', 'Hydraulic clamp seal, T-nut bolts')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0115', 'MNT-0115', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-07-08', '2026-07-08', 'Ananya Rao', 'Ananya Rao', 'Stage 3 zinc phosphate coating tank titration check', 'Stage 3 zinc phosphate coating tank titration check', 2400, 0, '', 'Checked total acid/free acid ratio, cleaned conductivity probe', 'pH electrode, titration test kit')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0036', 'MNT-0036', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-07-28', '2026-07-29', 'Deepak Verma', 'Deepak Verma', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 12700, 4, '', 'Cleaned cutting head optics, calibrated capacitive height sensor', 'Ceramic nozzle holder, focus lens seal')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0037', 'MNT-0037', 'FAC-001', 'M009', 'CNC Hydraulic Press Brake 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-07-28', '2026-07-29', 'Rajesh Sharma', 'Rajesh Sharma', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 8000, 4, '', 'Inspected backgauge ball screws, calibrated Y1/Y2 encoders', 'Ball screw wiper, linear scale cleaner')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0099', 'MNT-0099', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-09-08', '2026-09-09', 'Rajesh Sharma', 'Rajesh Sharma', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 9600, 4, '', 'Checked center-to-center parallelism, serviced dresser', 'Dressing tool, spindle coolant seals')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0188', 'MNT-0188', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-09-22', '2026-09-22', 'Ramesh Kumar', 'Ramesh Kumar', 'Die base seat cleanliness and height calibration', 'Die base seat cleanliness and height calibration', 1700, 0, '', 'Stoned die holder surfaces, checked shim flatness', 'Die shim pack, oil stone')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0012', 'MNT-0012', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', '', 'Calibration', 'Calibration', 'Completed', '2026-07-13', '2026-07-13', 'Priya Nair', 'Priya Nair', '60-day ruby stylus calibration and air bearing gap check', '60-day ruby stylus calibration and air bearing gap check', 7200, 0, '', 'Calibrated master sphere, cleaned air bearing pads', 'Stylus tip 3mm, air filter pack')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0039', 'MNT-0039', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-07-28', '2026-07-29', 'Rajesh Sharma', 'Rajesh Sharma', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 6300, 4, '', 'Cleaned dust extraction ducting, checked abrasive brush wear', 'Exhaust seal gasket, brush segments')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0052', 'MNT-0052', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-08-08', '2026-08-08', 'Ramesh Kumar', 'Ramesh Kumar', 'Hydraulic clamp jaw tooth wear check on sheet gripper', 'Hydraulic clamp jaw tooth wear check on sheet gripper', 2500, 0, '', 'Cleaned gripper serrated pads, checked clamping cylinder', 'Serrated clamp pads (pair)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0148', 'MNT-0148', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-08-13', '2026-08-13', 'Rajesh Sharma', 'Rajesh Sharma', 'Pneumatic equalizing cylinder counter-spring inspection', 'Pneumatic equalizing cylinder counter-spring inspection', 1700, 0, '', 'Tested return spring tension, lubricated cylinder shaft', 'Equalizer spring, bronze bushing')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0146', 'MNT-0146', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-08-11', '2026-08-11', 'Priya Nair', 'Priya Nair', 'Turntable pneumatic lift brake seal test', 'Turntable pneumatic lift brake seal test', 1850, 0, '', 'Checked brake holding under 80kg off-center load', 'Pneumatic brake pad, hose elbow')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0185', 'MNT-0185', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-09-19', '2026-09-19', 'Suresh Patil', 'Suresh Patil', 'Press frame pre-stress tie rod ultrasonic elongation check', 'Press frame pre-stress tie rod ultrasonic elongation check', 3200, 0, '', 'Ultrasonic gauge measurement on 4 main tie rods', 'Ultrasonic couplant, calibration standard')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0004', 'MNT-0004', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-07-05', '2026-07-05', 'Deepak Verma', 'Deepak Verma', 'Optical protective window inspection and beam centering', 'Optical protective window inspection and beam centering', 6700, 0, '', 'Cleaned protective glass, realigned nozzle centering', 'Protective cover slide')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0177', 'MNT-0177', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-09-11', '2026-09-11', 'Ramesh Kumar', 'Ramesh Kumar', 'Riveting spindle runout and axial play measurement', 'Riveting spindle runout and axial play measurement', 1650, 0, '', 'Dial indicator check on rotating spindle bearings', 'Spindle grease, lock nut')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0138', 'MNT-0138', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-08-03', '2026-08-03', 'Amit Patel', 'Amit Patel', '4th/5th trunnion rotary table hydraulic brake check', '4th/5th trunnion rotary table hydraulic brake check', 2400, 0, '', 'Checked clamping pressure at 60 bar, tested leak-back', 'Hydraulic test coupling, seal washer')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0190', 'MNT-0190', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-09-24', '2026-09-24', 'Priya Nair', 'Priya Nair', 'Scan enclosure ambient light baffle integrity check', 'Scan enclosure ambient light baffle integrity check', 1600, 0, '', 'Inspected blackout curtains and anti-reflection coatings', 'Matte black coating spray, curtain fastener')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0176', 'MNT-0176', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-09-10', '2026-09-10', 'Vikram Singh', 'Vikram Singh', 'High-temperature conveyor expansion joint inspection', 'High-temperature conveyor expansion joint inspection', 1900, 0, '', 'Checked thermal expansion gap and slide rollers', 'Expansion joint seal, roller bearing grease')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0029', 'MNT-0029', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-07-22', '2026-07-23', 'Amit Patel', 'Amit Patel', 'Post-breakdown spindle alignment and dynamic run-in test', 'Post-breakdown spindle alignment and dynamic run-in test', 13000, 6.7, '', 'Executed 4-hour speed ramp test, verified thermal growth', 'Precision synthetic spindle oil, test stock')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0123', 'MNT-0123', 'FAC-001', 'M005', 'Thermal Deburring Station 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-07-18', '2026-07-18', 'Suresh Patil', 'Suresh Patil', 'Gas dosing proportioning valve leakage test', 'Gas dosing proportioning valve leakage test', 2500, 0, '', 'Helium leak check performed on methane and oxygen lines', 'O-ring seal kit, valve test port')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0025', 'MNT-0025', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-07-20', '2026-07-20', 'Vikram Singh', 'Vikram Singh', 'IR quartz heating element resistance check', 'IR quartz heating element resistance check', 2700, 0, '', 'Tested 24 IR emitter tubes, cleaned parabolic reflectors', 'IR element ceramic socket')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0071', 'MNT-0071', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-08-25', '2026-08-26', 'Vikram Singh', 'Vikram Singh', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 9200, 4, '', 'Cleaned recirculation blowers, greased high-temp bearings', 'High-temp synthetic grease, blower belt')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0016', 'MNT-0016', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-07-14', '2026-07-15', 'Rajesh Sharma', 'Rajesh Sharma', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 9000, 4, '', 'Replaced hydrostatic oil filter, checked workhead runout', 'Hydrostatic oil filter, seal kit')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0169', 'MNT-0169', 'FAC-001', 'M014', 'Robotic MIG Welding Cell 02', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-09-03', '2026-09-03', 'Vikram Singh', 'Vikram Singh', 'Welder secondary voltage drop and cable integrity check', 'Welder secondary voltage drop and cable integrity check', 2100, 0, '', 'Measured voltage drop across 10m welding cable harness', 'Heavy-duty cable lug, heat shrink tube')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0182', 'MNT-0182', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-09-16', '2026-09-16', 'Amit Patel', 'Amit Patel', 'Drill head vertical counter-weight chain inspection', 'Drill head vertical counter-weight chain inspection', 1900, 0, '', 'Measured chain stretch (<0.3%), lubricated guide rollers', 'Chain link pin, roller grease')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0204', 'MNT-0204', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-09-29', '2026-09-29', 'Amit Patel', 'Amit Patel', 'Telescopic steel axis way cover wiper replacement', 'Telescopic steel axis way cover wiper replacement', 3400, 0, '', 'Replaced brass wiper blades on X-axis telescopic covers', 'Brass telescopic cover wipers (set of 4)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0098', 'MNT-0098', 'FAC-001', 'M003', 'Multi-Spindle Drilling Machine 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-09-08', '2026-09-09', 'Amit Patel', 'Amit Patel', 'Line 1 monthly planned shutdown extended PM', 'Line 1 monthly planned shutdown extended PM', 14600, 6.7, '', 'Inspected rebuilt spindle 3, checked gear backlash', 'Spindle lube oil, timing belt, seal ring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0118', 'MNT-0118', 'FAC-001', 'M022', 'Multi-Head Automatic Riveter 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-07-11', '2026-07-11', 'Ramesh Kumar', 'Ramesh Kumar', 'Rivet mandrel extraction vacuum line service', 'Rivet mandrel extraction vacuum line service', 1650, 0, '', 'Cleaned vacuum collector bottle, cleared spent mandrel hose', 'Vacuum hose polyurethane, collector gasket')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0166', 'MNT-0166', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-08-31', '2026-08-31', 'Rajesh Sharma', 'Rajesh Sharma', 'Abrasive belt tensioning pneumatic cylinder check', 'Abrasive belt tensioning pneumatic cylinder check', 1500, 0, '', 'Checked tension cylinder pressure at 4.5 bar', 'Pressure gauge, seal washer')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0041', 'MNT-0041', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-07-30', '2026-07-30', 'Ananya Rao', 'Ananya Rao', 'Coating changeover tank bath replenishment', 'Coating changeover tank bath replenishment', 3000, 0, '', 'Drained rinse stage 2, refilled with DI water', 'DI filter cartridge, pH probe buffer')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0107', 'MNT-0107', 'FAC-001', 'M011', 'Sheet Edge Finishing Machine 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-09-22', '2026-09-23', 'Rajesh Sharma', 'Rajesh Sharma', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 7000, 4, '', 'Replaced deburring brushes, cleaned dust collector duct', 'Abrasive brush rollers, suction hose')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0081', 'MNT-0081', 'FAC-001', 'M015', 'Automated Resistance Spot Welder 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-08-31', '2026-08-31', 'Rajesh Sharma', 'Rajesh Sharma', 'Upstream starvation idle period electrode alignment check', 'Upstream starvation idle period electrode alignment check', 3800, 2.9, '', 'Aligned upper and lower weld guns, checked water cooling flow', 'Electrode adapter shanks (pair)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0127', 'MNT-0127', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', '', 'Inspection', 'Inspection', 'Completed', '2026-07-22', '2026-07-22', 'Ramesh Kumar', 'Ramesh Kumar', 'Sheet clamp pneumatics quick-release check', 'Sheet clamp pneumatics quick-release check', 1550, 0, '', 'Cleaned clamp cylinder exhaust port, lubricated guide rod', 'Air silencer, cylinder lubricant')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0124', 'MNT-0124', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-07-19', '2026-07-19', 'Suresh Patil', 'Suresh Patil', 'Nitrogen accumulator pre-charge pressure inspection', 'Nitrogen accumulator pre-charge pressure inspection', 2900, 0, '', 'Checked pre-charge on 3 accumulators, topped to 120 bar', 'Nitrogen gas bottle top-up, valve core')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0103', 'MNT-0103', 'FAC-001', 'M007', 'Hydraulic Stamping Press 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-09-22', '2026-09-23', 'Suresh Patil', 'Suresh Patil', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 23600, 6, '', 'Inspected hydraulic manifold valves, calibrated linear scales', 'Servo valve seals, hydraulic pressure filter')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0108', 'MNT-0108', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-09-22', '2026-09-23', 'Priya Nair', 'Priya Nair', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 6400, 4, '', 'Checked stereo camera lens calibration and LED projector', 'Lens optical filter, calibration reference ring')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0049', 'MNT-0049', 'FAC-001', 'M004', 'Precision Cylindrical Grinder 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-08-04', '2026-08-05', 'Rajesh Sharma', 'Rajesh Sharma', 'Bi-weekly grinder full-shift overhaul and filtration clean', 'Bi-weekly grinder full-shift overhaul and filtration clean', 14400, 8, '', 'Flushed magnetic separator, replaced paper band filter roll', 'Paper band filter roll, magnetic drum wiper')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0079', 'MNT-0079', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', '', 'Breakdown', 'Breakdown', 'Completed', '2026-08-31', '2026-08-31', 'Vikram Singh', 'Vikram Singh', 'Robot axis 3 internal servo cable harness shearing', 'Robot axis 3 internal servo cable harness shearing', 46000, 4.9, '', 'Replaced internal robot harness assembly, recalibrated mastering', 'Robot axis 3-6 dress pack harness, encoder plug')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0095', 'MNT-0095', 'FAC-001', 'M012', '3D Optical Scanner Station 01', 'L02', '', 'Corrective', 'Corrective', 'Completed', '2026-09-08', '2026-09-08', 'Priya Nair', 'Priya Nair', 'Scanner inspection template load for PRD-103 bracket', 'Scanner inspection template load for PRD-103 bracket', 1600, 0, '', 'Loaded 3D surface scan reference CAD geometry', 'Optical target stickers (50x)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0070', 'MNT-0070', 'FAC-001', 'M020', 'Electrostatic Powder Coating Booth 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-08-25', '2026-08-26', 'Ananya Rao', 'Ananya Rao', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 15300, 4, '', 'Replaced cyclone powder recovery cartridge filters', 'Cartridge filter elements (4x), venturi throat')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0171', 'MNT-0171', 'FAC-001', 'M016', 'Pneumatic Assembly Fixture 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-09-05', '2026-09-05', 'Ramesh Kumar', 'Ramesh Kumar', 'Manual clamp valve interlock and pressure dump test', 'Manual clamp valve interlock and pressure dump test', 1450, 0, '', 'Tested emergency dump valve venting speed (<50ms)', 'Dump valve diaphragm, silencer')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0046', 'MNT-0046', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', '', 'Corrective', 'Corrective', 'Completed', '2026-07-30', '2026-07-30', 'Vikram Singh', 'Vikram Singh', 'Palletizing pattern program selection', 'Palletizing pattern program selection', 1600, 0, '', 'Loaded stacking recipe for packaging assembly boxes', 'Photoelectric sensor lens')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0032', 'MNT-0032', 'FAC-001', 'M023', 'Protective Film Laminating Unit 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-07-25', '2026-07-25', 'Ramesh Kumar', 'Ramesh Kumar', '45-day silicone laminating roller surface inspection', '45-day silicone laminating roller surface inspection', 2700, 0, '', 'Cleaned rubber applicator roller, checked nip pressure sensors', 'Roller cleaner kit, bearing grease')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0069', 'MNT-0069', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-08-25', '2026-08-26', 'Ananya Rao', 'Ananya Rao', 'Line 4 monthly planned shutdown maintenance', 'Line 4 monthly planned shutdown maintenance', 10900, 4, '', 'Cleaned phosphate tank heating coils, replaced filter bags', 'Polypropylene filter bags (6x), tank gasket')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0129', 'MNT-0129', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', '', 'Inspection', 'Inspection', 'Completed', '2026-07-24', '2026-07-24', 'Vikram Singh', 'Vikram Singh', 'Robot tool center point (TCP) accuracy routine check', 'Robot tool center point (TCP) accuracy routine check', 1900, 0, '', 'Verified TCP on fixed pointer calibration jig', 'Calibration pointer tip, contact probe')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0179', 'MNT-0179', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-09-13', '2026-09-13', 'Vikram Singh', 'Vikram Singh', 'Robot vacuum generator venturi silencer cleaning', 'Robot vacuum generator venturi silencer cleaning', 1550, 0, '', 'Cleaned porous bronze silencer, measured vacuum rise time', 'Porous bronze silencer, vacuum filter')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0117', 'MNT-0117', 'FAC-001', 'M021', 'Infrared Convection Curing Tunnel 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-07-10', '2026-07-10', 'Vikram Singh', 'Vikram Singh', 'Exhaust air volume sensor check and filter inspect', 'Exhaust air volume sensor check and filter inspect', 2150, 0, '', 'Cleaned hot air exhaust duct pitot tube sensor', 'Differential pressure sensor tube')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0106', 'MNT-0106', 'FAC-001', 'M010', 'High-Speed Turret Punch 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-09-22', '2026-09-23', 'Ramesh Kumar', 'Ramesh Kumar', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 9300, 4, '', 'Inspected pneumatic clamp pistons, cleaned auto-index bearings', 'Piston seal rings (2x), index belt')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0104', 'MNT-0104', 'FAC-001', 'M008', 'Fiber Laser Cutting System 01', 'L02', '', 'Preventive', 'Preventive', 'Completed', '2026-09-22', '2026-09-23', 'Deepak Verma', 'Deepak Verma', 'Line 2 monthly planned shutdown maintenance', 'Line 2 monthly planned shutdown maintenance', 12200, 4, '', 'Laser power sensor calibration, clean beam delivery fiber', 'Protective cover window, nozzle tip')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0097', 'MNT-0097', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', '', 'Preventive', 'Preventive', 'Completed', '2026-09-08', '2026-09-09', 'Amit Patel', 'Amit Patel', 'Line 1 monthly planned shutdown maintenance', 'Line 1 monthly planned shutdown maintenance', 10400, 4, '', 'Checked X/Y/Z ballscrew backlash, cleaned mist collector', 'Mist collector filter, axis grease cartridge')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0162', 'MNT-0162', 'FAC-001', 'M006', 'Automated CMM Inspection Cell 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-08-27', '2026-08-27', 'Priya Nair', 'Priya Nair', 'Laser triangulation sensor offset validation check', 'Laser triangulation sensor offset validation check', 2400, 0, '', 'Calibrated laser line sensor on step gauge artifact', 'Step gauge calibration certificate')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0053', 'MNT-0053', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-08-11', '2026-08-12', 'Vikram Singh', 'Vikram Singh', 'Line 3 monthly planned shutdown maintenance', 'Line 3 monthly planned shutdown maintenance', 12700, 4, '', 'Checked weld power source calibration, replaced torch head', 'Water-cooled torch neck, power cable assembly')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0022', 'MNT-0022', 'FAC-001', 'M013', 'Robotic MIG Welding Cell 01', 'L03', '', 'Preventive', 'Preventive', 'Completed', '2026-07-18', '2026-07-18', 'Vikram Singh', 'Vikram Singh', 'MIG torch nozzle reamer station cleaning & liner replace', 'MIG torch nozzle reamer station cleaning & liner replace', 3500, 0, '', 'Replaced steel torch liner, checked wire feeder tension', 'Torch liner 3m, contact tips (5x)')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0157', 'MNT-0157', 'FAC-001', 'M024', 'End-of-Line Palletizer Cell 01', 'L04', '', 'Inspection', 'Inspection', 'Completed', '2026-08-22', '2026-08-22', 'Vikram Singh', 'Vikram Singh', 'Pallet magazine pneumatic dispenser alignment check', 'Pallet magazine pneumatic dispenser alignment check', 2000, 0, '', 'Adjusted pallet holding claws and feed solenoid valve', 'Solenoid valve coil, claw wear pad')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0024', 'MNT-0024', 'FAC-001', 'M019', 'Automated 5-Stage Chemical Wash 01', 'L04', '', 'Preventive', 'Preventive', 'Completed', '2026-07-20', '2026-07-20', 'Ananya Rao', 'Ananya Rao', 'Stage 1 degreaser concentration and spray nozzle descaling', 'Stage 1 degreaser concentration and spray nozzle descaling', 4200, 0, '', 'Descaled 16 spray nozzles, adjusted chemical dosing pump', 'Vee-jet spray nozzles (4x), pump diaphragm')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0181', 'MNT-0181', 'FAC-001', 'M002', 'Vertical Machining Center 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-09-15', '2026-09-15', 'Amit Patel', 'Amit Patel', 'Z-axis counter-balance servo brake holding torque test', 'Z-axis counter-balance servo brake holding torque test', 1700, 0, '', 'Commanded brake test routine in Mazatrol CNC', 'Brake coil connector, test cable')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-0137', 'MNT-0137', 'FAC-001', 'M001', 'CNC Turning Center 01', 'L01', '', 'Inspection', 'Inspection', 'Completed', '2026-08-02', '2026-08-02', 'Rajesh Sharma', 'Rajesh Sharma', 'Main spindle belt drive tension and pulley alignment', 'Main spindle belt drive tension and pulley alignment', 1600, 0, '', 'Measured belt frequency with acoustic meter (145 Hz)', 'Tension gauge probe, pulley cleaner')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-B01', 'MNT-B01', 'FAC-002', 'NOV-ASM-02', 'NOV-ASM-02', '', '', 'Predictive', 'Predictive', 'Scheduled', '2026-10-09', NULL, 'Sagar N.', 'Sagar N.', 'Harmonic drive backlash calibration on wrist axes J4 & J5.', 'Harmonic drive backlash calibration on wrist axes J4 & J5.', 950, 3.5, '', '', '')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-B02', 'MNT-B02', 'FAC-002', 'NOV-LTH-01', 'NOV-LTH-01', '', '', 'Preventive', 'Preventive', 'Completed', '2026-09-28', '2026-09-28', 'Sagar N.', 'Sagar N.', 'Turret index coupling alignment and hydraulic filter swap.', 'Turret index coupling alignment and hydraulic filter swap.', 620, 2.5, '', '', '')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-C01', 'MNT-C01', 'FAC-003', 'VTX-PNT-01', 'VTX-PNT-01', '', '', 'Preventive', 'Preventive', 'Completed', '2026-10-01', '2026-10-01', 'R. Balaji', 'R. Balaji', 'Electrostatic atomizer bell cup cleaning and voltage curve audit.', 'Electrostatic atomizer bell cup cleaning and voltage curve audit.', 1100, 3, '', '', '')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-D01', 'MNT-D01', 'FAC-004', 'PRM-RFL-01', 'PRM-RFL-01', '', '', 'Preventive', 'Preventive', 'Completed', '2026-09-29', '2026-09-29', 'Naveen K.', 'Naveen K.', 'Flux condensation collector cleanout and thermal profile audit.', 'Flux condensation collector cleanout and thermal profile audit.', 750, 2, '', '', '')
ON CONFLICT (id) DO NOTHING;
INSERT INTO maintenance_records (id, maintenance_id, factory_id, machine_id, machine_name, line_id, line_name, type, maintenance_type, status, scheduled_date, completed_date, technician, technician_name, description, problem_description, cost_usd, downtime_hours, failure_category, action_taken, parts_replaced)
VALUES ('MNT-E01', 'MNT-E01', 'FAC-005', 'ORN-TRN-01', 'ORN-TRN-01', '', '', 'Predictive', 'Predictive', 'Completed', '2026-09-25', '2026-09-25', 'N. Muthusamy', 'N. Muthusamy', 'Hydrostatic table pocket pressure balancing and gib readjustment.', 'Hydrostatic table pocket pressure balancing and gib readjustment.', 1400, 5, '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Seed SOPs
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-001', 'SOP-CNC-501', 'FAC-001', '5-Axis CNC Milling Warm-up and Zero Referencing Protocol', 'CNC Machining Center', 'Operating Procedure', 'v3.2', '2026-08-15', 'Chief Process Engineer', '{"Verify pneumatic supply pressure is stabilized above 6.0 bar before powering control cabinet.","Execute spindle low-RPM ramp-up sequence (500 RPM -> 3000 RPM over 8 minutes) to distribute lubricant.","Engage automatic tool length measurement probe and confirm stylus runout is < 0.003mm.","Run dry-cycle Axis referencing cycle G28 Z0 followed by X0 Y0 and record position offsets."}', '{"Never bypass interlock switches on the safety enclosure doors during automatic cycle.","Eye and ear protection mandatory within 5 meters of operating milling enclosure.","Confirm flood coolant sump level is above 75% indicator mark before initiating spindle."}', 'Operators & Setup Technicians')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-002', 'SOP-PRS-402', 'FAC-001', 'Hydraulic Stamping Press Die Changeover & Tonnage Calibration', 'Servo Hydraulic Press', 'Maintenance & Setup', 'v2.8', '2026-07-20', 'Senior Tooling Specialist', '{"Engage mechanical safety lock pins on upper press slide before entering die bed area.","Depressurize secondary hydraulic accumulator circuit to 0 bar and verify gauge reads zero.","Disconnect quick-release hydraulic manifold couplings for upper clamping cylinders.","Use overhead crane with certified 4-leg wire rope sling to hoist upper die set (rated >= 5 metric tons)."}', '{"Dual palm pushbuttons must be verified operational prior to entering semi-automatic run mode.","Lockout/Tagout (LOTO) procedure mandatory on main 415V electrical breaker during die positioning.","Safety light curtain alignment test must pass optical verification grid check."}', 'Die Setters & Tooling Engineers')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-003', 'SOP-ROB-303', 'FAC-001', 'Robotic MIG Welding Torch Maintenance & Wire Feed Calibration', 'Articulated Robot Welder', 'Preventive Maintenance', 'v4.0', '2026-09-02', 'Automation Reliability Lead', '{"Power off welding power source and activate teach pendant teach mode with E-stop depressed.","Remove gas nozzle and contact tip; inspect for spatter accumulation and bore wear.","Clean gas diffuser holes with brass nozzle reamer and apply anti-spatter ceramic coating.","Inspect wire feeder drive rolls; check grooving for 1.2mm wire alignment and set roll pressure.","Execute automated torch cleaning station cycle (wire cut, ream, and anti-spatter spray)."}', '{"Hot work zone: welding torch remains above 200°C for up to 20 minutes post-weld.","Inspect shielding gas (82% Ar / 18% CO2) cylinder regulator for high-pressure leaks.","UV-rated welding curtains must be secured and interlocked to the safety zone scanner."}', 'Weld Technicians & Maintenance')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-004', 'SOP-EMG-101', 'FAC-001', 'Emergency Machine Shutdown & Incident Triage Protocol', 'All Machinery', 'Emergency & Safety', 'v5.1', '2026-09-12', 'Director of Plant Safety', '{"Depress nearest Emergency Stop (E-Stop) pushbutton immediately upon observing hazard or collision.","Alert Line Supervisor and press floor emergency notification beacon.","Isolate electrical disconnect switch if safe to do so; attach red LOTO padlock.","Log incident in FactoryOps system with machine ID, timestamp, and observed failure symptoms."}', '{"Do not attempt to clear jammed workpieces or scrap until all kinetic and hydraulic energy is dissipated.","Maintain clear perimeter of 3 meters around quarantined equipment until maintenance arrives."}', 'All Plant Personnel')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-B01', 'SOP-LTH-301', 'FAC-002', 'Heavy CNC Lathe Chuck Pressure Verification and Hard Jaw Boring', 'Heavy Duty CNC Lathe', 'Operating Procedure', 'v2.0', '2026-09-01', 'Lead Tooling Specialist', '{"Verify gripping force using dynamic wireless chuck force gauge at 1500 RPM.","Clock soft jaws with dial indicator to ensure concentricity within 0.015mm.","Execute pre-programmed boring cycle with light 0.2mm depth-of-cut pass."}', '{"Never leave chuck wrench in chuck under any circumstance.","Ensure chip conveyor is running and interlocked before starting cycle."}', 'Lathe Operators')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-C01', 'SOP-WLD-101', 'FAC-003', 'Robotic Spot Welding Tip Dressing & Force Calibration Protocol', 'Spot Welding Robot', 'Quality Inspection', 'v1.4', '2026-08-10', 'Body Shop Quality Lead', '{"Inspect electrode cap wear profile with optical gauge.","Run auto-dress cycle for 1.8 seconds.","Validate clamp force with calibrated load cell."}', '{"Ensure robot cell gate is e-stopped during cell entry."}', 'Robotics Technicians')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-D01', 'SOP-SMT-401', 'FAC-004', 'SMT Feeder Setup and Solder Paste Height Inspection', 'High-Speed SMT Pick & Place', 'Operating Procedure', 'v4.1', '2026-09-15', 'SMT Process Lead', '{"Scan QR barcode on component reel and verify BOM line.","Apply solder paste with stainless stencil (120 micron).","Verify paste volume on SPI system before releasing PCB."}', '{"ESD wrist strap and anti-static smock mandatory."}', 'SMT Line Operators')
ON CONFLICT (id) DO NOTHING;
INSERT INTO sops (id, sop_id, factory_id, title, machine_type, category, version, last_updated, author, steps, safety_precautions, target_audience)
VALUES ('SOP-E01', 'SOP-FRG-501', 'FAC-005', '2000T Forging Press Die Preheat and Hydraulic Balancing', 'Hydraulic Open-Die Forging Press 2000T', 'Safety Protocol', 'v2.2', '2026-07-30', 'Heavy Forge Superintendent', '{"Preheat die blocks with radiant gas heaters to 220°C before striking.","Confirm hydraulic accumulator bank charge pressure at 280 bar.","Cycle ram in inching mode to verify slide gib clearance."}', '{"Full heat-reflective apron, Kevlar arm guards, and face shield required.","Never stand in front of anvil opening during upset stroke."}', 'Forge Operators')
ON CONFLICT (id) DO NOTHING;

-- Seed Data Quality Metrics
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-001', 'FAC-001', 'Spindle Vibration Accelerometer (X/Y/Z)', 'M001', 99.8, 99.4, 18, 0, 'Healthy', '12 seconds ago')
ON CONFLICT (id) DO NOTHING;
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-002', 'FAC-001', 'Main Hydraulic Ram Pressure Transducer', 'M007', 98.2, 97.1, 45, 2, 'Degraded', '45 seconds ago')
ON CONFLICT (id) DO NOTHING;
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-003', 'FAC-001', 'Thermographic Bearing Temperature Probe', 'M004', 99.9, 99.9, 12, 0, 'Healthy', '5 seconds ago')
ON CONFLICT (id) DO NOTHING;
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-004', 'FAC-001', 'Weld Current & Voltage Telemetry Core', 'M013', 99.4, 98.8, 22, 1, 'Healthy', '18 seconds ago')
ON CONFLICT (id) DO NOTHING;
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-B01', 'FAC-002', 'Vibration & Acoustic Emission Array', 'NOV-MIL-01', 99.1, 98.7, 22, 1, 'Healthy', '18 seconds ago')
ON CONFLICT (id) DO NOTHING;
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-C01', 'FAC-003', 'Current Transformer Telemetry Bus', 'VTX-ROB-01', 99.9, 99.8, 12, 0, 'Healthy', '5 seconds ago')
ON CONFLICT (id) DO NOTHING;
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-D01', 'FAC-004', 'Feeder Vacuum Pressure Sensor Bus', 'PRM-SMT-01', 97.5, 96.2, 35, 4, 'Degraded', '30 seconds ago')
ON CONFLICT (id) DO NOTHING;
INSERT INTO data_quality_metrics (id, factory_id, sensor_name, machine_id, uptime_percentage, data_completeness_pct, latency_ms, anomalies_detected, status, last_sync)
VALUES ('DQ-E01', 'FAC-005', 'Hydraulic Pressure & Thermal Transducer Bus', 'ORN-FRG-01', 98.9, 98.1, 28, 1, 'Healthy', '20 seconds ago')
ON CONFLICT (id) DO NOTHING;

-- Seed Production Records
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260703-L03-M013-B', 'PRD-20260703-L03-M013-B', 'FAC-001', 'M013', '2026-07-03 14:00:00', 'B', 450, 450, 423, 6, 6, undefined, 62.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260916-L01-M005-C', 'PRD-20260916-L01-M005-C', 'FAC-001', 'M005', '2026-09-16 22:00:00', 'C', 480, 480, 434, 10, 10, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260912-L01-M003-C', 'PRD-20260912-L01-M003-C', 'FAC-001', 'M003', '2026-09-12 22:00:00', 'C', 650, 650, 586, 16, 16, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260807-L02-M010-A', 'PRD-20260807-L02-M010-A', 'FAC-001', 'M010', '2026-08-07 06:00:00', 'A', 620, 620, 582, 10, 10, undefined, 45.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260911-L03-M018-A', 'PRD-20260911-L03-M018-A', 'FAC-001', 'M018', '2026-09-11 06:00:00', 'A', 440, 440, 405, 11, 11, undefined, 66.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260703-L02-M011-C', 'PRD-20260703-L02-M011-C', 'FAC-001', 'M011', '2026-07-03 22:00:00', 'C', 490, 490, 441, 5, 5, undefined, 61.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260721-L04-M020-B', 'PRD-20260721-L04-M020-B', 'FAC-001', 'M020', '2026-07-21 14:00:00', 'B', 560, 560, 514, 6, 6, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260724-L01-M003-C', 'PRD-20260724-L01-M003-C', 'FAC-001', 'M003', '2026-07-24 22:00:00', 'C', 650, 650, 601, 13, 13, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260807-L04-M024-A', 'PRD-20260807-L04-M024-A', 'FAC-001', 'M024', '2026-08-07 06:00:00', 'A', 640, 640, 594, 15, 15, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260724-L02-M007-B', 'PRD-20260724-L02-M007-B', 'FAC-001', 'M007', '2026-07-24 14:00:00', 'B', 540, 540, 508, 9, 9, undefined, 52.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260818-L04-M020-B', 'PRD-20260818-L04-M020-B', 'FAC-001', 'M020', '2026-08-18 14:00:00', 'B', 560, 560, 503, 6, 6, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260928-L03-M015-B', 'PRD-20260928-L03-M015-B', 'FAC-001', 'M015', '2026-09-28 14:00:00', 'B', 380, 380, 352, 9, 9, undefined, 76.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260901-L03-M018-B', 'PRD-20260901-L03-M018-B', 'FAC-001', 'M018', '2026-09-01 14:00:00', 'B', 440, 440, 420, 8, 8, undefined, 66.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260712-L01-M006-C', 'PRD-20260712-L01-M006-C', 'FAC-001', 'M006', '2026-07-12 22:00:00', 'C', 410, 410, 387, 9, 9, undefined, 71, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260720-L04-M021-B', 'PRD-20260720-L04-M021-B', 'FAC-001', 'M021', '2026-07-20 14:00:00', 'B', 650, 650, 602, 13, 13, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260727-L01-M002-A', 'PRD-20260727-L01-M002-A', 'FAC-001', 'M002', '2026-07-27 06:00:00', 'A', 430, 430, 385, 10, 10, undefined, 69.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260808-L04-M023-A', 'PRD-20260808-L04-M023-A', 'FAC-001', 'M023', '2026-08-08 06:00:00', 'A', 600, 600, 539, 8, 8, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260829-L01-M005-A', 'PRD-20260829-L01-M005-A', 'FAC-001', 'M005', '2026-08-29 06:00:00', 'A', 480, 480, 437, 10, 10, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260812-L04-M022-B', 'PRD-20260812-L04-M022-B', 'FAC-001', 'M022', '2026-08-12 14:00:00', 'B', 580, 580, 567, 5, 5, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260913-L02-M011-B', 'PRD-20260913-L02-M011-B', 'FAC-001', 'M011', '2026-09-13 14:00:00', 'B', 490, 490, 439, 6, 6, undefined, 61.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260707-L04-M024-C', 'PRD-20260707-L04-M024-C', 'FAC-001', 'M024', '2026-07-07 22:00:00', 'C', 640, 640, 591, 15, 15, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260816-L01-M005-A', 'PRD-20260816-L01-M005-A', 'FAC-001', 'M005', '2026-08-16 06:00:00', 'A', 480, 480, 442, 4, 4, undefined, 62.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260901-L03-M013-B', 'PRD-20260901-L03-M013-B', 'FAC-001', 'M013', '2026-09-01 14:00:00', 'B', 450, 450, 416, 7, 7, undefined, 62.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260712-L01-M004-A', 'PRD-20260712-L01-M004-A', 'FAC-001', 'M004', '2026-07-12 06:00:00', 'A', 300, 300, 290, 3, 3, undefined, 94.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260802-L01-M006-B', 'PRD-20260802-L01-M006-B', 'FAC-001', 'M006', '2026-08-02 14:00:00', 'B', 410, 410, 376, 5, 5, undefined, 71, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260706-L04-M019-A', 'PRD-20260706-L04-M019-A', 'FAC-001', 'M019', '2026-07-06 06:00:00', 'A', 530, 530, 508, 11, 11, undefined, 53.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260822-L03-M018-A', 'PRD-20260822-L03-M018-A', 'FAC-001', 'M018', '2026-08-22 06:00:00', 'A', 440, 440, 407, 5, 5, undefined, 66, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260704-L04-M021-A', 'PRD-20260704-L04-M021-A', 'FAC-001', 'M021', '2026-07-04 06:00:00', 'A', 650, 650, 607, 13, 13, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260701-L04-M021-B', 'PRD-20260701-L04-M021-B', 'FAC-001', 'M021', '2026-07-01 14:00:00', 'B', 650, 650, 606, 8, 8, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260727-L03-M015-C', 'PRD-20260727-L03-M015-C', 'FAC-001', 'M015', '2026-07-27 22:00:00', 'C', 380, 380, 357, 5, 5, undefined, 76.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260719-L02-M008-A', 'PRD-20260719-L02-M008-A', 'FAC-001', 'M008', '2026-07-19 06:00:00', 'A', 580, 580, 513, 9, 9, undefined, 51.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260707-L03-M014-B', 'PRD-20260707-L03-M014-B', 'FAC-001', 'M014', '2026-07-07 14:00:00', 'B', 420, 420, 374, 5, 5, undefined, 71.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260728-L03-M016-A', 'PRD-20260728-L03-M016-A', 'FAC-001', 'M016', '2026-07-28 06:00:00', 'A', 510, 510, 471, 8, 8, undefined, 55.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260728-L01-M002-C', 'PRD-20260728-L01-M002-C', 'FAC-001', 'M002', '2026-07-28 22:00:00', 'C', 430, 430, 395, 3, 3, undefined, 69.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260904-L01-M003-B', 'PRD-20260904-L01-M003-B', 'FAC-001', 'M003', '2026-09-04 14:00:00', 'B', 650, 650, 610, 8, 8, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260902-L02-M008-A', 'PRD-20260902-L02-M008-A', 'FAC-001', 'M008', '2026-09-02 06:00:00', 'A', 580, 580, 522, 7, 7, undefined, 51.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260728-L02-M007-A', 'PRD-20260728-L02-M007-A', 'FAC-001', 'M007', '2026-07-28 06:00:00', 'A', 540, 540, 522, 6, 6, undefined, 52.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260804-L02-M009-B', 'PRD-20260804-L02-M009-B', 'FAC-001', 'M009', '2026-08-04 14:00:00', 'B', 460, 460, 427, 6, 6, undefined, 63.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260723-L01-M006-B', 'PRD-20260723-L01-M006-B', 'FAC-001', 'M006', '2026-07-23 14:00:00', 'B', 410, 410, 373, 6, 6, undefined, 70.9, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260913-L02-M012-C', 'PRD-20260913-L02-M012-C', 'FAC-001', 'M012', '2026-09-13 22:00:00', 'C', 550, 550, 522, 10, 10, undefined, 52.9, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260803-L01-M001-C', 'PRD-20260803-L01-M001-C', 'FAC-001', 'M001', '2026-08-03 22:00:00', 'C', 520, 520, 485, 13, 13, undefined, 54.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260828-L01-M003-B', 'PRD-20260828-L01-M003-B', 'FAC-001', 'M003', '2026-08-28 14:00:00', 'B', 650, 650, 606, 8, 8, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260928-L01-M004-B', 'PRD-20260928-L01-M004-B', 'FAC-001', 'M004', '2026-09-28 14:00:00', 'B', 300, 300, 284, 8, 8, undefined, 94, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260721-L01-M006-B', 'PRD-20260721-L01-M006-B', 'FAC-001', 'M006', '2026-07-21 14:00:00', 'B', 410, 410, 381, 10, 10, undefined, 71, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260903-L01-M001-A', 'PRD-20260903-L01-M001-A', 'FAC-001', 'M001', '2026-09-03 06:00:00', 'A', 520, 520, 487, 13, 13, undefined, 54.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260811-L03-M014-B', 'PRD-20260811-L03-M014-B', 'FAC-001', 'M014', '2026-08-11 14:00:00', 'B', 420, 420, 377, 5, 5, undefined, 71.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260719-L03-M013-B', 'PRD-20260719-L03-M013-B', 'FAC-001', 'M013', '2026-07-19 14:00:00', 'B', 450, 450, 419, 11, 11, undefined, 62.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260808-L04-M021-A', 'PRD-20260808-L04-M021-A', 'FAC-001', 'M021', '2026-08-08 06:00:00', 'A', 650, 650, 613, 13, 13, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260910-L01-M002-B', 'PRD-20260910-L01-M002-B', 'FAC-001', 'M002', '2026-09-10 14:00:00', 'B', 430, 430, 392, 4, 4, undefined, 69.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260828-L01-M001-A', 'PRD-20260828-L01-M001-A', 'FAC-001', 'M001', '2026-08-28 06:00:00', 'A', 520, 520, 496, 6, 6, undefined, 54.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260823-L04-M020-C', 'PRD-20260823-L04-M020-C', 'FAC-001', 'M020', '2026-08-23 22:00:00', 'C', 560, 560, 517, 4, 4, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260807-L02-M010-C', 'PRD-20260807-L02-M010-C', 'FAC-001', 'M010', '2026-08-07 22:00:00', 'C', 620, 620, 582, 9, 9, undefined, 45.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260715-L04-M024-B', 'PRD-20260715-L04-M024-B', 'FAC-001', 'M024', '2026-07-15 14:00:00', 'B', 640, 640, 595, 13, 13, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260927-L04-M022-A', 'PRD-20260927-L04-M022-A', 'FAC-001', 'M022', '2026-09-27 06:00:00', 'A', 580, 580, 551, 13, 13, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260904-L03-M018-B', 'PRD-20260904-L03-M018-B', 'FAC-001', 'M018', '2026-09-04 14:00:00', 'B', 440, 440, 402, 6, 6, undefined, 66.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260707-L01-M002-A', 'PRD-20260707-L01-M002-A', 'FAC-001', 'M002', '2026-07-07 06:00:00', 'A', 430, 430, 387, 4, 4, undefined, 69.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260903-L01-M003-B', 'PRD-20260903-L01-M003-B', 'FAC-001', 'M003', '2026-09-03 14:00:00', 'B', 650, 650, 595, 17, 17, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260706-L04-M020-A', 'PRD-20260706-L04-M020-A', 'FAC-001', 'M020', '2026-07-06 06:00:00', 'A', 560, 560, 495, 8, 8, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260923-L04-M020-C', 'PRD-20260923-L04-M020-C', 'FAC-001', 'M020', '2026-09-23 22:00:00', 'C', 560, 560, 496, 13, 13, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260922-L01-M005-A', 'PRD-20260922-L01-M005-A', 'FAC-001', 'M005', '2026-09-22 06:00:00', 'A', 480, 480, 436, 9, 9, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260918-L03-M018-A', 'PRD-20260918-L03-M018-A', 'FAC-001', 'M018', '2026-09-18 06:00:00', 'A', 440, 440, 397, 11, 11, undefined, 66.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260917-L03-M015-A', 'PRD-20260917-L03-M015-A', 'FAC-001', 'M015', '2026-09-17 06:00:00', 'A', 380, 380, 357, 5, 5, undefined, 76.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260811-L03-M018-C', 'PRD-20260811-L03-M018-C', 'FAC-001', 'M018', '2026-08-11 22:00:00', 'C', 440, 440, 0, 0, 0, undefined, 0, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260811-L03-M018-B', 'PRD-20260811-L03-M018-B', 'FAC-001', 'M018', '2026-08-11 14:00:00', 'B', 440, 440, 412, 8, 8, undefined, 66.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260926-L03-M013-B', 'PRD-20260926-L03-M013-B', 'FAC-001', 'M013', '2026-09-26 14:00:00', 'B', 450, 450, 436, 9, 9, undefined, 62.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260809-L03-M017-A', 'PRD-20260809-L03-M017-A', 'FAC-001', 'M017', '2026-08-09 06:00:00', 'A', 600, 600, 542, 12, 12, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260824-L04-M020-C', 'PRD-20260824-L04-M020-C', 'FAC-001', 'M020', '2026-08-24 22:00:00', 'C', 560, 560, 506, 7, 7, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260707-L04-M020-B', 'PRD-20260707-L04-M020-B', 'FAC-001', 'M020', '2026-07-07 14:00:00', 'B', 560, 560, 507, 6, 6, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260808-L01-M003-A', 'PRD-20260808-L01-M003-A', 'FAC-001', 'M003', '2026-08-08 06:00:00', 'A', 650, 650, 609, 6, 6, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260922-L01-M003-C', 'PRD-20260922-L01-M003-C', 'FAC-001', 'M003', '2026-09-22 22:00:00', 'C', 650, 650, 606, 15, 15, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260830-L03-M016-B', 'PRD-20260830-L03-M016-B', 'FAC-001', 'M016', '2026-08-30 14:00:00', 'B', 510, 510, 487, 7, 7, undefined, 55.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260924-L04-M021-C', 'PRD-20260924-L04-M021-C', 'FAC-001', 'M021', '2026-09-24 22:00:00', 'C', 650, 650, 597, 17, 17, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260801-L01-M003-A', 'PRD-20260801-L01-M003-A', 'FAC-001', 'M003', '2026-08-01 06:00:00', 'A', 650, 650, 605, 6, 6, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260725-L04-M023-B', 'PRD-20260725-L04-M023-B', 'FAC-001', 'M023', '2026-07-25 14:00:00', 'B', 600, 600, 545, 13, 13, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260828-L04-M020-C', 'PRD-20260828-L04-M020-C', 'FAC-001', 'M020', '2026-08-28 22:00:00', 'C', 560, 560, 496, 8, 8, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260820-L03-M016-A', 'PRD-20260820-L03-M016-A', 'FAC-001', 'M016', '2026-08-20 06:00:00', 'A', 510, 510, 493, 4, 4, undefined, 55.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260815-L02-M009-C', 'PRD-20260815-L02-M009-C', 'FAC-001', 'M009', '2026-08-15 22:00:00', 'C', 460, 460, 421, 11, 11, undefined, 63.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260717-L01-M006-B', 'PRD-20260717-L01-M006-B', 'FAC-001', 'M006', '2026-07-17 14:00:00', 'B', 410, 410, 380, 8, 8, undefined, 70.9, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260701-L02-M008-A', 'PRD-20260701-L02-M008-A', 'FAC-001', 'M008', '2026-07-01 06:00:00', 'A', 580, 580, 516, 7, 7, undefined, 51.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260922-L02-M009-C', 'PRD-20260922-L02-M009-C', 'FAC-001', 'M009', '2026-09-22 22:00:00', 'C', 460, 460, 0, 0, 0, undefined, 0, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260915-L02-M011-B', 'PRD-20260915-L02-M011-B', 'FAC-001', 'M011', '2026-09-15 14:00:00', 'B', 490, 490, 440, 11, 11, undefined, 61.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260726-L03-M014-A', 'PRD-20260726-L03-M014-A', 'FAC-001', 'M014', '2026-07-26 06:00:00', 'A', 420, 420, 381, 5, 5, undefined, 71.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260915-L01-M002-A', 'PRD-20260915-L01-M002-A', 'FAC-001', 'M002', '2026-09-15 06:00:00', 'A', 430, 430, 394, 4, 4, undefined, 69.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260702-L03-M013-C', 'PRD-20260702-L03-M013-C', 'FAC-001', 'M013', '2026-07-02 22:00:00', 'C', 450, 450, 423, 8, 8, undefined, 62.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260721-L01-M004-A', 'PRD-20260721-L01-M004-A', 'FAC-001', 'M004', '2026-07-21 06:00:00', 'A', 300, 300, 286, 7, 7, undefined, 94, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260924-L03-M016-A', 'PRD-20260924-L03-M016-A', 'FAC-001', 'M016', '2026-09-24 06:00:00', 'A', 510, 510, 497, 4, 4, undefined, 55.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260803-L01-M006-C', 'PRD-20260803-L01-M006-C', 'FAC-001', 'M006', '2026-08-03 22:00:00', 'C', 410, 410, 377, 11, 11, undefined, 71, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260710-L01-M003-C', 'PRD-20260710-L01-M003-C', 'FAC-001', 'M003', '2026-07-10 22:00:00', 'C', 650, 650, 607, 13, 13, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260810-L04-M021-A', 'PRD-20260810-L04-M021-A', 'FAC-001', 'M021', '2026-08-10 06:00:00', 'A', 650, 650, 599, 8, 8, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260727-L02-M012-B', 'PRD-20260727-L02-M012-B', 'FAC-001', 'M012', '2026-07-27 14:00:00', 'B', 550, 550, 499, 8, 8, undefined, 52.9, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260923-L03-M015-B', 'PRD-20260923-L03-M015-B', 'FAC-001', 'M015', '2026-09-23 14:00:00', 'B', 380, 380, 350, 6, 6, undefined, 76.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260712-L01-M005-B', 'PRD-20260712-L01-M005-B', 'FAC-001', 'M005', '2026-07-12 14:00:00', 'B', 480, 480, 428, 7, 7, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260818-L02-M010-A', 'PRD-20260818-L02-M010-A', 'FAC-001', 'M010', '2026-08-18 06:00:00', 'A', 620, 620, 602, 13, 13, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260701-L01-M006-A', 'PRD-20260701-L01-M006-A', 'FAC-001', 'M006', '2026-07-01 06:00:00', 'A', 410, 410, 383, 8, 8, undefined, 71, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260802-L03-M014-B', 'PRD-20260802-L03-M014-B', 'FAC-001', 'M014', '2026-08-02 14:00:00', 'B', 420, 420, 383, 9, 9, undefined, 71.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260725-L02-M008-B', 'PRD-20260725-L02-M008-B', 'FAC-001', 'M008', '2026-07-25 14:00:00', 'B', 580, 580, 528, 11, 11, undefined, 51.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260701-L04-M022-C', 'PRD-20260701-L04-M022-C', 'FAC-001', 'M022', '2026-07-01 22:00:00', 'C', 580, 580, 546, 10, 10, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260809-L04-M019-A', 'PRD-20260809-L04-M019-A', 'FAC-001', 'M019', '2026-08-09 06:00:00', 'A', 530, 530, 500, 8, 8, undefined, 53.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260726-L04-M021-B', 'PRD-20260726-L04-M021-B', 'FAC-001', 'M021', '2026-07-26 14:00:00', 'B', 650, 650, 591, 9, 9, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260828-L03-M017-B', 'PRD-20260828-L03-M017-B', 'FAC-001', 'M017', '2026-08-28 14:00:00', 'B', 600, 600, 552, 11, 11, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260707-L03-M015-A', 'PRD-20260707-L03-M015-A', 'FAC-001', 'M015', '2026-07-07 06:00:00', 'A', 380, 380, 358, 8, 8, undefined, 76.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260804-L02-M007-C', 'PRD-20260804-L02-M007-C', 'FAC-001', 'M007', '2026-08-04 22:00:00', 'C', 540, 540, 526, 5, 5, undefined, 52.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260805-L03-M016-C', 'PRD-20260805-L03-M016-C', 'FAC-001', 'M016', '2026-08-05 22:00:00', 'C', 510, 510, 499, 10, 10, undefined, 55.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260920-L02-M008-A', 'PRD-20260920-L02-M008-A', 'FAC-001', 'M008', '2026-09-20 06:00:00', 'A', 580, 580, 519, 9, 9, undefined, 51.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260805-L04-M022-C', 'PRD-20260805-L04-M022-C', 'FAC-001', 'M022', '2026-08-05 22:00:00', 'C', 580, 580, 537, 10, 10, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260830-L03-M017-A', 'PRD-20260830-L03-M017-A', 'FAC-001', 'M017', '2026-08-30 06:00:00', 'A', 600, 600, 540, 12, 12, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260717-L03-M013-C', 'PRD-20260717-L03-M013-C', 'FAC-001', 'M013', '2026-07-17 22:00:00', 'C', 450, 450, 428, 10, 10, undefined, 62.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260714-L01-M005-B', 'PRD-20260714-L01-M005-B', 'FAC-001', 'M005', '2026-07-14 14:00:00', 'B', 480, 480, 439, 4, 4, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260924-L01-M003-B', 'PRD-20260924-L01-M003-B', 'FAC-001', 'M003', '2026-09-24 14:00:00', 'B', 650, 650, 593, 17, 17, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260721-L02-M010-B', 'PRD-20260721-L02-M010-B', 'FAC-001', 'M010', '2026-07-21 14:00:00', 'B', 620, 620, 601, 5, 5, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260914-L02-M009-B', 'PRD-20260914-L02-M009-B', 'FAC-001', 'M009', '2026-09-14 14:00:00', 'B', 460, 460, 423, 12, 12, undefined, 63.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260726-L03-M018-A', 'PRD-20260726-L03-M018-A', 'FAC-001', 'M018', '2026-07-26 06:00:00', 'A', 440, 440, 416, 8, 8, undefined, 66.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260914-L01-M004-C', 'PRD-20260914-L01-M004-C', 'FAC-001', 'M004', '2026-09-14 22:00:00', 'C', 300, 300, 287, 4, 4, undefined, 94.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260701-L01-M002-B', 'PRD-20260701-L01-M002-B', 'FAC-001', 'M002', '2026-07-01 14:00:00', 'B', 430, 430, 385, 10, 10, undefined, 69.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260922-L03-M015-B', 'PRD-20260922-L03-M015-B', 'FAC-001', 'M015', '2026-09-22 14:00:00', 'B', 380, 380, 358, 4, 4, undefined, 76.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260916-L03-M018-C', 'PRD-20260916-L03-M018-C', 'FAC-001', 'M018', '2026-09-16 22:00:00', 'C', 440, 440, 407, 5, 5, undefined, 66, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260829-L03-M016-A', 'PRD-20260829-L03-M016-A', 'FAC-001', 'M016', '2026-08-29 06:00:00', 'A', 510, 510, 497, 10, 10, undefined, 55.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260821-L03-M013-B', 'PRD-20260821-L03-M013-B', 'FAC-001', 'M013', '2026-08-21 14:00:00', 'B', 450, 450, 422, 6, 6, undefined, 62.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260812-L03-M018-A', 'PRD-20260812-L03-M018-A', 'FAC-001', 'M018', '2026-08-12 06:00:00', 'A', 440, 440, 403, 6, 6, undefined, 66.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260706-L03-M014-B', 'PRD-20260706-L03-M014-B', 'FAC-001', 'M014', '2026-07-06 14:00:00', 'B', 420, 420, 382, 3, 3, undefined, 71.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260903-L03-M018-A', 'PRD-20260903-L03-M018-A', 'FAC-001', 'M018', '2026-09-03 06:00:00', 'A', 440, 440, 411, 9, 9, undefined, 66.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260708-L02-M008-C', 'PRD-20260708-L02-M008-C', 'FAC-001', 'M008', '2026-07-08 22:00:00', 'C', 580, 580, 532, 6, 6, undefined, 51.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260728-L02-M010-C', 'PRD-20260728-L02-M010-C', 'FAC-001', 'M010', '2026-07-28 22:00:00', 'C', 620, 620, 0, 0, 0, undefined, 0, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260818-L02-M009-A', 'PRD-20260818-L02-M009-A', 'FAC-001', 'M009', '2026-08-18 06:00:00', 'A', 460, 460, 422, 11, 11, undefined, 63.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260826-L03-M015-C', 'PRD-20260826-L03-M015-C', 'FAC-001', 'M015', '2026-08-26 22:00:00', 'C', 380, 380, 350, 9, 9, undefined, 76.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260729-L02-M008-C', 'PRD-20260729-L02-M008-C', 'FAC-001', 'M008', '2026-07-29 22:00:00', 'C', 580, 580, 530, 6, 6, undefined, 51.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260703-L01-M003-A', 'PRD-20260703-L01-M003-A', 'FAC-001', 'M003', '2026-07-03 06:00:00', 'A', 650, 650, 603, 15, 15, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260927-L02-M009-B', 'PRD-20260927-L02-M009-B', 'FAC-001', 'M009', '2026-09-27 14:00:00', 'B', 460, 460, 428, 9, 9, undefined, 63.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260710-L03-M013-A', 'PRD-20260710-L03-M013-A', 'FAC-001', 'M013', '2026-07-10 06:00:00', 'A', 450, 450, 426, 12, 12, undefined, 62.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260714-L03-M016-C', 'PRD-20260714-L03-M016-C', 'FAC-001', 'M016', '2026-07-14 22:00:00', 'C', 510, 510, 489, 7, 7, undefined, 55.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260904-L04-M021-B', 'PRD-20260904-L04-M021-B', 'FAC-001', 'M021', '2026-09-04 14:00:00', 'B', 650, 650, 599, 15, 15, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260913-L02-M010-A', 'PRD-20260913-L02-M010-A', 'FAC-001', 'M010', '2026-09-13 06:00:00', 'A', 620, 620, 602, 5, 5, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260906-L01-M005-B', 'PRD-20260906-L01-M005-B', 'FAC-001', 'M005', '2026-09-06 14:00:00', 'B', 480, 480, 420, 7, 7, undefined, 62.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260727-L04-M022-B', 'PRD-20260727-L04-M022-B', 'FAC-001', 'M022', '2026-07-27 14:00:00', 'B', 580, 580, 546, 10, 10, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260922-L02-M011-A', 'PRD-20260922-L02-M011-A', 'FAC-001', 'M011', '2026-09-22 06:00:00', 'A', 490, 490, 432, 7, 7, undefined, 61.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260918-L01-M005-A', 'PRD-20260918-L01-M005-A', 'FAC-001', 'M005', '2026-09-18 06:00:00', 'A', 480, 480, 424, 7, 7, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260901-L04-M020-C', 'PRD-20260901-L04-M020-C', 'FAC-001', 'M020', '2026-09-01 22:00:00', 'C', 560, 560, 510, 10, 10, undefined, 53.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260824-L02-M008-C', 'PRD-20260824-L02-M008-C', 'FAC-001', 'M008', '2026-08-24 22:00:00', 'C', 580, 580, 530, 11, 11, undefined, 51.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260806-L01-M003-A', 'PRD-20260806-L01-M003-A', 'FAC-001', 'M003', '2026-08-06 06:00:00', 'A', 650, 650, 622, 12, 12, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260829-L01-M002-C', 'PRD-20260829-L01-M002-C', 'FAC-001', 'M002', '2026-08-29 22:00:00', 'C', 430, 430, 388, 4, 4, undefined, 69.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260730-L01-M005-C', 'PRD-20260730-L01-M005-C', 'FAC-001', 'M005', '2026-07-30 22:00:00', 'C', 480, 480, 445, 4, 4, undefined, 62.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260801-L01-M004-B', 'PRD-20260801-L01-M004-B', 'FAC-001', 'M004', '2026-08-01 14:00:00', 'B', 300, 300, 282, 4, 4, undefined, 94, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260820-L01-M001-C', 'PRD-20260820-L01-M001-C', 'FAC-001', 'M001', '2026-08-20 22:00:00', 'C', 520, 520, 493, 12, 12, undefined, 54.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260911-L03-M015-A', 'PRD-20260911-L03-M015-A', 'FAC-001', 'M015', '2026-09-11 06:00:00', 'A', 380, 380, 363, 7, 7, undefined, 76.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260702-L02-M007-C', 'PRD-20260702-L02-M007-C', 'FAC-001', 'M007', '2026-07-02 22:00:00', 'C', 540, 540, 522, 11, 11, undefined, 52.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260926-L02-M010-B', 'PRD-20260926-L02-M010-B', 'FAC-001', 'M010', '2026-09-26 14:00:00', 'B', 620, 620, 596, 7, 7, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260907-L03-M017-C', 'PRD-20260907-L03-M017-C', 'FAC-001', 'M017', '2026-09-07 22:00:00', 'C', 600, 600, 532, 14, 14, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260829-L01-M006-B', 'PRD-20260829-L01-M006-B', 'FAC-001', 'M006', '2026-08-29 14:00:00', 'B', 410, 410, 377, 11, 11, undefined, 71, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260726-L04-M021-A', 'PRD-20260726-L04-M021-A', 'FAC-001', 'M021', '2026-07-26 06:00:00', 'A', 650, 650, 591, 17, 17, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260704-L02-M010-A', 'PRD-20260704-L02-M010-A', 'FAC-001', 'M010', '2026-07-04 06:00:00', 'A', 620, 620, 592, 14, 14, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260709-L01-M002-A', 'PRD-20260709-L01-M002-A', 'FAC-001', 'M002', '2026-07-09 06:00:00', 'A', 430, 430, 388, 9, 9, undefined, 69.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260905-L01-M001-B', 'PRD-20260905-L01-M001-B', 'FAC-001', 'M001', '2026-09-05 14:00:00', 'B', 520, 520, 488, 13, 13, undefined, 54.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260826-L01-M003-B', 'PRD-20260826-L01-M003-B', 'FAC-001', 'M003', '2026-08-26 14:00:00', 'B', 650, 650, 605, 13, 13, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260922-L03-M018-B', 'PRD-20260922-L03-M018-B', 'FAC-001', 'M018', '2026-09-22 14:00:00', 'B', 440, 440, 418, 8, 8, undefined, 66.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260910-L01-M006-A', 'PRD-20260910-L01-M006-A', 'FAC-001', 'M006', '2026-09-10 06:00:00', 'A', 410, 410, 372, 10, 10, undefined, 71, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260904-L02-M007-A', 'PRD-20260904-L02-M007-A', 'FAC-001', 'M007', '2026-09-04 06:00:00', 'A', 540, 540, 528, 5, 5, undefined, 52.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260822-L04-M020-B', 'PRD-20260822-L04-M020-B', 'FAC-001', 'M020', '2026-08-22 14:00:00', 'B', 560, 560, 505, 7, 7, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260815-L04-M019-A', 'PRD-20260815-L04-M019-A', 'FAC-001', 'M019', '2026-08-15 06:00:00', 'A', 530, 530, 515, 5, 5, undefined, 53.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260901-L04-M022-B', 'PRD-20260901-L04-M022-B', 'FAC-001', 'M022', '2026-09-01 14:00:00', 'B', 580, 580, 551, 13, 13, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260830-L04-M019-B', 'PRD-20260830-L04-M019-B', 'FAC-001', 'M019', '2026-08-30 14:00:00', 'B', 530, 530, 510, 12, 12, undefined, 53.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260822-L03-M018-C', 'PRD-20260822-L03-M018-C', 'FAC-001', 'M018', '2026-08-22 22:00:00', 'C', 440, 440, 417, 4, 4, undefined, 66, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260914-L04-M019-C', 'PRD-20260914-L04-M019-C', 'FAC-001', 'M019', '2026-09-14 22:00:00', 'C', 530, 530, 493, 9, 9, undefined, 53.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260924-L01-M004-C', 'PRD-20260924-L01-M004-C', 'FAC-001', 'M004', '2026-09-24 22:00:00', 'C', 300, 300, 289, 3, 3, undefined, 94.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260914-L01-M005-A', 'PRD-20260914-L01-M005-A', 'FAC-001', 'M005', '2026-09-14 06:00:00', 'A', 480, 480, 433, 6, 6, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260727-L03-M017-C', 'PRD-20260727-L03-M017-C', 'FAC-001', 'M017', '2026-07-27 22:00:00', 'C', 600, 600, 536, 14, 14, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260708-L04-M022-A', 'PRD-20260708-L04-M022-A', 'FAC-001', 'M022', '2026-07-08 06:00:00', 'A', 580, 580, 562, 12, 12, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260901-L03-M018-A', 'PRD-20260901-L03-M018-A', 'FAC-001', 'M018', '2026-09-01 06:00:00', 'A', 440, 440, 410, 4, 4, undefined, 66.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260917-L04-M023-B', 'PRD-20260917-L04-M023-B', 'FAC-001', 'M023', '2026-09-17 14:00:00', 'B', 600, 600, 546, 6, 6, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260925-L03-M014-A', 'PRD-20260925-L03-M014-A', 'FAC-001', 'M014', '2026-09-25 06:00:00', 'A', 420, 420, 375, 9, 9, undefined, 71.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260820-L02-M009-B', 'PRD-20260820-L02-M009-B', 'FAC-001', 'M009', '2026-08-20 14:00:00', 'B', 460, 460, 423, 11, 11, undefined, 63.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260724-L03-M015-A', 'PRD-20260724-L03-M015-A', 'FAC-001', 'M015', '2026-07-24 06:00:00', 'A', 380, 380, 364, 7, 7, undefined, 76.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260809-L01-M003-C', 'PRD-20260809-L01-M003-C', 'FAC-001', 'M003', '2026-08-09 22:00:00', 'C', 650, 650, 610, 8, 8, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260808-L04-M020-B', 'PRD-20260808-L04-M020-B', 'FAC-001', 'M020', '2026-08-08 14:00:00', 'B', 560, 560, 498, 7, 7, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260827-L04-M023-A', 'PRD-20260827-L04-M023-A', 'FAC-001', 'M023', '2026-08-27 06:00:00', 'A', 600, 600, 535, 12, 12, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260909-L04-M024-C', 'PRD-20260909-L04-M024-C', 'FAC-001', 'M024', '2026-09-09 22:00:00', 'C', 640, 640, 598, 6, 6, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260812-L01-M002-C', 'PRD-20260812-L01-M002-C', 'FAC-001', 'M002', '2026-08-12 22:00:00', 'C', 430, 430, 382, 5, 5, undefined, 69.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260910-L03-M018-A', 'PRD-20260910-L03-M018-A', 'FAC-001', 'M018', '2026-09-10 06:00:00', 'A', 440, 440, 414, 9, 9, undefined, 66.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260923-L02-M011-A', 'PRD-20260923-L02-M011-A', 'FAC-001', 'M011', '2026-09-23 06:00:00', 'A', 490, 490, 443, 10, 10, undefined, 61.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260927-L01-M002-B', 'PRD-20260927-L01-M002-B', 'FAC-001', 'M002', '2026-09-27 14:00:00', 'B', 430, 430, 398, 3, 3, undefined, 69.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260705-L04-M019-B', 'PRD-20260705-L04-M019-B', 'FAC-001', 'M019', '2026-07-05 14:00:00', 'B', 530, 530, 508, 12, 12, undefined, 53.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260716-L03-M016-A', 'PRD-20260716-L03-M016-A', 'FAC-001', 'M016', '2026-07-16 06:00:00', 'A', 510, 510, 501, 5, 5, undefined, 55.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260921-L04-M019-C', 'PRD-20260921-L04-M019-C', 'FAC-001', 'M019', '2026-09-21 22:00:00', 'C', 530, 530, 497, 9, 9, undefined, 53.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260827-L02-M011-A', 'PRD-20260827-L02-M011-A', 'FAC-001', 'M011', '2026-08-27 06:00:00', 'A', 490, 490, 453, 4, 4, undefined, 61.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260917-L04-M021-A', 'PRD-20260917-L04-M021-A', 'FAC-001', 'M021', '2026-09-17 06:00:00', 'A', 650, 650, 606, 6, 6, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260706-L03-M018-B', 'PRD-20260706-L03-M018-B', 'FAC-001', 'M018', '2026-07-06 14:00:00', 'B', 440, 440, 408, 5, 5, undefined, 66.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260820-L04-M022-B', 'PRD-20260820-L04-M022-B', 'FAC-001', 'M022', '2026-08-20 14:00:00', 'B', 580, 580, 545, 8, 8, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260702-L03-M017-A', 'PRD-20260702-L03-M017-A', 'FAC-001', 'M017', '2026-07-02 06:00:00', 'A', 600, 600, 536, 14, 14, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260822-L02-M008-B', 'PRD-20260822-L02-M008-B', 'FAC-001', 'M008', '2026-08-22 14:00:00', 'B', 580, 580, 529, 11, 11, undefined, 51.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260822-L03-M015-A', 'PRD-20260822-L03-M015-A', 'FAC-001', 'M015', '2026-08-22 06:00:00', 'A', 380, 380, 348, 9, 9, undefined, 76.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260925-L01-M002-B', 'PRD-20260925-L01-M002-B', 'FAC-001', 'M002', '2026-09-25 14:00:00', 'B', 430, 430, 379, 6, 6, undefined, 69.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260729-L02-M011-B', 'PRD-20260729-L02-M011-B', 'FAC-001', 'M011', '2026-07-29 14:00:00', 'B', 490, 490, 441, 5, 5, undefined, 61.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260710-L04-M024-B', 'PRD-20260710-L04-M024-B', 'FAC-001', 'M024', '2026-07-10 14:00:00', 'B', 640, 640, 593, 8, 8, undefined, 45.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260726-L01-M002-C', 'PRD-20260726-L01-M002-C', 'FAC-001', 'M002', '2026-07-26 22:00:00', 'C', 430, 430, 376, 6, 6, undefined, 69.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260829-L04-M023-C', 'PRD-20260829-L04-M023-C', 'FAC-001', 'M023', '2026-08-29 22:00:00', 'C', 600, 600, 550, 6, 6, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260906-L02-M010-C', 'PRD-20260906-L02-M010-C', 'FAC-001', 'M010', '2026-09-06 22:00:00', 'C', 620, 620, 585, 16, 16, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260831-L01-M005-C', 'PRD-20260831-L01-M005-C', 'FAC-001', 'M005', '2026-08-31 22:00:00', 'C', 480, 480, 438, 5, 5, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260705-L04-M022-B', 'PRD-20260705-L04-M022-B', 'FAC-001', 'M022', '2026-07-05 14:00:00', 'B', 580, 580, 561, 7, 7, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260810-L03-M018-B', 'PRD-20260810-L03-M018-B', 'FAC-001', 'M018', '2026-08-10 14:00:00', 'B', 440, 440, 412, 5, 5, undefined, 66.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260823-L03-M014-A', 'PRD-20260823-L03-M014-A', 'FAC-001', 'M014', '2026-08-23 06:00:00', 'A', 420, 420, 372, 5, 5, undefined, 71.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260728-L02-M012-A', 'PRD-20260728-L02-M012-A', 'FAC-001', 'M012', '2026-07-28 06:00:00', 'A', 550, 550, 512, 7, 7, undefined, 52.9, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260915-L04-M022-C', 'PRD-20260915-L04-M022-C', 'FAC-001', 'M022', '2026-09-15 22:00:00', 'C', 580, 580, 558, 7, 7, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260806-L03-M015-A', 'PRD-20260806-L03-M015-A', 'FAC-001', 'M015', '2026-08-06 06:00:00', 'A', 380, 380, 351, 5, 5, undefined, 76.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260927-L02-M012-C', 'PRD-20260927-L02-M012-C', 'FAC-001', 'M012', '2026-09-27 22:00:00', 'C', 550, 550, 516, 10, 10, undefined, 52.9, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260922-L03-M016-B', 'PRD-20260922-L03-M016-B', 'FAC-001', 'M016', '2026-09-22 14:00:00', 'B', 510, 510, 486, 13, 13, undefined, 55.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260824-L03-M013-A', 'PRD-20260824-L03-M013-A', 'FAC-001', 'M013', '2026-08-24 06:00:00', 'A', 450, 450, 433, 10, 10, undefined, 62.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260708-L02-M012-C', 'PRD-20260708-L02-M012-C', 'FAC-001', 'M012', '2026-07-08 22:00:00', 'C', 550, 550, 503, 8, 8, undefined, 52.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260826-L04-M021-C', 'PRD-20260826-L04-M021-C', 'FAC-001', 'M021', '2026-08-26 22:00:00', 'C', 650, 650, 609, 13, 13, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260721-L04-M022-A', 'PRD-20260721-L04-M022-A', 'FAC-001', 'M022', '2026-07-21 06:00:00', 'A', 580, 580, 556, 8, 8, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260916-L02-M010-C', 'PRD-20260916-L02-M010-C', 'FAC-001', 'M010', '2026-09-16 22:00:00', 'C', 620, 620, 590, 14, 14, undefined, 45.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260908-L03-M014-C', 'PRD-20260908-L03-M014-C', 'FAC-001', 'M014', '2026-09-08 22:00:00', 'C', 420, 420, 378, 9, 9, undefined, 71.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260920-L02-M010-C', 'PRD-20260920-L02-M010-C', 'FAC-001', 'M010', '2026-09-20 22:00:00', 'C', 620, 620, 578, 16, 16, undefined, 45.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260901-L03-M014-A', 'PRD-20260901-L03-M014-A', 'FAC-001', 'M014', '2026-09-01 06:00:00', 'A', 420, 420, 375, 10, 10, undefined, 71.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260914-L02-M008-C', 'PRD-20260914-L02-M008-C', 'FAC-001', 'M008', '2026-09-14 22:00:00', 'C', 580, 580, 528, 11, 11, undefined, 51.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260715-L02-M008-C', 'PRD-20260715-L02-M008-C', 'FAC-001', 'M008', '2026-07-15 22:00:00', 'C', 580, 580, 523, 6, 6, undefined, 51.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260721-L04-M021-C', 'PRD-20260721-L04-M021-C', 'FAC-001', 'M021', '2026-07-21 22:00:00', 'C', 650, 650, 589, 9, 9, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260720-L01-M005-B', 'PRD-20260720-L01-M005-B', 'FAC-001', 'M005', '2026-07-20 14:00:00', 'B', 480, 480, 431, 10, 10, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260712-L04-M021-B', 'PRD-20260712-L04-M021-B', 'FAC-001', 'M021', '2026-07-12 14:00:00', 'B', 650, 650, 598, 10, 10, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260710-L02-M007-B', 'PRD-20260710-L02-M007-B', 'FAC-001', 'M007', '2026-07-10 14:00:00', 'B', 540, 540, 501, 9, 9, undefined, 52.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260908-L02-M007-C', 'PRD-20260908-L02-M007-C', 'FAC-001', 'M007', '2026-09-08 22:00:00', 'C', 540, 540, 530, 5, 5, undefined, 52.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260717-L04-M022-B', 'PRD-20260717-L04-M022-B', 'FAC-001', 'M022', '2026-07-17 14:00:00', 'B', 580, 580, 567, 12, 12, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260922-L04-M019-A', 'PRD-20260922-L04-M019-A', 'FAC-001', 'M019', '2026-09-22 06:00:00', 'A', 530, 530, 497, 13, 13, undefined, 53.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260921-L02-M012-C', 'PRD-20260921-L02-M012-C', 'FAC-001', 'M012', '2026-09-21 22:00:00', 'C', 550, 550, 501, 13, 13, undefined, 52.9, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260914-L03-M014-B', 'PRD-20260914-L03-M014-B', 'FAC-001', 'M014', '2026-09-14 14:00:00', 'B', 420, 420, 389, 3, 3, undefined, 71.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260809-L01-M002-A', 'PRD-20260809-L01-M002-A', 'FAC-001', 'M002', '2026-08-09 06:00:00', 'A', 430, 430, 390, 8, 8, undefined, 69.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260829-L04-M019-A', 'PRD-20260829-L04-M019-A', 'FAC-001', 'M019', '2026-08-29 06:00:00', 'A', 530, 530, 521, 5, 5, undefined, 53.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260802-L03-M016-B', 'PRD-20260802-L03-M016-B', 'FAC-001', 'M016', '2026-08-02 14:00:00', 'B', 510, 510, 486, 7, 7, undefined, 55.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260706-L01-M006-C', 'PRD-20260706-L01-M006-C', 'FAC-001', 'M006', '2026-07-06 22:00:00', 'C', 410, 410, 376, 11, 11, undefined, 71, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260718-L01-M002-A', 'PRD-20260718-L01-M002-A', 'FAC-001', 'M002', '2026-07-18 06:00:00', 'A', 430, 430, 382, 5, 5, undefined, 69.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260821-L01-M001-B', 'PRD-20260821-L01-M001-B', 'FAC-001', 'M001', '2026-08-21 14:00:00', 'B', 520, 520, 505, 11, 11, undefined, 54.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260831-L01-M005-A', 'PRD-20260831-L01-M005-A', 'FAC-001', 'M005', '2026-08-31 06:00:00', 'A', 480, 480, 427, 6, 6, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260720-L01-M006-B', 'PRD-20260720-L01-M006-B', 'FAC-001', 'M006', '2026-07-20 14:00:00', 'B', 410, 410, 390, 7, 7, undefined, 70.9, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260707-L01-M006-B', 'PRD-20260707-L01-M006-B', 'FAC-001', 'M006', '2026-07-07 14:00:00', 'B', 410, 410, 376, 9, 9, undefined, 71, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260808-L01-M005-C', 'PRD-20260808-L01-M005-C', 'FAC-001', 'M005', '2026-08-08 22:00:00', 'C', 480, 480, 439, 9, 9, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260903-L04-M024-A', 'PRD-20260903-L04-M024-A', 'FAC-001', 'M024', '2026-09-03 06:00:00', 'A', 640, 640, 541, 10, 10, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260826-L02-M012-C', 'PRD-20260826-L02-M012-C', 'FAC-001', 'M012', '2026-08-26 22:00:00', 'C', 550, 550, 501, 8, 8, undefined, 52.9, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260801-L03-M015-C', 'PRD-20260801-L03-M015-C', 'FAC-001', 'M015', '2026-08-01 22:00:00', 'C', 380, 380, 358, 8, 8, undefined, 76.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260702-L04-M024-A', 'PRD-20260702-L04-M024-A', 'FAC-001', 'M024', '2026-07-02 06:00:00', 'A', 640, 640, 602, 11, 11, undefined, 45.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260816-L04-M021-B', 'PRD-20260816-L04-M021-B', 'FAC-001', 'M021', '2026-08-16 14:00:00', 'B', 650, 650, 589, 9, 9, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260906-L03-M017-C', 'PRD-20260906-L03-M017-C', 'FAC-001', 'M017', '2026-09-06 22:00:00', 'C', 600, 600, 544, 11, 11, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260828-L02-M009-C', 'PRD-20260828-L02-M009-C', 'FAC-001', 'M009', '2026-08-28 22:00:00', 'C', 460, 460, 436, 8, 8, undefined, 63.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260925-L01-M001-A', 'PRD-20260925-L01-M001-A', 'FAC-001', 'M001', '2026-09-25 06:00:00', 'A', 520, 520, 497, 6, 6, undefined, 54.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260725-L04-M024-C', 'PRD-20260725-L04-M024-C', 'FAC-001', 'M024', '2026-07-25 22:00:00', 'C', 640, 640, 587, 16, 16, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260707-L01-M005-C', 'PRD-20260707-L01-M005-C', 'FAC-001', 'M005', '2026-07-07 22:00:00', 'C', 480, 480, 426, 7, 7, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260815-L04-M020-A', 'PRD-20260815-L04-M020-A', 'FAC-001', 'M020', '2026-08-15 06:00:00', 'A', 560, 560, 502, 13, 13, undefined, 53.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260711-L04-M019-B', 'PRD-20260711-L04-M019-B', 'FAC-001', 'M019', '2026-07-11 14:00:00', 'B', 530, 530, 499, 9, 9, undefined, 53.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260819-L02-M012-C', 'PRD-20260819-L02-M012-C', 'FAC-001', 'M012', '2026-08-19 22:00:00', 'C', 550, 550, 498, 8, 8, undefined, 52.9, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260821-L03-M016-B', 'PRD-20260821-L03-M016-B', 'FAC-001', 'M016', '2026-08-21 14:00:00', 'B', 510, 510, 482, 12, 12, undefined, 55.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260713-L03-M014-A', 'PRD-20260713-L03-M014-A', 'FAC-001', 'M014', '2026-07-13 06:00:00', 'A', 420, 420, 385, 8, 8, undefined, 71.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260909-L01-M003-C', 'PRD-20260909-L01-M003-C', 'FAC-001', 'M003', '2026-09-09 22:00:00', 'C', 650, 650, 613, 6, 6, undefined, 44.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260907-L04-M024-C', 'PRD-20260907-L04-M024-C', 'FAC-001', 'M024', '2026-09-07 22:00:00', 'C', 640, 640, 611, 12, 12, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260919-L02-M009-B', 'PRD-20260919-L02-M009-B', 'FAC-001', 'M009', '2026-09-19 14:00:00', 'B', 460, 460, 425, 7, 7, undefined, 63.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260826-L01-M005-C', 'PRD-20260826-L01-M005-C', 'FAC-001', 'M005', '2026-08-26 22:00:00', 'C', 480, 480, 436, 10, 10, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260908-L04-M024-C', 'PRD-20260908-L04-M024-C', 'FAC-001', 'M024', '2026-09-08 22:00:00', 'C', 640, 640, 583, 15, 15, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260917-L03-M014-A', 'PRD-20260917-L03-M014-A', 'FAC-001', 'M014', '2026-09-17 06:00:00', 'A', 420, 420, 372, 6, 6, undefined, 71.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260705-L01-M001-B', 'PRD-20260705-L01-M001-B', 'FAC-001', 'M001', '2026-07-05 14:00:00', 'B', 520, 520, 495, 6, 6, undefined, 54.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260829-L01-M002-A', 'PRD-20260829-L01-M002-A', 'FAC-001', 'M002', '2026-08-29 06:00:00', 'A', 430, 430, 388, 5, 5, undefined, 69.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260813-L04-M022-C', 'PRD-20260813-L04-M022-C', 'FAC-001', 'M022', '2026-08-13 22:00:00', 'C', 580, 580, 555, 13, 13, undefined, 48.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260803-L03-M013-C', 'PRD-20260803-L03-M013-C', 'FAC-001', 'M013', '2026-08-03 22:00:00', 'C', 450, 450, 435, 9, 9, undefined, 62.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260913-L04-M023-A', 'PRD-20260913-L04-M023-A', 'FAC-001', 'M023', '2026-09-13 06:00:00', 'A', 600, 600, 544, 11, 11, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260915-L01-M003-C', 'PRD-20260915-L01-M003-C', 'FAC-001', 'M003', '2026-09-15 22:00:00', 'C', 650, 650, 602, 15, 15, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260915-L02-M010-A', 'PRD-20260915-L02-M010-A', 'FAC-001', 'M010', '2026-09-15 06:00:00', 'A', 620, 620, 603, 13, 13, undefined, 45.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260814-L01-M006-B', 'PRD-20260814-L01-M006-B', 'FAC-001', 'M006', '2026-08-14 14:00:00', 'B', 410, 410, 381, 8, 8, undefined, 70.9, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260724-L03-M018-B', 'PRD-20260724-L03-M018-B', 'FAC-001', 'M018', '2026-07-24 14:00:00', 'B', 440, 440, 406, 6, 6, undefined, 66.1, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260908-L01-M002-C', 'PRD-20260908-L01-M002-C', 'FAC-001', 'M002', '2026-09-08 22:00:00', 'C', 430, 430, 0, 0, 0, undefined, 0, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260911-L03-M016-A', 'PRD-20260911-L03-M016-A', 'FAC-001', 'M016', '2026-09-11 06:00:00', 'A', 510, 510, 480, 7, 7, undefined, 55.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260711-L04-M021-A', 'PRD-20260711-L04-M021-A', 'FAC-001', 'M021', '2026-07-11 06:00:00', 'A', 650, 650, 611, 13, 13, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260928-L01-M005-B', 'PRD-20260928-L01-M005-B', 'FAC-001', 'M005', '2026-09-28 14:00:00', 'B', 480, 480, 428, 10, 10, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260823-L01-M002-C', 'PRD-20260823-L01-M002-C', 'FAC-001', 'M002', '2026-08-23 22:00:00', 'C', 430, 430, 377, 6, 6, undefined, 69.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260823-L03-M017-B', 'PRD-20260823-L03-M017-B', 'FAC-001', 'M017', '2026-08-23 14:00:00', 'B', 600, 600, 550, 6, 6, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260910-L01-M006-B', 'PRD-20260910-L01-M006-B', 'FAC-001', 'M006', '2026-09-10 14:00:00', 'B', 410, 410, 372, 6, 6, undefined, 71, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260810-L04-M021-C', 'PRD-20260810-L04-M021-C', 'FAC-001', 'M021', '2026-08-10 22:00:00', 'C', 650, 650, 614, 6, 6, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260915-L03-M017-C', 'PRD-20260915-L03-M017-C', 'FAC-001', 'M017', '2026-09-15 22:00:00', 'C', 600, 600, 548, 6, 6, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260722-L01-M005-A', 'PRD-20260722-L01-M005-A', 'FAC-001', 'M005', '2026-07-22 06:00:00', 'A', 480, 480, 432, 11, 11, undefined, 62.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260718-L03-M013-A', 'PRD-20260718-L03-M013-A', 'FAC-001', 'M013', '2026-07-18 06:00:00', 'A', 450, 450, 428, 5, 5, undefined, 62.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260904-L04-M019-B', 'PRD-20260904-L04-M019-B', 'FAC-001', 'M019', '2026-09-04 14:00:00', 'B', 530, 530, 512, 6, 6, undefined, 53.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260827-L02-M008-C', 'PRD-20260827-L02-M008-C', 'FAC-001', 'M008', '2026-08-27 22:00:00', 'C', 580, 580, 507, 9, 9, undefined, 51.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260926-L04-M022-C', 'PRD-20260926-L04-M022-C', 'FAC-001', 'M022', '2026-09-26 22:00:00', 'C', 580, 580, 551, 8, 8, undefined, 48.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260826-L02-M007-A', 'PRD-20260826-L02-M007-A', 'FAC-001', 'M007', '2026-08-26 06:00:00', 'A', 540, 540, 499, 9, 9, undefined, 52.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260801-L04-M020-A', 'PRD-20260801-L04-M020-A', 'FAC-001', 'M020', '2026-08-01 06:00:00', 'A', 560, 560, 495, 13, 13, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260705-L02-M010-C', 'PRD-20260705-L02-M010-C', 'FAC-001', 'M010', '2026-07-05 22:00:00', 'C', 620, 620, 578, 16, 16, undefined, 45.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260701-L04-M024-B', 'PRD-20260701-L04-M024-B', 'FAC-001', 'M024', '2026-07-01 14:00:00', 'B', 640, 640, 602, 13, 13, undefined, 45.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260914-L02-M011-C', 'PRD-20260914-L02-M011-C', 'FAC-001', 'M011', '2026-09-14 22:00:00', 'C', 490, 490, 450, 4, 4, undefined, 61.2, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260726-L01-M001-A', 'PRD-20260726-L01-M001-A', 'FAC-001', 'M001', '2026-07-26 06:00:00', 'A', 520, 520, 493, 12, 12, undefined, 54.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260813-L03-M013-A', 'PRD-20260813-L03-M013-A', 'FAC-001', 'M013', '2026-08-13 06:00:00', 'A', 450, 450, 439, 9, 9, undefined, 62.7, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260819-L03-M017-A', 'PRD-20260819-L03-M017-A', 'FAC-001', 'M017', '2026-08-19 06:00:00', 'A', 600, 600, 547, 11, 11, undefined, 50, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260924-L03-M016-C', 'PRD-20260924-L03-M016-C', 'FAC-001', 'M016', '2026-09-24 22:00:00', 'C', 510, 510, 475, 13, 13, undefined, 55.3, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260918-L01-M004-B', 'PRD-20260918-L01-M004-B', 'FAC-001', 'M004', '2026-09-18 14:00:00', 'B', 300, 300, 295, 3, 3, undefined, 94, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260814-L04-M022-A', 'PRD-20260814-L04-M022-A', 'FAC-001', 'M022', '2026-08-14 06:00:00', 'A', 580, 580, 555, 7, 7, undefined, 48.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260729-L04-M020-C', 'PRD-20260729-L04-M020-C', 'FAC-001', 'M020', '2026-07-29 22:00:00', 'C', 560, 560, 494, 13, 13, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260727-L04-M020-B', 'PRD-20260727-L04-M020-B', 'FAC-001', 'M020', '2026-07-27 14:00:00', 'B', 560, 560, 493, 13, 13, undefined, 53.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260820-L01-M003-B', 'PRD-20260820-L01-M003-B', 'FAC-001', 'M003', '2026-08-20 14:00:00', 'B', 650, 650, 587, 16, 16, undefined, 44.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260716-L01-M006-A', 'PRD-20260716-L01-M006-A', 'FAC-001', 'M006', '2026-07-16 06:00:00', 'A', 410, 410, 370, 10, 10, undefined, 71, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260802-L04-M020-A', 'PRD-20260802-L04-M020-A', 'FAC-001', 'M020', '2026-08-02 06:00:00', 'A', 560, 560, 507, 6, 6, undefined, 53.6, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260728-L03-M015-A', 'PRD-20260728-L03-M015-A', 'FAC-001', 'M015', '2026-07-28 06:00:00', 'A', 380, 380, 357, 8, 8, undefined, 76.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260925-L04-M024-B', 'PRD-20260925-L04-M024-B', 'FAC-001', 'M024', '2026-09-25 14:00:00', 'B', 640, 640, 593, 8, 8, undefined, 45.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260712-L03-M014-A', 'PRD-20260712-L03-M014-A', 'FAC-001', 'M014', '2026-07-12 06:00:00', 'A', 420, 420, 375, 5, 5, undefined, 71.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260829-L03-M014-B', 'PRD-20260829-L03-M014-B', 'FAC-001', 'M014', '2026-08-29 14:00:00', 'B', 420, 420, 375, 6, 6, undefined, 71.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260924-L04-M024-C', 'PRD-20260924-L04-M024-C', 'FAC-001', 'M024', '2026-09-24 22:00:00', 'C', 640, 640, 593, 9, 9, undefined, 45.4, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260802-L04-M024-A', 'PRD-20260802-L04-M024-A', 'FAC-001', 'M024', '2026-08-02 06:00:00', 'A', 640, 640, 591.08, 9.08, 9.08, undefined, 45.5, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;
INSERT INTO production_records (id, production_id, factory_id, machine_id, timestamp, shift, target_units, planned_units, actual_units, defective_units, defect_units, scrap_kg, cycle_time_sec, operator, operator_name)
VALUES ('PRD-20260704-L01-M002-C', 'PRD-20260704-L01-M002-C', 'FAC-001', 'M002', '2026-07-04 22:00:00', 'C', 430, 430, 386, 4, 4, undefined, 69.8, 'Shift Operator', 'Shift Operator')
ON CONFLICT (id) DO NOTHING;

-- End of FactoryOps Schema and Seed Script
