# 🤝 HANDOFF — VS Code Claude Code에게

> 이 문서를 VS Code에서 Claude Code에게 처음에 보여주세요.  
> 지금까지의 채팅 컨텍스트를 한 번에 따라잡을 수 있도록 압축한 문서입니다.

---

## 👤 사용자 (User)

- **이름**: 황우령
- **소속**: 케어링(Caring) 마케팅팀 PM
- **회사 도메인**: `@caring.co.kr`
- **담당 영역**: 약 60개 데이케어·요양센터 대상 네이버 광고/SEO 블로그/CRM/오프라인 마케팅
- **기술 배경**: 마케팅 PM이지만 코드 친숙도 높음. 블링이(`aring.caring.co.kr/bling`, Next.js + Gemini)와 caring-lilac CRM 대시보드 운영 경험. Notion, Slack, Google Drive MCP 적극 활용.
- **현재 운영 자산**:
  - 마케팅 총공 대시보드 (v11, 정적 HTML, 매번 클로드한테 빌드 요청)
  - 상담 대시보드 (4개 본부 5개 시트 집계, 5,526건)

---

## 🎯 이 프로젝트 목표

**케어링 상담 대시보드를 Vercel에 배포**하되, 다음 조건을 모두 만족해야 함:

| 요구사항 | 결정 사항 |
|---|---|
| **인증** | `@caring.co.kr` 구글 SSO만 통과 (NextAuth + Google Provider + `hd` 옵션 + signIn 콜백에서 도메인 검증) |
| **데이터 갱신 - 자동** | 매일 새벽 3시 KST (Vercel Cron) |
| **데이터 갱신 - 수동** | 화면 우상단 "🔄 새로고침" 버튼 |
| **렌더링** | ISR (Incremental Static Regeneration) — 평소 빠른 로딩, 트리거 시 백그라운드 재생성 |
| **데이터 소스** | Google Sheets 4개 본부 상담시트 (영남·충청·호남·수도권1) |
| **시트 fetch 방식** | Drive API의 `files.export`로 xlsx 통째 다운로드 → SheetJS로 파싱 |
| **배포 플랫폼** | Vercel (Hobby 시작, 필요시 Pro) |
| **작업 환경** | VS Code + Claude Code |

---

## 📊 데이터 구조

### 4개 본부 시트 ID
```
영남:     1XFx6H1pBjd2AK2zzrmsor4UVoLVsoOKzxSuOipaTo6A
충청:     1QERkuUjnUx_oiZ7xEQDYNBTzcpVGQ8uDuOdISH_cvto
호남:     1xX9TBmdEOvleie6r_XjjFvuSpPuwI2dhkkHW7TJ-vdg
수도권1:  1DcJx3B1Euq0coexAG-EPAJEzm2qECu7dhAsCUhPgo-E
```

### 각 시트의 5개 탭
- 등급신청
- 유선상담
- 대면상담
- 계약상담
- 상담요청

### 각 행에서 추출할 컬럼
- `담당자` (예: `"[김해 봉황점] 김복지 사회복지사"`) → 센터명 추출 + 별칭 변환
- `상담일` (날짜 또는 Excel 시리얼 넘버)
- `유입경로` (인터넷/지인소개/현수막/전단지/송영차량/케어마스터/고객컨택팀/간판/기타)

### 센터명 정규화 (CENTER_ALIASES)
```python
{
  "김해 봉황점": "김해점",
  "대구서구점": "대구 서구점",
  "양산 물금점": "양산점",
  "천안 서북구점": "천안점",
  "광주 봄날점 사회복지사": "광주 봄날점",
  "봄날점": "광주 봄날점",
  "광주 북구점 사회복지사": "광주 북구점",
  "수도권1": "수도권1본부 (기타)",
  "성장기획팀, 성장지원팀": "본사 성장팀"
}
```

### 현재 데이터 규모 (참고)
- 총 5,526건
- 날짜 범위: 2025-03-27 ~ 2026-05-16
- 본부별 센터: 영남 12 / 호남 8 / 수도권1 5 / 충청 4

---

## ⚠️ 진행 상황 (어디까지 왔나)

### ✅ 완료
1. 상담 대시보드 정적 HTML 빌드 시스템 (`legacy/parse.py` + `legacy/build.py`)
2. Vercel 배포 방향성 확정 (위 요구사항)
3. 프로젝트 사양서 (`README.md`) 작성
4. Google Cloud 발급 가이드 (`GOOGLE_CLOUD_SETUP.md`) 작성
5. 환경변수 템플릿 (`.env.example`) 작성

### ⏳ 우령님이 직접 하실 것 (Claude Code 작업 시작 전)
1. **Google Cloud Console에서 30분 작업** — `GOOGLE_CLOUD_SETUP.md` 참고
   - 새 GCP 프로젝트 생성 (`caring-consultation-dashboard`)
   - Sheets API + **Drive API** (둘 다!) 활성화
   - OAuth 동의 화면 "Internal" 설정 (Workspace 권한 필요)
   - OAuth 클라이언트 ID 발급 → Client ID + Secret
   - 서비스 계정 발급 → JSON 키 다운로드
   - **시트 4개에 서비스 계정 "뷰어" 공유** (가장 자주 빼먹는 단계!)
2. `.env.example` → `.env.local` 복사 후 위에서 받은 값들 채우기

### 🚧 Claude Code가 할 것 (지금부터)
**단계별로** 진행. 한 번에 다 만들지 말고 각 단계마다 동작 확인.

---

## 🛠️ Claude Code 작업 단계

### 1단계: MVP — 인증 + 정적 HTML 표시 (예상 30분)
- Next.js 14 + TypeScript + App Router로 프로젝트 골격 세팅
- Tailwind CSS 설치
- NextAuth.js v4 설치 + `@caring.co.kr` 도메인 잠금
- `legacy/consultation.html`을 `app/page.tsx`에서 `dangerouslySetInnerHTML`로 그대로 표시
- `npm run dev`로 로컬 확인 → 로그인 → 대시보드 표시

**이 단계에서는 시트 fetch 안 함.** HTML 그대로 박아두고 인증 + 라우팅만 검증.

### 2단계: GitHub Push + Vercel 첫 배포 (예상 30분)
- `git init` → private 레포 → push
- Vercel에서 import → 환경변수 입력 → Deploy
- 배포 URL을 Google OAuth 콘솔의 "승인된 리디렉션 URI"에 추가
- `NEXTAUTH_URL` 환경변수를 실제 도메인으로 업데이트 → 재배포

이 단계 끝나면 우령님이 실제 도메인으로 접속해서 SSO 로그인 흐름 확인 가능.

### 3단계: 시트 fetch 로직 작성 (예상 2시간)
- `lib/data/consultation.ts` 작성
- `legacy/parse.py`의 로직을 TypeScript로 포팅:
  - `parse_center()` — 담당자 컬럼에서 `[센터명]` 추출 + CENTER_ALIASES 적용
  - `parse_month()` — 날짜 또는 Excel 시리얼 넘버 처리
  - `normalize_channel()` — 유입경로 정규화
  - 집계 함수 (본부별/센터별/월별/유입경로별)
- `googleapis` + `xlsx` (SheetJS) 패키지 사용
- `app/page.tsx`에서 `getConsultationData()` 호출 + ISR (`export const revalidate = 86400`)
- React 컴포넌트 (`components/ConsultationDashboard.tsx`)로 점진적 마이그레이션
- 화면 우상단에 "🔄 새로고침" 버튼 추가 → `/api/refresh` 호출

### 4단계: Cron 자동 갱신 (예상 15분)
- `vercel.json`에 Cron 설정 추가:
  ```json
  {
    "crons": [
      { "path": "/api/revalidate", "schedule": "0 18 * * *" }
    ]
  }
  ```
  > 18:00 UTC = 03:00 KST 다음날
- `app/api/revalidate/route.ts` 작성:
  ```typescript
  export async function GET(request: Request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    revalidatePath("/");
    return NextResponse.json({ revalidated: true, now: Date.now() });
  }
  ```
- 배포 후 Vercel 대시보드의 Cron Jobs 탭에서 등록 확인

### 5단계: 새로고침 버튼 (예상 30분)
- `components/RefreshButton.tsx` — 누르면 `/api/refresh` POST
- `app/api/refresh/route.ts`:
  - NextAuth 세션 검증 (로그인된 caring 직원만 호출 가능)
  - `revalidatePath("/")` 호출
  - 클라이언트는 응답 받으면 페이지 자동 새로고침

---

## 🔑 핵심 코드 패턴

### NextAuth 도메인 잠금 (lib/auth.ts)
```typescript
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: { hd: "caring.co.kr" },  // UI 힌트
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      // ⚠️ hd는 힌트일 뿐, 실제 검증은 여기서
      const email = (profile as any)?.email ?? "";
      const hd = (profile as any)?.hd ?? "";
      return email.endsWith("@caring.co.kr") || hd === "caring.co.kr";
    },
  },
  pages: { signIn: "/auth/signin", error: "/auth/signin" },
};
```

### Google Drive에서 xlsx 다운로드 (lib/google-drive.ts)
```typescript
import { google } from "googleapis";

export async function getDriveClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
    ],
  });
  return google.drive({ version: "v3", auth });
}

export async function downloadXlsx(fileId: string): Promise<Buffer> {
  const drive = await getDriveClient();
  const res = await drive.files.export(
    {
      fileId,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}
```

### xlsx 파싱 (lib/data/consultation.ts)
```typescript
import * as XLSX from "xlsx";
import aliases from "./center-aliases.json";

const TABS = ["등급신청", "유선상담", "대면상담", "계약상담", "상담요청"];

function parseCenter(raw: string | null): string | null {
  if (!raw) return null;
  const match = String(raw).match(/\[([^\]]+)\]/);
  if (!match) return null;
  let inside = match[1].trim();
  inside = inside.replace(/\s*(센터장|복지팀장|본부)\s*$/, "");
  inside = inside.replace(/\([^)]*\)/g, "").trim();
  if (!inside) return null;
  return (aliases.aliases as Record<string, string>)[inside] ?? inside;
}

function parseDate(val: any): string | null {
  if (val == null) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === "number") {
    // Excel serial number → JS Date
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().slice(0, 10);
  }
  const m = String(val).match(/(\d{4})[-./](\d{1,2})[-./]?(\d{1,2})?/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${(m[3] || "01").padStart(2, "0")}` : null;
}

export async function getConsultationData() {
  // 4개 시트 다운로드 → 파싱 → 집계
  // legacy/parse.py 로직 그대로 포팅
}
```

### Vercel Cron + Revalidate (app/api/revalidate/route.ts)
```typescript
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  revalidatePath("/");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
```

> Vercel Cron은 자동으로 `Authorization: Bearer ${CRON_SECRET}` 헤더를 붙여서 호출.

---

## 📁 폴더 안에 있는 파일들 (Claude Code가 참고할 것)

```
vercel_setup/
├── HANDOFF.md                ← 이 문서 (가장 먼저 읽기)
├── README.md                  ← 상세 프로젝트 사양서
├── GOOGLE_CLOUD_SETUP.md      ← 우령님이 이미 따라했거나 따라할 가이드
├── QUICK_START.md             ← 전체 흐름 요약
├── .env.example               ← 환경변수 템플릿
└── legacy/
    ├── consultation.html       ← 현재 상담 대시보드 HTML (820KB) — 1단계 MVP에서 dangerouslySetInnerHTML로 그대로 사용
    ├── parse.py                ← TypeScript로 포팅할 원본 파싱 로직 (3단계)
    ├── build.py                ← HTML 빌드 (참고용)
    ├── template.html           ← HTML 템플릿 (참고용, 컴포넌트화 시 참조)
    └── center_aliases.json     ← 센터명 별칭 (TypeScript에서 그대로 import)
```

---

## ⚠️ 주의사항 / 빠지기 쉬운 함정

1. **Drive API 활성화** ⭐
   - Sheets API만 켜면 xlsx export 안 됨
   - Sheets API + Drive API **둘 다** 켜야 함
   - 안 켜면 `Drive API has not been used` 에러

2. **시트 공유 빼먹기**
   - 서비스 계정은 별도 사용자라서, 4개 시트 모두에 "뷰어"로 공유 안 하면 `permission denied`
   - 공유할 때 "알림 보내기" 체크박스 OFF

3. **Private Key 줄바꿈 처리**
   - JSON에 있는 `\n`(두 글자)을 그대로 환경변수에 넣고
   - 코드에서 `.replace(/\\n/g, '\n')`로 변환
   - 변환 안 하면 `invalid_grant` 에러

4. **NextAuth `hd` 옵션은 보안 아님**
   - 로그인 화면 힌트일 뿐
   - 반드시 `signIn` 콜백에서 이메일 도메인 직접 검증

5. **Vercel Hobby 플랜 한도**
   - Cron: 하루 1회까지 무료 → 새벽 3시 1회로 OK
   - 함수 실행 시간: 10초 (Hobby) / 60초 (Pro)
   - 시트 4개 fetch + 파싱 ~5초 예상 → Hobby도 충분

6. **xlsx 파일 크기**
   - 4개 합계 약 1.8MB. 메모리 처리 OK (Vercel 함수 메모리 한도 1024MB).
   - 빈 행이 시트당 1000행씩 있음. `XLSX.utils.sheet_to_json`에 `defval: null` 옵션 사용.

7. **현재 상담 HTML이 820KB로 큼**
   - 5,526 detail row가 임베드돼 있음
   - 1단계 MVP에서는 그대로 사용해도 OK
   - 추후 최적화: detail row는 별도 API endpoint로 lazy load

---

## 🎬 첫 메시지 추천 (Claude Code에게)

```
이 폴더의 HANDOFF.md를 먼저 읽어줘. 그 다음 README.md, GOOGLE_CLOUD_SETUP.md, 
legacy/ 폴더도 살펴봐.

내가 Google Cloud 설정은 이미 완료했고 .env.local도 채워둔 상태야.

지금부터 1단계 MVP를 만들어줘:
- Next.js 14 + TypeScript + App Router + Tailwind
- NextAuth.js로 @caring.co.kr 도메인 잠금 (signIn 콜백에서 검증)
- 메인 페이지(/)에 legacy/consultation.html을 dangerouslySetInnerHTML로 그대로 표시
- 로그인 페이지 (/auth/signin)
- 미들웨어로 비로그인 사용자 차단

시트 자동 fetch와 Cron은 2단계, 3단계에서 진행할 거니까 지금은 신경 쓰지 마.
localhost:3000에서 npm run dev로 동작 확인되는 수준까지만.
```

---

## 🎯 끝나면 어떻게 되는지

배포 완료 시점:
- `https://caring-consultation-dashboard.vercel.app` (또는 회사 도메인) 접속
- 구글 로그인 → `@caring.co.kr` 계정만 통과
- 통과하면 현재의 상담 대시보드가 그대로 표시
- 우상단 "🔄 새로고침" 버튼으로 즉시 시트 재fetch
- 매일 새벽 3시 KST 자동 갱신
- 마케팅팀 + 본부장님들에게 URL 공유 → 끝

---

## 💬 막혔을 때

1. Claude Code에서 에러 → 에러 메시지 그대로 복붙해서 다시 물어보기
2. Google Cloud 설정 단계 → `GOOGLE_CLOUD_SETUP.md` 의 "자주 발생하는 에러" 표 참고
3. 그래도 안 되면 → claude.ai 채팅에서 이 HANDOFF.md 참고했다고 말하면 빠르게 따라잡을 수 있음

---

## 📌 우령님 메모

- 회사: 케어링 (Caring), 마케팅팀
- Notion 워크스페이스: `caring1`
- Slack 핵심 채널: `#01_성장f_마케팅팀` (C05E7SRR4S0)
- Slack 본인 ID: U063AQ0UCSX
- 주요 동료: 오주영(광고 운영), 강주화(콘텐츠/디자인), 백선주(현장/오프라인), 김두영(마케팅 리드)
- 마케팅 총공 대시보드 v11은 이미 별도 운영 중 (이번 Vercel 프로젝트는 **상담 대시보드 전용**)
