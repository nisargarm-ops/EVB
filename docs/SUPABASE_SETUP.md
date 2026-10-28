# Supabase Database Integration Guide

BatteryPass 360 uses **Supabase** (PostgreSQL with built-in Row-Level Security) to persist battery passports, chain-of-custody audit logs, and metrology telematics.

---

## Zero-Config Development (In-Memory Fallback)

By default, BatteryPass 360 ships with `USE_MEMORY_DB=true` in `.env`.
In this mode:
- The backend automatically initializes with 3 realistic pre-seeded battery passports (NMC 811, LFP, NCA).
- All automated tests (`pytest`) run without needing internet access or Supabase credentials.
- All CRUD and hash chain operations function in memory.

---

## Connecting Your Live Supabase Project

When you are ready to connect to a live Supabase project:

### Step 1: Create a Free Project
1. Go to [supabase.com](https://supabase.com) and create an account.
2. Click **New Project** and choose a name (e.g., `batterypass-360`).
3. Set a strong database password and select a region close to you.

### Step 2: Apply the Schema Migration
1. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Copy the entire contents of `supabase/schema.sql` and paste it into the editor.
4. Click **Run** to create the tables (`battery_passports`, `custody_events`), enums, indexes, and RLS policies.
5. (Optional) Run `supabase/seed.sql` to populate sample EV batteries.

### Step 3: Update `.env`
In your Supabase project:
1. Go to **Project Settings** -> **API**.
2. Copy the **Project URL** and the **anon (public)** key.
3. Update your `.env` file:
   ```bash
   USE_MEMORY_DB=false
   SUPABASE_URL="https://your-project-id.supabase.co"
   SUPABASE_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```
4. Restart your FastAPI backend: `python -m uvicorn app.main:app --reload`.
