import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

console.log('🔍 Supabase Connection Test\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Environment Variables:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing');
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
console.log('URL:', supabaseUrl);
console.log('');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('1️⃣ Testing basic connection...');
    const { data, error } = await supabase
      .from('download_requests')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.error('Error details:', error);
      return false;
    }

    console.log('✅ Connection successful!');
    console.log('');

    console.log('2️⃣ Checking if admin_config table exists...');
    const { data: adminData, error: adminError } = await supabase
      .from('admin_config')
      .select('id')
      .limit(1);

    if (adminError) {
      if (adminError.code === '42P01') {
        console.log('⚠️  Table "admin_config" does not exist');
        console.log('');
        console.log('3️⃣ Creating admin_config table...');

        // Try to create table using raw SQL
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS admin_config (
              id INTEGER PRIMARY KEY DEFAULT 1,
              password_hash TEXT NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              CONSTRAINT single_row CHECK (id = 1)
            );

            ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

            DROP POLICY IF EXISTS "Allow all operations on admin_config" ON admin_config;

            CREATE POLICY "Allow all operations on admin_config"
              ON admin_config
              FOR ALL
              USING (true)
              WITH CHECK (true);

            CREATE INDEX IF NOT EXISTS idx_admin_config_id ON admin_config(id);
          `
        });

        if (createError) {
          console.error('❌ Could not create table automatically:', createError.message);
          console.log('');
          console.log('📋 Please run this SQL manually in Supabase Dashboard:');
          console.log('🔗 https://supabase.com/dashboard/project/yxhoyipxnatohxlsdijv/sql/new');
          console.log('─────────────────────────────────────');
          console.log(`
CREATE TABLE IF NOT EXISTS admin_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on admin_config"
  ON admin_config FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_config_id ON admin_config(id);
          `);
          console.log('─────────────────────────────────────');
          return false;
        } else {
          console.log('✅ Table created successfully!');
        }
      } else {
        console.error('❌ Error checking table:', adminError.message);
        return false;
      }
    } else {
      console.log('✅ Table "admin_config" exists!');
    }

    console.log('');
    console.log('✨ All tests passed!');
    console.log('📝 Default password: password!');
    console.log('🔗 Admin login: http://localhost:3000/admin/login');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

testConnection();
