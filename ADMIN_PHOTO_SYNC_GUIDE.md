# 📸 관리자 사진 동기화 가이드

Google Drive에 이미 업로드된 사진을 관리자 페이지에서 관리하는 방법입니다.

## 🚀 빠른 시작

### 1. 관리자 로그인
```
http://localhost:3000/admin/photos
```
- 관리자 암호: `admin123456789` (환경 변수 ADMIN_TOKEN)

### 2. Google Drive 사진 동기화
관리자 페이지 우측 상단의 **"Google Drive 동기화"** 버튼을 클릭합니다.

### 3. 사진 승인 및 공개 설정
- **승인 대기** 탭: 새로 동기화된 사진들 확인
- 사진 선택 후:
  - **공개 승인**: 일반 사용자에게 바로 공개
  - **숨김 승인**: 승인하되 일반 사용자에게 숨김
  - **거부**: 사진 거부

- **승인됨** 탭: 승인된 사진 관리
  - **공개하기**: 비공개 사진을 공개로 전환
  - **숨기기**: 공개 사진을 비공개로 전환

## 📋 동작 방식

### Google Drive → Database → 일반 사용자

```
Google Drive 사진
    ↓ (동기화 버튼)
Database (photos 테이블)
    ↓ (승인 + 공개 설정)
일반 사용자 갤러리
```

### 사진 상태

| 상태 | is_approved | is_public | 일반 사용자 표시 |
|------|-------------|-----------|-----------------|
| 승인 대기 | false | false | ❌ 안 보임 |
| 숨김 승인 | true | false | ❌ 안 보임 |
| 공개 승인 | true | true | ✅ 보임 |

## 🔧 설정 확인

### 필수 환경 변수 (.env.local)

```bash
# Google Drive API
GOOGLE_DRIVE_FOLDER_ID_1=your_folder_id_1
GOOGLE_DRIVE_FOLDER_ID_2=your_folder_id_2

# Admin Token
ADMIN_TOKEN=admin123456789
```

### Google Drive 폴더 ID 확인 방법
1. Google Drive에서 공유 폴더 열기
2. URL에서 폴더 ID 복사
   ```
   https://drive.google.com/drive/folders/[FOLDER_ID]
   ```

### Service Account 키 파일
- 파일 위치: `./service-account.json` (프로젝트 루트)
- Google Cloud Console에서 서비스 계정 키 생성 후 저장

## 🎯 사용 시나리오

### 시나리오 1: 초기 사진 동기화
1. Google Drive에 사진 업로드
2. 관리자 페이지 접속
3. "Google Drive 동기화" 버튼 클릭
4. "승인 대기" 탭에서 새 사진 확인
5. 원하는 사진 선택 후 "공개 승인" 또는 "숨김 승인"

### 시나리오 2: 특정 사진 숨기기
1. "승인됨" 탭 선택
2. 숨기려는 사진 선택
3. "숨기기" 버튼 클릭
4. 일반 사용자는 더 이상 해당 사진을 볼 수 없음

### 시나리오 3: 숨긴 사진 다시 공개
1. "승인됨" 탭 선택
2. 비공개 사진 선택 (노란색 "비공개" 뱃지)
3. "공개하기" 버튼 클릭
4. 일반 사용자가 다시 사진을 볼 수 있음

## ⚠️ 주의사항

1. **동기화는 단방향**: Google Drive → Database만 동기화됩니다
2. **삭제는 동기화되지 않음**: Google Drive에서 사진을 삭제해도 Database에는 남아있습니다
3. **중복 방지**: 이미 동기화된 사진은 다시 추가되지 않습니다
4. **권한 필요**: Service Account가 Google Drive 폴더에 대한 읽기 권한이 필요합니다

## 🐛 문제 해결

### 사진이 동기화되지 않을 때
1. 환경 변수 확인 (GOOGLE_DRIVE_FOLDER_ID_1, GOOGLE_DRIVE_FOLDER_ID_2)
2. `service-account.json` 파일 존재 확인
3. Service Account에 Google Drive 폴더 읽기 권한 부여
4. 브라우저 콘솔에서 에러 메시지 확인

### 일반 사용자가 사진을 볼 수 없을 때
- 관리자 페이지 → 승인됨 탭에서 사진이 "공개" 상태인지 확인
- Database에서 `is_approved = true AND is_public = true` 확인

### 동기화 버튼이 응답하지 않을 때
- 네트워크 탭에서 API 호출 확인
- 관리자 토큰 유효성 확인
- 서버 로그 확인

## 📊 API 엔드포인트

- `GET /api/admin/photos?status=all` - 모든 사진 조회
- `POST /api/admin/photos` - 사진 상태 변경 (승인/거부/공개 설정)
- `POST /api/admin/sync-photos` - Google Drive 동기화
- `GET /api/photos` - 일반 사용자용 (승인되고 공개된 사진만)

## 📝 데이터베이스 구조

```sql
CREATE TABLE photos (
  id TEXT PRIMARY KEY,              -- Google Drive file ID
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE, -- 승인 여부
  is_public BOOLEAN DEFAULT FALSE,   -- 공개 여부
  approved_by TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🎓 추가 정보

- 전체 설정 가이드: `ADMIN_SETUP.md`
- 데이터베이스 스키마: `supabase/schema.sql`
- 빠른 설정: `QUICK-SETUP.md`
