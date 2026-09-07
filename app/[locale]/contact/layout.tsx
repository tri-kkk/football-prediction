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
    '/contact',
    {
      title: '문의하기 - 트렌드사커 고객센터',
      description: '트렌드사커 서비스 문의, 제휴 제안, 오류 신고를 접수합니다.',
      keywords: '트렌드사커 문의, 고객센터, 제휴 문의, 광고 문의',
    },
    {
      title: 'Contact - TrendSoccer Support',
      description: 'Get in touch with TrendSoccer for support, partnership or bug reports.',
      keywords: 'Contact TrendSoccer, Support, Partnership',
    }
  )
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
