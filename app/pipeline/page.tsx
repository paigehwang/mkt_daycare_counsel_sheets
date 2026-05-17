import { getPipelineData, type CaseRow, type FunnelItem } from "@/lib/data/pipeline"
import Link from "next/link"

export const revalidate = 1800

const FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif"
const PRIMARY = "#ef6079"
const INK = "#1d1d1d"
const INK_SOFT = "#4a4a4a"
const INK_FADED = "#8e8e8e"
const RULE = "#e6e4e0"
const BG = "#fafaf9"
const BG_CARD = "#ffffff"

const SHEET_ORDER = ["유선상담", "대면상담", "계약상담", "등급신청"]
const SHEET_LABELS: Record<string, string> = {
  유선상담: "유선상담",
  대면상담: "대면상담",
  계약상담: "계약상담",
  등급신청: "등급신청",
}

const STATUS_COLORS: Record<string, string> = {
  "계약상담": "#22c55e",
  "대면상담": "#3b82f6",
  "등원":    "#8b5cf6",
}

function pct(n: number, total: number) {
  if (!total) return "0%"
  return `${Math.round((n / total) * 100)}%`
}

function FunnelCard({ type, f }: { type: string; f: FunnelItem }) {
  const convPct = f.total ? Math.round((f.converted / f.total) * 100) : 0
  const dropPct = f.total ? Math.round((f.dropped / f.total) * 100) : 0

  return (
    <div style={{
      background: BG_CARD, borderRadius: 12, padding: "24px 28px",
      border: `1px solid ${RULE}`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: INK_FADED, marginBottom: 16, letterSpacing: "0.05em" }}>
        {SHEET_LABELS[type]}
      </div>

      {/* 전체 바 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, height: 8, borderRadius: 4, overflow: "hidden", background: "#f4f3f1" }}>
        {f.total > 0 && <>
          <div style={{ width: pct(f.converted, f.total), background: PRIMARY, transition: "width 0.3s" }} />
          <div style={{ width: pct(f.dropped, f.total), background: "#e5e7eb" }} />
        </>}
      </div>

      {/* 숫자 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "전체", value: f.total, color: INK },
          { label: "전환", value: f.converted, color: PRIMARY, sub: `${convPct}%` },
          { label: "이탈", value: f.dropped, color: INK_FADED, sub: `${dropPct}%` },
          { label: "진행중", value: f.inProgress, color: "#3b82f6" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.04em" }}>{value}</div>
            <div style={{ fontSize: 11, color: INK_FADED, marginTop: 2 }}>{label}</div>
            {sub && <div style={{ fontSize: 11, color, fontWeight: 700 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* 전환 목적지 */}
      {Object.keys(f.convertedTo).length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${RULE}`, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(f.convertedTo).map(([to, cnt]) => (
            <span key={to} style={{
              fontSize: 11, padding: "3px 8px", borderRadius: 20,
              background: STATUS_COLORS[to] ? STATUS_COLORS[to] + "15" : "#f4f3f1",
              color: STATUS_COLORS[to] ?? INK_SOFT, fontWeight: 600,
            }}>
              {to} {cnt}건
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function statusBadge(row: CaseRow) {
  if (row.status === "converted") {
    const color = STATUS_COLORS[row.convertedTo ?? ""] ?? PRIMARY
    return (
      <span style={{
        fontSize: 11, padding: "2px 8px", borderRadius: 20,
        background: color + "18", color, fontWeight: 700,
      }}>
        전환 → {row.convertedTo}
      </span>
    )
  }
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 20,
      background: "#eff6ff", color: "#3b82f6", fontWeight: 600,
    }}>
      {row.stage}
    </span>
  )
}

function isOverdue(date: string | null): boolean {
  if (!date) return false
  return date < new Date().toISOString().slice(0, 10)
}

export default async function PipelinePage() {
  const data = await getPipelineData()

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: FONT, color: INK }}>
      <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
      />

      {/* 헤더 */}
      <div style={{
        background: BG_CARD, borderBottom: `1px solid ${RULE}`,
        padding: "0 40px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ fontSize: 13, color: INK_FADED, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            ← 대시보드
          </Link>
          <span style={{ color: RULE }}>|</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>진행 · 전환 현황</span>
        </div>
        <span style={{ fontSize: 12, color: INK_FADED }}>
          기준: {data.fetchedAt}
        </span>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "36px 40px 80px" }}>

        {/* 전환 퍼널 */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 20 }}>
            전환 현황
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {SHEET_ORDER.map(type => (
              <FunnelCard key={type} type={type} f={data.funnel[type]} />
            ))}
          </div>
        </section>

        {/* 진행 중 */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>
            진행 중 <span style={{ fontSize: 14, fontWeight: 600, color: PRIMARY }}>
              {data.inProgress.length}건
            </span>
          </h2>
          <p style={{ fontSize: 13, color: INK_FADED, marginBottom: 20 }}>
            예정일 기준 빠른 순 · 🔴 는 예정일 지남
          </p>

          <div style={{ background: BG_CARD, borderRadius: 12, border: `1px solid ${RULE}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${RULE}`, background: "#fafaf9" }}>
                  {["본부", "센터", "유형", "현재 단계", "다음 예정일", "상담일"].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, color: INK_FADED, letterSpacing: "0.05em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.inProgress.slice(0, 300).map((row, i) => {
                  const overdue = isOverdue(row.nextDate)
                  return (
                    <tr key={i} style={{
                      borderBottom: `1px solid ${RULE}`,
                      background: i % 2 === 0 ? BG_CARD : "#fafaf9",
                    }}>
                      <td style={{ padding: "10px 16px", color: INK_FADED, fontSize: 12 }}>{row.bonbu}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 600 }}>{row.center}</td>
                      <td style={{ padding: "10px 16px", color: INK_SOFT }}>{row.sheetType}</td>
                      <td style={{ padding: "10px 16px" }}>{statusBadge(row)}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 600, color: overdue ? "#ef4444" : INK }}>
                        {overdue ? "🔴 " : ""}{row.nextDate ?? "—"}
                      </td>
                      <td style={{ padding: "10px 16px", color: INK_FADED }}>{row.consultDate}</td>
                    </tr>
                  )
                })}
                {data.inProgress.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: INK_FADED }}>
                      진행 중인 상담이 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 전환 완료 */}
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 6 }}>
            전환 완료 <span style={{ fontSize: 14, fontWeight: 600, color: "#22c55e" }}>
              {data.converted.length}건
            </span>
          </h2>
          <p style={{ fontSize: 13, color: INK_FADED, marginBottom: 20 }}>
            최신 상담일 기준
          </p>

          <div style={{ background: BG_CARD, borderRadius: 12, border: `1px solid ${RULE}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${RULE}`, background: "#fafaf9" }}>
                  {["본부", "센터", "유형", "전환 결과", "상담일"].map(h => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left",
                      fontSize: 11, fontWeight: 700, color: INK_FADED, letterSpacing: "0.05em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.converted.slice(0, 300).map((row, i) => (
                  <tr key={i} style={{
                    borderBottom: `1px solid ${RULE}`,
                    background: i % 2 === 0 ? BG_CARD : "#fafaf9",
                  }}>
                    <td style={{ padding: "10px 16px", color: INK_FADED, fontSize: 12 }}>{row.bonbu}</td>
                    <td style={{ padding: "10px 16px", fontWeight: 600 }}>{row.center}</td>
                    <td style={{ padding: "10px 16px", color: INK_SOFT }}>{row.sheetType}</td>
                    <td style={{ padding: "10px 16px" }}>{statusBadge(row)}</td>
                    <td style={{ padding: "10px 16px", color: INK_FADED }}>{row.consultDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
