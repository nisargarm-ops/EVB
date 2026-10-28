# Importing BatteryPass 360 into Google AI Studio

This guide explains how to import and use the BatteryPass 360 codebase with **Google AI Studio** to perform automated code analysis, multi-agent development, and prompt orchestration.

---

## Method 1: Using System Prompt & Code Context in Google AI Studio

1. Open [aistudio.google.com](https://aistudio.google.com).
2. Click **Create New Prompt** (select **Chat Prompt** or **Structured Prompt**).
3. Select the latest model: **Gemini 1.5 Pro** or **Gemini 2.0 Flash**.
4. In the **System Instructions** box, paste:
   ```markdown
   You are an expert AI software architect and Metrology Specialist for BatteryPass 360, a cross-enterprise EV battery passport platform complying with EU 2023/1542.
   The stack consists of:
   - Python FastAPI backend housing official QpiAI Opt (QUBO) and QpiAI Quantum SDK integrations.
   - React + TypeScript + Vite frontend.
   - SHA-256 tamper-evident hash chaining for chain-of-custody.
   - Supabase PostgreSQL with Row-Level Security (RLS).
   
   Always maintain the zero-fabrication policy for solver runs and enforce cryptographic hash chain integrity.
   ```
5. In the chat, you can paste specific modules (e.g. `qpiai_opt_adapter.py` or `hasher.py`) to generate new optimizations or evaluate regulatory audit reports.

---

## Method 2: Importing via GitHub

1. Push your BatteryPass 360 repository to GitHub:
   ```powershell
   git init
   git add .
   git commit -m "feat: initial BatteryPass 360 architecture"
   git remote add origin https://github.com/your-username/batterypass-360.git
   git push -u origin main
   ```
2. In Google AI Studio or Google Cloud Vertex AI, you can connect the GitHub repository as a context source for Gemini Code Assist and AI Studio workspace workspaces.
