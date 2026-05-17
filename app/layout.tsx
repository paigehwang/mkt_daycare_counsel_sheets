import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "주간보호 상담 대시보드",
  description: "케어링 주간보호 상담 현황",
  icons: {
    icon: "/caring-logo.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
