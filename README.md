# BatteryPass 360

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![Compliance](https://img.shields.io/badge/Compliance-EU_2023%2F1542-emerald.svg)](https://eur-lex.europa.eu)
[![QpiAI](https://img.shields.io/badge/QpiAI-Opt_%26_Quantum_SDK-00BCD4.svg)](https://qpiai.tech)

**BatteryPass 360** is a full-stack, cross-enterprise Electric Vehicle (EV) battery passport and metrology platform built for the **WEB3-03 EV battery passport challenge**. It fully complies with the **European Union Battery Regulation (EU 2023/1542)** and circular economy standards (BatteryPass / CIRPASS / Catena-X).

---

## Key Features

- **Immutable Battery DID**: Deterministically generated decentralized identifiers (`did:battery:sha256:...`) and human-readable tags (`BAT-NMC-...`) cryptographically derived from physical manufacturing attributes.
- **Tamper-Evident SHA-256 Hash Chaining**: Every custody event (manufacturing, OEM assembly, fleet operations, maintenance, second-life repurposing, recycling) is linked to the previous block via cryptographic hashing, with instant recalculation audit verification.
- **Role-Based Access Control (RBAC)**: Distinct permissions and personas for **Manufacturer**, **OEM**, **Fleet Operator**, **Recycler**, **Regulator / Auditor**, and **Public Consumer**.
- **Public QR Verification**: Scan-to-verify digital certificate portal with downloadable QR sticker generation.
- **Official QpiAI Integration**:
  - **QpiAI-Opt**: Formulates second-life EV battery reverse logistics allocation as Quadratic Unconstrained Binary Optimization (QUBO) problems via `qpiai-opt-api`.
  - **QpiAI Quantum SDK & QCloud**: Synthesizes 4-qubit parameterized variational trial ansatz circuits to model molecular orbital degradation states of cathode materials (NMC 811, LFP, NCA) via `qpiai-quantum`.
  - **Zero Fabrication Policy**: Strictly reports authentic status and real SDK execution paths without simulating fake solver results.
- **Supabase Persistence & Local Fallback**: PostgreSQL schema with Row-Level Security (RLS) policies and a zero-config thread-safe in-memory repository for instant out-of-the-box testing.

---

## Architecture Overview

```
batterypass-360/
|-- backend/                      # Python FastAPI Service
|   |-- app/
|   |   |-- api/v1/              # REST Endpoints (passports, custody, verify, qpiai)
|   |   |-- core/                # Config, RBAC, Security, Hasher (SHA-256 Chaining)
|   |   |-- db/                  # Supabase & Thread-Safe In-Memory Repository
|   |   |-- integrations/        # Real QpiAI Opt & Quantum SDK Adapters
|   |   |-- models/              # Domain Models (Passport, CustodyEvent, User)
|   |   +-- schemas/             # Pydantic Schemas
|   |-- tests/                   # Pytest Automated Test Suite (100% Pass)
|   +-- requirements.txt
|-- frontend/                     # React + TypeScript + Vite Service
|   |-- src/
|   |   |-- components/          # Navbar, RoleSelector, HashChainInspector, QR Modal
|   |   |-- pages/               # Dashboard, PassportDetail, Mint, Public Verify, QpiAI Studio
|   |   |-- services/            # API Client
|   |   +-- types/               # TypeScript Interfaces
|   +-- package.json
|-- supabase/                     # PostgreSQL Migrations & Seed Data
|   |-- schema.sql
|   +-- seed.sql
|-- docs/                         # Comprehensive Documentation
|   |-- ARCHITECTURE.md
|   |-- SETUP_GUIDE.md
|   |-- QPIAI_INTEGRATION.md
|   |-- SUPABASE_SETUP.md
|   +-- GOOGLE_AI_STUDIO_IMPORT.md
|-- .env.example                  # Safe configuration template
+-- .gitignore                    # Secrets & cache exclusion
```

---

## Quickstart

### 1. Run Automated Backend Tests
```powershell
cd backend
python -m pip install -r requirements.txt
python -m pytest -v
```

### 2. Start the Backend API
```powershell
python -m uvicorn app.main:app --reload --port 8000
```
Open **http://127.0.0.1:8000/docs** in your browser for the interactive Swagger documentation.

### 3. Start the Frontend
```powershell
cd ../frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser.

---

## Documentation Links

- [Architecture Design Document](docs/ARCHITECTURE.md)
- [Step-by-Step Setup Guide](docs/SETUP_GUIDE.md)
- [QpiAI Integration Guide](docs/QPIAI_INTEGRATION.md)
- [Supabase Setup Guide](docs/SUPABASE_SETUP.md)
- [Google AI Studio Import Guide](docs/GOOGLE_AI_STUDIO_IMPORT.md)
