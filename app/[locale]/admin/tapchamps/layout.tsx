import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tap Champs 우편 보내기',
  robots: { index: false, follow: false },
}

export default function TapChampsAdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
