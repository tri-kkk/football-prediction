// app/api/baseball/h2h/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const homeTeam = searchParams.get('homeTeam')
  const awayTeam = searchParams.get('awayTeam')
  const homeTeamId = searchParams.get('homeTeamId')
  const awayTeamId = searchParams.get('awayTeamId')
  
  if ((!homeTeam && !homeTeamId) || (!awayTeam && !awayTeamId)) {
    return NextResponse.json({ 
      success: false, 
      error: 'Team names or IDs required' 
    }, { status: 400 })
  }

  try {
    const API_KEY = process.env.API_FOOTBALL_KEY
    const API_HOST = 'v1.baseball.api-sports.io'
    
    console.log('🔍 Fetching H2H:', { homeTeam, awayTeam, homeTeamId, awayTeamId })
    
    // 1. 팀 ID 찾기 (필요하면)
    let finalHomeTeamId = homeTeamId
    let finalAwayTeamId = awayTeamId
    
    if (!finalHomeTeamId && homeTeam) {
      const searchUrl = `https://${API_HOST}/teams?search=${encodeURIComponent(homeTeam)}&league=1&season=2025`
      console.log('  Searching home team:', homeTeam)
      console.log('  URL:', searchUrl)
      
      const res = await fetch(searchUrl, {
        headers: {
          'x-apisports-key': API_KEY!,
        }
      })
      
      console.log('  Response status:', res.status)
      
      if (res.ok) {
        const data = await res.json()
        console.log('  Response data:', JSON.stringify(data, null, 2))
        
        if (data.response?.[0]) {
          finalHomeTeamId = data.response[0].id.toString()
          console.log(`  ✅ Found home team ID: ${finalHomeTeamId} (${data.response[0].name})`)
        } else {
          console.log('  ⚠️ No teams found in response')
        }
      } else {
        console.log('  ❌ API error:', await res.text())
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    if (!finalAwayTeamId && awayTeam) {
      const searchUrl = `https://${API_HOST}/teams?search=${encodeURIComponent(awayTeam)}&league=1&season=2025`
      console.log('  Searching away team:', awayTeam)
      console.log('  URL:', searchUrl)
      
      const res = await fetch(searchUrl, {
        headers: {
          'x-apisports-key': API_KEY!,
        }
      })
      
      console.log('  Response status:', res.status)
      
      if (res.ok) {
        const data = await res.json()
        console.log('  Response data:', JSON.stringify(data, null, 2))
        
        if (data.response?.[0]) {
          finalAwayTeamId = data.response[0].id.toString()
          console.log(`  ✅ Found away team ID: ${finalAwayTeamId} (${data.response[0].name})`)
        } else {
          console.log('  ⚠️ No teams found in response')
        }
      } else {
        console.log('  ❌ API error:', await res.text())
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    if (!finalHomeTeamId || !finalAwayTeamId) {
      console.error('  ❌ Could not find team IDs')
      return NextResponse.json({
        success: false,
        error: 'Could not find team IDs',
        matches: [],
        summary: { total: 0, homeWins: 0, awayWins: 0, draws: 0 }
      }, { status: 404 })
    }
    
    // 2. H2H 조회 (올바른 형식: teamId-teamId)
    const h2hParam = `${finalHomeTeamId}-${finalAwayTeamId}`
    console.log(`  H2H param: ${h2hParam}`)
    
    // 여러 시즌 시도
    const allMatches: any[] = []
    const seasons = ['2025', '2024', '2023', '2022']
    
    for (const season of seasons) {
      try {
        const url = `https://${API_HOST}/games/h2h?h2h=${h2hParam}&season=${season}`
        console.log(`  Trying: games/h2h?h2h=${h2hParam}&season=${season}`)
        
        const response = await fetch(url, {
          headers: {
            'x-apisports-key': API_KEY!,
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`  ${season}: ${data.results || 0} results`)
          
          if (data.response && data.response.length > 0) {
            console.log(`  ✅ Found ${data.response.length} matches in ${season}`)
            allMatches.push(...data.response)
          }
        } else {
          console.log(`  ❌ ${season}: HTTP ${response.status}`)
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (seasonError: any) {
        console.error(`  ❌ Error in season ${season}:`, seasonError.message)
      }
      
      // 충분한 데이터 있으면 중단
      if (allMatches.length >= 10) {
        console.log(`  Stopping: Have enough data (${allMatches.length} matches)`)
        break
      }
    }
    
    console.log(`✅ Total H2H matches found: ${allMatches.length}`)

    if (allMatches.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        matches: [],
        summary: {
          total: 0,
          homeWins: 0,
          awayWins: 0,
          draws: 0,
          homeTeam: homeTeam || 'Home',
          awayTeam: awayTeam || 'Away'
        },
        message: 'No H2H data found for these teams in recent seasons'
      })
    }

    // 최근 경기부터 정렬
    const sortedMatches = allMatches.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // 최근 10경기만
    const matches = sortedMatches.slice(0, 10).map((game: any) => ({
      id: game.id,
      date: game.date,
      homeTeam: game.teams.home.name,
      homeTeamId: game.teams.home.id,
      homeTeamLogo: game.teams.home.logo,
      awayTeam: game.teams.away.name,
      awayTeamId: game.teams.away.id,
      awayTeamLogo: game.teams.away.logo,
      homeScore: game.scores.home.total,
      awayScore: game.scores.away.total,
      winner: game.scores.home.total > game.scores.away.total 
        ? 'home' 
        : game.scores.home.total < game.scores.away.total 
          ? 'away' 
          : 'draw',
      league: game.league.name,
      season: game.league.season,
      status: game.status.short
    }))

    // 통산 전적 계산
    let homeWins = 0
    let awayWins = 0
    let draws = 0

    matches.forEach((match: any) => {
      if (match.winner === 'home') homeWins++
      else if (match.winner === 'away') awayWins++
      else draws++
    })

    return NextResponse.json({
      success: true,
      count: matches.length,
      matches,
      summary: {
        total: matches.length,
        homeWins,
        awayWins,
        draws,
        homeTeam: homeTeam || matches[0]?.homeTeam,
        awayTeam: awayTeam || matches[0]?.awayTeam
      }
    })

  } catch (error: any) {
    console.error('❌ H2H API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      matches: [],
      summary: {
        total: 0,
        homeWins: 0,
        awayWins: 0,
        draws: 0
      }
    }, { status: 500 })
  }
}