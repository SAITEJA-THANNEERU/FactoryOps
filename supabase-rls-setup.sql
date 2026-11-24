-- ======================================================================
-- FACTORYOPS ENTERPRISE: STRICT MULTI-ROLE ROW LEVEL SECURITY (RLS) POLICIES
-- Platform: FactoryOps Smart Factory Operations & Maintenance
-- ======================================================================
-- Security Model & Roles:
-- 1. SUPER_ADMIN: Platform-wide governance across all facilities.
-- 2. ADMIN / FACTORY_OWNER: Factory-level administration within assigned factory.
-- 3. MANAGER_SUPERVISOR / FACTORY_MANAGER / SUPERVISOR: Production floor coordination,
--    technician dispatch, and maintenance sign-off.
-- 4. PRODUCTION_PLANNER / ANALYST: Output scheduling and machine capacity analysis.
-- 5. TECHNICIAN / OPERATOR: Assigned machine maintenance, repair diagnostics, and personal attendance.
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
ALTER TABLE IF EXISTS attendance_records ENABLE ROW LEVEL SECURITY;

-- 2. DROP OBSOLETE & PERMISSIVE POLICIES
DROP POLICY IF EXISTS "Public full access to factories" ON factories;
DROP POLICY IF EXISTS "Public full access to users" ON users;
DROP POLICY IF EXISTS "Public full access to machines" ON machines;
DROP POLICY IF EXISTS "Public full access to production" ON production_records;
DROP POLICY IF EXISTS "Public full access to maintenance" ON maintenance_records;
DROP POLICY IF EXISTS "Public full access to incidents" ON incidents;
DROP POLICY IF EXISTS "Public full access to work_orders" ON work_orders;
DROP POLICY IF EXISTS "Public full access to sops" ON sops;
DROP POLICY IF EXISTS "Public full access to data_quality" ON data_quality_metrics;

DROP POLICY IF EXISTS "Allow authenticated read to factories" ON factories;
DROP POLICY IF EXISTS "Allow authenticated read to users" ON users;
DROP POLICY IF EXISTS "Allow authenticated read to machines" ON machines;
DROP POLICY IF EXISTS "Allow authenticated read to production_records" ON production_records;
DROP POLICY IF EXISTS "Allow authenticated read to maintenance_records" ON maintenance_records;
DROP POLICY IF EXISTS "Allow authenticated read to incidents" ON incidents;
DROP POLICY IF EXISTS "Allow authenticated read to work_orders" ON work_orders;
DROP POLICY IF EXISTS "Allow authenticated read to sops" ON sops;
DROP POLICY IF EXISTS "Allow authenticated read to data_quality" ON data_quality_metrics;
DROP POLICY IF EXISTS "Allow authenticated read to spare_parts" ON spare_parts;
DROP POLICY IF EXISTS "Allow authenticated read to system_audit_logs" ON system_audit_logs;

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

-- Drop prior specific policies if re-running migration
DROP POLICY IF EXISTS "factories_select_policy" ON factories;
DROP POLICY IF EXISTS "factories_admin_policy" ON factories;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_admin_write_policy" ON users;
DROP POLICY IF EXISTS "machines_select_policy" ON machines;
DROP POLICY IF EXISTS "machines_manage_policy" ON machines;
DROP POLICY IF EXISTS "machines_delete_policy" ON machines;
DROP POLICY IF EXISTS "production_select_policy" ON production_records;
DROP POLICY IF EXISTS "production_write_policy" ON production_records;
DROP POLICY IF EXISTS "production_delete_policy" ON production_records;
DROP POLICY IF EXISTS "maintenance_select_policy" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_write_policy" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_delete_policy" ON maintenance_records;
DROP POLICY IF EXISTS "incidents_select_policy" ON incidents;
DROP POLICY IF EXISTS "incidents_insert_policy" ON incidents;
DROP POLICY IF EXISTS "incidents_update_policy" ON incidents;
DROP POLICY IF EXISTS "incidents_delete_policy" ON incidents;
DROP POLICY IF EXISTS "work_orders_select_policy" ON work_orders;
DROP POLICY IF EXISTS "work_orders_insert_policy" ON work_orders;
DROP POLICY IF EXISTS "work_orders_update_policy" ON work_orders;
DROP POLICY IF EXISTS "work_orders_delete_policy" ON work_orders;
DROP POLICY IF EXISTS "spare_parts_select_policy" ON spare_parts;
DROP POLICY IF EXISTS "spare_parts_write_policy" ON spare_parts;
DROP POLICY IF EXISTS "spare_parts_delete_policy" ON spare_parts;
DROP POLICY IF EXISTS "attendance_select_policy" ON attendance_records;
DROP POLICY IF EXISTS "attendance_insert_policy" ON attendance_records;
DROP POLICY IF EXISTS "attendance_update_policy" ON attendance_records;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON system_audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON system_audit_logs;

-- 3. HELPER FUNCTIONS FOR USER IDENTITY, ROLE, AND FACTORY MAPPING
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'user_role',
    (SELECT role FROM public.users WHERE id = auth.uid()::text LIMIT 1),
    'TECHNICIAN'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_factory_id()
RETURNS text AS $$
  SELECT coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'factory_id',
    (SELECT factory_id FROM public.users WHERE id = auth.uid()::text LIMIT 1),
    'FAC-001'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. FACTORIES POLICIES
-- Super Admin sees all; other roles only see their own assigned factory
CREATE POLICY "factories_select_policy" ON factories
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'SUPER_ADMIN' OR
    id = get_current_user_factory_id()
  );

CREATE POLICY "factories_admin_policy" ON factories
  FOR ALL TO authenticated
  USING (get_current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (get_current_user_role() = 'SUPER_ADMIN');

-- 5. USERS TABLE POLICIES
-- Super Admin sees all; Admins & Managers see factory roster; Technicians & Planners only see own profile
CREATE POLICY "users_select_policy" ON users
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'SUPER_ADMIN' OR
    (get_current_user_role() IN ('ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR') AND factory_id = get_current_user_factory_id()) OR
    id = auth.uid()::text
  );

-- Only Super Admin and Factory Admin can create or update users
CREATE POLICY "users_admin_write_policy" ON users
  FOR ALL TO authenticated
  USING (
    get_current_user_role() = 'SUPER_ADMIN' OR
    (get_current_user_role() IN ('ADMIN', 'FACTORY_OWNER') AND factory_id = get_current_user_factory_id())
  )
  WITH CHECK (
    get_current_user_role() = 'SUPER_ADMIN' OR
    (get_current_user_role() IN ('ADMIN', 'FACTORY_OWNER') AND factory_id = get_current_user_factory_id())
  );

-- 6. MACHINES TABLE POLICIES
-- Read: Anyone in assigned factory or Super Admin
CREATE POLICY "machines_select_policy" ON machines
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'SUPER_ADMIN' OR
    factory_id = get_current_user_factory_id()
  );

-- Insert/Update: Admin, Manager, and Technician status updates
CREATE POLICY "machines_manage_policy" ON machines
  FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR')
  );

CREATE POLICY "machines_update_policy" ON machines
  FOR UPDATE TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'OPERATOR')
  );

-- Delete: Strictly Admin and Super Admin
CREATE POLICY "machines_delete_policy" ON machines
  FOR DELETE TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER')
  );

-- 7. PRODUCTION RECORDS POLICIES
-- Technicians have no access to production schedules; Planners, Managers, Admins have access
CREATE POLICY "production_select_policy" ON production_records
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR', 'PRODUCTION_PLANNER', 'ANALYST')
  );

CREATE POLICY "production_write_policy" ON production_records
  FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR', 'PRODUCTION_PLANNER', 'ANALYST')
  );

CREATE POLICY "production_delete_policy" ON production_records
  FOR DELETE TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER')
  );

-- 8. MAINTENANCE RECORDS POLICIES
-- Technicians only see their own tasks or factory maintenance; Planners restricted
CREATE POLICY "maintenance_select_policy" ON maintenance_records
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR') OR
    (get_current_user_role() IN ('TECHNICIAN', 'OPERATOR') AND (technician_id = auth.uid()::text OR factory_id = get_current_user_factory_id()))
  );

CREATE POLICY "maintenance_write_policy" ON maintenance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'OPERATOR')
  );

CREATE POLICY "maintenance_delete_policy" ON maintenance_records
  FOR DELETE TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER')
  );

-- 9. INCIDENTS POLICIES
CREATE POLICY "incidents_select_policy" ON incidents
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'SUPER_ADMIN' OR
    factory_id = get_current_user_factory_id()
  );

CREATE POLICY "incidents_insert_policy" ON incidents
  FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'OPERATOR')
  );

CREATE POLICY "incidents_update_policy" ON incidents
  FOR UPDATE TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'OPERATOR')
  );

CREATE POLICY "incidents_delete_policy" ON incidents
  FOR DELETE TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER')
  );

-- 10. WORK ORDERS POLICIES
-- Technicians only see work orders assigned to them or unassigned in their factory; Planners view only
CREATE POLICY "work_orders_select_policy" ON work_orders
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR', 'PRODUCTION_PLANNER', 'ANALYST') OR
    (get_current_user_role() IN ('TECHNICIAN', 'OPERATOR') AND (
      technician_id = auth.uid()::text OR
      assigned_to ILIKE '%' || (SELECT name FROM public.users WHERE id = auth.uid()::text LIMIT 1) || '%' OR
      status = 'Pending'
    ))
  );

-- Creation restricted to Managers, Admins, Super Admin (Technicians and Planners cannot create work orders)
CREATE POLICY "work_orders_insert_policy" ON work_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR')
  );

CREATE POLICY "work_orders_update_policy" ON work_orders
  FOR UPDATE TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR') OR
    (get_current_user_role() IN ('TECHNICIAN', 'OPERATOR') AND (
      technician_id = auth.uid()::text OR
      assigned_to ILIKE '%' || (SELECT name FROM public.users WHERE id = auth.uid()::text LIMIT 1) || '%'
    ))
  );

CREATE POLICY "work_orders_delete_policy" ON work_orders
  FOR DELETE TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR')
  );

-- 11. SPARE PARTS POLICIES
CREATE POLICY "spare_parts_select_policy" ON spare_parts
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'SUPER_ADMIN' OR
    factory_id = get_current_user_factory_id()
  );

CREATE POLICY "spare_parts_write_policy" ON spare_parts
  FOR ALL TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'OPERATOR')
  )
  WITH CHECK (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR', 'TECHNICIAN', 'OPERATOR')
  );

CREATE POLICY "spare_parts_delete_policy" ON spare_parts
  FOR DELETE TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR')
  );

-- 12. ATTENDANCE RECORDS POLICIES
-- Technicians and Planners can only select their own attendance; Managers and Admins see team records
CREATE POLICY "attendance_select_policy" ON attendance_records
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR') OR
    user_id = auth.uid()::text
  );

CREATE POLICY "attendance_insert_policy" ON attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text OR
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER')
  );

CREATE POLICY "attendance_update_policy" ON attendance_records
  FOR UPDATE TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER')
  );

-- 13. SYSTEM AUDIT LOGS POLICIES
-- Read: Managers, Admins, Super Admin only
CREATE POLICY "audit_logs_select_policy" ON system_audit_logs
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER', 'MANAGER_SUPERVISOR', 'FACTORY_MANAGER', 'SUPERVISOR')
  );

-- Insert: Permitted via audit logging helper / service_role
CREATE POLICY "audit_logs_insert_policy" ON system_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- IMMUTABLE AUDIT TRAIL: UPDATE AND DELETE ARE PERMANENTLY FORBIDDEN TO ALL USERS
-- (No UPDATE or DELETE policy is defined, ensuring Postgres blocks mutation)

-- 14. SOPS & DATA QUALITY
CREATE POLICY "sops_select_policy" ON sops
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "data_quality_select_policy" ON data_quality_metrics
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER')
  );

-- 15. ROLE-BASED NOTIFICATIONS POLICIES
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- Read Policy: Strict Recipient and Role Isolation
CREATE POLICY "notifications_select_policy" ON notifications
  FOR SELECT TO authenticated
  USING (
    get_current_user_role() = 'SUPER_ADMIN' OR (
      (factory_id = get_current_user_factory_id() OR factory_id IS NULL) AND (
        (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid()::text) OR
        (recipient_user_id IS NULL AND recipient_role IN (get_current_user_role(), 'ALL'))
      )
    )
  );

-- Insert Policy: Authorized operational actors or background processes
CREATE POLICY "notifications_insert_policy" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Update Policy: Users can only mark their own authorized notifications as read
CREATE POLICY "notifications_update_policy" ON notifications
  FOR UPDATE TO authenticated
  USING (
    get_current_user_role() = 'SUPER_ADMIN' OR (
      (factory_id = get_current_user_factory_id() OR factory_id IS NULL) AND (
        (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid()::text) OR
        (recipient_user_id IS NULL AND recipient_role IN (get_current_user_role(), 'ALL'))
      )
    )
  );

-- Delete Policy: Users can only clear their own notifications; Admins can clear factory alerts
CREATE POLICY "notifications_delete_policy" ON notifications
  FOR DELETE TO authenticated
  USING (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'FACTORY_OWNER') OR
    (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid()::text)
  );

