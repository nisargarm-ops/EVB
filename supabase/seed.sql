-- ============================================================================
-- BatteryPass 360 - Demo Seed Data (CLEARLY MARKED AS DEMO)
-- Compliant with EU Battery Regulation (EU 2023/1542)
-- ============================================================================

-- 1. Demo Organizations
INSERT INTO organizations (id, name, org_type, registration_number, country, facility_location, contact_email, is_verified) VALUES
('11111111-1111-1111-1111-111111111111', 'QuantumVolt Gigafactory', 'MANUFACTURER', 'HRB-BER-2024-991', 'DE', 'Berlin-Brandenburg Gigafactory', 'compliance@quantumvolt.de', TRUE),
('22222222-2222-2222-2222-222222222222', 'Apex Motors AG', 'OEM', 'HRB-STU-2023-412', 'DE', 'Stuttgart Assembly Plant 1', 'passport@apexmotors.de', TRUE),
('33333333-3333-3333-3333-333333333333', 'Apex EV Mobility Fleet', 'FLEET_OPERATOR', 'HRB-BER-2024-884', 'DE', 'Berlin Fleet Hub', 'fleet-ops@apexfleet.de', TRUE),
('44444444-4444-4444-4444-444444444444', 'Berlin Battery Care', 'SERVICE_CENTER', 'HRB-BER-2022-310', 'DE', 'Berlin Service Depot', 'service@berlinbatterycare.de', TRUE),
('55555555-5555-5555-5555-555555555555', 'Nordic Remanufacturing Hub', 'REMANUFACTURER', 'ORG-SE-556102-194', 'SE', 'Gothenburg Reman Facility', 'circular@nordicreman.se', TRUE),
('66666666-6666-6666-6666-666666666666', 'EcoRecycle Metals Recovery', 'RECYCLER', 'RCS-DUN-2021-99', 'FR', 'Dunkirk Metallurgy Recovery', 'metallurgy@ecorecycle.fr', TRUE),
('77777777-7777-7777-7777-777777777777', 'EU Metrology Authority', 'REGULATOR_AUDITOR', 'EU-AUDIT-2023-REG', 'BE', 'Brussels Regulatory Office', 'battery-audit@metrology.europa.eu', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Demo Profiles
INSERT INTO profiles (id, organization_id, email, full_name, role, is_active) VALUES
('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'manufacturer@quantumvolt.de', 'Elena Rostova', 'manufacturer', TRUE),
('a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'oem-admin@apexmotors.de', 'Marcus Weber', 'oem', TRUE),
('a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'fleet-manager@apexfleet.de', 'Sophie Laurent', 'fleet_operator', TRUE),
('a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'service-lead@berlinbatterycare.de', 'Hans Becker', 'service_center', TRUE),
('a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'reman-eng@nordicreman.se', 'Lars Lindqvist', 'remanufacturer', TRUE),
('a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'recycler@ecorecycle.fr', 'Camille Dubois', 'recycler', TRUE),
('a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 'auditor@metrology.europa.eu', 'Dr. Aris Thorne', 'auditor', TRUE),
('a8888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 'admin@batterypass360.eu', 'System Administrator', 'administrator', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Demo Batteries
-- Battery 1: NMC 811 In-Service EV Battery Pack
INSERT INTO batteries (
    id, battery_id, battery_did, serial_number, manufacturer_org_id, current_custodian_org_id,
    chemistry, model_designation, manufacturing_date, manufacturing_country, manufacturing_facility,
    status, current_vehicle_vin, technical_specs, carbon_footprint, recycled_content, created_at, updated_at
) VALUES (
    'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'BAT-NMC-8A2F91C0',
    'did:battery:sha256:8a2f91c0e3a9c7b1a2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8',
    'QV-2024-NMC-98124',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'NMC 811',
    'QV-HighEnergy-90X',
    '2024-01-15 09:00:00+00',
    'DE',
    'Berlin-Brandenburg Gigafactory',
    'IN_SERVICE',
    'WAUZZZF28NA091244',
    '{"rated_capacity_kwh": 92.4, "nominal_voltage_v": 400.0, "max_charge_power_kw": 250.0, "cell_count": 192, "pack_weight_kg": 485.0}',
    '{"total_co2_kg_per_kwh": 62.5, "manufacturing_co2_kg": 28.0, "raw_materials_co2_kg": 29.5, "transport_co2_kg": 5.0, "eu_compliance_class": "Class A"}',
    '{"cobalt_percentage": 16.5, "lithium_percentage": 6.0, "nickel_percentage": 12.0, "lead_percentage": 0.0}',
    '2024-01-15 09:00:00+00',
    '2026-10-25 14:30:00+00'
),
-- Battery 2: LFP Second-Life BESS Battery Pack
(
    'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'BAT-LFP-3C7D410E',
    'did:battery:sha256:3c7d410eb7a9c8f2a1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7',
    'NBS-2023-LFP-44109',
    '11111111-1111-1111-1111-111111111111',
    '55555555-5555-5555-5555-555555555555',
    'LFP',
    'NBS-SafeCell-60',
    '2023-05-10 10:00:00+00',
    'SE',
    'Skelleftea Gigafactory',
    'SECOND_LIFE',
    NULL,
    '{"rated_capacity_kwh": 64.0, "nominal_voltage_v": 320.0, "max_charge_power_kw": 150.0, "cell_count": 100, "pack_weight_kg": 420.0}',
    '{"total_co2_kg_per_kwh": 51.2, "manufacturing_co2_kg": 22.0, "raw_materials_co2_kg": 24.2, "transport_co2_kg": 5.0, "eu_compliance_class": "Class A"}',
    '{"cobalt_percentage": 0.0, "lithium_percentage": 4.5, "nickel_percentage": 0.0, "lead_percentage": 0.0}',
    '2023-05-10 10:00:00+00',
    '2026-10-20 12:00:00+00'
),
-- Battery 3: NCA End-of-Life Pack for Recycling
(
    'b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'BAT-NCA-F104A7B2',
    'did:battery:sha256:f104a7b2c8e0d9a3b2c4e6f8a1b3c5d7e9f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8',
    'REC-2021-NCA-10042',
    '11111111-1111-1111-1111-111111111111',
    '66666666-6666-6666-6666-666666666666',
    'NCA',
    'REC-EVMax-85',
    '2021-08-20 08:00:00+00',
    'FR',
    'Dunkirk Gigafactory',
    'END_OF_LIFE',
    NULL,
    '{"rated_capacity_kwh": 85.0, "nominal_voltage_v": 380.0, "max_charge_power_kw": 200.0, "cell_count": 180, "pack_weight_kg": 460.0}',
    '{"total_co2_kg_per_kwh": 78.0, "manufacturing_co2_kg": 35.0, "raw_materials_co2_kg": 36.0, "transport_co2_kg": 7.0, "eu_compliance_class": "Class B"}',
    '{"cobalt_percentage": 22.0, "lithium_percentage": 8.0, "nickel_percentage": 18.0, "lead_percentage": 0.0}',
    '2021-08-20 08:00:00+00',
    '2026-10-18 16:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Demo Battery Metrics
INSERT INTO battery_metrics (
    battery_id, state_of_health_pct, state_of_charge_pct, cycle_count, internal_resistance_mohm, capacity_fade_rate_pct_yr, recorded_at, recorded_by, source
) VALUES
('b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 88.4, 72.0, 420, 19.8, 1.9, '2026-10-25 14:30:00+00', 'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BMS_TELEMETRY'),
('b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 76.8, 55.0, 1850, 26.4, 2.1, '2026-10-20 12:00:00+00', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BESS_DIAGNOSTIC'),
('b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 64.2, 20.0, 2480, 34.0, 3.2, '2026-10-18 16:00:00+00', 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RECYCLING_INGESTION');

-- 5. Demo Lifecycle Events (Linked SHA-256 Hashes)
INSERT INTO lifecycle_events (
    battery_id, event_number, event_type, timestamp, actor_id, actor_role, actor_organization_id, location, payload, prev_hash, hash
) VALUES
(
    'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    0,
    'MANUFACTURED',
    '2024-01-15 09:00:00+00',
    'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'MANUFACTURER',
    '11111111-1111-1111-1111-111111111111',
    'Berlin, Germany',
    '{"batch_id": "BATCH-2024-Q1-90", "quality_grade": "A+", "initial_soh": 100.0}',
    '0000000000000000000000000000000000000000000000000000000000000000',
    '6c054dcfe77d853b94a28c2e91a0f8eb2a1d3c5e7b9a1c3d5e7f9a1b3c5d7e9f'
),
(
    'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    1,
    'OEM_ASSEMBLED',
    '2024-02-10 11:20:00+00',
    'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'OEM',
    '22222222-2222-2222-2222-222222222222',
    'Stuttgart, Germany',
    '{"vehicle_vin": "WAUZZZF28NA091244", "model": "Apex GT Sedan", "inverter_kw": 250}',
    '6c054dcfe77d853b94a28c2e91a0f8eb2a1d3c5e7b9a1c3d5e7f9a1b3c5d7e9f',
    '8d165ed0f88e964c05b39d3f02b1a9fc3b2e4d6f8c0b2d4e6f8a2b4c6d8e0f1a'
),
(
    'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    2,
    'TELEMETRY_UPDATED',
    '2026-10-25 14:30:00+00',
    'a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'FLEET_OPERATOR',
    '33333333-3333-3333-3333-333333333333',
    'Berlin, Germany',
    '{"fleet_id": "FLEET-BER-88", "current_soh": 88.4, "odometer_km": 68500}',
    '8d165ed0f88e964c05b39d3f02b1a9fc3b2e4d6f8c0b2d4e6f8a2b4c6d8e0f1a',
    '9e276fe1a99f075d16c40e4a13c2b0ad4c3f5e7a9d1c3e5f7a9b3c5d7e9f1a2b'
);

-- 6. Demo Custody Transfers
INSERT INTO custody_transfers (
    id, battery_id, sender_org_id, receiver_org_id, sender_actor_id, receiver_actor_id, state, transfer_type, notes, initiated_at, responded_at
) VALUES (
    'c1111111-cccc-cccc-cccc-cccccccccccc',
    'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'ACCEPTED',
    'OEM_DELIVERY',
    'Initial gigafactory batch delivery for vehicle assembly',
    '2024-01-20 10:00:00+00',
    '2024-01-22 14:00:00+00'
);

-- 7. Demo Evidence Records
INSERT INTO evidence_records (
    id, battery_id, title, evidence_type, file_reference, file_hash_sha256, uploaded_by, organization_id, metadata, is_confidential
) VALUES (
    'e1111111-eeee-eeee-eeee-eeeeeeeeeeee',
    'b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Initial EU Conformity Assessment Test Report',
    'EU_COMPLIANCE_DECLARATION',
    'evidence/compliance/2024/QV-NMC-98124-CERT.pdf',
    '3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b',
    'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    '{"standard": "EU 2023/1542", "tested_by": "TUV Rheinland"}',
    FALSE
);

-- 8. Demo Disposition Decisions
INSERT INTO disposition_decisions (
    id, battery_id, recommendation, recommended_pathway, constraints, explanation, approval_status, decided_by, decided_at
) VALUES (
    'd1111111-dddd-dddd-dddd-dddddddddddd',
    'b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'STATIONARY_BESS',
    'Second-Life Grid Peak Shaving Container',
    '{"min_soh": 70.0, "max_temp_c": 45.0, "max_c_rate": 0.5}',
    'Degradation profile and remaining capacity (76.8% SoH, 1850 cycles) are optimal for stationary containerized grid energy storage.',
    'APPROVED',
    'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '2026-10-20 12:00:00+00'
);
