-- ============================================================================
-- BatteryPass 360 - Database Migration 004: Production RLS & QpiAI Patch
-- Non-destructive, idempotent patch for live Supabase PostgreSQL instances
-- Resolves:
--   1. `42P17: infinite recursion detected in policy for relation "profiles"`
--   2. Overly permissive `p_events_insert WITH CHECK (true)` on lifecycle_events
--   3. Missing `qpiai_execution_records` table with authenticated RLS
--   4. Missing append-only triggers on `battery_metrics` and `audit_logs`
-- ============================================================================

-- 1. SECURITY DEFINER helper functions (bypass RLS recursion on `profiles`)
CREATE OR REPLACE FUNCTION public.auth_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT LOWER(role) FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Fix `profiles` RLS infinite recursion
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_profiles_read ON public.profiles;
DROP POLICY IF EXISTS p_profiles_admin ON public.profiles;
DROP POLICY IF EXISTS p_profiles_read_hardened ON public.profiles;
DROP POLICY IF EXISTS p_profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS p_profiles_admin_all ON public.profiles;

CREATE POLICY p_profiles_read_hardened ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated' OR public.auth_user_role() IN ('administrator', 'auditor'));

CREATE POLICY p_profiles_self_update ON public.profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND LOWER(role) = public.auth_user_role()
        AND organization_id IS NOT DISTINCT FROM public.auth_user_org_id()
    );

CREATE POLICY p_profiles_admin_all ON public.profiles
    FOR ALL USING (public.auth_user_role() = 'administrator');

-- 3. Harden `lifecycle_events` INSERT policy (disallow anonymous direct writes)
ALTER TABLE public.lifecycle_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_events_insert ON public.lifecycle_events;
DROP POLICY IF EXISTS p_events_insert_hardened ON public.lifecycle_events;

CREATE POLICY p_events_insert_hardened ON public.lifecycle_events
    FOR INSERT WITH CHECK (
        public.auth_user_role() IN ('administrator', 'auditor')
        OR EXISTS (
            SELECT 1 FROM public.batteries b
            WHERE b.id = lifecycle_events.battery_id
              AND b.current_custodian_org_id = public.auth_user_org_id()
        )
    );

-- 4. Create `qpiai_execution_records` with expanded truthful statuses & strict RLS
CREATE TABLE IF NOT EXISTS public.qpiai_execution_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engine_type VARCHAR(32) NOT NULL CHECK (engine_type IN ('QPIAI_OPT', 'QPIAI_QUANTUM')),
    battery_id VARCHAR(64) REFERENCES public.batteries(battery_id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL CHECK (
        status IN (
            'SUCCESS',
            'SUBMITTED',
            'SIMULATION_COMPLETED',
            'LOCAL_SOLVED',
            'QUOTA_EXCEEDED',
            'SUBSCRIPTION_REQUIRED',
            'RATE_LIMITED',
            'NOT_CONFIGURED',
            'AUTH_REQUIRED',
            'ERROR',
            'FAILED'
        )
    ),
    backend VARCHAR(64) NOT NULL,
    job_id VARCHAR(128),
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    results JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    execution_time_seconds NUMERIC(10, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qpiai_engine_time ON public.qpiai_execution_records(engine_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qpiai_battery ON public.qpiai_execution_records(battery_id);
CREATE INDEX IF NOT EXISTS idx_qpiai_user ON public.qpiai_execution_records(user_id);

ALTER TABLE public.qpiai_execution_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_qpiai_read ON public.qpiai_execution_records;
DROP POLICY IF EXISTS p_qpiai_insert ON public.qpiai_execution_records;
DROP POLICY IF EXISTS p_qpiai_read_org ON public.qpiai_execution_records;

CREATE POLICY p_qpiai_read_org ON public.qpiai_execution_records
    FOR SELECT USING (
        public.auth_user_role() IN ('administrator', 'auditor')
        OR organization_id = public.auth_user_org_id()
        OR user_id = auth.uid()
    );

-- 5. Append-only immutability triggers for `battery_metrics` and `audit_logs`
CREATE OR REPLACE FUNCTION public.prevent_metrics_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Battery metrics are immutable telemetry readings. Deletions and updates are strictly prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_metrics_tampering ON public.battery_metrics;
CREATE TRIGGER trg_prevent_metrics_tampering
BEFORE UPDATE OR DELETE ON public.battery_metrics
FOR EACH ROW EXECUTE FUNCTION public.prevent_metrics_tampering();

CREATE OR REPLACE FUNCTION public.prevent_audit_log_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are permanent, immutable compliance records. Updates and deletions are forbidden.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_tampering ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_tampering
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_tampering();
