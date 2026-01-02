import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const league = searchParams.get('league') || 'ALL'
    const specificDate = searchParams.get('date') // YYYY-MM-DD 형식
    const period = searchParams.get('period') || 'week'
    
    console.log(`📊 Fetching match results from Supabase: league=${league}, date=${specificDate}`)
    
    // 🔧 Supabase에서 모든 컬럼 선택 (예측 데이터 포함!)
    let query = supabase
      .from('match_results')
      .select('*')
      .order('match_date', { ascending: true })

    // 리그 필터
    if (league && league !== 'ALL') {
      query = query.eq('league', league)
    }

    // 날짜 필터
    if (specificDate) {
      // 한국 시간 기준 해당 날짜의 시작/끝
      // KST 00:00 = UTC 전날 15:00
      // KST 23:59 = UTC 당일 14:59
      const startKST = new Date(`${specificDate}T00:00:00+09:00`)
      const endKST = new Date(`${specificDate}T23:59:59+09:00`)
      
      query = query
        .gte('match_date', startKST.toISOString())
        .lte('match_date', endKST.toISOString())
    } else {
      // period 기반 필터
      const now = new Date()
      let fromDate: Date
      
      switch (period) {
        case 'today':
          fromDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
          break
        case 'week':
          fromDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          fromDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000)
          break
        default:
          fromDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      }
      
      query = query.gte('match_date', fromDate.toISOString())
    }

    // 최대 200경기
    query = query.limit(200)

    const { data, error } = await query

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    console.log(`✅ Found ${data?.length || 0} matches in Supabase`)

    // 데이터 변환 (기존 프론트엔드 호환 유지)
    const matches = (data || []).map(row => {
      // ✅ KST 시간 변환 (DB는 timestamp without time zone = UTC)
      let matchTimeKST = ''
      if (row.match_date) {
        // 'Z' 붙여서 UTC임을 명시 → Asia/Seoul로 변환
        const date = new Date(row.match_date + 'Z')
        matchTimeKST = date.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Asia/Seoul'
        })
      }
      
      return {
      // 기본 정보
      match_id: row.match_id?.toString() || '',
      league: row.league || '',
      home_team: row.home_team || '',
      away_team: row.away_team || '',
      home_team_kr: row.home_team_kr || null,
      away_team_kr: row.away_team_kr || null,
      home_crest: row.home_crest || '',
      away_crest: row.away_crest || '',
      match_date: row.match_date || '',
      match_time_kst: matchTimeKST,  // ✅ KST 시간 추가
      match_status: row.match_status || 'FT',
      
      // 실제 결과
      final_score_home: row.final_score_home ?? 0,
      final_score_away: row.final_score_away ?? 0,
      
      // 🔧 예측 데이터 (match_results 테이블 컬럼명 그대로!)
      predicted_winner: row.predicted_winner || null,
      predicted_score_home: row.predicted_score_home ?? null,
      predicted_score_away: row.predicted_score_away ?? null,
      predicted_home_probability: row.predicted_home_probability ?? null,
      predicted_draw_probability: row.predicted_draw_probability ?? null,
      predicted_away_probability: row.predicted_away_probability ?? null,
      
      // 적중 여부
      is_correct: row.is_correct ?? null,
      prediction_type: row.prediction_type || null,
    }
    })

    // 예측 데이터 있는 경기 수 로깅
    const withPredictions = matches.filter(m => m.predicted_home_probability !== null).length
    console.log(`📊 Matches with predictions: ${withPredictions}/${matches.length}`)

    return NextResponse.json({
      success: true,
      matches,
      count: matches.length,
      date: specificDate || null,
      period: specificDate ? null : period
    })

  } catch (error) {
    console.error('❌ Error in match-results API:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch match results',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}