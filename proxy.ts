import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

/**
 * 통합 Proxy (Next.js 16 middleware → proxy convention)
 *
 * 0) coach.* 서브도메인(TrendCoach) → /coach/* 서빙, i18n 미적용
 * 1) /api/proto/* 요청 → CORS 헤더 처리 (외부 위젯 임베드용)
 * 2) /coach/* (메인 도메인 직접 접근) → i18n 제외
 * 3) 그 외 페이지 요청 → next-intl 미들웨어 (locale 감지 / prefix 리다이렉트)
 */

const intlMiddleware = createIntlMiddleware(routing)

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = (request.headers.get('host') || '').split(':')[0]

  // 0) TrendCoach 서브도메인: coach.trendsoccer.com → app/coach/*, i18n 미적용
  if (host.startsWith('coach.')) {
    // 이미 /coach/* 면 그대로, 루트면 /coach 로 rewrite
    if (pathname.startsWith('/coach')) return NextResponse.next()
    const url = request.nextUrl.clone()
    url.pathname = pathname === '/' ? '/coach' : `/coach${pathname}`
    return NextResponse.rewrite(url)
  }

  // 1) /api/proto/* CORS 처리 (기존 동작 유지, 외부 임베드용)
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

  // 2) /coach/* (메인 도메인 직접 접근)는 i18n 로케일 처리 제외
  if (pathname.startsWith('/coach')) return NextResponse.next()

  // 3) 그 외 모든 페이지 요청 → next-intl 미들웨어로 위임
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    '/api/proto/:path*',
    '/((?!api|_next|_vercel|favicon|robots|sitemap|rss|feed|manifest|sw\\.js|.*\\..*).*)',
  ],
}
