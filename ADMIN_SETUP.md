# 관리자 페이지 설정 가이드

## 🔧 Supabase 데이터베이스 설정

관리자 기능을 사용하기 위해 Supabase에 테이블을 생성해야 합니다.

### 1. Supabase Dashboard에서 SQL 실행

1. [Supabase Dashboard](https://supabase.com/dashboard/project/yxhoyipxnatohxlsdijv/editor)에 접속
2. 왼쪽 메뉴에서 **SQL Editor** 클릭
3. 아래 SQL을 복사하여 실행:

```sql
-- Create admin_config table for storing admin password
CREATE TABLE IF NOT EXISTS admin_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Enable RLS (Row Level Security)
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

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
```

### 2. 또는 마이그레이션 파일 사용

마이그레이션 파일이 이미 생성되어 있습니다:
- 위치: `supabase/migrations/20250114000000_create_admin_config.sql`

Supabase CLI로 적용:
```bash
npx supabase db push
```

## 🔐 관리자 기능

### 초기 비밀번호
- **기본 비밀번호**: `password!`
- 첫 로그인 후 즉시 변경하세요

### 관리자 페이지 접속
1. 갤러리 페이지 우측 상단의 **⚙️ 관리자** 버튼 클릭
2. 비밀번호 입력 (초기: `password!`)
3. 로그인 성공 시 관리자 대시보드로 이동

### 비밀번호 변경
1. 관리자 대시보드에서 비밀번호 변경 양식 작성
2. 현재 비밀번호 입력
3. 새 비밀번호 입력 (최소 6자)
4. 새 비밀번호 확인 (동일하게 입력)
5. **비밀번호 변경** 버튼 클릭

### 기능
- ✅ 비밀번호 보기/숨기기 (눈동자 아이콘)
- ✅ 비밀번호 일치 여부 실시간 확인
- ✅ 보안 해시 (bcrypt) 저장
- ✅ 세션 기반 인증

## 🛡️ 보안 참고사항

1. **초기 비밀번호 변경**: 반드시 첫 로그인 후 비밀번호를 변경하세요
2. **강력한 비밀번호**: 최소 8자 이상, 숫자/특수문자 포함 권장
3. **세션 관리**: 브라우저를 닫으면 세션이 만료됩니다
4. **HTTPS 사용**: 프로덕션에서는 HTTPS 사용 필수

## 📁 관련 파일

- 로그인 페이지: `app/admin/login/page.tsx`
- 관리자 대시보드: `app/admin/page.tsx`
- 비밀번호 관리: `lib/admin-password.ts`
- API:
  - 로그인 검증: `app/api/admin/verify/route.ts`
  - 비밀번호 변경: `app/api/admin/change-password/route.ts`
