// DB에서 저장된 오즈 + 경기 결과 읽기 (API 사용량 0!)
// 🆕 v4: 전체 리그 로고 매핑 (50+ 리그)
export const dynamic = 'force-dynamic'

// ===== 전체 리그 정보 매핑 =====
const LEAGUE_INFO: Record<string, { name: string; nameEn: string; priority: number; logo: string }> = {
  // ===== 유럽 대회 =====
  'CL': { 
    name: '챔피언스리그', 
    nameEn: 'Champions League', 
    priority: 1, 
    logo: 'https://media.api-sports.io/football/leagues/2.png' 
  },
  'EL': { 
    name: '유로파리그', 
    nameEn: 'Europa League', 
    priority: 2, 
    logo: 'https://media.api-sports.io/football/leagues/3.png' 
  },
  'ECL': { 
    name: '컨퍼런스리그', 
    nameEn: 'Conference League', 
    priority: 3, 
    logo: 'https://media.api-sports.io/football/leagues/848.png' 
  },
  'UNL': { 
    name: '네이션스리그', 
    nameEn: 'UEFA Nations League', 
    priority: 4, 
    logo: 'https://media.api-sports.io/football/leagues/5.png' 
  },

  // ===== 잉글랜드 =====
  'PL': { 
    name: '프리미어리그', 
    nameEn: 'Premier League', 
    priority: 10, 
    logo: 'https://media.api-sports.io/football/leagues/39.png' 
  },
  'ELC': { 
    name: '챔피언십', 
    nameEn: 'Championship', 
    priority: 11, 
    logo: 'https://media.api-sports.io/football/leagues/40.png' 
  },
  'FAC': { 
    name: 'FA컵', 
    nameEn: 'FA Cup', 
    priority: 12, 
    logo: 'https://media.api-sports.io/football/leagues/45.png' 
  },
  'EFL': { 
    name: 'EFL컵', 
    nameEn: 'EFL Cup', 
    priority: 13, 
    logo: 'https://media.api-sports.io/football/leagues/46.png' 
  },

  // ===== 스페인 =====
  'PD': { 
    name: '라리가', 
    nameEn: 'La Liga', 
    priority: 20, 
    logo: 'https://media.api-sports.io/football/leagues/140.png' 
  },
  'SD': { 
    name: '라리가2', 
    nameEn: 'La Liga 2', 
    priority: 21, 
    logo: 'https://media.api-sports.io/football/leagues/141.png' 
  },
  'CDR': { 
    name: '코파델레이', 
    nameEn: 'Copa del Rey', 
    priority: 22, 
    logo: 'https://media.api-sports.io/football/leagues/143.png' 
  },

  // ===== 독일 =====
  'BL1': { 
    name: '분데스리가', 
    nameEn: 'Bundesliga', 
    priority: 30, 
    logo: 'https://media.api-sports.io/football/leagues/78.png' 
  },
  'BL2': { 
    name: '분데스리가2', 
    nameEn: 'Bundesliga 2', 
    priority: 31, 
    logo: 'https://media.api-sports.io/football/leagues/79.png' 
  },
  'DFB': { 
    name: 'DFB포칼', 
    nameEn: 'DFB Pokal', 
    priority: 32, 
    logo: 'https://media.api-sports.io/football/leagues/81.png' 
  },

  // ===== 이탈리아 =====
  'SA': { 
    name: '세리에A', 
    nameEn: 'Serie A', 
    priority: 40, 
    logo: 'https://media.api-sports.io/football/leagues/135.png' 
  },
  'SB': { 
    name: '세리에B', 
    nameEn: 'Serie B', 
    priority: 41, 
    logo: 'https://media.api-sports.io/football/leagues/136.png' 
  },
  'CIT': { 
    name: '코파이탈리아', 
    nameEn: 'Coppa Italia', 
    priority: 42, 
    logo: 'https://media.api-sports.io/football/leagues/137.png' 
  },

  // ===== 프랑스 =====
  'FL1': { 
    name: '리그1', 
    nameEn: 'Ligue 1', 
    priority: 50, 
    logo: 'https://media.api-sports.io/football/leagues/61.png' 
  },
  'FL2': { 
    name: '리그2', 
    nameEn: 'Ligue 2', 
    priority: 51, 
    logo: 'https://media.api-sports.io/football/leagues/62.png' 
  },
  'CDF': { 
    name: '쿠프드프랑스', 
    nameEn: 'Coupe de France', 
    priority: 52, 
    logo: 'https://media.api-sports.io/football/leagues/66.png' 
  },

  // ===== 기타 유럽 =====
  'PPL': { 
    name: '포르투갈', 
    nameEn: 'Primeira Liga', 
    priority: 60, 
    logo: 'https://media.api-sports.io/football/leagues/94.png' 
  },
  'DED': { 
    name: '에레디비시', 
    nameEn: 'Eredivisie', 
    priority: 61, 
    logo: 'https://media.api-sports.io/football/leagues/88.png' 
  },
  'TUR': { 
    name: '터키', 
    nameEn: 'Süper Lig', 
    priority: 62, 
    logo: 'https://media.api-sports.io/football/leagues/203.png' 
  },
  'BEL': { 
    name: '벨기에', 
    nameEn: 'Pro League', 
    priority: 63, 
    logo: 'https://media.api-sports.io/football/leagues/144.png' 
  },
  'SPL': { 
    name: '스코틀랜드', 
    nameEn: 'Scottish Premiership', 
    priority: 64, 
    logo: 'https://media.api-sports.io/football/leagues/179.png' 
  },
  'SUI': { 
    name: '스위스', 
    nameEn: 'Swiss Super League', 
    priority: 65, 
    logo: 'https://media.api-sports.io/football/leagues/207.png' 
  },
  'AUT': { 
    name: '오스트리아', 
    nameEn: 'Austrian Bundesliga', 
    priority: 66, 
    logo: 'https://media.api-sports.io/football/leagues/218.png' 
  },
  'GRE': { 
    name: '그리스', 
    nameEn: 'Super League Greece', 
    priority: 67, 
    logo: 'https://media.api-sports.io/football/leagues/197.png' 
  },
  'DEN': { 
    name: '덴마크', 
    nameEn: 'Danish Superliga', 
    priority: 68, 
    logo: 'https://media.api-sports.io/football/leagues/119.png' 
  },

  // ===== 아시아 =====
  'KOR1': { 
    name: 'K리그1', 
    nameEn: 'K League 1', 
    priority: 70, 
    logo: 'https://media.api-sports.io/football/leagues/292.png' 
  },
  'KOR2': { 
    name: 'K리그2', 
    nameEn: 'K League 2', 
    priority: 71, 
    logo: 'https://media.api-sports.io/football/leagues/293.png' 
  },
  'J1': { 
    name: 'J1리그', 
    nameEn: 'J1 League', 
    priority: 72, 
    logo: 'https://media.api-sports.io/football/leagues/98.png' 
  },
  'J2': { 
    name: 'J2리그', 
    nameEn: 'J2 League', 
    priority: 73, 
    logo: 'https://media.api-sports.io/football/leagues/99.png' 
  },
  'SAL': { 
    name: '사우디리그', 
    nameEn: 'Saudi Pro League', 
    priority: 74, 
    logo: 'https://media.api-sports.io/football/leagues/307.png' 
  },
  'CSL': { 
    name: '중국슈퍼리그', 
    nameEn: 'Chinese Super League', 
    priority: 75, 
    logo: 'https://media.api-sports.io/football/leagues/169.png' 
  },
  'AUS': { 
    name: 'A리그', 
    nameEn: 'A-League', 
    priority: 76, 
    logo: 'https://media.api-sports.io/football/leagues/188.png' 
  },
  'AFC': { 
    name: 'AFC 챔피언스리그', 
    nameEn: 'AFC Champions League', 
    priority: 77, 
    logo: 'https://media.api-sports.io/football/leagues/17.png' 
  },

  // ===== 아프리카 =====
  'AFCON': { 
    name: '아프리카네이션스컵', 
    nameEn: 'Africa Cup of Nations', 
    priority: 80, 
    logo: 'https://media.api-sports.io/football/leagues/6.png' 
  },
  'EGY': { 
    name: '이집트리그', 
    nameEn: 'Egyptian Premier League', 
    priority: 81, 
    logo: 'https://media.api-sports.io/football/leagues/233.png' 
  },
  'RSA': { 
    name: '남아공리그', 
    nameEn: 'South African Premier', 
    priority: 82, 
    logo: 'https://media.api-sports.io/football/leagues/288.png' 
  },
  'MAR': { 
    name: '모로코리그', 
    nameEn: 'Botola Pro', 
    priority: 83, 
    logo: 'https://media.api-sports.io/football/leagues/200.png' 
  },
  'ALG': { 
    name: '알제리리그', 
    nameEn: 'Ligue 1 Algeria', 
    priority: 84, 
    logo: 'https://media.api-sports.io/football/leagues/187.png' 
  },
  'TUN': { 
    name: '튀니지리그', 
    nameEn: 'Tunisian Ligue 1', 
    priority: 85, 
    logo: 'https://media.api-sports.io/football/leagues/202.png' 
  },

  // ===== 남미 =====
  'COPA': { 
    name: '코파리베르타도레스', 
    nameEn: 'Copa Libertadores', 
    priority: 90, 
    logo: 'https://media.api-sports.io/football/leagues/13.png' 
  },
  'SUDO': { 
    name: '코파수다메리카나', 
    nameEn: 'Copa Sudamericana', 
    priority: 91, 
    logo: 'https://media.api-sports.io/football/leagues/11.png' 
  },
  'BRA': { 
    name: '브라질리그', 
    nameEn: 'Brasileirão', 
    priority: 92, 
    logo: 'https://media.api-sports.io/football/leagues/71.png' 
  },
  'ARG': { 
    name: '아르헨티나리그', 
    nameEn: 'Liga Profesional', 
    priority: 93, 
    logo: 'https://media.api-sports.io/football/leagues/128.png' 
  },

  // ===== 북중미 =====
  'MLS': { 
    name: 'MLS', 
    nameEn: 'Major League Soccer', 
    priority: 95, 
    logo: 'https://media.api-sports.io/football/leagues/253.png' 
  },
  'MEX': { 
    name: '멕시코리그', 
    nameEn: 'Liga MX', 
    priority: 96, 
    logo: 'https://media.api-sports.io/football/leagues/262.png' 
  },
}

// 리그 정보 가져오기 (없으면 기본값)
function getLeagueInfo(leagueCode: string) {
  return LEAGUE_INFO[leagueCode] || { 
    name: leagueCode, 
    nameEn: leagueCode, 
    priority: 99,
    logo: ''
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const league = searchParams.get('league') || 'ALL'
    const date = searchParams.get('date')
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
    
    if (date) {
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
      
      if (date) {
        const startOfDay = `${date}T00:00:00Z`
        const endOfDay = `${date}T23:59:59Z`
        resultsUrl += `&match_date=gte.${startOfDay}&match_date=lte.${endOfDay}`
      } else {
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
            leagueName: leagueInfo.name,
            leagueNameEn: leagueInfo.nameEn,
            leaguePriority: leagueInfo.priority,
            leagueLogo: leagueInfo.logo,
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
          leagueName: leagueInfo.name,
          leagueNameEn: leagueInfo.nameEn,
          leaguePriority: leagueInfo.priority,
          leagueLogo: leagueInfo.logo,
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
        leagueName: leagueInfo.name,
        leagueNameEn: leagueInfo.nameEn,
        leaguePriority: leagueInfo.priority,
        leagueLogo: leagueInfo.logo,
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
      const priorityDiff = (a.leaguePriority || 99) - (b.leaguePriority || 99)
      if (priorityDiff !== 0) return priorityDiff
      
      const dateA = new Date(a.commence_time || a.match_date).getTime()
      const dateB = new Date(b.commence_time || b.match_date).getTime()
      return dateA - dateB
    })
    
    // 7️⃣ 리그별 그룹화 메타 정보 생성
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
          logo: info.logo,
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
      meta: {
        league,
        date: date || 'all',
        timezone: 'KST (UTC+9)',
        leagues: leaguesMeta
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