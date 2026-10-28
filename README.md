# BatteryPass 360

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_RLS-3ECF8E.svg?logo=supabase&logoColor=white)](https://supabase.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Compliance](https://img.shields.io/badge/Compliance-EU_2023%2F1542-emerald.svg)](https://eur-lex.europa.eu)
[![QpiAI](https://img.shields.io/badge/QpiAI-Opt_%26_Quantum_SDK-00BCD4.svg)](https://qpiai.tech)

**BatteryPass 360** is an enterprise-grade cross-enterprise Electric Vehicle (EV) battery passport and lifecycle metrology platform engineered for the **WEB3-03 EV battery passport challenge**. It strictly complies with the **European Union Battery Regulation (EU 2023/1542)** and circular economy standards (CIRPASS, Catena-X).

---

## Architecture Overview

```
batterypass-360/
├── backend/                       # Python FastAPI Enterprise Service
│   ├── app/
│   │   ├── api/v1/               # Health, Batteries, Custody Transfers, Decisions, Integrations
│   │   ├── core/                 # Config, RBAC, Security (JWT/RLS), Hasher (SHA-256)
│   │   ├── db/                   # Supabase PostgreSQL & Thread-Safe In-Memory Repo
│   │   ├── schemas/              # Pydantic Schemas (Battery, Custody, Verification, Disposition)
│   │   ├── services/             # BatteryService, CustodyService, VerificationService, DispositionService
│   │   └── integrations/         # QpiAI Opt & Quantum SDK Adapters (Teammate 4)
│   ├── tests/                    # Comprehensive Pytest Suite (Batteries, RBAC, Transfers, Hasher)
│   ├── pytest.ini
│   └── requirements.txt
├── supabase/                      # Database Layer
│   ├── migrations/               # Reproducible SQL DDL with Indexes, Triggers & RLS Policies
│   │   └── 20261028000001_initial_schema.sql
│   └── seed.sql                  # Verified Demo Seed Data (Organizations, Batteries, Custody Chains)
├── src/                           # React 18 + TypeScript Web Application
│   ├── components/               # Navbar, RoleSelector, HashChainInspector, QR Modal
│   ├── pages/                    # Dashboard, PassportDetail, Mint, Public Verify, QpiAI Studio
│   ├── services/                 # Unified Metrology & Hasher Store
│   └── types/                    # TypeScript Metrology Definitions
├── .env.example                  # Environment Configuration Template
└── package.json                  # Frontend Dependencies (Node 22 / Vite / Port 3000)
```

---

## Database Design & Migrations

The database schema is partitioned across 10 tables:

1. `organizations`: Enterprise identities (Manufacturer, OEM, Fleet Operator, Service Center, Remanufacturer, Recycler, Auditor).
2. `profiles`: Authenticated users linked to enterprise organizations with role-based permissions.
3. `batteries`: Canonical immutable battery identity with deterministic DIDs (`did:battery:sha256:...`), serial numbers, and technical specifications.
4. `battery_metrics`: Timestamped condition readings (SoH, SoC, cycles, internal resistance, fade rate).
5. `lifecycle_events`: Append-only tamper-evident records cryptographically linked via SHA-256 hashes. Database triggers prohibit `UPDATE` or `DELETE` operations.
6. `custody_transfers`: Multi-party stateful handoff workflow (`PENDING`, `ACCEPTED`, `REJECTED`) with receiver-only acceptance validation.
7. `evidence_records`: Secure, non-public inspection reports, lab diagnostics, and storage references.
8. `verification_results`: Recorded audit trail checks and mathematical authenticity certificates.
9. `disposition_decisions`: AI-driven circular pathway recommendations (`STATIONARY_BESS`, `CELL_RECONDITIONING`, `DEEP_RECYCLING`) with operating constraints.
10. `audit_logs`: Immutable logs of sensitive administrative and lifecycle operations.

### Running Migrations & Seeding with Supabase
```bash
# Apply migration
supabase db reset
# Or execute manually in PostgreSQL:
psql -h <SUPABASE_HOST> -U postgres -d postgres -f supabase/migrations/20261028000001_initial_schema.sql
psql -h <SUPABASE_HOST> -U postgres -d postgres -f supabase/seed.sql
```

---

## API Contract (FastAPI)

All endpoints support both `/api` (Master Contract) and `/api/v1` (Backwards Compatibility):

| Method | Endpoint | Description | Authorization |
|---|---|---|---|
| `GET` | `/api/health` | Health check and active database mode | Public |
| `GET` | `/api/batteries` | List batteries with optional `?status=` filter | Public / Authenticated |
| `POST` | `/api/batteries` | Mint new battery passport and genesis block | `manufacturer`, `administrator` |
| `GET` | `/api/batteries/{id}` | Get full passport metrology records | Public / Authenticated |
| `GET` | `/api/batteries/{id}/events` | Retrieve append-only custody event chain | Public / Authenticated |
| `POST` | `/api/batteries/{id}/verify` | Cryptographic tamper detection and verification | Public / Authenticated |
| `POST` | `/api/custody/transfers` | Initiate enterprise custody transfer | Custodian / Stakeholder |
| `POST` | `/api/custody/transfers/{id}/accept` | Accept custody transfer & update custodian | Designated Receiver Only |
| `POST` | `/api/custody/transfers/{id}/reject` | Reject custody transfer with reason | Designated Receiver Only |
| `GET` | `/api/decisions/{id}` | Get circular disposition decision & constraints | Stakeholder / Auditor |
| `GET` | `/api/integrations/status` | Real configuration telemetry (DB, QpiAI) | Public / Authenticated |

---

## Security & Authorization Model

1. **Least Privilege**:
   - Only `manufacturer` personas can register new battery passports for their authorized organization.
   - Only the designated receiver organization can accept or reject an incoming custody transfer (`HTTP 403` otherwise).
   - `auditor` accounts can inspect all evidence, recalculate audit chains, and view verification logs without modifying operational state.
2. **Key Isolation**:
   - `SUPABASE_SERVICE_ROLE_KEY` and backend `SECRET_KEY` are kept strictly in backend environment variables and are never sent to the browser.
3. **Tamper-Evident Hash Chaining**:
   - Genesis block: `prev_hash = "0" * 64`.
   - Block $n$: `hash = SHA256(prev_hash | battery_id | event_type | timestamp | actor_id | canonical_json(payload))`.
   - Explicit database trigger prevents any `UPDATE` or `DELETE` on `lifecycle_events`. Any correction requires an explicit `CORRECTION_LOGGED` block.
   - *Limitation Note*: Hash chaining guarantees that stored records have not been altered after insertion; it does not independently verify initial physical honesty. Supporting lab evidence and actor signatures are preserved to mitigate oracle risks.

---

## Setup & Running Instructions

### 1. Backend Service (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt

# Run unit and integration tests
pytest -v

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
Swagger UI documentation will be live at `http://localhost:8000/docs`.

### 2. Frontend Service (React + Vite)
```bash
# In workspace root
npm install
npm run dev
```
The React frontend starts on `http://localhost:3000`.
