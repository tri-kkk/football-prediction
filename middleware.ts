import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * 통합 미들웨어
 *
 * 1) /api/proto/* 요청 → 기존 CORS 헤더 처리
 * 2) 그 외 페이지 요청 → next-intl 미들웨어 (locale 감지·리다이렉트)
 *
 * ⚠️ Phase 1 상태 안내:
 * 이 시점에서는 라우팅이 아직 app/[locale]/ 로 이동되지 않았으므로
 * next-intl 미들웨어를 활성화하면 404가 발생합니다.
 * 따라서 i18n 처리는 Phase 2에서 라우팅 이동과 함께 켭니다.
 * 현재는 i18n 미들웨어를 import만 하고 호출하지 않음.
 */

// next-intl 미들웨어 인스턴스 (Phase 2에서 활성화)
const intlMiddleware = createIntlMiddleware(routing)
// 사용 안 함 경고 회피용
void intlMiddleware

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /api/proto/* CORS 처리 (기존 동작 유지)
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

  // Phase 2 도입 시 아래 한 줄로 교체:
  // return intlMiddleware(request)

  // Phase 1 동안은 기존 동작과 100% 동일
  return NextResponse.next()
}

export const config = {
  /**
   * matcher:
   *  - /api/proto/* (CORS)
   *  - 일반 페이지들 (Phase 2 i18n 활성화 시 사용)
   *  - 정적 파일, _next, _vercel은 제외
   */
  matcher: [
    '/api/proto/:path*',
    // Phase 2에서 아래 matcher를 추가해 i18n 미들웨어를 활성화
    // '/((?!api|_next|_vercel|favicon|robots|sitemap|manifest|.*\\..*).*)',
  ],
}
