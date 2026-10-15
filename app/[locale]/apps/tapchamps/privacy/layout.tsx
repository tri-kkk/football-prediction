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
    '/apps/tapchamps/privacy',
    {
      title: 'Tap Champs 개인정보처리방침 - (주)트리기',
      description: '모바일 게임 Tap Champs가 처리하는 정보의 항목과 이용 목적, 보관 기간을 안내합니다.',
      keywords: 'Tap Champs, 탭챔프스, 개인정보처리방침',
    },
    {
      title: 'Tap Champs Privacy Policy - Tri-Ki',
      description: 'What information the Tap Champs mobile game processes, why, and for how long.',
      keywords: 'Tap Champs, Privacy Policy',
    }
  )
}

export default function TapChampsPrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
