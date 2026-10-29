import dotenv from 'dotenv';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Never override existing platform environment variables
dotenv.config({ override: false });

const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const rawPubKey = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();

function isPrivilegedSupabaseKey(candidate: string): boolean {
  if (!candidate) return true;
  if (candidate.startsWith('sb_secret_')) return true;
  if (
    process.env.SUPABASE_SECRET_KEY &&
    candidate === process.env.SUPABASE_SECRET_KEY.trim()
  ) {
    return true;
  }
  if (
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    candidate === process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
  ) {
    return true;
  }
  const parts = candidate.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (payload?.role === 'service_role') return true;
    } catch {
      // ignore malformed JWT
    }
  }
  return false;
}

const safePubKey = isPrivilegedSupabaseKey(rawPubKey) ? '' : rawPubKey;

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(rawUrl),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(safePubKey),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(safePubKey),
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
