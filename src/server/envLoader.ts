import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

let envLoaded = false;

/**
 * Loads environment variables from:
 * 1. Standard process.env (already provided by Cloud Run / platform)
 * 2. /app/.dev.env.json (Google AI Studio dev environment JSON container file)
 * 3. .env.local in project root
 * 4. .env in project root
 * 5. Parent /app/.env if running in container
 *
 * Never overwrites existing platform variables.
 */
export function loadAppEnvironment(): void {
  if (envLoaded) return;
  envLoaded = true;

  // 1. Load .env.local if present in project root
  const localEnvPath = path.join(projectRoot, '.env.local');
  if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath, override: false });
  }

  // 2. Load .env in project root
  const rootEnvPath = path.join(projectRoot, '.env');
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath, override: false });
  }

  // 3. Check /app/.dev.env.json (Google AI Studio injected variables)
  const devJsonPaths = [
    '/app/.dev.env.json',
    path.join(projectRoot, '../.dev.env.json'),
    path.join(projectRoot, '.dev.env.json'),
  ];

  for (const devJsonPath of devJsonPaths) {
    if (fs.existsSync(devJsonPath)) {
      try {
        const raw = fs.readFileSync(devJsonPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string' && v.trim() && !process.env[k]) {
              process.env[k] = v.trim();
            }
          }
        }
      } catch {
        // Ignore unparseable JSON safely
      }
    }
  }

  // 4. Normalize Supabase variable aliases
  normalizeSupabaseEnv();

  // 5. Normalize QpiAI variable aliases
  normalizeQpiAIEnv();
}

/**
 * Checks whether a candidate string is a privileged secret / service-role key
 * that must NEVER be leaked to browser clients or public API responses.
 */
export function isPrivilegedSupabaseKey(candidate: string): boolean {
  if (!candidate) return false;
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('sb_secret_')) return true;

  const secretRef = (process.env.SUPABASE_SECRET_KEY || '').trim();
  if (secretRef && trimmed === secretRef) return true;

  const serviceRoleRef = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (serviceRoleRef && trimmed === serviceRoleRef) return true;

  const adminRef = (process.env.SUPABASE_ADMIN_KEY || '').trim();
  if (adminRef && trimmed === adminRef) return true;

  // Inspect JWT payload role claims if token is a standard 3-part JWT
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      const role = String(payload?.role || '').toLowerCase();
      if (role === 'service_role' || role === 'supabase_admin') {
        return true;
      }
    } catch {
      // Ignore malformed JWT
    }
  }

  return false;
}

/**
 * Maps all standard variations of Supabase environment variable names.
 */
function normalizeSupabaseEnv(): void {
  // URL normalization
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim();

  if (url) {
    const cleanUrl = url.replace(/\/+$/, '');
    if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = cleanUrl;
    if (!process.env.VITE_SUPABASE_URL) process.env.VITE_SUPABASE_URL = cleanUrl;
  }

  // Public / Anon Key candidates
  const pubCandidates = [
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_KEY,
  ];

  let resolvedPubKey = '';
  for (const candidate of pubCandidates) {
    const val = (candidate || '').trim();
    if (val && !isPrivilegedSupabaseKey(val) && !val.includes('your_public_key')) {
      resolvedPubKey = val;
      break;
    }
  }

  if (resolvedPubKey) {
    if (!process.env.SUPABASE_ANON_KEY) process.env.SUPABASE_ANON_KEY = resolvedPubKey;
    if (!process.env.SUPABASE_PUBLISHABLE_KEY) process.env.SUPABASE_PUBLISHABLE_KEY = resolvedPubKey;
    if (!process.env.VITE_SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = resolvedPubKey;
    if (!process.env.VITE_SUPABASE_PUBLISHABLE_KEY) process.env.VITE_SUPABASE_PUBLISHABLE_KEY = resolvedPubKey;
  }

  // Secret / Service-Role Key candidates
  const secretCandidates = [
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_ADMIN_KEY,
    process.env.SUPABASE_SERVICE_KEY,
    process.env.SUPABASE_KEY,
  ];

  let resolvedSecretKey = '';
  for (const candidate of secretCandidates) {
    const val = (candidate || '').trim();
    if (
      val &&
      isPrivilegedSupabaseKey(val) &&
      !val.includes('your_server_only') &&
      !val.includes('your_secret_key')
    ) {
      resolvedSecretKey = val;
      break;
    }
  }

  // If SUPABASE_KEY was supplied without explicit distinction and is not clearly an anon token
  if (!resolvedSecretKey && process.env.SUPABASE_KEY) {
    const candidate = process.env.SUPABASE_KEY.trim();
    if (candidate && !candidate.startsWith('sb_publishable_') && !candidate.includes('your_public_key')) {
      resolvedSecretKey = candidate;
    }
  }

  if (resolvedSecretKey) {
    if (!process.env.SUPABASE_SECRET_KEY) process.env.SUPABASE_SECRET_KEY = resolvedSecretKey;
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = resolvedSecretKey;
  }
}

/**
 * Normalizes QpiAI-Opt and QpiAI Quantum / QCloud environment variables.
 */
function normalizeQpiAIEnv(): void {
  // Opt Key
  const optKey = (
    process.env.QPIAI_OPT_API_KEY ||
    process.env.OPT_API_KEY ||
    process.env.QPIAI_OPT_KEY ||
    ''
  ).trim();
  if (optKey && !process.env.QPIAI_OPT_API_KEY) {
    process.env.QPIAI_OPT_API_KEY = optKey;
  }

  // Opt URL
  const optUrl = (
    process.env.QPIAI_OPT_URL ||
    process.env.OPT_URL ||
    process.env.QPIAI_OPT_ENDPOINT ||
    ''
  ).trim();
  if (optUrl && !process.env.QPIAI_OPT_URL) {
    process.env.QPIAI_OPT_URL = optUrl;
  }

  // Quantum Key
  const qKey = (
    process.env.QPIAI_QUANTUM_API_KEY ||
    process.env.QPIAI_QCLOUD_API_KEY ||
    process.env.QCLOUD_API_KEY ||
    process.env.QPIAI_QUANTUM_KEY ||
    ''
  ).trim();
  if (qKey && !process.env.QPIAI_QUANTUM_API_KEY) {
    process.env.QPIAI_QUANTUM_API_KEY = qKey;
  }

  // Quantum Backend
  const qBackend = (
    process.env.QPIAI_QUANTUM_BACKEND ||
    process.env.QPIAI_QCLOUD_BACKEND ||
    process.env.QUANTUM_BACKEND ||
    ''
  ).trim();
  if (qBackend && !process.env.QPIAI_QUANTUM_BACKEND) {
    process.env.QPIAI_QUANTUM_BACKEND = qBackend;
  }
}

export interface PublicSupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
  missingVars: string[];
}

/**
 * Returns safe public client-facing Supabase configuration.
 * Strictly filters out any service-role or secret key.
 */
export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  loadAppEnvironment();

  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const rawKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();

  const safeAnonKey = isPrivilegedSupabaseKey(rawKey) ? '' : rawKey;
  const missingVars: string[] = [];

  if (!url || !url.startsWith('http') || url.includes('your-project')) {
    missingVars.push('SUPABASE_URL');
  }
  if (!safeAnonKey) {
    missingVars.push('SUPABASE_ANON_KEY');
  }

  const isConfigured = missingVars.length === 0;

  return {
    supabaseUrl: isConfigured ? url : '',
    supabaseAnonKey: isConfigured ? safeAnonKey : '',
    isConfigured,
    missingVars,
  };
}

export interface AdminSupabaseConfig {
  supabaseUrl: string;
  supabaseSecretKey: string;
  isConfigured: boolean;
  missingVars: string[];
}

/**
 * Returns server-side admin Supabase configuration for postgres operations.
 * Must NEVER be passed to client-facing endpoints.
 */
export function getAdminSupabaseConfig(): AdminSupabaseConfig {
  loadAppEnvironment();

  const forceMemory = String(process.env.FORCE_MEMORY_DB || process.env.USE_MEMORY_DB || 'false').toLowerCase() === 'true';
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const secretKey = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  ).trim();

  const missingVars: string[] = [];
  if (forceMemory) {
    return {
      supabaseUrl: '',
      supabaseSecretKey: '',
      isConfigured: false,
      missingVars: ['(FORCE_MEMORY_DB enabled)'],
    };
  }

  if (!url || !url.startsWith('http') || url.includes('your-project')) {
    missingVars.push('SUPABASE_URL');
  }
  if (!secretKey) {
    missingVars.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY)');
  }

  const isConfigured = missingVars.length === 0;

  return {
    supabaseUrl: isConfigured ? url : '',
    supabaseSecretKey: isConfigured ? secretKey : '',
    isConfigured,
    missingVars,
  };
}

// Auto-execute environment loader on module load
loadAppEnvironment();
