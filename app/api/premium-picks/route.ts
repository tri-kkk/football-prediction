import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    // 현재 시간 (UTC)
    const now = new Date()
    const nowUTC = now.toISOString()
    
    // 48시간 전 (픽 생성 시점 기준)
    const past48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
    
    console.log(`📅 Premium picks query: now=${nowUTC}, past48h=${past48h}`)
    
    // ✅ 수정: valid_date 대신 commence_time 기준
    // - 경기 시작 전인 픽만 (아직 안 끝난 경기)
    // - 48시간 이내 생성된 픽만 (너무 오래된 픽 제외)
    const { data: picks, error } = await supabase
      .from('premium_picks')
      .select('*')
      .gt('commence_time', nowUTC)        // 경기 시작 전만
      .gte('created_at', past48h)         // 48시간 이내 생성된 픽
      .order('commence_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching premium picks:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }
    
    console.log(`✅ Premium picks found: ${picks?.length || 0}`)
    
    // KST 기준 오늘 날짜 (응답용)
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(now.getTime() + kstOffset)
    const today = kstNow.toISOString().split('T')[0]
    
    // 🔧 현재 시점 ~ 24시간 이내 경기만 카운트
    const next24hUTC = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    
    // 24시간 이내 경기 수 조회
    const { count: analyzedCount } = await supabase
      .from('match_odds_latest')
      .select('*', { count: 'exact', head: true })
      .gte('commence_time', nowUTC)
      .lt('commence_time', next24hUTC)
    
    return NextResponse.json({
      success: true,
      validDate: today,
      picks: picks || [],
      count: picks?.length || 0,
      analyzed: analyzedCount || 0,
    })
    
  } catch (error) {
    console.error('Premium picks API error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}