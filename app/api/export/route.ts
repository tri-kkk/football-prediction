import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 내부용 API 키
const EXPORT_SECRET = process.env.EXPORT_SECRET || 'trendsoccer-internal-2026'

// 리그 ID 매핑
const leagueIdMap: Record<string, number> = {
  PL: 39, PD: 140, BL1: 78, SA: 135, FL1: 61,
  CL: 2, EL: 3, PPL: 94, DED: 88, ELC: 40,
}

// 팀명 한글 매핑
const teamNameKo: Record<string, string> = {
  'Manchester United': '맨유', 'Manchester City': '맨시티',
  'Liverpool': '리버풀', 'Chelsea': '첼시', 'Arsenal': '아스널',
  'Tottenham': '토트넘', 'Newcastle': '뉴캐슬', 'Brighton': '브라이튼',
  'Aston Villa': '아스톤 빌라', 'West Ham': '웨스트햄',
  'Real Madrid': '레알 마드리드', 'Barcelona': '바르셀로나',
  'Atletico Madrid': '아틀레티코', 'Sevilla': '세비야',
  'Bayern Munich': '바이에른', 'Borussia Dortmund': '도르트문트',
  'RB Leipzig': '라이프치히', 'Bayer Leverkusen': '레버쿠젠',
  'Inter': '인테르', 'AC Milan': '밀란', 'Juventus': '유벤투스',
  'Napoli': '나폴리', 'Roma': '로마', 'Lazio': '라치오',
  'Paris Saint Germain': 'PSG', 'PSG': 'PSG',
  'Marseille': '마르세유', 'Monaco': '모나코', 'Lyon': '리옹',
}

const leagueNameKo: Record<string, string> = {
  'PL': '프리미어리그', 'PD': '라리가', 'BL1': '분데스리가',
  'SA': '세리에A', 'FL1': '리그1', 'CL': '챔피언스리그',
  'EL': '유로파리그', 'PPL': '프리메이라', 'DED': '에레디비시',
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const format = searchParams.get('format') || 'json'
  const date = searchParams.get('date') || 'today'
  const league = searchParams.get('league') || 'all'
  const gradeFilter = searchParams.get('grade') || 'all'
  
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
    
    if (error || !matches || matches.length === 0) {
      return NextResponse.json({ 
        success: true, 
        date: targetDate,
        message: 'No matches found',
        data: [] 
      })
    }
    
    // 현재 요청 URL에서 origin 추출 (가장 안전한 방법)
    const requestUrl = new URL(request.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    
    console.log('Export API - Base URL:', baseUrl)
    console.log('Export API - Matches found:', matches.length)
    
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        // predict-v2 API 호출
        let prediction = null
        try {
          const predResponse = await fetch(`${baseUrl}/api/predict-v2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              homeTeam: match.home_team,
              awayTeam: match.away_team,
              homeTeamId: match.home_team_id,
              awayTeamId: match.away_team_id,
              leagueId: leagueIdMap[match.league_code] || 39,
              leagueCode: match.league_code,
              season: '2025',
            }),
          })
          
          if (predResponse.ok) {
            const predData = await predResponse.json()
            prediction = predData.prediction
          }
        } catch (e) {
          console.error('Prediction error for', match.home_team, 'vs', match.away_team, e)
        }
        
        if (!prediction) return null
        
        // 파워 차이 계산
        const powerDiff = Math.abs((prediction.homePower || 0) - (prediction.awayPower || 0))
        
        // 확률 우위 계산
        const probs = [prediction.finalProb.home, prediction.finalProb.draw, prediction.finalProb.away]
        const maxProb = Math.max(...probs)
        const sortedProbs = [...probs].sort((a, b) => b - a)
        const probAdvantage = ((sortedProbs[0] - sortedProbs[1]) * 100).toFixed(1)
        
        return {
          // 기본 정보
          id: match.id,
          matchId: match.match_id,
          date: targetDate,
          time: new Date(match.commence_time).toLocaleTimeString('ko-KR', { 
            timeZone: 'Asia/Seoul',
            hour: '2-digit', minute: '2-digit', hour12: false 
          }),
          datetime: match.commence_time,
          
          // 리그/팀 정보
          league: match.league_code,
          leagueName: leagueNameKo[match.league_code] || match.league_code,
          homeTeam: match.home_team,
          awayTeam: match.away_team,
          homeTeamKo: teamNameKo[match.home_team] || match.home_team,
          awayTeamKo: teamNameKo[match.away_team] || match.away_team,
          
          // 배당
          odds: {
            home: match.home_odds,
            draw: match.draw_odds,
            away: match.away_odds,
          },
          
          // 예측 결과
          prediction: {
            result: prediction.recommendation.pick,
            resultKo: prediction.recommendation.pick === 'HOME' ? '홈승' : 
                      prediction.recommendation.pick === 'AWAY' ? '원정승' : '무승부',
            grade: prediction.recommendation.grade,
            reasons: prediction.recommendation.reasons,
          },
          
          // 확률
          probability: {
            home: Math.round(prediction.finalProb.home * 100),
            draw: Math.round(prediction.finalProb.draw * 100),
            away: Math.round(prediction.finalProb.away * 100),
          },
          
          // 파워 지수
          power: {
            home: prediction.homePower || 0,
            away: prediction.awayPower || 0,
            diff: powerDiff,
          },
          
          // 분석 근거
          analysis: {
            powerDiff: `${powerDiff}점`,
            probAdvantage: `${probAdvantage}%`,
            homeFirstGoalWinRate: prediction.debug?.homeStats?.homeFirstGoalWinRate,
            awayFirstGoalWinRate: prediction.debug?.awayStats?.awayFirstGoalWinRate,
          },
          
          // 팀 상세 통계
          teamStats: {
            home: {
              firstGoalWinRate: prediction.debug?.homeStats?.homeFirstGoalWinRate || 0,
              comebackRate: prediction.debug?.homeStats?.homeComebackRate || 0,
              recentForm: prediction.debug?.homeStats?.recentForm || 0,
              goalRatio: prediction.debug?.homeStats?.goalRatio || 0,
            },
            away: {
              firstGoalWinRate: prediction.debug?.awayStats?.awayFirstGoalWinRate || 0,
              comebackRate: prediction.debug?.awayStats?.awayComebackRate || 0,
              recentForm: prediction.debug?.awayStats?.recentForm || 0,
              goalRatio: prediction.debug?.awayStats?.goalRatio || 0,
            },
          },
          
          // P/A 비교
          pa: {
            home: {
              all: prediction.homePA?.all || 0,
              five: prediction.homePA?.five || 0,
              firstGoal: prediction.homePA?.firstGoal || 0,
            },
            away: {
              all: prediction.awayPA?.all || 0,
              five: prediction.awayPA?.five || 0,
              firstGoal: prediction.awayPA?.firstGoal || 0,
            },
          },
          
          // 3-Method 분석
          method3: {
            method1: prediction.method1 ? {
              home: Math.round(prediction.method1.win * 100),
              draw: Math.round(prediction.method1.draw * 100),
              away: Math.round(prediction.method1.lose * 100),
            } : null,
            method2: prediction.method2 ? {
              home: Math.round(prediction.method2.win * 100),
              draw: Math.round(prediction.method2.draw * 100),
              away: Math.round(prediction.method2.lose * 100),
            } : null,
            method3: prediction.method3 ? {
              home: Math.round(prediction.method3.win * 100),
              draw: Math.round(prediction.method3.draw * 100),
              away: Math.round(prediction.method3.lose * 100),
            } : null,
          },
          
          // 패턴 분석
          pattern: {
            code: prediction.pattern || '',
            totalMatches: prediction.patternStats?.totalMatches || 0,
            homeWinRate: prediction.patternStats?.homeWinRate || 0,
            drawRate: prediction.patternStats?.drawRate || 0,
            awayWinRate: prediction.patternStats?.awayWinRate || 0,
          },
          
          // Raw prediction (전체 데이터)
          rawPrediction: prediction,
        }
      })
    )
    
    // null 제거 및 등급 필터링
    let filteredMatches = enrichedMatches.filter(m => m !== null)
    
    if (gradeFilter === 'pick') {
      filteredMatches = filteredMatches.filter(m => m?.prediction.grade === 'PICK')
    } else if (gradeFilter === 'good') {
      filteredMatches = filteredMatches.filter(m => ['PICK', 'GOOD'].includes(m?.prediction.grade || ''))
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

// 텍스트 포맷
function formatAsText(matches: any[], date: string) {
  const lines: string[] = []
  
  lines.push(`📅 ${date} 경기 예측`)
  lines.push(`총 ${matches.length}경기`)
  lines.push('')
  lines.push('─'.repeat(50))
  
  matches.forEach((match, idx) => {
    const p = match.prediction
    const gradeEmoji = p.grade === 'PICK' ? '🔥' : p.grade === 'GOOD' ? '✅' : '⚪'
    
    lines.push('')
    lines.push(`[${idx + 1}] ${match.homeTeamKo} vs ${match.awayTeamKo}`)
    lines.push(`⏰ ${match.time} | ${match.leagueName}`)
    lines.push(`${gradeEmoji} ${p.grade} | ${p.resultKo} ${match.probability[p.result.toLowerCase()]}%`)
    lines.push('')
    
    // 분석 근거
    lines.push(`📊 분석 근거`)
    lines.push(`   파워 차이: ${match.power.diff}점`)
    lines.push(`   확률 우위: ${match.analysis.probAdvantage}`)
    if (p.result === 'HOME' && match.teamStats.home.firstGoalWinRate) {
      lines.push(`   홈 선제골 승률: ${match.teamStats.home.firstGoalWinRate}%`)
    }
    if (p.result === 'AWAY' && match.teamStats.away.firstGoalWinRate) {
      lines.push(`   원정 선제골 승률: ${match.teamStats.away.firstGoalWinRate}%`)
    }
    lines.push('')
    
    // 배당
    lines.push(`💰 배당: ${match.odds.home?.toFixed(2)} / ${match.odds.draw?.toFixed(2)} / ${match.odds.away?.toFixed(2)}`)
    lines.push('')
    
    // 파워 지수
    lines.push(`⚡ 파워 지수`)
    lines.push(`   ${match.homeTeamKo}: ${match.power.home}`)
    lines.push(`   ${match.awayTeamKo}: ${match.power.away}`)
    lines.push('')
    
    // 최종 확률
    lines.push(`📈 최종 예측 확률`)
    lines.push(`   홈승 ${match.probability.home}% | 무 ${match.probability.draw}% | 원정 ${match.probability.away}%`)
    lines.push('')
    
    // 팀 상세 통계
    lines.push(`📋 팀 상세 통계`)
    lines.push(`   선제골 승률: ${match.teamStats.home.firstGoalWinRate || '-'}% vs ${match.teamStats.away.firstGoalWinRate || '-'}%`)
    lines.push(`   역전률: ${match.teamStats.home.comebackRate || '-'}% vs ${match.teamStats.away.comebackRate || '-'}%`)
    lines.push(`   최근 폼: ${match.teamStats.home.recentForm?.toFixed(1) || '-'} vs ${match.teamStats.away.recentForm?.toFixed(1) || '-'}`)
    lines.push(`   득실비: ${match.teamStats.home.goalRatio?.toFixed(2) || '-'} vs ${match.teamStats.away.goalRatio?.toFixed(2) || '-'}`)
    lines.push('')
    
    // 3-Method 분석
    if (match.method3.method1 || match.method3.method2 || match.method3.method3) {
      lines.push(`🔬 3-Method 분석`)
      if (match.method3.method1) {
        lines.push(`   P/A 비교: 홈 ${match.method3.method1.home}%`)
      }
      if (match.method3.method2) {
        lines.push(`   Min-Max: 홈 ${match.method3.method2.home}%`)
      }
      if (match.method3.method3) {
        lines.push(`   선제골: 홈 ${match.method3.method3.home}%`)
      }
      lines.push('')
    }
    
    // 패턴 분석
    if (match.pattern.totalMatches > 0) {
      lines.push(`🎯 패턴 ${match.pattern.code} (${match.pattern.totalMatches}경기 기반)`)
      lines.push(`   역대: 홈 ${match.pattern.homeWinRate}% / 무 ${match.pattern.drawRate}% / 원정 ${match.pattern.awayWinRate}%`)
      lines.push('')
    }
    
    lines.push('─'.repeat(50))
  })
  
  lines.push('')
  lines.push('※ TrendSoccer 프리미엄 분석')
  
  return lines.join('\n')
}

// 마크다운 포맷
function formatAsMarkdown(matches: any[], date: string) {
  const lines: string[] = []
  
  lines.push(`# 📅 ${date} 경기 예측\n`)
  lines.push(`> 총 **${matches.length}경기** 분석\n`)
  
  // PICK 경기
  const pickMatches = matches.filter(m => m.prediction.grade === 'PICK')
  if (pickMatches.length > 0) {
    lines.push('## 🔥 PICK 경기\n')
    pickMatches.forEach(match => {
      lines.push(formatMatchMarkdown(match))
    })
  }
  
  // GOOD 경기
  const goodMatches = matches.filter(m => m.prediction.grade === 'GOOD')
  if (goodMatches.length > 0) {
    lines.push('## ✅ GOOD 경기\n')
    goodMatches.forEach(match => {
      lines.push(formatMatchMarkdown(match))
    })
  }
  
  // PASS 경기
  const passMatches = matches.filter(m => m.prediction.grade === 'PASS')
  if (passMatches.length > 0) {
    lines.push('## ⚪ PASS 경기\n')
    passMatches.forEach(match => {
      const p = match.prediction
      lines.push(`- ${match.time} | ${match.homeTeamKo} vs ${match.awayTeamKo} - ${p.resultKo} ${match.probability[p.result.toLowerCase()]}%`)
    })
    lines.push('')
  }
  
  lines.push('---\n*TrendSoccer 프리미엄 분석*')
  
  return lines.join('\n')
}

function formatMatchMarkdown(match: any) {
  const p = match.prediction
  const lines: string[] = []
  
  lines.push(`### ${match.homeTeamKo} vs ${match.awayTeamKo}\n`)
  
  // 기본 정보 테이블
  lines.push(`| 항목 | 내용 |`)
  lines.push(`|------|------|`)
  lines.push(`| ⏰ 시간 | ${match.time} |`)
  lines.push(`| 🏆 리그 | ${match.leagueName} |`)
  lines.push(`| 🎯 예측 | **${p.resultKo}** (${match.probability[p.result.toLowerCase()]}%) |`)
  lines.push(`| ⚡ 파워차 | ${match.power.diff}점 |`)
  lines.push(`| 💰 배당 | ${match.odds.home?.toFixed(2)} / ${match.odds.draw?.toFixed(2)} / ${match.odds.away?.toFixed(2)} |`)
  lines.push('')
  
  // 분석 근거
  lines.push(`**📊 분석 근거**`)
  lines.push(`- 파워 차이: ${match.power.diff}점`)
  lines.push(`- 확률 우위: ${match.analysis.probAdvantage}`)
  if (p.reasons?.length > 0) {
    p.reasons.forEach((r: string) => lines.push(`- ${r}`))
  }
  lines.push('')
  
  // 파워 지수
  lines.push(`**⚡ 파워 지수**: ${match.power.home} vs ${match.power.away}`)
  lines.push('')
  
  // 팀 통계
  lines.push(`**📋 팀 상세 통계**`)
  lines.push(`| 항목 | ${match.homeTeamKo} | ${match.awayTeamKo} |`)
  lines.push(`|------|------|------|`)
  lines.push(`| 선제골 승률 | ${match.teamStats.home.firstGoalWinRate || '-'}% | ${match.teamStats.away.firstGoalWinRate || '-'}% |`)
  lines.push(`| 역전률 | ${match.teamStats.home.comebackRate || '-'}% | ${match.teamStats.away.comebackRate || '-'}% |`)
  lines.push(`| 최근 폼 | ${match.teamStats.home.recentForm?.toFixed(1) || '-'} | ${match.teamStats.away.recentForm?.toFixed(1) || '-'} |`)
  lines.push(`| 득실비 | ${match.teamStats.home.goalRatio?.toFixed(2) || '-'} | ${match.teamStats.away.goalRatio?.toFixed(2) || '-'} |`)
  lines.push('')
  
  // 3-Method
  if (match.method3.method1 || match.method3.method2 || match.method3.method3) {
    lines.push(`**🔬 3-Method 분석**`)
    if (match.method3.method1) lines.push(`- P/A 비교: 홈 ${match.method3.method1.home}%`)
    if (match.method3.method2) lines.push(`- Min-Max: 홈 ${match.method3.method2.home}%`)
    if (match.method3.method3) lines.push(`- 선제골: 홈 ${match.method3.method3.home}%`)
    lines.push('')
  }
  
  // 패턴
  if (match.pattern.totalMatches > 0) {
    lines.push(`**🎯 패턴 ${match.pattern.code}** (${match.pattern.totalMatches}경기 기반)`)
    lines.push(`- 역대: 홈 ${match.pattern.homeWinRate}% / 무 ${match.pattern.drawRate}% / 원정 ${match.pattern.awayWinRate}%`)
    lines.push('')
  }
  
  lines.push('---\n')
  
  return lines.join('\n')
}