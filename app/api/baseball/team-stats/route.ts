// app/api/baseball/team-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const team = searchParams.get('team')
  const teamId = searchParams.get('teamId')
  const season = searchParams.get('season') || '2025'  // 기본값: 2025 (과거 시즌)
  const league = searchParams.get('league') || '1' // MLB
  
  if (!team && !teamId) {
    return NextResponse.json({ 
      success: false, 
      error: 'team or teamId is required' 
    }, { status: 400 })
  }

  try {
    const API_KEY = process.env.API_FOOTBALL_KEY
    const API_HOST = 'v1.baseball.api-sports.io'
    
    // 팀 ID가 없으면 이름으로 검색
    let finalTeamId = teamId
    
    if (!finalTeamId) {
      console.log('🔍 Searching for team:', team)
      
      const searchUrl = `https://${API_HOST}/teams?search=${encodeURIComponent(team!)}&league=1&season=2025`
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'x-apisports-key': API_KEY!,
        }
      })
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        if (searchData.response && searchData.response.length > 0) {
          finalTeamId = searchData.response[0].id.toString()
          console.log(`  ✅ Found team ID: ${finalTeamId}`)
        }
      }
    }
    
    if (!finalTeamId) {
      return NextResponse.json({
        success: false,
        error: 'Team not found'
      }, { status: 404 })
    }

    console.log('📊 Fetching team stats:', { team, teamId: finalTeamId, season, league })
    
    // 팀 통계 가져오기
    const statsUrl = `https://${API_HOST}/teams/statistics?team=${finalTeamId}&season=${season}&league=${league}`
    
    const response = await fetch(statsUrl, {
      headers: {
        'x-apisports-key': API_KEY!,
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    console.log('✅ Team stats retrieved')

    // 최근 경기 가져오기 (폼 표시용) - 2025 시즌
    const gamesUrl = `https://${API_HOST}/games?team=${finalTeamId}&season=${season}&league=${league}&last=5`
    const gamesResponse = await fetch(gamesUrl, {
      headers: {
        'x-apisports-key': API_KEY!,
      }
    })

    let recentForm = []
    if (gamesResponse.ok) {
      const gamesData = await gamesResponse.json()
      recentForm = (gamesData.response || []).map((game: any) => {
        const isHome = game.teams.home.id === parseInt(finalTeamId!)
        const teamScore = isHome ? game.scores.home.total : game.scores.away.total
        const oppScore = isHome ? game.scores.away.total : game.scores.home.total
        
        if (teamScore > oppScore) return 'W'
        if (teamScore < oppScore) return 'L'
        return 'D'
      }).reverse()  // 최신순으로
    }

    return NextResponse.json({
      success: true,
      stats: data.response || {},
      recentForm,
      team: {
        id: finalTeamId,
        name: team,
        season
      }
    })

  } catch (error: any) {
    console.error('❌ Team stats API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stats: {},
      recentForm: []
    }, { status: 500 })
  }
}