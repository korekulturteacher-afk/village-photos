-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Invite codes table
CREATE TABLE invite_codes (
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
CREATE TABLE invite_code_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT REFERENCES invite_codes(code) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT
);

-- Allowed users (whitelist)
CREATE TABLE allowed_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  invited_by TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Download requests
CREATE TABLE download_requests (
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

-- Approved downloads (tracking)
CREATE TABLE approved_downloads (
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

-- Download logs
CREATE TABLE download_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  file_id TEXT NOT NULL,
  file_name TEXT,
  ip_address TEXT,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photos table for admin management
CREATE TABLE photos (
  id TEXT PRIMARY KEY, -- Google Drive file ID
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

-- Photo tags/categories
CREATE TABLE photo_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photo-tag relationships
CREATE TABLE photo_tag_relations (
  photo_id TEXT REFERENCES photos(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES photo_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, tag_id)
);

-- Rate limiting
CREATE TABLE rate_limits (
  user_email TEXT PRIMARY KEY,
  download_count INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- Create indexes for performance
CREATE INDEX idx_invite_codes_active ON invite_codes(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_invite_code_usage_email ON invite_code_usage(user_email);
CREATE INDEX idx_download_requests_status ON download_requests(status);
CREATE INDEX idx_download_requests_user ON download_requests(user_email);
CREATE INDEX idx_approved_downloads_token ON approved_downloads(download_token);
CREATE INDEX idx_download_logs_user ON download_logs(user_email);
CREATE INDEX idx_photos_approved ON photos(is_approved, is_public);
CREATE INDEX idx_photos_created ON photos(created_time DESC);
CREATE INDEX idx_photo_tags_name ON photo_tags(name);

-- Row Level Security (RLS) policies

-- Invite codes: Anyone can read active codes, only admins can modify
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active invite codes" ON invite_codes
  FOR SELECT USING (is_active = TRUE);

-- Allowed users: Users can read their own data
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON allowed_users
  FOR SELECT USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- Download requests: Users can manage their own requests
ALTER TABLE download_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own requests" ON download_requests
  FOR SELECT USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');
CREATE POLICY "Users can create requests" ON download_requests
  FOR INSERT WITH CHECK (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Approved downloads: Users can only access their approved downloads
ALTER TABLE approved_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own approved downloads" ON approved_downloads
  FOR SELECT USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Download logs: Only viewable by admins (handled via service role)
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;

-- Photos: Public photos are viewable by everyone, private photos only by admins
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read approved public photos" ON photos
  FOR SELECT USING (is_approved = TRUE AND is_public = TRUE);
CREATE POLICY "Admins can manage all photos" ON photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_admin = TRUE
    )
  );

-- Photo tags: Viewable by everyone
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read photo tags" ON photo_tags FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage photo tags" ON photo_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_admin = TRUE
    )
  );

-- Photo tag relations: Same as photos
ALTER TABLE photo_tag_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read approved public photo tags" ON photo_tag_relations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM photos
      WHERE photos.id = photo_tag_relations.photo_id
      AND photos.is_approved = TRUE
      AND photos.is_public = TRUE
    )
  );
CREATE POLICY "Admins can manage photo tag relations" ON photo_tag_relations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_admin = TRUE
    )
  );

-- Rate limits: Users can read their own rate limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own rate limits" ON rate_limits
  FOR SELECT USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');
