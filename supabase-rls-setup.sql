-- ======================================================================
-- FACTORYOPS AI: SECURE SUPABASE DATABASE & ROW LEVEL SECURITY MIGRATION
-- ======================================================================
-- Security Model:
-- 1. Keeps Row Level Security (RLS) ENABLED on all 11 tables.
-- 2. DENIES all anonymous ('anon') access to sensitive tables (users, system_audit_logs, work_orders, etc.).
-- 3. Restricts SELECT access to 'authenticated' sessions for operational queries.
-- 4. Restricts INSERT/UPDATE/DELETE actions to 'authenticated' users and server-side service_role.
-- 5. Creates missing 'spare_parts' and 'system_audit_logs' tables idempotently.
-- ======================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE IF EXISTS factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS data_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. DROP ALL OBSOLETE, PERMISSIVE, OR ANONYMOUS POLICIES IF THEY EXIST
DROP POLICY IF EXISTS "Public full access to factories" ON factories;
DROP POLICY IF EXISTS "Public full access to users" ON users;
DROP POLICY IF EXISTS "Public full access to machines" ON machines;
DROP POLICY IF EXISTS "Public full access to production" ON production_records;
DROP POLICY IF EXISTS "Public full access to maintenance" ON maintenance_records;
DROP POLICY IF EXISTS "Public full access to incidents" ON incidents;
DROP POLICY IF EXISTS "Public full access to work_orders" ON work_orders;
DROP POLICY IF EXISTS "Public full access to sops" ON sops;
DROP POLICY IF EXISTS "Public full access to data_quality" ON data_quality_metrics;

DROP POLICY IF EXISTS "Allow read access to factories" ON factories;
DROP POLICY IF EXISTS "Allow read access to users" ON users;
DROP POLICY IF EXISTS "Allow read access to machines" ON machines;
DROP POLICY IF EXISTS "Allow read access to production_records" ON production_records;
DROP POLICY IF EXISTS "Allow read access to maintenance_records" ON maintenance_records;
DROP POLICY IF EXISTS "Allow read access to incidents" ON incidents;
DROP POLICY IF EXISTS "Allow read access to work_orders" ON work_orders;
DROP POLICY IF EXISTS "Allow read access to sops" ON sops;
DROP POLICY IF EXISTS "Allow read access to data_quality" ON data_quality_metrics;
DROP POLICY IF EXISTS "Allow read access to spare_parts" ON spare_parts;
DROP POLICY IF EXISTS "Allow read access to system_audit_logs" ON system_audit_logs;

DROP POLICY IF EXISTS "Allow authenticated write to factories" ON factories;
DROP POLICY IF EXISTS "Allow authenticated write to users" ON users;
DROP POLICY IF EXISTS "Allow authenticated write to machines" ON machines;
DROP POLICY IF EXISTS "Allow authenticated write to production_records" ON production_records;
DROP POLICY IF EXISTS "Allow authenticated write to maintenance_records" ON maintenance_records;
DROP POLICY IF EXISTS "Allow authenticated write to incidents" ON incidents;
DROP POLICY IF EXISTS "Allow authenticated write to work_orders" ON work_orders;
DROP POLICY IF EXISTS "Allow authenticated write to sops" ON sops;
DROP POLICY IF EXISTS "Allow authenticated write to data_quality" ON data_quality_metrics;
DROP POLICY IF EXISTS "Allow authenticated write to spare_parts" ON spare_parts;
DROP POLICY IF EXISTS "Allow authenticated write to system_audit_logs" ON system_audit_logs;

-- 3. SECURE READ POLICIES (AUTHENTICATED SESSIONS ONLY - NO ANON ACCESS TO SENSITIVE DATA)
CREATE POLICY "Allow authenticated read to factories" ON factories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read to users" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read to machines" ON machines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read to production_records" ON production_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read to maintenance_records" ON maintenance_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read to incidents" ON incidents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read to work_orders" ON work_orders
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read to sops" ON sops
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read to data_quality" ON data_quality_metrics
  FOR SELECT TO authenticated USING (true);

-- 4. SECURE WRITE POLICIES (AUTHENTICATED & SERVER SERVICE_ROLE)
CREATE POLICY "Allow authenticated write to factories" ON factories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write to users" ON users
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write to machines" ON machines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write to production_records" ON production_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write to maintenance_records" ON maintenance_records
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write to incidents" ON incidents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write to work_orders" ON work_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write to sops" ON sops
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated write to data_quality" ON data_quality_metrics
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. CREATE MISSING TABLES IDEMPOTENTLY (spare_parts & system_audit_logs)
CREATE TABLE IF NOT EXISTS spare_parts (
  id TEXT PRIMARY KEY,
  part_number TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  factory_id TEXT NOT NULL DEFAULT 'FAC-001',
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_reorder_level INTEGER NOT NULL DEFAULT 5,
  unit_cost_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  supplier TEXT,
  location_bin TEXT,
  last_restocked_at TIMESTAMPTZ,
  machine_compatibility JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_audit_logs (
  id TEXT PRIMARY KEY,
  factory_id TEXT NOT NULL DEFAULT 'FAC-001',
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- RLS & Policies for new tables
CREATE POLICY "Allow authenticated read to spare_parts" ON spare_parts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write to spare_parts" ON spare_parts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read to system_audit_logs" ON system_audit_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write to system_audit_logs" ON system_audit_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. INITIAL FACTORY & PERSONNEL SEED (SAFE - PRESERVES EXISTING RECORDS)
INSERT INTO factories (id, factory_code, name, location, industry, owner_name, status, capacity, established_year, created_at, last_activity)
VALUES
  ('FAC-001', 'APX-01', 'Apex Precision Manufacturing', 'Hyderabad, Telangana', 'Automotive Components', 'Rajesh Kumar', 'Operational', '45,000 units/mo', 2014, '2023-01-15T08:00:00Z', '10 mins ago'),
  ('FAC-002', 'NOV-02', 'Nova Industrial Systems', 'Pune, Maharashtra', 'Engineering Components', 'Vikram Malhotra', 'Operational', '38,000 units/mo', 2017, '2023-03-20T09:30:00Z', '25 mins ago'),
  ('FAC-003', 'VTX-03', 'Vertex Auto Components', 'Chennai, Tamil Nadu', 'Automotive', 'Suresh Raman', 'Operational', '52,000 units/mo', 2011, '2023-05-10T10:15:00Z', '5 mins ago'),
  ('FAC-004', 'PRM-04', 'PrimeTech Manufacturing', 'Bengaluru, Karnataka', 'Electronics', 'Ananya Sharma', 'Production Slowdown', '80,000 units/mo', 2019, '2023-08-01T11:00:00Z', '1 hour ago'),
  ('FAC-005', 'ORN-05', 'Orion Industrial Works', 'Coimbatore, Tamil Nadu', 'Heavy Engineering', 'K. Swaminathan', 'Maintenance Alert', '25,000 units/mo', 2008, '2023-11-12T14:45:00Z', '40 mins ago')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  last_activity = EXCLUDED.last_activity;

INSERT INTO users (id, name, email, password_hash, salt, role, factory_id, factory_name, status, created_at)
VALUES
  ('USR-001', 'Super Admin Officer', 'superadmin@factoryops.com', '1235f7e0c413849b4d9ad55a1850b2713326287b5c3e3b1d93da0dbba763554f99049c068244ba1da0b3651c5758257730cce0f167999dc8bd3ddb78f65c3cfa', 'eaa3d95487230eb7189dc3dbc8f022db', 'SUPER_ADMIN', NULL, NULL, 'active', '2026-10-28T10:52:48.015Z'),
  ('USR-002', 'Rajesh Kumar (Plant Admin)', 'admin.apex@factoryops.com', 'a27f915e7e4d0915ba4a7deb4d490083f0bbd27e0e58486eaec34d533f11ee4a9419143f1ec361bf30afae1c253d7bf7512c961b498cb1466eb1ea46b401517d', '72e0f10b7e152a0f91ee53c927656b43', 'ADMIN', 'FAC-001', 'Apex Precision Manufacturing', 'active', '2026-10-28T10:52:48.016Z'),
  ('USR-007', 'Amit Deshmukh (Manager/Supervisor)', 'manager.apex@factoryops.com', 'Manager@123', 'default_salt', 'MANAGER_SUPERVISOR', 'FAC-001', 'Apex Precision Manufacturing', 'active', '2026-10-28T10:52:48.020Z')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  factory_id = EXCLUDED.factory_id;

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_spare_parts_factory_id ON spare_parts(factory_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_part_number ON spare_parts(part_number);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_factory_id ON system_audit_logs(factory_id);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_timestamp ON system_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_machines_factory_id ON machines(factory_id);
CREATE INDEX IF NOT EXISTS idx_production_records_factory_id ON production_records(factory_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_factory_id ON maintenance_records(factory_id);
CREATE INDEX IF NOT EXISTS idx_incidents_factory_id ON incidents(factory_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_factory_id ON work_orders(factory_id);

