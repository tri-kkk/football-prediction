import type { Metadata } from 'next'
import { buildPageMetadata } from '@/app/lib/seo'

// /football 라우트 메타데이터
// 2026-09-07: canonical 하드코딩(ko URL) → locale 별 canonical + hreflang 으로 교체
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return buildPageMetadata(
    locale,
    '/football',
    {
      title: '축구 분석 - 프리미어리그·라리가 AI 데이터 분석 | 트렌드사커',
      description:
        '트렌드사커는 축구 6대 리그와 챔피언스리그 데이터를 AI로 분석해 심층 리포트를 제공합니다. 프리미어리그·라리가·분데스리가·세리에A·리그1 전력 분석과 경기 프리뷰.',
      keywords:
        '축구 분석, 경기 분석, 프리미어리그 분석, 라리가 분석, 분데스리가, 세리에A, 리그1, 챔피언스리그, 해외축구 분석, 축구 프리뷰, AI 축구 분석, 축구 데이터, 트렌드사커',
    },
    {
      title: 'Football Analysis - AI Data Insights for Europe Top Leagues | TrendSoccer',
      description:
        'AI-driven analysis of the Premier League, La Liga, Bundesliga, Serie A, Ligue 1 and the Champions League, with in-depth match previews and team form reports.',
      keywords:
        'Football Analysis, Soccer Analysis, EPL Analysis, La Liga, Bundesliga, Serie A, Ligue 1, Champions League, Match Preview, AI Football Analysis',
    }
  )
}

export default function FootballLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
