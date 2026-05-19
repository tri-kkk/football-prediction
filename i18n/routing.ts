import { defineRouting } from 'next-intl/routing'

/**
 * 다국어 라우팅 설정
 *
 * - 한국어: prefix 없음 (예: `/`, `/blog/foo`) — 기존 URL 유지로 SEO·백링크 보호
 * - 영어: `/en` prefix (예: `/en`, `/en/blog/foo`)
 *
 * localePrefix: 'as-needed' → 기본 언어(ko)는 prefix 생략, 그 외 언어만 prefix 부여
 * localeDetection: true → 첫 방문 시 Accept-Language 헤더 기준 자동 리다이렉트
 *   이후 NEXT_LOCALE 쿠키에 저장되어 같은 사용자는 다시 자동 리다이렉트 안 됨
 */
export const routing = defineRouting({
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'as-needed',
  localeDetection: true,
})

export type Locale = (typeof routing.locales)[number]
