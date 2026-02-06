// 📁 파일 위치: app/api/match-statistics/route.ts

import { NextResponse } from 'next/server'

// API-Football 호출 함수
async function fetchFromApiFootball(endpoint: string) {
  const response = await fetch(`https://v3.football.api-sports.io${endpoint}`, {
    headers: {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': process.env.API_FOOTBALL_KEY || ''
    },
    next: { revalidate: 300 } // 5분 캐싱
  })
  
  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status}`)
  }
  
  return response.json()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fixtureId = searchParams.get('fixtureId')
  
  if (!fixtureId) {
    return NextResponse.json({ error: 'fixtureId is required' }, { status: 400 })
  }
  
  try {
    // 1. 경기 통계 조회
    const statsData = await fetchFromApiFootball(`/fixtures/statistics?fixture=${fixtureId}`)
    
    if (!statsData.response || statsData.response.length === 0) {
      return NextResponse.json({ 
        statistics: null,
        message: 'No statistics available for this match'
      })
    }
    
    // 2. 양팀 통계 파싱
    const homeStats = statsData.response[0]
    const awayStats = statsData.response[1]
    
    // 통계 항목 추출 함수
    const getStatValue = (stats: any[], type: string): string | number => {
      const stat = stats?.find((s: any) => s.type === type)
      return stat?.value ?? '-'
    }
    
    const statistics = {
      home: {
        team: homeStats?.team?.name || 'Home',
        logo: homeStats?.team?.logo || '',
        stats: {
          possession: getStatValue(homeStats?.statistics, 'Ball Possession'),
          totalShots: getStatValue(homeStats?.statistics, 'Total Shots'),
          shotsOnTarget: getStatValue(homeStats?.statistics, 'Shots on Goal'),
          shotsOffTarget: getStatValue(homeStats?.statistics, 'Shots off Goal'),
          blockedShots: getStatValue(homeStats?.statistics, 'Blocked Shots'),
          cornerKicks: getStatValue(homeStats?.statistics, 'Corner Kicks'),
          fouls: getStatValue(homeStats?.statistics, 'Fouls'),
          offsides: getStatValue(homeStats?.statistics, 'Offsides'),
          yellowCards: getStatValue(homeStats?.statistics, 'Yellow Cards'),
          redCards: getStatValue(homeStats?.statistics, 'Red Cards'),
          goalkeeperSaves: getStatValue(homeStats?.statistics, 'Goalkeeper Saves'),
          totalPasses: getStatValue(homeStats?.statistics, 'Total passes'),
          passAccuracy: getStatValue(homeStats?.statistics, 'Passes accurate'),
          passPercent: getStatValue(homeStats?.statistics, 'Passes %'),
          expectedGoals: getStatValue(homeStats?.statistics, 'expected_goals'),
        }
      },
      away: {
        team: awayStats?.team?.name || 'Away',
        logo: awayStats?.team?.logo || '',
        stats: {
          possession: getStatValue(awayStats?.statistics, 'Ball Possession'),
          totalShots: getStatValue(awayStats?.statistics, 'Total Shots'),
          shotsOnTarget: getStatValue(awayStats?.statistics, 'Shots on Goal'),
          shotsOffTarget: getStatValue(awayStats?.statistics, 'Shots off Goal'),
          blockedShots: getStatValue(awayStats?.statistics, 'Blocked Shots'),
          cornerKicks: getStatValue(awayStats?.statistics, 'Corner Kicks'),
          fouls: getStatValue(awayStats?.statistics, 'Fouls'),
          offsides: getStatValue(awayStats?.statistics, 'Offsides'),
          yellowCards: getStatValue(awayStats?.statistics, 'Yellow Cards'),
          redCards: getStatValue(awayStats?.statistics, 'Red Cards'),
          goalkeeperSaves: getStatValue(awayStats?.statistics, 'Goalkeeper Saves'),
          totalPasses: getStatValue(awayStats?.statistics, 'Total passes'),
          passAccuracy: getStatValue(awayStats?.statistics, 'Passes accurate'),
          passPercent: getStatValue(awayStats?.statistics, 'Passes %'),
          expectedGoals: getStatValue(awayStats?.statistics, 'expected_goals'),
        }
      }
    }
    
    return NextResponse.json({ 
      statistics,
      fixtureId
    })
    
  } catch (error) {
    console.error('Match statistics API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch match statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}