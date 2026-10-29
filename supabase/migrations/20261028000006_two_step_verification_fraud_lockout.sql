-- ============================================================================
-- BatteryPass 360 - Database Migration 006: Two-Step Verification & Anti-Fraud Lockout
-- Non-destructive, idempotent patch for live Supabase PostgreSQL instances
-- Enhancements:
--   1. Consecutive failed UID attempt tracking and lockout timestamp
--   2. Flagging batteries as "Suspicious — Verification Required"
--   3. Audit trail support for lockout and administrative reset actions
--   4. High-performance indexes for fraud monitoring
-- ============================================================================

-- 1. Add consecutive failure tracking and investigation flag to batteries table
ALTER TABLE public.batteries 
  ADD COLUMN IF NOT EXISTS consecutive_failed_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_flagged_for_investigation BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS investigation_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Index flagged batteries for instantaneous administrator / regulator queries
CREATE INDEX IF NOT EXISTS idx_batteries_investigation ON public.batteries(is_flagged_for_investigation, lockout_until);

-- 3. Update audit_logs check policy to permit two-step verification audit events
DROP POLICY IF EXISTS p_audit_logs_insert_verif ON public.audit_logs;
CREATE POLICY p_audit_logs_insert_verif ON public.audit_logs
    FOR INSERT WITH CHECK (
        action IN (
            'DUAL_ID_VERIFIED_SUCCESS',
            'DUAL_ID_VERIFIED_FRAUD_ALERT',
            'TAMPER_ALERT_REPORTED',
            'VERIFICATION_FAILED_ATTEMPT',
            'BATTERY_FLAGGED_SUSPICIOUS',
            'VERIFICATION_LOCKOUT_RESET'
        )
    );
