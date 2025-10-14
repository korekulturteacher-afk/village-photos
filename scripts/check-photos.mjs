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
  console.error('[check-photos] Missing Supabase credentials.');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

try {
  const { data, error } = await client
    .from('photos')
    .select('id, name')
    .limit(5);

  if (error) {
    console.error('[check-photos] Query error:', error);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        count: data?.length ?? 0,
        rows: data,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error('[check-photos] Unexpected error:', error);
  process.exit(1);
}
