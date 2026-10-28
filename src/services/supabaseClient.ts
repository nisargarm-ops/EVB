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

const activeUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const activePublishableKey =
  getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') ||
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  getEnvVar('SUPABASE_PUBLISHABLE_KEY') ||
  getEnvVar('SUPABASE_KEY');

export const isSupabaseConfigured = Boolean(
  activeUrl &&
    activePublishableKey &&
    activeUrl.startsWith('http') &&
    !activeUrl.includes('your-project')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(activeUrl, activePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const getActiveSupabaseConfig = () => ({
  url: activeUrl,
  hasKey: Boolean(activePublishableKey),
  isConfigured: isSupabaseConfigured,
});
