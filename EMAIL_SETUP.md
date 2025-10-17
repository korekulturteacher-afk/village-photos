# 이메일 전송 기능 설정 가이드

## Resend 계정 생성 및 API 키 발급

이 프로젝트는 Resend 서비스를 사용하여 사용자에게 다운로드 링크를 이메일로 전송합니다.

### 1. Resend 계정 만들기

1. [Resend 웹사이트](https://resend.com/)에 접속합니다
2. "Sign Up" 버튼을 클릭하여 계정을 만듭니다
3. 이메일 인증을 완료합니다

### 2. API 키 발급받기

1. Resend 대시보드에 로그인합니다
2. 좌측 메뉴에서 "API Keys"를 클릭합니다
3. "Create API Key" 버튼을 클릭합니다
4. API 키 이름을 입력합니다 (예: "village-photos-production")
5. 권한을 선택합니다 (Sending emails 권한 필요)
6. "Create" 버튼을 클릭합니다
7. 생성된 API 키를 복사합니다 (한 번만 표시됩니다!)

### 3. 프로젝트에 API 키 설정하기

1. 프로젝트 루트 디렉토리의 `.env.local` 파일을 엽니다
2. `RESEND_API_KEY` 값을 발급받은 API 키로 변경합니다:

```env
RESEND_API_KEY=re_your_actual_api_key_here
```

3. 파일을 저장합니다
4. 개발 서버를 재시작합니다:

```bash
npm run dev
```

### 4. 발신 이메일 주소 설정 (선택사항)

기본적으로 `onboarding@resend.dev` 주소를 사용합니다. 사용자 정의 도메인을 사용하려면:

1. Resend 대시보드에서 "Domains"를 클릭합니다
2. "Add Domain" 버튼을 클릭합니다
3. 도메인을 입력하고 DNS 설정을 완료합니다
4. `app/api/admin/send-download-email/[requestId]/route.ts` 파일의 `from` 필드를 수정합니다:

```typescript
from: 'Village Photos <noreply@yourdomain.com>',
```

### 5. 테스트하기

1. 관리자 페이지에 로그인합니다 (`http://localhost:3000/admin`)
2. "Download Requests" 탭으로 이동합니다
3. 승인된 요청에서 "이메일 전송" 버튼을 클릭합니다
4. 사용자의 이메일 주소로 다운로드 링크가 전송됩니다

## 주의사항

- **API 키 보안**: `.env.local` 파일은 절대 Git에 커밋하지 마세요
- **무료 플랜 제한**: Resend 무료 플랜은 월 3,000개의 이메일을 보낼 수 있습니다
- **이메일 전송 실패**: API 키가 올바르지 않거나 Resend 계정에 문제가 있으면 이메일 전송이 실패할 수 있습니다

## 문제 해결

### 이메일이 전송되지 않는 경우

1. `.env.local` 파일에서 `RESEND_API_KEY`가 올바르게 설정되었는지 확인합니다
2. 개발 서버를 재시작합니다
3. 브라우저 콘솔과 터미널에서 오류 메시지를 확인합니다
4. Resend 대시보드에서 "Logs"를 확인하여 전송 상태를 확인합니다

### 이메일이 스팸으로 분류되는 경우

1. Resend 대시보드에서 사용자 정의 도메인을 설정합니다
2. SPF, DKIM, DMARC 레코드를 올바르게 설정합니다
3. 이메일 내용을 검토하여 스팸 필터 트리거를 제거합니다

## 추가 정보

- [Resend 공식 문서](https://resend.com/docs)
- [Resend API 참조](https://resend.com/docs/api-reference/introduction)
- [Resend 가격 정보](https://resend.com/pricing)
