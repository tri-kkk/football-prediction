import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!
const API_FOOTBALL_HOST = 'v3.football.api-sports.io'

// 🏆 리그 설정 (20개 - 12개 리그 + 8개 컵대회)
const LEAGUES = [
  // 유럽 대항전
  { code: 'CL', apiId: 2, name: 'Champions League' },
  { code: 'EL', apiId: 3, name: 'Europa League' },
  { code: 'UECL', apiId: 848, name: 'Conference League' },
  { code: 'UNL', apiId: 5, name: 'Nations League' },
  // 잉글랜드
  { code: 'PL', apiId: 39, name: 'Premier League' },
  { code: 'ELC', apiId: 40, name: 'Championship' },
  { code: 'FAC', apiId: 45, name: 'FA Cup' },           // 🆕
  { code: 'EFL', apiId: 48, name: 'EFL Cup' },          // 🆕
  // 스페인
  { code: 'PD', apiId: 140, name: 'La Liga' },
  { code: 'CDR', apiId: 143, name: 'Copa del Rey' },    // 🆕
  // 독일
  { code: 'BL1', apiId: 78, name: 'Bundesliga' },
  { code: 'DFB', apiId: 81, name: 'DFB Pokal' },        // 🆕
  // 이탈리아
  { code: 'SA', apiId: 135, name: 'Serie A' },
  { code: 'CIT', apiId: 137, name: 'Coppa Italia' },    // 🆕
  // 프랑스
  { code: 'FL1', apiId: 61, name: 'Ligue 1' },
  { code: 'CDF', apiId: 66, name: 'Coupe de France' },  // 🆕
  // 포르투갈
  { code: 'PPL', apiId: 94, name: 'Primeira Liga' },
  { code: 'TDP', apiId: 96, name: 'Taca de Portugal' }, // 🆕
  // 네덜란드
  { code: 'DED', apiId: 88, name: 'Eredivisie' },
  { code: 'KNV', apiId: 90, name: 'KNVB Beker' },       // 🆕
]

// 🌐 팀명 한글 매핑 (UTF-8 인코딩 수정)
const TEAM_KR_MAP: { [key: string]: string } = {
  // 프리미어리그
  'Manchester City': '맨체스터 시티',
  'Liverpool': '리버풀',
  'Arsenal': '아스날',
  'Chelsea': '첼시',
  'Manchester United': '맨체스터 유나이티드',
  'Tottenham': '토트넘',
  'Newcastle': '뉴캐슬',
  'Brighton': '브라이튼',
  'Aston Villa': '애스턴 빌라',
  'West Ham': '웨스트햄',
  
  // 라리가
  'Barcelona': '바르셀로나',
  'Real Madrid': '레알 마드리드',
  'Atletico Madrid': '아틀레티코 마드리드',
  'Real Sociedad': '레알 소시에다드',
  'Athletic Club': '아틀레틱 빌바오',
  'Real Betis': '레알 베티스',
  'Valencia': '발렌시아',
  'Villarreal': '비야레알',
  'Sevilla': '세비야',
  
  // 분데스리가
  'Bayern Munich': '바이에른 뮌헨',
  'Borussia Dortmund': '도르트문트',
  'RB Leipzig': 'RB 라이프치히',
  'Bayer Leverkusen': '바이어 레버쿠젠',
  'Union Berlin': '우니온 베를린',
  'Freiburg': '프라이부르크',
  'Eintracht Frankfurt': '프랑크푸르트',
  'VfL Wolfsburg': '볼프스부르크',
  'Borussia Monchengladbach': '묀헨글라트바흐',
  'FSV Mainz 05': '마인츠',
  '1899 Hoffenheim': '호펜하임',
  
  // 세리에A
  'Inter': '인테르',
  'AC Milan': 'AC 밀란',
  'Juventus': '유벤투스',
  'Napoli': '나폴리',
  'Lazio': '라치오',
  'Roma': '로마',
  'Atalanta': '아탈란타',
  'Fiorentina': '피오렌티나',
  
  // 리그1
  'Paris Saint Germain': '파리 생제르맹',
  'Marseille': '마르세유',
  'Monaco': '모나코',
  'Lens': '랑스',
  'Lille': '릴',
  'Nice': '니스',
  'Lyon': '리옹',
  'Rennes': '렌',
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 경기 결과 수집 시작...')

    // 지난 3일 범위
    const today = new Date()
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(today.getDate() - 3)

    const fromDate = threeDaysAgo.toISOString().split('T')[0]
    const toDate = today.toISOString().split('T')[0]

    console.log(`📅 수집 기간: ${fromDate} ~ ${toDate}`)

    let allFinishedMatches: any[] = []

    // 각 리그별 종료된 경기 가져오기
    for (const league of LEAGUES) {
      console.log(`\n🏆 ${league.name} 처리 중...`)
      
      try {
        const matches = await fetchFinishedMatches(league.apiId, fromDate, toDate)
        console.log(`  ✅ ${matches.length}개 종료 경기 발견`)
        
        allFinishedMatches = [
          ...allFinishedMatches,
          ...matches.map((m: any) => ({ ...m, league: league.code }))
        ]
        
        // API Rate Limit 방지
        await sleep(1000)
      } catch (leagueError) {
        console.error(`  ❌ ${league.name} 처리 실패:`, leagueError)
      }
    }

    console.log(`\n✅ 총 ${allFinishedMatches.length}개 종료 경기 발견`)

    // 중복 제거
    const uniqueMatches = Array.from(
      new Map(allFinishedMatches.map(m => [m.fixture.id, m])).values()
    )
    
    console.log(`🔍 중복 제거 후: ${uniqueMatches.length}개`)

    // 예측 데이터 가져오기
    const { data: predictions, error: predError } = await supabase
      .from('match_odds_latest')
      .select('*')
      .in('match_id', uniqueMatches.map(m => String(m.fixture.id)))

    if (predError) {
      console.error('❌ 예측 데이터 조회 실패:', predError)
    }

    console.log(`📊 예측 데이터: ${predictions?.length || 0}개`)

    let savedCount = 0
    let skippedCount = 0

    // 각 경기별 처리
    for (const match of uniqueMatches) {
      try {
        const matchId = String(match.fixture.id)
        const prediction = predictions?.find(p => String(p.match_id) === matchId)

        // 예측 데이터 없으면 스킵
        if (!prediction) {
          console.log(`⏭️  ${match.teams.home.name} vs ${match.teams.away.name} - 예측 없음`)
          skippedCount++
          continue
        }

        // 실제 스코어
        const finalScoreHome = match.goals.home
        const finalScoreAway = match.goals.away

        // 예측 계산
        const { predictedWinner, predictedScoreHome, predictedScoreAway, probabilities } = 
          calculatePrediction(prediction)

        // 적중 여부 체크
        const { isCorrect, predictionType } = checkPrediction(
          { home: finalScoreHome, away: finalScoreAway },
          { home: predictedScoreHome, away: predictedScoreAway, winner: predictedWinner }
        )

        // DB 저장 데이터
        const resultData = {
          match_id: parseInt(matchId),
          league: match.league,
          
          home_team: match.teams.home.name,
          away_team: match.teams.away.name,
          home_team_kr: TEAM_KR_MAP[match.teams.home.name] || match.teams.home.name,
          away_team_kr: TEAM_KR_MAP[match.teams.away.name] || match.teams.away.name,
          home_team_id: match.teams.home.id,
          away_team_id: match.teams.away.id,
          home_crest: match.teams.home.logo,
          away_crest: match.teams.away.logo,
          
          final_score_home: finalScoreHome,
          final_score_away: finalScoreAway,
          match_status: match.fixture.status.short,
          
          predicted_winner: predictedWinner,
          predicted_score_home: predictedScoreHome,
          predicted_score_away: predictedScoreAway,
          predicted_home_probability: probabilities.home,
          predicted_draw_probability: probabilities.draw,
          predicted_away_probability: probabilities.away,
          
          is_correct: isCorrect,
          prediction_type: predictionType,
          
          match_date: new Date(match.fixture.date),
          updated_at: new Date()
        }

        // Supabase에 저장 (UPSERT)
        const { error: saveError } = await supabase
          .from('match_results')
          .upsert(resultData, { onConflict: 'match_id' })

        if (saveError) {
          console.error(`❌ 저장 실패 (${matchId}):`, saveError.message)
        } else {
          savedCount++
          const correctIcon = isCorrect ? '✅' : '❌'
          console.log(`${correctIcon} ${match.teams.home.name} ${finalScoreHome}-${finalScoreAway} ${match.teams.away.name}`)
        }
      } catch (matchError) {
        console.error(`❌ 경기 처리 실패:`, matchError)
      }
    }

    console.log(`\n🎉 완료: ${savedCount}개 저장, ${skippedCount}개 스킵`)

    return NextResponse.json({
      success: true,
      dateRange: `${fromDate} ~ ${toDate}`,
      finishedMatches: allFinishedMatches.length,
      uniqueMatches: uniqueMatches.length,
      withPredictions: predictions?.length || 0,
      saved: savedCount,
      skipped: skippedCount,
      message: `${savedCount}개 경기 결과 저장 완료`
    })

  } catch (error: any) {
    console.error('❌ Cron 실행 실패:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to collect match results' 
      },
      { status: 500 }
    )
  }
}

// POST 메서드 (수동 트리거)
export async function POST(request: NextRequest) {
  return GET(request)
}

// 🔍 종료된 경기 가져오기
async function fetchFinishedMatches(leagueId: number, fromDate: string, toDate: string) {
  const season = new Date().getFullYear()
  const url = `https://${API_FOOTBALL_HOST}/fixtures?league=${leagueId}&season=${season}&from=${fromDate}&to=${toDate}`
  
  console.log(`  📡 API 호출: league=${leagueId}, season=${season}`)
  
  const response = await fetch(url, {
    headers: {
      'x-rapidapi-key': API_FOOTBALL_KEY,
      'x-rapidapi-host': API_FOOTBALL_HOST
    }
  })

  if (!response.ok) {
    console.error(`  ❌ API 에러: ${response.status}`)
    return []
  }

  const data = await response.json()
  const allMatches = data.response || []
  
  console.log(`  📊 전체 경기: ${allMatches.length}개`)
  
  if (allMatches.length > 0) {
    const statuses = [...new Set(allMatches.map((m: any) => m.fixture.status.short))]
    console.log(`  ℹ️  상태:`, statuses.join(', '))
  }
  
  // 종료된 경기만 필터링
  const now = new Date()
  const finishedMatches = allMatches.filter((m: any) => {
    const status = m.fixture.status.short
    
    // 명확하게 종료된 경기
    if (status === 'FT' || status === 'AET' || status === 'PEN') {
      return true
    }
    
    // 킥오프 후 3시간 경과 (안전장치)
    const kickoff = new Date(m.fixture.date)
    const hoursElapsed = (now.getTime() - kickoff.getTime()) / (1000 * 60 * 60)
    
    if (hoursElapsed > 3 && m.goals.home !== null && m.goals.away !== null) {
      console.log(`  🕐 ${m.teams.home.name} vs ${m.teams.away.name}: ${hoursElapsed.toFixed(1)}h 경과, FT로 처리`)
      return true
    }
    
    return false
  })
  
  console.log(`  ✅ 종료 경기: ${finishedMatches.length}개`)
  
  return finishedMatches
}

// 📊 예측 계산
function calculatePrediction(prediction: any) {
  const homeOdds = prediction.home_odds || 2.0
  const drawOdds = prediction.draw_odds || 3.5
  const awayOdds = prediction.away_odds || 3.0

  // 배당 → 확률 변환
  const homeProb = 1 / homeOdds
  const drawProb = 1 / drawOdds
  const awayProb = 1 / awayOdds
  const total = homeProb + drawProb + awayProb

  // 정규화
  const probabilities = {
    home: Number(((homeProb / total) * 100).toFixed(2)),
    draw: Number(((drawProb / total) * 100).toFixed(2)),
    away: Number(((awayProb / total) * 100).toFixed(2))
  }

  // 승자 예측 (확률이 가장 높은 쪽)
  let predictedWinner: 'home' | 'away' | 'draw' = 'home'
  if (probabilities.away > probabilities.home && probabilities.away > probabilities.draw) {
    predictedWinner = 'away'
  } else if (probabilities.draw > probabilities.home && probabilities.draw > probabilities.away) {
    predictedWinner = 'draw'
  }

  // 스코어 예측 (단순 로직)
  let predictedScoreHome = 1
  let predictedScoreAway = 1

  if (predictedWinner === 'home') {
    predictedScoreHome = probabilities.home > 60 ? 2 : 1
    predictedScoreAway = probabilities.home > 60 ? 0 : 1
  } else if (predictedWinner === 'away') {
    predictedScoreHome = probabilities.away > 60 ? 0 : 1
    predictedScoreAway = probabilities.away > 60 ? 2 : 1
  } else {
    predictedScoreHome = 1
    predictedScoreAway = 1
  }

  return {
    predictedWinner,
    predictedScoreHome,
    predictedScoreAway,
    probabilities
  }
}

// ✅ 적중 여부 체크
function checkPrediction(
  actual: { home: number; away: number },
  predicted: { home: number; away: number; winner: 'home' | 'away' | 'draw' }
) {
  // 1. 정확한 스코어 맞춤
  if (actual.home === predicted.home && actual.away === predicted.away) {
    return { isCorrect: true, predictionType: 'exact' as const }
  }

  // 2. 승자만 맞춤
  const actualWinner = 
    actual.home > actual.away ? 'home' :
    actual.away > actual.home ? 'away' : 'draw'

  if (actualWinner === predicted.winner) {
    return { isCorrect: true, predictionType: 'winner_only' as const }
  }

  // 3. 틀림
  return { isCorrect: false, predictionType: 'wrong' as const }
}

// ⏱️ Sleep 함수
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}