// app/api/baseball/cron/collect-team-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_KEY = process.env.API_FOOTBALL_KEY!
const API_HOST = 'v1.baseball.api-sports.io'

// 팀 이름 매핑 (API → DB)
const TEAM_NAME_MAPPING: Record<string, string> = {
  'Cleveland Indians': 'Cleveland Guardians',
  'Oakland Athletics': 'Athletics',
}

function mapTeamName(apiTeamName: string): string {
  return TEAM_NAME_MAPPING[apiTeamName] || apiTeamName
}

// 역매핑 (DB → 경기 데이터 조회용)
const TEAM_NAME_REVERSE_MAPPING: Record<string, string[]> = {
  'Cleveland Guardians': ['Cleveland Guardians', 'Cleveland Indians'],  // 구/신 이름 둘 다
  'Athletics': ['Athletics', 'Oakland Athletics'],  // ✨ 2024/2025 둘 다 지원!
}

function getMatchTeamNames(dbTeamName: string): string[] {
  return TEAM_NAME_REVERSE_MAPPING[dbTeamName] || [dbTeamName]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season') || '2024'
  
  console.log(`⚾ 팀 시즌 통계 수집 시작: ${season}`)
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // 1. MLB 순위표에서 팀 시즌 통계 가져오기
    const url = `https://${API_HOST}/standings?league=1&season=${season}`
    
    console.log(`📊 API 호출: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': API_KEY
      }
    })
    
    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.response || data.response.length === 0) {
      console.log('⚠️ 순위표 데이터 없음')
      return NextResponse.json({
        success: false,
        error: 'No standings data available'
      })
    }
    
    console.log(`📊 발견된 디비전: ${data.response.length}개`)
    
    let totalTeams = 0
    let totalUpdated = 0
    let totalErrors = 0
    
    // 각 디비전의 팀들 처리
    for (const division of data.response) {
      if (!division || division.length === 0) continue
      
      const divisionName = division[0]?.group || 'Unknown'
      console.log(`\n📌 디비전: ${divisionName}`)
      
      for (const standing of division) {
        try {
          totalTeams++
          
          const team = standing.team
          const stats = standing
          
          // 팀 이름 매핑 적용
          const mappedTeamName = mapTeamName(team.name)
          
          console.log(`  🔍 처리 중: ${team.name}${team.name !== mappedTeamName ? ` → ${mappedTeamName}` : ''}`)
          
          // 최근 10경기 폼 계산
          let last10Record = '0-0'
          let currentStreak = ''
          
          if (stats.form) {
            const wins = (stats.form.match(/W/g) || []).length
            const losses = (stats.form.match(/L/g) || []).length
            last10Record = `${wins}-${losses}`
            
            // 연속 기록 계산
            if (stats.form.startsWith('W')) {
              const streak = stats.form.match(/^W+/)?.[0].length || 0
              currentStreak = `W${streak}`
            } else if (stats.form.startsWith('L')) {
              const streak = stats.form.match(/^L+/)?.[0].length || 0
              currentStreak = `L${streak}`
            }
          }
          
          // 승률 계산
          const winPct = stats.games?.played > 0 
            ? stats.games.win.total / stats.games.played 
            : 0
          
          // 기존 데이터 확인
          const { data: existing } = await supabase
            .from('baseball_team_season_stats')
            .select('id')
            .eq('team_name', mappedTeamName)  // 매핑된 이름으로 조회
            .eq('season', season)
            .eq('league', 'MLB')
            .single()
          
          // DB 저장
          const teamStatsData = {
            team_id: team.id,
            team_name: mappedTeamName,  // 매핑된 이름으로 저장
            season: season,
            league: 'MLB',
            
            // 전적
            games_played: stats.games?.played || 0,
            wins: stats.games?.win?.total || 0,
            losses: stats.games?.lose?.total || 0,
            win_pct: winPct,
            
            // 홈/원정
            home_wins: stats.games?.win?.home || 0,
            home_losses: stats.games?.lose?.home || 0,
            away_wins: stats.games?.win?.away || 0,
            away_losses: stats.games?.lose?.away || 0,
            
            // 최근 폼
            last_10_record: last10Record,
            current_streak: currentStreak,
            last_10_games: stats.form ? { form: stats.form } : null,
            
            // 순위
            division_rank: stats.position || null,
            
            updated_at: new Date().toISOString()
          }
          
          let upsertError = null
          
          if (existing) {
            // 업데이트
            const { error } = await supabase
              .from('baseball_team_season_stats')
              .update(teamStatsData)
              .eq('id', existing.id)
            
            upsertError = error
          } else {
            // 삽입
            const { error } = await supabase
              .from('baseball_team_season_stats')
              .insert(teamStatsData)
            
            upsertError = error
          }
          
          if (upsertError) {
            console.error(`  ❌ 저장 실패: ${mappedTeamName}`, upsertError.message)
            totalErrors++
          } else {
            console.log(`  ✅ ${mappedTeamName}: ${stats.games.win.total}-${stats.games.lose.total} (${(winPct * 100).toFixed(1)}%)`)
            totalUpdated++
          }
          
        } catch (teamError: any) {
          console.error(`  ❌ 팀 처리 오류:`, teamError.message)
          totalErrors++
        }
      }
    }
    
    // 2. 경기 데이터에서 추가 통계 계산
    console.log('\n📊 경기 데이터에서 타격/투구 통계 계산 중...')
    
    const { data: teams } = await supabase
      .from('baseball_team_season_stats')
      .select('team_id, team_name')
      .eq('season', season)
    
    if (teams) {
      for (const team of teams) {
        try {
          // 경기 데이터 조회용 팀 이름들 (역매핑 - 배열)
          const matchTeamNames = getMatchTeamNames(team.team_name)
          
          if (matchTeamNames.length > 1) {
            console.log(`  🔄 ${team.team_name} → 경기 조회: ${matchTeamNames.join(' OR ')}`)
          }
          
          // 홈 경기 통계 (여러 이름으로 검색)
          const { data: homeGames } = await supabase
            .from('baseball_matches')
            .select('home_score, away_score, home_hits, home_errors')
            .in('home_team', matchTeamNames)  // ✨ IN 조건으로 변경!
            .eq('season', season)
            .eq('status', 'FT')
          
          // 원정 경기 통계 (여러 이름으로 검색)
          const { data: awayGames } = await supabase
            .from('baseball_matches')
            .select('home_score, away_score, away_hits, away_errors')
            .in('away_team', matchTeamNames)  // ✨ IN 조건으로 변경!
            .eq('season', season)
            .eq('status', 'FT')
          
          if (!homeGames && !awayGames) continue
          
          // 평균 득점/실점 계산
          const homeRuns = homeGames?.map(g => g.home_score || 0) || []
          const homeRunsAllowed = homeGames?.map(g => g.away_score || 0) || []
          const awayRuns = awayGames?.map(g => g.away_score || 0) || []
          const awayRunsAllowed = awayGames?.map(g => g.home_score || 0) || []
          
          const allRuns = [...homeRuns, ...awayRuns]
          const allRunsAllowed = [...homeRunsAllowed, ...awayRunsAllowed]
          
          const avgRuns = allRuns.length > 0 
            ? allRuns.reduce((a, b) => a + b, 0) / allRuns.length 
            : 0
          
          const avgRunsAllowed = allRunsAllowed.length > 0
            ? allRunsAllowed.reduce((a, b) => a + b, 0) / allRunsAllowed.length
            : 0
          
          // ERA 근사값 (9이닝 기준)
          const era = avgRunsAllowed
          
          // 업데이트
          await supabase
            .from('baseball_team_season_stats')
            .update({
              team_runs_per_game: avgRuns,
              team_runs_allowed_per_game: avgRunsAllowed,
              team_era: era
            })
            .eq('team_name', team.team_name)
            .eq('season', season)
          
          console.log(`  📊 ${team.team_name}: 평균 득점 ${avgRuns.toFixed(2)}, ERA ${era.toFixed(2)}`)
          
        } catch (calcError: any) {
          console.error(`  ❌ 통계 계산 오류: ${team.team_name}`, calcError.message)
        }
      }
    }
    
    console.log(`\n✅ 완료!`)
    console.log(`  총 팀: ${totalTeams}개`)
    console.log(`  업데이트: ${totalUpdated}개`)
    console.log(`  오류: ${totalErrors}개`)
    
    return NextResponse.json({
      success: true,
      season,
      totalTeams,
      updated: totalUpdated,
      errors: totalErrors,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ 오류:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}