import type { Metadata } from 'next'
import { buildPageMetadata } from '@/app/lib/seo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return buildPageMetadata(
    locale,
    '/highlights',
    {
      title: '축구 하이라이트 영상 - 골 장면 모음 | 트렌드사커',
      description: '프리미어리그, 챔피언스리그 등 주요 경기 하이라이트 영상과 골 장면을 빠르게 확인하세요.',
      keywords: '축구 하이라이트, 골 영상, 프리미어리그 하이라이트, 챔피언스리그 하이라이트, 해외축구 영상',
    },
    {
      title: 'Football Highlights - Goals and Match Videos | TrendSoccer',
      description: 'Watch match highlights and goal videos from the Premier League, Champions League and other top competitions.',
      keywords: 'Football Highlights, Goal Videos, Match Highlights, Champions League Highlights',
    }
  )
}

export default function HighlightsLayout({ children }: { children: React.ReactNode }) {
  return children
}
