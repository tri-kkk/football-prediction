// DB에서 저장된 오즈 + 경기 결과 읽기 (API 사용량 0!)
// 🆕 v2: Flutter 앱 연동용 - 날짜 필터, 리그 우선순위 추가
export const dynamic = 'force-dynamic'

// ===== 리그 정보 매핑 =====
const LEAGUE_INFO: Record<string, { name: string; nameEn: string; priority: number }> = {
  'CL': { name: '챔피언스리그', nameEn: 'Champions League', priority: 1 },
  'EL': { name: '유로파리그', nameEn: 'Europa League', priority: 2 },
  'ECL': { name: '컨퍼런스리그', nameEn: 'Conference League', priority: 3 },
  'PL': { name: '프리미어리그', nameEn: 'Premier League', priority: 4 },
  'PD': { name: '라리가', nameEn: 'La Liga', priority: 5 },
  'BL1': { name: '분데스리가', nameEn: 'Bundesliga', priority: 6 },
  'SA': { name: '세리에A', nameEn: 'Serie A', priority: 7 },
  'FL1': { name: '리그1', nameEn: 'Ligue 1', priority: 8 },
  'PPL': { name: '프리메이라리가', nameEn: 'Primeira Liga', priority: 9 },
  'DED': { name: '에레디비시', nameEn: 'Eredivisie', priority: 10 },
  'ELC': { name: '챔피언십', nameEn: 'Championship', priority: 11 },
  'SAL': { name: '사우디리그', nameEn: 'Saudi Pro League', priority: 12 },
  'EGY': { name: '이집트리그', nameEn: 'Egyptian Premier League', priority: 13 },
}

// 리그 정보 가져오기 (없으면 기본값)
function getLeagueInfo(leagueCode: string) {
  return LEAGUE_INFO[leagueCode] || { 
    name: leagueCode, 
    nameEn: leagueCode, 
    priority: 99 
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league') || 'ALL'
    const date = searchParams.get('date') // 🆕 날짜 필터 (YYYY-MM-DD)
    const includeResults = searchParams.get('includeResults') !== 'false'
    
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
    
    // 🆕 날짜 필터 적용 (예정 경기)
    if (date) {
      // commence_time이 해당 날짜인 경기만 필터
      const startOfDay = `${date}T00:00:00Z`
      const endOfDay = `${date}T23:59:59Z`
      upcomingUrl += `&commence_time=gte.${startOfDay}&commence_time=lte.${endOfDay}`
    }
    
    const upcomingResponse = await fetch(upcomingUrl, {
      headers,
      next: { revalidate: 60 }
    })
    
    if (!upcomingResponse.ok) {
      throw new Error(`Supabase error (upcoming): ${upcomingResponse.status}`)
    }
    
    const upcomingData = await upcomingResponse.json()
    console.log(`📅 예정 경기: ${upcomingData.length}개`)
    
    // 2️⃣ 완료된 경기 (match_results)
    let finishedMatches: any[] = []
    
    if (includeResults) {
      let resultsUrl = `${supabaseUrl}/rest/v1/match_results?select=*&order=match_date.desc`
      
      if (league !== 'ALL') {
        resultsUrl += `&league=eq.${league}`
      }
      
      // 🆕 날짜 필터 적용 (완료 경기)
      if (date) {
        const startOfDay = `${date}T00:00:00Z`
        const endOfDay = `${date}T23:59:59Z`
        resultsUrl += `&match_date=gte.${startOfDay}&match_date=lte.${endOfDay}`
      } else {
        // 날짜 필터 없으면 최근 7일
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        resultsUrl += `&match_date=gte.${sevenDaysAgo.toISOString()}`
      }
      
      const resultsResponse = await fetch(resultsUrl, {
        headers,
        next: { revalidate: 60 }
      })
      
      if (resultsResponse.ok) {
        const resultsData = await resultsResponse.json()
        console.log(`✅ 완료 경기: ${resultsData.length}개`)
        
        finishedMatches = resultsData.map((match: any) => {
          const leagueInfo = getLeagueInfo(match.league)
          return {
            match_id: Number(match.match_id),
            league_code: match.league,
            // 🆕 리그 정보 추가
            leagueName: leagueInfo.name,
            leagueNameEn: leagueInfo.nameEn,
            leaguePriority: leagueInfo.priority,
            home_team: match.home_team,
            away_team: match.away_team,
            home_team_id: match.home_team_id,
            away_team_id: match.away_team_id,
            home_crest: match.home_crest,
            away_crest: match.away_crest,
            home_team_logo: match.home_crest,
            away_team_logo: match.away_crest,
            commence_time: match.match_date,
            home_probability: match.predicted_home_probability,
            draw_probability: match.predicted_draw_probability,
            away_probability: match.predicted_away_probability,
            matchStatus: match.match_status || 'FT',
            status: match.match_status || 'FT',
            finalScoreHome: match.final_score_home,
            finalScoreAway: match.final_score_away,
            predictedWinner: match.predicted_winner,
            isCorrect: match.is_correct,
            predictionType: match.prediction_type
          }
        })
      }
    }
    
    // 3️⃣ match_results 데이터를 Map으로 변환
    const resultsMap = new Map<number, any>()
    finishedMatches.forEach((match) => {
      if (match.match_id) {
        resultsMap.set(Number(match.match_id), match)
      }
    })
    
    // 4️⃣ 예정 경기에 결과 데이터 병합 + 리그 정보 추가
    const mergedUpcoming = upcomingData.map((match: any) => {
      const matchId = Number(match.match_id || match.id)
      const result = resultsMap.get(matchId)
      const leagueCode = match.league_code || match.league || 'OTHER'
      const leagueInfo = getLeagueInfo(leagueCode)
      
      if (result) {
        return {
          ...match,
          match_id: matchId,
          // 🆕 리그 정보
          leagueName: leagueInfo.name,
          leagueNameEn: leagueInfo.nameEn,
          leaguePriority: leagueInfo.priority,
          matchStatus: result.matchStatus || result.status || 'FT',
          status: result.status || 'FT',
          finalScoreHome: result.finalScoreHome,
          finalScoreAway: result.finalScoreAway,
          isCorrect: result.isCorrect,
          predictionType: result.predictionType,
          predictedWinner: result.predictedWinner
        }
      }
      
      const dbStatus = match.status || 'NS'
      return {
        ...match,
        match_id: matchId,
        // 🆕 리그 정보
        leagueName: leagueInfo.name,
        leagueNameEn: leagueInfo.nameEn,
        leaguePriority: leagueInfo.priority,
        matchStatus: dbStatus === 'FT' ? 'FT' : 'SCHEDULED',
        finalScoreHome: null,
        finalScoreAway: null,
        isCorrect: null,
        predictionType: null
      }
    })
    
    // 5️⃣ 중복 제거
    const seenIds = new Set<number>()
    const allMatches: any[] = []
    
    mergedUpcoming.forEach((match: any) => {
      const matchId = Number(match.match_id || match.id)
      if (matchId && !seenIds.has(matchId)) {
        seenIds.add(matchId)
        allMatches.push(match)
      }
    })
    
    finishedMatches.forEach((match) => {
      const matchId = Number(match.match_id)
      if (matchId && !seenIds.has(matchId)) {
        seenIds.add(matchId)
        allMatches.push(match)
      }
    })
    
    // 6️⃣ 정렬: 리그 우선순위 → 시간순
    allMatches.sort((a, b) => {
      // 먼저 리그 우선순위로 정렬
      const priorityDiff = (a.leaguePriority || 99) - (b.leaguePriority || 99)
      if (priorityDiff !== 0) return priorityDiff
      
      // 같은 리그 내에서는 시간순
      const dateA = new Date(a.commence_time || a.match_date).getTime()
      const dateB = new Date(b.commence_time || b.match_date).getTime()
      return dateA - dateB
    })
    
    // 🆕 7️⃣ 리그별 그룹화 메타 정보 생성
    const leagueStats: Record<string, number> = {}
    allMatches.forEach((match) => {
      const code = match.league_code || 'OTHER'
      leagueStats[code] = (leagueStats[code] || 0) + 1
    })
    
    const leaguesMeta = Object.entries(leagueStats)
      .map(([code, count]) => {
        const info = getLeagueInfo(code)
        return {
          code,
          name: info.name,
          nameEn: info.nameEn,
          priority: info.priority,
          matchCount: count
        }
      })
      .sort((a, b) => a.priority - b.priority)
    
    console.log(`📊 총 반환: ${allMatches.length}개`)
    
    return Response.json({
      success: true,
      data: allMatches,
      source: 'database',
      count: allMatches.length,
      // 🆕 메타 정보 확장
      meta: {
        league,
        date: date || 'all',
        timezone: 'KST (UTC+9)',
        leagues: leaguesMeta  // 🆕 리그별 그룹화 정보
      },
      stats: {
        upcoming: upcomingData.length,
        finished: finishedMatches.length,
        merged: resultsMap.size
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