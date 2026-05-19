import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

/**
 * 서버 사이드 요청별 i18n 컨피그 로더
 *
 * - 요청 locale 검증 (지원 안 하는 locale이면 defaultLocale 사용)
 * - 해당 locale의 메시지 파일들을 동적 import
 * - 메시지는 도메인별로 분할된 파일들을 합쳐서 하나의 객체로 반환
 *
 * 도메인별 분할 파일 구조: messages/{locale}/{namespace}.json
 *   common, header, nav, leagues, regions, match, predictions,
 *   news, blog, premium, results, standings, errors
 */
const NAMESPACES = [
  'common',
  'header',
  'nav',
  'leagues',
  'regions',
  'match',
  'predictions',
  'news',
  'blog',
  'premium',
  'results',
  'standings',
  'errors',
] as const

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale은 미들웨어가 매칭한 locale (없으면 undefined)
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  // 도메인별 메시지 파일을 병렬 로드 후 하나의 객체로 머지
  const messageChunks = await Promise.all(
    NAMESPACES.map(async (ns) => {
      try {
        const mod = await import(`../messages/${locale}/${ns}.json`)
        return [ns, mod.default] as const
      } catch (err) {
        // 해당 namespace 파일이 아직 없으면 빈 객체로 폴백 — 점진 마이그레이션 친화
        console.warn(`[i18n] missing namespace: ${locale}/${ns}.json`)
        return [ns, {}] as const
      }
    })
  )

  const messages = Object.fromEntries(messageChunks)

  return {
    locale,
    messages,
    // 시간대는 한국 사용자가 다수이므로 기본 KST. 필요 시 locale별 분기
    timeZone: 'Asia/Seoul',
  }
})
