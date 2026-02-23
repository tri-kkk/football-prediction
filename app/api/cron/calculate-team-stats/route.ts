// app/api/cron/calculate-team-stats/route.ts
// fg_match_history → fg_team_stats 집계 API
// 팀별 선제골 승률, 폼 지수 등 계산
// K리그/J리그 한글 팀명 지원

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================
// 팀명 한글 매핑
// ============================================
const TEAM_NAME_KO: Record<string, string> = {
  // K리그1 팀
  'Ulsan Hyundai': '울산 HD',
  'Ulsan HD': '울산 HD',
  'Ulsan Hyundai FC': '울산 HD',
  'Jeonbuk Hyundai Motors': '전북 현대',
  'Jeonbuk Motors': '전북 현대',
  'Jeonbuk FC': '전북 현대',
  'Pohang Steelers': '포항 스틸러스',
  'Incheon United': '인천 유나이티드',
  'Daegu FC': '대구 FC',
  'Gangwon FC': '강원 FC',
  'Suwon FC': '수원 FC',
  'Suwon Samsung Bluewings': '수원 삼성',
  'Suwon Bluewings': '수원 삼성',
  'Gimcheon Sangmu': '김천 상무',
  'Gimcheon Sangmu FC': '김천 상무',
  'Daejeon Citizen': '대전 시티즌',
  'Daejeon Hana Citizen': '대전 하나 시티즌',
  'FC Seoul': 'FC 서울',
  'Seoul': 'FC 서울',
  'Jeju United': '제주 유나이티드',
  'Jeju United FC': '제주 유나이티드',
  'Gwangju FC': '광주 FC',
  'Suwon City': '수원 FC',
  'Suwon City FC': '수원 FC',
  'Seongnam FC': '성남 FC',
  'Seongnam': '성남 FC',
  'Sangju Sangmu': '상주 상무',
  'Sangju Sangmu FC': '상주 상무',
  'Busan IPark': '부산 아이파크',
  'Busan I\'Park': '부산 아이파크',
  'Busan I Park': '부산 아이파크',
  'Jeonnam Dragons': '전남 드래곤즈',
  'Gyeongnam FC': '경남 FC',
  'Cheongju FC': '청주 FC',
  'Ansan Greeners': '안산 그리너스',
  'Seoul E-Land': '서울 이랜드',
  'Seoul E-Land FC': '서울 이랜드',
  'Bucheon FC 1995': '부천 FC',
  'Bucheon FC': '부천 FC',
  'Chungnam Asan': '충남 아산',
  'Asan Mugunghwa': '아산 무궁화',
  'Anyang FC': '안양 FC',
  'FC Anyang': '안양 FC',
  'Jeonbuk Hyundai Motors FC': '전북 현대',
  'Suwon Samsung': '수원 삼성',
  'Gimpo Citizen': '김포 시티즌',
  'Gimpo FC': '김포 시티즌',
  
  // J1리그 팀
  'Vissel Kobe': '비셀 고베',
  'Yokohama F. Marinos': '요코하마 F 마리노스',
  'Yokohama F.Marinos': '요코하마 F 마리노스',
  'Yokohama Marinos': '요코하마 F 마리노스',
  'Kashima Antlers': '가시마 앤틀러스',
  'Sanfrecce Hiroshima': '산프레체 히로시마',
  'Kawasaki Frontale': '가와사키 프론탈레',
  'Urawa Red Diamonds': '우라와 레즈',
  'Urawa Reds': '우라와 레즈',
  'Urawa': '우라와 레즈',
  'Kashima': '가시마 앤틀러스',
  'Cerezo Osaka': '세레소 오사카',
  'Gamba Osaka': '감바 오사카',
  'FC Tokyo': 'FC 도쿄',
  'Tokyo': 'FC 도쿄',
  'Nagoya Grampus': '나고야 그램퍼스',
  'Consadole Sapporo': '콘사돌레 삿포로',
  'Hokkaido Consadole Sapporo': '콘사돌레 삿포로',
  'Sagan Tosu': '사간 도스',
  'Avispa Fukuoka': '아비스파 후쿠오카',
  'Albirex Niigata': '알비렉스 니가타',
  'Shonan Bellmare': '쇼난 벨마레',
  'Kashiwa Reysol': '가시와 레이솔',
  'Jubilo Iwata': '주빌로 이와타',
  'Shimizu S-Pulse': '시미즈 에스펄스',
  'Shimizu S Pulse': '시미즈 에스펄스',
  'Kyoto Sanga': '교토 상가',
  'Kyoto Sanga FC': '교토 상가',
  'Tokushima Vortis': '도쿠시마 보르티스',
  'Ventforet Kofu': '벤트포레 고후',
  'Vegalta Sendai': '베갈타 센다이',
  'Montedio Yamagata': '몬테디오 야마가타',
  'Omiya Ardija': '오미야 아르디자',
  'Machida Zelvia': '마치다 젤비아',
  'FC Machida Zelvia': '마치다 젤비아',
  'Tokyo Verdy': '도쿄 베르디',
  'Tokyo Verdy 1969': '도쿄 베르디',
  'V-Varen Nagasaki': 'V-파렌 나가사키',
  'Oita Trinita': '오이타 트리니타',
  'Roasso Kumamoto': '로아소 구마모토',
  'Fagiano Okayama': '파지아노 오카야마',
  'Ehime FC': '에히메 FC',
  'Matsumoto Yamaga': '마츠모토 야마가',
  'Tochigi SC': '도치기 SC',
  'Zweigen Kanazawa': '츠에겐 가나자와',
  'Renofa Yamaguchi': '레노파 야마구치',
  'Blaublitz Akita': '블라우블리츠 아키타',
  'Mito Hollyhock': '미토 홀리혹',
  'JEF United': 'JEF 유나이티드',
  'JEF United Chiba': 'JEF 유나이티드',
  'Thespa Kusatsu': '테스파 구사츠',
  'Yokohama FC': '요코하마 FC',

  // MLS 팀
  'Atlanta United FC': '애틀랜타 유나이티드',
  'Atlanta United': '애틀랜타 유나이티드',
  'Austin FC': '오스틴 FC',
  'Austin': '오스틴 FC',
  'Charlotte FC': '샬럿 FC',
  'Charlotte': '샬럿 FC',
  'Chicago Fire FC': '시카고 파이어',
  'Chicago Fire': '시카고 파이어',
  'FC Cincinnati': 'FC 신시내티',
  'Cincinnati': 'FC 신시내티',
  'Colorado Rapids': '콜로라도 래피즈',
  'Columbus Crew': '콜럼버스 크루',
  'D.C. United': 'DC 유나이티드',
  'DC United': 'DC 유나이티드',
  'FC Dallas': 'FC 달라스',
  'Houston Dynamo FC': '휴스턴 다이나모',
  'Houston Dynamo': '휴스턴 다이나모',
  'Inter Miami CF': '인터 마이애미',
  'Inter Miami': '인터 마이애미',
  'LA Galaxy': 'LA 갤럭시',
  'Los Angeles FC': 'LAFC',
  'LAFC': 'LAFC',
  'Minnesota United FC': '미네소타 유나이티드',
  'Minnesota United': '미네소타 유나이티드',
  'CF Montréal': 'CF 몬트리올',
  'CF Montreal': 'CF 몬트리올',
  'Montreal Impact': 'CF 몬트리올',
  'Nashville SC': '내슈빌 SC',
  'New England Revolution': '뉴잉글랜드 레볼루션',
  'New York City FC': '뉴욕시티 FC',
  'New York Red Bulls': '뉴욕 레드불스',
  'Orlando City SC': '올랜도 시티',
  'Orlando City': '올랜도 시티',
  'Philadelphia Union': '필라델피아 유니온',
  'Portland Timbers': '포틀랜드 팀버스',
  'Real Salt Lake': '레알 솔트레이크',
  'San Jose Earthquakes': '산호세 어스퀘이크스',
  'Seattle Sounders FC': '시애틀 사운더스',
  'Seattle Sounders': '시애틀 사운더스',
  'Sporting Kansas City': '스포르팅 캔자스시티',
  'St. Louis City SC': '세인트루이스 시티',
  'St. Louis CITY SC': '세인트루이스 시티',
  'Toronto FC': '토론토 FC',
  'Vancouver Whitecaps': '밴쿠버 화이트캡스',
  'Vancouver Whitecaps FC': '밴쿠버 화이트캡스',
  'San Diego FC': '샌디에이고 FC',
}

// 팀명 한글 변환 함수
function getTeamNameKo(englishName: string): string {
  return TEAM_NAME_KO[englishName] || englishName
}

interface MatchData {
  fixture_id: number
  league_id: number
  league_code: string
  season: string
  match_date: string
  home_team_id: number
  home_team: string
  home_team_ko?: string
  away_team_id: number
  away_team: string
  away_team_ko?: string
  home_score: number
  away_score: number
  first_goal_team: string // 'home', 'away', 'none'
  result: string // 'HOME', 'DRAW', 'AWAY'
}

interface TeamStats {
  team_id: number
  team_name: string
  team_name_ko: string
  league_id: number
  league_code: string
  season: string
  
  // 전체
  total_played: number
  total_wins: number
  total_draws: number
  total_losses: number
  total_goals_for: number
  total_goals_against: number
  
  // 홈
  home_played: number
  home_wins: number
  home_draws: number
  home_losses: number
  home_goals_for: number
  home_goals_against: number
  
  // 원정
  away_played: number
  away_wins: number
  away_draws: number
  away_losses: number
  away_goals_for: number
  away_goals_against: number
  
  // 홈 선득점
  home_first_goal_games: number
  home_first_goal_wins: number
  home_first_goal_draws: number
  home_first_goal_losses: number
  home_first_goal_gf: number
  home_first_goal_ga: number
  
  // 홈 선실점
  home_concede_first_games: number
  home_concede_first_wins: number
  home_concede_first_draws: number
  home_concede_first_losses: number
  home_concede_first_gf: number
  home_concede_first_ga: number
  
  // 원정 선득점
  away_first_goal_games: number
  away_first_goal_wins: number
  away_first_goal_draws: number
  away_first_goal_losses: number
  away_first_goal_gf: number
  away_first_goal_ga: number
  
  // 원정 선실점
  away_concede_first_games: number
  away_concede_first_wins: number
  away_concede_first_draws: number
  away_concede_first_losses: number
  away_concede_first_gf: number
  away_concede_first_ga: number
  
  // 무득점
  home_scoreless_games: number
  away_scoreless_games: number
  
  // 폼
  form_last_12: number | null
  form_last_8: number | null
  form_last_5: number | null
  form_home_5: number | null
  form_away_5: number | null
  
  // 메타
  last_match_date: string | null
}

// 빈 통계 객체 생성
function createEmptyStats(
  teamId: number,
  teamName: string,
  leagueId: number,
  leagueCode: string,
  season: string
): TeamStats {
  return {
    team_id: teamId,
    team_name: teamName,
    team_name_ko: getTeamNameKo(teamName),
    league_id: leagueId,
    league_code: leagueCode,
    season: season,
    
    total_played: 0,
    total_wins: 0,
    total_draws: 0,
    total_losses: 0,
    total_goals_for: 0,
    total_goals_against: 0,
    
    home_played: 0,
    home_wins: 0,
    home_draws: 0,
    home_losses: 0,
    home_goals_for: 0,
    home_goals_against: 0,
    
    away_played: 0,
    away_wins: 0,
    away_draws: 0,
    away_losses: 0,
    away_goals_for: 0,
    away_goals_against: 0,
    
    home_first_goal_games: 0,
    home_first_goal_wins: 0,
    home_first_goal_draws: 0,
    home_first_goal_losses: 0,
    home_first_goal_gf: 0,
    home_first_goal_ga: 0,
    
    home_concede_first_games: 0,
    home_concede_first_wins: 0,
    home_concede_first_draws: 0,
    home_concede_first_losses: 0,
    home_concede_first_gf: 0,
    home_concede_first_ga: 0,
    
    away_first_goal_games: 0,
    away_first_goal_wins: 0,
    away_first_goal_draws: 0,
    away_first_goal_losses: 0,
    away_first_goal_gf: 0,
    away_first_goal_ga: 0,
    
    away_concede_first_games: 0,
    away_concede_first_wins: 0,
    away_concede_first_draws: 0,
    away_concede_first_losses: 0,
    away_concede_first_gf: 0,
    away_concede_first_ga: 0,
    
    home_scoreless_games: 0,
    away_scoreless_games: 0,
    
    form_last_12: null,
    form_last_8: null,
    form_last_5: null,
    form_home_5: null,
    form_away_5: null,
    
    last_match_date: null,
  }
}

// 폼 계산 (최근 N경기)
function calculateForm(results: string[], n: number): number | null {
  const recent = results.slice(-n)
  if (recent.length === 0) return null
  
  const points = recent.reduce((sum, r) => {
    if (r === 'W') return sum + 3
    if (r === 'D') return sum + 1
    return sum
  }, 0)
  
  return Math.round((points / recent.length) * 100) / 100
}

// ✅ 모든 경기 데이터 가져오기 (페이지네이션)
async function fetchAllMatches(
  leagueId: number | null = null,
  season: string | null = null
): Promise<MatchData[]> {
  const allMatches: MatchData[] = []
  const pageSize = 1000
  let offset = 0
  let hasMore = true
  
  while (hasMore) {
    let query = supabase
      .from('fg_match_history')
      .select('*')
      .order('match_date', { ascending: true })
      .range(offset, offset + pageSize - 1)
    
    if (leagueId) query = query.eq('league_id', leagueId)
    if (season) query = query.eq('season', season)
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching matches:', error)
      break
    }
    
    if (data && data.length > 0) {
      allMatches.push(...(data as MatchData[]))
      offset += pageSize
      hasMore = data.length === pageSize
      console.log(`  Fetched ${allMatches.length} matches...`)
    } else {
      hasMore = false
    }
  }
  
  return allMatches
}

// 팀 통계 계산
async function calculateTeamStats(
  leagueId: number | null = null,
  season: string | null = null
): Promise<{ teams: number; updated: number; errors: number }> {
  
  // ✅ 페이지네이션으로 모든 경기 데이터 조회
  console.log(`📊 Fetching all matches...`)
  const matches = await fetchAllMatches(leagueId, season)
  
  if (matches.length === 0) {
    console.error('No matches found')
    return { teams: 0, updated: 0, errors: 1 }
  }
  
  console.log(`📊 Processing ${matches.length} matches...`)
  
  // 팀별 통계 집계
  const teamStatsMap: Map<string, TeamStats> = new Map()
  const teamResults: Map<string, string[]> = new Map() // 전체 결과
  const teamHomeResults: Map<string, string[]> = new Map() // 홈 결과
  const teamAwayResults: Map<string, string[]> = new Map() // 원정 결과
  
  for (const match of matches) {
    const homeKey = `${match.home_team_id}-${match.league_id}-${match.season}`
    const awayKey = `${match.away_team_id}-${match.league_id}-${match.season}`
    
    // 홈팀 통계 초기화
    if (!teamStatsMap.has(homeKey)) {
      teamStatsMap.set(homeKey, createEmptyStats(
        match.home_team_id,
        match.home_team,
        match.league_id,
        match.league_code,
        match.season
      ))
      teamResults.set(homeKey, [])
      teamHomeResults.set(homeKey, [])
      teamAwayResults.set(homeKey, [])
    }
    
    // 원정팀 통계 초기화
    if (!teamStatsMap.has(awayKey)) {
      teamStatsMap.set(awayKey, createEmptyStats(
        match.away_team_id,
        match.away_team,
        match.league_id,
        match.league_code,
        match.season
      ))
      teamResults.set(awayKey, [])
      teamHomeResults.set(awayKey, [])
      teamAwayResults.set(awayKey, [])
    }
    
    const homeStats = teamStatsMap.get(homeKey)!
    const awayStats = teamStatsMap.get(awayKey)!
    
    const homeScore = match.home_score ?? 0
    const awayScore = match.away_score ?? 0
    const firstGoal = match.first_goal_team
    const result = match.result
    
    // ============ 홈팀 통계 ============
    homeStats.total_played++
    homeStats.home_played++
    homeStats.total_goals_for += homeScore
    homeStats.total_goals_against += awayScore
    homeStats.home_goals_for += homeScore
    homeStats.home_goals_against += awayScore
    homeStats.last_match_date = match.match_date
    
    // 홈팀 결과
    if (result === 'HOME') {
      homeStats.total_wins++
      homeStats.home_wins++
      teamResults.get(homeKey)!.push('W')
      teamHomeResults.get(homeKey)!.push('W')
    } else if (result === 'DRAW') {
      homeStats.total_draws++
      homeStats.home_draws++
      teamResults.get(homeKey)!.push('D')
      teamHomeResults.get(homeKey)!.push('D')
    } else {
      homeStats.total_losses++
      homeStats.home_losses++
      teamResults.get(homeKey)!.push('L')
      teamHomeResults.get(homeKey)!.push('L')
    }
    
    // 홈팀 선제골 분석
    if (firstGoal === 'home') {
      // 홈에서 선득점
      homeStats.home_first_goal_games++
      homeStats.home_first_goal_gf += homeScore
      homeStats.home_first_goal_ga += awayScore
      if (result === 'HOME') homeStats.home_first_goal_wins++
      else if (result === 'DRAW') homeStats.home_first_goal_draws++
      else homeStats.home_first_goal_losses++
    } else if (firstGoal === 'away') {
      // 홈에서 선실점
      homeStats.home_concede_first_games++
      homeStats.home_concede_first_gf += homeScore
      homeStats.home_concede_first_ga += awayScore
      if (result === 'HOME') homeStats.home_concede_first_wins++
      else if (result === 'DRAW') homeStats.home_concede_first_draws++
      else homeStats.home_concede_first_losses++
    } else if (firstGoal === 'none') {
      // 무득점 경기
      homeStats.home_scoreless_games++
    }
    
    // ============ 원정팀 통계 ============
    awayStats.total_played++
    awayStats.away_played++
    awayStats.total_goals_for += awayScore
    awayStats.total_goals_against += homeScore
    awayStats.away_goals_for += awayScore
    awayStats.away_goals_against += homeScore
    awayStats.last_match_date = match.match_date
    
    // 원정팀 결과
    if (result === 'AWAY') {
      awayStats.total_wins++
      awayStats.away_wins++
      teamResults.get(awayKey)!.push('W')
      teamAwayResults.get(awayKey)!.push('W')
    } else if (result === 'DRAW') {
      awayStats.total_draws++
      awayStats.away_draws++
      teamResults.get(awayKey)!.push('D')
      teamAwayResults.get(awayKey)!.push('D')
    } else {
      awayStats.total_losses++
      awayStats.away_losses++
      teamResults.get(awayKey)!.push('L')
      teamAwayResults.get(awayKey)!.push('L')
    }
    
    // 원정팀 선제골 분석
    if (firstGoal === 'away') {
      // 원정에서 선득점
      awayStats.away_first_goal_games++
      awayStats.away_first_goal_gf += awayScore
      awayStats.away_first_goal_ga += homeScore
      if (result === 'AWAY') awayStats.away_first_goal_wins++
      else if (result === 'DRAW') awayStats.away_first_goal_draws++
      else awayStats.away_first_goal_losses++
    } else if (firstGoal === 'home') {
      // 원정에서 선실점
      awayStats.away_concede_first_games++
      awayStats.away_concede_first_gf += awayScore
      awayStats.away_concede_first_ga += homeScore
      if (result === 'AWAY') awayStats.away_concede_first_wins++
      else if (result === 'DRAW') awayStats.away_concede_first_draws++
      else awayStats.away_concede_first_losses++
    } else if (firstGoal === 'none') {
      // 무득점 경기
      awayStats.away_scoreless_games++
    }
  }
  
  // 폼 지수 계산
  for (const [key, stats] of teamStatsMap) {
    const allResults = teamResults.get(key) || []
    const homeResults = teamHomeResults.get(key) || []
    const awayResults = teamAwayResults.get(key) || []
    
    stats.form_last_12 = calculateForm(allResults, 12)
    stats.form_last_8 = calculateForm(allResults, 8)
    stats.form_last_5 = calculateForm(allResults, 5)
    stats.form_home_5 = calculateForm(homeResults, 5)
    stats.form_away_5 = calculateForm(awayResults, 5)
  }
  
  // DB 저장 (upsert)
  let updated = 0
  let errors = 0
  
  console.log(`💾 Saving ${teamStatsMap.size} teams to DB...`)
  
  for (const [key, stats] of teamStatsMap) {
    // 기존 승격팀 정보 유지
    const { data: existing } = await supabase
      .from('fg_team_stats')
      .select('is_promoted, promotion_factor')
      .eq('team_id', stats.team_id)
      .eq('league_id', stats.league_id)
      .eq('season', stats.season)
      .single()
    
    const upsertData = {
      ...stats,
      is_promoted: existing?.is_promoted || false,
      promotion_factor: existing?.promotion_factor || 1.0,
      updated_at: new Date().toISOString(),
    }
    
    const { error } = await supabase
      .from('fg_team_stats')
      .upsert(upsertData, {
        onConflict: 'team_id,league_id,season',
      })
    
    if (error) {
      console.error(`Error upserting ${stats.team_name}:`, error.message)
      errors++
    } else {
      updated++
    }
  }
  
  console.log(`✅ Updated ${updated} teams, ${errors} errors`)
  
  return { teams: teamStatsMap.size, updated, errors }
}

// GET: 상태 확인
export async function GET(request: NextRequest) {
  const { count } = await supabase
    .from('fg_team_stats')
    .select('*', { count: 'exact', head: true })
  
  const { data: sample } = await supabase
    .from('fg_team_stats')
    .select('team_name, team_name_ko, league_code, season, total_played, home_first_goal_games, home_first_goal_wins')
    .order('total_played', { ascending: false })
    .limit(10)
  
  // 리그별 팀 수
  const { data: byLeague } = await supabase
    .from('fg_team_stats')
    .select('league_code')
  
  const leagueCounts: Record<string, number> = {}
  byLeague?.forEach((row: any) => {
    leagueCounts[row.league_code] = (leagueCounts[row.league_code] || 0) + 1
  })
  
  return NextResponse.json({
    status: 'ready',
    totalTeams: count || 0,
    byLeague: leagueCounts,
    sample,
    usage: {
      calculateAll: 'POST { "mode": "all" }',
      calculateLeague: 'POST { "mode": "league", "leagueId": 39 }',
      calculateKLeague: 'POST { "mode": "league", "leagueId": 292 }',
      calculateJLeague: 'POST { "mode": "league", "leagueId": 98 }',
      calculateSeason: 'POST { "mode": "season", "season": "2025" }',
    },
    leagues: {
      europe: [
        { id: 39, code: 'PL', name: 'Premier League' },
        { id: 140, code: 'PD', name: 'La Liga' },
        { id: 78, code: 'BL1', name: 'Bundesliga' },
        { id: 135, code: 'SA', name: 'Serie A' },
        { id: 61, code: 'FL1', name: 'Ligue 1' },
        { id: 88, code: 'DED', name: 'Eredivisie' },
      ],
      asia: [
        { id: 292, code: 'K1', name: 'K League 1' },
        { id: 98, code: 'J1', name: 'J1 League' },
      ],
      americas: [
        { id: 253, code: 'MLS', name: 'Major League Soccer' },
      ]
    }
  })
}

// POST: 통계 계산 실행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, leagueId, season } = body
    
    const startTime = Date.now()
    let result: { teams: number; updated: number; errors: number }
    
    if (mode === 'all') {
      result = await calculateTeamStats()
    } else if (mode === 'league' && leagueId) {
      result = await calculateTeamStats(leagueId, null)
    } else if (mode === 'season' && season) {
      result = await calculateTeamStats(null, season)
    } else {
      return NextResponse.json({
        error: 'Invalid mode',
        examples: {
          all: { mode: 'all' },
          league: { mode: 'league', leagueId: 39 },
          kleague: { mode: 'league', leagueId: 292 },
          jleague: { mode: 'league', leagueId: 98 },
          season: { mode: 'season', season: '2025' },
        }
      }, { status: 400 })
    }
    
    const duration = Math.round((Date.now() - startTime) / 1000)
    
    return NextResponse.json({
      success: true,
      mode,
      ...result,
      duration: `${duration}s`,
    })
    
  } catch (error: any) {
    console.error('Calculate error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}