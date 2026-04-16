import { NextRequest, NextResponse } from 'next/server'

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// ============================================================
// 🔥 리그 코드 매핑 (50개 - 아프리카 추가!)
// ============================================================
const LEAGUE_IDS: { [key: string]: number } = {
  // ===== 🏆 국제 대회 =====
  'WC': 1,      // World Cup 2026
  'CL': 2,      // Champions League
  'EL': 3,      // Europa League
  'UECL': 848,  // Conference League
  'UNL': 5,     // Nations League
  'AFCON': 6,   // Africa Cup of Nations
  
  // ===== 🌍 아프리카 리그 (5개) - NEW! =====
  'EGY': 233,   // Egyptian Premier League
  'RSA': 288,   // South African Premier League
  'MAR': 200,   // Botola Pro (Morocco)
  'DZA': 187,   // Ligue 1 Algeria
  'TUN': 202,   // Ligue 1 Tunisia
  
  // ===== 🏴󠁧󠁢󠁥󠁮󠁧󠁿 잉글랜드 (4개) =====
  'PL': 39,     // Premier League
  'ELC': 40,    // Championship
  'FAC': 45,    // FA Cup
  'EFL': 48,    // EFL Cup
  
  // ===== 🇪🇸 스페인 (3개) =====
  'PD': 140,    // La Liga
  'SD': 141,    // La Liga 2
  'CDR': 143,   // Copa del Rey
  
  // ===== 🇩🇪 독일 (3개) =====
  'BL1': 78,    // Bundesliga
  'BL2': 79,    // Bundesliga 2
  'DFB': 81,    // DFB Pokal
  
  // ===== 🇮🇹 이탈리아 (3개) =====
  'SA': 135,    // Serie A
  'SB': 136,    // Serie B
  'CIT': 137,   // Coppa Italia
  
  // ===== 🇫🇷 프랑스 (3개) =====
  'FL1': 61,    // Ligue 1
  'FL2': 62,    // Ligue 2
  'CDF': 66,    // Coupe de France
  
  // ===== 🇵🇹 포르투갈 (2개) =====
  'PPL': 94,    // Primeira Liga
  'TDP': 96,    // Taca de Portugal
  
  // ===== 🇳🇱 네덜란드 (2개) =====
  'DED': 88,    // Eredivisie
  'KNV': 90,    // KNVB Beker
  
  // ===== 🇰🇷 한국 (2개) =====
  'KL1': 292,   // K League 1
  'KL2': 293,   // K League 2
  
  // ===== 🇯🇵 일본 (2개) =====
  'J1': 98,     // J1 League
  'J2': 99,     // J2 League
  
  // ===== 🇸🇦 사우디아라비아 (1개) =====
  'SAL': 307,   // Saudi Pro League
  
  // ===== 🇦🇺 호주 (1개) =====
  'ALG': 188,   // A-League
  
  // ===== 🇨🇳 중국 (1개) =====
  'CSL': 169,   // Chinese Super League
  
  // ===== 🇹🇷 터키 (1개) =====
  'TSL': 203,   // Süper Lig
  
  // ===== 🇧🇪 벨기에 (1개) =====
  'JPL': 144,   // Jupiler Pro League
  
  // ===== 🏴󠁧󠁢󠁳󠁣󠁴󠁿 스코틀랜드 (1개) =====
  'SPL': 179,   // Scottish Premiership
  
  // ===== 🇨🇭 스위스 (1개) =====
  'SSL': 207,   // Swiss Super League
  
  // ===== 🇦🇹 오스트리아 (1개) =====
  'ABL': 218,   // Austrian Bundesliga
  
  // ===== 🇬🇷 그리스 (1개) =====
  'GSL': 197,   // Super League Greece
  
  // ===== 🇩🇰 덴마크 (1개) =====
  'DSL': 119,   // Danish Superliga
  
  // ===== 🇧🇷 브라질 (1개) =====
  'BSA': 71,    // Brasileirão Série A
  
  // ===== 🇦🇷 아르헨티나 (1개) =====
  'ARG': 128,   // Liga Profesional Argentina
  
  // ===== 🌎 남미 국제대회 (2개) =====
  'COP': 13,    // Copa Libertadores
  'COS': 11,    // Copa Sudamericana
  
  // ===== 🇺🇸 미국/멕시코 (2개) =====
  'MLS': 253,   // MLS
  'LMX': 262,   // Liga MX
}

// 리그별 시즌 계산
function getCurrentSeason(leagueCode: string): number {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // 아시아/남미/북미 리그는 단일 연도 시즌
  const singleYearLeagues = ['KL1', 'KL2', 'J1', 'J2', 'MLS', 'BSA', 'ARG', 'CSL', 'LMX']
  if (singleYearLeagues.includes(leagueCode)) {
    return year
  }

  // 유럽 리그: 1~6월은 전년도 시즌
  if (month <= 6) {
    return year - 1
  }
  return year
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
  home_team: string
  away_team: string
  league: string
  match_date: string
  predicted_home_win: number
  predicted_draw: number
  predicted_away_win: number
  predicted_home_score: number
  predicted_away_score: number
  predicted_winner: string
}) {
  try {
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

    if (!checkResponse.ok) {
      const err = await checkResponse.text()
      console.error(`    ❌ SELECT 실패: ${checkResponse.status} - ${err}`)
      return false
    }

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
      
      if (!response.ok) {
        const err = await response.text()
        console.error(`    ❌ UPDATE 실패: ${response.status} - ${err}`)
        return false
      }
      return true
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
      
      if (!response.ok) {
        const err = await response.text()
        console.error(`    ❌ INSERT 실패: ${response.status} - ${err}`)
        return false
      }
      return true
    }
  } catch (error: any) {
    console.error(`    ❌ 저장 예외: ${error.message}`)
    return false
  }
}

// API-Football에서 예정된 경기 + 배당률 가져오기
async function getUpcomingFixturesWithOdds(leagueCode: string, leagueId: number, days: number = 7) {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) throw new Error('API_FOOTBALL_KEY not set')

  const fixtures: any[] = []
  const season = getCurrentSeason(leagueCode)

  console.log(`  📅 시즌: ${season}`)

  // 오늘부터 N일간 경기 가져오기
  for (let i = 0; i <= days; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&date=${dateStr}&timezone=Asia/Seoul`
    
    const response = await fetch(url, {
      headers: { 'x-apisports-key': apiKey }
    })

    if (response.ok) {
      const data = await response.json()
      
      if (data.response && data.response.length > 0) {
        fixtures.push(...data.response)
      }
    }

    // 레이트 리밋 방지
    await new Promise(r => setTimeout(r, 150))
  }

  // 예정된 경기만 필터링 (NS = Not Started, TBD, 또는 PST)
  const scheduled = fixtures.filter(f => {
    const status = f.fixture.status.short
    return status === 'NS' || status === 'TBD' || status === 'PST'
  })
  
  console.log(`  ✅ 예정된 경기: ${scheduled.length}개`)

  // 각 경기에 배당률 추가
  const fixturesWithOdds = []

  for (const fixture of scheduled) {
    try {
      const oddsResponse = await fetch(
        `https://v3.football.api-sports.io/odds?fixture=${fixture.fixture.id}&bookmaker=8`,
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
  console.log(`📊 총 ${Object.keys(LEAGUE_IDS).length}개 리그 처리 예정`)

  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'API_FOOTBALL_KEY not configured' },
      { status: 500 }
    )
  }

  try {
    let generatedCount = 0
    let errorCount = 0
    const leagueStats: { league: string; count: number }[] = []

    // 각 리그별로 처리
    for (const [leagueCode, leagueId] of Object.entries(LEAGUE_IDS)) {
      console.log(`\n📋 ${leagueCode} (ID: ${leagueId}) 처리 중...`)

      try {
        const fixtures = await getUpcomingFixturesWithOdds(leagueCode, leagueId, 7)
        
        let leagueCount = 0

        for (const fixture of fixtures) {
          try {
            const matchId = fixture.fixture.id
            const homeTeam = fixture.teams.home.name
            const awayTeam = fixture.teams.away.name
            const matchDate = fixture.fixture.date
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
              home_team: homeTeam,
              away_team: awayTeam,
              league: leagueCode,
              match_date: matchDate,
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
              leagueCount++
            } else {
              errorCount++
            }

          } catch (err) {
            console.error(`  ❌ 경기 처리 오류:`, err)
            errorCount++
          }
        }

        leagueStats.push({ league: leagueCode, count: leagueCount })

        // 리그 간 대기 (0.3초로 단축)
        await new Promise(r => setTimeout(r, 300))

      } catch (err) {
        console.error(`❌ ${leagueCode} 리그 처리 오류:`, err)
        leagueStats.push({ league: leagueCode, count: 0 })
      }
    }

    console.log(`\n🎯 예측 생성 완료: ${generatedCount}개 생성, ${errorCount}개 오류`)

    return NextResponse.json({
      success: true,
      message: '예측 생성 완료',
      stats: {
        leaguesProcessed: Object.keys(LEAGUE_IDS).length,
        generated: generatedCount,
        errors: errorCount,
        byLeague: leagueStats.filter(s => s.count > 0)
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