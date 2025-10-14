import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[test-supabase] Missing Supabase URL or service role key.');
  process.exit(1);
}

const client = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

try {
  const { data, error } = await client
    .from('admin_config')
    .select('id')
    .limit(1);

  if (error) {
    console.error('[test-supabase] Query error:', error);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        rows: data?.length ?? 0,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error('[test-supabase] Unexpected error:', error);
  process.exit(1);
}
