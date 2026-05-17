"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function SignInContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fafaf9",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif",
    }}>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
      />

      <div style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "48px 40px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 1px 0 rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.06)",
        textAlign: "center",
      }}>
        {/* 로고 */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "28px" }}>
          <img
            src="/caring-logo.png"
            alt="Caring"
            style={{ width: "56px", height: "56px", borderRadius: "8px", objectFit: "cover" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none"
            }}
          />
        </div>

        <h1 style={{
          fontSize: "22px",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#1d1d1d",
          marginBottom: "6px",
        }}>
          주간보호 상담 대시보드
        </h1>
        <p style={{ fontSize: "13px", color: "#8e8e8e", marginBottom: "32px" }}>
          @caring.co.kr 계정으로 로그인하세요
        </p>

        {error && (
          <div style={{
            background: "#fff0f0",
            border: "1px solid #ffd0d0",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "20px",
            fontSize: "13px",
            color: "#c0392b",
          }}>
            케어링 계정(@caring.co.kr)만 접근 가능합니다
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            background: "#fff",
            border: "1.5px solid #e6e4e0",
            borderRadius: "10px",
            padding: "14px 20px",
            fontSize: "15px",
            fontWeight: 600,
            color: "#1d1d1d",
            cursor: "pointer",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = "#ef6079"
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(239,96,121,0.1)"
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = "#e6e4e0"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          <GoogleIcon />
          Google 계정으로 로그인
        </button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  )
}
