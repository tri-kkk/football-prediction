import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '경기 분석 - TrendSoccer | Match Analysis',
  description: '주요 리그 경기 심층 분석 리포트. In-depth match analysis and tactical reports from top football leagues.',
  keywords: '축구 분석, 경기 분석, 전술 분석, Football Analysis, Match Preview, Tactical Analysis',
  openGraph: {
    title: '경기 분석 - TrendSoccer | Match Analysis',
    description: '주요 리그 경기 심층 분석 리포트 | In-depth match analysis',
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}