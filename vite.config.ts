import dotenv from 'dotenv';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

dotenv.config({ override: true });

const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const rawPubKey = (
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();

// Never allow a server secret key (sb_secret_*) into client bundles
const safePubKey = rawPubKey.startsWith('sb_secret_') ? '' : rawPubKey;

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
