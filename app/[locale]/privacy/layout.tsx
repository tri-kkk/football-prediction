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
    '/privacy',
    {
      title: '개인정보처리방침 - 트렌드사커',
      description: '트렌드사커가 수집하는 개인정보의 항목과 이용 목적, 보관 기간을 안내합니다.',
      keywords: '개인정보처리방침, 트렌드사커 약관',
    },
    {
      title: 'Privacy Policy - TrendSoccer',
      description: 'What personal data TrendSoccer collects, how it is used and how long it is retained.',
      keywords: 'Privacy Policy, TrendSoccer',
    }
  )
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
