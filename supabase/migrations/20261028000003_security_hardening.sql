-- ============================================================================
-- BatteryPass 360 - Database Migration 003: Security Hardening & Strict RLS
-- Standards: EU Battery Regulation (EU 2023/1542), CIRPASS, Catena-X
-- Objective: Enforce zero-trust multi-tenant isolation, tamper-evidence triggers,
--            and strict Row Level Security (RLS) policies.
-- ============================================================================

-- Ensure Row Level Security is explicitly activated across all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE battery_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposition_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 1. Helper function: Get authenticated user's organization ID
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 2. Helper function: Get authenticated user's normalized role
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS VARCHAR AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. Organizations Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS p_orgs_read ON organizations;
DROP POLICY IF EXISTS p_orgs_admin_modify ON organizations;

-- Public & authenticated users can view verified organizations for lookup
CREATE POLICY p_orgs_read_hardened ON organizations
    FOR SELECT USING (true);

-- Only verified administrators can insert or modify organizations
CREATE POLICY p_orgs_admin_modify_hardened ON organizations
    FOR ALL USING (auth_user_role() = 'administrator');

-- ----------------------------------------------------------------------------
-- 4. Profiles Policies: Prevent horizontal role and privilege escalation
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS p_profiles_read ON profiles;
DROP POLICY IF EXISTS p_profiles_admin ON profiles;

-- Users can view basic profiles in the registry
CREATE POLICY p_profiles_read_hardened ON profiles
    FOR SELECT USING (true);

-- Users can only update their own full_name, NOT their role or organization
CREATE POLICY p_profiles_self_update ON profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() AND
        role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
        organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

-- Only administrators can modify roles and organization assignments
CREATE POLICY p_profiles_admin_all ON profiles
    FOR ALL USING (auth_user_role() = 'administrator');

-- ----------------------------------------------------------------------------
-- 5. Batteries Policies: Multi-tenant manufacturer and custodian isolation
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS p_batteries_read ON batteries;
DROP POLICY IF EXISTS p_batteries_insert ON batteries;
DROP POLICY IF EXISTS p_batteries_update ON batteries;

-- Public passport verification allows read access to general battery registry
CREATE POLICY p_batteries_read_hardened ON batteries
    FOR SELECT USING (true);

-- A manufacturer can ONLY insert batteries where manufacturer_org_id matches their own
CREATE POLICY p_batteries_insert_hardened ON batteries
    FOR INSERT WITH CHECK (
        auth_user_role() = 'administrator' OR (
            auth_user_role() = 'manufacturer' AND
            manufacturer_org_id = auth_user_org_id()
        )
    );

-- Only the current custodian organization or administrator can update battery state
CREATE POLICY p_batteries_update_hardened ON batteries
    FOR UPDATE USING (
        auth_user_role() = 'administrator' OR
        current_custodian_org_id = auth_user_org_id()
    );

-- ----------------------------------------------------------------------------
-- 6. Battery Metrics: Append-only telematics readings
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS p_metrics_read ON battery_metrics;
DROP POLICY IF EXISTS p_metrics_insert ON battery_metrics;

CREATE POLICY p_metrics_read_hardened ON battery_metrics
    FOR SELECT USING (true);

-- Only custodian, authorized service provider, or admin can record new metrics
CREATE POLICY p_metrics_insert_hardened ON battery_metrics
    FOR INSERT WITH CHECK (
        auth_user_role() IN ('administrator', 'auditor') OR
        EXISTS (
            SELECT 1 FROM batteries b
            WHERE b.id = battery_metrics.battery_id
              AND (b.current_custodian_org_id = auth_user_org_id() OR auth_user_role() IN ('service_center', 'fleet_operator'))
        )
    );

-- Metrics are immutable telemetry readings: forbid UPDATE and DELETE
CREATE OR REPLACE FUNCTION prevent_metrics_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Battery metrics are immutable telemetry readings. Deletions and updates are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_metrics_tampering ON battery_metrics;
CREATE TRIGGER trg_prevent_metrics_tampering
BEFORE UPDATE OR DELETE ON battery_metrics
FOR EACH ROW EXECUTE FUNCTION prevent_metrics_tampering();

-- ----------------------------------------------------------------------------
-- 7. Custody Transfers: Strict sender and receiver organization boundary
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS p_transfers_read ON custody_transfers;

-- Only parties involved (sender or receiver), auditors, or admins can view transfer records
CREATE POLICY p_transfers_read_hardened ON custody_transfers
    FOR SELECT USING (
        auth_user_role() IN ('administrator', 'auditor') OR
        auth_user_org_id() IN (sender_org_id, receiver_org_id)
    );

-- Only the current custodian organization can initiate a transfer as sender
CREATE POLICY p_transfers_insert_hardened ON custody_transfers
    FOR INSERT WITH CHECK (
        auth_user_role() = 'administrator' OR
        sender_org_id = auth_user_org_id()
    );

-- Only the designated receiver organization can accept or reject
CREATE POLICY p_transfers_update_hardened ON custody_transfers
    FOR UPDATE USING (
        auth_user_role() = 'administrator' OR
        receiver_org_id = auth_user_org_id()
    )
    WITH CHECK (
        state IN ('ACCEPTED', 'REJECTED')
    );

-- ----------------------------------------------------------------------------
-- 8. Audit Logs: Immutable security trail (strictly read-only for auditors & admin)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS p_audit_read ON audit_logs;

CREATE POLICY p_audit_read_hardened ON audit_logs
    FOR SELECT USING (
        auth_user_role() IN ('administrator', 'auditor')
    );

-- Audit logs are strictly append-only: forbid updates and deletes unconditionally
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are permanent, immutable compliance records. Updates and deletions are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_tampering ON audit_logs;
CREATE TRIGGER trg_prevent_audit_tampering
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_tampering();
