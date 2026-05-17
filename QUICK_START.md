# 🚀 케어링 상담 대시보드 Vercel 배포 — Quick Start

우령님이 요청하신 **케어링 상담 대시보드**(4개 본부 5,526건)를 Vercel에 배포하기 위한 자료 모음입니다.

## 📦 폴더 구성

```
vercel_setup/
├── QUICK_START.md            ← 지금 보는 이 파일
├── README.md                  ← Claude Code에게 줄 프로젝트 사양서
├── GOOGLE_CLOUD_SETUP.md      ← OAuth + 서비스 계정 발급 가이드 (30분)
├── .env.example               ← 환경변수 템플릿
└── legacy/
    ├── consultation.html       ← 기존 상담 대시보드 (포팅 원본)
    ├── parse.py                ← 4개 본부 xlsx 파싱 로직 (TypeScript로 포팅)
    ├── build.py                ← HTML 빌드 로직 (참고용)
    ├── template.html           ← HTML 템플릿 (참고용)
    └── center_aliases.json     ← 센터명 별칭 매핑
```

## ⚙️ 요구사항 (우령님이 정하신 것)

| 항목 | 설정 |
|---|---|
| 데이터 소스 | Google Sheets 4개 (영남·충청·호남·수도권1) |
| 인증 | `@caring.co.kr` 구글 SSO만 통과 |
| 갱신 | 매일 새벽 3시 KST 자동 + 화면 새로고침 버튼 |
| 배포 | Vercel |
| 작업 도구 | VS Code + Claude Code |

## 🗺️ 진행 순서

### 1단계 — Google Cloud 콘솔 (오늘, 30분) — 우령님 직접
`GOOGLE_CLOUD_SETUP.md` 보고 따라하기. 끝나면:
- OAuth Client ID + Secret 1쌍 (사용자 로그인용)
- 서비스 계정 JSON 키 (시트 fetch용)
- 4개 본부 시트에 서비스 계정 "뷰어" 공유 완료

### 2단계 — VS Code + Claude Code (1~2시간)
이 폴더 통째로 VS Code에서 열고, Claude Code에게:

> "이 폴더의 README.md와 legacy/ 안에 있는 자료 다 읽어봐.  
> Next.js 14 + TypeScript 프로젝트를 만들어줘.  
> 1단계 MVP는 NextAuth 도메인 잠금 + 기존 HTML을 그대로 표시하는 수준이면 OK.  
> 시트 자동 fetch는 그 다음 단계로 갈게."

### 3단계 — GitHub Push + Vercel 배포 (30분)
로컬 `npm run dev`로 검증되면 GitHub 푸시 → Vercel import → 환경변수 입력 → Deploy.

### 4단계 — 시트 자동 fetch 추가 (2시간)
Claude Code에게:
> "이제 `lib/data/consultation.ts` 만들어줘.  
> `legacy/parse.py` 로직을 TypeScript로 포팅해서 Google Sheets API로 4개 본부 시트 직접 fetch하도록.  
> page.tsx는 ISR(`revalidate = 86400`)로 캐싱."

### 5단계 — Cron 자동 갱신 (15분)
> "vercel.json에 Cron 추가하고 /api/revalidate 엔드포인트 만들어줘.  
> 매일 새벽 3시 KST에 자동 재생성."

## ⏰ 총 예상 시간: 4~5시간

오늘 1단계 끝내고 내일 2~5단계 집중하면 하루 안에 끝낼 수 있어요.

## 💡 상담 대시보드 배포의 특수성

마케팅 총공 대시보드와 다르게 **상담 대시보드만의 고려사항**:

1. **데이터 양이 큼** (현재 5,526행)
   - 빌드 시간이 더 걸림 (시트 4개 × 5탭 = 20개 fetch)
   - ISR 캐싱이 더 중요 — 매 페이지 요청마다 fetch하면 안 됨
   - HTML 파일이 820KB 정도 — Vercel은 문제없지만 모바일 로딩 고려해서 압축/스트리밍 검토

2. **xlsx 파싱 로직**
   - 정적 빌드 시는 openpyxl이 편하지만, Next.js에서는 `xlsx` (SheetJS) 또는 `exceljs` 사용
   - Excel 시리얼 넘버 → 날짜 변환 로직 그대로 포팅 필요 (1899-12-30 기준)
   - 빈 행 처리 (시트당 1000행씩 있음 — max_row 기준 카운트 금지)

3. **시트 다운로드 방식**
   - Google Sheets API는 보통 셀 단위 fetch
   - xlsx 통째 다운로드는 Google Drive API의 `export` 사용 (`mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
   - **서비스 계정에 Drive API 활성화도 필요** — Sheets API만으로 안 됨

4. **새벽 갱신 시점 주의**
   - 매일 새벽 3시 KST = 18:00 UTC
   - 상담 시트는 센터장님들이 새벽까지 입력하시는 경우 있어서 너무 이른 시간은 NG
   - **새벽 5시(20:00 UTC) 정도가 안전할 수도** — 우령님이 결정

## 🆘 막혔을 때

- Claude Code 에러 → 그대로 복붙해서 클로드한테 디버깅 요청
- Google Cloud 단계 → 캡처해서 저(채팅 클로드)한테 보여주세요
- 시트 권한 에러 → `permission denied` 뜨면 거의 100% 서비스 계정 공유 빠뜨린 거임
