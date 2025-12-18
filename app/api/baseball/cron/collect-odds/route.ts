import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// Baseball Cron Job: 경기 및 오즈 수집
// GET /api/baseball/cron/collect-odds
// =====================================================

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

// 리그 설정
const LEAGUES = [
  { id: 1, code: 'MLB', name: 'MLB', country: 'USA' },
  { id: 2, code: 'NPB', name: 'NPB', country: 'Japan' },
  { id: 5, code: 'KBO', name: 'KBO', country: 'South Korea' },
  { id: 29, code: 'CPBL', name: 'CPBL', country: 'Taiwan' },
]

// 팀명 한글 매핑 (DB에서 가져오거나 여기 정의)
const TEAM_NAME_KO: Record<number, string> = {
  // KBO
  88: '두산', 89: '한화', 90: 'KIA', 91: 'KT', 92: '키움',
  93: 'LG', 94: '롯데', 95: 'NC', 97: '삼성', 647: 'SSG',
  // NPB
  55: '지바 롯데', 56: '주니치', 57: '소프트뱅크', 58: '한신', 59: '히로시마',
  60: '닛폰햄', 61: '오릭스', 62: '라쿠텐', 63: '세이부', 64: '야쿠르트',
  65: '요코하마', 66: '요미우리',
  // MLB (주요 팀만)
  18: 'LA 다저스', 25: '뉴욕 양키스', 5: '보스턴', 35: '텍사스',
  // CPBL
  348: '중신', 349: '푸방', 482: '라쿠텐', 351: '유니', 569: '웨이취안',
}

// 오즈 → 확률 변환
function oddsToProb(odds: number): number {
  if (!odds || odds <= 0) return 0
  return Math.round((1 / odds) * 100)
}

// 두 확률 정규화 (합이 100이 되도록)
function normalizeProbs(homeProb: number, awayProb: number): { home: number; away: number } {
  const total = homeProb + awayProb
  if (total === 0) return { home: 50, away: 50 }
  return {
    home: Math.round((homeProb / total) * 100),
    away: Math.round((awayProb / total) * 100),
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  if (!API_FOOTBALL_KEY) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not set' }, { status: 500 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // 수집 결과 추적
  const results = {
    leagues: [] as any[],
    totalMatches: 0,
    totalOdds: 0,
    errors: [] as string[],
  }

  try {
    // 날짜 범위 설정 (오늘부터 7일)
    const today = new Date()
    const endDate = new Date()
    endDate.setDate(today.getDate() + 7)
    
    const dateFrom = today.toISOString().split('T')[0]
    const dateTo = endDate.toISOString().split('T')[0]

    console.log(`🔄 Baseball Cron 시작: ${dateFrom} ~ ${dateTo}`)

    // 각 리그별로 경기 수집
    for (const league of LEAGUES) {
      try {
        console.log(`📌 ${league.code} 경기 수집 중...`)

        // 1. 경기 목록 가져오기
        const gamesUrl = `https://v1.baseball.api-sports.io/games?league=${league.id}&season=2024&from=${dateFrom}&to=${dateTo}`
        
        const gamesResponse = await fetch(gamesUrl, {
          headers: { 'x-apisports-key': API_FOOTBALL_KEY }
        })
        
        const gamesData = await gamesResponse.json()
        
        if (gamesData.errors?.length > 0) {
          // Free 플랜 제한 시 2023 시즌 시도
          console.log(`⚠️ ${league.code} 2024 실패, 2023 시도...`)
          
          const fallbackUrl = `https://v1.baseball.api-sports.io/games?league=${league.id}&season=2023`
          const fallbackResponse = await fetch(fallbackUrl, {
            headers: { 'x-apisports-key': API_FOOTBALL_KEY }
          })
          const fallbackData = await fallbackResponse.json()
          
          if (fallbackData.response?.length > 0) {
            gamesData.response = fallbackData.response.slice(0, 20) // 최대 20경기
          }
        }

        const games = gamesData.response || []
        console.log(`✅ ${league.code}: ${games.length}개 경기 발견`)

        let leagueOddsCount = 0

        // 2. 각 경기 처리
        for (const game of games) {
          try {
            // 경기 정보 추출
            const matchData = {
              api_match_id: game.id,
              api_league_id: league.id,
              league: league.code,
              league_name: league.name,
              league_name_ko: league.name,
              season: game.league?.season?.toString() || '2024',
              match_date: game.date?.split('T')[0],
              match_time: game.time,
              match_timestamp: game.timestamp ? new Date(game.timestamp * 1000).toISOString() : null,
              home_team_id: game.teams?.home?.id,
              home_team: game.teams?.home?.name,
              home_team_ko: TEAM_NAME_KO[game.teams?.home?.id] || game.teams?.home?.name,
              home_team_logo: game.teams?.home?.logo,
              away_team_id: game.teams?.away?.id,
              away_team: game.teams?.away?.name,
              away_team_ko: TEAM_NAME_KO[game.teams?.away?.id] || game.teams?.away?.name,
              away_team_logo: game.teams?.away?.logo,
              venue: game.venue?.name || null,
              status: game.status?.short || 'NS',
              home_score: game.scores?.home?.total,
              away_score: game.scores?.away?.total,
            }

            // baseball_matches 테이블에 upsert
            const { error: matchError } = await supabase
              .from('baseball_matches')
              .upsert(matchData, { onConflict: 'api_match_id' })

            if (matchError) {
              console.error(`❌ 경기 저장 실패:`, matchError.message)
              continue
            }

            results.totalMatches++

            // 3. 오즈 가져오기 (예정된 경기만)
            if (game.status?.short === 'NS' || game.status?.short === 'SCHEDULED') {
              const oddsUrl = `https://v1.baseball.api-sports.io/odds?game=${game.id}`
              
              const oddsResponse = await fetch(oddsUrl, {
                headers: { 'x-apisports-key': API_FOOTBALL_KEY }
              })
              
              const oddsData = await oddsResponse.json()
              const odds = oddsData.response?.[0]

              if (odds?.bookmakers?.length > 0) {
                // 첫 번째 북메이커의 오즈 사용
                const bookmaker = odds.bookmakers[0]
                const bets = bookmaker.bets || []

                // 머니라인 (승/패) 찾기
                const moneyline = bets.find((b: any) => 
                  b.name === 'Home/Away' || b.name === 'Match Winner' || b.name === '1X2'
                )

                let homeWinOdds = 0
                let awayWinOdds = 0

                if (moneyline?.values) {
                  for (const v of moneyline.values) {
                    if (v.value === 'Home' || v.value === '1') {
                      homeWinOdds = parseFloat(v.odd) || 0
                    }
                    if (v.value === 'Away' || v.value === '2') {
                      awayWinOdds = parseFloat(v.odd) || 0
                    }
                  }
                }

                // 확률 계산
                const homeProb = oddsToProb(homeWinOdds)
                const awayProb = oddsToProb(awayWinOdds)
                const normalized = normalizeProbs(homeProb, awayProb)

                // 오버/언더 찾기
                const totals = bets.find((b: any) => 
                  b.name === 'Over/Under' || b.name === 'Total'
                )

                let overUnderLine = null
                let overOdds = 0
                let underOdds = 0

                if (totals?.values) {
                  for (const v of totals.values) {
                    if (v.value?.includes('Over')) {
                      overUnderLine = parseFloat(v.value.replace('Over ', '')) || null
                      overOdds = parseFloat(v.odd) || 0
                    }
                    if (v.value?.includes('Under')) {
                      underOdds = parseFloat(v.odd) || 0
                    }
                  }
                }

                // 오즈 데이터
                const oddsRecord = {
                  api_match_id: game.id,
                  league: league.code,
                  home_win_odds: homeWinOdds || null,
                  away_win_odds: awayWinOdds || null,
                  home_win_prob: normalized.home,
                  away_win_prob: normalized.away,
                  over_under_line: overUnderLine,
                  over_odds: overOdds || null,
                  under_odds: underOdds || null,
                  bookmaker: bookmaker.name,
                  collected_at: new Date().toISOString(),
                }

                // baseball_odds_latest 테이블에 upsert
                const { error: oddsError } = await supabase
                  .from('baseball_odds_latest')
                  .upsert(oddsRecord, { onConflict: 'api_match_id' })

                if (!oddsError) {
                  // baseball_odds_history 테이블에도 저장 (트렌드용)
                  await supabase.from('baseball_odds_history').insert(oddsRecord)
                  
                  results.totalOdds++
                  leagueOddsCount++
                }
              }
            }

            // API 레이트 리밋 방지
            await new Promise(resolve => setTimeout(resolve, 100))

          } catch (gameError: any) {
            console.error(`❌ 경기 처리 오류:`, gameError.message)
          }
        }

        results.leagues.push({
          league: league.code,
          matches: games.length,
          odds: leagueOddsCount,
        })

      } catch (leagueError: any) {
        console.error(`❌ ${league.code} 오류:`, leagueError.message)
        results.errors.push(`${league.code}: ${leagueError.message}`)
      }
    }

    const duration = Date.now() - startTime

    console.log(`✅ Baseball Cron 완료: ${results.totalMatches}경기, ${results.totalOdds}오즈 (${duration}ms)`)

    return NextResponse.json({
      success: true,
      message: 'Baseball odds collection completed',
      duration: `${duration}ms`,
      results,
    })

  } catch (error: any) {
    console.error('❌ Baseball Cron 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      results,
    }, { status: 500 })
  }
}