import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 프리미엄 팀 분석용 응답 타입
interface TeamSecretStats {
  teamId: number
  teamName: string
  teamNameKo: string | null
  leagueCode: string | null
  season: string
  
  // 시즌 전체 성적
  seasonStats: {
    played: number
    wins: number
    draws: number
    losses: number
    winRate: number
    goalsFor: number
    goalsAgainst: number
  }
  
  // 홈/원정 성적
  homeStats: {
    played: number
    wins: number
    draws: number
    losses: number
    winRate: number
    goalsFor: number
    goalsAgainst: number
  }
  awayStats: {
    played: number
    wins: number
    draws: number
    losses: number
    winRate: number
    goalsFor: number
    goalsAgainst: number
  }
  
  // 선제골 상황 (DB에서)
  firstGoalStats: {
    home: { games: number, wins: number, winRate: number }
    away: { games: number, wins: number, winRate: number }
  }
  
  // 선실점 상황 (역전 능력)
  concededFirstStats: {
    home: { games: number, wins: number, comebackRate: number }
    away: { games: number, wins: number, comebackRate: number }
  }
  
  // ⭐ 최근 폼 (fg_match_history에서 실시간 계산)
  recentForm: {
    last5: { wins: number, draws: number, losses: number, results: string[] }
    last10: { wins: number, draws: number, losses: number, goalsFor: number, goalsAgainst: number }
    currentStreak: { type: 'W' | 'D' | 'L' | 'none', count: number }
    scoringStreak: number  // 연속 득점 경기
    cleanSheetStreak: number  // 연속 무실점 경기
  }
  
  // 베팅 마켓 참고
  markets: {
    over25Rate: number
    bttsRate: number
    cleanSheetRate: number
    scorelessRate: number
  }
  
  // 약점/강점
  weaknesses: string[]
  strengths: string[]
  
  // 최근 경기 목록 (UI 표시용)
  recentMatches: {
    date: string
    opponent: string
    opponentKo: string | null
    isHome: boolean
    goalsFor: number
    goalsAgainst: number
    result: 'W' | 'D' | 'L'
  }[]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teamName = searchParams.get('team')
  const teamId = searchParams.get('teamId')
  const leagueCode = searchParams.get('league')
  
  if (!teamName && !teamId) {
    return NextResponse.json({ error: 'team or teamId is required' }, { status: 400 })
  }
  
  try {
    // 1. fg_team_stats에서 시즌 통계 가져오기
    let statsQuery = supabase
      .from('fg_team_stats')
      .select('*')
      .order('season', { ascending: false })
    
    if (teamId) {
      statsQuery = statsQuery.eq('team_id', parseInt(teamId))
    } else if (teamName) {
      statsQuery = statsQuery.or(`team_name.ilike.%${teamName}%,team_name_ko.ilike.%${teamName}%`)
    }
    
    if (leagueCode) {
      statsQuery = statsQuery.eq('league_code', leagueCode)
    }
    
    const { data: statsData, error: statsError } = await statsQuery.limit(1).single()
    
    // 2. fg_match_history에서 최근 경기 가져오기 (실시간 폼 계산용)
    let matchQuery = supabase
      .from('fg_match_history')
      .select('*')
      .order('match_date', { ascending: false })
    
    if (teamId) {
      matchQuery = matchQuery.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    } else if (teamName) {
      matchQuery = matchQuery.or(
        `home_team.ilike.%${teamName}%,away_team.ilike.%${teamName}%,` +
        `home_team_ko.ilike.%${teamName}%,away_team_ko.ilike.%${teamName}%`
      )
    }
    
    const { data: matchesData, error: matchError } = await matchQuery.limit(15)
    
    if (statsError && matchError) {
      return NextResponse.json({
        success: false,
        error: 'Team not found',
        team: teamName || teamId,
      }, { status: 404 })
    }
    
    // 3. 통계 계산
    const stats = calculateTeamStats(
      statsData, 
      matchesData || [], 
      teamName || '', 
      teamId ? parseInt(teamId) : null
    )
    
    return NextResponse.json({
      success: true,
      team: statsData?.team_name || teamName,
      teamId: statsData?.team_id || teamId,
      league: statsData?.league_code || leagueCode,
      season: statsData?.season,
      data: stats,
      source: 'supabase'
    })
    
  } catch (error) {
    console.error('Error fetching team stats:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch team stats',
    }, { status: 500 })
  }
}

function calculateTeamStats(
  dbStats: any, 
  recentMatches: any[], 
  teamName: string,
  teamId: number | null
): TeamSecretStats {
  
  // 팀 식별 함수
  const isOurTeam = (match: any, checkHome: boolean) => {
    if (teamId) {
      return checkHome ? match.home_team_id === teamId : match.away_team_id === teamId
    }
    const name = teamName.toLowerCase()
    if (checkHome) {
      return match.home_team?.toLowerCase().includes(name) || 
             match.home_team_ko?.includes(teamName)
    }
    return match.away_team?.toLowerCase().includes(name) || 
           match.away_team_ko?.includes(teamName)
  }
  
  // ⭐ 최근 경기에서 실시간 폼 계산
  const last5Results: string[] = []
  const last10Stats = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
  let currentStreakType: 'W' | 'D' | 'L' | 'none' = 'none'
  let currentStreakCount = 0
  let scoringStreak = 0
  let countingScoring = true
  let cleanSheetStreak = 0
  let countingCleanSheet = true
  
  const recentMatchList: any[] = []
  
  recentMatches.forEach((match, idx) => {
    const isHome = isOurTeam(match, true)
    const isAway = isOurTeam(match, false)
    
    if (!isHome && !isAway) return
    
    const ourGoals = isHome ? (match.home_score || 0) : (match.away_score || 0)
    const theirGoals = isHome ? (match.away_score || 0) : (match.home_score || 0)
    
    let result: 'W' | 'D' | 'L'
    if (ourGoals > theirGoals) result = 'W'
    else if (ourGoals < theirGoals) result = 'L'
    else result = 'D'
    
    // 최근 5경기
    if (last5Results.length < 5) {
      last5Results.push(result)
    }
    
    // 최근 10경기
    if (idx < 10) {
      if (result === 'W') last10Stats.wins++
      else if (result === 'D') last10Stats.draws++
      else last10Stats.losses++
      last10Stats.goalsFor += ourGoals
      last10Stats.goalsAgainst += theirGoals
    }
    
    // 현재 연속 기록 (첫 경기부터 계산)
    if (idx === 0) {
      currentStreakType = result
      currentStreakCount = 1
    } else if (currentStreakType === result && idx < 10) {
      currentStreakCount++
    }
    
    // 연속 득점
    if (countingScoring && ourGoals > 0) {
      scoringStreak++
    } else if (ourGoals === 0) {
      countingScoring = false
    }
    
    // 연속 무실점
    if (countingCleanSheet && theirGoals === 0) {
      cleanSheetStreak++
    } else if (theirGoals > 0) {
      countingCleanSheet = false
    }
    
    // 경기 목록
    if (recentMatchList.length < 10) {
      recentMatchList.push({
        date: match.match_date,
        opponent: isHome ? match.away_team : match.home_team,
        opponentKo: isHome ? match.away_team_ko : match.home_team_ko,
        isHome,
        goalsFor: ourGoals,
        goalsAgainst: theirGoals,
        result,
      })
    }
  })
  
  // DB 통계 기본값
  const totalPlayed = dbStats?.total_played || 1
  const homePlayed = dbStats?.home_played || 1
  const awayPlayed = dbStats?.away_played || 1
  
  // 베팅 마켓 계산 (최근 10경기 기반)
  const matchCount = Math.min(recentMatches.length, 10) || 1
  let over25Count = 0
  let bttsCount = 0
  let cleanSheetCount = 0
  let scorelessCount = 0
  
  recentMatches.slice(0, 10).forEach(match => {
    const isHome = isOurTeam(match, true)
    const ourGoals = isHome ? (match.home_score || 0) : (match.away_score || 0)
    const theirGoals = isHome ? (match.away_score || 0) : (match.home_score || 0)
    const totalGoals = ourGoals + theirGoals
    
    if (totalGoals > 2) over25Count++
    if (ourGoals > 0 && theirGoals > 0) bttsCount++
    if (theirGoals === 0) cleanSheetCount++
    if (ourGoals === 0) scorelessCount++
  })
  
  // 약점/강점 분석
  const weaknesses: string[] = []
  const strengths: string[] = []
  
  // 최근 폼 기반 분석
  const last5WinRate = last5Results.filter(r => r === 'W').length / 5
  if (last5WinRate <= 0.2) {
    weaknesses.push(`최근 5경기 부진 (${last5Results.filter(r => r === 'W').length}승 ${last5Results.filter(r => r === 'D').length}무 ${last5Results.filter(r => r === 'L').length}패)`)
  } else if (last5WinRate >= 0.6) {
    strengths.push(`최근 5경기 호조 (${last5Results.filter(r => r === 'W').length}승)`)
  }
  
  // 연패 중이면 약점
  if (currentStreakType === 'L' && currentStreakCount >= 3) {
    weaknesses.push(`현재 ${currentStreakCount}연패 중`)
  }
  
  // 연승 중이면 강점
  if (currentStreakType === 'W' && currentStreakCount >= 3) {
    strengths.push(`현재 ${currentStreakCount}연승 중`)
  }
  
  // 원정 승률
  const awayWinRate = dbStats ? (dbStats.away_wins || 0) / awayPlayed : 0
  if (awayWinRate < 0.2) {
    weaknesses.push(`원정 승률 저조 (${Math.round(awayWinRate * 100)}%)`)
  }
  
  // 선제골 효율
  const homeFirstGoalWinRate = dbStats?.home_first_goal_games > 0
    ? (dbStats.home_first_goal_wins / dbStats.home_first_goal_games)
    : 0
  if (homeFirstGoalWinRate >= 0.8 && dbStats?.home_first_goal_games >= 3) {
    strengths.push(`선제골 시 승률 ${Math.round(homeFirstGoalWinRate * 100)}%`)
  }
  
  // 역전 능력 부족
  const homeComebackRate = dbStats?.home_concede_first_games > 0
    ? (dbStats.home_concede_first_wins / dbStats.home_concede_first_games)
    : 0
  if (homeComebackRate < 0.15 && dbStats?.home_concede_first_games >= 3) {
    weaknesses.push(`역전 능력 부족 (${Math.round(homeComebackRate * 100)}%)`)
  }
  
  // 득점력 부족
  if (scorelessCount >= 3) {
    weaknesses.push(`최근 10경기 중 ${scorelessCount}경기 무득점`)
  }
  
  return {
    teamId: dbStats?.team_id || 0,
    teamName: dbStats?.team_name || teamName,
    teamNameKo: dbStats?.team_name_ko || null,
    leagueCode: dbStats?.league_code || null,
    season: dbStats?.season || '2025',
    
    seasonStats: {
      played: totalPlayed,
      wins: dbStats?.total_wins || 0,
      draws: dbStats?.total_draws || 0,
      losses: dbStats?.total_losses || 0,
      winRate: Math.round(((dbStats?.total_wins || 0) / totalPlayed) * 100),
      goalsFor: dbStats?.total_goals_for || 0,
      goalsAgainst: dbStats?.total_goals_against || 0,
    },
    
    homeStats: {
      played: homePlayed,
      wins: dbStats?.home_wins || 0,
      draws: dbStats?.home_draws || 0,
      losses: dbStats?.home_losses || 0,
      winRate: Math.round(((dbStats?.home_wins || 0) / homePlayed) * 100),
      goalsFor: dbStats?.home_goals_for || 0,
      goalsAgainst: dbStats?.home_goals_against || 0,
    },
    
    awayStats: {
      played: awayPlayed,
      wins: dbStats?.away_wins || 0,
      draws: dbStats?.away_draws || 0,
      losses: dbStats?.away_losses || 0,
      winRate: Math.round(((dbStats?.away_wins || 0) / awayPlayed) * 100),
      goalsFor: dbStats?.away_goals_for || 0,
      goalsAgainst: dbStats?.away_goals_against || 0,
    },
    
    firstGoalStats: {
      home: {
        games: dbStats?.home_first_goal_games || 0,
        wins: dbStats?.home_first_goal_wins || 0,
        winRate: dbStats?.home_first_goal_games > 0 
          ? Math.round((dbStats.home_first_goal_wins / dbStats.home_first_goal_games) * 100)
          : 0,
      },
      away: {
        games: dbStats?.away_first_goal_games || 0,
        wins: dbStats?.away_first_goal_wins || 0,
        winRate: dbStats?.away_first_goal_games > 0
          ? Math.round((dbStats.away_first_goal_wins / dbStats.away_first_goal_games) * 100)
          : 0,
      },
    },
    
    concededFirstStats: {
      home: {
        games: dbStats?.home_concede_first_games || 0,
        wins: dbStats?.home_concede_first_wins || 0,
        comebackRate: dbStats?.home_concede_first_games > 0
          ? Math.round((dbStats.home_concede_first_wins / dbStats.home_concede_first_games) * 100)
          : 0,
      },
      away: {
        games: dbStats?.away_concede_first_games || 0,
        wins: dbStats?.away_concede_first_wins || 0,
        comebackRate: dbStats?.away_concede_first_games > 0
          ? Math.round((dbStats.away_concede_first_wins / dbStats.away_concede_first_games) * 100)
          : 0,
      },
    },
    
    // ⭐ 실시간 계산된 최근 폼
    recentForm: {
      last5: {
        wins: last5Results.filter(r => r === 'W').length,
        draws: last5Results.filter(r => r === 'D').length,
        losses: last5Results.filter(r => r === 'L').length,
        results: last5Results,
      },
      last10: last10Stats,
      currentStreak: {
        type: currentStreakType,
        count: currentStreakCount,
      },
      scoringStreak,
      cleanSheetStreak,
    },
    
    markets: {
      over25Rate: Math.round((over25Count / matchCount) * 100),
      bttsRate: Math.round((bttsCount / matchCount) * 100),
      cleanSheetRate: Math.round((cleanSheetCount / matchCount) * 100),
      scorelessRate: Math.round((scorelessCount / matchCount) * 100),
    },
    
    weaknesses: weaknesses.slice(0, 4),
    strengths: strengths.slice(0, 3),
    
    recentMatches: recentMatchList,
  }
}