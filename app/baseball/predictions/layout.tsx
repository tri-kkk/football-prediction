import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '트렌드베이스볼 - 야구 데이터 분석 리포트',
  description: 'KBO, NPB, MLB 프로야구 심층 데이터 분석 리포트.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function PredictionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
