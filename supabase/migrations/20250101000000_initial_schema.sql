-- Invite codes table
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

-- Invite code usage tracking
CREATE TABLE IF NOT EXISTS invite_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT REFERENCES invite_codes(code) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT
);

-- Allowed users (whitelist)
CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  invited_by TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Download requests
CREATE TABLE IF NOT EXISTS download_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Approved downloads (tracking)
CREATE TABLE IF NOT EXISTS approved_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES download_requests(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  photo_id TEXT NOT NULL,
  downloaded BOOLEAN DEFAULT FALSE,
  downloaded_at TIMESTAMP WITH TIME ZONE,
  download_token TEXT UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Download logs
CREATE TABLE IF NOT EXISTS download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  file_id TEXT NOT NULL,
  file_name TEXT,
  ip_address TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  user_email TEXT PRIMARY KEY,
  download_count INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_invite_code_usage_email ON invite_code_usage(user_email);
CREATE INDEX IF NOT EXISTS idx_download_requests_status ON download_requests(status);
CREATE INDEX IF NOT EXISTS idx_download_requests_user ON download_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_approved_downloads_token ON approved_downloads(download_token);
CREATE INDEX IF NOT EXISTS idx_download_logs_user ON download_logs(user_email);

-- Insert initial invite code
INSERT INTO invite_codes (code, created_by, max_uses, expires_at, description, is_active)
VALUES (
  'VILLAGE2025',
  'korekulturteacher@gmail.com',
  50,
  '2025-12-31 23:59:59+00',
  '2025년 마을 행사 사진',
  true
)
ON CONFLICT (code) DO NOTHING;
