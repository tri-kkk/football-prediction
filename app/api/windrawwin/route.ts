// app/api/windrawwin/route.ts
// ✅ 실제 크롤링 + 더미 폴백 + 한글 팀명 매핑

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

const LEAGUE_URLS: Record<string, string> = {
  'PL': 'england-premier-league',
  'PD': 'spain-la-liga',
  'BL1': 'germany-bundesliga',
  'SA': 'italy-serie-a',
  'FL1': 'france-ligue-1',
  'CL': 'uefa-champions-league',
}

// 영문 → 한글 팀명 매핑 (teamLogos.ts에서 가져온 핵심 팀만)
const TEAM_NAME_MAP: Record<string, string> = {
  // 프리미어리그
  'Man Utd': '맨체스터 유나이티드',
  'Manchester United': '맨체스터 유나이티드',
  'Man City': '맨체스터 시티',
  'Manchester City': '맨체스터 시티',
  'Liverpool': '리버풀',
  'Chelsea': '첼시',
  'Arsenal': '아스널',
  'Tottenham': '토트넘',
  'Newcastle': '뉴캐슬',
  'West Ham': '웨스트햄',
  'Aston Villa': '아스톤 빌라',
  'Brighton': '브라이튼',
  'Everton': '에버튼',
  'Wolves': '울버햄튼',
  'Wolverhampton': '울버햄튼',
  'Crystal Palace': '크리스탈 팰리스',
  'Fulham': '풀럼',
  'Brentford': '브렌트포드',
  'Nottm Forest': '노팅엄 포레스트',
  'Nottingham Forest': '노팅엄 포레스트',
  'Bournemouth': '본머스',
  'Luton': '루턴 타운',
  'Burnley': '번리',
  'Sheffield Utd': '셰필드 유나이티드',
  'Sheffield United': '셰필드 유나이티드',
  'Ipswich': '입스위치',
  'Southampton': '사우샘프턴',
  'Leeds': '리즈 유나이티드',
  
  // 라리가
  'Real Madrid': '레알 마드리드',
  'Barcelona': '바르셀로나',
  'Atletico Madrid': '아틀레티코 마드리드',
  'Sevilla': '세비야',
  'Real Sociedad': '레알 소시에다드',
  'Real Betis': '레알 베티스',
  'Villarreal': '비야레알',
  'Valencia': '발렌시아',
  'Athletic Bilbao': '아틀레틱 빌바오',
  'Getafe': '헤타페',
  
  // 분데스리가
  'Bayern': '바이에른 뮌헨',
  'Bayern Munich': '바이에른 뮌헨',
  'Dortmund': '보루시아 도르트문트',
  'Borussia Dortmund': '보루시아 도르트문트',
  'RB Leipzig': '라이프치히',
  'Leverkusen': '바이어 레버쿠젠',
  'Bayer Leverkusen': '바이어 레버쿠젠',
  'Union Berlin': '우니온 베를린',
  'Freiburg': '프라이부르크',
  'Eintracht Frankfurt': '프랑크푸르트',
  'Wolfsburg': '볼프스부르크',
  'Hoffenheim': '호펜하임',
  
  // 세리에A
  'Juventus': '유벤투스',
  'Inter': '인테르',
  'Inter Milan': '인테르',
  'AC Milan': 'AC 밀란',
  'Milan': 'AC 밀란',
  'Napoli': '나폴리',
  'Roma': '로마',
  'AS Roma': '로마',
  'Lazio': '라치오',
  'Atalanta': '아탈란타',
  'Fiorentina': '피오렌티나',
  'Bologna': '볼로냐',
  
  // 리그1
  'PSG': 'PSG',
  'Paris SG': 'PSG',
  'Marseille': '마르세유',
  'Lyon': '리옹',
  'Monaco': 'AS 모나코',
  'AS Monaco': 'AS 모나코',
  'Lille': '릴',
  'Rennes': '렌',
  'Nice': '니스',
  'Lens': '랑스',
  
  // 챔피언스리그 추가 팀
  'Slavia Praha': '슬라비아 프라하',
  'Eintracht Frankfurt': '프랑크푸르트',
}

// 팀명을 한글로 변환
function convertToKorean(englishName: string): string {
  return TEAM_NAME_MAP[englishName] || englishName
}

// 🧪 더미 데이터 (폴백용)
function getDummyPredictions(league: string) {
  const dummyData: Record<string, any[]> = {
    'PL': [
      {
        homeTeam: '맨체스터 유나이티드',
        awayTeam: '리버풀',
        predictedScore: '2-1',
        homeGoals: 2,
        awayGoals: 1,
        confidence: 'High',
        source: 'WindrawWin',
      },
      {
        homeTeam: '아스널',
        awayTeam: '첼시',
        predictedScore: '1-1',
        homeGoals: 1,
        awayGoals: 1,
        confidence: 'Medium',
        source: 'WindrawWin',
      },
      {
        homeTeam: '맨체스터 시티',
        awayTeam: '토트넘',
        predictedScore: '3-0',
        homeGoals: 3,
        awayGoals: 0,
        confidence: 'High',
        source: 'WindrawWin',
      },
    ],
    'PD': [
      {
        homeTeam: '레알 마드리드',
        awayTeam: '바르셀로나',
        predictedScore: '2-1',
        homeGoals: 2,
        awayGoals: 1,
        confidence: 'High',
        source: 'WindrawWin',
      },
    ],
    'BL1': [
      {
        homeTeam: '바이에른 뮌헨',
        awayTeam: '보루시아 도르트문트',
        predictedScore: '3-1',
        homeGoals: 3,
        awayGoals: 1,
        confidence: 'High',
        source: 'WindrawWin',
      },
    ],
    'SA': [
      {
        homeTeam: '유벤투스',
        awayTeam: '인테르',
        predictedScore: '1-1',
        homeGoals: 1,
        awayGoals: 1,
        confidence: 'Medium',
        source: 'WindrawWin',
      },
    ],
    'FL1': [
      {
        homeTeam: 'PSG',
        awayTeam: '마르세유',
        predictedScore: '3-0',
        homeGoals: 3,
        awayGoals: 0,
        confidence: 'High',
        source: 'WindrawWin',
      },
    ],
    'CL': [
      {
        homeTeam: 'PSG',
        awayTeam: '바이에른 뮌헨',
        predictedScore: '2-2',
        homeGoals: 2,
        awayGoals: 2,
        confidence: 'Medium',
        source: 'WindrawWin',
      },
      {
        homeTeam: '맨체스터 시티',
        awayTeam: '레알 마드리드',
        predictedScore: '2-1',
        homeGoals: 2,
        awayGoals: 1,
        confidence: 'High',
        source: 'WindrawWin',
      },
      {
        homeTeam: '리버풀',
        awayTeam: '바르셀로나',
        predictedScore: '3-1',
        homeGoals: 3,
        awayGoals: 1,
        confidence: 'High',
        source: 'WindrawWin',
      },
    ],
  }
  
  return dummyData[league] || []
}

// 🌐 실제 크롤링
async function fetchRealPredictions(league: string) {
  const leagueUrl = LEAGUE_URLS[league]
  if (!leagueUrl) return []
  
  const url = `https://www.windrawwin.com/predictions/${leagueUrl}/`
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      next: { revalidate: 3600 },
    })
    
    if (!response.ok) {
      console.error(`WindrawWin fetch failed: ${response.status}`)
      return []
    }
    
    const html = await response.text()
    const predictions: any[] = []
    
    // 테이블 행 추출 (경기명과 예측 스코어)
    // 예: "Tottenham v Man Utd" ... "0-1"
    const rowRegex = /<tr[^>]*>.*?<td[^>]*>\s*<a[^>]*>([^<]+v[^<]+)<\/a>.*?<td[^>]*>(\d+-\d+)<\/td>.*?<\/tr>/gs
    
    let match
    while ((match = rowRegex.exec(html)) !== null) {
      const matchName = match[1].trim() // "Tottenham v Man Utd"
      const prediction = match[2] // "0-1"
      
      // 팀명 분리
      const teams = matchName.split(' v ')
      if (teams.length === 2) {
        const [homeGoals, awayGoals] = prediction.split('-').map(Number)
        
        // 영문 → 한글 변환
        const homeTeamKR = convertToKorean(teams[0].trim())
        const awayTeamKR = convertToKorean(teams[1].trim())
        
        predictions.push({
          homeTeam: homeTeamKR,  // 한글 팀명
          awayTeam: awayTeamKR,  // 한글 팀명
          predictedScore: prediction,
          homeGoals,
          awayGoals,
          confidence: 'Medium',
          source: 'WindrawWin',
        })
      }
    }
    
    console.log(`✅ WindrawWin 크롤링: ${predictions.length}개 예측`)
    
    return predictions
    
  } catch (error) {
    console.error('❌ WindrawWin 크롤링 에러:', error)
    return []
  }
}

// 🚀 API 엔드포인트
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const league = searchParams.get('league') || 'PL'
  const mode = searchParams.get('mode') || 'auto' // 'dummy' | 'real' | 'auto'
  
  console.log(`🎯 WindrawWin API: ${league} (모드: ${mode})`)
  
  try {
    let predictions: any[] = []
    let actualMode = mode
    
    if (mode === 'auto' || mode === 'real') {
      // 실제 크롤링 시도
      predictions = await fetchRealPredictions(league)
      
      // 실제 크롤링 실패 시 더미 데이터로 폴백
      if (predictions.length === 0) {
        console.log('⚠️ 실제 크롤링 실패, 더미 데이터 사용')
        predictions = getDummyPredictions(league)
        actualMode = 'dummy-fallback'
      } else {
        actualMode = 'real'
      }
    } else {
      // 더미 데이터 사용 (기본)
      predictions = getDummyPredictions(league)
      actualMode = 'dummy'
    }
    
    console.log(`✅ WindrawWin: ${predictions.length}개 예측 반환 (${actualMode})`)
    
    return NextResponse.json({
      success: true,
      league,
      predictions,
      count: predictions.length,
      source: 'WindrawWin',
      mode: actualMode,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ WindrawWin API 에러:', error)
    
    // 에러 시에도 더미 데이터로 폴백
    const predictions = getDummyPredictions(league)
    
    return NextResponse.json({
      success: true,
      league,
      predictions,
      count: predictions.length,
      source: 'WindrawWin',
      mode: 'error-fallback',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 200 })
  }
}