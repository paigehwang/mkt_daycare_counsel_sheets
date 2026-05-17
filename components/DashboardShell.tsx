"use client"

import { useState } from "react"

export default function DashboardShell({ html }: { html: string }) {
  const [loading, setLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)

  async function handleRefresh() {
    setLoading(true)
    try {
      await fetch("/api/refresh", { method: "POST" })
      const now = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      setLastRefreshed(now)
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* 상단 바 */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 40px",
        height: "44px",
        background: "#ffffff",
        borderBottom: "1px solid #e6e4e0",
        flexShrink: 0,
        fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
      }}>
        <span style={{ fontSize: "12px", color: "#8e8e8e", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>🕒</span>
          매일 새벽 3시 자동 갱신
          {lastRefreshed && (
            <span style={{ color: "#c0c0c0" }}>· 방금 {lastRefreshed} 새로고침</span>
          )}
        </span>

        <button
          onClick={handleRefresh}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            background: loading ? "#f4f3f1" : "#fff",
            border: "1.5px solid #e6e4e0",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 600,
            color: loading ? "#aaa" : "#1d1d1d",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            fontFamily: "inherit",
          }}
          onMouseOver={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = "#ef6079"
              e.currentTarget.style.color = "#ef6079"
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = "#e6e4e0"
            e.currentTarget.style.color = "#1d1d1d"
          }}
        >
          <span style={{ display: "inline-block", animation: loading ? "spin 1s linear infinite" : "none" }}>
            🔄
          </span>
          {loading ? "새로고침 중..." : "지금 새로고침"}
        </button>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* 대시보드 iframe */}
      <iframe
        srcDoc={html}
        style={{ flex: 1, border: "none", display: "block" }}
        title="주간보호 상담 대시보드"
      />
    </div>
  )
}
