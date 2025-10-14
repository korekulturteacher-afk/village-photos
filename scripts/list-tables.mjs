import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error('[list-tables] Missing Supabase credentials.');
  process.exit(1);
}

const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/pg_tables`;

const response = await fetch(endpoint, {
  headers: {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
  },
});

if (!response.ok) {
  console.error('[list-tables] Failed:', response.status, response.statusText);
  console.error(await response.text());
  process.exit(1);
}

const data = await response.json();
console.log(JSON.stringify(data, null, 2));
