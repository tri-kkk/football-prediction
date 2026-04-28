import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '트렌드베이스볼 - 야구 데이터 조합 분석',
  description: '야구 데이터를 조합한 심층 분석 리포트를 제공합니다.',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function ComboPicksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
