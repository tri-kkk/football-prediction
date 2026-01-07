// DB에서 저장된 오즈 + 경기 결과 읽기 (API 사용량 0!)
// 🆕 FotMob 스타일: 예정 경기 + 완료 경기 통합 반환
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league') || 'PL'
    const includeResults = searchParams.get('includeResults') !== 'false' // 기본값 true
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ error: 'Database not configured' }, { status: 500 })
    }

    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
    
    // 1️⃣ 예정된 경기 (match_odds_latest)
    let upcomingUrl = `${supabaseUrl}/rest/v1/match_odds_latest?select=*`
    if (league !== 'ALL') {
      upcomingUrl += `&league_code=eq.${league}`
    }
    
    const upcomingResponse = await fetch(upcomingUrl, {
      headers,
      next: { revalidate: 60 } // 1분 캐싱
    })
    
    if (!upcomingResponse.ok) {
      throw new Error(`Supabase error (upcoming): ${upcomingResponse.status}`)
    }
    
    const upcomingData = await upcomingResponse.json()
    console.log(`📅 예정 경기: ${upcomingData.length}개`)
    
    // 예정 경기 데이터 변환
    const upcomingMatches = upcomingData.map((match: any) => ({
      ...match,
      matchStatus: 'SCHEDULED',
      finalScoreHome: null,
      finalScoreAway: null,
      isCorrect: null,
      predictionType: null
    }))
    
    // 2️⃣ 완료된 경기 (match_results) - 최근 7일
    let finishedMatches: any[] = []
    
    if (includeResults) {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const dateFilter = sevenDaysAgo.toISOString()
      
      let resultsUrl = `${supabaseUrl}/rest/v1/match_results?select=*&match_date=gte.${dateFilter}&order=match_date.desc`
      if (league !== 'ALL') {
        resultsUrl += `&league=eq.${league}`
      }
      
      const resultsResponse = await fetch(resultsUrl, {
        headers,
        next: { revalidate: 60 }
      })
      
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json()
        console.log(`✅ 완료 경기: ${resultsData.length}개`)
        
        // 완료 경기 데이터 변환 (예정 경기와 동일한 형식으로)
        finishedMatches = resultsData.map((match: any) => ({
          match_id: match.match_id,
          league_code: match.league,
          home_team: match.home_team,
          away_team: match.away_team,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          home_crest: match.home_crest,
          away_crest: match.away_crest,
          // 🆕 page.tsx 호환을 위한 필드 추가
          home_team_logo: match.home_crest,
          away_team_logo: match.away_crest,
          commence_time: match.match_date,
          home_probability: match.predicted_home_probability,
          draw_probability: match.predicted_draw_probability,
          away_probability: match.predicted_away_probability,
          // 🆕 결과 데이터
          matchStatus: match.match_status || 'FT',
          finalScoreHome: match.final_score_home,
          finalScoreAway: match.final_score_away,
          predictedWinner: match.predicted_winner,
          isCorrect: match.is_correct,
          predictionType: match.prediction_type
        }))
      } else {
        console.warn('⚠️ 완료 경기 로드 실패:', resultsResponse.status)
      }
    }
    
    // 3️⃣ 중복 제거 (match_id 기준)
    const seenIds = new Set<number>()
    const allMatches: any[] = []
    
    // 완료 경기 먼저 추가 (우선순위)
    finishedMatches.forEach((match) => {
      if (match.match_id && !seenIds.has(match.match_id)) {
        seenIds.add(match.match_id)
        allMatches.push(match)
      }
    })
    
    // 예정 경기 추가 (중복 제외)
    upcomingMatches.forEach((match: any) => {
      const matchId = match.match_id || match.id
      if (matchId && !seenIds.has(matchId)) {
        seenIds.add(matchId)
        allMatches.push(match)
      }
    })
    
    // 4️⃣ 날짜순 정렬 (최신순)
    allMatches.sort((a, b) => {
      const dateA = new Date(a.commence_time || a.match_date).getTime()
      const dateB = new Date(b.commence_time || b.match_date).getTime()
      return dateA - dateB // 오름차순 (가까운 경기부터)
    })
    
    console.log(`📊 총 반환: ${allMatches.length}개 (예정: ${upcomingMatches.length}, 완료: ${finishedMatches.length})`)
    
    return Response.json({
      success: true,
      data: allMatches,
      source: 'database',
      count: allMatches.length,
      stats: {
        upcoming: upcomingMatches.length,
        finished: finishedMatches.length
      }
    })
    
  } catch (error) {
    console.error('DB API Error:', error)
    return Response.json(
      { 
        success: false,
        error: 'Failed to fetch data from database'
      }, 
      { status: 500 }
    )
  }
}