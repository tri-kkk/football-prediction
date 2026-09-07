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
    '/baseball/standings',
    {
      title: 'KBO 순위 - 프로야구 팀 순위·승률 | 트렌드사커',
      description: 'KBO 리그 실시간 팀 순위, 승패 기록, 승률, 게임차를 데이터로 정리했습니다. MLB·NPB 순위도 함께 확인하세요.',
      keywords: 'KBO 순위, 프로야구 순위, 야구 순위표, KBO 승률, MLB 순위, NPB 순위, 야구 데이터',
    },
    {
      title: 'KBO Standings - Baseball League Tables | TrendSoccer',
      description: 'Live KBO league standings with win-loss records, win percentage and games behind. MLB and NPB tables included.',
      keywords: 'KBO Standings, Baseball Standings, MLB Standings, NPB Standings',
    }
  )
}

export default function BaseballStandingsLayout({ children }: { children: React.ReactNode }) {
  return children
}
