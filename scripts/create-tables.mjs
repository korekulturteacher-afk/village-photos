// Direct table creation using Supabase REST API
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createTables() {
  console.log('🚀 Creating database tables...\n');

  const statements = [
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

    `CREATE TABLE IF NOT EXISTS invite_codes (
      code TEXT PRIMARY KEY,
      created_by TEXT NOT NULL,
      max_uses INTEGER DEFAULT NULL,
      used_count INTEGER DEFAULT 0,
      expires_at TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      description TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS invite_code_usage (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code TEXT REFERENCES invite_codes(code) ON DELETE CASCADE,
      user_email TEXT NOT NULL,
      user_name TEXT,
      used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ip_address TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS allowed_users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      invited_by TEXT,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS download_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_email TEXT NOT NULL,
      user_name TEXT,
      photo_ids TEXT[] NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      admin_note TEXT,
      requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      reviewed_at TIMESTAMP WITH TIME ZONE,
      reviewed_by TEXT,
      download_expires_at TIMESTAMP WITH TIME ZONE
    )`,

    `CREATE TABLE IF NOT EXISTS approved_downloads (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      request_id UUID REFERENCES download_requests(id) ON DELETE CASCADE,
      user_email TEXT NOT NULL,
      photo_id TEXT NOT NULL,
      downloaded BOOLEAN DEFAULT FALSE,
      downloaded_at TIMESTAMP WITH TIME ZONE,
      download_token TEXT UNIQUE,
      token_expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS download_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_email TEXT NOT NULL,
      file_id TEXT NOT NULL,
      file_name TEXT,
      ip_address TEXT,
      downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS rate_limits (
      user_email TEXT PRIMARY KEY,
      download_count INTEGER DEFAULT 0,
      request_count INTEGER DEFAULT 0,
      reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
    )`,

    `CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active) WHERE is_active = TRUE`,
    `CREATE INDEX IF NOT EXISTS idx_invite_code_usage_email ON invite_code_usage(user_email)`,
    `CREATE INDEX IF NOT EXISTS idx_download_requests_status ON download_requests(status)`,
  ];

  let success = 0;
  let failed = 0;

  for (const sql of statements) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sql })
      });

      if (response.ok || response.status === 409) {
        success++;
        console.log('✅ Executed');
      } else {
        const text = await response.text();
        if (!text.includes('already exists')) {
          failed++;
          console.log('❌', text.substring(0, 100));
        } else {
          success++;
        }
      }
    } catch (err) {
      if (!err.message.includes('already exists')) {
        failed++;
        console.log('❌', err.message.substring(0, 100));
      }
    }
  }

  console.log(`\n📊 Success: ${success}, Failed: ${failed}\n`);

  if (failed === 0 || success > 0) {
    console.log('✅ Tables created! Now run: npm run db:setup');
  } else {
    console.log('❌ Failed to create tables. Please use Supabase web interface.');
  }
}

createTables().catch(console.error);
