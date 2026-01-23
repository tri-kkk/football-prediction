import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io'

// 내부용 API 키 (환경변수로 설정)
const EXPORT_SECRET = process.env.EXPORT_SECRET || 'trendsoccer-internal-2026'

// 팀명 한글 매핑 (주요 팀)
const teamNameKo: Record<string, string> = {
  'Manchester United': '맨유',
  'Manchester City': '맨시티',
  'Liverpool': '리버풀',
  'Chelsea': '첼시',
  'Arsenal': '아스널',
  'Tottenham': '토트넘',
  'Newcastle': '뉴캐슬',
  'Brighton': '브라이튼',
  'Aston Villa': '아스톤 빌라',
  'West Ham': '웨스트햄',
  'Real Madrid': '레알 마드리드',
  'Barcelona': '바르셀로나',
  'Atletico Madrid': '아틀레티코',
  'Sevilla': '세비야',
  'Real Sociedad': '레알 소시에다드',
  'Villarreal': '비야레알',
  'Athletic Bilbao': '빌바오',
  'Real Betis': '베티스',
  'Bayern Munich': '바이에른',
  'Borussia Dortmund': '도르트문트',
  'RB Leipzig': '라이프치히',
  'Bayer Leverkusen': '레버쿠젠',
  'Inter': '인테르',
  'AC Milan': '밀란',
  'Juventus': '유벤투스',
  'Napoli': '나폴리',
  'Roma': '로마',
  'Lazio': '라치오',
  'Atalanta': '아탈란타',
  'Fiorentina': '피오렌티나',
  'Paris Saint Germain': 'PSG',
  'PSG': 'PSG',
  'Marseille': '마르세유',
  'Monaco': '모나코',
  'Lyon': '리옹',
  'Lille': '릴',
}

const leagueNameKo: Record<string, string> = {
  'PL': '프리미어리그',
  'PD': '라리가',
  'BL1': '분데스리가',
  'SA': '세리에A',
  'FL1': '리그1',
  'CL': '챔피언스리그',
  'EL': '유로파리그',
  'PPL': '프리메이라',
  'DED': '에레디비시',
  'ELC': '챔피언십',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const format = searchParams.get('format') || 'json' // json, text, markdown
  const date = searchParams.get('date') || 'today' // today, tomorrow, YYYY-MM-DD
  const league = searchParams.get('league') || 'all'
  const gradeFilter = searchParams.get('grade') || 'all' // all, pick, good
  
  // 인증 체크
  if (secret !== EXPORT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    // 날짜 계산
    const now = new Date()
    let targetDate: string
    
    if (date === 'today') {
      targetDate = now.toISOString().split('T')[0]
    } else if (date === 'tomorrow') {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      targetDate = tomorrow.toISOString().split('T')[0]
    } else {
      targetDate = date
    }
    
    // 경기 데이터 조회
    let query = supabase
      .from('match_odds_latest')
      .select('*')
      .gte('commence_time', `${targetDate}T00:00:00Z`)
      .lt('commence_time', `${targetDate}T23:59:59Z`)
      .order('commence_time', { ascending: true })
    
    if (league !== 'all') {
      query = query.eq('league_code', league)
    }
    
    const { data: matches, error } = await query
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 })
    }
    
    if (!matches || matches.length === 0) {
      return NextResponse.json({ 
        success: true, 
        date: targetDate,
        message: 'No matches found',
        data: [] 
      })
    }
    
    // 각 경기에 대해 프리미엄 분석 데이터 수집
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        // 예측 계산
        const prediction = calculatePrediction(match)
        
        // 팀 통계 조회
        const [homeStats, awayStats] = await Promise.all([
          getTeamStats(match.home_team, match.home_team_id, match.league_code),
          getTeamStats(match.away_team, match.away_team_id, match.league_code),
        ])
        
        // H2H 조회
        const h2h = await getH2H(match.home_team_id, match.away_team_id, match.home_team, match.away_team)
        
        return {
          // 기본 정보
          id: match.id,
          matchId: match.match_id,
          date: targetDate,
          time: new Date(match.commence_time).toLocaleTimeString('ko-KR', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          datetime: match.commence_time,
          
          // 리그 정보
          league: match.league_code,
          leagueName: leagueNameKo[match.league_code] || match.league_code,
          
          // 팀 정보
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          homeTeamKo: teamNameKo[match.home_team] || match.home_team,
          awayTeamKo: teamNameKo[match.away_team] || match.away_team,
          homeTeamId: match.home_team_id,
          awayTeamId: match.away_team_id,
          
          // 배당
          odds: {
            home: match.home_odds,
            draw: match.draw_odds,
            away: match.away_odds,
          },
          
          // 예측
          prediction,
          
          // 팀 분석
          homeStats,
          awayStats,
          
          // H2H
          h2h,
        }
      })
    )
    
    // 등급 필터링
    let filteredMatches = enrichedMatches
    if (gradeFilter === 'pick') {
      filteredMatches = enrichedMatches.filter(m => m.prediction.grade === 'PICK')
    } else if (gradeFilter === 'good') {
      filteredMatches = enrichedMatches.filter(m => ['PICK', 'GOOD'].includes(m.prediction.grade))
    }
    
    // 포맷에 따라 응답
    if (format === 'text') {
      const text = formatAsText(filteredMatches, targetDate)
      return new NextResponse(text, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    } else if (format === 'markdown') {
      const md = formatAsMarkdown(filteredMatches, targetDate)
      return new NextResponse(md, {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' }
      })
    } else {
      return NextResponse.json({
        success: true,
        date: targetDate,
        totalMatches: filteredMatches.length,
        data: filteredMatches,
      })
    }
    
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 예측 계산
function calculatePrediction(match: any) {
  const homeOdds = match.home_odds || 2.0
  const drawOdds = match.draw_odds || 3.5
  const awayOdds = match.away_odds || 3.5
  
  // 확률 계산
  const homeProb = Math.round((1 / homeOdds) * 100)
  const drawProb = Math.round((1 / drawOdds) * 100)
  const awayProb = Math.round((1 / awayOdds) * 100)
  
  // 정규화
  const total = homeProb + drawProb + awayProb
  const homeProbNorm = Math.round((homeProb / total) * 100)
  const drawProbNorm = Math.round((drawProb / total) * 100)
  const awayProbNorm = 100 - homeProbNorm - drawProbNorm
  
  // 파워 지수
  const homePower = Math.round(100 - (homeOdds - 1) * 20)
  const awayPower = Math.round(100 - (awayOdds - 1) * 20)
  const powerDiff = homePower - awayPower
  
  // 예측 결과
  let predictedResult: 'home' | 'draw' | 'away'
  let confidence: number
  
  if (homeProbNorm >= drawProbNorm && homeProbNorm >= awayProbNorm) {
    predictedResult = 'home'
    confidence = homeProbNorm
  } else if (awayProbNorm >= homeProbNorm && awayProbNorm >= drawProbNorm) {
    predictedResult = 'away'
    confidence = awayProbNorm
  } else {
    predictedResult = 'draw'
    confidence = drawProbNorm
  }
  
  // 등급 판정
  let grade: 'PICK' | 'GOOD' | 'PASS'
  let gradeReason: string
  
  if (confidence >= 55 && Math.abs(powerDiff) >= 15) {
    grade = 'PICK'
    gradeReason = '높은 신뢰도 + 파워 차이'
  } else if (confidence >= 45 && Math.abs(powerDiff) >= 10) {
    grade = 'GOOD'
    gradeReason = '적정 신뢰도'
  } else {
    grade = 'PASS'
    gradeReason = '낮은 신뢰도'
  }
  
  return {
    result: predictedResult,
    resultKo: predictedResult === 'home' ? '홈승' : predictedResult === 'away' ? '원정승' : '무승부',
    probability: {
      home: homeProbNorm,
      draw: drawProbNorm,
      away: awayProbNorm,
    },
    confidence,
    power: {
      home: homePower,
      away: awayPower,
      diff: powerDiff,
    },
    grade,
    gradeReason,
  }
}

// 팀 통계 조회
async function getTeamStats(teamName: string, teamId: number | null, leagueCode: string) {
  try {
    // fg_team_stats에서 조회
    let query = supabase.from('fg_team_stats').select('*')
    
    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.ilike('team_name', `%${teamName}%`)
    }
    
    const { data: stats } = await query.limit(1).single()
    
    // fg_match_history에서 최근 경기 조회
    let historyQuery = supabase
      .from('fg_match_history')
      .select('*')
      .order('match_date', { ascending: false })
      .limit(10)
    
    if (teamId) {
      historyQuery = historyQuery.or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    }
    
    const { data: history } = await historyQuery
    
    if (!stats && !history) return null
    
    // 최근 폼 계산
    let currentStreak = { type: 'none', count: 0 }
    let last5 = { wins: 0, draws: 0, losses: 0, results: [] as string[] }
    let last10 = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
    
    if (history && history.length > 0) {
      history.forEach((match, idx) => {
        const isHome = match.home_team_id === teamId
        const goalsFor = isHome ? match.home_score : match.away_score
        const goalsAgainst = isHome ? match.away_score : match.home_score
        
        let result: 'W' | 'D' | 'L'
        if (goalsFor > goalsAgainst) result = 'W'
        else if (goalsFor < goalsAgainst) result = 'L'
        else result = 'D'
        
        // 최근 5경기
        if (idx < 5) {
          last5.results.push(result)
          if (result === 'W') last5.wins++
          else if (result === 'D') last5.draws++
          else last5.losses++
        }
        
        // 최근 10경기
        if (result === 'W') last10.wins++
        else if (result === 'D') last10.draws++
        else last10.losses++
        last10.goalsFor += goalsFor || 0
        last10.goalsAgainst += goalsAgainst || 0
        
        // 연속 기록 (첫 번째부터)
        if (idx === 0) {
          currentStreak.type = result
          currentStreak.count = 1
        } else if (result === currentStreak.type) {
          currentStreak.count++
        }
      })
    }
    
    return {
      teamName,
      teamId,
      season: stats?.season || '2025',
      
      // 시즌 전체
      seasonStats: stats ? {
        played: stats.total_played || 0,
        wins: stats.total_wins || 0,
        draws: stats.total_draws || 0,
        losses: stats.total_losses || 0,
        goalsFor: stats.total_goals_for || 0,
        goalsAgainst: stats.total_goals_against || 0,
        winRate: stats.total_played > 0 ? Math.round((stats.total_wins / stats.total_played) * 100) : 0,
      } : null,
      
      // 홈 성적
      homeStats: stats ? {
        played: stats.home_played || 0,
        wins: stats.home_wins || 0,
        draws: stats.home_draws || 0,
        losses: stats.home_losses || 0,
        winRate: stats.home_played > 0 ? Math.round((stats.home_wins / stats.home_played) * 100) : 0,
      } : null,
      
      // 원정 성적
      awayStats: stats ? {
        played: stats.away_played || 0,
        wins: stats.away_wins || 0,
        draws: stats.away_draws || 0,
        losses: stats.away_losses || 0,
        winRate: stats.away_played > 0 ? Math.round((stats.away_wins / stats.away_played) * 100) : 0,
      } : null,
      
      // 선제골 통계
      firstGoalStats: stats ? {
        homeGames: stats.home_first_goal_games || 0,
        homeWins: stats.home_first_goal_wins || 0,
        homeWinRate: stats.home_first_goal_games > 0 
          ? Math.round((stats.home_first_goal_wins / stats.home_first_goal_games) * 100) : 0,
        awayGames: stats.away_first_goal_games || 0,
        awayWins: stats.away_first_goal_wins || 0,
        awayWinRate: stats.away_first_goal_games > 0 
          ? Math.round((stats.away_first_goal_wins / stats.away_first_goal_games) * 100) : 0,
      } : null,
      
      // 최근 폼
      recentForm: {
        currentStreak: {
          type: currentStreak.type,
          count: currentStreak.count,
          text: currentStreak.type === 'W' ? `${currentStreak.count}연승` :
                currentStreak.type === 'L' ? `${currentStreak.count}연패` :
                currentStreak.type === 'D' ? `${currentStreak.count}무` : '-'
        },
        last5,
        last10,
      },
    }
  } catch (error) {
    console.error('getTeamStats error:', error)
    return null
  }
}

// H2H 조회
async function getH2H(homeTeamId: number | null, awayTeamId: number | null, homeTeam: string, awayTeam: string) {
  try {
    if (!homeTeamId || !awayTeamId) return null
    
    // API-Football H2H
    const h2hResponse = await fetch(
      `${API_FOOTBALL_URL}/fixtures/headtohead?h2h=${homeTeamId}-${awayTeamId}&last=10`,
      {
        headers: { 'x-apisports-key': API_FOOTBALL_KEY },
        next: { revalidate: 3600 }
      }
    )
    
    if (!h2hResponse.ok) return null
    
    const h2hResult = await h2hResponse.json()
    if (!h2hResult.response || h2hResult.response.length === 0) return null
    
    const matches = h2hResult.response
    let homeWins = 0, draws = 0, awayWins = 0
    let homeGoals = 0, awayGoals = 0
    const recentScores: string[] = []
    
    matches.forEach((match: any, idx: number) => {
      const mHomeId = match.teams.home.id
      const mHomeGoals = match.goals.home || 0
      const mAwayGoals = match.goals.away || 0
      
      const isCurrentHomeTeamHome = mHomeId === homeTeamId
      const currentTeamGoals = isCurrentHomeTeamHome ? mHomeGoals : mAwayGoals
      const opponentGoals = isCurrentHomeTeamHome ? mAwayGoals : mHomeGoals
      
      if (currentTeamGoals > opponentGoals) homeWins++
      else if (currentTeamGoals < opponentGoals) awayWins++
      else draws++
      
      homeGoals += currentTeamGoals
      awayGoals += opponentGoals
      
      if (idx < 5) {
        recentScores.push(`${currentTeamGoals}-${opponentGoals}`)
      }
    })
    
    const total = matches.length
    
    return {
      totalMatches: total,
      homeWins,
      draws,
      awayWins,
      homeWinRate: Math.round((homeWins / total) * 100),
      awayWinRate: Math.round((awayWins / total) * 100),
      avgGoals: Math.round(((homeGoals + awayGoals) / total) * 10) / 10,
      recentScores,
      summary: `${homeWins}승 ${draws}무 ${awayWins}패`,
    }
  } catch (error) {
    console.error('getH2H error:', error)
    return null
  }
}

// 텍스트 포맷
function formatAsText(matches: any[], date: string) {
  const lines: string[] = []
  
  lines.push(`📅 ${date} 경기 예측`)
  lines.push(`총 ${matches.length}경기`)
  lines.push('')
  lines.push('─'.repeat(40))
  
  matches.forEach((match, idx) => {
    const p = match.prediction
    const gradeEmoji = p.grade === 'PICK' ? '🔥' : p.grade === 'GOOD' ? '✅' : '⚪'
    
    lines.push('')
    lines.push(`${idx + 1}. ${match.homeTeamKo} vs ${match.awayTeamKo}`)
    lines.push(`   ⏰ ${match.time} | ${match.leagueName}`)
    lines.push(`   📊 예측: ${p.resultKo} (${p.confidence}%)`)
    lines.push(`   💰 배당: ${match.odds.home} / ${match.odds.draw} / ${match.odds.away}`)
    lines.push(`   ${gradeEmoji} 등급: ${p.grade}`)
    
    // 팀 폼
    if (match.homeStats?.recentForm) {
      const hf = match.homeStats.recentForm
      lines.push(`   🏠 ${match.homeTeamKo}: ${hf.currentStreak.text} | 최근5: ${hf.last5.results.join('')}`)
    }
    if (match.awayStats?.recentForm) {
      const af = match.awayStats.recentForm
      lines.push(`   🚌 ${match.awayTeamKo}: ${af.currentStreak.text} | 최근5: ${af.last5.results.join('')}`)
    }
    
    // H2H
    if (match.h2h) {
      lines.push(`   ⚔️ 상대전적: ${match.h2h.summary} (최근 ${match.h2h.totalMatches}경기)`)
    }
    
    lines.push('─'.repeat(40))
  })
  
  lines.push('')
  lines.push('※ TrendSoccer 프리미엄 분석')
  
  return lines.join('\n')
}

// 마크다운 포맷
function formatAsMarkdown(matches: any[], date: string) {
  const lines: string[] = []
  
  lines.push(`# 📅 ${date} 경기 예측`)
  lines.push('')
  lines.push(`> 총 **${matches.length}경기** 분석`)
  lines.push('')
  
  // PICK 경기
  const pickMatches = matches.filter(m => m.prediction.grade === 'PICK')
  if (pickMatches.length > 0) {
    lines.push('## 🔥 PICK 경기')
    lines.push('')
    pickMatches.forEach(match => {
      lines.push(formatMatchMarkdown(match))
    })
  }
  
  // GOOD 경기
  const goodMatches = matches.filter(m => m.prediction.grade === 'GOOD')
  if (goodMatches.length > 0) {
    lines.push('## ✅ GOOD 경기')
    lines.push('')
    goodMatches.forEach(match => {
      lines.push(formatMatchMarkdown(match))
    })
  }
  
  // PASS 경기 (간략히)
  const passMatches = matches.filter(m => m.prediction.grade === 'PASS')
  if (passMatches.length > 0) {
    lines.push('## ⚪ PASS 경기')
    lines.push('')
    passMatches.forEach(match => {
      const p = match.prediction
      lines.push(`- ${match.time} | ${match.homeTeamKo} vs ${match.awayTeamKo} (${match.leagueName}) - ${p.resultKo} ${p.confidence}%`)
    })
    lines.push('')
  }
  
  lines.push('---')
  lines.push('*TrendSoccer 프리미엄 분석*')
  
  return lines.join('\n')
}

function formatMatchMarkdown(match: any) {
  const p = match.prediction
  const lines: string[] = []
  
  lines.push(`### ${match.homeTeamKo} vs ${match.awayTeamKo}`)
  lines.push('')
  lines.push(`| 항목 | 내용 |`)
  lines.push(`|------|------|`)
  lines.push(`| ⏰ 시간 | ${match.time} |`)
  lines.push(`| 🏆 리그 | ${match.leagueName} |`)
  lines.push(`| 📊 예측 | **${p.resultKo}** (${p.confidence}%) |`)
  lines.push(`| 💰 배당 | ${match.odds.home} / ${match.odds.draw} / ${match.odds.away} |`)
  lines.push(`| 💪 파워 | ${p.power.home} vs ${p.power.away} (차이: ${p.power.diff > 0 ? '+' : ''}${p.power.diff}) |`)
  lines.push('')
  
  // 팀 분석
  if (match.homeStats?.recentForm || match.awayStats?.recentForm) {
    lines.push('**팀 폼:**')
    if (match.homeStats?.recentForm) {
      const hf = match.homeStats.recentForm
      lines.push(`- 🏠 ${match.homeTeamKo}: ${hf.currentStreak.text} | 최근5: ${hf.last5.results.join(' ')} | 최근10: ${hf.last10.wins}W ${hf.last10.draws}D ${hf.last10.losses}L`)
    }
    if (match.awayStats?.recentForm) {
      const af = match.awayStats.recentForm
      lines.push(`- 🚌 ${match.awayTeamKo}: ${af.currentStreak.text} | 최근5: ${af.last5.results.join(' ')} | 최근10: ${af.last10.wins}W ${af.last10.draws}D ${af.last10.losses}L`)
    }
    lines.push('')
  }
  
  // H2H
  if (match.h2h) {
    lines.push(`**상대전적:** ${match.h2h.summary} (최근 ${match.h2h.totalMatches}경기) | 평균 ${match.h2h.avgGoals}골`)
    lines.push('')
  }
  
  return lines.join('\n')
}