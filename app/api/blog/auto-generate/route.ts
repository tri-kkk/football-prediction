import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================
// 블로그 자동 생성 API v3
// /api/blog/auto-generate
//
// v3: Claude API로 인트로+전술+승부처 자연스럽게 생성
//     AI 실패 시 기존 템플릿 fallback
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://trendsoccer.com'
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

// ============================================
// 예측 페이지에서 지원하는 리그만 (KL, J리그 포함)
// ============================================
const LEAGUE_INFO: Record<string, { 
  nameKo: string; nameEn: string; 
  tagKo: string; tagEn: string;
  apiLeagueId: number;
  leagueLogo: string;
}> = {
  'PL':  { nameKo: '프리미어리그', nameEn: 'Premier League', tagKo: '프리미어리그', tagEn: 'PremierLeague', apiLeagueId: 39, leagueLogo: 'https://media.api-sports.io/football/leagues/39.png' },
  'PD':  { nameKo: '라리가', nameEn: 'La Liga', tagKo: '라리가', tagEn: 'LaLiga', apiLeagueId: 140, leagueLogo: 'https://media.api-sports.io/football/leagues/140.png' },
  'BL1': { nameKo: '분데스리가', nameEn: 'Bundesliga', tagKo: '분데스리가', tagEn: 'Bundesliga', apiLeagueId: 78, leagueLogo: 'https://media.api-sports.io/football/leagues/78.png' },
  'SA':  { nameKo: '세리에A', nameEn: 'Serie A', tagKo: '세리에A', tagEn: 'SerieA', apiLeagueId: 135, leagueLogo: 'https://media.api-sports.io/football/leagues/135.png' },
  'FL1': { nameKo: '리그1', nameEn: 'Ligue 1', tagKo: '리그1', tagEn: 'Ligue1', apiLeagueId: 61, leagueLogo: 'https://media.api-sports.io/football/leagues/61.png' },
  'DED': { nameKo: '에레디비시', nameEn: 'Eredivisie', tagKo: '에레디비시', tagEn: 'Eredivisie', apiLeagueId: 88, leagueLogo: 'https://media.api-sports.io/football/leagues/88.png' },
  // CL, EL 제외 - 정규리그만
  // 'CL':  { nameKo: '챔피언스리그', nameEn: 'Champions League', ... },
  // 'EL':  { nameKo: '유로파리그', nameEn: 'Europa League', ... },
  'KL1': { nameKo: 'K리그1', nameEn: 'K League 1', tagKo: 'K리그', tagEn: 'KLeague', apiLeagueId: 292, leagueLogo: 'https://media.api-sports.io/football/leagues/292.png' },
  'KL2': { nameKo: 'K리그2', nameEn: 'K League 2', tagKo: 'K리그', tagEn: 'KLeague', apiLeagueId: 293, leagueLogo: 'https://media.api-sports.io/football/leagues/293.png' },
  'J1':  { nameKo: 'J리그', nameEn: 'J1 League', tagKo: 'J리그', tagEn: 'JLeague', apiLeagueId: 98, leagueLogo: 'https://media.api-sports.io/football/leagues/98.png' },
  'J2':  { nameKo: 'J2리그', nameEn: 'J2 League', tagKo: 'J리그', tagEn: 'JLeague', apiLeagueId: 99, leagueLogo: 'https://media.api-sports.io/football/leagues/99.png' },
  'MLS': { nameKo: 'MLS', nameEn: 'Major League Soccer', tagKo: 'MLS', tagEn: 'MLS', apiLeagueId: 253, leagueLogo: 'https://media.api-sports.io/football/leagues/253.png' },
}

// 지원 리그 코드 Set (빠른 조회)
const SUPPORTED_LEAGUES = new Set(Object.keys(LEAGUE_INFO))

// 리그별 시즌 결정 (cron과 동일 로직)
function getSeasonForLeague(leagueCode: string): string {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  if (['KL1', 'KL2', 'J1', 'J2', 'MLS'].includes(leagueCode)) {
    // 아시아/북미 리그: 단일 연도 시즌
    return String(currentYear)
  } else {
    // 유럽 리그: 8월 이후면 현재 연도
    return String(currentMonth >= 8 ? currentYear : currentYear - 1)
  }
}

// ============================================
// 시즌 상황 감지 + 제목 다양화
// ============================================
interface SeasonContext {
  phaseKo: string
  phaseEn: string
  isOpening: boolean
  cautionNote: string  // AI에게 전달할 주의사항
}

function detectSeasonContext(leagueCode: string, homeStats: any, awayStats: any): SeasonContext {
  const now = new Date()
  const month = now.getMonth() + 1
  
  // 홈/원정 성적으로 이번 시즌 경기 수 추정
  const homeGames = homeStats?.homeStats 
    ? (homeStats.homeStats.wins + homeStats.homeStats.draws + homeStats.homeStats.losses) 
    : 0
  const awayGames = awayStats?.awayStats
    ? (awayStats.awayStats.wins + awayStats.awayStats.draws + awayStats.awayStats.losses)
    : 0
  const totalGames = homeGames + awayGames
  
  // K리그/J리그/MLS: 2~4월 개막
  if (['KL1', 'KL2', 'J1', 'J2', 'MLS'].includes(leagueCode)) {
    if (totalGames <= 2 || (month >= 2 && month <= 3 && totalGames <= 4)) {
      return {
        phaseKo: '시즌 개막',
        phaseEn: 'season opener',
        isOpening: true,
        cautionNote: '시즌 개막 초반이므로 "연승", "연패", "최근 폼" 등 지난 시즌 데이터를 이번 시즌 흐름처럼 서술하지 마세요. "새 시즌 첫 경기" 또는 "개막전" 맥락으로 작성하세요. 지난 시즌 성적은 "작시즌"으로 명시하세요.',
      }
    }
    if (totalGames <= 8) {
      return {
        phaseKo: '시즌 초반',
        phaseEn: 'early season',
        isOpening: false,
        cautionNote: '시즌 초반이라 데이터가 적습니다. "이번 시즌 초반" 맥락으로, 데이터 해석 시 표본 부족을 인지하세요. 지난 시즌 데이터 참조 시 "작시즌"으로 명시하세요.',
      }
    }
  }
  
  // 유럽 리그: 8~9월 개막
  if (['PL', 'PD', 'BL1', 'SA', 'FL1', 'DED'].includes(leagueCode)) {
    if (totalGames <= 2 || (month >= 8 && month <= 9 && totalGames <= 4)) {
      return {
        phaseKo: '시즌 개막',
        phaseEn: 'season opener',
        isOpening: true,
        cautionNote: '시즌 개막 초반이므로 "연승", "연패" 등을 이번 시즌 흐름처럼 서술하지 마세요. 데이터는 지난 시즌 또는 프리시즌 기반일 수 있습니다.',
      }
    }
    if (totalGames <= 10) {
      return { phaseKo: '시즌 초반', phaseEn: 'early season', isOpening: false,
        cautionNote: '시즌 초반입니다. 표본이 적어 통계 해석에 주의하세요.' }
    }
    if (month >= 4 || totalGames >= 28) {
      return { phaseKo: '시즌 후반', phaseEn: 'late season', isOpening: false,
        cautionNote: '시즌 후반입니다. 순위 경쟁, 잔류 싸움, 우승 경쟁 등 맥락을 반영하세요.' }
    }
  }
  
  return { phaseKo: '시즌 중반', phaseEn: 'mid-season', isOpening: false, cautionNote: '' }
}

// 제목 패턴 다양화
function generateTitleKr(homeKo: string, awayKo: string, leagueInfo: any, seasonCtx: SeasonContext, homeStats: any, awayStats: any): string {
  const patterns = [
    () => `${homeKo} vs ${awayKo} 프리뷰: ${leagueInfo.nameKo} 경기 분석`,
    () => `${leagueInfo.nameKo} ${homeKo} vs ${awayKo} 분석 리포트`,
    () => `${homeKo} vs ${awayKo}, ${leagueInfo.nameKo} 관전 포인트는?`,
    () => `${leagueInfo.nameKo} 프리뷰: ${homeKo} vs ${awayKo} 전력 비교`,
    () => `${homeKo} vs ${awayKo} 맞대결, 데이터로 본 승부 전망`,
    () => `${homeKo} vs ${awayKo} | ${leagueInfo.nameKo} 매치 분석`,
  ]
  
  // 시즌 개막 전용
  if (seasonCtx.isOpening) {
    patterns.push(
      () => `${leagueInfo.nameKo} 개막! ${homeKo} vs ${awayKo} 시즌 첫 분석`,
      () => `새 시즌 ${homeKo} vs ${awayKo}, ${leagueInfo.nameKo} 개막전 프리뷰`,
    )
  }
  
  // 연승/연패 맥락 (개막 아닐 때만)
  if (!seasonCtx.isOpening) {
    const hStreak = homeStats?.recentForm?.currentStreak
    const aStreak = awayStats?.recentForm?.currentStreak
    if (hStreak?.count >= 3 && hStreak.type === 'W') {
      patterns.push(() => `${hStreak.count}연승 ${homeKo}, ${awayKo} 상대로 질주 계속될까`)
    }
    if (aStreak?.count >= 3 && aStreak.type === 'W') {
      patterns.push(() => `${aStreak.count}연승 ${awayKo}, ${homeKo} 원정서도 통할까`)
    }
    if (hStreak?.count >= 3 && hStreak.type === 'L') {
      patterns.push(() => `${hStreak.count}연패 ${homeKo}, ${awayKo}전에서 반등 가능할까`)
    }
  }
  
  // 해시 기반 일관된 랜덤 선택 (같은 경기면 같은 제목)
  const hash = (homeKo + awayKo).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return patterns[hash % patterns.length]()
}

function generateTitleEn(home: string, away: string, leagueInfo: any, seasonCtx: SeasonContext, homeStats: any, awayStats: any): string {
  const patterns = [
    () => `${home} vs ${away} Preview: ${leagueInfo.nameEn} Match Analysis`,
    () => `${leagueInfo.nameEn}: ${home} vs ${away} Data-Driven Preview`,
    () => `${home} vs ${away} | ${leagueInfo.nameEn} Tactical Breakdown`,
    () => `${home} vs ${away}: Key Stats & Match Preview`,
    () => `${leagueInfo.nameEn} Preview: ${home} vs ${away} Form Guide`,
    () => `${home} vs ${away} — What the Data Says | ${leagueInfo.nameEn}`,
  ]
  
  if (seasonCtx.isOpening) {
    patterns.push(
      () => `${leagueInfo.nameEn} Season Opener: ${home} vs ${away} Preview`,
      () => `New Season ${home} vs ${away}: ${leagueInfo.nameEn} Opening Analysis`,
    )
  }
  
  const hash = (home + away).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return patterns[hash % patterns.length]()
}

// 예측 없는 excerpt (프리미엄 보호)
function generateExcerptKr(homeKo: string, awayKo: string, leagueInfo: any, seasonCtx: SeasonContext): string {
  const patterns = [
    `${homeKo}와 ${awayKo}의 ${leagueInfo.nameKo} 경기를 데이터로 분석합니다. 양팀 폼, 전력 비교, 핵심 관전 포인트까지.`,
    `${leagueInfo.nameKo} ${homeKo} vs ${awayKo}, 숫자로 보는 양팀 전력 분석과 핵심 맞대결 포인트.`,
    `${homeKo} vs ${awayKo} ${leagueInfo.nameKo} 프리뷰. 최근 성적, 상대 전적, 전술 분석을 한눈에.`,
    `${homeKo}과 ${awayKo}의 전력을 데이터 기반으로 비교 분석합니다. ${leagueInfo.nameKo} 매치 프리뷰.`,
  ]
  if (seasonCtx.isOpening) {
    patterns.push(`${leagueInfo.nameKo} 새 시즌 ${homeKo} vs ${awayKo}! 개막전 양팀 전력을 데이터로 분석합니다.`)
  }
  const hash = (homeKo + awayKo).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return patterns[hash % patterns.length]
}

function generateExcerptEn(home: string, away: string, leagueInfo: any, seasonCtx: SeasonContext): string {
  const patterns = [
    `In-depth ${leagueInfo.nameEn} analysis of ${home} vs ${away}. Recent form, key stats, tactical breakdown and more.`,
    `${home} vs ${away} ${leagueInfo.nameEn} preview. Data-driven analysis covering form, head-to-head, and key match factors.`,
    `Comprehensive ${leagueInfo.nameEn} match preview: ${home} vs ${away}. Stats, form guide, and tactical insights.`,
    `Breaking down ${home} vs ${away} with data. ${leagueInfo.nameEn} form analysis, stats comparison, and key battles.`,
  ]
  if (seasonCtx.isOpening) {
    patterns.push(`${leagueInfo.nameEn} new season kicks off! ${home} vs ${away} season opener preview and analysis.`)
  }
  const hash = (home + away).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return patterns[hash % patterns.length]
}

// ============================================
// 한글 팀명 매핑
// ============================================
const TEAM_NAME_KO: Record<string, string> = {
  // Premier League
  'Manchester City': '맨시티', 'Manchester United': '맨유',
  'Liverpool': '리버풀', 'Arsenal': '아스널', 'Chelsea': '첼시',
  'Tottenham': '토트넘', 'Tottenham Hotspur': '토트넘',
  'Newcastle': '뉴캐슬', 'Newcastle United': '뉴캐슬',
  'Aston Villa': '아스톤 빌라', 'Brighton': '브라이턴',
  'Brighton & Hove Albion': '브라이턴',
  'West Ham': '웨스트햄', 'West Ham United': '웨스트햄',
  'Wolverhampton Wanderers': '울버햄튼', 'Wolves': '울버햄튼',
  'Bournemouth': '본머스', 'AFC Bournemouth': '본머스',
  'Crystal Palace': '크리스탈 팰리스', 'Fulham': '풀럼',
  'Everton': '에버턴', 'Brentford': '브렌트퍼드',
  'Nottingham Forest': '노팅엄', 'Ipswich': '입스위치',
  'Ipswich Town': '입스위치',
  'Leicester': '레스터', 'Leicester City': '레스터',
  'Southampton': '사우스햄튼',
  // La Liga
  'Real Madrid': '레알 마드리드', 'Barcelona': '바르셀로나', 'FC Barcelona': '바르셀로나',
  'Atletico Madrid': '아틀레티코', 'Athletic Bilbao': '빌바오', 'Athletic Club': '빌바오',
  'Real Sociedad': '레알 소시에다드', 'Real Betis': '레알 베티스',
  'Villarreal': '비야레알', 'Sevilla': '세비야', 'Sevilla FC': '세비야',
  'Girona': '지로나', 'Valencia': '발렌시아', 'Valencia CF': '발렌시아',
  'Celta Vigo': '셀타 비고', 'Getafe': '헤타페', 'Getafe CF': '헤타페',
  'Osasuna': '오사수나', 'CA Osasuna': '오사수나',
  'Rayo Vallecano': '라요 바예카노', 'Mallorca': '마요르카', 'RCD Mallorca': '마요르카',
  'Alaves': '알라베스', 'Deportivo Alaves': '알라베스',
  'Las Palmas': '라스 팔마스', 'UD Las Palmas': '라스 팔마스',
  'Real Valladolid': '바야돌리드', 'Leganes': '레가네스', 'CD Leganes': '레가네스',
  'Espanyol': '에스파뇰', 'RCD Espanyol': '에스파뇰',
  // Bundesliga
  'Bayern Munich': '바이에른', 'FC Bayern München': '바이에른',
  'Borussia Dortmund': '도르트문트', 'Bayer Leverkusen': '레버쿠젠',
  'RB Leipzig': '라이프치히', 'VfB Stuttgart': '슈투트가르트',
  'Eintracht Frankfurt': '프랑크푸르트', 'VfL Wolfsburg': '볼프스부르크',
  'SC Freiburg': '프라이부르크', 'Freiburg': '프라이부르크',
  'TSG Hoffenheim': '호펜하임', 'Hoffenheim': '호펜하임',
  'FC Augsburg': '아우크스부르크', 'Augsburg': '아우크스부르크',
  'Werder Bremen': '브레멘', '1. FC Heidenheim': '하이덴하임',
  'FC St. Pauli': '장크트 파울리', '1. FSV Mainz 05': '마인츠',
  'Borussia Monchengladbach': '묀헨글라트바흐', 'FC Union Berlin': '우니온 베를린',
  'Holstein Kiel': '홀슈타인 킬',
  // Serie A
  'Inter Milan': '인터', 'Inter': '인터', 'FC Internazionale Milano': '인터',
  'AC Milan': '밀란', 'Juventus': '유벤투스',
  'Napoli': '나폴리', 'SSC Napoli': '나폴리',
  'AS Roma': '로마', 'Roma': '로마',
  'Lazio': '라치오', 'SS Lazio': '라치오',
  'Atalanta': '아탈란타', 'Fiorentina': '피오렌티나', 'ACF Fiorentina': '피오렌티나',
  'Bologna': '볼로냐', 'Bologna FC 1909': '볼로냐',
  'Torino': '토리노', 'Torino FC': '토리노',
  'Udinese': '우디네세', 'Udinese Calcio': '우디네세',
  'Genoa': '제노아', 'Genoa CFC': '제노아',
  'Cagliari': '칼리아리', 'Cagliari Calcio': '칼리아리',
  'Empoli': '엠폴리', 'Empoli FC': '엠폴리',
  'Parma': '파르마', 'Parma Calcio 1913': '파르마',
  'Verona': '베로나', 'Hellas Verona FC': '베로나',
  'Como': '코모', 'Como 1907': '코모',
  'Lecce': '레체', 'US Lecce': '레체',
  'Venezia': '베네치아', 'Venezia FC': '베네치아',
  'Monza': '몬자', 'AC Monza': '몬자',
  'Pisa': '피사',
  // Ligue 1
  'Paris Saint-Germain': 'PSG', 'Paris Saint Germain': 'PSG',
  'Marseille': '마르세유', 'Olympique Marseille': '마르세유',
  'Lyon': '리옹', 'Olympique Lyonnais': '리옹',
  'Monaco': '모나코', 'AS Monaco': '모나코',
  'Lille': '릴', 'Lille OSC': '릴',
  'Nice': '니스', 'OGC Nice': '니스',
  'Lens': '랑스', 'RC Lens': '랑스',
  'Rennes': '렌', 'Stade Rennais FC': '렌',
  'Strasbourg': '스트라스부르', 'RC Strasbourg Alsace': '스트라스부르',
  'Toulouse': '툴루즈', 'Toulouse FC': '툴루즈',
  'Nantes': '낭트', 'FC Nantes': '낭트',
  'Montpellier': '몽펠리에', 'Montpellier HSC': '몽펠리에',
  'Reims': '랭스', 'Stade de Reims': '랭스',
  'Brest': '브레스트', 'Stade Brestois 29': '브레스트',
  'Le Havre': '르아브르', 'Le Havre AC': '르아브르',
  'Auxerre': '오세르', 'AJ Auxerre': '오세르',
  'Angers': '앙제', 'Angers SCO': '앙제',
  'Saint-Etienne': '생테티엔', 'AS Saint-Etienne': '생테티엔',
  // Eredivisie
  'PSV Eindhoven': 'PSV', 'PSV': 'PSV',
  'Ajax': '아약스', 'AFC Ajax': '아약스',
  'Feyenoord': '페예노르트',
  'AZ Alkmaar': 'AZ', 'AZ': 'AZ',
  'FC Twente': '트벤테', 'Twente': '트벤테',
  'FC Utrecht': '위트레흐트',
  'Go Ahead Eagles': '고 어헤드 이글스',
  'Sparta Rotterdam': '스파르타 로테르담',
  'SC Heerenveen': '헤이렌베인',
  'NEC Nijmegen': 'NEC', 'NEC': 'NEC',
  'Fortuna Sittard': '포르투나 시타르트',
  'PEC Zwolle': 'PEC 즈볼레',
  'Heracles Almelo': '헤라클레스',
  'Willem II': '빌럼 II',
  'NAC Breda': 'NAC 브레다',
  'RKC Waalwijk': 'RKC 발베이크',
  'FC Groningen': '흐로닝언',
  'Almere City FC': '알머르 시티',
  // K League 1
  'Jeonbuk Motors': '전북 현대', 'Jeonbuk Hyundai Motors': '전북 현대',
  'Ulsan Hyundai': '울산 HD', 'Ulsan HD': '울산 HD', 'Ulsan Hyundai FC': '울산 HD',
  'FC Seoul': 'FC 서울',
  'Suwon Samsung Bluewings': '수원 삼성', 'Suwon Bluewings': '수원 삼성',
  'Pohang Steelers': '포항 스틸러스',
  'Jeju United FC': '제주 유나이티드', 'Jeju United': '제주 유나이티드',
  'Incheon United': '인천 유나이티드', 'Incheon United FC': '인천 유나이티드',
  'Daegu FC': '대구 FC',
  'Gangwon FC': '강원 FC',
  'Gwangju FC': '광주 FC',
  'Daejeon Hana Citizen': '대전 시티즌', 'Daejeon Citizen': '대전 시티즌',
  'Suwon FC': '수원 FC',
  'Gimcheon Sangmu': '김천 상무', 'Gimcheon Sangmu FC': '김천 상무',
  // K League 2
  'Bucheon FC 1995': '부천 FC', 'Bucheon FC': '부천 FC',
  'Seoul E-Land': '서울 이랜드', 'Seoul E-Land FC': '서울 이랜드',
  'Chungnam Asan': '충남 아산', 'Chungnam Asan FC': '충남 아산',
  'Anyang FC': '안양 FC', 'FC Anyang': '안양 FC',
  'Gyeongnam FC': '경남 FC',
  'Jeonnam Dragons': '전남 드래곤즈',
  'Cheonan City FC': '천안 시티',
  'Ansan Greeners': '안산 그리너스', 'Ansan Greeners FC': '안산 그리너스',
  'Cheongju FC': '청주 FC',
  'Gimpo FC': '김포 FC', 'Gimpo Citizen FC': '김포 FC',
  // J1 League
  'Vissel Kobe': '비셀 고베',
  'Yokohama F. Marinos': '요코하마 F 마리노스', 'Yokohama F Marinos': '요코하마 F 마리노스',
  'Kawasaki Frontale': '가와사키 프론탈레',
  'Urawa Red Diamonds': '우라와 레즈', 'Urawa Reds': '우라와 레즈',
  'Kashima Antlers': '가시마 앤틀러스',
  'FC Tokyo': 'FC 도쿄',
  'Nagoya Grampus': '나고야 그램퍼스',
  'Sanfrecce Hiroshima': '산프레체 히로시마',
  'Cerezo Osaka': '세레소 오사카',
  'Gamba Osaka': '감바 오사카',
  'Consadole Sapporo': '콘사돌레 삿포로', 'Hokkaido Consadole Sapporo': '콘사돌레 삿포로',
  'Avispa Fukuoka': '아비스파 후쿠오카',
  'Sagan Tosu': '사간 도스',
  'Kyoto Sanga': '교토 상가', 'Kyoto Sanga FC': '교토 상가',
  'Albirex Niigata': '알비렉스 니가타',
  'Tokyo Verdy': '도쿄 베르디',
  'Jubilo Iwata': '주빌로 이와타',
  'Machida Zelvia': '마치다 젤비아', 'FC Machida Zelvia': '마치다 젤비아',
  'Fagiano Okayama': '파지아노 오카야마',
  'Mito Hollyhock': '미토 홀리혹',
  // J2 League
  'Roasso Kumamoto': '로아소 구마모토',
  'Oita Trinita': '오이타 트리니타',
  'Renofa Yamaguchi': '레노파 야마구치',
  'Gainare Tottori': '가이나레 돗토리',
  'Tochigi SC': '도치기 SC',
  'Yokohama FC': '요코하마 FC',
  'Imabari': '이마바리', 'FC Imabari': '이마바리',
  'Kochi United': '고치 유나이티드', 'Kochi United SC': '고치 유나이티드',
  'Nara Club': '나라 클럽',
  'Iwaki': '이와키', 'Iwaki FC': '이와키',
  'Fujieda MYFC': '후지에다 MYFC',
  'Sagamihara': '사가미하라', 'SC Sagamihara': '사가미하라',
  'Montedio Yamagata': '몬테디오 야마가타',
  'Kanazawa': '카나자와', 'Zweigen Kanazawa': '카나자와',
  'Kamatamare Sanuki': '카마타마레 사누키',
  // MLS
  'Los Angeles FC': 'LAFC', 'LAFC': 'LAFC',
  'Inter Miami': '인터 마이애미', 'Inter Miami CF': '인터 마이애미',
  'Los Angeles Galaxy': 'LA 갤럭시', 'LA Galaxy': 'LA 갤럭시',
  'Seattle Sounders': '시애틀 사운더스', 'Seattle Sounders FC': '시애틀 사운더스',
  'Atlanta United FC': '애틀랜타 유나이티드', 'Atlanta United': '애틀랜타 유나이티드',
  'New York City FC': '뉴욕 시티 FC', 'NYCFC': '뉴욕 시티 FC',
  'New York Red Bulls': '뉴욕 레드불스',
  'Philadelphia Union': '필라델피아 유니온',
  'Columbus Crew': '콜럼버스 크루',
  'Nashville SC': '내슈빌 SC',
  'FC Cincinnati': 'FC 신시내티', 'Cincinnati': 'FC 신시내티',
  'Portland Timbers': '포틀랜드 팀버스',
  'Real Salt Lake': '레알 솔트레이크',
  'Houston Dynamo': '휴스턴 다이나모', 'Houston Dynamo FC': '휴스턴 다이나모',
  'FC Dallas': 'FC 댈러스',
  'Sporting Kansas City': '스포르팅 KC',
  'Charlotte FC': '샬럿 FC', 'Charlotte': '샬럿 FC',
  'Toronto FC': '토론토 FC',
  'Vancouver Whitecaps': '밴쿠버 화이트캡스', 'Vancouver Whitecaps FC': '밴쿠버 화이트캡스',
  'San Jose Earthquakes': '산호세 어스퀘이크스',
  'Minnesota United': '미네소타 유나이티드', 'Minnesota United FC': '미네소타 유나이티드',
  'Orlando City': '올랜도 시티', 'Orlando City SC': '올랜도 시티',
  'CF Montreal': 'CF 몬트리올', 'CF Montréal': 'CF 몬트리올',
  'Chicago Fire': '시카고 파이어', 'Chicago Fire FC': '시카고 파이어',
  'DC United': 'DC 유나이티드', 'D.C. United': 'DC 유나이티드',
  'New England Revolution': '뉴잉글랜드 레볼루션',
  'Austin FC': '오스틴 FC',
  'St. Louis City SC': '세인트루이스 시티', 'St Louis City SC': '세인트루이스 시티',
  'Colorado Rapids': '콜로라도 래피즈',
  'San Diego FC': '샌디에이고 FC', 'San Diego': '샌디에이고 FC',

  // PL 축약/변형
  "Nott'm Forest": '노팅엄', 'Nottm Forest': '노팅엄',
  'Man City': '맨시티', 'Man United': '맨유', 'Man Utd': '맨유', 'Spurs': '토트넘',

  // La Liga 특수문자 변형
  'Atlético Madrid': '아틀레티코', 'Atlético de Madrid': '아틀레티코',
  'Atletico de Madrid': '아틀레티코',

  // Bundesliga 누락/변형
  'VfL Bochum': '보훔', 'Bochum': '보훔',
  '1. FC Köln': '쾰른', 'FC Köln': '쾰른', 'Koln': '쾰른', '1. FC Koln': '쾰른',
  'Hamburger SV': '함부르크', 'Hamburg': '함부르크', 'HSV': '함부르크',
  'Hannover 96': '하노버', 'Hannover': '하노버',
  'SV Werder Bremen': '브레멘',
  'Stuttgart': '슈투트가르트',
  'Frankfurt': '프랑크푸르트',
  'Bayer 04 Leverkusen': '레버쿠젠', 'Leverkusen': '레버쿠젠',
  'RasenBallsport Leipzig': '라이프치히', 'Leipzig': '라이프치히',
  "Borussia M'gladbach": '묀헨글라트바흐', 'Gladbach': '묀헨글라트바흐',
  'Mönchengladbach': '묀헨글라트바흐', 'Borussia Mönchengladbach': '묀헨글라트바흐',
  'Union Berlin': '우니온 베를린',
  'Heidenheim': '하이덴하임', 'FC Heidenheim 1846': '하이덴하임',
  'St. Pauli': '장크트 파울리',
  'Mainz': '마인츠', 'Mainz 05': '마인츠',

  // Serie A 변형/승격팀
  'FC Inter': '인터', 'Internazionale': '인터', 'FC Internazionale': '인터',
  'Juventus FC': '유벤투스',
  'Hellas Verona': '베로나',
  'Cremonese': '크레모네세', 'US Cremonese': '크레모네세',
  'Spezia': '스페치아', 'Spezia Calcio': '스페치아',
  'Sassuolo': '사수올로', 'US Sassuolo': '사수올로', 'US Sassuolo Calcio': '사수올로',
  'Sampdoria': '삼프도리아', 'UC Sampdoria': '삼프도리아',
  'Pisa SC': '피사', 'SC Pisa 1909': '피사',

  // Ligue 1 변형
  'Olympique de Marseille': '마르세유',
  'OL': '리옹',
  'LOSC Lille': '릴', 'LOSC': '릴',
  'Paris SG': 'PSG', 'PSG': 'PSG',
  'AS Monaco FC': '모나코',
  'Stade Rennais': '렌',
  'HAC': '르아브르',
  'AS Saint-Étienne': '생테티엔', 'Saint-Étienne': '생테티엔',

  // Eredivisie 변형
  'Groningen': '흐로닝언',
  'Utrecht': '위트레흐트',
  'Heerenveen': '헤이렌베인',
  'Almere City': '알머르 시티',
  'RKC': 'RKC 발베이크',
  'Zwolle': 'PEC 즈볼레',
  'Excelsior': '엑셀시오르', 'SBV Excelsior': '엑셀시오르',
  'NAC': 'NAC 브레다',
  'Heracles': '헤라클레스',

  // K League 1 축약/변형
  'Jeonbuk Hyundai': '전북 현대',
  'Ulsan': '울산 HD', 'Ulsan HD FC': '울산 HD',
  'Seoul': 'FC 서울',
  'Suwon': '수원 삼성',
  'Pohang': '포항 스틸러스',
  'Jeju': '제주 유나이티드',
  'Incheon': '인천 유나이티드',
  'Daegu': '대구 FC',
  'Gangwon': '강원 FC',
  'Gwangju': '광주 FC',
  'Daejeon': '대전 시티즌',
  'Gimcheon': '김천 상무',
  'Seongnam FC': '성남 FC', 'Seongnam': '성남 FC',
  'Chungbuk Cheongju FC': '충북 청주', 'Chungbuk Cheongju': '충북 청주',
  'Jeongnam Dragons': '전남 드래곤즈',

  // K League 2 축약/변형
  'Bucheon': '부천 FC',
  'Chungnam': '충남 아산',
  'Anyang': '안양 FC',
  'Gyeongnam': '경남 FC',
  'Jeonnam': '전남 드래곤즈',
  'Ansan': '안산 그리너스',
  'Gimpo': '김포 FC',
  'Cheonan': '천안 시티',
  'Cheongju': '청주 FC',

  // J1 League 변형/승격팀
  'Vissel Kobe FC': '비셀 고베',
  'Yokohama Marinos': '요코하마 F 마리노스', 'Yokohama FM': '요코하마 F 마리노스',
  'Kawasaki': '가와사키 프론탈레',
  'Urawa': '우라와 레즈',
  'Kashima': '가시마 앤틀러스',
  'Tokyo': 'FC 도쿄',
  'Nagoya': '나고야 그램퍼스',
  'Hiroshima': '산프레체 히로시마', 'Sanfrecce': '산프레체 히로시마',
  'Cerezo': '세레소 오사카',
  'Gamba': '감바 오사카',
  'Sapporo': '콘사돌레 삿포로', 'Consadole': '콘사돌레 삿포로',
  'Fukuoka': '아비스파 후쿠오카', 'Avispa': '아비스파 후쿠오카',
  'Sagan': '사간 도스',
  'Kyoto': '교토 상가',
  'Niigata': '알비렉스 니가타',
  'Tokyo Verdy FC': '도쿄 베르디',
  'Jubilo': '주빌로 이와타', 'Iwata': '주빌로 이와타',
  'Zelvia': '마치다 젤비아', 'Machida': '마치다 젤비아',
  'Shonan Bellmare': '쇼난 벨마레', 'Shonan': '쇼난 벨마레',
  'Vegalta Sendai': '베갈타 센다이', 'Sendai': '베갈타 센다이',
  'Kashiwa Reysol': '가시와 레이솔', 'Kashiwa': '가시와 레이솔',

  // J2 League 추가 팀
  'Omiya Ardija': '오미야 아르디자', 'Omiya': '오미야 아르디자',
  'Thespakusatsu Gunma': '테스파 쿠사츠', 'Gunma': '테스파 쿠사츠',
  'Giravanz Kitakyushu': '기라반츠 기타큐슈', 'Kitakyushu': '기라반츠 기타큐슈',
  'Blaublitz Akita': '블라우블리츠 아키타', 'Akita': '블라우블리츠 아키타',
  'V-Varen Nagasaki': '브이파렌 나가사키', 'Nagasaki': '브이파렌 나가사키',
  'Montedio Yamagata': '몬테디오 야마가타', 'Yamagata': '몬테디오 야마가타',
  'Ehime FC': '에히메 FC', 'Ehime': '에히메 FC',
  'Matsumoto Yamaga': '마쓰모토 야마가', 'Matsumoto': '마쓰모토 야마가',
}

// 영어 강점/약점 → 한글 변환
const STRENGTH_TRANSLATIONS: Record<string, string> = {
  'Strong home record': '탄탄한 홈 경기력',
  'Good attacking form': '좋은 공격 폼',
  'Solid defense': '견고한 수비',
  'High scoring rate': '높은 득점력',
  'Clean sheet ability': '클린시트 능력',
  'Strong away form': '좋은 원정 경기력',
  'Good recent form': '양호한 최근 폼',
  'Consistent results': '안정적인 성적',
  'Strong goal difference': '우수한 골 차이',
  'High win rate': '높은 승률',
  'Dominant possession': '점유율 우위',
  'Effective counter-attacks': '효과적인 역습',
  'Set-piece threat': '세트피스 위협',
  'Strong defensive record': '견고한 수비 기록',
  'Low goals conceded': '적은 실점',
  'Poor home record': '부진한 홈 경기력',
  'Poor away form': '부진한 원정 경기력',
  'Weak defense': '취약한 수비',
  'Low scoring rate': '낮은 득점력',
  'Inconsistent results': '불안정한 성적',
  'Poor recent form': '부진한 최근 폼',
  'High goals conceded': '높은 실점률',
  'Struggling in attack': '공격 부진',
  'Defensive vulnerabilities': '수비 취약점',
  'Lack of clean sheets': '클린시트 부족',
  'Poor goal difference': '저조한 골 차이',
  'Losing streak': '연패 중',
  'No wins recently': '최근 승리 없음',
}

function translateStrength(text: string): string {
  return STRENGTH_TRANSLATIONS[text] || text
}

// H2H insight 한글 변환 (팀명 치환 + 패턴 번역)
function translateH2hInsight(text: string, homeKo: string, awayKo: string, homeEn: string, awayEn: string): string {
  let result = text
  // 영어 팀명 → 한글 치환
  result = result.replace(new RegExp(homeEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), homeKo)
  result = result.replace(new RegExp(awayEn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), awayKo)
  // 주요 패턴 번역
  result = result.replace(/dominated with/g, '우세:')
  result = result.replace(/wins? in/g, '승,')
  result = result.replace(/last/g, '최근')
  result = result.replace(/meetings?/g, '경기')
  result = result.replace(/no draws/g, '무승부 없음')
  result = result.replace(/overall record:/gi, '통산 전적:')
  result = result.replace(/head-to-head:/gi, '상대 전적:')
  return result
}

function getTeamNameKo(name: string): string {
  return TEAM_NAME_KO[name] || name
}

// ============================================
// TheNewsAPI — 팀 관련 최근 뉴스 수집 (7일 이내)
// ============================================
const NEWS_API_TOKEN = process.env.NEWS_API_TOKEN || ''

interface NewsItem {
  title: string
  description: string
  publishedAt: string
  source: string
}

async function fetchTeamNews(teamName: string, matchDate: string, leagueName: string): Promise<NewsItem[]> {
  if (!NEWS_API_TOKEN) return []
  try {
    // 경기일 기준 7일 전 ~ 경기 당일
    const matchDt = new Date(matchDate)
    const sevenDaysAgo = new Date(matchDt.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneDayAfter = new Date(matchDt.getTime() + 24 * 60 * 60 * 1000)
    const publishedAfter = sevenDaysAgo.toISOString().split('T')[0]
    const publishedBefore = oneDayAfter.toISOString().split('T')[0]

    const params = new URLSearchParams({
      api_token: NEWS_API_TOKEN,
      categories: 'sports',
      search: `${teamName} ${leagueName}`,
      language: 'en',
      limit: '5',
      sort: 'published_at',
      sort_order: 'desc',
      published_after: publishedAfter,
      published_before: publishedBefore,
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`https://api.thenewsapi.com/v1/news/all?${params}`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))
    if (!res.ok) { console.error(`fetchTeamNews [${teamName}] error: ${res.status}`); return [] }

    const data = await res.json()
    if (!data.data || !Array.isArray(data.data)) return []

    const articles = data.data.map((a: any) => ({
      title: a.title || '',
      description: a.description || a.snippet || '',
      publishedAt: a.published_at || '',
      source: a.source || '',
    })).filter((a: NewsItem) => a.title.length > 0)
    console.log(`📰 News [${teamName}]: ${articles.length}건 (${publishedAfter} ~ ${publishedBefore})`)
    articles.forEach((a: NewsItem) => console.log(`  - ${a.publishedAt.substring(0,10)} | ${a.title}`))
    return articles
  } catch (e) {
    console.error('fetchTeamNews error:', e)
    return []
  }
}

function formatNewsForPrompt(homeNews: NewsItem[], awayNews: NewsItem[], homeKo: string, awayKo: string, home: string, away: string): string {
  if (homeNews.length === 0 && awayNews.length === 0) return ''

  let result = '\n\n## 📰 최근 뉴스 (경기일 기준 7일 이내)\n'
  result += '※ 부상/출장정지/감독교체/주요 이슈가 있으면 분석에 반영하되, 없으면 생략하세요.\n'

  if (homeNews.length > 0) {
    result += `\n### ${homeKo} (${home})\n`
    homeNews.forEach(n => {
      const date = n.publishedAt ? n.publishedAt.substring(0, 10) : ''
      result += `- [${date}] ${n.title}\n`
      if (n.description) result += `  ${n.description.substring(0, 100)}\n`
    })
  }

  if (awayNews.length > 0) {
    result += `\n### ${awayKo} (${away})\n`
    awayNews.forEach(n => {
      const date = n.publishedAt ? n.publishedAt.substring(0, 10) : ''
      result += `- [${date}] ${n.title}\n`
      if (n.description) result += `  ${n.description.substring(0, 100)}\n`
    })
  }

  return result
}

// ============================================
// Claude API — AI 섹션 생성 (인트로+전술+승부처)
// ============================================
interface AISections {
  introKo: string; introEn: string
  tacticalKo: string; tacticalEn: string
  keyFactorsKo: string; keyFactorsEn: string
  newsKo: string; newsEn: string
}

async function generateAISections(
  match: any, pred: any, hS: any, aS: any,
  h2h: any, li: any, hKo: string, aKo: string,
): Promise<AISections | null> {
  if (!ANTHROPIC_API_KEY) return null
  try {
    const dKST = new Date(new Date(match.commence_time).getTime() + 9 * 60 * 60 * 1000)
    const dateStr = `${dKST.getUTCMonth()+1}월 ${dKST.getUTCDate()}일 ${String(dKST.getUTCHours()).padStart(2,'0')}:${String(dKST.getUTCMinutes()).padStart(2,'0')}`
    const pickKo = pred.recommendation.pick === 'HOME' ? '홈승' : pred.recommendation.pick === 'AWAY' ? '원정승' : '무승부'
    const maxP = Math.max(Math.round(pred.finalProb.home*100), Math.round(pred.finalProb.draw*100), Math.round(pred.finalProb.away*100))
    const pDiff = Math.abs((pred.homePower||0) - (pred.awayPower||0))
    const fm = (s: any) => { const r = s?.recentForm?.last5?.results || []; return `${r.filter((x:string)=>x==='W').length}승 ${r.filter((x:string)=>x==='D').length}무 ${r.filter((x:string)=>x==='L').length}패` }
    const sk = (s: any) => { const k = s?.recentForm?.currentStreak; if (!k || k.count < 2) return ''; return k.type === 'W' ? `${k.count}연승` : k.type === 'L' ? `${k.count}연패` : '' }
    const avg = (a: any[], f: string) => a?.length > 0 ? (a.reduce((s:number,m:any) => s+(m[f]||0), 0) / a.length).toFixed(1) : '?'
    const hR = hS?.homeStats, aR = aS?.awayStats
    const hM = hS?.recentMatches?.slice(0,10) || [], aM = aS?.recentMatches?.slice(0,10) || []
    const h2hSum = h2h?.overall ? `통산 ${h2h.overall.totalMatches}경기: ${hKo} ${h2h.overall.homeWins}승 / 무 ${h2h.overall.draws} / ${aKo} ${h2h.overall.awayWins}승` : '상대전적 없음'

    // 시즌 상황 감지
    const seasonCtx = detectSeasonContext(match.league_code, hS, aS)
    const seasonNote = seasonCtx.cautionNote ? `\n\n## ⚠️ 시즌 상황 (반드시 준수)\n- 현재: **${seasonCtx.phaseKo}** (${seasonCtx.phaseEn})\n- ${seasonCtx.cautionNote}` : ''

    // 뉴스 수집 (병렬, 실패해도 계속 진행)
    const [homeNews, awayNews] = await Promise.allSettled([
      fetchTeamNews(match.home_team, match.commence_time, li.nameEn),
      fetchTeamNews(match.away_team, match.commence_time, li.nameEn),
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : []))
    const newsContext = formatNewsForPrompt(homeNews as NewsItem[], awayNews as NewsItem[], hKo, aKo, match.home_team, match.away_team)

    const prompt = `당신은 축구 데이터 분석 전문가입니다. 아래 통계를 기반으로 **객관적이고 데이터 중심적인** 분석을 작성하세요.

## 경기 정보
- ${hKo}(${match.home_team}) vs ${aKo}(${match.away_team})
- ${li.nameKo} (${li.nameEn}), ${dateStr} (한국시간)
- 예측: ${pickKo} (${maxP}%), 등급: ${pred.recommendation.grade}
- 배당: ${match.home_odds} / ${match.draw_odds} / ${match.away_odds}
- 파워지수: ${hKo} ${pred.homePower||'?'} vs ${aKo} ${pred.awayPower||'?'} (차이: ${pDiff}점)

## 데이터
- ${hKo} 최근 5경기: ${fm(hS)} ${sk(hS)?'('+sk(hS)+')':''}
- ${aKo} 최근 5경기: ${fm(aS)} ${sk(aS)?'('+sk(aS)+')':''}
- ${hKo} 홈: ${hR ? `${hR.wins}승 ${hR.draws}무 ${hR.losses}패 (${hR.winRate}%)` : '데이터 없음'}
- ${aKo} 원정: ${aR ? `${aR.wins}승 ${aR.draws}무 ${aR.losses}패 (${aR.winRate}%)` : '데이터 없음'}
- 경기당 득점: ${hKo} ${avg(hM,'goalsFor')}골 vs ${aKo} ${avg(aM,'goalsFor')}골
- 경기당 실점: ${hKo} ${avg(hM,'goalsAgainst')}골 vs ${aKo} ${avg(aM,'goalsAgainst')}골

## 강점/약점
${hKo} 강점: ${(hS?.strengths||[]).slice(0,3).join(', ')||'없음'}
${hKo} 약점: ${(hS?.weaknesses||[]).slice(0,2).join(', ')||'없음'}
${aKo} 강점: ${(aS?.strengths||[]).slice(0,3).join(', ')||'없음'}
${aKo} 약점: ${(aS?.weaknesses||[]).slice(0,2).join(', ')||'없음'}

## 분석 근거
${(pred.recommendation.reasons||[]).slice(0,4).join('\n')}

## 상대전적
${h2hSum}${seasonNote}${newsContext}

---
## 핵심 작성 규칙

### 문체: 스포츠 데이터 애널리스트
- **객관적 서술**: "~를 기록했다", "~로 나타난다", "~수치를 보이고 있다"
- **데이터 인용**: 반드시 구체적 수치를 근거로 제시 (예: "최근 10경기 평균 1.5골")
- **단정 금지**: "~할 것이다" 대신 "~가능성이 높다" 또는 "데이터상 ~로 나타난다"
- 한글은 간결한 구어체 적절히 혼용 (~인데, ~거든요) 하되 분석 톤 유지

### 절대 금지
- "살펴보겠습니다", "주목할 만합니다", "분석해보겠습니다"
- "~할 것으로 보입니다", "~할 것으로 예상됩니다"
- 데이터에 없는 내용 창작 (선수 이름, 부상 정보, 이적 등) — 단, 뉴스에 명시된 내용은 인용 가능
- **예측 결과(승/무/패, 확률%) 언급 금지** — 인트로와 전술에서 결과를 암시하지 마세요

### 데이터 정합성 (매우 중요)
- 제공된 데이터만 사용하세요. 없는 수치를 만들지 마세요.
- "데이터 없음"인 항목은 언급하지 마세요.
- 연승/연패는 데이터에 명시된 경우에만 사용하세요.
${seasonCtx.cautionNote ? `- **${seasonCtx.cautionNote}**` : ''}

### 뉴스 이슈 처리 규칙
- 뉴스에 **부상/출장정지/감독교체/이적** 등 경기력에 영향을 줄 수 있는 이슈가 있으면 news_ko, news_en 태그에 작성하세요.
- 주요 선수 부상은 회복 중이거나 출전 여부가 불확실해도 포함하세요. 단, "완전히 회복" 또는 "정상 출전 예정"이 확인된 경우는 제외.
- 이슈가 전혀 없거나 뉴스가 없으면 태그를 **완전히 비워두세요**.
- **절대 금지**: 이슈가 없다는 설명, "관련 정보 없음", "확인되지 않음" 등의 문장을 태그 안에 쓰지 마세요. 없으면 그냥 빈 태그.
- **news_ko**: 영어 뉴스를 한글로 번역하여 요약. 팀명/선수명은 한글로 표기.
- **news_en**: 영어 원문 기반으로 간결하게 요약.
- 베팅/토토/배당 관련 기사는 무시하세요.

### 섹션별 요구
1. **인트로 (3-4문장)**: 경기 날짜/시간 포함, 양팀 현재 상황과 이번 경기의 관전 포인트. 예측 결과를 직접 언급하지 말 것.
2. **전술 포인트 (4-6문장)**: 양팀 강점/약점 데이터 기반 전술 맞대결 분석. 수치 근거 필수.
3. **승부처 (3개, 각 2-3문장)**: 분석 근거 데이터 기반, **1. 제목** 형식. 구체적 수치 포함.
4. **뉴스 이슈**: 경기력에 영향을 줄 이슈만, 없으면 빈 태그.

한글/영어 각각 독립 작성 (번역하지 말 것)

## 출력 형식
<intro_ko>(한글 인트로)</intro_ko>
<intro_en>(영어 인트로)</intro_en>
<tactical_ko>(한글 전술 분석)</tactical_ko>
<tactical_en>(영어 전술 분석)</tactical_en>
<keyfactors_ko>(한글 승부처 **1. 제목** 형식 3개)</keyfactors_ko>
<keyfactors_en>(영어 Key Factors **1. Title** 형식 3개)</keyfactors_en>
<news_ko>(확정된 부상/결장/감독교체 이슈만. 없으면 반드시 빈 태그)</news_ko>
<news_en>(Confirmed injury/suspension/manager issues only. Empty tag if none)</news_en>`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) { console.error('Claude API error:', res.status); return null }
    const txt = (await res.json()).content?.[0]?.text || ''
    const ex = (tag: string) => { const m = txt.match(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`)); return m ? m[1].trim() : '' }
    const sections: AISections = { introKo: ex('intro_ko'), introEn: ex('intro_en'), tacticalKo: ex('tactical_ko'), tacticalEn: ex('tactical_en'), keyFactorsKo: ex('keyfactors_ko'), keyFactorsEn: ex('keyfactors_en'), newsKo: ex('news_ko'), newsEn: ex('news_en') }
    return sections.introKo.length > 20 ? sections : null
  } catch (e) { console.error('AI generation error:', e); return null }
}

// ============================================
// reasons 한글 번역
// ============================================
function translateReason(reason: string): string {
  if (reason.startsWith('Power diff:')) {
    return reason.replace('Power diff:', '파워 차이:').replace('pts', '점')
  }
  if (reason.startsWith('Prob edge:')) {
    return reason.replace('Prob edge:', '확률 우위:')
  }
  if (reason.startsWith('Home 1st goal win:')) {
    return reason.replace('Home 1st goal win:', '홈 선득점 승률:')
  }
  if (reason.startsWith('Away 1st goal win:')) {
    return reason.replace('Away 1st goal win:', '원정 선득점 승률:')
  }
  if (reason.startsWith('Pattern:')) {
    return reason.replace('Pattern:', '패턴:').replace('matches', '경기 기반')
  }
  if (reason.startsWith('Data:')) {
    return reason.replace('Data:', '데이터:').replace('games', '경기')
  }
  if (reason === 'Warning: Home promoted') return '⚠️ 홈팀 승격팀'
  if (reason === 'Warning: Away promoted') return '⚠️ 원정팀 승격팀'
  if (reason.includes('Low edge') && reason.includes('risky')) {
    return reason.replace('Low edge', '확률 차이').replace('- risky', '- 예측 어려움')
  }
  if (reason === 'Insufficient team stats') return '팀 통계 부족'
  return reason
}

// ============================================
// 데이터 충분성 검증
// ============================================
function hasEnoughData(homeStats: any, awayStats: any, leagueCode?: string): boolean {
  // 개막전/시즌 초반 리그는 완화된 검증
  const isSeasonStart = isLeagueInSeasonStart(leagueCode || '')
  
  const homeForm = homeStats?.recentForm?.last5?.results
  const awayForm = awayStats?.recentForm?.last5?.results
  
  if (isSeasonStart) {
    // 개막전: 최근 폼 데이터 1개라도 있으면 OK (지난 시즌 데이터)
    if (!homeForm || homeForm.length < 1) return false
    if (!awayForm || awayForm.length < 1) return false
    return true
  }
  
  // 일반: 최근 5경기 결과가 최소 3개 이상 있어야 함
  if (!homeForm || homeForm.length < 3) return false
  if (!awayForm || awayForm.length < 3) return false
  
  const homeLast10 = homeStats?.recentForm?.last10
  const awayLast10 = awayStats?.recentForm?.last10
  
  if (!homeLast10 || (homeLast10.wins + homeLast10.draws + homeLast10.losses) === 0) return false
  if (!awayLast10 || (awayLast10.wins + awayLast10.draws + awayLast10.losses) === 0) return false
  
  return true
}

// 시즌 개막기 판별
function isLeagueInSeasonStart(leagueCode: string): boolean {
  const month = new Date().getMonth() + 1
  // K리그/J리그/MLS: 2~4월이 개막기
  if (['KL1', 'KL2', 'J1', 'J2', 'MLS'].includes(leagueCode) && month >= 2 && month <= 4) return true
  // 유럽: 8~9월이 개막기
  if (['PL', 'PD', 'BL1', 'SA', 'FL1', 'DED'].includes(leagueCode) && month >= 8 && month <= 9) return true
  return false
}

// 예측 데이터 유효성 검증
function isPredictionValid(prediction: any): boolean {
  if (!prediction?.finalProb) return false
  
  const { home, draw, away } = prediction.finalProb
  
  // 확률이 전부 0이면 깨진 데이터
  if (home === 0 && draw === 0 && away === 0) {
    console.log('⚠️ Prediction invalid: all probabilities are 0')
    return false
  }
  
  // 확률 합이 비정상 (0.5 미만이면 깨짐)
  const total = home + draw + away
  if (total < 0.5) {
    console.log(`⚠️ Prediction invalid: prob total = ${total}`)
    return false
  }
  
  return true
}

// 시즌 성적 이상치 감지 (승률 0%인데 패배 10+)
function isSeasonStatsAbnormal(homeStats: any, awayStats: any): boolean {
  const hS = homeStats?.homeStats
  const aS = awayStats?.awayStats
  
  // 홈 18연패, 원정 21연패 같은 비정상 데이터
  if (hS && hS.wins === 0 && hS.losses >= 10) {
    console.log(`⚠️ Abnormal home stats: 0W ${hS.losses}L — likely data error`)
    return true
  }
  if (aS && aS.wins === 0 && aS.losses >= 10) {
    console.log(`⚠️ Abnormal away stats: 0W ${aS.losses}L — likely data error`)
    return true
  }
  
  return false
}

// ============================================
// 썸네일 URL 생성 (OG 이미지용)
// ============================================
function generateThumbnailUrl(match: any, prediction: any, leagueInfo: any): string {
  // /api/blog/og-image 엔드포인트로 동적 OG 이미지 생성
  const params = new URLSearchParams({
    home: match.home_team,
    away: match.away_team,
    homelogo: match.home_team_logo || `https://media.api-sports.io/football/teams/${match.home_team_id || 0}.png`,
    awaylogo: match.away_team_logo || `https://media.api-sports.io/football/teams/${match.away_team_id || 0}.png`,
    league: leagueInfo.nameEn,
    leaguelogo: leagueInfo.leagueLogo,
    pick: prediction.recommendation.pick,
    grade: prediction.recommendation.grade,
    homeprob: Math.round(prediction.finalProb.home * 100).toString(),
    drawprob: Math.round(prediction.finalProb.draw * 100).toString(),
    awayprob: Math.round(prediction.finalProb.away * 100).toString(),
  })
  
  return `${API_BASE}/api/blog/og-image?${params.toString()}`
}

// ============================================
// 데이터 수집 함수들
// ============================================

async function fetchPrediction(match: any): Promise<any> {
  try {
    const leagueId = LEAGUE_INFO[match.league_code]?.apiLeagueId || 39
    const response = await fetch(`${API_BASE}/api/predict-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        homeTeam: match.home_team,
        awayTeam: match.away_team,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        leagueId,
        leagueCode: match.league_code,
        season: getSeasonForLeague(match.league_code),
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.prediction || null
  } catch (e) {
    console.error(`Prediction error: ${match.home_team} vs ${match.away_team}:`, e)
    return null
  }
}

async function fetchTeamStats(teamName: string, leagueCode: string): Promise<any> {
  try {
    const response = await fetch(
      `${API_BASE}/api/team-stats?team=${encodeURIComponent(teamName)}&league=${leagueCode}`
    )
    if (!response.ok) return null
    const data = await response.json()
    return data.success ? data.data : null
  } catch (e) {
    console.error(`Team stats error: ${teamName}:`, e)
    return null
  }
}

async function fetchH2H(match: any): Promise<any> {
  try {
    const params = new URLSearchParams({
      homeTeam: match.home_team,
      awayTeam: match.away_team,
    })
    if (match.home_team_id) params.append('homeTeamId', String(match.home_team_id))
    if (match.away_team_id) params.append('awayTeamId', String(match.away_team_id))
    const response = await fetch(`${API_BASE}/api/h2h-analysis?${params.toString()}`)
    if (!response.ok) return null
    const data = await response.json()
    return data.success ? data.data : null
  } catch (e) {
    console.error(`H2H error: ${match.home_team} vs ${match.away_team}:`, e)
    return null
  }
}

// ============================================
// 유틸 함수들
// ============================================

function generateSlug(homeTeam: string, awayTeam: string, leagueCode: string, commenceTime?: string): string {
  const home = homeTeam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const away = awayTeam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const league = (LEAGUE_INFO[leagueCode]?.nameEn || leagueCode).toLowerCase().replace(/[^a-z0-9]+/g, '-')
  // 경기 시간 기준 날짜 (중복 방지)
  const dateSource = commenceTime ? new Date(commenceTime) : new Date()
  const date = dateSource.toISOString().slice(0, 10).replace(/-/g, '')
  return `${home}-vs-${away}-${league}-preview-${date}`
}

function formatFormEmoji(results: string[]): string {
  return results.map(r => r === 'W' ? 'W' : r === 'D' ? 'D' : 'L').join(' ')
}

function formatFormText(results: string[]): string {
  const w = results.filter(r => r === 'W').length
  const d = results.filter(r => r === 'D').length
  const l = results.filter(r => r === 'L').length
  return `${w}승 ${d}무 ${l}패`
}

function formatFormTextEn(results: string[]): string {
  const w = results.filter(r => r === 'W').length
  const d = results.filter(r => r === 'D').length
  const l = results.filter(r => r === 'L').length
  return `${w}W ${d}D ${l}L`
}

function getGradeKo(grade: string): string {
  return grade === 'PICK' ? 'PICK (강추)' : grade === 'GOOD' ? 'GOOD (추천)' : 'PASS (비추)'
}

function getPickKo(pick: string): string {
  return pick === 'HOME' ? '홈승' : pick === 'AWAY' ? '원정승' : pick === 'DRAW' ? '무승부' : '패스'
}

function getPickEn(pick: string): string {
  return pick === 'HOME' ? 'Home Win' : pick === 'AWAY' ? 'Away Win' : pick === 'DRAW' ? 'Draw' : 'Skip'
}

function generateProbBar(label: string, pct: number): string {
  const filled = Math.round(pct / 6.25)
  const empty = 16 - filled
  if (label === '') return `${'█'.repeat(filled)}${'░'.repeat(empty)} **${pct}%**`
  return `${label} ${'█'.repeat(filled)}${'░'.repeat(empty)} ${pct}%`
}

// ============================================
// 한글 블로그 본문 생성
// ============================================
function generateContentKo(
  match: any, prediction: any,
  homeStats: any, awayStats: any,
  h2h: any, leagueInfo: any,
  ai: AISections | null = null,
): string {
  const homeKo = getTeamNameKo(match.home_team)
  const awayKo = getTeamNameKo(match.away_team)
  // KST = UTC + 9
  const matchDateKST = new Date(new Date(match.commence_time).getTime() + 9 * 60 * 60 * 1000)
  const dateStr = `${matchDateKST.getUTCMonth() + 1}월 ${matchDateKST.getUTCDate()}일`
  const timeStr = `${matchDateKST.getUTCHours().toString().padStart(2, '0')}:${matchDateKST.getUTCMinutes().toString().padStart(2, '0')}`
  
  const homePct = Math.round(prediction.finalProb.home * 100)
  const drawPct = Math.round(prediction.finalProb.draw * 100)
  const awayPct = Math.round(prediction.finalProb.away * 100)
  
  let c = ''
  
  // ===== 인트로 (AI 또는 템플릿) =====
  c += `# ${homeKo} vs ${awayKo}: ${leagueInfo.nameKo} 매치 프리뷰\n\n`
  if (ai?.introKo) {
    c += ai.introKo + '\n\n'
  } else {
    c += `${dateStr} ${timeStr}(한국시간), ${leagueInfo.nameKo} ${homeKo}와 ${awayKo}의 대결이 예정되어 있다. `
    c += `TrendSoccer AI 분석 결과 **${getPickKo(prediction.recommendation.pick)}** 가능성이 가장 높으며, `
    c += `예측 등급은 **${getGradeKo(prediction.recommendation.grade)}**다. `
    if (prediction.homePower && prediction.awayPower) {
      const diff = Math.abs(prediction.homePower - prediction.awayPower)
      if (diff >= 100) c += `파워 지수 차이가 **${diff}점**으로 상당한 전력 격차가 존재한다.\n\n`
      else if (diff >= 50) c += `파워 지수 차이는 **${diff}점**으로 한 팀이 우위에 있다.\n\n`
      else c += `파워 지수 차이가 **${diff}점**에 불과해 팽팽한 맞대결이 예상된다.\n\n`
    } else {
      c += '\n\n'
    }
  }
  
  // ===== 📊 양팀 최근 폼 =====
  c += `## 양팀 최근 폼\n\n`
  
  if (homeStats?.recentForm) {
    const f5 = homeStats.recentForm.last5?.results || []
    const l10 = homeStats.recentForm.last10
    c += `### ${homeKo}\n\n`
    if (l10) {
      c += `| 항목 | 수치 |\n|:---|:---|\n`
      c += `| 최근 10경기 | **${l10.wins}승 ${l10.draws}무 ${l10.losses}패** |\n`
      c += `| 득점 / 실점 | **${l10.goalsFor}골** / **${l10.goalsAgainst}실점** |\n`
      const streak = homeStats.recentForm.currentStreak
      if (streak && streak.count >= 2) {
        c += `| 연속 | ${streak.type === 'W' ? `**${streak.count}연승**` : streak.type === 'L' ? `**${streak.count}연패**` : `**${streak.count}연속 무승부**`} |\n`
      }
      c += '\n'
    }
  }
  
  if (awayStats?.recentForm) {
    const f5 = awayStats.recentForm.last5?.results || []
    const l10 = awayStats.recentForm.last10
    c += `### ${awayKo}\n\n`
    if (l10) {
      c += `| 항목 | 수치 |\n|:---|:---|\n`
      c += `| 최근 10경기 | **${l10.wins}승 ${l10.draws}무 ${l10.losses}패** |\n`
      c += `| 득점 / 실점 | **${l10.goalsFor}골** / **${l10.goalsAgainst}실점** |\n`
      const streak = awayStats.recentForm.currentStreak
      if (streak && streak.count >= 2) {
        c += `| 연속 | ${streak.type === 'W' ? `**${streak.count}연승**` : streak.type === 'L' ? `**${streak.count}연패**` : `**${streak.count}연속 무승부**`} |\n`
      }
      c += '\n'
    }
  }
  
  // ===== 🏆 시즌 성적 =====
  const homeRel = homeStats?.homeStats
  const awayRel = awayStats?.awayStats
  
  // 이상치 필터: 0승 10패+ 같은 비정상 데이터는 표시 안 함
  const homeRelOk = homeRel && !(homeRel.wins === 0 && homeRel.losses >= 10)
  const awayRelOk = awayRel && !(awayRel.wins === 0 && awayRel.losses >= 10)
  
  if (homeRelOk && awayRelOk) {
    c += `## ${leagueInfo.nameKo} 시즌 성적\n\n`
    c += `| | ${homeKo} (홈) | ${awayKo} (원정) |\n|:---|:---:|:---:|\n`
    c += `| 승-무-패 | **${homeRel.wins}-${homeRel.draws}-${homeRel.losses}** | **${awayRel.wins}-${awayRel.draws}-${awayRel.losses}** |\n`
    c += `| 승률 | **${homeRel.winRate}%** | **${awayRel.winRate}%** |\n\n`
  } else if (homeRelOk || awayRelOk) {
    c += `## ${leagueInfo.nameKo} 시즌 성적\n\n`
    if (homeRelOk) c += `**${homeKo} (홈)**: ${homeRel.wins}승 ${homeRel.draws}무 ${homeRel.losses}패 (승률 **${homeRel.winRate}%**)\n\n`
    if (awayRelOk) c += `**${awayKo} (원정)**: ${awayRel.wins}승 ${awayRel.draws}무 ${awayRel.losses}패 (승률 **${awayRel.winRate}%**)\n\n`
  }
  
  // ===== 📈 핵심 스탯 비교 =====
  if (homeStats?.recentMatches?.length > 0 && awayStats?.recentMatches?.length > 0) {
    c += `## 핵심 스탯 비교\n\n`
    
    const hL10 = homeStats.recentMatches.slice(0, 10)
    const aL10 = awayStats.recentMatches.slice(0, 10)
    
    const hGF = (hL10.reduce((s: number, m: any) => s + m.goalsFor, 0) / hL10.length).toFixed(1)
    const hGA = (hL10.reduce((s: number, m: any) => s + m.goalsAgainst, 0) / hL10.length).toFixed(1)
    const aGF = (aL10.reduce((s: number, m: any) => s + m.goalsFor, 0) / aL10.length).toFixed(1)
    const aGA = (aL10.reduce((s: number, m: any) => s + m.goalsAgainst, 0) / aL10.length).toFixed(1)
    
    c += `> 최근 10경기 평균 기준\n\n`
    c += `| 지표 | ${homeKo} | ${awayKo} |\n|:---|:---:|:---:|\n`
    c += `| 경기당 득점 | **${hGF}** | **${aGF}** |\n`
    c += `| 경기당 실점 | **${hGA}** | **${aGA}** |\n`
    
    if (homeStats.markets && awayStats.markets) {
      c += `| 오버 2.5 | **${homeStats.markets.over25Rate}%** | **${awayStats.markets.over25Rate}%** |\n`
      c += `| 양팀득점(BTTS) | **${homeStats.markets.bttsRate}%** | **${awayStats.markets.bttsRate}%** |\n`
      c += `| 클린시트 | **${homeStats.markets.cleanSheetRate}%** | **${awayStats.markets.cleanSheetRate}%** |\n`
    }
    c += '\n'
  }
  
  // ===== ⚔️ 상대 전적 =====
  if (h2h?.overall) {
    c += `## 상대 전적\n\n`
    c += `| ${homeKo} 승 | 무승부 | ${awayKo} 승 | 총 경기 |\n|:---:|:---:|:---:|:---:|\n`
    c += `| **${h2h.overall.homeWins}** | **${h2h.overall.draws}** | **${h2h.overall.awayWins}** | ${h2h.overall.totalMatches} |\n\n`
    
    if (h2h.recentMatches?.length > 0) {
      c += `**최근 맞대결**\n\n`
      h2h.recentMatches.slice(0, 3).forEach((m: any) => {
        const icon = m.result === 'W' ? '승' : m.result === 'L' ? '패' : '무'
        const date = m.date ? ` (${m.date.slice(0, 10)})` : ''
        const hName = getTeamNameKo(m.homeTeam || match.home_team)
        const aName = getTeamNameKo(m.awayTeam || match.away_team)
        c += `${icon} ${hName} **${m.homeScore} - ${m.awayScore}** ${aName}${date}\n\n`
      })
    }
    
    if (h2h.insights?.length > 0) {
      c += `> ${translateH2hInsight(h2h.insights[0], homeKo, awayKo, match.home_team, match.away_team)}\n\n`
    }
  }
  
  // ===== 🎯 전술 포인트 (AI 또는 템플릿) =====
  if (ai?.tacticalKo) {
    c += `## 전술 포인트\n\n`
    c += ai.tacticalKo + '\n\n'
  } else {
    const hasStrengths = homeStats?.strengths?.length > 0 || awayStats?.strengths?.length > 0
    const hasWeaknesses = homeStats?.weaknesses?.length > 0 || awayStats?.weaknesses?.length > 0
  
    if (hasStrengths || hasWeaknesses) {
      c += `## 전술 포인트\n\n`
      if (homeStats?.strengths?.length > 0) {
        c += `### ${homeKo}의 강점\n`
        homeStats.strengths.slice(0, 3).forEach((s: string) => { c += `- ${translateStrength(s)}\n` })
        c += '\n'
      }
      if (homeStats?.weaknesses?.length > 0) {
        c += `### ${homeKo}의 약점\n`
        homeStats.weaknesses.slice(0, 2).forEach((w: string) => { c += `- ${translateStrength(w)}\n` })
        c += '\n'
      }
      if (awayStats?.strengths?.length > 0) {
        c += `### ${awayKo}의 강점\n`
        awayStats.strengths.slice(0, 3).forEach((s: string) => { c += `- ${translateStrength(s)}\n` })
        c += '\n'
      }
      if (awayStats?.weaknesses?.length > 0) {
        c += `### ${awayKo}의 약점\n`
        awayStats.weaknesses.slice(0, 2).forEach((w: string) => { c += `- ${translateStrength(w)}\n` })
        c += '\n'
      }
    }
  }
  
  // ===== 💡 승부처 (AI 또는 템플릿) =====
  if (ai?.keyFactorsKo) {
    c += `## 승부처\n\n`
    c += ai.keyFactorsKo + '\n\n'
  } else if (prediction.recommendation.reasons?.length > 0) {
    c += `## 승부처\n\n`
    prediction.recommendation.reasons.slice(0, 3).forEach((reason: string, i: number) => {
      c += `**${i + 1}. ${translateReason(reason)}**\n\n`
    })
  }

  // ===== 📰 최근 이슈 (뉴스 기반, 있을 때만) =====
  if (ai?.newsKo && ai.newsKo.trim().length > 0) {
    c += `## 📰 최근 이슈\n\n`
    c += ai.newsKo + '\n\n'
  }
  
  // ===== 📈 TrendSoccer 예측 =====
  c += `## TrendSoccer 예측\n\n`
  c += `| | 확률 |\n|:---|:---|\n`
  c += `| ${homeKo} | ${generateProbBar('', homePct)} |\n`
  c += `| 무승부 | ${generateProbBar('', drawPct)} |\n`
  c += `| ${awayKo} | ${generateProbBar('', awayPct)} |\n\n`
  
  c += `| 항목 | 분석 |\n|:---|:---|\n`
  c += `| 예측 | **${getPickKo(prediction.recommendation.pick)}** |\n`
  c += `| 등급 | **${getGradeKo(prediction.recommendation.grade)}** |\n`
  c += `| 배당 | ${match.home_odds} / ${match.draw_odds} / ${match.away_odds} |\n`
  if (prediction.homePower && prediction.awayPower) {
    c += `| 파워 지수 | ${homeKo} **${prediction.homePower}** vs ${awayKo} **${prediction.awayPower}** |\n`
  }
  if (prediction.patternStats) {
    c += `| 패턴 | ${prediction.pattern} (${prediction.patternStats.totalMatches}경기 기반) |\n`
  }
  c += '\n'
  
  return c
}

// ============================================
// 영어 블로그 본문 생성
// ============================================
function generateContentEn(
  match: any, prediction: any,
  homeStats: any, awayStats: any,
  h2h: any, leagueInfo: any,
  ai: AISections | null = null,
): string {
  const home = match.home_team
  const away = match.away_team
  const matchDateUTC = new Date(match.commence_time)
  const dateStr = matchDateUTC.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })
  const timeStrUTC = `${matchDateUTC.getUTCHours().toString().padStart(2, '0')}:${matchDateUTC.getUTCMinutes().toString().padStart(2, '0')} UTC`
  
  const homePct = Math.round(prediction.finalProb.home * 100)
  const drawPct = Math.round(prediction.finalProb.draw * 100)
  const awayPct = Math.round(prediction.finalProb.away * 100)
  
  let c = ''
  
  c += `# ${home} vs ${away}: ${leagueInfo.nameEn} Match Preview\n\n`
  if (ai?.introEn) {
    c += ai.introEn + '\n\n'
  } else {
    c += `${home} host ${away} in ${leagueInfo.nameEn} action on ${dateStr} at ${timeStrUTC}. `
    c += `TrendSoccer's AI model predicts **${getPickEn(prediction.recommendation.pick)}** as the most likely outcome `
    c += `with a **${Math.max(homePct, drawPct, awayPct)}%** probability. `
    if (prediction.homePower && prediction.awayPower) {
      const diff = Math.abs(prediction.homePower - prediction.awayPower)
      if (diff >= 100) c += `The power index gap of **${diff} points** suggests a significant mismatch.\n\n`
      else if (diff >= 50) c += `A power index difference of **${diff} points** gives one side a clear edge.\n\n`
      else c += `With just **${diff} points** separating them, expect a tight contest.\n\n`
    } else {
      c += '\n\n'
    }
  }
  
  // Recent Form
  c += `## Recent Form\n\n`
  if (homeStats?.recentForm) {
    const f5 = homeStats.recentForm.last5?.results || []
    const l10 = homeStats.recentForm.last10
    c += `### ${home}\n\n`
    if (l10) {
      c += `| Stat | Value |\n|:---|:---|\n`
      c += `| Last 10 | **${l10.wins}W ${l10.draws}D ${l10.losses}L** |\n`
      c += `| Goals / Conceded | **${l10.goalsFor}** / **${l10.goalsAgainst}** |\n`
      const streak = homeStats.recentForm.currentStreak
      if (streak && streak.count >= 2) {
        c += `| Streak | ${streak.type === 'W' ? `**${streak.count}-game win streak**` : streak.type === 'L' ? `**${streak.count}-game losing run**` : `**${streak.count} draws**`} |\n`
      }
      c += '\n'
    }
  }
  if (awayStats?.recentForm) {
    const f5 = awayStats.recentForm.last5?.results || []
    const l10 = awayStats.recentForm.last10
    c += `### ${away}\n\n`
    if (l10) {
      c += `| Stat | Value |\n|:---|:---|\n`
      c += `| Last 10 | **${l10.wins}W ${l10.draws}D ${l10.losses}L** |\n`
      c += `| Goals / Conceded | **${l10.goalsFor}** / **${l10.goalsAgainst}** |\n`
      const streak = awayStats.recentForm.currentStreak
      if (streak && streak.count >= 2) {
        c += `| Streak | ${streak.type === 'W' ? `**${streak.count}-game win streak**` : streak.type === 'L' ? `**${streak.count}-game losing run**` : `**${streak.count} draws**`} |\n`
      }
      c += '\n'
    }
  }
  
  // Season Record
  const homeRelEn = homeStats?.homeStats
  const awayRelEn = awayStats?.awayStats
  const homeRelEnOk = homeRelEn && !(homeRelEn.wins === 0 && homeRelEn.losses >= 10)
  const awayRelEnOk = awayRelEn && !(awayRelEn.wins === 0 && awayRelEn.losses >= 10)
  if (homeRelEnOk && awayRelEnOk) {
    c += `## ${leagueInfo.nameEn} Season Record\n\n`
    c += `| | ${home} (Home) | ${away} (Away) |\n|:---|:---:|:---:|\n`
    c += `| W-D-L | **${homeRelEn.wins}-${homeRelEn.draws}-${homeRelEn.losses}** | **${awayRelEn.wins}-${awayRelEn.draws}-${awayRelEn.losses}** |\n`
    c += `| Win Rate | **${homeRelEn.winRate}%** | **${awayRelEn.winRate}%** |\n\n`
  } else if (homeRelEnOk || awayRelEnOk) {
    c += `## ${leagueInfo.nameEn} Season Record\n\n`
    if (homeRelEnOk) c += `**${home} (Home)**: ${homeRelEn.wins}W ${homeRelEn.draws}D ${homeRelEn.losses}L (**${homeRelEn.winRate}%** win rate)\n\n`
    if (awayRelEnOk) c += `**${away} (Away)**: ${awayRelEn.wins}W ${awayRelEn.draws}D ${awayRelEn.losses}L (**${awayRelEn.winRate}%** win rate)\n\n`
  }
  
  // Key Stats
  if (homeStats?.recentMatches?.length > 0 && awayStats?.recentMatches?.length > 0) {
    c += `## Key Stats\n\n`
    const hL10 = homeStats.recentMatches.slice(0, 10)
    const aL10 = awayStats.recentMatches.slice(0, 10)
    const hGF = (hL10.reduce((s: number, m: any) => s + m.goalsFor, 0) / hL10.length).toFixed(1)
    const hGA = (hL10.reduce((s: number, m: any) => s + m.goalsAgainst, 0) / hL10.length).toFixed(1)
    const aGF = (aL10.reduce((s: number, m: any) => s + m.goalsFor, 0) / aL10.length).toFixed(1)
    const aGA = (aL10.reduce((s: number, m: any) => s + m.goalsAgainst, 0) / aL10.length).toFixed(1)
    
    c += `> Based on last 10 matches\n\n`
    c += `| Metric | ${home} | ${away} |\n|:---|:---:|:---:|\n`
    c += `| Goals/Game | **${hGF}** | **${aGF}** |\n`
    c += `| Conceded/Game | **${hGA}** | **${aGA}** |\n`
    
    if (homeStats.markets && awayStats.markets) {
      c += `| Over 2.5 | **${homeStats.markets.over25Rate}%** | **${awayStats.markets.over25Rate}%** |\n`
      c += `| BTTS | **${homeStats.markets.bttsRate}%** | **${awayStats.markets.bttsRate}%** |\n`
      c += `| Clean Sheet | **${homeStats.markets.cleanSheetRate}%** | **${awayStats.markets.cleanSheetRate}%** |\n`
    }
    c += '\n'
  }
  
  // H2H
  if (h2h?.overall) {
    c += `## Head-to-Head\n\n`
    c += `| ${home} Wins | Draws | ${away} Wins | Total |\n|:---:|:---:|:---:|:---:|\n`
    c += `| **${h2h.overall.homeWins}** | **${h2h.overall.draws}** | **${h2h.overall.awayWins}** | ${h2h.overall.totalMatches} |\n\n`
    if (h2h.recentMatches?.length > 0) {
      c += `**Recent Meetings**\n\n`
      h2h.recentMatches.slice(0, 3).forEach((m: any) => {
        const icon = m.result === 'W' ? '승' : m.result === 'L' ? '패' : '무'
        const date = m.date ? ` (${m.date.slice(0, 10)})` : ''
        const hName = m.homeTeam || match.home_team
        const aName = m.awayTeam || match.away_team
        c += `${icon} ${hName} **${m.homeScore} - ${m.awayScore}** ${aName}${date}\n\n`
      })
    }
    if (h2h.insights?.length > 0) c += `> ${h2h.insights[0]}\n\n`
  }
  
  // Tactical (AI or template)
  if (ai?.tacticalEn) {
    c += `## Tactical Points\n\n`
    c += ai.tacticalEn + '\n\n'
  } else if (homeStats?.strengths?.length > 0 || awayStats?.strengths?.length > 0) {
    c += `## Tactical Points\n\n`
    if (homeStats?.strengths?.length > 0) { c += `### ${home} Strengths\n`; homeStats.strengths.slice(0, 3).forEach((s: string) => { c += `- ${s}\n` }); c += '\n' }
    if (homeStats?.weaknesses?.length > 0) { c += `### ${home} Weaknesses\n`; homeStats.weaknesses.slice(0, 2).forEach((w: string) => { c += `- ${w}\n` }); c += '\n' }
    if (awayStats?.strengths?.length > 0) { c += `### ${away} Strengths\n`; awayStats.strengths.slice(0, 3).forEach((s: string) => { c += `- ${s}\n` }); c += '\n' }
    if (awayStats?.weaknesses?.length > 0) { c += `### ${away} Weaknesses\n`; awayStats.weaknesses.slice(0, 2).forEach((w: string) => { c += `- ${w}\n` }); c += '\n' }
  }
  
  // Key Factors (AI or template)
  if (ai?.keyFactorsEn) {
    c += `## Key Factors\n\n`
    c += ai.keyFactorsEn + '\n\n'
  } else if (prediction.recommendation.reasons?.length > 0) {
    c += `## Key Factors\n\n`
    prediction.recommendation.reasons.slice(0, 3).forEach((reason: string, i: number) => {
      c += `**${i + 1}. ${reason}**\n\n`
    })
  }

  // 📰 Latest News Issues (only if present)
  if (ai?.newsEn && ai.newsEn.trim().length > 0) {
    c += `## 📰 Latest News\n\n`
    c += ai.newsEn + '\n\n'
  }
  
  // Prediction
  c += `## TrendSoccer Prediction\n\n`
  c += `| | Probability |\n|:---|:---|\n`
  c += `| ${home} | ${generateProbBar('', homePct)} |\n`
  c += `| Draw | ${generateProbBar('', drawPct)} |\n`
  c += `| ${away} | ${generateProbBar('', awayPct)} |\n\n`
  
  c += `| Detail | Analysis |\n|:---|:---|\n`
  c += `| Prediction | **${getPickEn(prediction.recommendation.pick)}** |\n`
  c += `| Grade | **${prediction.recommendation.grade}** |\n`
  c += `| Odds | ${match.home_odds} / ${match.draw_odds} / ${match.away_odds} |\n`
  if (prediction.homePower && prediction.awayPower) {
    c += `| Power Index | ${home} **${prediction.homePower}** vs ${away} **${prediction.awayPower}** |\n`
  }
  if (prediction.patternStats) {
    c += `| Pattern | ${prediction.pattern} (${prediction.patternStats.totalMatches} matches) |\n`
  }
  c += '\n'
  
  return c
}

// ============================================
// 태그 생성
// ============================================
function generateTags(match: any, leagueInfo: any): string[] {
  const tags: string[] = [
    leagueInfo.tagEn,
    leagueInfo.tagKo,
    match.home_team.replace(/\s+/g, ''),
    match.away_team.replace(/\s+/g, ''),
    'MatchPreview',
    '축구분석',
    '경기예측',
    'Football',
    '해외축구',
    '프리뷰',
  ]
  return tags.slice(0, 10)
}

// ============================================
// 메인 핸들러: GET (Cron 자동 실행)
// ============================================
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    // 24시간 이내 경기 조회
    const { data: upcomingMatches, error: matchError } = await supabase
      .from('match_odds_latest')
      .select('*')
      .gte('commence_time', now.toISOString())
      .lte('commence_time', tomorrow.toISOString())
      .order('commence_time', { ascending: true })
    
    if (matchError) {
      return NextResponse.json({ error: 'Match query failed', details: matchError }, { status: 500 })
    }
    
    if (!upcomingMatches || upcomingMatches.length === 0) {
      return NextResponse.json({ success: true, message: 'No upcoming matches in 24h', generated: 0 })
    }
    
    // 지원 리그만 필터링
    const supportedMatches = upcomingMatches.filter(m => SUPPORTED_LEAGUES.has(m.league_code))
    console.log(`📝 ${supportedMatches.length}/${upcomingMatches.length} matches in supported leagues`)
    
    // 중복 체크
    const existingSlugs = new Set<string>()
    const { data: existingPosts } = await supabase
      .from('blog_posts')
      .select('slug')
      .gte('published_at', new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString())
    if (existingPosts) existingPosts.forEach(p => existingSlugs.add(p.slug))
    
    const results: any[] = []
    let generated = 0, skipped = 0, failed = 0, noData = 0
    
    const TIMEOUT_MS = 700 * 1000 // 700초 (Pro 플랜 800초 제한 여유)

    for (const match of supportedMatches) {
      // 타임아웃 임박 시 조기 종료 (남은 경기는 다음 실행에서 처리)
      if (Date.now() - startTime > TIMEOUT_MS) {
        console.log(`⏱️ Timeout guard: stopping after ${generated} generated (${supportedMatches.indexOf(match)}/${supportedMatches.length})`)
        break
      }

      const leagueInfo = LEAGUE_INFO[match.league_code]
      const slug = generateSlug(match.home_team, match.away_team, match.league_code, match.commence_time)
      
      if (existingSlugs.has(slug)) { skipped++; continue }
      
      try {
        // 1. 예측 데이터
        const prediction = await fetchPrediction(match)
        if (!prediction) { failed++; continue }
        
        // 1.5. 예측 유효성 검증 (확률 0% 등)
        if (!isPredictionValid(prediction)) {
          console.log(`⏭️ Invalid prediction: ${match.home_team} vs ${match.away_team}`)
          failed++
          continue
        }
        
        // 2. 팀 스탯 + H2H
        const [homeStats, awayStats, h2h] = await Promise.all([
          fetchTeamStats(match.home_team, match.league_code),
          fetchTeamStats(match.away_team, match.league_code),
          fetchH2H(match),
        ])
        
        // 3. 데이터 충분성 검증
        if (!hasEnoughData(homeStats, awayStats, match.league_code)) {
          console.log(`⏭️ Insufficient data: ${match.home_team} vs ${match.away_team} (${match.league_code})`)
          noData++
          continue
        }
        
        // 3.5. 시즌 성적 이상치 감지 (0승 18패 같은 비정상)
        if (isSeasonStatsAbnormal(homeStats, awayStats)) {
          console.log(`⏭️ Abnormal season stats: ${match.home_team} vs ${match.away_team} — skipping`)
          noData++
          continue
        }
        
        // 4. AI 섹션 생성 (실패 시 null → 기존 템플릿)
        const homeKo = getTeamNameKo(match.home_team)
        const awayKo = getTeamNameKo(match.away_team)
        const seasonCtx = detectSeasonContext(match.league_code, homeStats, awayStats)
        let ai: AISections | null = null
        try {
          ai = await generateAISections(match, prediction, homeStats, awayStats, h2h, leagueInfo, homeKo, awayKo)
          if (ai) console.log(`🤖 AI: ${match.home_team} vs ${match.away_team} [${seasonCtx.phaseKo}]`)
        } catch (e) {
          console.log(`⚠️ AI fallback: ${match.home_team} vs ${match.away_team}`)
        }
        
        // 5. 콘텐츠 생성
        const contentKo = generateContentKo(match, prediction, homeStats, awayStats, h2h, leagueInfo, ai)
        const contentEn = generateContentEn(match, prediction, homeStats, awayStats, h2h, leagueInfo, ai)
        
        // 5. 썸네일 URL
        const thumbnailUrl = generateThumbnailUrl(match, prediction, leagueInfo)
        
        const tags = generateTags(match, leagueInfo)
        const maxProb = Math.max(
          Math.round(prediction.finalProb.home * 100),
          Math.round(prediction.finalProb.draw * 100),
          Math.round(prediction.finalProb.away * 100),
        )
        
        // 6. DB INSERT — 제목 다양화, excerpt에 예측 노출 안 함
        const titleKr = generateTitleKr(homeKo, awayKo, leagueInfo, seasonCtx, homeStats, awayStats)
        const titleEn = generateTitleEn(match.home_team, match.away_team, leagueInfo, seasonCtx, homeStats, awayStats)
        const excerptKr = generateExcerptKr(homeKo, awayKo, leagueInfo, seasonCtx)
        const excerptEn = generateExcerptEn(match.home_team, match.away_team, leagueInfo, seasonCtx)
        
        const { error: insertError } = await supabase
          .from('blog_posts')
          .insert({
            slug,
            title: titleEn,
            title_kr: titleKr,
            excerpt: excerptKr,
            excerpt_en: excerptEn,
            content: contentKo,
            content_en: contentEn,
            category: 'preview',
            tags,
            thumbnail_url: thumbnailUrl,
            cover_image: thumbnailUrl,
            published: true,
            published_en: true,
            published_at: new Date().toISOString(),
          })
        
        if (insertError) {
          console.error(`❌ Insert error ${slug}:`, insertError)
          failed++
          continue
        }
        
        console.log(`✅ Generated: ${slug} [${prediction.recommendation.grade}]`)
        generated++
        existingSlugs.add(slug)
        
        results.push({
          slug,
          match: `${match.home_team} vs ${match.away_team}`,
          league: match.league_code,
          grade: prediction.recommendation.grade,
          pick: prediction.recommendation.pick,
          thumbnail: thumbnailUrl,
        })
        
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (e) {
        console.error(`❌ Error: ${match.home_team} vs ${match.away_team}:`, e)
        failed++
      }
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    
    return NextResponse.json({
      success: true,
      summary: {
        total: upcomingMatches.length,
        supported: supportedMatches.length,
        generated,
        skipped,
        noData,
        failed,
        elapsed: `${elapsed}s`,
      },
      results,
    })
    
  } catch (error) {
    return NextResponse.json({ error: 'Auto blog generation failed', details: String(error) }, { status: 500 })
  }
}

// ============================================
// POST: 특정 경기 수동 생성
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId } = body
    
    if (!matchId) return NextResponse.json({ error: 'matchId required' }, { status: 400 })
    
    const { data: match, error } = await supabase
      .from('match_odds_latest')
      .select('*')
      .eq('match_id', matchId)
      .single()
    
    if (error || !match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    
    const leagueInfo = LEAGUE_INFO[match.league_code]
    if (!leagueInfo) return NextResponse.json({ error: `Unsupported league: ${match.league_code}` }, { status: 400 })
    
    const prediction = await fetchPrediction(match)
    if (!prediction) return NextResponse.json({ error: 'Prediction failed' }, { status: 500 })
    
    if (!isPredictionValid(prediction)) {
      return NextResponse.json({ error: 'Prediction data invalid (all probabilities 0%)' }, { status: 422 })
    }
    
    const [homeStats, awayStats, h2h] = await Promise.all([
      fetchTeamStats(match.home_team, match.league_code),
      fetchTeamStats(match.away_team, match.league_code),
      fetchH2H(match),
    ])
    
    if (!hasEnoughData(homeStats, awayStats, match.league_code)) {
      return NextResponse.json({ error: 'Insufficient team data for blog generation' }, { status: 422 })
    }
    
    if (isSeasonStatsAbnormal(homeStats, awayStats)) {
      return NextResponse.json({ error: 'Abnormal season stats detected (likely data error)' }, { status: 422 })
    }
    
    const homeKo = getTeamNameKo(match.home_team)
    const awayKo = getTeamNameKo(match.away_team)
    const slug = generateSlug(match.home_team, match.away_team, match.league_code, match.commence_time)
    
    let ai: AISections | null = null
    try { ai = await generateAISections(match, prediction, homeStats, awayStats, h2h, leagueInfo, homeKo, awayKo) } catch (e) {}
    
    const seasonCtx = detectSeasonContext(match.league_code, homeStats, awayStats)
    const contentKo = generateContentKo(match, prediction, homeStats, awayStats, h2h, leagueInfo, ai)
    const contentEn = generateContentEn(match, prediction, homeStats, awayStats, h2h, leagueInfo, ai)
    const thumbnailUrl = generateThumbnailUrl(match, prediction, leagueInfo)
    const tags = generateTags(match, leagueInfo)
    
    const titleKr = generateTitleKr(homeKo, awayKo, leagueInfo, seasonCtx, homeStats, awayStats)
    const titleEn = generateTitleEn(match.home_team, match.away_team, leagueInfo, seasonCtx, homeStats, awayStats)
    const excerptKr = generateExcerptKr(homeKo, awayKo, leagueInfo, seasonCtx)
    const excerptEn = generateExcerptEn(match.home_team, match.away_team, leagueInfo, seasonCtx)
    
    const { error: upsertError } = await supabase
      .from('blog_posts')
      .upsert({
        slug,
        title: titleEn,
        title_kr: titleKr,
        excerpt: excerptKr,
        excerpt_en: excerptEn,
        content: contentKo,
        content_en: contentEn,
        category: 'preview',
        tags,
        thumbnail_url: thumbnailUrl,
        cover_image: thumbnailUrl,
        published: true,
        published_en: true,
        published_at: new Date().toISOString(),
      }, { onConflict: 'slug' })
    
    if (upsertError) return NextResponse.json({ error: 'Insert failed', details: upsertError }, { status: 500 })
    
    return NextResponse.json({
      success: true,
      slug,
      thumbnail: thumbnailUrl,
      preview: {
        titleKr,
        titleEn,
        seasonPhase: seasonCtx.phaseKo,
        grade: prediction.recommendation.grade,
        contentLength: { ko: contentKo.length, en: contentEn.length },
      }
    })
    
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}