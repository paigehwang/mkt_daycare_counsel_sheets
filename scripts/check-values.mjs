import { google } from "googleapis"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import path from "path"

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env.local")
const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => {
      const idx = l.indexOf("=")
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^"|"$/g, "")]
    })
)

const auth = new google.auth.JWT({
  email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
})
const sheets = google.sheets({ version: "v4", auth })

// 영남 시트만 샘플로 확인
const id = env.SHEET_ID_YEONGNAM

// 등급신청 - 결과 컬럼들
console.log("=== 등급신청 결과 컬럼 값 샘플 ===")
const gradeRes = await sheets.spreadsheets.values.get({
  spreadsheetId: id,
  range: "'등급신청'!A1:AH200",
})
const gradeRows = gradeRes.data.values ?? []
const gradeHeaders = gradeRows[0]
console.log("접수결과 / 인정조사결과 / 의사소견서결과 / 등급판정결과 / 상담결과 / 1차결과")
const resultCols = [13, 16, 19, 22, 23, 26] // 0-indexed
const gradeValues = new Set()
for (const row of gradeRows.slice(1, 200)) {
  for (const ci of resultCols) {
    const v = row[ci]
    if (v) gradeValues.add(`[${gradeHeaders[ci]}] ${v}`)
  }
}
;[...gradeValues].sort().forEach(v => console.log(" ", v))

// 유선상담 - 상담결과 / 1차결과
console.log("\n=== 유선상담 결과 컬럼 값 샘플 ===")
const phoneRes = await sheets.spreadsheets.values.get({
  spreadsheetId: id,
  range: "'유선상담'!A1:S200",
})
const phoneRows = phoneRes.data.values ?? []
const phoneHeaders = phoneRows[0]
const phoneValues = new Set()
for (const row of phoneRows.slice(1, 200)) {
  for (const ci of [8, 11, 14, 17]) {
    const v = row[ci]
    if (v) phoneValues.add(`[${phoneHeaders[ci]}] ${v}`)
  }
}
;[...phoneValues].sort().forEach(v => console.log(" ", v))

// 대면상담
console.log("\n=== 대면상담 결과 컬럼 값 샘플 ===")
const faceRes = await sheets.spreadsheets.values.get({
  spreadsheetId: id,
  range: "'대면상담'!A1:T200",
})
const faceRows = faceRes.data.values ?? []
const faceHeaders = faceRows[0]
const faceValues = new Set()
for (const row of faceRows.slice(1, 200)) {
  for (const ci of [9, 12, 15, 18]) {
    const v = row[ci]
    if (v) faceValues.add(`[${faceHeaders[ci]}] ${v}`)
  }
}
;[...faceValues].sort().forEach(v => console.log(" ", v))

// 계약상담
console.log("\n=== 계약상담 결과 컬럼 값 샘플 ===")
const contractRes = await sheets.spreadsheets.values.get({
  spreadsheetId: id,
  range: "'계약상담'!A1:X200",
})
const contractRows = contractRes.data.values ?? []
const contractHeaders = contractRows[0]
const contractValues = new Set()
for (const row of contractRows.slice(1, 200)) {
  for (const ci of [13, 16, 19, 22]) {
    const v = row[ci]
    if (v) contractValues.add(`[${contractHeaders[ci]}] ${v}`)
  }
}
;[...contractValues].sort().forEach(v => console.log(" ", v))
