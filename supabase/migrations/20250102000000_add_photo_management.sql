-- Add photo management tables
-- +goose Up
CREATE TABLE photos (
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

CREATE TABLE photo_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE photo_tag_relations (
  photo_id TEXT REFERENCES photos(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES photo_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, tag_id)
);

CREATE INDEX idx_photos_approved ON photos(is_approved, is_public);
CREATE INDEX idx_photos_created ON photos(created_time DESC);
CREATE INDEX idx_photo_tags_name ON photo_tags(name);

-- Enable RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tag_relations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

CREATE POLICY "Anyone can read photo tags" ON photo_tags FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage photo tags" ON photo_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM allowed_users
      WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      AND is_admin = TRUE
    )
  );

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

-- +goose Down
DROP TABLE photo_tag_relations;
DROP TABLE photo_tags;
DROP TABLE photos;