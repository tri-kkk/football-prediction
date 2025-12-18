import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// =====================================================
// Baseball 샘플 데이터 수집 (2023 시즌)
// GET /api/baseball/cron/collect-sample
// =====================================================

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

// 리그 설정
const LEAGUES = [
  { id: 1, code: 'MLB', name: 'MLB' },
  { id: 2, code: 'NPB', name: 'NPB' },
  { id: 5, code: 'KBO', name: 'KBO' },
  { id: 29, code: 'CPBL', name: 'CPBL' },
]

// 팀명 한글 매핑
const TEAM_NAME_KO: Record<number, string> = {
  // KBO
  88: '두산 베어스', 89: '한화 이글스', 90: 'KIA 타이거즈', 91: 'KT 위즈', 92: '키움 히어로즈',
  93: 'LG 트윈스', 94: '롯데 자이언츠', 95: 'NC 다이노스', 97: '삼성 라이온즈', 647: 'SSG 랜더스',
  // NPB
  55: '지바 롯데 마린즈', 56: '주니치 드래곤즈', 57: '소프트뱅크 호크스', 58: '한신 타이거스', 59: '히로시마 카프',
  60: '닛폰햄 파이터스', 61: '오릭스 버팔로즈', 62: '라쿠텐 이글스', 63: '세이부 라이온즈', 64: '야쿠르트 스왈로즈',
  65: '요코하마 베이스타즈', 66: '요미우리 자이언츠',
  // MLB
  2: '애리조나', 3: '애틀랜타', 4: '볼티모어', 5: '보스턴', 6: '시카고 컵스',
  7: '시카고 화이트삭스', 8: '신시내티', 9: '클리블랜드', 10: '콜로라도', 12: '디트로이트',
  15: '휴스턴', 16: '캔자스시티', 17: 'LA 에인절스', 18: 'LA 다저스', 19: '마이애미',
  20: '밀워키', 22: '미네소타', 24: '뉴욕 메츠', 25: '뉴욕 양키스', 26: '오클랜드',
  27: '필라델피아', 28: '피츠버그', 30: '샌디에이고', 31: '샌프란시스코', 32: '시애틀',
  33: '세인트루이스', 34: '탬파베이', 35: '텍사스', 36: '토론토', 37: '워싱턴',
  // CPBL
  348: '중신 브라더스', 349: '푸방 가디언스', 482: '라쿠텐 몽키스', 351: '유니 라이온즈', 569: '웨이취안 드래곤즈',
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  if (!API_FOOTBALL_KEY) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not set' }, { status: 500 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const results = {
    leagues: [] as any[],
    totalMatches: 0,
    errors: [] as string[],
  }

  try {
    console.log('🔄 Baseball 샘플 데이터 수집 시작 (2023 시즌)')

    for (const league of LEAGUES) {
      try {
        console.log(`📌 ${league.code} 2023 시즌 수집 중...`)

        // 2023 시즌 경기 가져오기 (최대 50개)
        const gamesUrl = `https://v1.baseball.api-sports.io/games?league=${league.id}&season=2023`
        
        const gamesResponse = await fetch(gamesUrl, {
          headers: { 'x-apisports-key': API_FOOTBALL_KEY }
        })
        
        const gamesData = await gamesResponse.json()
        
        if (gamesData.errors && Object.keys(gamesData.errors).length > 0) {
          console.log(`⚠️ ${league.code} 에러:`, gamesData.errors)
          results.errors.push(`${league.code}: ${JSON.stringify(gamesData.errors)}`)
          continue
        }

        // 최근 50경기만 (완료된 경기)
        const games = (gamesData.response || [])
          .filter((g: any) => g.status?.short === 'FT')
          .slice(-50)

        console.log(`✅ ${league.code}: ${games.length}개 경기 저장 예정`)

        let savedCount = 0

        for (const game of games) {
          try {
            // 경기 날짜를 미래로 변경 (테스트용)
            // 2023년 날짜 → 2025년으로 변경
            const originalDate = new Date(game.date)
            const futureDate = new Date(originalDate)
            futureDate.setFullYear(2025)
            
            // 경기 정보 추출
            const matchData = {
              api_match_id: game.id,
              api_league_id: league.id,
              league: league.code,
              league_name: league.name,
              league_name_ko: league.name,
              season: '2023',
              match_date: futureDate.toISOString().split('T')[0],
              match_time: game.time,
              match_timestamp: futureDate.toISOString(),
              home_team_id: game.teams?.home?.id,
              home_team: game.teams?.home?.name,
              home_team_ko: TEAM_NAME_KO[game.teams?.home?.id] || game.teams?.home?.name,
              home_team_logo: game.teams?.home?.logo,
              away_team_id: game.teams?.away?.id,
              away_team: game.teams?.away?.name,
              away_team_ko: TEAM_NAME_KO[game.teams?.away?.id] || game.teams?.away?.name,
              away_team_logo: game.teams?.away?.logo,
              status: game.status?.short || 'FT',
              home_score: game.scores?.home?.total,
              away_score: game.scores?.away?.total,
              innings_score: {
                home: game.scores?.home?.innings,
                away: game.scores?.away?.innings,
              },
            }

            // baseball_matches 테이블에 upsert
            const { error: matchError } = await supabase
              .from('baseball_matches')
              .upsert(matchData, { onConflict: 'api_match_id' })

            if (matchError) {
              console.error(`❌ 경기 저장 실패:`, matchError.message)
              continue
            }

            savedCount++

            // 더미 오즈 데이터 생성 (테스트용)
            const homeProb = 40 + Math.floor(Math.random() * 20) // 40-60%
            const awayProb = 100 - homeProb

            const oddsRecord = {
              api_match_id: game.id,
              league: league.code,
              home_win_odds: (100 / homeProb).toFixed(2),
              away_win_odds: (100 / awayProb).toFixed(2),
              home_win_prob: homeProb,
              away_win_prob: awayProb,
              over_under_line: 8.5,
              over_odds: 1.90,
              under_odds: 1.90,
              bookmaker: 'Sample',
              collected_at: new Date().toISOString(),
            }

            // baseball_odds_latest 테이블에 upsert
            await supabase
              .from('baseball_odds_latest')
              .upsert(oddsRecord, { onConflict: 'api_match_id' })

            // baseball_odds_history에도 저장
            await supabase.from('baseball_odds_history').insert(oddsRecord)

            results.totalMatches++

          } catch (gameError: any) {
            console.error(`❌ 경기 처리 오류:`, gameError.message)
          }
        }

        results.leagues.push({
          league: league.code,
          fetched: games.length,
          saved: savedCount,
        })

        // API 레이트 리밋 방지
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (leagueError: any) {
        console.error(`❌ ${league.code} 오류:`, leagueError.message)
        results.errors.push(`${league.code}: ${leagueError.message}`)
      }
    }

    const duration = Date.now() - startTime

    console.log(`✅ 샘플 데이터 수집 완료: ${results.totalMatches}경기 (${duration}ms)`)

    return NextResponse.json({
      success: true,
      message: 'Sample data collection completed',
      duration: `${duration}ms`,
      results,
    })

  } catch (error: any) {
    console.error('❌ 샘플 수집 실패:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      results,
    }, { status: 500 })
  }
}