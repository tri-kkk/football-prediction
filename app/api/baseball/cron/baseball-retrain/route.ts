// app/api/cron/baseball-retrain/route.ts
// Supabase cron: 매일 새벽 3시 (KST) = UTC 18:00
// schedule: '0 18 * * *'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RAILWAY_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL!
const RETRAIN_SECRET = process.env.RETRAIN_SECRET!

export async function GET(request: NextRequest) {
  try {
    console.log('⚾ 야구 AI 재학습 cron 시작')

    // 1. 전날 완료된 MLB 경기 수 확인
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const { count, error } = await supabase
      .from('baseball_matches')
      .select('*', { count: 'exact', head: true })
      .eq('league', 'MLB')
      .eq('status', 'FT')
      .gte('match_date', yesterdayStr)

    if (error) {
      throw new Error(`DB 조회 실패: ${error.message}`)
    }

    console.log(`어제 완료된 MLB 경기: ${count}개`)

    // 전날 경기가 없으면 스킵 (오프시즌 등)
    if (!count || count === 0) {
      return NextResponse.json({
        success: true,
        message: '어제 완료 경기 없음 - 재학습 스킵',
        count: 0,
      })
    }

    // 2. 전체 정규시즌 경기 수 확인 (최소 100개 이상일 때만 재학습)
    const { count: totalCount } = await supabase
      .from('baseball_matches')
      .select('*', { count: 'exact', head: true })
      .eq('league', 'MLB')
      .eq('status', 'FT')
      // 스프링 트레이닝 제외 (3월 말 이후 = 정규시즌)
      .gte('match_date', '2026-03-27')

    const minGames = totalCount && totalCount >= 100 ? totalCount : 0

    if (minGames < 100) {
      return NextResponse.json({
        success: true,
        message: `정규시즌 데이터 부족 (${totalCount}개) - 재학습 스킵. 100개 이상 필요`,
        totalCount,
      })
    }

    console.log(`정규시즌 누적 경기: ${totalCount}개 - 재학습 트리거`)

    // 3. Railway /retrain 호출
    const retrainResponse = await fetch(`${RAILWAY_URL}/retrain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: RETRAIN_SECRET,
        min_games: minGames,
      }),
      signal: AbortSignal.timeout(10000), // 10초 (백그라운드라 빠르게 응답)
    })

    const retrainResult = await retrainResponse.json()
    console.log('Railway 재학습 응답:', retrainResult)

    return NextResponse.json({
      success: true,
      message: '재학습 트리거 완료',
      yesterdayGames: count,
      totalGames: totalCount,
      railwayResponse: retrainResult,
    })

  } catch (error: any) {
    console.error('❌ 재학습 cron 오류:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
