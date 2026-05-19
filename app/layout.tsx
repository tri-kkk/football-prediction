import './globals.css'
import type { Metadata } from 'next'

/**
 * Root Layout (앱 최상위)
 *
 * 실제 <html>, <body>, head 컨텐츠는 app/[locale]/layout.tsx 에서 출력합니다.
 * 이 root는 next-intl의 권장 패턴에 따라 children을 그대로 통과시키는 역할만 담당.
 *
 * globals.css 도 여기서 한 번만 import 하면 모든 페이지에 적용됩니다.
 *
 * NOTE:
 * - Next.js는 root layout이 필수이며, 그 자체로 html/body를 제공하거나
 *   하위 layout이 제공하도록 위임할 수 있습니다.
 * - [locale]/layout.tsx 에서 html/body를 그리는 구조는 next-intl 공식 권장.
 */

// 기본 메타데이터 (실제 페이지별 메타는 [locale]/layout.tsx 에서 generateMetadata로 처리)
export const metadata: Metadata = {
  metadataBase: new URL('https://www.trendsoccer.com'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
