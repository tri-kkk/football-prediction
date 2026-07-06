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
    // Google Ads 랜딩페이지 + SEO 유입 허용 (googlebot 별도 설정 제거, robots만 유지)
    robots: {
      index: true,
      follow: true,
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
