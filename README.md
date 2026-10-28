# BatteryPass 360

[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Compliance](https://img.shields.io/badge/Compliance-EU_2023%2F1542-emerald.svg)](https://eur-lex.europa.eu)
[![QpiAI](https://img.shields.io/badge/QpiAI-Opt_%26_Quantum_SDK-00BCD4.svg)](https://qpiai.tech)

**BatteryPass 360** is a cross-enterprise Electric Vehicle (EV) battery passport and metrology platform built for the **WEB3-03 EV battery passport challenge**. It fully complies with the **European Union Battery Regulation (EU 2023/1542)** and circular economy standards (BatteryPass / CIRPASS / Catena-X).

---

## Key Features

- **Immutable Battery DID**: Deterministically generated decentralized identifiers (`did:battery:sha256:...`) and human-readable tags (`BAT-NMC-...`) cryptographically derived from physical manufacturing attributes.
- **Tamper-Evident SHA-256 Hash Chaining**: Every custody event (manufacturing, OEM assembly, fleet operations, maintenance, second-life repurposing, recycling) is linked to the previous block via cryptographic hashing, with instant recalculation audit verification.
- **Live Tampering Simulation & Audit Proof**: Ability to simulate supply chain data tampering and observe cryptographic integrity detection in real time.
- **Role-Based Access Control (RBAC)**: Distinct permissions and personas for **Manufacturer**, **OEM**, **Fleet Operator**, **Recycler**, **Regulator / Auditor**, and **Public Consumer**.
- **Public QR Verification**: Scan-to-verify digital certificate portal with downloadable QR sticker generation.
- **QpiAI Optimization & Quantum Analytics**:
  - **QpiAI-Opt**: Formulates second-life EV battery reverse logistics allocation as Quadratic Unconstrained Binary Optimization (QUBO) problems.
  - **QpiAI Quantum SDK & QCloud**: Synthesizes 4-qubit parameterized variational trial ansatz circuits to model molecular orbital degradation states of cathode materials (NMC 811, LFP, NCA).
- **Persistent Local Metrology Store**: Browser-backed and in-memory persistent metrology repository pre-seeded with sample battery packs across active, second-life, and end-of-life stages.

---

## Quickstart

Run the dev server:
```bash
npm run dev
```
The app will start on port 3000 (`http://localhost:3000`).

To build for production:
```bash
npm run build
```
