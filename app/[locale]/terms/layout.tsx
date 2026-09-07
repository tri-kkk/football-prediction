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
    '/terms',
    {
      title: '이용약관 - 트렌드사커',
      description: '트렌드사커 서비스 이용약관과 회원 권리·의무를 안내합니다.',
      keywords: '이용약관, 트렌드사커 약관, 서비스 약관',
    },
    {
      title: 'Terms of Service - TrendSoccer',
      description: 'TrendSoccer terms of service, member rights and obligations.',
      keywords: 'Terms of Service, TrendSoccer',
    }
  )
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
