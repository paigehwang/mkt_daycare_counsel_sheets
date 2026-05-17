import { google } from "googleapis"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import path from "path"

// .env.local 수동 파싱
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

const SHEET_IDS = {
  영남: env.SHEET_ID_YEONGNAM,
  충청: env.SHEET_ID_CHUNGCHEONG,
  호남: env.SHEET_ID_HONAM,
  수도권1: env.SHEET_ID_METRO1,
}

for (const [bonbu, id] of Object.entries(SHEET_IDS)) {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`📂 ${bonbu} (${id})`)
  console.log("=".repeat(60))

  try {
    // 탭 목록 가져오기
    const meta = await sheets.spreadsheets.get({ spreadsheetId: id })
    const tabNames = meta.data.sheets.map(s => s.properties.title)
    console.log(`탭 목록: ${tabNames.join(", ")}`)

    for (const tab of tabNames) {
      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: id,
          range: `'${tab}'!1:1`,
        })
        const headers = res.data.values?.[0] ?? []
        console.log(`\n  [${tab}]`)
        headers.forEach((h, i) => {
          if (h) console.log(`    ${i + 1}. ${h}`)
        })
      } catch (e) {
        console.log(`  [${tab}] 읽기 실패: ${e.message}`)
      }
    }
  } catch (e) {
    console.log(`❌ 접근 실패: ${e.message}`)
  }
}
