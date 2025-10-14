-- Create admin_config table for storing admin password
CREATE TABLE IF NOT EXISTS admin_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS (Row Level Security)
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since this is a single-row table)
-- In production, you should restrict this to service role only
CREATE POLICY "Allow all operations on admin_config"
  ON admin_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index on id
CREATE INDEX IF NOT EXISTS idx_admin_config_id ON admin_config(id);

-- Add comment
COMMENT ON TABLE admin_config IS 'Stores admin password hash (single row table)';
