import fs from "fs"
import path from "path"
import { google } from "googleapis"

// --- load .env.local ---
const envRaw = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
const env = {}
for (const line of envRaw.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "")
}

const aliasesJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "legacy/center_aliases.json"), "utf8"))
const CENTER_ALIASES = aliasesJson.aliases

const SHEET_IDS = {
  영남: env.SHEET_ID_YEONGNAM,
  충청: env.SHEET_ID_CHUNGCHEONG,
  호남: env.SHEET_ID_HONAM,
  수도권1: env.SHEET_ID_METRO1,
}
const SHEET_NAMES = ["등급신청", "유선상담", "대면상담", "계약상담", "상담요청"]
const PHONE_SHEETS = ["등급신청", "유선상담"]

// --- parsing (mirrors lib/data/consultation.ts) ---
function parseCenter(raw) {
  if (!raw) return null
  const m = String(raw).match(/\[([^\]]+)\]/)
  if (!m) return null
  let inside = m[1].trim()
  inside = inside.replace(/\s*(센터장|복지팀장|본부)\s*$/, "")
  inside = inside.replace(/\([^)]*\)/g, "").trim()
  if (!inside) return null
  return CENTER_ALIASES[inside] ?? inside
}
function parseDate(val) {
  if (!val) return null
  const s = String(val).trim()
  const m = s.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/)
  if (m) {
    const month = `${m[1]}-${m[2].padStart(2, "0")}`
    return { month, date: `${month}-${m[3].padStart(2, "0")}` }
  }
  const m2 = s.match(/^(\d{1,2})[-./](\d{1,2})$/)
  if (m2) {
    const year = new Date().getFullYear()
    const month = `${year}-${m2[1].padStart(2, "0")}`
    return { month, date: `${month}-${m2[2].padStart(2, "0")}` }
  }
  return null
}
function normalizeChannel(val) {
  if (!val) return "기타"
  const s = String(val).trim().replace(/\s+/g, "")
  return s || "기타"
}

const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
})
const sheets = google.sheets({ version: "v4", auth })

const detail = []
for (const [bonbu, sheetId] of Object.entries(SHEET_IDS)) {
  if (!sheetId) { console.log(`(skip ${bonbu}: no sheet id)`); continue }
  const ranges = SHEET_NAMES.map(s => `'${s}'!A1:Z3000`)
  const res = await sheets.spreadsheets.values.batchGet({ spreadsheetId: sheetId, ranges, valueRenderOption: "FORMATTED_VALUE" })
  const values = (res.data.valueRanges ?? []).map(vr => vr.values ?? null)
  for (let si = 0; si < SHEET_NAMES.length; si++) {
    const sheetName = SHEET_NAMES[si]
    const rows = values[si]
    if (!rows || rows.length < 2) continue
    const headers = rows[0].map(h => String(h ?? "").trim())
    const ci = { 담당자: headers.indexOf("담당자"), 상담일: headers.indexOf("상담일"), 유입경로: headers.indexOf("유입경로") }
    if (ci.담당자 === -1 || ci.상담일 === -1 || ci.유입경로 === -1) continue
    for (let ri = 1; ri < rows.length; ri++) {
      const row = rows[ri]
      const center = parseCenter(row[ci.담당자])
      const parsed = parseDate(row[ci.상담일])
      if (!center || !parsed) continue
      detail.push({ b: bonbu, s: sheetName, c: center, d: parsed.date, ch: normalizeChannel(row[ci.유입경로]) })
    }
  }
}

// exclude 본사 성장팀 (mirrors app/page.tsx)
const EXC = new Set(["본사 성장팀"])
let rows = detail.filter(r => !EXC.has(r.c))

// last 7 days inclusive (dashboard default: daysAgo(7)=today-6 .. today)
const args = process.argv.slice(2)
const to = args[0] || "2026-06-15"
const fromD = new Date(to); fromD.setDate(fromD.getDate() - 6)
const from = fromD.toISOString().slice(0, 10)
rows = rows.filter(r => r.d >= from && r.d <= to)

console.log(`\n기간: ${from} ~ ${to} (지난 7일)`)
console.log(`제외 센터: ${[...EXC].join(", ")}\n`)

function report(label, filterFn) {
  const fr = rows.filter(filterFn)
  const total = fr.length
  // per-center
  const byCenter = {}
  for (const r of fr) { const k = r.b + "|" + r.c; byCenter[k] = (byCenter[k] || 0) + 1 }
  const sumCenters = Object.values(byCenter).reduce((a, b) => a + b, 0)
  // channels
  const byCh = {}
  for (const r of fr) byCh[r.ch] = (byCh[r.ch] || 0) + 1
  const sorted = Object.entries(byCh).sort((a, b) => b[1] - a[1])

  console.log(`■ ${label}`)
  console.log(`  집계 total = ${total}`)
  console.log(`  센터별 합  = ${sumCenters}  (센터 ${Object.keys(byCenter).length}개)`)
  console.log(`  일치? ${total === sumCenters ? "✅ 정확히 일치" : "❌ 불일치 차이=" + (total - sumCenters)}`)
  console.log(`  유입경로 비중:`)
  for (const [ch, n] of sorted) {
    const pct = total ? (n / total * 100) : 0
    console.log(`    - ${ch}: ${n}건 (${pct.toFixed(1)}%)`)
  }
  console.log("")
}

report("등급+유선상담 (신규 인입, 기본 phone 뷰)", r => PHONE_SHEETS.includes(r.s))
report("전체 상담 (total 뷰)", () => true)
