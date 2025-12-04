import { NextRequest, NextResponse } from 'next/server'

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// 리그 코드 매핑
const LEAGUE_IDS: { [key: string]: number } = {
  'PL': 39,    // Premier League
  'PD': 140,   // La Liga
  'BL1': 78,   // Bundesliga
  'SA': 135,   // Serie A
  'FL1': 61,   // Ligue 1
  'CL': 2,     // Champions League
  'EL': 3,     // Europa League
  'ELC': 40,   // Championship
  'PPL': 94,   // Primeira Liga
  'DED': 88,   // Eredivisie
}

// 예상 스코어 계산 (확률 기반)
function calculatePredictedScore(
  homeProb: number,
  drawProb: number,
  awayProb: number
): { homeScore: number; awayScore: number; winner: 'home' | 'draw' | 'away' } {
  // 승자 결정
  let winner: 'home' | 'draw' | 'away'
  if (homeProb >= drawProb && homeProb >= awayProb) {
    winner = 'home'
  } else if (awayProb >= homeProb && awayProb >= drawProb) {
    winner = 'away'
  } else {
    winner = 'draw'
  }

  // 예상 스코어 계산 (확률 기반 휴리스틱)
  let homeScore: number
  let awayScore: number

  if (winner === 'home') {
    if (homeProb >= 70) {
      homeScore = 3
      awayScore = Math.random() > 0.5 ? 1 : 0
    } else if (homeProb >= 55) {
      homeScore = 2
      awayScore = Math.random() > 0.6 ? 1 : 0
    } else {
      homeScore = 2
      awayScore = 1
    }
  } else if (winner === 'away') {
    if (awayProb >= 60) {
      awayScore = 2
      homeScore = Math.random() > 0.5 ? 1 : 0
    } else if (awayProb >= 45) {
      awayScore = 2
      homeScore = 1
    } else {
      awayScore = 1
      homeScore = 0
    }
  } else {
    if (drawProb >= 35) {
      homeScore = 1
      awayScore = 1
    } else {
      homeScore = 2
      awayScore = 2
    }
  }

  return { homeScore, awayScore, winner }
}

// 배당률 → 확률 변환 (정규화)
function oddsToProb(homeOdds: number, drawOdds: number, awayOdds: number) {
  const homeProb = 1 / homeOdds
  const drawProb = 1 / drawOdds
  const awayProb = 1 / awayOdds
  const total = homeProb + drawProb + awayProb

  return {
    home: Math.round((homeProb / total) * 100),
    draw: Math.round((drawProb / total) * 100),
    away: Math.round((awayProb / total) * 100)
  }
}

// match_predictions 테이블에 저장 (UPSERT)
async function savePrediction(prediction: {
  match_id: number
  predicted_home_win: number
  predicted_draw: number
  predicted_away_win: number
  predicted_home_score: number
  predicted_away_score: number
  predicted_winner: string
}) {
  // 먼저 기존 데이터 확인
  const checkResponse = await fetch(
    `${supabaseUrl}/rest/v1/match_predictions?match_id=eq.${prediction.match_id}&select=match_id`,
    {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    }
  )

  const existing = await checkResponse.json()

  if (existing && existing.length > 0) {
    // UPDATE
    const response = await fetch(
      `${supabaseUrl}/rest/v1/match_predictions?match_id=eq.${prediction.match_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          predicted_home_win: prediction.predicted_home_win,
          predicted_draw: prediction.predicted_draw,
          predicted_away_win: prediction.predicted_away_win,
          predicted_home_score: prediction.predicted_home_score,
          predicted_away_score: prediction.predicted_away_score,
          predicted_winner: prediction.predicted_winner
        })
      }
    )
    return response.ok
  } else {
    // INSERT
    const response = await fetch(
      `${supabaseUrl}/rest/v1/match_predictions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify(prediction)
      }
    )
    return response.ok
  }
}

// API-Football에서 예정된 경기 + 배당률 가져오기
async function getUpcomingFixturesWithOdds(leagueId: number, days: number = 3) {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) throw new Error('API_FOOTBALL_KEY not set')

  const fixtures: any[] = []

  // 오늘부터 N일간 경기 가져오기
  for (let i = 0; i <= days; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    console.log(`  📅 날짜 조회: ${dateStr}`)

    const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=2025&date=${dateStr}&timezone=Asia/Seoul`
    
    const response = await fetch(url, {
      headers: { 'x-apisports-key': apiKey }
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`  📦 API 응답: ${data.response?.length || 0}개 경기, errors: ${JSON.stringify(data.errors)}`)
      
      if (data.response && data.response.length > 0) {
        // 모든 경기 상태 로깅
        data.response.forEach((f: any) => {
          console.log(`    - ${f.teams.home.name} vs ${f.teams.away.name} [${f.fixture.status.short}]`)
        })
        fixtures.push(...data.response)
      }
    } else {
      console.log(`  ❌ API 오류: ${response.status}`)
    }

    // 레이트 리밋 방지
    await new Promise(r => setTimeout(r, 200))
  }

  // 예정된 경기만 필터링 (NS = Not Started, TBD, 또는 1H 이전)
  const scheduled = fixtures.filter(f => {
    const status = f.fixture.status.short
    return status === 'NS' || status === 'TBD' || status === 'PST' || status === 'CANC'
  })
  
  console.log(`  ✅ 예정된 경기: ${scheduled.length}개 (전체 ${fixtures.length}개 중)`)

  // 각 경기에 배당률 추가
  const fixturesWithOdds = []

  for (const fixture of scheduled) {
    try {
      const oddsResponse = await fetch(
        `https://v3.football.api-sports.io/odds?` +
        `fixture=${fixture.fixture.id}&bookmaker=8`,  // bet365
        {
          headers: { 'x-apisports-key': apiKey }
        }
      )

      let homeOdds = 2.0, drawOdds = 3.5, awayOdds = 3.0  // 기본값

      if (oddsResponse.ok) {
        const oddsData = await oddsResponse.json()
        const bets = oddsData.response?.[0]?.bookmakers?.[0]?.bets
        const matchWinner = bets?.find((b: any) => b.name === 'Match Winner')
        
        if (matchWinner?.values) {
          const values = matchWinner.values
          homeOdds = parseFloat(values.find((v: any) => v.value === 'Home')?.odd) || 2.0
          drawOdds = parseFloat(values.find((v: any) => v.value === 'Draw')?.odd) || 3.5
          awayOdds = parseFloat(values.find((v: any) => v.value === 'Away')?.odd) || 3.0
        }
      }

      fixturesWithOdds.push({
        ...fixture,
        odds: { home: homeOdds, draw: drawOdds, away: awayOdds }
      })

      // 레이트 리밋 방지
      await new Promise(r => setTimeout(r, 100))

    } catch (error) {
      // 배당률 조회 실패시 기본값 사용
      fixturesWithOdds.push({
        ...fixture,
        odds: { home: 2.0, draw: 3.5, away: 3.0 }
      })
    }
  }

  return fixturesWithOdds
}

// 메인 핸들러
export async function GET(request: NextRequest) {
  console.log('🎯 예측 생성 Cron 시작:', new Date().toISOString())

  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'API_FOOTBALL_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    let generatedCount = 0
    let updatedCount = 0
    let errorCount = 0

    // 각 리그별로 처리
    for (const [leagueCode, leagueId] of Object.entries(LEAGUE_IDS)) {
      console.log(`📋 ${leagueCode} (ID: ${leagueId}) 처리 중...`)

      try {
        const fixtures = await getUpcomingFixturesWithOdds(leagueId, 3)
        console.log(`  - ${fixtures.length}개 경기 발견`)

        for (const fixture of fixtures) {
          try {
            const matchId = fixture.fixture.id
            const homeTeam = fixture.teams.home.name
            const awayTeam = fixture.teams.away.name
            const odds = fixture.odds

            // 확률 계산
            const probs = oddsToProb(odds.home, odds.draw, odds.away)

            // 예상 스코어 계산
            const { homeScore, awayScore, winner } = calculatePredictedScore(
              probs.home,
              probs.draw,
              probs.away
            )

            // 저장
            const prediction = {
              match_id: matchId,
              predicted_home_win: probs.home,
              predicted_draw: probs.draw,
              predicted_away_win: probs.away,
              predicted_home_score: homeScore,
              predicted_away_score: awayScore,
              predicted_winner: winner
            }

            const saved = await savePrediction(prediction)

            if (saved) {
              console.log(`  ✅ ${homeTeam} vs ${awayTeam} → ${homeScore}-${awayScore} (${winner})`)
              generatedCount++
            } else {
              errorCount++
            }

          } catch (err) {
            console.error(`  ❌ 경기 처리 오류:`, err)
            errorCount++
          }
        }

        // 리그 간 대기
        await new Promise(r => setTimeout(r, 500))

      } catch (err) {
        console.error(`❌ ${leagueCode} 리그 처리 오류:`, err)
      }
    }

    console.log(`🎯 예측 생성 완료: ${generatedCount}개 생성, ${errorCount}개 오류`)

    return NextResponse.json({
      success: true,
      message: '예측 생성 완료',
      stats: {
        generated: generatedCount,
        errors: errorCount
      }
    })

  } catch (error: any) {
    console.error('💥 예측 생성 Cron 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST도 지원 (Supabase Cron에서 호출)
export async function POST(request: NextRequest) {
  return GET(request)
}