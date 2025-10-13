# 설정 가이드

## 1. Supabase 데이터베이스 설정

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. 좌측 메뉴에서 **SQL Editor** 클릭
3. **New query** 클릭
4. `supabase/schema.sql` 파일의 전체 내용을 복사하여 붙여넣기
5. **Run** 버튼 클릭하여 실행

### 초기 관리자 추가

데이터베이스 설정 후 관리자 계정을 수동으로 추가해야 합니다:

```sql
INSERT INTO allowed_users (email, name, is_admin)
VALUES ('your-admin-email@gmail.com', 'Admin', true);
```

## 2. Google Cloud Console 설정

### OAuth 2.0 리디렉션 URI 설정

1. Google Cloud Console의 OAuth 클라이언트 설정 페이지 접속
2. **승인된 리디렉션 URI**에 다음 추가:
   - `http://localhost:3000/api/auth/callback/google`
   - (배포 후) `https://your-domain.com/api/auth/callback/google`
3. **저장** 클릭

### Google Drive API 활성화 확인

1. API 라이브러리 접속
2. **Google Drive API** 검색
3. 이미 활성화되어 있는지 확인 (활성화 안 되어 있으면 활성화)

### 폴더 공유 설정

서비스 계정이 Google Drive 폴더에 접근할 수 있도록 공유:

1. Google Drive에서 사진 폴더 열기
2. 각 폴더 우클릭 → **공유** 클릭
3. 서비스 계정 이메일 추가 (service-account.json 파일에서 확인)
4. 권한: **뷰어** (읽기 전용)
5. **보내기** 클릭

## 3. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 값들을 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Drive API
GOOGLE_DRIVE_FOLDER_ID_1=your-folder-id-1
GOOGLE_DRIVE_FOLDER_ID_2=your-folder-id-2

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAILS=your-admin-email@gmail.com
```

### NextAuth Secret 생성

```bash
openssl rand -base64 32
```

## 4. 프로젝트 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열기

## 5. 초대 코드 생성 (관리자용)

Supabase SQL Editor에서 초대 코드 생성:

```sql
-- 예시: 50명 제한, 2025년 12월 31일 만료
INSERT INTO invite_codes (code, created_by, max_uses, expires_at, description)
VALUES (
  'VILLAGE2025',
  'your-admin-email@gmail.com',
  50,
  '2025-12-31 23:59:59',
  '2025년 마을 행사 사진'
);
```

## 6. 테스트 플로우

### 신규 사용자 등록

1. WhatsApp 공유 링크 생성:
   ```
   http://localhost:3000?code=VILLAGE2025
   ```

2. 링크 클릭 → 로그인 페이지
3. "Google로 로그인" 클릭
4. 구글 계정 선택
5. 코드 검증 → 갤러리 접근

### 사진 다운로드 신청

1. 갤러리에서 사진 선택 (체크박스 클릭)
2. 하단 "선택한 사진 신청" 버튼 클릭
3. 신청 사유 입력 (선택)
4. "신청하기" 클릭
5. 관리자 승인 대기

## 7. 다음 단계 (추가 개발 필요)

- [ ] 관리자 대시보드 (신청 승인/거부)
- [ ] 내 신청 내역 페이지
- [ ] 초대 코드 관리 UI
- [ ] 다운로드 기능 (승인 후)
- [ ] 이메일 알림

## 문제 해결

### "인증이 필요합니다" 오류
- Google OAuth 리디렉션 URI가 올바른지 확인
- 브라우저 쿠키/캐시 삭제 후 재시도

### "유효하지 않은 초대 코드" 오류
- Supabase에 초대 코드가 생성되었는지 확인
- 코드가 만료되지 않았는지 확인

### "사진을 가져올 수 없습니다" 오류
- Google Drive 폴더가 서비스 계정과 공유되었는지 확인
- `service-account.json` 파일이 프로젝트 루트에 있는지 확인
