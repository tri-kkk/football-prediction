import type { Metadata } from 'next'

const BASE_URL = 'https://www.trendsoccer.com'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isKo = locale === 'ko'

  const url = isKo ? `${BASE_URL}/blog` : `${BASE_URL}/${locale}/blog`

  const defaultTitle = isKo
    ? '경기 분석 - TrendSoccer | Match Analysis'
    : 'Match Analysis - TrendSoccer'

  const description = isKo
    ? '축구 경기 심층 분석 리포트, 프리뷰, 전술 인사이트.'
    : 'In-depth match analysis, previews, and tactical insights from top football leagues.'

  const keywords = isKo
    ? '축구 분석, 경기 분석, 전술 분석, 경기 프리뷰, Football Analysis, Match Preview, Tactical Analysis, TrendSoccer'
    : 'Football Analysis, Match Preview, Tactical Analysis, EPL Analysis, La Liga, Bundesliga, Serie A, TrendSoccer'

  return {
    title: {
      template: '%s | TrendSoccer Blog',
      default: defaultTitle,
    },
    description,
    keywords,
    alternates: {
      canonical: url,
      languages: {
        'ko-KR': `${BASE_URL}/blog`,
        'en-US': `${BASE_URL}/en/blog`,
        'x-default': `${BASE_URL}/blog`,
      },
    },
    openGraph: {
      title: defaultTitle,
      description,
      url,
      siteName: 'TrendSoccer',
      type: 'website',
      locale: isKo ? 'ko_KR' : 'en_US',
    },
  }
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
