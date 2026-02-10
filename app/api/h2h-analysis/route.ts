import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const homeTeam = searchParams.get('homeTeam')
  const awayTeam = searchParams.get('awayTeam')
  const homeTeamId = searchParams.get('homeTeamId')
  const awayTeamId = searchParams.get('awayTeamId')
  
  if (!homeTeam || !awayTeam) {
    return NextResponse.json({ 
      error: 'homeTeam & awayTeam required' 
    }, { status: 400 })
  }
  
  try {
    // 1. 팀 ID 가져오기 (없으면 조회)
    let hTeamId = homeTeamId ? parseInt(homeTeamId) : null
    let aTeamId = awayTeamId ? parseInt(awayTeamId) : null
    
    if (!hTeamId || !aTeamId) {
      // fg_team_stats에서 팀 ID 조회
      const { data: homeTeamData } = await supabase
        .from('fg_team_stats')
        .select('team_id, team_name')
        .or(`team_name.ilike.%${homeTeam}%,team_name_ko.ilike.%${homeTeam}%`)
        .limit(1)
        .single()
      
      const { data: awayTeamData } = await supabase
        .from('fg_team_stats')
        .select('team_id, team_name')
        .or(`team_name.ilike.%${awayTeam}%,team_name_ko.ilike.%${awayTeam}%`)
        .limit(1)
        .single()
      
      if (homeTeamData) hTeamId = homeTeamData.team_id
      if (awayTeamData) aTeamId = awayTeamData.team_id
    }
    
    // 2. API-Football H2H 직접 호출
    if (hTeamId && aTeamId) {
      const h2hResponse = await fetch(
        `${API_FOOTBALL_URL}/fixtures/headtohead?h2h=${hTeamId}-${aTeamId}&last=20`,
        {
          headers: {
            'x-apisports-key': API_FOOTBALL_KEY,
          },
          next: { revalidate: 3600 } // 1시간 캐시
        }
      )
      
      if (h2hResponse.ok) {
        const h2hResult = await h2hResponse.json()
        
        if (h2hResult.response && h2hResult.response.length > 0) {
          const analysis = analyzeH2H(h2hResult.response, hTeamId, homeTeam, awayTeam)
          
          return NextResponse.json({
            success: true,
            homeTeam,
            awayTeam,
            homeTeamId: hTeamId,
            awayTeamId: aTeamId,
            totalMatches: h2hResult.response.length,
            data: analysis,
            source: 'api-football'
          })
        }
      }
    }
    
    // 3. API-Football 실패 시 fg_match_history에서 조회
    const { data: dbMatches, error } = await supabase
      .from('fg_match_history')
      .select('*')
      .or(
        `and(home_team_id.eq.${hTeamId || 0},away_team_id.eq.${aTeamId || 0}),` +
        `and(home_team_id.eq.${aTeamId || 0},away_team_id.eq.${hTeamId || 0})`
      )
      .order('match_date', { ascending: false })
      .limit(20)
    
    if (dbMatches && dbMatches.length > 0) {
      const analysis = analyzeDBMatches(dbMatches, hTeamId || 0, homeTeam, awayTeam)
      
      return NextResponse.json({
        success: true,
        homeTeam,
        awayTeam,
        totalMatches: dbMatches.length,
        data: analysis,
        source: 'database'
      })
    }
    
    // 4. 데이터 없음
    return NextResponse.json({
      success: true,
      homeTeam,
      awayTeam,
      data: null,
      message: 'No H2H history found'
    })
    
  } catch (error) {
    console.error('H2H API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// API-Football 응답 분석
function analyzeH2H(matches: any[], homeTeamId: number, homeTeam: string, awayTeam: string) {
  let homeWins = 0
  let draws = 0
  let awayWins = 0
  let homeGoals = 0
  let awayGoals = 0
  let over25Count = 0
  let bttsCount = 0
  
  const recentMatches: any[] = []
  const scoreCount: Record<string, number> = {}
  
  // 현재 홈팀 기준으로 역대 전적 계산
  matches.forEach((match, idx) => {
    const fixture = match.fixture
    const teams = match.teams
    const goals = match.goals
    
    const matchHomeId = teams.home.id
    const matchAwayId = teams.away.id
    const matchHomeGoals = goals.home || 0
    const matchAwayGoals = goals.away || 0
    const totalGoals = matchHomeGoals + matchAwayGoals
    
    // 현재 요청의 홈팀 기준으로 정규화
    const isCurrentHomeTeamHome = matchHomeId === homeTeamId
    
    let currentTeamGoals: number
    let opponentGoals: number
    let result: 'W' | 'D' | 'L'
    
    if (isCurrentHomeTeamHome) {
      // 현재 홈팀이 그 경기에서도 홈이었음
      currentTeamGoals = matchHomeGoals
      opponentGoals = matchAwayGoals
    } else {
      // 현재 홈팀이 그 경기에서는 원정이었음
      currentTeamGoals = matchAwayGoals
      opponentGoals = matchHomeGoals
    }
    
    if (currentTeamGoals > opponentGoals) {
      result = 'W'
      homeWins++
    } else if (currentTeamGoals < opponentGoals) {
      result = 'L'
      awayWins++
    } else {
      result = 'D'
      draws++
    }
    
    homeGoals += currentTeamGoals
    awayGoals += opponentGoals
    
    // 스코어 패턴 (홈팀 기준)
    const normalizedScore = `${currentTeamGoals}-${opponentGoals}`
    scoreCount[normalizedScore] = (scoreCount[normalizedScore] || 0) + 1
    
    if (totalGoals > 2.5) over25Count++
    if (matchHomeGoals > 0 && matchAwayGoals > 0) bttsCount++
    
    // 최근 경기 목록 (홈팀 기준 스코어로 변환)
    if (idx < 10) {
      recentMatches.push({
        date: fixture.date?.split('T')[0] || '',
        homeTeam: isCurrentHomeTeamHome ? teams.home.name : teams.away.name,
        awayTeam: isCurrentHomeTeamHome ? teams.away.name : teams.home.name,
        homeScore: currentTeamGoals,  // 현재 홈팀 기준
        awayScore: opponentGoals,     // 현재 원정팀 기준
        originalHomeTeam: teams.home.name,
        originalAwayTeam: teams.away.name,
        originalScore: `${matchHomeGoals}-${matchAwayGoals}`,
        result,
        venue: fixture.venue?.name || null,
      })
    }
  })
  
  const total = matches.length
  
  // 최근 5경기 분석
  const recent5 = recentMatches.slice(0, 5)
  const recent5HomeWins = recent5.filter(m => m.result === 'W').length
  const recent5Draws = recent5.filter(m => m.result === 'D').length
  const recent5AwayWins = recent5.filter(m => m.result === 'L').length
  
  // 트렌드 분석
  const overallHomeRate = homeWins / total
  const recent5HomeRate = recent5.length > 0 ? recent5HomeWins / recent5.length : 0
  
  let trend: string = 'balanced'
  let trendDescription = ''
  
  if (recent5HomeWins >= 3) {
    trend = 'home_dominant'
    trendDescription = `최근 5경기 ${homeTeam} ${recent5HomeWins}승`
  } else if (recent5AwayWins >= 3) {
    trend = 'away_dominant'
    trendDescription = `최근 5경기 ${awayTeam} ${recent5AwayWins}승`
  } else if (recent5Draws >= 2) {
    trend = 'many_draws'
    trendDescription = `최근 5경기 중 ${recent5Draws}무승부`
  } else {
    trend = 'balanced'
    trendDescription = '최근 5경기 팽팽한 접전'
  }
  
  // 스코어 패턴 정렬
  const sortedScores = Object.entries(scoreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([score, count]) => ({ score, count }))
  
  // 인사이트 생성
  const insights: string[] = []
  
  if (homeWins > awayWins * 1.5) {
    insights.push(`역대 전적: ${homeTeam} 우세 (${homeWins}승 ${draws}무 ${awayWins}패)`)
  } else if (awayWins > homeWins * 1.5) {
    insights.push(`역대 전적: ${awayTeam} 우세 (${awayWins}승 ${draws}무 ${homeWins}패)`)
  } else {
    insights.push(`역대 전적: 호각세 (${homeWins}승 ${draws}무 ${awayWins}패)`)
  }
  
  if (trendDescription) {
    insights.push(trendDescription)
  }
  
  const avgTotal = (homeGoals + awayGoals) / total
   if (avgTotal >= 2.5) {
    insights.push(`두 팀 맞대결은 공격적 (평균 ${avgTotal.toFixed(1)}골)`)
  } else {
    insights.push(`두 팀 맞대결은 수비적 (평균 ${avgTotal.toFixed(1)}골)`)
  }
  
  return {
    homeTeam,
    awayTeam,
    homeTeamKo: null,
    awayTeamKo: null,
    
    overall: {
      totalMatches: total,
      homeWins,
      draws,
      awayWins,
      homeWinRate: Math.round((homeWins / total) * 100),
      drawRate: Math.round((draws / total) * 100),
      awayWinRate: Math.round((awayWins / total) * 100),
      homeGoals,
      awayGoals,
      avgTotalGoals: Math.round(avgTotal * 10) / 10,
    },
    
    recent5: {
      matches: recent5.length,
      homeWins: recent5HomeWins,
      draws: recent5Draws,
      awayWins: recent5AwayWins,
      homeWinRate: recent5.length > 0 ? Math.round((recent5HomeWins / recent5.length) * 100) : 0,
      trend,
      trendDescription,
    },
    
    firstGoalAnalysis: {
      homeFirstGoalWinRate: 0,
      awayFirstGoalWinRate: 0,
    },
    
    scorePatterns: {
      mostCommon: sortedScores,
      avgHomeGoals: Math.round((homeGoals / total) * 10) / 10,
      avgAwayGoals: Math.round((awayGoals / total) * 10) / 10,
      over25Rate: Math.round((over25Count / total) * 100),
      bttsRate: Math.round((bttsCount / total) * 100),
    },
    
    recentMatches,
    insights,
  }
}

// DB 매치 분석 (fallback)
function analyzeDBMatches(matches: any[], homeTeamId: number, homeTeam: string, awayTeam: string) {
  let homeWins = 0
  let draws = 0
  let awayWins = 0
  let homeGoals = 0
  let awayGoals = 0
  let over25Count = 0
  let bttsCount = 0
  
  const recentMatches: any[] = []
  const scoreCount: Record<string, number> = {}
  
  matches.forEach((match, idx) => {
    const matchHomeId = match.home_team_id
    const matchHomeGoals = match.home_score || 0
    const matchAwayGoals = match.away_score || 0
    const totalGoals = matchHomeGoals + matchAwayGoals
    
    // 현재 홈팀 기준으로 정규화
    const isCurrentHomeTeamHome = matchHomeId === homeTeamId
    
    let currentTeamGoals: number
    let opponentGoals: number
    let result: 'W' | 'D' | 'L'
    
    if (isCurrentHomeTeamHome) {
      currentTeamGoals = matchHomeGoals
      opponentGoals = matchAwayGoals
    } else {
      currentTeamGoals = matchAwayGoals
      opponentGoals = matchHomeGoals
    }
    
    if (currentTeamGoals > opponentGoals) {
      result = 'W'
      homeWins++
    } else if (currentTeamGoals < opponentGoals) {
      result = 'L'
      awayWins++
    } else {
      result = 'D'
      draws++
    }
    
    homeGoals += currentTeamGoals
    awayGoals += opponentGoals
    
    const normalizedScore = `${currentTeamGoals}-${opponentGoals}`
    scoreCount[normalizedScore] = (scoreCount[normalizedScore] || 0) + 1
    
    if (totalGoals > 2.5) over25Count++
    if (matchHomeGoals > 0 && matchAwayGoals > 0) bttsCount++
    
    if (idx < 10) {
      recentMatches.push({
        date: match.match_date,
        homeTeam: isCurrentHomeTeamHome ? match.home_team : match.away_team,
        awayTeam: isCurrentHomeTeamHome ? match.away_team : match.home_team,
        homeScore: currentTeamGoals,
        awayScore: opponentGoals,
        result,
        venue: match.venue,
      })
    }
  })
  
  const total = matches.length
  const avgTotal = (homeGoals + awayGoals) / total
  
  const sortedScores = Object.entries(scoreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([score, count]) => ({ score, count }))
  
  const insights: string[] = []
  if (homeWins > awayWins) {
    insights.push(`역대 전적: ${homeTeam} 우세 (${homeWins}승 ${draws}무 ${awayWins}패)`)
  } else if (awayWins > homeWins) {
    insights.push(`역대 전적: ${awayTeam} 우세 (${awayWins}승 ${draws}무 ${homeWins}패)`)
  } else {
    insights.push(`역대 전적: 호각세 (${homeWins}승 ${draws}무 ${awayWins}패)`)
  }
  
  return {
    homeTeam,
    awayTeam,
    homeTeamKo: matches[0]?.home_team_ko || null,
    awayTeamKo: matches[0]?.away_team_ko || null,
    
    overall: {
      totalMatches: total,
      homeWins,
      draws,
      awayWins,
      homeWinRate: Math.round((homeWins / total) * 100),
      drawRate: Math.round((draws / total) * 100),
      awayWinRate: Math.round((awayWins / total) * 100),
      homeGoals,
      awayGoals,
      avgTotalGoals: Math.round(avgTotal * 10) / 10,
    },
    
    recent5: {
      matches: Math.min(5, total),
      homeWins: recentMatches.slice(0, 5).filter(m => m.result === 'W').length,
      draws: recentMatches.slice(0, 5).filter(m => m.result === 'D').length,
      awayWins: recentMatches.slice(0, 5).filter(m => m.result === 'L').length,
      homeWinRate: 0,
      trend: 'balanced',
      trendDescription: '',
    },
    
    firstGoalAnalysis: {
      homeFirstGoalWinRate: 0,
      awayFirstGoalWinRate: 0,
    },
    
    scorePatterns: {
      mostCommon: sortedScores,
      avgHomeGoals: Math.round((homeGoals / total) * 10) / 10,
      avgAwayGoals: Math.round((awayGoals / total) * 10) / 10,
      over25Rate: Math.round((over25Count / total) * 100),
      bttsRate: Math.round((bttsCount / total) * 100),
    },
    
    recentMatches,
    insights,
  }
}