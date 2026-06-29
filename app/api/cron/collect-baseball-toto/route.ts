// app/api/cron/collect-baseball-toto/route.ts
// 야구토토 승1패 자동 스크래핑 — Supabase Cron / Vercel Cron
// 30분마다 최신 회차 데이터 갱신
//
// Supabase Cron SQL:
// SELECT cron.schedule(
//   'collect-baseball-toto',
//   '*/30 * * * *',
//   $$
//   SELECT net.http_post(
//     url := 'https://trendsoccer.com/api/cron/collect-baseball-toto',
//     headers := jsonb_build_object('Content-Type', 'application/json'),
//     body := '{}'::jsonb
//   );
//   $$
// );

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const year = new Date().getFullYear()

    // ⚠️ cron이 호출된 도메인(origin)을 그대로 사용 — VERCEL_URL은 배포보호(HTML 로그인)가 걸려
    //    내부 호출 시 JSON 대신 HTML이 와서 깨짐. Supabase cron은 trendsoccer.com으로 호출하므로 origin=공개도메인.
    const baseUrl = new URL(request.url).origin

    // round=0 → 현재 발매중 회차 자동 감지, force=true → 캐시 무시
    const scrapeUrl = `${baseUrl}/api/baseball-toto/scrape?year=${year}&round=0&force=true`
    console.log(`🔄 야구토토 Cron 실행: ${scrapeUrl}`)

    const response = await fetch(scrapeUrl, {
      headers: { 'User-Agent': 'SpoLive-Cron/1.0' },
    })
    const text = await response.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      // HTML 등 비-JSON 응답 (배포보호/404/오류페이지) → 원인 진단 가능하게
      return NextResponse.json({
        success: false,
        error: 'scrape가 JSON이 아닌 응답을 반환 (배포보호 또는 404 의심)',
        scrapeUrl,
        status: response.status,
        sample: text.slice(0, 120),
        duration_ms: Date.now() - startTime,
      }, { status: 502 })
    }

    if (!response.ok) {
      console.error('❌ 야구토토 Cron 실패:', data)
      return NextResponse.json({
        success: false,
        error: data.error || 'scrape failed',
        duration_ms: Date.now() - startTime,
      }, { status: 500 })
    }

    console.log(`✅ 야구토토 Cron 완료: ${data.matches?.length || 0}경기, cached=${data.cached}`)
    return NextResponse.json({
      success: true,
      round: data.round,
      matches_count: data.matches?.length || 0,
      model_count: data.stats?.model_count,
      cached: data.cached,
      duration_ms: Date.now() - startTime,
    })
  } catch (error: any) {
    console.error('💥 야구토토 Cron 에러:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime,
    }, { status: 500 })
  }
}

// Supabase Cron은 POST로 호출
export async function POST(request: NextRequest) {
  return GET(request)
}
