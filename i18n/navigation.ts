import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/**
 * 타입-세이프한 i18n navigation 헬퍼들
 *
 * 이 파일에서 export하는 Link, useRouter, usePathname, redirect는
 * 자동으로 현재 locale을 prefix에 붙여줌.
 *
 * 사용 예:
 *   import { Link, useRouter } from '@/i18n/navigation'
 *   <Link href="/blog">블로그</Link>
 *   // → 한국어 컨텍스트에서는 /blog 로, 영어 컨텍스트에서는 /en/blog 로 렌더
 *
 * NOTE: next/link, next/navigation의 useRouter/usePathname/redirect 대신
 * 항상 이쪽에서 가져와야 locale prefix가 자동 처리됨.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
