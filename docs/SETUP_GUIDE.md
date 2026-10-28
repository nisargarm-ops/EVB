# BatteryPass 360 - Step-by-Step Setup Guide

Welcome to BatteryPass 360! This guide explains how to install, configure, run, and test the application on Windows, macOS, or Linux using simple, beginner-friendly instructions.

---

## Prerequisites

1. **Python 3.10+** (Python 3.12 recommended)
   - Check version: `python --version`
2. **Git**
   - Check version: `git --version`
3. **Node.js (v18+) & npm** (Required for the React frontend)
   - On Windows, install via winget:
     ```powershell
     winget install OpenJS.NodeJS.LTS
     ```
   - Or download directly from [nodejs.org](https://nodejs.org).

---

## Step 1: Clone the Repository & Configure Environment

```powershell
# Navigate to the project root
cd batterypass-360

# Copy the template configuration file to .env
cp .env.example .env
```

Open `.env` in any text editor (like VS Code or Notepad). Out of the box, `USE_MEMORY_DB=true` is enabled, allowing you to run all tests and APIs without needing cloud credentials immediately.

---

## Step 2: Set Up and Run the Python Backend

```powershell
# Navigate to the backend directory
cd backend

# (Optional but recommended) Create and activate a Python virtual environment:
python -m venv venv
.\venv\Scripts\Activate.ps1    # On Windows PowerShell
# source venv/bin/activate       # On Linux / macOS

# Install all backend dependencies (including FastAPI, QpiAI SDKs, pytest):
pip install -r requirements.txt

# Run the automated test suite to verify everything works:
python -m pytest -v

# Start the live FastAPI server with hot-reload:
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Once running:
- Open your browser to **http://127.0.0.1:8000/docs** to explore the interactive **Swagger API Documentation**.
- Health check endpoint: **http://127.0.0.1:8000/api/v1/health**.

---

## Step 3: Set Up and Run the React Frontend

Open a new terminal window:

```powershell
# Navigate to the frontend directory
cd batterypass-360/frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Open your browser to **http://localhost:5173** to view the application!

---

## Step 4: Exploring Key Workflows

1. **Fleet Passports**: Browse registered battery passports, inspect live State of Health (SoH) gauges, and filter by status.
2. **Passport Detail**: Click on any battery (e.g. `BAT-NMC-8A2F91C0`) to inspect EU circular metrology data, carbon footprint breakdown, and recycled content percentages.
3. **Audit Trail Verification**: On the passport detail view, click **"Verify Cryptographic Audit Trail"** to recalculate the SHA-256 hash chain and observe tamper-evident verification.
4. **Log BMS Telemetry**: Switch to **Fleet Operator** or **OEM** persona in the top navigation bar, then click **"Log BMS Telemetry"** to append a new block to the hash chain.
5. **Public QR Portal**: Click **"Digital QR Sticker"** to download the printable QR sticker, or navigate to **"Public Verify"** to see what a consumer or roadside vehicle inspector sees.
6. **QpiAI Studio**: Navigate to **"QpiAI Studio"** to test QUBO logistics optimization with `qpiai-opt-api` and molecular degradation simulation with `qpiai-quantum`.
