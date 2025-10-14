// Script to create photos table directly using PostgreSQL connection
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const dbPassword = process.env.SUPERBASE_DATABASE_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!dbPassword || !supabaseUrl) {
  console.error('❌ Missing credentials in .env file');
  console.error('Required: SUPERBASE_DATABASE_PASSWORD, NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

// Extract project ref from Supabase URL
const projectRef = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)[1];
const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;

console.log('🚀 Connecting to Supabase PostgreSQL...');
console.log('📍 Project:', projectRef);

const createPhotosTableSQL = `
-- Photos 테이블 생성
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_photos_approved ON photos(is_approved, is_public);
CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_time DESC);

-- Row Level Security 활성화
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 승인된 공개 사진은 누구나 볼 수 있음
DROP POLICY IF EXISTS "Anyone can read approved public photos" ON photos;
CREATE POLICY "Anyone can read approved public photos" ON photos
  FOR SELECT USING (is_approved = TRUE AND is_public = TRUE);
`;

async function createPhotosTable() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    console.log('\n📝 Creating photos table...');
    await client.query(createPhotosTableSQL);
    console.log('✅ Photos table created successfully!');

    // Verify table exists
    console.log('\n🔍 Verifying table...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'photos'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verified: photos table exists!');

      // Get table info
      const columns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'photos'
        ORDER BY ordinal_position
      `);

      console.log('\n📊 Table structure:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });

      console.log('\n🎉 Success! You can now:');
      console.log('1. Go to http://localhost:3000/admin');
      console.log('2. Click "Google Drive 동기화" to sync 837 photos');
      console.log('3. Click "모든 사진 승인 (일괄승인)" to approve all photos');
    } else {
      throw new Error('Table verification failed');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Alternative solution:');
    console.error('1. Open: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    console.error('2. Copy SQL from QUICK-SETUP.md');
    console.error('3. Paste and click Run');
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

createPhotosTable();
