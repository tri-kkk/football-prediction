// ✅ 수정된 match-results API (v2)
// 🎯 주요 변경: 데이터 없는 날짜 요청 시 자동으로 최신 데이터 날짜로 폴백
// 📅 2026년 새해 문제 해결!

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
    const autoLatest = searchParams.get('autoLatest') !== 'false' // 기본값 true
    
    console.log(`📊 Fetching match results: league=${league}, date=${specificDate}, autoLatest=${autoLatest}`)
    
    // ✅ 1단계: 가장 최근 데이터 날짜 조회 (항상 실행)
    const { data: latestData } = await supabase
      .from('match_results')
      .select('match_date')
      .order('match_date', { ascending: false })
      .limit(1)
    
    const latestMatchDate = latestData?.[0]?.match_date 
      ? new Date(latestData[0].match_date + 'Z').toISOString().split('T')[0]
      : null
    
    console.log(`📅 Latest data date in DB: ${latestMatchDate}`)

    // ✅ 2단계: 쿼리 날짜 결정
    let queryDate = specificDate
    let usedLatestFallback = false
    
    // specificDate가 지정되었지만 데이터가 없을 수 있음
    // autoLatest=true면 데이터 없을 때 최신 날짜로 폴백
    if (specificDate && autoLatest) {
      // 먼저 해당 날짜에 데이터가 있는지 체크
      const startKST = new Date(`${specificDate}T00:00:00+09:00`)
      const endKST = new Date(`${specificDate}T23:59:59+09:00`)
      
      const { count } = await supabase
        .from('match_results')
        .select('*', { count: 'exact', head: true })
        .gte('match_date', startKST.toISOString())
        .lte('match_date', endKST.toISOString())
      
      if (count === 0 && latestMatchDate) {
        console.log(`⚠️ No data for ${specificDate}, falling back to ${latestMatchDate}`)
        queryDate = latestMatchDate
        usedLatestFallback = true
      }
    }
    
    // ✅ 3단계: 메인 쿼리 실행
    let query = supabase
      .from('match_results')
      .select('*')
      .order('match_date', { ascending: true })

    // 리그 필터
    if (league && league !== 'ALL') {
      query = query.eq('league', league)
    }

    // 날짜 필터
    if (queryDate) {
      // 한국 시간 기준 해당 날짜의 시작/끝
      const startKST = new Date(`${queryDate}T00:00:00+09:00`)
      const endKST = new Date(`${queryDate}T23:59:59+09:00`)
      
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

    console.log(`✅ Found ${data?.length || 0} matches`)

    // 데이터 변환
    const matches = (data || []).map(row => {
      // KST 시간 변환
      let matchTimeKST = ''
      if (row.match_date) {
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
        match_time_kst: matchTimeKST,
        match_status: row.match_status || 'FT',
        
        // 실제 결과
        final_score_home: row.final_score_home ?? 0,
        final_score_away: row.final_score_away ?? 0,
        
        // 분석 데이터
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

    // 분석 데이터 있는 경기 수 로깅
    const withPredictions = matches.filter(m => m.predicted_home_probability !== null).length
    console.log(`📊 Matches with predictions: ${withPredictions}/${matches.length}`)

    return NextResponse.json({
      success: true,
      matches,
      count: matches.length,
      
      // ✅ 새로운 필드들
      requestedDate: specificDate || null,      // 원래 요청한 날짜
      actualDate: queryDate || null,            // 실제 조회된 날짜
      latestDate: latestMatchDate,              // DB에서 가장 최근 데이터 날짜
      usedFallback: usedLatestFallback,         // 폴백 사용 여부
      
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
