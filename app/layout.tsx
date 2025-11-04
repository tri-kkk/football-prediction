import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'

export const metadata: Metadata = {
  title: '⚽ Sports Prediction - Real Time',
  description: '실시간 오즈 기반 축구 경기 예측 분석. 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그 승률 및 트렌드 분석 제공',
  keywords: '축구 예측, 경기 분석, 승률, 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그',
  authors: [{ name: 'Sports Prediction - Real Time' }],
  openGraph: {
    title: '⚽ Sports Prediction - Real Time',
    description: '실시간 오즈 기반 축구 경기 예측 분석 플랫폼',
    type: 'website',
    locale: 'ko_KR',
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7858814871438044"
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  )
}
