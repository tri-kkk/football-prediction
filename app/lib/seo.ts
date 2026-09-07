import type { Metadata } from 'next'

export const BASE_URL = 'https://www.trendsoccer.com'

/** locale 을 반영한 정식(canonical) URL 생성. ko 는 prefix 없음, en 은 /en prefix */
export function localeUrl(locale: string, path: string): string {
  const clean = path === '/' ? '' : path
  return locale === 'ko' ? `${BASE_URL}${clean}` : `${BASE_URL}/${locale}${clean}`
}

export type SeoCopy = {
  title: string
  description: string
  keywords?: string
}

/**
 * 페이지 단위 메타데이터 빌더.
 *
 * 기존에 각 layout 이 canonical 을 하드코딩(`https://www.trendsoccer.com/news`)하고 있어
 * /en 페이지까지 한국어 URL 을 정식 주소로 가리키는 문제가 있었다.
 * 이 헬퍼를 쓰면 locale 별 canonical + hreflang 이 자동으로 맞춰진다.
 */
export function buildPageMetadata(
  locale: string,
  path: string,
  ko: SeoCopy,
  en: SeoCopy,
  opts: { noindex?: boolean } = {}
): Metadata {
  const isKo = locale === 'ko'
  const copy = isKo ? ko : en
  const url = localeUrl(locale, path)

  return {
    title: copy.title,
    description: copy.description,
    ...(copy.keywords ? { keywords: copy.keywords } : {}),
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: url,
      languages: {
        'ko-KR': localeUrl('ko', path),
        'en-US': localeUrl('en', path),
        'x-default': localeUrl('ko', path),
      },
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url,
      siteName: 'TrendSoccer',
      type: 'website',
      locale: isKo ? 'ko_KR' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.description,
    },
  }
}
