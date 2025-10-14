-- Initial setup SQL

-- 1. Create invite code
INSERT INTO invite_codes (code, created_by, max_uses, expires_at, description)
VALUES (
  'VILLAGE2025',
  'korekulturteacher@gmail.com',
  50,
  '2025-12-31 23:59:59+00',
  '2025년 마을 행사 사진'
)
ON CONFLICT (code) DO NOTHING;

-- 2. Verify invite code was created
SELECT * FROM invite_codes WHERE code = 'VILLAGE2025';
