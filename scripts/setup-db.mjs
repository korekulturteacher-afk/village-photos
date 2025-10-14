// Setup database - Simple version
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('🚀 Setting up database...\n');

  // Check if tables exist
  console.log('📋 Checking if tables exist...');
  const { error: checkError } = await supabase
    .from('invite_codes')
    .select('code')
    .limit(1);

  if (checkError) {
    console.error('❌ Tables not found!');
    console.log('\n⚠️  Please create tables first:');
    console.log('1. Go to: https://supabase.com/dashboard/project/yxhoyipxnatohxlsdijv/sql/new');
    console.log('2. Copy all content from: supabase/schema.sql');
    console.log('3. Paste and click "Run"');
    console.log('4. Then run this script again');
    process.exit(1);
  }

  console.log('✅ Tables exist\n');

  // Insert invite code
  console.log('📋 Creating invite code VILLAGE2025...');
  const { data, error } = await supabase
    .from('invite_codes')
    .upsert(
      {
        code: 'VILLAGE2025',
        created_by: 'korekulturteacher@gmail.com',
        max_uses: 50,
        used_count: 0,
        expires_at: '2025-12-31T23:59:59+00:00',
        is_active: true,
        description: '2025년 마을 행사 사진',
      },
      { onConflict: 'code' }
    )
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('✅ Invite code created!\n');

  // Verify
  const { data: codes } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', 'VILLAGE2025');

  if (codes && codes.length > 0) {
    console.log('📊 Invite Code Details:');
    console.log('   Code:', codes[0].code);
    console.log('   Max Uses:', codes[0].max_uses);
    console.log('   Used:', codes[0].used_count);
    console.log('   Expires:', codes[0].expires_at);
    console.log('   Active:', codes[0].is_active);
  }

  console.log('\n✅ Setup completed!');
  console.log('🎉 Test with: http://localhost:3000?code=VILLAGE2025\n');
}

main().catch(console.error);
