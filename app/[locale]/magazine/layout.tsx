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
    '/magazine',
    {
      title: '축구 매거진 - 심층 칼럼과 데이터 스토리 | 트렌드사커',
      description: '데이터로 읽는 축구 이야기. 전술 분석, 선수 기록, 리그 흐름을 다룬 심층 칼럼을 제공합니다.',
      keywords: '축구 매거진, 축구 칼럼, 전술 분석, 축구 데이터, 축구 통계, 트렌드사커',
    },
    {
      title: 'Football Magazine - Data Stories and Columns | TrendSoccer',
      description: 'In-depth football columns on tactics, player data and league trends.',
      keywords: 'Football Magazine, Football Column, Tactical Analysis, Football Data',
    }
  )
}

export default function MagazineLayout({ children }: { children: React.ReactNode }) {
  return children
}
