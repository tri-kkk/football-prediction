import type { Metadata } from 'next'

const BASE_URL = 'https://www.trendsoccer.com'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isKo = locale === 'ko'

  const url = isKo ? `${BASE_URL}/baseball` : `${BASE_URL}/${locale}/baseball`

  const title = isKo
    ? '트렌드베이스볼 - KBO/NPB/MLB 프로야구 데이터 분석 플랫폼'
    : 'TrendBaseball - KBO/NPB/MLB Pro Baseball Data Analytics Platform'

  const description = isKo
    ? 'KBO, NPB, MLB 프로야구 전력 분석, 세이버메트릭스 통계, 투수/타자 세부 스탯 등 심층 데이터 분석 리포트를 제공합니다. 트렌드사커의 야구 전용 분석 리포트를 확인하세요.'
    : 'In-depth data analytics for KBO, NPB, and MLB pro baseball. Sabermetrics, pitcher/batter stats, and AI-powered analytical reports from TrendSoccer.'

  const keywords = isKo
    ? '야구 분석, KBO 데이터, NPB 분석, MLB 통계, 야구 통계, 세이버메트릭스, 투수 스탯, 타자 스탯, 트렌드베이스볼'
    : 'baseball analysis, KBO, NPB, MLB stats, sabermetrics, pitcher stats, batter stats, TrendBaseball, pro baseball analytics'

  const ogLocale = isKo ? 'ko_KR' : 'en_US'

  const ogAlt = isKo
    ? '트렌드베이스볼 - 프로야구 데이터 분석 플랫폼'
    : 'TrendBaseball - Pro Baseball Data Analytics Platform'

  const twitterTitle = isKo
    ? '트렌드베이스볼 - 프로야구 데이터 분석 플랫폼'
    : 'TrendBaseball - Pro Baseball Data Analytics'

  const twitterDesc = isKo
    ? 'KBO, NPB, MLB 프로야구 전력 분석 및 심층 데이터 분석 리포트를 제공합니다.'
    : 'KBO, NPB, MLB pro baseball analytics and in-depth match reports.'

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
      languages: {
        'ko-KR': `${BASE_URL}/baseball`,
        'en-US': `${BASE_URL}/en/baseball`,
        'x-default': `${BASE_URL}/baseball`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: ogLocale,
      url,
      siteName: isKo ? '트렌드사커 (TrendSoccer)' : 'TrendSoccer',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: ogAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: twitterTitle,
      description: twitterDesc,
      images: ['/og-image.png'],
    },
  }
}

export default function BaseballLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
