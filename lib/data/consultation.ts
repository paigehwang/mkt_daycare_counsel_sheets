import { getSheetsClient } from "@/lib/google-sheets"
import aliasesJson from "@/legacy/center_aliases.json"

const CENTER_ALIASES = aliasesJson.aliases as Record<string, string>

const SHEET_IDS: Record<string, string> = {
  영남: process.env.SHEET_ID_YEONGNAM!,
  충청: process.env.SHEET_ID_CHUNGCHEONG!,
  호남: process.env.SHEET_ID_HONAM!,
  수도권1: process.env.SHEET_ID_METRO1!,
}

const SHEET_NAMES = ["등급신청", "유선상담", "대면상담", "계약상담", "상담요청"]

export type DetailRow = {
  b: string   // bonbu
  s: string   // sheet
  c: string   // center
  d: string   // date YYYY-MM-DD
  m: string   // month YYYY-MM
  ch: string  // channel
  p: string   // phone
}

export type ConsultationData = {
  counts: Record<string, Record<string, Record<string, Record<string, number>>>>
  channels: Record<string, Record<string, Record<string, Record<string, Record<string, number>>>>>
  months: string[]
  centers_by_bonbu: Record<string, string[]>
  all_channels: string[]
  sheet_stats: Record<string, number>
  totals: { rows: number }
  sheets: string[]
  detail: DetailRow[]
}

function parseCenter(raw: string | null | undefined): string | null {
  if (!raw) return null
  const m = String(raw).match(/\[([^\]]+)\]/)
  if (!m) return null
  let inside = m[1].trim()
  inside = inside.replace(/\s*(센터장|복지팀장|본부)\s*$/, "")
  inside = inside.replace(/\([^)]*\)/g, "").trim()
  if (!inside) return null
  return CENTER_ALIASES[inside] ?? inside
}

function parseDate(val: string | null | undefined): { month: string; date: string } | null {
  if (!val) return null
  const s = String(val).trim()
  const m = s.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/)
  if (m) {
    const month = `${m[1]}-${m[2].padStart(2, "0")}`
    const date = `${month}-${m[3].padStart(2, "0")}`
    return { month, date }
  }
  const m2 = s.match(/^(\d{1,2})[-./](\d{1,2})$/)
  if (m2) {
    const year = new Date().getFullYear()
    const month = `${year}-${m2[1].padStart(2, "0")}`
    const date = `${month}-${m2[2].padStart(2, "0")}`
    return { month, date }
  }
  return null
}

function normalizeChannel(val: string | null | undefined): string {
  if (!val) return "기타"
  const s = String(val).trim().replace(/\s+/g, "")
  return s || "기타"
}

function inc<T extends Record<string, unknown>>(
  obj: Record<string, unknown>,
  keys: string[],
  last: string
): void {
  let cur: Record<string, unknown> = obj
  for (const k of keys) {
    if (!cur[k]) cur[k] = {}
    cur = cur[k] as Record<string, unknown>
  }
  cur[last] = ((cur[last] as number) || 0) + 1
}

export async function getConsultationData(): Promise<ConsultationData> {
  const sheets = getSheetsClient()

  const counts: ConsultationData["counts"] = {}
  const channels: ConsultationData["channels"] = {}
  const sheet_stats: Record<string, number> = {}
  const detail: DetailRow[] = []
  const monthSet = new Set<string>()
  const channelSet = new Set<string>()
  const centersByBonbu: Record<string, Set<string>> = {}

  await Promise.all(
    Object.entries(SHEET_IDS).map(async ([bonbu, sheetId]) => {
      if (!sheetId) return

      const ranges = SHEET_NAMES.map(s => `'${s}'!A1:Z3000`)

      let values: (string[][] | null)[]
      try {
        const res = await sheets.spreadsheets.values.batchGet({
          spreadsheetId: sheetId,
          ranges,
          valueRenderOption: "FORMATTED_VALUE",
        })
        values = (res.data.valueRanges ?? []).map(vr => (vr.values as string[][] | null) ?? null)
      } catch (e) {
        console.error(`[consultation] batchGet failed for ${bonbu}:`, (e as Error).message)
        return
      }

      for (let si = 0; si < SHEET_NAMES.length; si++) {
        const sheetName = SHEET_NAMES[si]
        const rows = values[si]
        if (!rows || rows.length < 2) continue

        const headers = rows[0].map(h => String(h ?? "").trim())
        const ci = {
          담당자: headers.indexOf("담당자"),
          상담일: headers.indexOf("상담일"),
          유입경로: headers.indexOf("유입경로"),
          연락처: headers.indexOf("연락처"),
        }

        if (ci.담당자 === -1 || ci.상담일 === -1 || ci.유입경로 === -1) continue

        let count = 0
        for (let ri = 1; ri < rows.length; ri++) {
          const row = rows[ri]
          const center = parseCenter(row[ci.담당자])
          const parsed = parseDate(row[ci.상담일])
          if (!center || !parsed) continue

          const { month, date } = parsed
          const channel = normalizeChannel(row[ci.유입경로])
          const phone = ci.연락처 !== -1 ? (row[ci.연락처] ?? "") : ""

          monthSet.add(month)
          channelSet.add(channel)
          if (!centersByBonbu[bonbu]) centersByBonbu[bonbu] = new Set()
          centersByBonbu[bonbu].add(center)

          inc(counts as Record<string, unknown>, [bonbu, center, month], sheetName)
          inc(channels as Record<string, unknown>, [bonbu, center, month, sheetName], channel)

          detail.push({ b: bonbu, s: sheetName, c: center, d: date, m: month, ch: channel, p: String(phone) })
          count++
        }

        sheet_stats[`${bonbu}/${sheetName}`] = count
      }
    })
  )

  return {
    counts,
    channels,
    months: [...monthSet].sort(),
    centers_by_bonbu: Object.fromEntries(
      Object.entries(centersByBonbu).map(([b, s]) => [b, [...s].sort()])
    ),
    all_channels: [...channelSet].sort(),
    sheet_stats,
    totals: { rows: detail.length },
    sheets: SHEET_NAMES,
    detail,
  }
}
