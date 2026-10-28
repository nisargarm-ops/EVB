-- ==============================================================================
-- BatteryPass 360 - Sample Seed Data
-- ==============================================================================

INSERT INTO battery_passports (
    battery_id, battery_did, serial_number, manufacturer_name, model_designation,
    chemistry, manufacturing_date, manufacturing_country, manufacturing_facility,
    status, current_custodian, current_vehicle_vin, technical_specs, carbon_footprint,
    recycled_content, health_state, qr_code_url, created_at, updated_at
) VALUES (
    'BAT-NMC-8A2F91C0',
    'did:battery:sha256:8a2f91c071d24e5a9c04b8a1c62f28148b3c9d74e1a0b5f8c3d9a7e2b1f4c6e8',
    'QV-2024-NMC-98124',
    'QuantumVolt Gigafactory',
    'QV-HighEnergy-90X',
    'NMC 811',
    '2024-01-15T09:00:00Z',
    'DE',
    'Berlin-Brandenburg Gigafactory',
    'IN_SERVICE',
    'Apex EV Mobility Fleet',
    'WAUZZZF28NA091244',
    '{"rated_capacity_kwh": 92.4, "nominal_voltage_v": 400.0, "max_charge_power_kw": 250.0, "cell_count": 192, "pack_weight_kg": 485.0}',
    '{"total_co2_kg_per_kwh": 62.5, "manufacturing_co2_kg": 28.0, "raw_materials_co2_kg": 29.5, "transport_co2_kg": 5.0, "eu_compliance_class": "Class A"}',
    '{"cobalt_percentage": 16.5, "lithium_percentage": 6.0, "nickel_percentage": 12.0, "lead_percentage": 0.0}',
    '{"state_of_health_pct": 88.4, "state_of_charge_pct": 72.0, "cycle_count": 420, "internal_resistance_mohm": 19.8, "capacity_fade_rate_pct_yr": 1.9, "last_telemetry_timestamp": "2026-10-25T14:30:00Z"}',
    '/api/v1/verify/BAT-NMC-8A2F91C0',
    NOW(),
    NOW()
) ON CONFLICT (battery_id) DO NOTHING;
