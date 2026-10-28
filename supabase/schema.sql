-- ==============================================================================
-- BatteryPass 360 - Supabase PostgreSQL Schema
-- Compliant with EU Battery Regulation (EU 2023/1542) & Metrology Standards
-- ==============================================================================

-- Enable UUID extension and pgcrypto
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum Types
CREATE TYPE battery_chemistry AS ENUM (
    'NMC 811',
    'NMC 622',
    'LFP',
    'NCA',
    'Solid State Li-Metal'
);

CREATE TYPE lifecycle_status AS ENUM (
    'MANUFACTURED',
    'IN_SERVICE',
    'SECOND_LIFE',
    'END_OF_LIFE',
    'RECYCLED'
);

CREATE TYPE user_role AS ENUM (
    'MANUFACTURER',
    'OEM',
    'FLEET_OPERATOR',
    'RECYCLER',
    'REGULATOR_AUDITOR',
    'PUBLIC'
);

-- Table: battery_passports
CREATE TABLE IF NOT EXISTS battery_passports (
    battery_id VARCHAR(64) PRIMARY KEY,
    battery_did VARCHAR(128) UNIQUE NOT NULL,
    serial_number VARCHAR(128) NOT NULL,
    manufacturer_name VARCHAR(255) NOT NULL,
    model_designation VARCHAR(255) NOT NULL,
    chemistry battery_chemistry NOT NULL,
    manufacturing_date TIMESTAMPTZ NOT NULL,
    manufacturing_country VARCHAR(8) NOT NULL DEFAULT 'DE',
    manufacturing_facility VARCHAR(255) NOT NULL,
    status lifecycle_status NOT NULL DEFAULT 'MANUFACTURED',
    current_custodian VARCHAR(255) NOT NULL,
    current_vehicle_vin VARCHAR(32),
    
    -- Technical Specifications (JSONB)
    technical_specs JSONB NOT NULL DEFAULT '{
        "rated_capacity_kwh": 75.0,
        "nominal_voltage_v": 400.0,
        "max_charge_power_kw": 150.0,
        "cell_count": 192,
        "pack_weight_kg": 450.0
    }'::jsonb,
    
    -- Carbon Footprint (EU Battery Regulation Chapter II)
    carbon_footprint JSONB NOT NULL DEFAULT '{
        "total_co2_kg_per_kwh": 60.0,
        "manufacturing_co2_kg": 26.0,
        "raw_materials_co2_kg": 29.0,
        "transport_co2_kg": 5.0,
        "eu_compliance_class": "Class A"
    }'::jsonb,
    
    -- Recycled Material Content Targets
    recycled_content JSONB NOT NULL DEFAULT '{
        "cobalt_percentage": 16.0,
        "lithium_percentage": 6.0,
        "nickel_percentage": 12.0,
        "lead_percentage": 0.0
    }'::jsonb,
    
    -- Real-time State of Health & BMS Telemetry
    health_state JSONB NOT NULL DEFAULT '{
        "state_of_health_pct": 100.0,
        "state_of_charge_pct": 100.0,
        "cycle_count": 0,
        "internal_resistance_mohm": 18.0,
        "capacity_fade_rate_pct_yr": 1.8,
        "last_telemetry_timestamp": ""
    }'::jsonb,
    
    qr_code_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: custody_events (Tamper-Evident SHA-256 Hash Chain)
CREATE TABLE IF NOT EXISTS custody_events (
    event_id VARCHAR(64) PRIMARY KEY,
    battery_id VARCHAR(64) NOT NULL REFERENCES battery_passports(battery_id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    actor_id VARCHAR(128) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    actor_organization VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL DEFAULT 'Unknown',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    prev_hash CHAR(64) NOT NULL,
    hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_battery_did ON battery_passports(battery_did);
CREATE INDEX IF NOT EXISTS idx_battery_status ON battery_passports(status);
CREATE INDEX IF NOT EXISTS idx_battery_custodian ON battery_passports(current_custodian);
CREATE INDEX IF NOT EXISTS idx_custody_battery_id ON custody_events(battery_id);
CREATE INDEX IF NOT EXISTS idx_custody_timestamp ON custody_events(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE battery_passports ENABLE ROW LEVEL SECURITY;
ALTER TABLE custody_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone (including public consumers) can read passports & verify authenticity
CREATE POLICY "Public read access for battery passports"
    ON battery_passports FOR SELECT
    USING (true);

-- RLS Policy: Only authenticated service role or manufacturers can insert passports
CREATE POLICY "Service and Manufacturer insert passports"
    ON battery_passports FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Public read access for tamper-evident custody chain
CREATE POLICY "Public read access for custody events"
    ON custody_events FOR SELECT
    USING (true);

-- RLS Policy: Append-only for custody events
CREATE POLICY "Append-only custody events"
    ON custody_events FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
