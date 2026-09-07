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
    '/results',
    {
      title: '축구 경기 결과 - 실시간 스코어·하이라이트 | 트렌드사커',
      description: '프리미어리그·라리가·분데스리가·세리에A·리그1 경기 결과와 실시간 스코어, 골 하이라이트를 한 곳에서 확인하세요.',
      keywords: '축구 경기결과, 실시간 스코어, 축구 스코어, 하이라이트, 프리미어리그 결과, 해외축구 결과, 트렌드사커',
    },
    {
      title: 'Football Results - Live Scores and Highlights | TrendSoccer',
      description: 'Live football scores, final results and goal highlights from the top five European leagues.',
      keywords: 'Football Results, Live Scores, Match Highlights, EPL Results',
    }
  )
}

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children
}
