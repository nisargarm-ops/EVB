# BatteryPass 360

[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg?logo=express&logoColor=white)](https://expressjs.com)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev)
[![Compliance](https://img.shields.io/badge/Compliance-EU_2023%2F1542-emerald.svg)](https://eur-lex.europa.eu)

**BatteryPass 360** is a full-stack React + TypeScript Electric Vehicle (EV) battery passport and lifecycle metrology platform compliant with the **European Union Battery Regulation (EU 2023/1542)** and circular economy standards (BatteryPass / CIRPASS / Catena-X).

---

## Key Features

- **Immutable Battery DID**: Deterministically generated decentralized identifiers (`did:battery:sha256:...`) and human-readable tags (`BAT-NMC-...`) cryptographically derived from physical manufacturing attributes.
- **Tamper-Evident SHA-256 Hash Chaining**: Every custody event (manufacturing, OEM assembly, fleet operations, maintenance, second-life repurposing, recycling) is linked to the previous block via SHA-256 hashing, with real-time recalculation audit verification.
- **Role-Based Access Control (RBAC)**: Distinct enterprise permissions and personas for **Manufacturer**, **OEM**, **Fleet Operator**, **Recycler**, **Regulator / Auditor**, and **Public Consumer**.
- **Public QR Verification**: Scan-to-verify digital certificate portal with downloadable high-resolution QR sticker generation.
- **QpiAI Computing Studio**:
  - **QpiAI-Opt**: Formulates second-life EV battery reverse logistics allocation as Quadratic Unconstrained Binary Optimization (QUBO) problems and dispatches to QpiAI-Opt Cloud Solver when configured.
  - **QpiAI Quantum**: Constructs 4-qubit parameterized variational trial ansatz circuits modeling molecular orbital degradation states of cathode materials (NMC 811, LFP, NCA), reporting authentic cloud execution or ground-state baseline telemetry.

---

## Architecture Overview

```
batterypass-360/
|-- server.ts                     # Express + Vite Full-Stack Entry Point (Port 3000)
|-- src/
|   |-- components/               # Navbar, RoleSelector, PassportCard, CustodyTimeline, HashChainInspector, QRCodeModal
|   |-- pages/                    # Dashboard, PassportDetail, CreatePassport, VerifyPublic, QpiAIConsole
|   |-- server/                   # SHA-256 Hasher, RBAC & JWT Auth, Seeded Repository, QpiAI Opt & Quantum Adapters
|   |-- services/                 # REST API Client
|   +-- types/                    # Shared TypeScript Interfaces
|-- supabase/                     # PostgreSQL Reference Schema & Seed SQL
|-- docs/                         # Architecture & Integration Guides
|-- .env.example                  # Environment variable template
+-- package.json
```

---

## Quickstart

```bash
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

### Production Build

```bash
npm run build
npm start
```
