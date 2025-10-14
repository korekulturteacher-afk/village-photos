// Setup database using Supabase client
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Setting up database...\n');

  try {
    // 1. Read and execute schema
    console.log('📋 Step 1: Creating database schema...');
    const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await supabase.rpc('exec_sql', { sql: statement + ';' });
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists')) {
          console.log(`⚠️  ${err.message}`);
        }
      }
    }

    // Alternative: Direct table creation using Supabase admin
    console.log('✅ Schema setup completed\n');

    // 2. Check if tables exist
    console.log('📋 Step 2: Checking tables...');
    const { data: tables, error: tableError } = await supabase
      .from('invite_codes')
      .select('code')
      .limit(1);

    if (tableError) {
      console.error('❌ Tables not found. Please run schema.sql manually in Supabase SQL Editor');
      console.log('\n📖 Instructions:');
      console.log('1. Go to: https://supabase.com/dashboard/project/yxhoyipxnatohxlsdijv/sql/new');
      console.log('2. Copy contents from: supabase/schema.sql');
      console.log('3. Paste and click "Run"');
      process.exit(1);
    }

    console.log('✅ Tables exist\n');

    // 3. Insert invite code
    console.log('📋 Step 3: Creating invite code...');
    const { data: inviteCode, error: inviteError } = await supabase
      .from('invite_codes')
      .upsert({
        code: 'VILLAGE2025',
        created_by: 'korekulturteacher@gmail.com',
        max_uses: 50,
        expires_at: '2025-12-31T23:59:59+00:00',
        description: '2025년 마을 행사 사진',
        is_active: true,
      }, {
        onConflict: 'code'
      })
      .select();

    if (inviteError) {
      console.error('❌ Error creating invite code:', inviteError.message);
      process.exit(1);
    }

    console.log('✅ Invite code created: VILLAGE2025\n');

    // 4. Verify invite code
    const { data: codes } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', 'VILLAGE2025');

    if (codes && codes.length > 0) {
      console.log('📊 Invite Code Details:');
      console.log('   Code:', codes[0].code);
      console.log('   Max Uses:', codes[0].max_uses);
      console.log('   Used Count:', codes[0].used_count);
      console.log('   Expires:', codes[0].expires_at);
      console.log('   Active:', codes[0].is_active);
    }

    console.log('\n✅ Database setup completed!');
    console.log('\n🎉 You can now test with: http://localhost:3000?code=VILLAGE2025');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
