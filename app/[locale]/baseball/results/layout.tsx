import type { Metadata } from 'next'
import ResultsSubNav from '../../../components/ResultsSubNav'

const BASE_URL = 'https://www.trendsoccer.com'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isKo = locale === 'ko'

  const url = isKo ? `${BASE_URL}/baseball/results` : `${BASE_URL}/${locale}/baseball/results`

  const title = isKo
    ? '야구 경기 결과 - 트렌드사커 | Baseball Match Results'
    : 'Baseball Match Results - TrendBaseball'

  const description = isKo
    ? 'KBO, NPB, MLB 프로야구 실시간 경기 결과 및 인닝별 점수.'
    : 'Real-time KBO, NPB, and MLB pro baseball results with inning-by-inning scores.'

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        'ko-KR': `${BASE_URL}/baseball/results`,
        'en-US': `${BASE_URL}/en/baseball/results`,
        'x-default': `${BASE_URL}/baseball/results`,
      },
    },
    openGraph: {
      title,
      description,
    },
  }
}

export default function BaseballResultsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ResultsSubNav />
      {children}
    </>
  )
}
