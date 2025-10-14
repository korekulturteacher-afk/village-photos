import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error('[test-rpc] Missing Supabase credentials.');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data, error } = await client.rpc('pg_execute_sql', {
  query: 'select 1;',
});

if (error) {
  console.error('[test-rpc] RPC error:', error);
  process.exit(1);
}

console.log('[test-rpc] Result:', data);
