import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | TrendSoccer Blog',
    default: '경기 분석 - TrendSoccer | Match Analysis',
  },
  description: '축구 경기 심층 분석 리포트, 프리뷰, 전술 인사이트. In-depth match analysis, previews, and tactical insights from top football leagues.',
  keywords: '축구 분석, 경기 분석, 전술 분석, 경기 프리뷰, Football Analysis, Match Preview, Tactical Analysis, TrendSoccer',
  alternates: {
    canonical: 'https://www.trendsoccer.com/blog',
  },
  openGraph: {
    title: '경기 분석 - TrendSoccer | Match Analysis',
    description: '축구 경기 심층 분석 리포트, 프리뷰, 전술 인사이트',
    url: 'https://www.trendsoccer.com/blog',
    siteName: 'TrendSoccer',
    type: 'website',
  },
}

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
