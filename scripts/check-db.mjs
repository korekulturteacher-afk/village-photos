import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkDatabase() {
  console.log('🔍 Checking database...\n');

  // Check invite_codes table with service role (bypasses RLS)
  const { data, error } = await supabase
    .from('invite_codes')
    .select('*');

  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Tables may not exist. Migration might have failed.');
    return;
  }

  console.log('✅ Tables exist!');
  console.log(`📊 Found ${data.length} invite codes:\n`);

  if (data.length === 0) {
    console.log('⚠️  No invite codes found. Creating VILLAGE2025...\n');

    const { data: newCode, error: insertError } = await supabase
      .from('invite_codes')
      .insert({
        code: 'VILLAGE2025',
        created_by: 'korekulturteacher@gmail.com',
        max_uses: 50,
        expires_at: '2025-12-31T23:59:59+00:00',
        description: '2025년 마을 행사 사진',
        is_active: true,
      })
      .select();

    if (insertError) {
      console.error('❌ Insert error:', insertError.message);
    } else {
      console.log('✅ Invite code VILLAGE2025 created!');
      console.log(newCode[0]);
    }
  } else {
    data.forEach(code => {
      console.log(`  Code: ${code.code}`);
      console.log(`  Max Uses: ${code.max_uses}`);
      console.log(`  Used: ${code.used_count}`);
      console.log(`  Expires: ${code.expires_at}`);
      console.log(`  Active: ${code.is_active}`);
      console.log('');
    });
  }

  console.log('🎉 Ready to test: http://localhost:3000?code=VILLAGE2025\n');
}

checkDatabase().catch(console.error);
