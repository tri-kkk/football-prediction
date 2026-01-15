import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    
    // 기간 계산
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]
    
    // 결과가 있는 픽들 조회
    const { data: picks, error } = await supabase
      .from('premium_picks')
      .select('id, home_team, away_team, result, valid_date, prediction, actual_home_score, actual_away_score')
      .gte('valid_date', startDateStr)
      .in('result', ['WIN', 'LOSE'])
      .order('valid_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching picks stats:', error)
      throw error
    }
    
    // 통계 계산
    const wins = picks?.filter(p => p.result === 'WIN').length || 0
    const losses = picks?.filter(p => p.result === 'LOSE').length || 0
    const total = wins + losses
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0
    
    // 연속 적중 계산
    let streak = 0
    let currentStreak = 0
    let streakType: 'WIN' | 'LOSE' | null = null
    
    if (picks && picks.length > 0) {
      for (const pick of picks) {
        if (streakType === null) {
          streakType = pick.result as 'WIN' | 'LOSE'
          currentStreak = 1
        } else if (pick.result === streakType) {
          currentStreak++
        } else {
          break
        }
      }
      streak = currentStreak
    }
    
    // 최근 결과 리스트 (최근 10개)
    const recentResults = picks?.slice(0, 10).map(p => ({
      date: p.valid_date,
      match: `${p.home_team} vs ${p.away_team}`,
      predicted: p.prediction?.recommendation?.pick,
      score: p.actual_home_score !== null ? `${p.actual_home_score}-${p.actual_away_score}` : null,
      result: p.result,
    })) || []
    
    return NextResponse.json({
      success: true,
      period: `${days} days`,
      stats: {
        wins,
        losses,
        total,
        winRate,
        streak,
        streakType: streakType === 'WIN' ? 'winning' : streakType === 'LOSE' ? 'losing' : null,
      },
      recentResults,
    })
    
  } catch (error) {
    console.error('Premium picks stats error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
