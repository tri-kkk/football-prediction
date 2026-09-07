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
    '/about',
    {
      title: '트렌드사커 소개 - AI 축구·야구 데이터 분석 플랫폼',
      description: '트렌드사커(TrendSoccer)가 어떤 데이터를 어떤 방식으로 분석하는지, 서비스 철학과 분석 모델을 소개합니다.',
      keywords: '트렌드사커, TrendSoccer 소개, 축구 데이터 분석, AI 스포츠 분석, 회사 소개',
    },
    {
      title: 'About TrendSoccer - AI Football and Baseball Analytics',
      description: 'How TrendSoccer collects and analyses football and baseball data, and the models behind our reports.',
      keywords: 'About TrendSoccer, Football Analytics, Sports Data Analysis',
    }
  )
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
