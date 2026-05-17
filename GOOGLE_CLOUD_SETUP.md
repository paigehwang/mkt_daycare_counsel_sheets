# Google Cloud Console 설정 가이드 — 상담 대시보드용

> **상담 대시보드 전용 버전**. 마케팅 대시보드와 다른 점: **Sheets API + Drive API 둘 다 활성화 필요** (xlsx 통째로 export 받기 위해).

이 문서는 Next.js 프로젝트 작업 전에 우령님이 콘솔에서 직접 하실 사전 작업이에요. 약 30분 소요.

발급할 두 가지:
1. **OAuth 2.0 클라이언트 ID** → 사용자 로그인용 (`@caring.co.kr` 검증)
2. **서비스 계정 키** → 시트 데이터 자동 fetch용

---

## ⚙️ 사전 결정: 어떤 GCP 계정에서 작업할지

**선택지 A (추천)**: 우령님 개인 `@caring.co.kr` 계정 → 새 프로젝트  
**선택지 B**: 두영님(시스템F) 계정에서 발급 → 인수인계

지금은 A로 빠르게 시작, 정식 운영 결정되면 B로 이관 권장.

---

## 1️⃣ 새 프로젝트 만들기

1. https://console.cloud.google.com 접속 (회사 계정)
2. 상단 프로젝트 선택기 → "새 프로젝트"
3. 이름: `caring-consultation-dashboard`
4. 조직: `caring.co.kr` (자동 선택)
5. 만들기

---

## 2️⃣ API 두 개 활성화 (중요!)

좌측 메뉴 → "API 및 서비스" → "라이브러리"

다음 두 개를 각각 검색해서 **"사용"** 클릭:

1. **Google Sheets API** — 셀 단위 데이터 읽기 시 필요
2. **Google Drive API** ⭐ — **xlsx 통째로 export 받기 위해 필수** (상담 대시보드만의 차이점)

> 마케팅 대시보드는 셀 단위 fetch만 해서 Sheets API만 있어도 됐는데, 상담 대시보드는 xlsx 전체를 다운받아 파싱하는 구조라 Drive API의 `files.export`가 필요합니다.

---

## 3️⃣ OAuth 동의 화면 구성

1. 좌측 메뉴 → "API 및 서비스" → "OAuth 동의 화면"
2. User Type: **"내부(Internal)"** 선택 (Workspace 도메인 = @caring.co.kr 만 자동 허용)
   - "내부"가 안 보이면 → 두영님께 OAuth 설정 협조 요청 또는 "외부"로 테스트 모드 진행
3. 만들기
4. 앱 정보:
   - **앱 이름**: `Caring Consultation Dashboard`
   - **사용자 지원 이메일**: 본인
   - **승인된 도메인**: `vercel.app`, `caring.co.kr` 추가 (선택)
   - **개발자 연락처**: 본인 이메일
5. 저장 및 계속 → 범위는 추가 안 함 → 저장 및 계속 → 완료

---

## 4️⃣ OAuth 2.0 클라이언트 ID (사용자 로그인용)

1. 좌측 메뉴 → "API 및 서비스" → "사용자 인증 정보"
2. **"+ 사용자 인증 정보 만들기"** → **"OAuth 클라이언트 ID"**
3. 애플리케이션 유형: **"웹 애플리케이션"**
4. 이름: `Consultation Dashboard Web`
5. **승인된 JavaScript 원본**:
   ```
   http://localhost:3000
   https://caring-consultation-dashboard.vercel.app   ← 배포 후 추가
   ```
6. **승인된 리디렉션 URI**:
   ```
   http://localhost:3000/api/auth/callback/google
   https://caring-consultation-dashboard.vercel.app/api/auth/callback/google   ← 배포 후 추가
   ```
7. 만들기

→ Client ID와 Secret 표시됨. **즉시 복사**해서 안전한 곳에:
```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

---

## 5️⃣ 서비스 계정 발급 (시트 다운로드용)

1. 같은 페이지(사용자 인증 정보) → **"+ 사용자 인증 정보 만들기"** → **"서비스 계정"**
2. 이름: `caring-consultation-reader`
3. 자동 생성된 이메일 (예: `caring-consultation-reader@caring-consultation-dashboard.iam.gserviceaccount.com`) 메모해두기
4. 만들고 계속하기 → 권한 부여 단계 건너뛰기 → 완료

### 5-1. 키(JSON) 발급

1. 만들어진 서비스 계정 클릭 → **"키"** 탭
2. **"키 추가"** → **"새 키 만들기"** → **JSON** → 만들기
3. JSON 파일 자동 다운로드 — **절대 git에 올리지 마세요**

### 5-2. JSON에서 환경변수 두 개 뽑기

```json
{
  "client_email": "caring-consultation-reader@...iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
}
```

→ `.env.local`에:
```
GOOGLE_SERVICE_ACCOUNT_EMAIL=caring-consultation-reader@caring-consultation-dashboard.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

**Private Key 주의**: JSON의 `\n`(두 글자)을 그대로 따옴표 안에 넣기. Vercel 환경변수도 마찬가지. 코드에서 `.replace(/\\n/g, '\n')`로 변환.

---

## 6️⃣ 시트 4개에 서비스 계정 공유 (절대 빠뜨리지 마세요!)

상담 시트 4개:

| 본부 | 시트 ID |
|---|---|
| 영남 | `1XFx6H1pBjd2AK2zzrmsor4UVoLVsoOKzxSuOipaTo6A` |
| 충청 | `1QERkuUjnUx_oiZ7xEQDYNBTzcpVGQ8uDuOdISH_cvto` |
| 호남 | `1xX9TBmdEOvleie6r_XjjFvuSpPuwI2dhkkHW7TJ-vdg` |
| 수도권1 | `1DcJx3B1Euq0coexAG-EPAJEzm2qECu7dhAsCUhPgo-E` |

각 시트마다:
1. URL `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit` 접속
2. 우상단 **"공유"** 버튼
3. "사용자 및 그룹 추가"에 서비스 계정 이메일 붙여넣기:
   ```
   caring-consultation-reader@caring-consultation-dashboard.iam.gserviceaccount.com
   ```
4. 권한: **"뷰어"**
5. **"알림 보내기" 체크박스 OFF** (서비스 계정은 이메일 못 받음)
6. 공유

→ **4개 시트 모두 반복**. 빠뜨리면 `permission denied` 에러 무조건 뜸.

---

## 7️⃣ 환경변수 최종 정리

`.env.local`에 들어갈 전체:

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32 결과>

# OAuth (사용자 로그인)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# Service Account (시트 다운로드)
GOOGLE_SERVICE_ACCOUNT_EMAIL=caring-consultation-reader@caring-consultation-dashboard.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"

# 상담 시트 ID (그대로 사용)
SHEET_ID_YEONGNAM=1XFx6H1pBjd2AK2zzrmsor4UVoLVsoOKzxSuOipaTo6A
SHEET_ID_CHUNGCHEONG=1QERkuUjnUx_oiZ7xEQDYNBTzcpVGQ8uDuOdISH_cvto
SHEET_ID_HONAM=1xX9TBmdEOvleie6r_XjjFvuSpPuwI2dhkkHW7TJ-vdg
SHEET_ID_METRO1=1DcJx3B1Euq0coexAG-EPAJEzm2qECu7dhAsCUhPgo-E

# Cron Secret
CRON_SECRET=<openssl rand -hex 32 결과>
```

### 비밀 키 생성 명령
Mac/Linux:
```bash
openssl rand -base64 32   # NEXTAUTH_SECRET
openssl rand -hex 32      # CRON_SECRET
```
Windows: https://generate-secret.vercel.app/32 사용

---

## 8️⃣ 배포 후 추가 작업

Vercel 배포 후 도메인(예: `caring-consultation-dashboard.vercel.app`) 나오면:

1. Google Cloud Console → OAuth 클라이언트 다시 열기
2. **승인된 JavaScript 원본** 추가:
   ```
   https://caring-consultation-dashboard.vercel.app
   ```
3. **승인된 리디렉션 URI** 추가:
   ```
   https://caring-consultation-dashboard.vercel.app/api/auth/callback/google
   ```
4. 저장
5. Vercel 환경변수에서 `NEXTAUTH_URL`을 실제 도메인으로 변경 → 재배포

---

## 🆘 자주 발생하는 에러

| 에러 | 원인 | 해결 |
|---|---|---|
| `redirect_uri_mismatch` | OAuth 콘솔의 리디렉트 URI 불일치 | 4단계에서 정확한 URI 등록 |
| `access_denied` | @caring.co.kr 아닌 계정 시도 | 정상 동작 (의도된 차단) |
| `permission denied on Sheet` | 서비스 계정에 공유 안 줌 | 6단계 다시 확인 |
| `Drive API has not been used` | Drive API 활성화 안 함 | 2단계로 돌아가 활성화 ⭐ |
| `invalid_grant` | Private Key 형식 깨짐 | 환경변수 줄바꿈 처리 확인 |

---

## ✅ 완료 체크리스트

- [ ] 새 GCP 프로젝트 생성
- [ ] **Sheets API** 활성화
- [ ] **Drive API** 활성화 ⭐ (상담 대시보드 필수)
- [ ] OAuth 동의 화면 "Internal" 설정
- [ ] OAuth 클라이언트 ID + Secret 발급 및 저장
- [ ] 서비스 계정 발급 (`caring-consultation-reader`)
- [ ] 서비스 계정 JSON 키 다운로드
- [ ] **시트 4개**에 서비스 계정 "뷰어" 공유
- [ ] `.env.local` 환경변수 정리
- [ ] (배포 후) 실제 도메인을 OAuth URI에 추가

여기까지 끝나면 VS Code + Claude Code로 본격 개발 시작!
