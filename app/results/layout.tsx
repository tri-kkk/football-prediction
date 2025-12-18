import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '경기 결과 - TrendSoccer | Match Results',
  description: '실시간 축구 경기 스코어 및 하이라이트. Live football scores and match highlights from top leagues.',
  keywords: '축구 경기 결과, 실시간 스코어, 하이라이트, Football Results, Live Scores, Match Highlights',
  openGraph: {
    title: '경기 결과 - TrendSoccer | Match Results',
    description: '실시간 축구 경기 스코어 및 하이라이트 | Live scores and highlights',
  },
}

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}