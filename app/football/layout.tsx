import type { Metadata } from 'next'

// 🔥 /football 라우트 메타데이터 — Step 1 (2026-04-29)
// /baseball/layout.tsx 와 일관된 패턴으로 작성. 통합 브랜드 리뉴얼 시 SEO 자산 보존
export const metadata: Metadata = {
  title: '트렌드사커 - 실시간 축구 AI 데이터 분석 플랫폼',
  description: '트렌드사커(TrendSoccer)는 축구 6대 리그 및 챔피언스리그 데이터를 AI로 정밀 분석하여 심층 데이터 리포트를 제공합니다. 프리미어리그·라리가·분데스리가·세리에A·리그1 실시간 전력 분석.',
  keywords: '트랜드사커, TrendSoccer, 축구 분석, 경기 분석, 데이터 분석, 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그, 해외축구, 축구 프리뷰, AI 축구 분석, 통계 분석, Soccer Analysis, Football Analysis, EPL Analysis, Match Preview, Live Score',
  alternates: {
    canonical: 'https://www.trendsoccer.com/football',
  },
  openGraph: {
    title: '트렌드사커 - 실시간 축구 AI 데이터 분석 플랫폼',
    description: '트렌드사커(TrendSoccer)는 축구 6대 리그 및 챔피언스리그 데이터를 AI로 정밀 분석하여 심층 데이터 리포트를 제공합니다.',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://www.trendsoccer.com/football',
    siteName: '트랜드사커 (TrendSoccer)',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '트렌드사커 - AI 기반 축구 경기 분석 플랫폼',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '트렌드사커 - 실시간 축구 AI 데이터 분석 플랫폼',
    description: '트렌드사커(TrendSoccer)는 축구 6대 리그 및 챔피언스리그 데이터를 AI로 정밀 분석하여 심층 데이터 리포트를 제공합니다.',
    images: ['/og-image.png'],
  },
}

export default function FootballLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
