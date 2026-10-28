# BatteryPass 360 - Step-by-Step Setup Guide

This guide explains how to install, configure, run, and test BatteryPass 360, including optional live cloud credentials for **QpiAI Opt** and **QpiAI QCloud**.

---

## Prerequisites

1. **Node.js (v20+ / v22 LTS recommended) & npm**
   - Check version: `node --version`
2. **Python 3.10+** *(Optional — required only for live `qpiai-opt-api` and `qpiai-quantum` cloud/SDK execution via the server-side Python bridge)*
   - Check version: `python3 --version`

---

## Step 1: Configure Environment Variables

```bash
# Copy the template configuration file to .env
cp .env.example .env
```

Review `.env`:
- By default, `USE_MEMORY_DB=true` runs the seed passport repository without external database credentials.
- All QpiAI credentials remain server-side only (never `VITE_`-prefixed):
  - `QPIAI_OPT_URL` — QpiAI Opt solver endpoint URL (e.g., `https://...`, passed to `qpiai_opt.solver.solver.Solver(problem, url, access_token)`).
  - `QPIAI_OPT_API_KEY` — QpiAI Opt access token (`access_token` header).
  - `QPIAI_OPT_QUEUE` — `false` (default synchronous `/QUBO`) or `true` (queued `/job/QUBO`).
  - `QPIAI_QUANTUM_API_KEY` — QpiAI QCloud secret token (`X-Secret-Token` header for `https://qcloud-server.qpiai.tech`).
  - `QPIAI_QUANTUM_SERVER_URL` — Optional override for `QPIAI_SERVER_URL` (defaults to `https://qcloud-server.qpiai.tech`).
  - `QPIAI_QUANTUM_BACKEND` — Verified backend enum value: `QpiAI-QSV-Simulator`, `QpiAI-QDM-Simulator`, `QpiAI-QTN-Simulator`, `QpiAI-QSV-Local`, or `QpiAI-Indus-1`.
  - `PYTHON_BIN` — Optional Python interpreter path (defaults to `python3`).

---

## Step 2: Install Node Dependencies & Run Mocked-SDK Tests

```bash
# Install Node.js dependencies
npm install

# Run the mocked-SDK reliability & constraint test suite (no cloud credentials or paid runs needed)
npm test

# Type-check and build production bundle
npm run lint
npm run build
```

---

## Step 3: (Optional) Install Official QpiAI Python SDKs for Live Execution

The application includes a strict server-side Python bridge (`src/server/integrations/sdk_bridge.py`) invoked by the Node.js QpiAI adapters when credentials and SDKs are installed. Without these packages or credentials, `/api/integrations/status` honestly reports `missing_credentials` or `configured_but_unavailable` (`SDK_NOT_INSTALLED`), and live requests are never fabricated.

```bash
# Install verified QpiAI Opt SDK (v1.0.6+) and its runtime imports
python3 -m pip install qpiai-opt-api networkx requests

# Install verified QpiAI Quantum SDK (v0.7.5+) for QCloud (https://docs.qcloud.qpiai.tech/)
python3 -m pip install qpiai-quantum
```

---

## Step 4: Start the Full-Stack Server

```bash
# Start Express API + Vite frontend on port 3000
npm run dev
```

Open **http://localhost:3000** in your browser.

### Dedicated QpiAI API Endpoints
- `GET /api/integrations/status` — Live readiness and capability probe (`configured_and_reachable`, `configured_but_unavailable`, `missing_credentials`, `simulator_only`, `demo_mode`, `execution_error`).
- `POST /api/optimization/run` — Constrained EV battery disposition optimization (`direct_reuse`, `second_life_bess`, `remanufacturing`, `material_recycling`) using trusted repository telemetry.
- `POST /api/quantum/run` — Bounded-shot execution (`64..4096` shots) of predefined small quantum circuits (`telemetry_anomaly_ising`, `toy_disposition_ising_2pack`, `bell_calibration_check`).
