-- Insert initial invite code (separate migration)
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
  max_uses = 50,
  expires_at = '2025-12-31 23:59:59+00',
  is_active = true;
