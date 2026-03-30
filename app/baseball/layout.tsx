import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '트렌드베이스볼 - 야구 데이터 AI 분석 및 승률 예측 (KBO, NPB, MLB)',
  description: 'KBO, NPB, MLB 프로야구 전력 분석, 세이버메트릭스 통계, 투수/타자 세부 스탯 및 AI 기반 경기 승률 예측 데이터를 제공합니다. 트렌드사커의 야구 전용 분석 리포트를 확인하세요.',
  keywords: '야구 분석, KBO 예측, NPB 분석, MLB 예측, 야구 승률, 세이버메트릭스, 야구 통계, 투수 스탯, 타자 스탯, 트렌드베이스볼',
  alternates: {
    canonical: 'https://www.trendsoccer.com/baseball',
  },
  openGraph: {
    title: '트렌드베이스볼 - 야구 데이터 AI 분석 및 승률 예측 (KBO, NPB, MLB)',
    description: 'KBO, NPB, MLB 프로야구 전력 분석, 세이버메트릭스 통계, 투수/타자 세부 스탯 및 AI 기반 경기 승률 예측 데이터를 제공합니다.',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://www.trendsoccer.com/baseball',
    siteName: '트렌드사커 (TrendSoccer)',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '트렌드베이스볼 - AI 기반 프로야구 분석 플랫폼',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '트렌드베이스볼 - 야구 데이터 AI 분석 및 승률 예측',
    description: 'KBO, NPB, MLB 프로야구 전력 분석 및 AI 기반 경기 승률 예측 데이터를 제공합니다.',
    images: ['/og-image.png'],
  },
}

export default function BaseballLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
