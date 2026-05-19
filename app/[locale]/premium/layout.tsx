import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '프리미엄 경기 분석 - TrendSoccer | Premium Match Analysis',
  description: '6대 리그, 최근 4시즌 데이터 기반 데이터 분석. AI-powered match analysis based on 4 seasons of data from top 6 leagues.',
  keywords: 'AI 축구 분석, 데이터 분석, 경기 분석, Soccer Analysis, Football Data Analysis, Match Analysis',
  alternates: {
    canonical: 'https://www.trendsoccer.com/premium',
  },
  openGraph: {
    title: '프리미엄 경기 분석 - TrendSoccer | Premium Match Analysis',
    description: '6대 리그, 최근 4시즌 데이터 기반 데이터 분석 | AI-powered predictions',
  },
}

export default function PremiumLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}