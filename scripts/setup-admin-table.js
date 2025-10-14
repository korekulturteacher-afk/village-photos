import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAdminTable() {
  console.log('🔧 Setting up admin_config table...');

  try {
    // Create table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create admin_config table for storing admin password
        CREATE TABLE IF NOT EXISTS admin_config (
          id INTEGER PRIMARY KEY DEFAULT 1,
          password_hash TEXT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT single_row CHECK (id = 1)
        );

        -- Enable RLS (Row Level Security)
        ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Allow all operations on admin_config" ON admin_config;

        -- Create policy to allow all operations
        CREATE POLICY "Allow all operations on admin_config"
          ON admin_config
          FOR ALL
          USING (true)
          WITH CHECK (true);

        -- Create index on id
        CREATE INDEX IF NOT EXISTS idx_admin_config_id ON admin_config(id);
      `
    });

    if (createError) {
      console.error('❌ Error creating table:', createError);

      // Try alternative method - direct SQL execution
      console.log('📝 Trying alternative method...');

      // Check if table exists
      const { data: tables, error: checkError } = await supabase
        .from('admin_config')
        .select('id')
        .limit(1);

      if (checkError && checkError.code === '42P01') {
        console.error('❌ Table does not exist. Please create it manually in Supabase Dashboard.');
        console.log('\n📋 SQL to run in Supabase Dashboard:');
        console.log('─────────────────────────────────────');
        console.log(`
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
        `);
        console.log('─────────────────────────────────────');
        console.log('\n🔗 Go to: https://supabase.com/dashboard/project/yxhoyipxnatohxlsdijv/sql/new');
        process.exit(1);
      } else {
        console.log('✅ Table already exists or was created successfully!');
      }
    } else {
      console.log('✅ Admin config table created successfully!');
    }

    console.log('\n✨ Setup complete!');
    console.log('📝 Default password: password!');
    console.log('🔗 Admin login: http://localhost:3000/admin/login');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Please run this SQL manually in Supabase Dashboard:');
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
  ON admin_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_admin_config_id ON admin_config(id);
    `);
    console.log('─────────────────────────────────────');
    console.log('\n🔗 Go to: https://supabase.com/dashboard/project/yxhoyipxnatohxlsdijv/sql/new');
    process.exit(1);
  }
}

setupAdminTable();
