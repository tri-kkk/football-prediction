import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '축구 경기 예측 - AI 기반 스마트 분석',
  description: '최신 AI 기술로 축구 경기를 분석하고 예측합니다',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
