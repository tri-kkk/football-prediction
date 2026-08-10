// app/api/ksm-stats/route.ts
// 내부 분석 툴(KSM PL)용 팀통계 + 패턴 프록시
// Supabase 서비스 키를 서버에 숨기고, 브라우저(HTML 툴)에는 키를 노출하지 않음
// GET /api/ksm-stats  →  { teamStats: [...(PL+챔피언십)], patterns: [...(PL 전용)] }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 통계는 크론 재계산 시 바뀌므로 5분 캐시
export const revalidate = 300

// 알고리즘/표시에 실제로 쓰는 컬럼만 (payload 최소화)
const TEAM_COLS = [
  'team_id','team_name','team_name_ko','league_id','season',
  'home_played','home_wins','home_draws','home_losses','home_goals_for','home_goals_against',
  'home_first_goal_games','home_first_goal_wins','home_concede_first_games','home_concede_first_wins',
  'away_played','away_wins','away_draws','away_losses','away_goals_for','away_goals_against',
  'away_first_goal_games','away_first_goal_wins','away_concede_first_games','away_concede_first_wins',
  'form_home_5','form_away_5','form_last_5','is_promoted','promotion_factor',
].join(',')

const PATTERN_COLS = [
  'pattern','total_matches','home_win_rate','draw_rate','away_win_rate',
  'confidence','recommendation','description',
].join(',')

export async function GET(_request: NextRequest) {
  try {
    // 팀통계: PL(39) + 챔피언십(40) — 승격팀 보정용으로 둘 다
    const { data: teamStats, error: e1 } = await supabase
      .from('fg_team_stats')
      .select(TEAM_COLS)
      .in('league_id', [39, 40])

    // 패턴: PL 전용
    const { data: patterns, error: e2 } = await supabase
      .from('fg_patterns')
      .select(PATTERN_COLS)
      .eq('league_id', 39)

    if (e1 || e2) throw new Error(e1?.message || e2?.message)

    return NextResponse.json({
      success: true,
      teamStats: teamStats || [],
      patterns: patterns || [],
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
