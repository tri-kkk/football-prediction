import type { Metadata } from 'next'

// 검색엔진에 노출되지 않도록 차단 (광고 정책 대응)
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
}

export default function TotoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
