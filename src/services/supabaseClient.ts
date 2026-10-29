import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable lookup for Vite browser bundle and Node test runners
const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const val = ((import.meta as any).env[key] as string | undefined)?.trim();
      if (val) return val;
    }
    if (typeof process !== 'undefined' && process.env) {
      const val = (process.env[key] as string | undefined)?.trim();
      if (val) return val;
    }
  } catch {
    // Fallback if environment is restricted
  }
  return '';
};

let activeUrl =
  getEnvVar('VITE_SUPABASE_URL') ||
  getEnvVar('SUPABASE_URL') ||
  getEnvVar('NEXT_PUBLIC_SUPABASE_URL');

const rawCandidateKey =
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  getEnvVar('SUPABASE_ANON_KEY') ||
  getEnvVar('SUPABASE_PUBLISHABLE_KEY') ||
  getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  getEnvVar('SUPABASE_KEY');

let activePublishableKey = rawCandidateKey.startsWith('sb_secret_') ? '' : rawCandidateKey;

export let isSupabaseConfigured = Boolean(
  activeUrl &&
    activePublishableKey &&
    activeUrl.startsWith('http') &&
    !activeUrl.includes('your-project')
);

export let supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(activeUrl, activePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

let initPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Dynamically initializes or re-hydrates the Supabase client by fetching
 * safe public credentials (URL + Anon Key) from the backend `/api/v1/auth/config`.
 * This enables runtime Google AI Studio environment variable integration
 * without requiring client-side rebuilds or exposing server secrets.
 */
export async function initSupabaseClient(): Promise<SupabaseClient | null> {
  if (supabase && isSupabaseConfigured) {
    return supabase;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const res = await fetch('/api/v1/auth/config', {
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const cfg = await res.json();
          if (
            cfg.isConfigured &&
            cfg.supabaseUrl &&
            cfg.supabaseAnonKey &&
            !cfg.supabaseAnonKey.startsWith('sb_secret_')
          ) {
            activeUrl = cfg.supabaseUrl;
            activePublishableKey = cfg.supabaseAnonKey;
            isSupabaseConfigured = true;
            supabase = createClient(activeUrl, activePublishableKey, {
              auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
              },
            });
            return supabase;
          }
        }
      }
    } catch {
      // Backend config endpoint may be unreachable during early bootstrap
    } finally {
      initPromise = null;
    }
    return supabase;
  })();

  return initPromise;
}

export const getSupabase = (): SupabaseClient | null => supabase;

export const getActiveSupabaseConfig = () => ({
  url: activeUrl,
  hasKey: Boolean(activePublishableKey),
  isConfigured: isSupabaseConfigured,
});
