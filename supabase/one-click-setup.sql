-- 🚀 ONE-CLICK SETUP
-- Copy this entire file and paste into Supabase SQL Editor
-- Then click "Run"

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create all tables
CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  created_by TEXT NOT NULL,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

CREATE TABLE IF NOT EXISTS invite_code_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT REFERENCES invite_codes(code) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT
);

CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  invited_by TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS download_requests (
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
);

CREATE TABLE IF NOT EXISTS approved_downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES download_requests(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  downloaded BOOLEAN DEFAULT FALSE,
  downloaded_at TIMESTAMP WITH TIME ZONE,
  download_token TEXT UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS download_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  file_id TEXT NOT NULL,
  file_name TEXT,
  ip_address TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  user_email TEXT PRIMARY KEY,
  download_count INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_invite_code_usage_email ON invite_code_usage(user_email);
CREATE INDEX IF NOT EXISTS idx_download_requests_status ON download_requests(status);
CREATE INDEX IF NOT EXISTS idx_download_requests_user ON download_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_approved_downloads_token ON approved_downloads(download_token);
CREATE INDEX IF NOT EXISTS idx_download_logs_user ON download_logs(user_email);

-- 4. Insert initial invite code
INSERT INTO invite_codes (code, created_by, max_uses, expires_at, description, is_active)
VALUES (
  'VILLAGE2025',
  'korekulturteacher@gmail.com',
  50,
  '2025-12-31 23:59:59+00',
  '2025년 마을 행사 사진',
  true
)
ON CONFLICT (code) DO UPDATE SET
  max_uses = EXCLUDED.max_uses,
  expires_at = EXCLUDED.expires_at,
  is_active = EXCLUDED.is_active;

-- 5. Verify setup
SELECT
  '✅ Setup Complete!' as status,
  code,
  max_uses,
  used_count,
  expires_at,
  is_active
FROM invite_codes
WHERE code = 'VILLAGE2025';
