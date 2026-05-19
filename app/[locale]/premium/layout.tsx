import type { Metadata } from 'next'

const BASE_URL = 'https://www.trendsoccer.com'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isKo = locale === 'ko'

  const url = isKo ? `${BASE_URL}/premium` : `${BASE_URL}/${locale}/premium`

  const title = isKo
    ? '프리미엄 경기 분석 - TrendSoccer | Premium Match Analysis'
    : 'Premium Match Analysis - TrendSoccer'

  const description = isKo
    ? '6대 리그, 최근 4시즌 데이터 기반 데이터 분석. AI 기반 경기 분석 리포트.'
    : 'AI-powered match analysis based on 4 seasons of data from the top 6 football leagues (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League).'

  const keywords = isKo
    ? 'AI 축구 분석, 데이터 분석, 경기 분석, Soccer Analysis, Football Data Analysis, Match Analysis'
    : 'AI Football Analysis, Premium Match Analysis, Soccer Predictions, EPL Analysis, La Liga Predictions, Tactical Insights'

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
      languages: {
        'ko-KR': `${BASE_URL}/premium`,
        'en-US': `${BASE_URL}/en/premium`,
        'x-default': `${BASE_URL}/premium`,
      },
    },
    openGraph: {
      title,
      description,
      locale: isKo ? 'ko_KR' : 'en_US',
      url,
    },
  }
}

export default function PremiumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
