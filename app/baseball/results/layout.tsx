import type { Metadata } from 'next'
import ResultsSubNav from '../../components/ResultsSubNav'

export const metadata: Metadata = {
  title: '야구 경기 결과 - 트렌드사커 | Baseball Match Results',
  description: 'KBO, NPB, MLB 프로야구 실시간 경기 결과 및 인닝별 점수.',
  alternates: {
    canonical: 'https://www.trendsoccer.com/baseball/results',
  },
  openGraph: {
    title: '야구 경기 결과 - 트렌드사커',
    description: 'KBO, NPB, MLB 프로야구 실시간 경기 결과 및 인닝별 점수.',
  },
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
