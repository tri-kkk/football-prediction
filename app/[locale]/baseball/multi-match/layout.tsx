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
      ? '트렌드베이스볼 - 야구 데이터 조합 분석'
      : 'TrendBaseball - Multi-Match Baseball Analytics',
    description: isKo
      ? 'KBO, NPB, MLB 프로야구 데이터를 조합한 심층 분석 리포트를 제공합니다.'
      : 'In-depth combined analytics reports across KBO, NPB, and MLB pro baseball.',
  }
}

export default function ComboPicksLayout({
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
