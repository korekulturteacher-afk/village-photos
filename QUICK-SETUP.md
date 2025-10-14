# 빠른 설정 가이드

## ⚡ 긴급: 800개 사진 한번에 승인하기

### "모든 사진 승인" 버튼 에러 해결 (5분 소요)

**증상**: "모든 사진 승인" 버튼 클릭 시 에러 발생
**원인**: Supabase에 photos 테이블이 없음
**해결**: 아래 3단계 따라하기

#### 1️⃣ Photos 테이블 생성 (2분)

[Supabase SQL Editor 열기](https://supabase.com/dashboard/project/yxhoyipxnatohxlsdijv/sql/new) → 아래 SQL 붙여넣기 → Run ▶️

```sql
-- Photos 테이블 생성
CREATE TABLE IF NOT EXISTS photos (
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

CREATE INDEX IF NOT EXISTS idx_photos_approved ON photos(is_approved, is_public);
CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_time DESC);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can read approved public photos" ON photos
  FOR SELECT USING (is_approved = TRUE AND is_public = TRUE);
```

#### 2️⃣ Google Drive 동기화 (1분)

1. http://localhost:3000/admin 접속
2. **"Google Drive 동기화"** 버튼 클릭
3. 800개 사진이 Supabase에 등록됨 (⚠️ 사진 파일은 Google Drive에 그대로 유지)

#### 3️⃣ 모든 사진 승인 (10초)

1. **"모든 사진 승인 (일괄승인)"** 버튼 클릭
2. 완료! 🎉

### 💡 Photos 테이블 용도

**Q: Supabase에 사진을 업로드하나요?**
**A:** 아니요! 사진은 Google Drive에만 저장됩니다.

**Q: 그럼 왜 필요하죠?**
**A:** 승인 상태만 기록합니다:
- ✅ 어떤 사진을 승인했는지 (`is_approved`)
- 👁️ 어떤 사진을 공개할지 (`is_public`)
- 📝 누가 언제 승인했는지 (`approved_by`, `approved_at`)

Google Drive에는 이런 정보를 저장할 수 없어서 Supabase가 필요합니다.

---

## 📚 전체 스키마 설정 (처음 설치하는 경우)

### 1단계: Supabase 데이터베이스 스키마 생성

### 방법 1: 웹 인터페이스 (추천)

1. [Supabase SQL Editor 열기](https://supabase.com/dashboard/project/yxhoyipxnatohxlsdijv/sql/new)

2. `supabase/schema.sql` 파일 열기

3. **전체 내용 복사** (Ctrl+A, Ctrl+C)

4. SQL Editor에 **붙여넣기** (Ctrl+V)

5. **Run** 버튼 클릭 ▶️

6. 성공 메시지 확인: "Success. No rows returned"

### 방법 2: 아래 SQL 직접 복사

<details>
<summary>📋 클릭하여 SQL 보기</summary>

\`\`\`sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT REFERENCES invite_codes(code) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT
);

-- Allowed users (whitelist)
CREATE TABLE IF NOT EXISTS allowed_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  invited_by TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Download requests
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

-- Approved downloads (tracking)
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

-- Download logs
CREATE TABLE IF NOT EXISTS download_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_invite_code_usage_email ON invite_code_usage(user_email);
CREATE INDEX IF NOT EXISTS idx_download_requests_status ON download_requests(status);
CREATE INDEX IF NOT EXISTS idx_download_requests_user ON download_requests(user_email);
CREATE INDEX IF NOT EXISTS idx_approved_downloads_token ON approved_downloads(download_token);
CREATE INDEX IF NOT EXISTS idx_download_logs_user ON download_logs(user_email);
\`\`\`

</details>

## 2단계: 초대 코드 생성 (자동화)

스키마 생성 후 터미널에서 실행:

\`\`\`bash
npm run db:setup
\`\`\`

이 명령어는:
- ✅ 초대 코드 'VILLAGE2025' 생성
- ✅ 50명 사용 제한 설정
- ✅ 2025년 12월 31일 만료 설정

## 3단계: 테스트

브라우저에서:
\`\`\`
http://localhost:3000?code=VILLAGE2025
\`\`\`

### 예상 흐름:
1. 초대 코드 확인 페이지
2. "Google로 로그인" 버튼 클릭
3. 구글 계정 선택
4. 자동으로 화이트리스트 등록
5. 갤러리 페이지로 리디렉트
6. 800+ 장의 사진 확인

## 문제 해결

### "Tables not found" 오류
→ 1단계를 다시 확인하세요

### "Invalid invite code" 오류
→ 2단계를 다시 실행하세요

### "Unauthorized" 오류
→ 브라우저 쿠키 삭제 후 재시도

## 다음: Google Drive 설정

초대 코드 테스트가 성공하면 Google Drive 폴더를 공유하세요:

1. [폴더 1](https://drive.google.com/drive/folders/13pIDzfaOKNs04ib1IIG1RdHt5SAUtmr4)
2. [폴더 2](https://drive.google.com/drive/folders/1x851fXEwCYrn3U9xv6WV5O6wATSVKSKt)

서비스 계정과 공유:
\`\`\`
drive-photo-viewer@village-photos-475012.iam.gserviceaccount.com
\`\`\`

권한: **뷰어** (읽기 전용)
