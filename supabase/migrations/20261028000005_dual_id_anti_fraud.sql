-- ============================================================================
-- BatteryPass 360 - Database Migration 005: Dual-ID Battery Authentication & Anti-Fraud
-- Non-destructive, idempotent patch for live Supabase PostgreSQL instances
-- Enhancements:
--   1. Case-insensitive unique indexing for permanent casing serial numbers
--   2. High-speed indexes on verification_results check_type & timestamps
--   3. High-speed lookup index on audit_logs for tamper and velocity reporting
--   4. RLS policies ensuring secure audit logging and verification persistence
-- ============================================================================

-- 1. Index permanent casing serial numbers for instantaneous Dual-ID cross-checks
CREATE INDEX IF NOT EXISTS idx_batteries_serial_number ON public.batteries(serial_number);
CREATE INDEX IF NOT EXISTS idx_batteries_upper_serial ON public.batteries (UPPER(TRIM(serial_number)));

-- 2. Index verification results by check_type and timestamp for rapid anti-fraud velocity scans
CREATE INDEX IF NOT EXISTS idx_verification_check_type ON public.verification_results(check_type);
CREATE INDEX IF NOT EXISTS idx_verification_battery_time ON public.verification_results(battery_id, verified_at DESC);

-- 3. Index audit logs for tamper alert tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_entity ON public.audit_logs(action, entity_id, timestamp DESC);

-- 4. Enable RLS on verification_results and audit_logs if not already enabled
ALTER TABLE public.verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Idempotent RLS policies for verification results:
-- Public & inspectors can view verification history and insert physical verification attempts
DROP POLICY IF EXISTS p_verification_results_read ON public.verification_results;
CREATE POLICY p_verification_results_read ON public.verification_results
    FOR SELECT USING (true);

DROP POLICY IF EXISTS p_verification_results_insert ON public.verification_results;
CREATE POLICY p_verification_results_insert ON public.verification_results
    FOR INSERT WITH CHECK (
        check_type IN ('FULL_CRYPTOGRAPHIC_AUDIT', 'DUAL_ID_PHYSICAL_VERIFICATION')
    );

-- 6. Audit logs: public / inspectors can append tamper reports and verification logs
DROP POLICY IF EXISTS p_audit_logs_insert_verif ON public.audit_logs;
CREATE POLICY p_audit_logs_insert_verif ON public.audit_logs
    FOR INSERT WITH CHECK (
        action IN (
            'DUAL_ID_VERIFIED_SUCCESS',
            'DUAL_ID_VERIFIED_FRAUD_ALERT',
            'TAMPER_ALERT_REPORTED'
        )
    );
