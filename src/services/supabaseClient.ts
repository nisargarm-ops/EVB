import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

// Stored manual configuration in case user inputs in UI
const storedUrl = localStorage.getItem('bp360_supabase_url') || '';
const storedKey = localStorage.getItem('bp360_supabase_anon_key') || '';

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
    localStorage.setItem('bp360_supabase_url', url.trim());
    localStorage.setItem('bp360_supabase_anon_key', key.trim());
    supabase = createClient(url.trim(), key.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } else {
    localStorage.removeItem('bp360_supabase_url');
    localStorage.removeItem('bp360_supabase_anon_key');
    supabase = null;
  }
};

export const getActiveSupabaseConfig = () => ({
  url: activeUrl,
  hasKey: Boolean(activeKey),
  isConfigured: isSupabaseConfigured,
});
