import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { safeStorage } from './safeStorage';

// Safe Environment Variable Access for Vite and Node runtime
const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return ((import.meta as any).env[key] as string | undefined)?.trim() || '';
    }
    if (typeof process !== 'undefined' && process.env) {
      return (process.env[key] as string | undefined)?.trim() || '';
    }
  } catch {
    // fallback if environment is restricted
  }
  return '';
};

const envUrl = getEnvVar('VITE_SUPABASE_URL');
const envKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Stored manual configuration in case user inputs in UI
const storedUrl = safeStorage.getItem('bp360_supabase_url') || '';
const storedKey = safeStorage.getItem('bp360_supabase_anon_key') || '';

const activeUrl = envUrl || storedUrl;
const activeKey = envKey || storedKey;

export const isSupabaseConfigured = Boolean(
  activeUrl && 
  activeKey && 
  activeUrl.startsWith('http') && 
  !activeUrl.includes('your-project')
);

export let supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(activeUrl, activeKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const updateSupabaseCredentials = (url: string, key: string) => {
  if (url && key) {
    safeStorage.setItem('bp360_supabase_url', url.trim());
    safeStorage.setItem('bp360_supabase_anon_key', key.trim());
    supabase = createClient(url.trim(), key.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } else {
    safeStorage.removeItem('bp360_supabase_url');
    safeStorage.removeItem('bp360_supabase_anon_key');
    supabase = null;
  }
};

export const getActiveSupabaseConfig = () => ({
  url: activeUrl,
  hasKey: Boolean(activeKey),
  isConfigured: isSupabaseConfigured,
});
