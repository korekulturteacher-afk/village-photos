# 🏘️ Village Photos Gallery

마을 사진 갤러리 - Google Drive 기반 사진 공유 플랫폼

## 주요 기능

- 🔐 **초대 코드 기반 인증**: Google OAuth + 초대 코드로 보안 강화
- 📸 **사진 관리**: Google Drive와 연동하여 사진 자동 동기화
- 👥 **관리자 페이지**: 사진 승인, 초대 코드 관리, 다운로드 요청 관리
- 💾 **다운로드 시스템**: 관리자 승인 후 ZIP 파일로 다운로드
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원

## 기술 스택

- **Frontend**: Next.js 15.5.4, React 19, TypeScript
- **Auth**: NextAuth.js (Google OAuth)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Google Drive API
- **UI**: Tailwind CSS

## 빠른 시작

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 다음 값들을 설정하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Drive
GOOGLE_DRIVE_FOLDER_ID=your-drive-folder-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email
GOOGLE_PRIVATE_KEY=your-private-key
```

### 2. 데이터베이스 설정

Supabase SQL Editor에서 `supabase/schema.sql` 파일을 실행하세요.

### 3. 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 시작
npm run dev
```

앱이 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

## 프로젝트 구조

```
village-photos/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   ├── auth/              # 인증 페이지
│   ├── gallery/           # 갤러리 페이지
│   ├── admin/             # 관리자 페이지
│   └── my-requests/       # 사용자 요청 페이지
├── components/            # React 컴포넌트
├── lib/                   # 유틸리티 함수
│   ├── auth.ts           # NextAuth 설정
│   ├── supabase.ts       # Supabase 클라이언트
│   ├── google-drive.ts   # Google Drive API
│   └── api-utils.ts      # API 유틸리티
├── types/                 # TypeScript 타입 정의
├── supabase/              # 데이터베이스 스키마
└── public/               # 정적 파일
```

## 사용 방법

### 일반 사용자

1. **로그인**: Google 계정으로 로그인
2. **초대 코드 입력**: 관리자로부터 받은 초대 코드 입력
3. **갤러리 탐색**: 승인된 사진 탐색
4. **다운로드 요청**: 원하는 사진 선택 후 다운로드 요청
5. **다운로드**: 승인 후 "내 요청" 페이지에서 다운로드

### 관리자

1. **관리자 페이지 접속**: `/admin` 경로로 접속
2. **초대 코드 관리**: 새 초대 코드 생성/관리
3. **사진 동기화**: Google Drive에서 사진 가져오기
4. **사진 승인**: 업로드된 사진 승인/거부
5. **다운로드 요청 관리**: 사용자 다운로드 요청 승인/거부

## API 엔드포인트

### 인증
- `POST /api/verify-code` - 초대 코드 검증

### 사진
- `GET /api/photos` - 승인된 사진 목록
- `GET /api/image/[fileId]` - 사진 이미지
- `GET /api/thumbnail/[fileId]` - 썸네일 이미지

### 다운로드
- `POST /api/download-request` - 다운로드 요청 생성
- `GET /api/download-request` - 내 다운로드 요청 조회
- `GET /api/download/[requestId]` - ZIP 파일 다운로드

### 관리자
- `POST /api/admin/verify` - 관리자 인증
- `GET /api/admin/photos` - 모든 사진 조회
- `POST /api/admin/sync-photos` - Google Drive 동기화
- `POST /api/admin/invite-codes` - 초대 코드 생성
- `GET /api/admin/download-requests` - 다운로드 요청 관리

## 보안 기능

- ✅ Google OAuth 인증
- ✅ 초대 코드 기반 접근 제어
- ✅ Row Level Security (RLS) 정책
- ✅ Rate limiting (시간당 3회 요청 제한)
- ✅ 관리자 비밀번호 해싱 (bcrypt)

## 라이선스

MIT

## 문의

프로젝트 관련 문의사항은 이슈를 생성해주세요.
