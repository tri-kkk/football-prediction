import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '최신 축구 뉴스 - TrendSoccer | Latest Football News',
  description: '최신 국내 및 해외 축구뉴스. Latest football news from Premier League, La Liga, Bundesliga, Serie A, Ligue 1.',
  keywords: '축구 뉴스, 해외 축구, 프리미어리그, Football News, Soccer News, Transfer News',
  openGraph: {
    title: '최신 축구 뉴스 - TrendSoccer | Latest Football News',
    description: '최신 국내 및 해외 축구뉴스 | Latest football news',
  },
}

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}