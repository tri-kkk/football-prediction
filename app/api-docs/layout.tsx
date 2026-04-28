import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API Reference · TrendSoccer',
  description: 'TrendSoccer 모바일 앱 연동용 API 레퍼런스 — 엔드포인트, 파라미터, 응답 예시 + Try-It',
  robots: { index: false, follow: false },
}

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
