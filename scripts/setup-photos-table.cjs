// Script to create photos table using Supabase Management API
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing credentials in .env.local file');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const createPhotosTableSQL = `
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT,
  thumbnail_link TEXT,
  web_content_link TEXT,
  web_view_link TEXT,
  created_time TIMESTAMP WITH TIME ZONE,
  modified_time TIMESTAMP WITH TIME ZONE,
  is_approved BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  approved_by TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_approved ON photos(is_approved, is_public);
CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_time DESC);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read approved public photos" ON photos;
CREATE POLICY "Anyone can read approved public photos" ON photos
  FOR SELECT USING (is_approved = TRUE AND is_public = TRUE);
`.trim();

async function createPhotosTable() {
  console.log('🚀 Creating photos table via Supabase API...');
  console.log('📍 Supabase URL:', supabaseUrl);

  try {
    // Use Supabase REST API to execute SQL
    const projectRef = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)[1];
    const apiUrl = `${supabaseUrl}/rest/v1/rpc/exec_sql`;

    console.log('\n📝 Executing SQL...');

    // Try using the Management API
    const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

    const response = await fetch(managementUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        query: createPhotosTableSQL
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Response:', response.status, errorText);
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Photos table created successfully!');
    console.log('📊 Result:', result);

    console.log('\n🎉 Success! You can now:');
    console.log('1. Go to http://localhost:3000/admin');
    console.log('2. Click "Google Drive 동기화" to sync 837 photos');
    console.log('3. Click "모든 사진 승인 (일괄승인)" to approve all photos');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Manual solution (EASY - 2 minutes):');
    console.error('1. Open: https://supabase.com/dashboard/project/yxhoyipxnatohxlsdijv/sql/new');
    console.error('2. Copy the SQL below:');
    console.error('\n--- SQL START ---');
    console.error(createPhotosTableSQL);
    console.error('--- SQL END ---\n');
    console.error('3. Paste into SQL Editor and click Run ▶️');
    console.error('4. Done! Now you can sync and approve photos');
    process.exit(1);
  }
}

createPhotosTable();
