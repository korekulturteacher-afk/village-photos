-- ============================================
-- Village Photos - Admin Config Table Setup
-- ============================================
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yxhoyipxnatohxlsdijv/sql/new
-- ============================================

-- Create admin_config table for storing admin password
CREATE TABLE IF NOT EXISTS admin_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS (Row Level Security)
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on admin_config" ON admin_config;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on admin_config"
  ON admin_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index on id
CREATE INDEX IF NOT EXISTS idx_admin_config_id ON admin_config(id);

-- Add comment
COMMENT ON TABLE admin_config IS 'Stores admin password hash (single row table)';

-- ============================================
-- Setup Complete!
-- ============================================
-- Default password: password!
-- Admin login: http://localhost:3000/admin/login
-- ============================================
