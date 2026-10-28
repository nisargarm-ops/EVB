-- ============================================================================
-- BatteryPass 360 - Database Migration 002: QpiAI Execution Records
-- ============================================================================

CREATE TABLE IF NOT EXISTS qpiai_execution_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engine_type VARCHAR(32) NOT NULL CHECK (engine_type IN ('QPIAI_OPT', 'QPIAI_QUANTUM')),
    battery_id VARCHAR(64) REFERENCES batteries(battery_id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('SUCCESS', 'SUBMITTED', 'NOT_CONFIGURED', 'AUTH_REQUIRED', 'ERROR', 'FAILED')),
    backend VARCHAR(64) NOT NULL,
    job_id VARCHAR(128),
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
    results JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    execution_time_seconds NUMERIC(10, 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qpiai_engine_time ON qpiai_execution_records(engine_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qpiai_battery ON qpiai_execution_records(battery_id);
CREATE INDEX IF NOT EXISTS idx_qpiai_user ON qpiai_execution_records(user_id);

ALTER TABLE qpiai_execution_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_qpiai_read ON qpiai_execution_records FOR SELECT USING (true);
CREATE POLICY p_qpiai_insert ON qpiai_execution_records FOR INSERT WITH CHECK (true);
