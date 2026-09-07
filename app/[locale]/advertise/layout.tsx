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
    '/advertise',
    {
      title: '광고 문의 - 트렌드사커 제휴·배너 광고 안내',
      description: '트렌드사커 배너 광고, 제휴 마케팅, 브랜드 콘텐츠 집행 안내와 매체 소개서를 제공합니다.',
      keywords: '트렌드사커 광고, 스포츠 매체 광고, 배너 광고 문의, 제휴 마케팅',
    },
    {
      title: 'Advertise - TrendSoccer Media Kit and Partnerships',
      description: 'Banner advertising, affiliate partnerships and branded content opportunities on TrendSoccer.',
      keywords: 'Advertise on TrendSoccer, Sports Media Advertising, Banner Ads',
    }
  )
}

export default function AdvertiseLayout({ children }: { children: React.ReactNode }) {
  return children
}
