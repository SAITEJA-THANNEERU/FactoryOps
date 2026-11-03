-- ======================================================================
-- FACTORYOPS ENTERPRISE: NOTIFICATIONS TABLE, RLS & REALTIME MIGRATION
-- Database Engine: Supabase Cloud PostgreSQL
-- Table: public.notifications
-- ======================================================================

-- 1. CREATE NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id text PRIMARY KEY,
    recipient_user_id text REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_role text NOT NULL,
    factory_id text REFERENCES public.factories(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    notification_type text NOT NULL,
    priority text NOT NULL DEFAULT 'MEDIUM',
    related_module text NOT NULL DEFAULT 'general',
    related_record_id text,
    target_path text NOT NULL DEFAULT '/',
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    meta text
);

-- 2. CREATE HIGH-PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_user_id ON public.notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON public.notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_factory_id ON public.notifications(factory_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. DROP PRIOR POLICIES IF RE-RUNNING
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;

-- Helper functions for claims/user lookup (if not already defined)
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

-- 5. RLS POLICIES (STRICT ROLE & USER ISOLATION)

-- SELECT POLICY:
-- Super Admin sees all.
-- Technicians see only items addressed to their specific user ID or broadcast to TECHNICIAN/ALL in their factory.
-- Other roles see items addressed to their user ID or broadcast to their role/ALL in their factory.
CREATE POLICY "notifications_select_policy" ON public.notifications
FOR SELECT
USING (
    get_current_user_role() = 'SUPER_ADMIN'
    OR
    (
      factory_id = get_current_user_factory_id()
      AND
      (
        (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid()::text)
        OR
        (recipient_user_id IS NULL AND recipient_role IN (get_current_user_role(), 'ALL'))
      )
    )
);

-- INSERT POLICY:
-- Authenticated users or server edge/backend functions can insert valid notifications.
-- Prevents technicians from broadcasting unauthorized administrative alerts.
CREATE POLICY "notifications_insert_policy" ON public.notifications
FOR INSERT
WITH CHECK (
    get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER_SUPERVISOR', 'PRODUCTION_PLANNER')
    OR
    (get_current_user_role() = 'TECHNICIAN' AND (recipient_role IN ('MANAGER_SUPERVISOR', 'ADMIN') OR recipient_user_id IS NOT NULL))
);

-- UPDATE POLICY:
-- Users can only mark as read notifications that are addressed to them or their role.
CREATE POLICY "notifications_update_policy" ON public.notifications
FOR UPDATE
USING (
    get_current_user_role() = 'SUPER_ADMIN'
    OR
    (
      factory_id = get_current_user_factory_id()
      AND
      (
        (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid()::text)
        OR
        (recipient_user_id IS NULL AND recipient_role IN (get_current_user_role(), 'ALL'))
      )
    )
);

-- DELETE POLICY:
-- Super Admins can clear any notification. Other users can clear only their own notifications.
CREATE POLICY "notifications_delete_policy" ON public.notifications
FOR DELETE
USING (
    get_current_user_role() = 'SUPER_ADMIN'
    OR
    (
      factory_id = get_current_user_factory_id()
      AND
      (
        (recipient_user_id IS NOT NULL AND recipient_user_id = auth.uid()::text)
        OR
        (recipient_user_id IS NULL AND recipient_role IN (get_current_user_role(), 'ALL'))
      )
    )
);

-- 6. ENABLE SUPABASE REALTIME FOR NOTIFICATIONS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Handle case if publication is managed at platform level
  NULL;
END $$;
