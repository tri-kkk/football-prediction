import { NextRequest, NextResponse } from 'next/server'

// 리그 ID 매핑
const LEAGUE_IDS: Record<string, number> = {
  'PL': 39,    // Premier League
  'PD': 140,   // La Liga
  'BL1': 78,   // Bundesliga
  'SA': 135,   // Serie A
  'FL1': 61,   // Ligue 1
  'CL': 2,     // Champions League
  'PPL': 94,   // Primeira Liga
  'DED': 88,   // Eredivisie
  'EL': 3,     // Europa League
  'ELC': 40    // Championship
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.API_FOOTBALL_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    console.log('🔴 라이브 경기 조회 시작...')

    // API-Football에서 현재 라이브 경기 조회
    const response = await fetch(
      'https://v3.football.api-sports.io/fixtures?live=all',
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        next: { revalidate: 0 } // 캐싱 안 함
      }
    )

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`)
    }

    const data = await response.json()
    console.log('📥 받은 라이브 경기 수:', data.response?.length || 0)

    // 우리가 지원하는 리그만 필터링
    const supportedLeagueIds = Object.values(LEAGUE_IDS)
    const liveMatches = data.response.filter((match: any) =>
      supportedLeagueIds.includes(match.league.id)
    )

    console.log('✅ 필터링된 경기 수:', liveMatches.length)

    // 한글 팀명 추가 (기존 teamLogos.ts 활용)
    const matchesWithKorean = liveMatches.map((match: any) => ({
      ...match,
      teams: {
        home: {
          ...match.teams.home,
          nameKR: translateTeamName(match.teams.home.name)
        },
        away: {
          ...match.teams.away,
          nameKR: translateTeamName(match.teams.away.name)
        }
      }
    }))

    return NextResponse.json({
      success: true,
      count: matchesWithKorean.length,
      matches: matchesWithKorean,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ 라이브 경기 조회 실패:', error)
    return NextResponse.json(
      { 
        error: '라이브 경기를 불러올 수 없습니다.',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// 팀명 번역 함수 (간단 버전, 나중에 teamLogos.ts와 통합)
function translateTeamName(englishName: string): string {
  const translations: Record<string, string> = {
    'Liverpool': '리버풀',
    'Chelsea': '첼시',
    'Arsenal': '아스널',
    'Manchester City': '맨체스터 시티',
    'Manchester United': '맨체스터 유나이티드',
    'Tottenham': '토트넘',
    'Real Madrid': '레알 마드리드',
    'Barcelona': '바르셀로나',
    'Bayern Munich': '바이에른 뮌헨',
    'Borussia Dortmund': '도르트문트',
    // 더 추가...
  }

  return translations[englishName] || englishName
}