# BatteryPass 360 - Architecture Design Document

BatteryPass 360 is an enterprise-grade digital product passport platform for Electric Vehicle (EV) batteries, engineered to meet the regulatory requirements of **EU Regulation 2023/1542** and circular economy standards.

---

## 1. High-Level Architecture

The system is separated into two clean services:
1. **Frontend Service**: React 18, TypeScript, and Vite providing an intuitive, glassmorphic UI for fleet managers, auditors, recyclers, and public citizens.
2. **Backend Service**: Python 3.12 and FastAPI providing high-performance REST APIs, cryptographic hash chaining engines, and native Python SDK bindings to the **QpiAI Opt** solver and **QpiAI Quantum** SDK.

```
+---------------------------------------------------------------------------------+
|                                Frontend (React + Vite)                          |
|  - Fleet Dashboard  - Passport Detail & SoH  - QR Scanner  - QpiAI Studio      |
+---------------------------------------+-----------------------------------------+
                                        |  REST API / JSON
                                        v
+---------------------------------------------------------------------------------+
|                                Backend (FastAPI)                                |
|  - /api/v1/passports   : Immutable EU Battery Passports                         |
|  - /api/v1/custody     : Cryptographic Event Ledger                             |
|  - /api/v1/verify      : Public QR Verification & Tamper Detection              |
|  - /api/v1/auth        : Role-Based Access Control (RBAC)                       |
|  - /api/v1/qpiai/opt   : QpiAI-Opt Cloud QUBO Allocation Solver                 |
|  - /api/v1/qpiai/quantum: QpiAI Quantum SDK / QCloud Molecular Degradation       |
+--------------------+------------------------------------+-----------------------+
                     |                                    |
                     v                                    v
+------------------------------------+   +----------------------------------------+
|      Persistence Layer             |   |        External QpiAI Cloud APIs       |
| - Supabase PostgreSQL + RLS        |   | - QpiAI-Opt Cloud QUBO Solver API      |
| - Local Thread-Safe Fallback Repo  |   | - QpiAI QCloud (Indus QPU / Simulator) |
+------------------------------------+   +----------------------------------------+
```

---

## 2. Immutable Battery Identity (DID)

Every battery passport is minted with two identifiers:
1. **Human-Readable ID**: e.g., `BAT-NMC-8A2F91C0` (Battery-Chemistry-ShortDigest) for daily operational recognition and physical labeling.
2. **Decentralized Identifier (DID)**: `did:battery:sha256:<64-character-hex-digest>`

### Mathematical Formulation
$$	ext{digest} = 	ext{SHA256}(	ext{Manufacturer} \parallel 	ext{SerialNumber} \parallel 	ext{Chemistry} \parallel 	ext{ManufactureDate})$$

Because this digest is computed deterministically from immutable physical attributes, it cannot be forged or duplicated.

---

## 3. Tamper-Evident SHA-256 Audit Chain

The chain of custody operates identically to a lightweight, zero-overhead permissioned ledger:
- **Block 0 (Genesis)**: Minted at cell manufacturing. Has `prev_hash = 0000000000000000000000000000000000000000000000000000000000000000` (64 zeros).
- **Block $n$**: Computes its cryptographic hash by binding the previous block's hash with its own content:

$$	ext{hash}_n = 	ext{SHA256}(	ext{prev\_hash}_{n-1} \parallel 	ext{battery\_id} \parallel 	ext{event\_type} \parallel 	ext{timestamp} \parallel 	ext{actor\_id} \parallel 	ext{canonical\_json}(	ext{payload}))$$

### Tamper Detection Algorithm
When an auditor calls `/api/v1/verify/{battery_id}/audit-trail`, the backend:
1. Validates `events[0].prev_hash == "0" * 64`.
2. For each block $i \in [1, N-1]$, verifies `events[i].prev_hash == events[i-1].hash`.
3. Recalculates the exact SHA-256 hash using canonical JSON formatting (sorted keys, no extraneous whitespace).
4. If an actor altered even one byte of BMS telemetry or odometer reading in block $k$, the recalculated hash will mismatch, instantly exposing block index $k$ as corrupted.

---

## 4. Role-Based Access Control (RBAC)

| Enterprise Role | Typical Organization | Permissions |
|---|---|---|
| **MANUFACTURER** | Cell Gigafactory (QuantumVolt) | Mint new passports, record manufacturing genesis, run simulations |
| **OEM** | Vehicle Assembler (Apex Motors) | Assemble pack into vehicle VIN, log factory telemetry |
| **FLEET_OPERATOR** | EV Fleet / Logistics (Apex Fleet) | Log periodic BMS telemetry (SoH, SoC, cycles), transfer custody |
| **RECYCLER** | Circular Metallurgy (EcoRecycle) | Decommission, assign second-life BESS, mark battery recycled |
| **REGULATOR_AUDITOR**| EU Metrology Authority | Run deep audit trail recalculation, compliance verification |
| **PUBLIC** | Consumers, Inspection Stations | Scan physical QR code, verify authenticity seal |
