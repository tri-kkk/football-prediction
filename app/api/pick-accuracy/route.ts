import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // pick_recommendations에서 리그별 적중률 계산
    const { data, error } = await supabase
      .from('pick_recommendations')
      .select('league_code, is_correct')
      .not('is_correct', 'is', null) // 정산된 것만 (is_correct가 null이 아닌 것)

    if (error) {
      console.error('DB 에러:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // 리그별 집계
    const leagueStats: { [key: string]: { total: number; correct: number } } = {}
    
    data?.forEach((pick) => {
      const league = pick.league_code || 'Unknown'
      if (!leagueStats[league]) {
        leagueStats[league] = { total: 0, correct: 0 }
      }
      leagueStats[league].total++
      if (pick.is_correct === true) {
        leagueStats[league].correct++
      }
    })

    // 배열로 변환 + 적중률 계산
    const result = Object.entries(leagueStats).map(([league, stats]) => ({
      league,
      total: stats.total,
      correct: stats.correct,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    }))

    // 적중률 높은 순 정렬
    result.sort((a, b) => b.accuracy - a.accuracy)

    // 전체 합계도 추가
    const totalAll = result.reduce((sum, l) => sum + l.total, 0)
    const correctAll = result.reduce((sum, l) => sum + l.correct, 0)
    const avgAccuracy = totalAll > 0 ? Math.round((correctAll / totalAll) * 100) : 0

    return NextResponse.json({
      success: true,
      data: result,
      summary: {
        total: totalAll,
        correct: correctAll,
        accuracy: avgAccuracy
      }
    })

  } catch (error) {
    console.error('API 에러:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}