// app/api/premium-picks/history/route.ts
// 프리미엄 픽 히스토리 조회 API (적중 통계용)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    // 최근 30일간의 프리미엄 픽 조회
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { data: picks, error } = await supabase
      .from('premium_picks')
      .select('*')
      .gte('commence_time', thirtyDaysAgo.toISOString())
      .order('commence_time', { ascending: false })
    
    if (error) {
      console.error('Error fetching premium picks history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // 통계 계산 - result 사용
    const settled = picks?.filter(p => p.result === 'WIN' || p.result === 'LOSE') || []
    const wins = settled.filter(p => p.result === 'WIN').length
    const losses = settled.filter(p => p.result === 'LOSE').length
    const total = wins + losses
    const accuracy = total > 0 ? Math.round((wins / total) * 100) : 0
    
    // 연승 계산
    let streak = 0
    const sortedPicks = [...settled].sort((a, b) => 
      new Date(b.commence_time).getTime() - new Date(a.commence_time).getTime()
    )
    
    for (const pick of sortedPicks) {
      if (pick.result === 'WIN') {
        streak++
      } else {
        break
      }
    }
    
    return NextResponse.json({
      success: true,
      picks: picks || [],
      stats: {
        total,
        wins,
        losses,
        accuracy,
        streak,
        pending: picks?.filter(p => p.result === null || p.result === 'PENDING').length || 0
      }
    })
    
  } catch (error: any) {
    console.error('Premium picks history API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}