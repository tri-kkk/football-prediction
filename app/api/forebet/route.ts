// app/api/forebet/route.ts
// ✅ Forebet.com 크롤링 - Cheerio 없이 정규식 사용

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

const LEAGUE_URLS: Record<string, string> = {
  'PL': 'england/premier-league',
  'PD': 'spain/laliga',
  'BL1': 'germany/bundesliga',
  'SA': 'italy/serie-a',
  'FL1': 'france/ligue-1',
  'CL': 'uefa-champions-league',
}

// 영문 → 한글 팀명 매핑
const TEAM_NAME_MAP: Record<string, string> = {
  'Tottenham': '토트넘',
  'Manchester United': '맨체스터 유나이티드',
  'Manchester City': '맨체스터 시티',
  'Liverpool': '리버풀',
  'Chelsea': '첼시',
  'Arsenal': '아스널',
  'Newcastle': '뉴캐슬',
  'West Ham': '웨스트햄',
  'Aston Villa': '아스톤 빌라',
  'Brighton': '브라이튼',
  'Everton': '에버튼',
  'Fulham': '풀럼',
  'Wolves': '울버햄튼',
  'Wolverhampton': '울버햄튼',
  'Crystal Palace': '크리스탈 팰리스',
  'Brentford': '브렌트포드',
  'Nottingham Forest': '노팅엄 포레스트',
  'Bournemouth': '본머스',
  'Burnley': '번리',
  'Sheffield United': '셰필드 유나이티드',
  'Ipswich': '입스위치',
  'Southampton': '사우샘프턴',
  'Leeds United': '리즈 유나이티드',
  'Real Madrid': '레알 마드리드',
  'Barcelona': '바르셀로나',
  'Atletico Madrid': '아틀레티코 마드리드',
  'Sevilla': '세비야',
  'Bayern Munich': '바이에른 뮌헨',
  'Borussia Dortmund': '보루시아 도르트문트',
  'RB Leipzig': '라이프치히',
  'Bayer Leverkusen': '바이어 레버쿠젠',
  'Juventus': '유벤투스',
  'Inter Milan': '인테르',
  'AC Milan': 'AC 밀란',
  'Napoli': '나폴리',
  'Roma': '로마',
  'PSG': 'PSG',
  'Paris SG': 'PSG',
  'Marseille': '마르세유',
  'Lyon': '리옹',
  'Monaco': 'AS 모나코',
  'Lille': '릴',
}

function convertToKorean(name: string): string {
  return TEAM_NAME_MAP[name] || name
}

// 더미 데이터
function getDummyPredictions(league: string) {
  const dummy: Record<string, any[]> = {
    'PL': [{ homeTeam: '맨체스터 유나이티드', awayTeam: '리버풀', predictedScore: '2-1', homeGoals: 2, awayGoals: 1, confidence: 'High', source: 'Forebet' }],
    'PD': [{ homeTeam: '레알 마드리드', awayTeam: '바르셀로나', predictedScore: '2-1', homeGoals: 2, awayGoals: 1, confidence: 'High', source: 'Forebet' }],
    'BL1': [{ homeTeam: '바이에른 뮌헨', awayTeam: '보루시아 도르트문트', predictedScore: '3-1', homeGoals: 3, awayGoals: 1, confidence: 'High', source: 'Forebet' }],
    'SA': [{ homeTeam: '유벤투스', awayTeam: '인테르', predictedScore: '1-1', homeGoals: 1, awayGoals: 1, confidence: 'Medium', source: 'Forebet' }],
    'FL1': [{ homeTeam: 'PSG', awayTeam: '마르세유', predictedScore: '3-0', homeGoals: 3, awayGoals: 0, confidence: 'High', source: 'Forebet' }],
    'CL': [{ homeTeam: 'PSG', awayTeam: '바이에른 뮌헨', predictedScore: '2-2', homeGoals: 2, awayGoals: 2, confidence: 'Medium', source: 'Forebet' }],
  }
  return dummy[league] || []
}

// Forebet 크롤링
async function fetchForebetPredictions(league: string) {
  const leagueUrl = LEAGUE_URLS[league]
  if (!leagueUrl) return []
  
  const url = `https://www.forebet.com/en/football-tips-and-predictions-for-${leagueUrl}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 3600 },
    })
    
    if (!response.ok) return []
    
    const html = await response.text()
    const predictions: any[] = []
    
    // 정규식으로 팀명과 스코어 추출
    // <span class="homeTeam">Tottenham</span> ... <span class="awayTeam">Manchester United</span> ... <div class="ex_sc_tabonly">1 - 2</div>
    const rowRegex = /<tr[^>]*class="rcnt_tr_[01]"[^>]*>.*?<span[^>]*class="homeTeam"[^>]*>([^<]+)<\/span>.*?<span[^>]*class="awayTeam"[^>]*>([^<]+)<\/span>.*?<div[^>]*class="ex_sc_tabonly"[^>]*>(\d+)\s*-\s*(\d+)<\/div>.*?<\/tr>/gs
    
    let match
    while ((match = rowRegex.exec(html)) !== null) {
      const homeTeam = match[1].trim()
      const awayTeam = match[2].trim()
      const homeGoals = parseInt(match[3])
      const awayGoals = parseInt(match[4])
      
      if (homeTeam && awayTeam) {
        predictions.push({
          homeTeam: convertToKorean(homeTeam),
          awayTeam: convertToKorean(awayTeam),
          predictedScore: `${homeGoals}-${awayGoals}`,
          homeGoals,
          awayGoals,
          confidence: 'Medium',
          source: 'Forebet',
        })
      }
    }
    
    console.log(`✅ Forebet 크롤링: ${predictions.length}개`)
    return predictions
    
  } catch (error) {
    console.error('❌ Forebet 에러:', error)
    return []
  }
}

// API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const league = searchParams.get('league') || 'PL'
  const mode = searchParams.get('mode') || 'auto'
  
  try {
    let predictions: any[] = []
    let actualMode = mode
    
    if (mode === 'auto' || mode === 'real') {
      predictions = await fetchForebetPredictions(league)
      
      if (predictions.length === 0) {
        predictions = getDummyPredictions(league)
        actualMode = 'dummy-fallback'
      } else {
        actualMode = 'real'
      }
    } else {
      predictions = getDummyPredictions(league)
      actualMode = 'dummy'
    }
    
    return NextResponse.json({
      success: true,
      league,
      predictions,
      count: predictions.length,
      source: 'Forebet',
      mode: actualMode,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const predictions = getDummyPredictions(league)
    return NextResponse.json({
      success: true,
      league,
      predictions,
      count: predictions.length,
      source: 'Forebet',
      mode: 'error-fallback',
    })
  }
}
