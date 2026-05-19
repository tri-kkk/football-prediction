import type { Metadata } from 'next'
import AnalysisSubNav from '../../../components/AnalysisSubNav'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const isKo = locale === 'ko'

  return {
    title: isKo
      ? '트렌드베이스볼 - 야구 데이터 분석 리포트'
      : 'TrendBaseball - Baseball Data Analytics Reports',
    description: isKo
      ? 'KBO, NPB, MLB 프로야구 심층 데이터 분석 리포트.'
      : 'In-depth data analytics reports for KBO, NPB, and MLB pro baseball.',
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  }
}

export default function PredictionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AnalysisSubNav />
      {children}
    </>
  )
}
