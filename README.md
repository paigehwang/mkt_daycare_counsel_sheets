# Caring Consultation Dashboard — Vercel Edition

황우령(케어링 마케팅 PM)의 **케어링 주간보호 상담 대시보드**(4개 본부 5개 시트, 약 5,500+ 건)를 Vercel에 배포하기 위한 Next.js 프로젝트.

> 이 프로젝트는 **상담 대시보드 전용**입니다. 마케팅 총공 대시보드(v11)는 별도 프로젝트로 분리하거나 추후 같은 앱에 페이지 하나 더 추가하는 방식으로 진행.

---

## 🎯 핵심 요구사항

| 항목 | 내용 |
|---|---|
| **인증** | `@caring.co.kr` 도메인 구글 계정만 접근 가능 |
| **데이터 소스** | Google Sheets 4개 본부 상담시트 (영남·충청·호남·수도권1), 각 5개 탭 |
| **갱신 주기** | 매일 새벽 3시 KST 자동 갱신 + 화면 우상단 "🔄 새로고침" 버튼 |
| **렌더링** | ISR (Incremental Static Regeneration) — 빠른 로딩 + 백그라운드 재생성 |
| **배포** | Vercel |

---

## 📐 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│                       사용자 (브라우저)                          │
└─────────────────┬────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────┐
│           NextAuth Middleware (/middleware.ts)                │
│   @caring.co.kr 아님 → 거부                                    │
└─────────────────┬────────────────────────────────────────────┘
                  │ 인증 통과
                  ▼
┌──────────────────────────────────────────────────────────────┐
│              app/page.tsx (상담 대시보드)                       │
│              ISR: revalidate = 86400 (24h)                    │
└─────────────────┬────────────────────────────────────────────┘
                  │ 빌드 시 / revalidate 시
                  ▼
┌──────────────────────────────────────────────────────────────┐
│         lib/data/consultation.ts → getConsultationData()      │
│   - 4개 본부 xlsx를 Google Drive API로 export                  │
│   - 각 5개 탭(등급신청·유선상담·대면상담·계약상담·상담요청) 파싱   │
│   - CENTER_ALIASES 적용                                       │
│   - 본부별 / 센터별 / 월별 / 유입경로별 집계                      │
└─────────────────┬────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────┐
│            Google Drive API (서비스 계정 인증)                  │
│            export to xlsx → 메모리에서 파싱                     │
└──────────────────────────────────────────────────────────────┘

별도 트리거:
- 매일 새벽 3시 KST: Vercel Cron → /api/revalidate
- 화면 새로고침 버튼 → /api/refresh
```

---

## 📁 디렉토리 구조

```
caring-consultation-dashboard/
├── README.md
├── .env.example
├── .env.local                    ← .gitignore
├── .gitignore
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
├── vercel.json                   ← Cron 설정
├── middleware.ts                 ← NextAuth 미들웨어
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  ← 상담 대시보드 메인
│   ├── auth/
│   │   └── signin/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── revalidate/route.ts   ← Cron이 호출
│       └── refresh/route.ts      ← UI 버튼이 호출
│
├── components/
│   ├── ConsultationDashboard.tsx ← 메인 컴포넌트
│   ├── RefreshButton.tsx
│   ├── SignInScreen.tsx
│   └── charts/                   ← 차트 컴포넌트들 (선택)
│
└── lib/
    ├── auth.ts                   ← NextAuth 설정
    ├── google-drive.ts           ← Drive API 클라이언트
    └── data/
        ├── consultation.ts       ← 메인 fetch + 파싱 로직
        ├── xlsx-parser.ts        ← xlsx 파싱 헬퍼
        ├── center-aliases.ts     ← CENTER_ALIASES dict
        └── types.ts              ← 타입 정의
```

---

## 🔑 환경변수 (.env.local)

```bash
# NextAuth
NEXTAUTH_URL=http://localhost:3000   # 배포 시 https://your-app.vercel.app
NEXTAUTH_SECRET=                      # openssl rand -base64 32

# Google OAuth (사용자 로그인용)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Google Service Account (시트 다운로드용)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=

# 상담 시트 ID 4개 (그대로 사용)
SHEET_ID_YEONGNAM=1XFx6H1pBjd2AK2zzrmsor4UVoLVsoOKzxSuOipaTo6A
SHEET_ID_CHUNGCHEONG=1QERkuUjnUx_oiZ7xEQDYNBTzcpVGQ8uDuOdISH_cvto
SHEET_ID_HONAM=1xX9TBmdEOvleie6r_XjjFvuSpPuwI2dhkkHW7TJ-vdg
SHEET_ID_METRO1=1DcJx3B1Euq0coexAG-EPAJEzm2qECu7dhAsCUhPgo-E

# Cron 인증
CRON_SECRET=                       # openssl rand -hex 32
```

---

## 🏗️ 기술 스택

- **Framework**: Next.js 14 (App Router)
- **언어**: TypeScript
- **스타일**: Tailwind CSS (기존 HTML은 일단 dangerouslySetInnerHTML로 사용, 점진적 React 컴포넌트화)
- **인증**: NextAuth.js v4
- **시트 다운로드**: `googleapis` 패키지 (Drive API의 `files.export`)
- **xlsx 파싱**: `xlsx` (SheetJS) 패키지
- **배포**: Vercel

---

## 🔐 NextAuth 핵심 설정 (lib/auth.ts)

```typescript
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          hd: "caring.co.kr",  // 로그인 화면 힌트 (검증은 별도)
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      // 보안 검증 — @caring.co.kr 이메일만 통과
      const email = (profile as any)?.email ?? "";
      const hd = (profile as any)?.hd ?? "";
      return email.endsWith("@caring.co.kr") || hd === "caring.co.kr";
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin",
  },
};
```

---

## 📥 시트 fetch 로직 (lib/data/consultation.ts)

기존 `legacy/parse.py`의 로직을 TypeScript로 포팅한 핵심 흐름:

```typescript
import { google } from "googleapis";
import * as XLSX from "xlsx";
import { CENTER_ALIASES } from "./center-aliases";

const SHEET_IDS = {
  영남: process.env.SHEET_ID_YEONGNAM!,
  충청: process.env.SHEET_ID_CHUNGCHEONG!,
  호남: process.env.SHEET_ID_HONAM!,
  수도권1: process.env.SHEET_ID_METRO1!,
};

const TABS = ["등급신청", "유선상담", "대면상담", "계약상담", "상담요청"];

async function getDriveClient() {
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

async function downloadXlsx(drive: any, fileId: string): Promise<Buffer> {
  // Google Sheets를 xlsx로 export
  const res = await drive.files.export(
    {
      fileId,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

export async function getConsultationData() {
  const drive = await getDriveClient();
  
  const allRows: any[] = [];
  
  for (const [bonbu, sheetId] of Object.entries(SHEET_IDS)) {
    const buffer = await downloadXlsx(drive, sheetId);
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    
    for (const tabName of TABS) {
      const sheet = workbook.Sheets[tabName];
      if (!sheet) continue;
      
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: null });
      
      for (const row of rows) {
        const center = parseCenter(row["담당자"]);
        if (!center) continue;
        
        allRows.push({
          본부: bonbu,
          시트: tabName,
          센터: center,
          상담일: parseDate(row["상담일"]),
          유입경로: normalizeChannel(row["유입경로"]),
        });
      }
    }
  }
  
  return aggregate(allRows);
}

function parseCenter(raw: string | null): string | null {
  if (!raw) return null;
  const match = String(raw).match(/\[([^\]]+)\]/);
  if (!match) return null;
  let inside = match[1].trim();
  inside = inside.replace(/\s*(센터장|복지팀장|본부)\s*$/, "");
  inside = inside.replace(/\([^)]*\)/, "").trim();
  if (!inside) return null;
  return CENTER_ALIASES[inside] ?? inside;
}

// parseDate, normalizeChannel, aggregate 등은 legacy/parse.py 참고
```

**핵심 포인트**:
- `legacy/parse.py`의 `parse_center`, `parse_month`, `normalize_channel` 로직을 그대로 TS로 옮기기
- Excel 시리얼 넘버 처리는 `XLSX.SSF` 또는 직접 `new Date(1899, 11, 30 + serial * 86400000)`
- CENTER_ALIASES는 `legacy/center_aliases.json` 그대로 import

---

## 📅 Vercel Cron 설정 (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/revalidate",
      "schedule": "0 18 * * *"
    }
  ]
}
```

> 18:00 UTC = 03:00 KST (다음날). 새벽 시간대 갱신.

---

## 🔄 Revalidate API (app/api/revalidate/route.ts)

```typescript
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Vercel Cron이 자동으로 Authorization: Bearer ${CRON_SECRET} 헤더 추가
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  revalidatePath("/");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
```

---

## 🚀 배포 단계

1. **로컬 개발**
   ```bash
   npm install
   cp .env.example .env.local
   # .env.local 채우기 (GOOGLE_CLOUD_SETUP.md 참고)
   npm run dev
   ```

2. **GitHub Push**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create caring-consultation-dashboard --private --source=. --push
   ```

3. **Vercel 연동**
   - https://vercel.com/new에서 GitHub 레포 import
   - Environment Variables에 `.env.local` 내용 그대로 입력
   - Deploy

4. **OAuth Redirect URI 추가**
   - 배포 URL을 Google Cloud Console OAuth 클라이언트에 추가:
     ```
     https://caring-consultation-dashboard.vercel.app/api/auth/callback/google
     ```

5. **NEXTAUTH_URL 업데이트**
   - Vercel 환경변수에서 `NEXTAUTH_URL`을 실제 도메인으로 변경 → 재배포

---

## 📊 기존 자산 (legacy 폴더)

Claude Code가 참고할 파일:

- `legacy/consultation.html` — 현재 운영 중인 상담 대시보드 HTML (820KB, 5,526건 기준)
- `legacy/parse.py` — Python 파싱 로직 (TypeScript로 포팅 원본)
- `legacy/build.py` — HTML 빌드 로직 (참고용, Next.js에서는 다른 방식)
- `legacy/template.html` — 빌드 템플릿 (참고용, 컴포넌트화 시 참조)
- `legacy/center_aliases.json` — 센터명 별칭 매핑 (그대로 import)

---

## ⚠️ 주의사항

1. **서비스 계정 권한** — Sheets API뿐만 아니라 **Drive API도 활성화** 필요 (xlsx export 기능 때문)
2. **xlsx 파일 크기** — 각 본부 시트가 300~750KB. 4개 합치면 약 1.8MB. 메모리에서 처리되므로 Vercel 함수 메모리 제한(1024MB) 안 넘김.
3. **함수 실행 시간** — Hobby 플랜 10초 한도. 시트 4개 fetch + 파싱 ~5초 예상. 시간 초과 시 Pro 플랜(60초) 필요.
4. **빈 행 처리** — 시트당 1000행씩 빈 행이 있음. `XLSX.utils.sheet_to_json`이 알아서 처리하지만 `defval: null` 옵션으로 확실히.
5. **Excel 시리얼 넘버 ↔ 날짜** — `cellDates: true` 옵션 사용. 또는 수동 변환 (1899-12-30 기준).
6. **HTML 사이즈** — 기존 HTML이 820KB로 큰 편. ISR 캐싱으로 사용자에게 가는 응답은 빨라지지만, 빌드 시점에 5,526 detail row를 JSON으로 임베드하면 페이지 크기 증가. **개선 옵션**:
   - detail rows는 별도 API endpoint에서 lazy load
   - 집계 데이터만 페이지에 임베드, 상세는 클릭 시 fetch
   - 일단은 1단계에서 무시하고 2단계 최적화 작업

---

## 🎬 Claude Code 시작 멘트 예시

```
이 폴더의 README.md와 legacy/ 전체를 읽어줘.

1단계 MVP를 만들어줘:
- Next.js 14 + TypeScript + App Router
- NextAuth로 @caring.co.kr 도메인 잠금
- 메인 페이지(/)에 legacy/consultation.html을 dangerouslySetInnerHTML로 그대로 표시
- .env.example 잘 정비
- 로컬에서 npm run dev 동작 확인되는 수준

데이터 자동 fetch는 그 다음 단계에서 진행할 테니까 지금은 신경 쓰지 마.
```
