import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * 통합 Proxy (Next.js 16 middleware → proxy convention)
 *
 * 1) /api/proto/* 요청 → 기존 CORS 헤더 처리 (외부 위젯 임베드용)
 * 2) 그 외 페이지 요청 → next-intl 미들웨어 (locale 감지 / prefix 리다이렉트)
 *
 * locale 동작:
 *  - 한국어(기본): prefix 없음 → `/`, `/blog/foo`
 *  - 영어: `/en` prefix → `/en`, `/en/blog/foo`
 *  - 첫 방문 시 Accept-Language 보고 자동 매핑 + NEXT_LOCALE 쿠키 저장
 */

const intlMiddleware = createIntlMiddleware(routing)

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /api/proto/* CORS 처리 (기존 동작 유지, 외부 임베드용)
  if (pathname.startsWith('/api/proto')) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
  }

  // 그 외 모든 페이지 요청 → next-intl 미들웨어로 위임
  return intlMiddleware(request)
}

export const config = {
  /**
   * matcher:
   * - /api/proto/* : CORS 처리용
   * - 그 외 페이지: i18n locale 감지·리다이렉트용
   *   (api 라우트, _next, _vercel, 정적 파일, 확장자 있는 파일은 제외)
   */
  matcher: [
    '/api/proto/:path*',
    '/((?!api|_next|_vercel|favicon|robots|sitemap|manifest|sw\\.js|.*\\..*).*)',
  ],
}
