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
    '/news',
    {
      title: '축구 뉴스 - 프리미어리그·해외축구 최신 소식 | 트렌드사커',
      description: '프리미어리그, 라리가, 분데스리가, 세리에A 등 해외축구 최신 뉴스와 이적 소식을 실시간으로 모아봅니다.',
      keywords: '축구 뉴스, 해외축구 뉴스, 프리미어리그 뉴스, 이적 소식, EPL 뉴스, 축구 소식, 트렌드사커',
    },
    {
      title: 'Football News - Premier League and European Football | TrendSoccer',
      description: 'Latest football news and transfer updates from the Premier League, La Liga, Bundesliga, Serie A and Ligue 1.',
      keywords: 'Football News, Soccer News, Premier League News, Transfer News, EPL News',
    }
  )
}

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children
}
