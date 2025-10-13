# Village Photos Gallery

마을 주민 사진 공유 및 다운로드 플랫폼

## 🎯 주요 기능

### 사용자 기능
- **초대 코드 기반 접근**: WhatsApp으로 공유된 초대 코드로 가입
- **구글 로그인**: 간편한 인증 시스템
- **사진 갤러리**: 그리드 형식으로 800+ 장의 마을 사진 보기
- **다운로드 신청**: 원하는 사진 선택 후 관리자 승인 요청
- **승인된 사진 다운로드**: 승인 후 7일간 다운로드 가능

### 관리자 기능
- **초대 코드 생성**: 사용 제한 및 만료일 설정
- **WhatsApp 공유**: 원클릭 초대 링크 공유
- **신청 관리**: 다운로드 신청 승인/거부
- **통계 대시보드**: 사용 현황 및 로그 확인

## 🔐 보안 기능

- 초대 코드 기반 접근 제어
- 다운로드 신청 승인 시스템
- 시간 제한 다운로드 토큰
- Rate limiting
- 다운로드 로그 추적

## 🛠️ 기술 스택

- Next.js 14, React, TypeScript
- Supabase (PostgreSQL)
- NextAuth.js (Google OAuth)
- Google Drive API
- Tailwind CSS

## 🚀 설치

```bash
npm install
npm run dev
```

## 📋 설정 필요

1. `.env.local` 파일 설정
2. Supabase 데이터베이스 스키마 실행 (`supabase/schema.sql`)
3. Google OAuth 설정
4. Google Drive API 설정
