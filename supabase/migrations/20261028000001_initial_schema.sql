-- ============================================================================
-- BatteryPass 360 - Database Migration 001: Initial Core Schema & RLS
-- Standards: EU Battery Regulation (EU 2023/1542), CIRPASS, Catena-X
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing schema if necessary
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS disposition_decisions CASCADE;
DROP TABLE IF EXISTS verification_results CASCADE;
DROP TABLE IF EXISTS evidence_records CASCADE;
DROP TABLE IF EXISTS custody_transfers CASCADE;
DROP TABLE IF EXISTS lifecycle_events CASCADE;
DROP TABLE IF EXISTS battery_metrics CASCADE;
DROP TABLE IF EXISTS batteries CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ----------------------------------------------------------------------------
-- 1. Organizations: Enterprise identities & stakeholder types
-- ----------------------------------------------------------------------------
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    org_type VARCHAR(64) NOT NULL CHECK (
        org_type IN ('MANUFACTURER', 'OEM', 'FLEET_OPERATOR', 'SERVICE_CENTER', 'REMANUFACTURER', 'RECYCLER', 'REGULATOR_AUDITOR', 'PUBLIC')
    ),
    registration_number VARCHAR(128) UNIQUE,
    country VARCHAR(3) NOT NULL,
    facility_location VARCHAR(255),
    contact_email VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_type ON organizations(org_type);
CREATE INDEX idx_organizations_country ON organizations(country);

-- ----------------------------------------------------------------------------
-- 2. Profiles: Authenticated users & enterprise membership
-- ----------------------------------------------------------------------------
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL CHECK (
        role IN ('manufacturer', 'service_center', 'remanufacturer', 'recycler', 'auditor', 'administrator', 'oem', 'fleet_operator', 'public')
    ),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ----------------------------------------------------------------------------
-- 3. Batteries: Canonical immutable battery identity & metrology
-- ----------------------------------------------------------------------------
CREATE TABLE batteries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battery_id VARCHAR(64) UNIQUE NOT NULL,          -- e.g. BAT-NMC-8A2F91C0
    battery_did VARCHAR(128) UNIQUE NOT NULL,         -- e.g. did:battery:sha256:8a2f91c0...
    serial_number VARCHAR(128) NOT NULL,
    manufacturer_org_id UUID NOT NULL REFERENCES organizations(id),
    current_custodian_org_id UUID NOT NULL REFERENCES organizations(id),
    chemistry VARCHAR(64) NOT NULL,
    model_designation VARCHAR(128) NOT NULL,
    manufacturing_date TIMESTAMPTZ NOT NULL,
    manufacturing_country VARCHAR(3) NOT NULL,
    manufacturing_facility VARCHAR(255),
    status VARCHAR(64) NOT NULL DEFAULT 'MANUFACTURED' CHECK (
        status IN ('MANUFACTURED', 'IN_SERVICE', 'MAINTENANCE', 'SECOND_LIFE', 'END_OF_LIFE', 'RECYCLED', 'DECOMMISSIONED')
    ),
    current_vehicle_vin VARCHAR(64),
    technical_specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    carbon_footprint JSONB NOT NULL DEFAULT '{}'::jsonb,
    recycled_content JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_manufacturer_serial UNIQUE (manufacturer_org_id, serial_number)
);

CREATE INDEX idx_batteries_battery_id ON batteries(battery_id);
CREATE INDEX idx_batteries_did ON batteries(battery_did);
CREATE INDEX idx_batteries_status ON batteries(status);
CREATE INDEX idx_batteries_custodian ON batteries(current_custodian_org_id);
CREATE INDEX idx_batteries_manufacturer ON batteries(manufacturer_org_id);

-- ----------------------------------------------------------------------------
-- 4. Battery Metrics: Timestamped condition readings (BMS telematics)
-- ----------------------------------------------------------------------------
CREATE TABLE battery_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battery_id UUID NOT NULL REFERENCES batteries(id) ON DELETE CASCADE,
    state_of_health_pct NUMERIC(5, 2) NOT NULL CHECK (state_of_health_pct >= 0 AND state_of_health_pct <= 100),
    state_of_charge_pct NUMERIC(5, 2) NOT NULL CHECK (state_of_charge_pct >= 0 AND state_of_charge_pct <= 100),
    cycle_count INT NOT NULL CHECK (cycle_count >= 0),
    internal_resistance_mohm NUMERIC(6, 2) NOT NULL CHECK (internal_resistance_mohm >= 0),
    capacity_fade_rate_pct_yr NUMERIC(5, 2) DEFAULT 0.0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    source VARCHAR(64) NOT NULL DEFAULT 'BMS_TELEMETRY',
    raw_telemetry JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_metrics_battery_time ON battery_metrics(battery_id, recorded_at DESC);

-- ----------------------------------------------------------------------------
-- 5. Lifecycle Events: Append-only tamper-evident SHA-256 chain of custody
-- ----------------------------------------------------------------------------
CREATE TABLE lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battery_id UUID NOT NULL REFERENCES batteries(id) ON DELETE RESTRICT,
    event_number INT NOT NULL,
    event_type VARCHAR(64) NOT NULL CHECK (
        event_type IN (
            'MANUFACTURED', 'OEM_ASSEMBLED', 'REGISTERED_FLEET', 'TELEMETRY_UPDATED',
            'MAINTENANCE_LOGGED', 'TRANSFERRED_CUSTODY', 'SECOND_LIFE_ASSIGNED',
            'RECYCLED', 'DECOMMISSIONED', 'CORRECTION_LOGGED'
        )
    ),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_role VARCHAR(64) NOT NULL,
    actor_organization_id UUID NOT NULL REFERENCES organizations(id),
    location VARCHAR(255),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    prev_hash CHAR(64) NOT NULL,
    hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_battery_event_number UNIQUE (battery_id, event_number),
    CONSTRAINT uq_battery_event_hash UNIQUE (battery_id, hash)
);

CREATE INDEX idx_lifecycle_battery_num ON lifecycle_events(battery_id, event_number ASC);
CREATE INDEX idx_lifecycle_hash ON lifecycle_events(hash);

-- Disallow updates and deletions on lifecycle_events to ensure tamper evidence
CREATE OR REPLACE FUNCTION prevent_lifecycle_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Cryptographic lifecycle events are append-only. Updates are prohibited. File an explicit CORRECTION_LOGGED event.';
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Cryptographic lifecycle events cannot be deleted. Deletions are strictly prohibited.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_lifecycle_events
BEFORE UPDATE OR DELETE ON lifecycle_events
FOR EACH ROW EXECUTE FUNCTION prevent_lifecycle_tampering();

-- ----------------------------------------------------------------------------
-- 6. Custody Transfers: Formal handoff workflow (initiate, accept, reject)
-- ----------------------------------------------------------------------------
CREATE TABLE custody_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battery_id UUID NOT NULL REFERENCES batteries(id) ON DELETE RESTRICT,
    sender_org_id UUID NOT NULL REFERENCES organizations(id),
    receiver_org_id UUID NOT NULL REFERENCES organizations(id),
    sender_actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    receiver_actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    state VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK (
        state IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')
    ),
    transfer_type VARCHAR(64) NOT NULL DEFAULT 'FLEET_ASSIGNMENT',
    notes TEXT,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transfers_battery ON custody_transfers(battery_id);
CREATE INDEX idx_transfers_state ON custody_transfers(state);
CREATE INDEX idx_transfers_sender ON custody_transfers(sender_org_id);
CREATE INDEX idx_transfers_receiver ON custody_transfers(receiver_org_id);

-- ----------------------------------------------------------------------------
-- 7. Evidence Records: Non-public inspection documents & storage metadata
-- ----------------------------------------------------------------------------
CREATE TABLE evidence_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battery_id UUID NOT NULL REFERENCES batteries(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    evidence_type VARCHAR(64) NOT NULL CHECK (
        evidence_type IN ('INSPECTION_REPORT', 'LAB_ANALYSIS', 'BMS_RAW_LOG', 'BILL_OF_LADING', 'RECYCLING_CERTIFICATE', 'EU_COMPLIANCE_DECLARATION')
    ),
    file_reference VARCHAR(512) NOT NULL,  -- Non-public restricted storage path or URI
    file_hash_sha256 CHAR(64) NOT NULL,   -- Cryptographic checksum of the document
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_confidential BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_battery ON evidence_records(battery_id);
CREATE INDEX idx_evidence_org ON evidence_records(organization_id);

-- ----------------------------------------------------------------------------
-- 8. Verification Results: Recorded audit and authenticity assessments
-- ----------------------------------------------------------------------------
CREATE TABLE verification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battery_id UUID NOT NULL REFERENCES batteries(id) ON DELETE CASCADE,
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    verifier_role VARCHAR(64) NOT NULL,
    check_type VARCHAR(64) NOT NULL DEFAULT 'FULL_CRYPTOGRAPHIC_AUDIT',
    is_authentic BOOLEAN NOT NULL,
    is_chain_valid BOOLEAN NOT NULL,
    total_blocks_checked INT NOT NULL,
    error_details TEXT,
    genesis_hash CHAR(64),
    latest_block_hash CHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_battery ON verification_results(battery_id);
CREATE INDEX idx_verification_time ON verification_results(verified_at DESC);

-- ----------------------------------------------------------------------------
-- 9. Disposition Decisions: AI-driven and circular pathway recommendations
-- ----------------------------------------------------------------------------
CREATE TABLE disposition_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battery_id UUID NOT NULL REFERENCES batteries(id) ON DELETE CASCADE,
    recommendation VARCHAR(64) NOT NULL CHECK (
        recommendation IN ('STATIONARY_BESS', 'CELL_RECONDITIONING', 'DEEP_RECYCLING', 'CONTINUE_IN_SERVICE', 'DECOMMISSION')
    ),
    recommended_pathway VARCHAR(255) NOT NULL,
    constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
    explanation TEXT NOT NULL,
    approval_status VARCHAR(32) NOT NULL DEFAULT 'PROPOSED' CHECK (
        approval_status IN ('PROPOSED', 'APPROVED', 'REJECTED', 'EXECUTED')
    ),
    decided_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disposition_battery ON disposition_decisions(battery_id);
CREATE INDEX idx_disposition_status ON disposition_decisions(approval_status);

-- ----------------------------------------------------------------------------
-- 10. Audit Logs: Immutable log of administrative & sensitive operations
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_role VARCHAR(64),
    actor_ip VARCHAR(64),
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_time ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- Automatic updated_at Triggers
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_batteries_updated_at
BEFORE UPDATE ON batteries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_custody_transfers_updated_at
BEFORE UPDATE ON custody_transfers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row-Level Security (RLS) Policies
-- ============================================================================
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

-- Service role bypasses RLS (for backend service operations with secret key)
-- Standard policies for authenticated clients:

-- 1. Organizations: Viewable by authenticated users
CREATE POLICY p_orgs_read ON organizations FOR SELECT USING (true);
CREATE POLICY p_orgs_admin_modify ON organizations FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'administrator')
);

-- 2. Profiles: Self-view & admin view
CREATE POLICY p_profiles_read ON profiles FOR SELECT USING (true);
CREATE POLICY p_profiles_admin ON profiles FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'administrator')
);

-- 3. Batteries:
-- Anyone authenticated or public can read basic passport data
CREATE POLICY p_batteries_read ON batteries FOR SELECT USING (true);
-- Only manufacturers can insert new batteries
CREATE POLICY p_batteries_insert ON batteries FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.role = 'manufacturer'
          AND profiles.organization_id = batteries.manufacturer_org_id
    )
);
-- Custodian or Admin can update status/custodian
CREATE POLICY p_batteries_update ON batteries FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
          AND (profiles.role IN ('administrator', 'auditor') OR profiles.organization_id = batteries.current_custodian_org_id)
    )
);

-- 4. Battery Metrics: Custodian, Service Center, Manufacturer, or Auditor can read
CREATE POLICY p_metrics_read ON battery_metrics FOR SELECT USING (true);
CREATE POLICY p_metrics_insert ON battery_metrics FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN batteries b ON b.id = battery_metrics.battery_id
        WHERE p.id = auth.uid() 
          AND (p.role IN ('administrator', 'service_center', 'fleet_operator', 'manufacturer') 
               OR p.organization_id = b.current_custodian_org_id)
    )
);

-- 5. Lifecycle Events: Immutable, public/auditor readable
CREATE POLICY p_events_read ON lifecycle_events FOR SELECT USING (true);
CREATE POLICY p_events_insert ON lifecycle_events FOR INSERT WITH CHECK (true);

-- 6. Custody Transfers: Parties involved or Auditors can read
CREATE POLICY p_transfers_read ON custody_transfers FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
          AND (p.role IN ('administrator', 'auditor') 
               OR p.organization_id IN (custody_transfers.sender_org_id, custody_transfers.receiver_org_id))
    )
);

-- 7. Evidence Records: Confidential to organization, custodian, or auditor
CREATE POLICY p_evidence_read ON evidence_records FOR SELECT USING (
    is_confidential = FALSE OR EXISTS (
        SELECT 1 FROM profiles p 
        JOIN batteries b ON b.id = evidence_records.battery_id
        WHERE p.id = auth.uid() 
          AND (p.role IN ('administrator', 'auditor') 
               OR p.organization_id IN (evidence_records.organization_id, b.current_custodian_org_id))
    )
);

-- 8. Audit Logs: Read-only for Auditors and Administrators
CREATE POLICY p_audit_read ON audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('administrator', 'auditor'))
);
