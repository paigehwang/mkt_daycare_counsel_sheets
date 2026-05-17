import { getSheetsClient } from "@/lib/google-sheets"
import aliasesJson from "@/legacy/center_aliases.json"

const CENTER_ALIASES = aliasesJson.aliases as Record<string, string>

const SHEET_IDS: Record<string, string> = {
  영남: process.env.SHEET_ID_YEONGNAM!,
  충청: process.env.SHEET_ID_CHUNGCHEONG!,
  호남: process.env.SHEET_ID_HONAM!,
  수도권1: process.env.SHEET_ID_METRO1!,
}

type StageInfo = { name: string; resultCol: number; dateCol: number }

// dateCol = 이 단계 결과 이후 다음 액션 예정일이 있는 컬럼
const STAGES: Record<string, StageInfo[]> = {
  등급신청: [
    { name: "접수",       resultCol: 13, dateCol: 14 },
    { name: "인정조사",   resultCol: 16, dateCol: 17 },
    { name: "의사소견서", resultCol: 19, dateCol: 20 },
    { name: "등급판정",   resultCol: 22, dateCol: 24 },
    { name: "상담",       resultCol: 23, dateCol: 24 },
    { name: "1차 아웃콜", resultCol: 26, dateCol: 27 },
    { name: "2차 아웃콜", resultCol: 29, dateCol: 30 },
    { name: "3차 아웃콜", resultCol: 32, dateCol: 33 },
  ],
  유선상담: [
    { name: "상담",       resultCol: 8,  dateCol: 9  },
    { name: "1차 아웃콜", resultCol: 11, dateCol: 12 },
    { name: "2차 아웃콜", resultCol: 14, dateCol: 15 },
    { name: "3차 아웃콜", resultCol: 17, dateCol: 18 },
  ],
  대면상담: [
    { name: "상담",       resultCol: 9,  dateCol: 10 },
    { name: "1차 아웃콜", resultCol: 12, dateCol: 13 },
    { name: "2차 아웃콜", resultCol: 15, dateCol: 16 },
    { name: "3차 아웃콜", resultCol: 18, dateCol: 19 },
  ],
  계약상담: [
    { name: "급여개시",   resultCol: 13, dateCol: 14 },
    { name: "1차 아웃콜", resultCol: 16, dateCol: 17 },
    { name: "2차 아웃콜", resultCol: 19, dateCol: 20 },
    { name: "3차 아웃콜", resultCol: 22, dateCol: 23 },
  ],
}

const CENTER_EXCLUDE = new Set(["본사 성장팀"])

function parseCenter(raw: string | null): string | null {
  if (!raw) return null
  const m = String(raw).match(/\[([^\]]+)\]/)
  if (!m) return null
  let inside = m[1].trim()
  inside = inside.replace(/\s*(센터장|복지팀장|본부)\s*$/, "")
  inside = inside.replace(/\([^)]*\)/g, "").trim()
  if (!inside) return null
  const name = CENTER_ALIASES[inside] ?? inside
  if (CENTER_EXCLUDE.has(name)) return null
  return name
}

function parseDate(val: string | null | undefined): string | null {
  const s = (val || "").trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`
  const m2 = s.match(/^(\d{1,2})[.\/-](\d{1,2})$/)
  if (m2) return `${new Date().getFullYear()}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`
  return null
}

// "2026-05-18" → "5/18"
function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  const m = iso.match(/\d{4}-(\d{2})-(\d{2})/)
  return m ? `${parseInt(m[1])}/${parseInt(m[2])}` : null
}

// "보류 (2차 아웃콜 예정)" → "2차 아웃콜 예정"
// "완료" at 인정조사 stage → "인정조사 완료"
// 그 외는 원본 그대로
function getDisplayLabel(raw: string, stageName: string): string {
  const r = raw.trim()
  const boruMatch = r.match(/보류\s*[\(（](.+?)[\)）]/)
  if (boruMatch) return boruMatch[1].trim()
  if (r === "완료" || r === "발급") return `${stageName} ${r}`
  return r
}

type Analysis = {
  status: "in_progress" | "converted" | "dropped" | "pending"
  stage: string        // 표시용 레이블 (정제된 값)
  nextDate: string | null  // ISO 날짜 (정렬용)
  displayDate: string | null  // "5/18" 포맷 (화면 표시용)
  convertedTo: string | null
}

function analyzeCase(row: (string | null | undefined)[], stages: StageInfo[]): Analysis {
  let lastIdx = -1
  let lastResult = ""

  for (let i = 0; i < stages.length; i++) {
    const r = (row[stages[i].resultCol] ?? "").trim()
    if (r) { lastIdx = i; lastResult = r }
  }

  if (lastIdx === -1)
    return { status: "pending", stage: "—", nextDate: null, displayDate: null, convertedTo: null }

  const r = lastResult
  const stageName = stages[lastIdx].name
  const rawNextDate = parseDate(row[stages[lastIdx].dateCol] as string)
  const displayDate = fmtDate(rawNextDate)

  if (r.includes("이탈") || r.includes("탈락"))
    return { status: "dropped", stage: "이탈", nextDate: null, displayDate: null, convertedTo: null }

  if (r.includes("계약전환"))
    return { status: "converted", stage: "계약전환", nextDate: null, displayDate: null, convertedTo: "계약상담" }

  if (r.includes("대면전환"))
    return { status: "converted", stage: "대면전환", nextDate: null, displayDate: null, convertedTo: "대면상담" }

  if (r.includes("대면상담") && r.includes("예정"))
    return { status: "converted", stage: "대면상담 예정", nextDate: null, displayDate: null, convertedTo: "대면상담" }

  if (r.includes("등원"))
    return { status: "converted", stage: "등원", nextDate: null, displayDate: null, convertedTo: "등원" }

  // 보류 (N차 아웃콜 예정) → "N차 아웃콜 예정 (M/D)"
  // 완료/발급 → "인정조사 완료" 등
  const label = getDisplayLabel(r, stageName)
  return { status: "in_progress", stage: label, nextDate: rawNextDate, displayDate, convertedTo: null }
}

export type CaseRow = {
  bonbu: string
  center: string
  sheetType: string
  consultDate: string
  status: "in_progress" | "converted" | "dropped" | "pending"
  stage: string
  nextDate: string | null
  displayDate: string | null
  convertedTo: string | null
}

export type FunnelItem = {
  total: number
  converted: number
  convertedTo: Record<string, number>
  dropped: number
  inProgress: number
  pending: number
}

export type PipelineData = {
  inProgress: CaseRow[]
  converted: CaseRow[]
  dropped: CaseRow[]
  funnel: Record<string, FunnelItem>
  fetchedAt: string
}

export async function getPipelineData(): Promise<PipelineData> {
  const sheets = getSheetsClient()
  const allCases: CaseRow[] = []

  await Promise.all(
    Object.entries(SHEET_IDS).map(([bonbu, sheetId]) =>
      Promise.all(
        Object.entries(STAGES).map(async ([sheetType, stages]) => {
          try {
            const res = await sheets.spreadsheets.values.get({
              spreadsheetId: sheetId,
              range: `'${sheetType}'!A2:AJ3000`,
            })
            for (const row of res.data.values ?? []) {
              const center = parseCenter((row[0] as string) || null)
              const consultDate = parseDate((row[1] as string) || null)
              if (!center || !consultDate) continue

              let analysis = analyzeCase(row as string[], stages)

              // 등급신청: 결과 없어도 신청서 접수 확인 예정일(col 11)이 있으면 1차 진행으로 표시
              if (sheetType === "등급신청" && analysis.status === "pending") {
                const schedDate = parseDate((row[11] as string) || null)
                if (schedDate) {
                  analysis = {
                    status: "in_progress",
                    stage: "신청서 접수 확인 예정",
                    nextDate: schedDate,
                    displayDate: fmtDate(schedDate),
                    convertedTo: null,
                  }
                }
              }

              // 계약상담: 등원 전환 전이면 급여개시 예정일(col 11)을 등원 예정으로 표시
              if (sheetType === "계약상담" && (analysis.status === "in_progress" || analysis.status === "pending")) {
                const enrollDate = parseDate((row[11] as string) || null)
                if (enrollDate) {
                  analysis = {
                    status: "in_progress",
                    stage: "등원 예정",
                    nextDate: enrollDate,
                    displayDate: fmtDate(enrollDate),
                    convertedTo: null,
                  }
                }
              }

              allCases.push({
                bonbu, center, sheetType, consultDate,
                ...analysis,
              })
            }
          } catch (e) {
            console.error(`[pipeline] ${bonbu}/${sheetType}:`, (e as Error).message)
          }
        })
      )
    )
  )

  // 퍼널 집계
  const funnel: Record<string, FunnelItem> = {}
  for (const type of Object.keys(STAGES)) {
    funnel[type] = { total: 0, converted: 0, convertedTo: {}, dropped: 0, inProgress: 0, pending: 0 }
  }
  for (const c of allCases) {
    const f = funnel[c.sheetType]
    if (!f) continue
    f.total++
    if (c.status === "converted") {
      f.converted++
      const to = c.convertedTo ?? "전환"
      f.convertedTo[to] = (f.convertedTo[to] ?? 0) + 1
    } else if (c.status === "dropped") f.dropped++
    else if (c.status === "in_progress") f.inProgress++
    else f.pending++
  }

  const byDate = (a: CaseRow, b: CaseRow) => {
    if (!a.nextDate && !b.nextDate) return 0
    if (!a.nextDate) return 1
    if (!b.nextDate) return -1
    return a.nextDate.localeCompare(b.nextDate)
  }

  return {
    inProgress: allCases.filter(c => c.status === "in_progress").sort(byDate),
    converted: allCases.filter(c => c.status === "converted").sort((a, b) => b.consultDate.localeCompare(a.consultDate)),
    dropped: allCases.filter(c => c.status === "dropped"),
    funnel,
    fetchedAt: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
  }
}
