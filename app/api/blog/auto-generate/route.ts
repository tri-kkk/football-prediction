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
  'CL':  { nameKo: '챔피언스리그', nameEn: 'Champions League', tagKo: '챔피언스리그', tagEn: 'ChampionsLeague', apiLeagueId: 2, leagueLogo: 'https://media.api-sports.io/football/leagues/2.png' },
  'EL':  { nameKo: '유로파리그', nameEn: 'Europa League', tagKo: '유로파리그', tagEn: 'EuropaLeague', apiLeagueId: 3, leagueLogo: 'https://media.api-sports.io/football/leagues/3.png' },
  'KL1': { nameKo: 'K리그1', nameEn: 'K League 1', tagKo: 'K리그', tagEn: 'KLeague', apiLeagueId: 292, leagueLogo: 'https://media.api-sports.io/football/leagues/292.png' },
  'KL2': { nameKo: 'K리그2', nameEn: 'K League 2', tagKo: 'K리그', tagEn: 'KLeague', apiLeagueId: 293, leagueLogo: 'https://media.api-sports.io/football/leagues/293.png' },
  'J1':  { nameKo: 'J리그', nameEn: 'J1 League', tagKo: 'J리그', tagEn: 'JLeague', apiLeagueId: 98, leagueLogo: 'https://media.api-sports.io/football/leagues/98.png' },
  'J2':  { nameKo: 'J2리그', nameEn: 'J2 League', tagKo: 'J리그', tagEn: 'JLeague', apiLeagueId: 99, leagueLogo: 'https://media.api-sports.io/football/leagues/99.png' },
}

// 지원 리그 코드 Set (빠른 조회)
const SUPPORTED_LEAGUES = new Set(Object.keys(LEAGUE_INFO))

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
}

function getTeamNameKo(name: string): string {
  return TEAM_NAME_KO[name] || name
}

// ============================================
// Claude API — AI 섹션 생성 (인트로+전술+승부처)
// ============================================
interface AISections {
  introKo: string; introEn: string
  tacticalKo: string; tacticalEn: string
  keyFactorsKo: string; keyFactorsEn: string
}

async function generateAISections(
  match: any, pred: any, hS: any, aS: any,
  h2h: any, li: any, hKo: string, aKo: string,
): Promise<AISections | null> {
  if (!ANTHROPIC_API_KEY) return null
  try {
    const d = new Date(match.commence_time)
    const dateStr = `${d.getMonth()+1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
    const pickKo = pred.recommendation.pick === 'HOME' ? '홈승' : pred.recommendation.pick === 'AWAY' ? '원정승' : '무승부'
    const maxP = Math.max(Math.round(pred.finalProb.home*100), Math.round(pred.finalProb.draw*100), Math.round(pred.finalProb.away*100))
    const pDiff = Math.abs((pred.homePower||0) - (pred.awayPower||0))
    const fm = (s: any) => { const r = s?.recentForm?.last5?.results || []; return `${r.filter((x:string)=>x==='W').length}승 ${r.filter((x:string)=>x==='D').length}무 ${r.filter((x:string)=>x==='L').length}패` }
    const sk = (s: any) => { const k = s?.recentForm?.currentStreak; if (!k || k.count < 2) return ''; return k.type === 'W' ? `${k.count}연승` : k.type === 'L' ? `${k.count}연패` : '' }
    const avg = (a: any[], f: string) => a?.length > 0 ? (a.reduce((s:number,m:any) => s+(m[f]||0), 0) / a.length).toFixed(1) : '?'
    const hR = hS?.homeStats, aR = aS?.awayStats
    const hM = hS?.recentMatches?.slice(0,10) || [], aM = aS?.recentMatches?.slice(0,10) || []
    const h2hSum = h2h?.overall ? `통산 ${h2h.overall.totalMatches}경기: ${hKo} ${h2h.overall.homeWins}승 / 무 ${h2h.overall.draws} / ${aKo} ${h2h.overall.awayWins}승` : '상대전적 없음'

    const prompt = `당신은 축구 분석 블로그 전문 작가입니다. 아래 데이터를 바탕으로 3개 섹션을 한글과 영어로 작성하세요.

## 경기 정보
- ${hKo}(${match.home_team}) vs ${aKo}(${match.away_team})
- ${li.nameKo} (${li.nameEn}), ${dateStr} (한국시간)
- AI 예측: ${pickKo} (${maxP}%), 등급: ${pred.recommendation.grade}
- 배당: ${match.home_odds} / ${match.draw_odds} / ${match.away_odds}
- 파워지수: ${hKo} ${pred.homePower||'?'} vs ${aKo} ${pred.awayPower||'?'} (차이: ${pDiff}점)

## 양팀 현황
- ${hKo} 최근: ${fm(hS)} ${sk(hS)?'('+sk(hS)+')':''}
- ${aKo} 최근: ${fm(aS)} ${sk(aS)?'('+sk(aS)+')':''}
- ${hKo} 홈: ${hR ? `${hR.wins}승 ${hR.draws}무 ${hR.losses}패 (${hR.winRate}%)` : '?'}
- ${aKo} 원정: ${aR ? `${aR.wins}승 ${aR.draws}무 ${aR.losses}패 (${aR.winRate}%)` : '?'}
- 평균득점: ${hKo} ${avg(hM,'goalsFor')} vs ${aKo} ${avg(aM,'goalsFor')}
- 평균실점: ${hKo} ${avg(hM,'goalsAgainst')} vs ${aKo} ${avg(aM,'goalsAgainst')}

## 강점/약점
${hKo} 강점: ${(hS?.strengths||[]).slice(0,3).join(', ')||'없음'}
${hKo} 약점: ${(hS?.weaknesses||[]).slice(0,2).join(', ')||'없음'}
${aKo} 강점: ${(aS?.strengths||[]).slice(0,3).join(', ')||'없음'}
${aKo} 약점: ${(aS?.weaknesses||[]).slice(0,2).join(', ')||'없음'}

## 예측 근거
${(pred.recommendation.reasons||[]).slice(0,4).join('\n')}

## 상대전적
${h2hSum}

---
## 작성 규칙
1. **인트로**: 3-4문장. 경기의 흥미 포인트와 관전 포인트. "~예정되어 있다" 금지. 구어체 혼용(~거든요, ~인데요). 경기 날짜/시간 자연스럽게 포함.
2. **전술 포인트**: 양팀 강점/약점 기반 전술 맞대결 4-6문장. 단순 나열 금지, 경기 맥락에서 해석.
3. **승부처**: 예측 근거 기반 3포인트, 각 2-3문장. 데이터를 자연스러운 분석으로.
4. 금지: "살펴보겠습니다", "주목할 만합니다", "분석해보겠습니다", "~할 것으로 보입니다"
5. 한글/영어 독립 작성 (번역X)

## 출력 형식 (정확히 이 태그)
<intro_ko>(한글 인트로)</intro_ko>
<intro_en>(영어 인트로)</intro_en>
<tactical_ko>(한글 전술 분석)</tactical_ko>
<tactical_en>(영어 전술 분석)</tactical_en>
<keyfactors_ko>(한글 승부처 **1. 제목** 형식 3개)</keyfactors_ko>
<keyfactors_en>(영어 Key Factors **1. Title** 형식 3개)</keyfactors_en>`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) { console.error('Claude API error:', res.status); return null }
    const txt = (await res.json()).content?.[0]?.text || ''
    const ex = (tag: string) => { const m = txt.match(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`)); return m ? m[1].trim() : '' }
    const sections: AISections = { introKo: ex('intro_ko'), introEn: ex('intro_en'), tacticalKo: ex('tactical_ko'), tacticalEn: ex('tactical_en'), keyFactorsKo: ex('keyfactors_ko'), keyFactorsEn: ex('keyfactors_en') }
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
function hasEnoughData(homeStats: any, awayStats: any): boolean {
  // 최소 조건: 양팀 모두 최근 폼 데이터가 있어야 함
  const homeForm = homeStats?.recentForm?.last5?.results
  const awayForm = awayStats?.recentForm?.last5?.results
  
  // 최근 5경기 결과가 최소 3개 이상 있어야 함
  if (!homeForm || homeForm.length < 3) return false
  if (!awayForm || awayForm.length < 3) return false
  
  // 최근 10경기 데이터 확인
  const homeLast10 = homeStats?.recentForm?.last10
  const awayLast10 = awayStats?.recentForm?.last10
  
  if (!homeLast10 || (homeLast10.wins + homeLast10.draws + homeLast10.losses) === 0) return false
  if (!awayLast10 || (awayLast10.wins + awayLast10.draws + awayLast10.losses) === 0) return false
  
  return true
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
        season: '2025',
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

function generateSlug(homeTeam: string, awayTeam: string, leagueCode: string): string {
  const home = homeTeam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const away = awayTeam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const league = (LEAGUE_INFO[leagueCode]?.nameEn || leagueCode).toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${home}-vs-${away}-${league}-preview-${date}`
}

function formatFormEmoji(results: string[]): string {
  return results.map(r => r === 'W' ? '✅' : r === 'D' ? '🟡' : '❌').join('')
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
  return grade === 'PICK' ? '🔥 강추' : grade === 'GOOD' ? '👍 추천' : '⛔ 비추'
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
  const matchDate = new Date(match.commence_time)
  const dateStr = `${matchDate.getMonth() + 1}월 ${matchDate.getDate()}일`
  const timeStr = `${matchDate.getHours().toString().padStart(2, '0')}:${matchDate.getMinutes().toString().padStart(2, '0')}`
  
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
  c += `## 📊 양팀 최근 폼\n\n`
  
  if (homeStats?.recentForm) {
    const f5 = homeStats.recentForm.last5?.results || []
    const l10 = homeStats.recentForm.last10
    c += `### ${homeKo}\n\n`
    c += `${formatFormEmoji(f5)} **${formatFormText(f5)}**\n\n`
    if (l10) {
      c += `| 항목 | 수치 |\n|:---|:---|\n`
      c += `| 최근 10경기 | **${l10.wins}승 ${l10.draws}무 ${l10.losses}패** |\n`
      c += `| 득점 / 실점 | **${l10.goalsFor}골** / **${l10.goalsAgainst}실점** |\n`
      const streak = homeStats.recentForm.currentStreak
      if (streak && streak.count >= 2) {
        c += `| 연속 | ${streak.type === 'W' ? `🔥 **${streak.count}연승**` : streak.type === 'L' ? `⚠️ **${streak.count}연패**` : `**${streak.count}연속 무승부**`} |\n`
      }
      c += '\n'
    }
  }
  
  if (awayStats?.recentForm) {
    const f5 = awayStats.recentForm.last5?.results || []
    const l10 = awayStats.recentForm.last10
    c += `### ${awayKo}\n\n`
    c += `${formatFormEmoji(f5)} **${formatFormText(f5)}**\n\n`
    if (l10) {
      c += `| 항목 | 수치 |\n|:---|:---|\n`
      c += `| 최근 10경기 | **${l10.wins}승 ${l10.draws}무 ${l10.losses}패** |\n`
      c += `| 득점 / 실점 | **${l10.goalsFor}골** / **${l10.goalsAgainst}실점** |\n`
      const streak = awayStats.recentForm.currentStreak
      if (streak && streak.count >= 2) {
        c += `| 연속 | ${streak.type === 'W' ? `🔥 **${streak.count}연승**` : streak.type === 'L' ? `⚠️ **${streak.count}연패**` : `**${streak.count}연속 무승부**`} |\n`
      }
      c += '\n'
    }
  }
  
  // ===== 🏆 시즌 성적 =====
  const homeRel = homeStats?.homeStats
  const awayRel = awayStats?.awayStats
  
  if (homeRel && awayRel) {
    c += `## 🏆 ${leagueInfo.nameKo} 시즌 성적\n\n`
    c += `| | ${homeKo} (홈) | ${awayKo} (원정) |\n|:---|:---:|:---:|\n`
    c += `| 승-무-패 | **${homeRel.wins}-${homeRel.draws}-${homeRel.losses}** | **${awayRel.wins}-${awayRel.draws}-${awayRel.losses}** |\n`
    c += `| 승률 | **${homeRel.winRate}%** | **${awayRel.winRate}%** |\n\n`
  } else if (homeRel || awayRel) {
    c += `## 🏆 ${leagueInfo.nameKo} 시즌 성적\n\n`
    if (homeRel) c += `**${homeKo} (홈)**: ${homeRel.wins}승 ${homeRel.draws}무 ${homeRel.losses}패 (승률 **${homeRel.winRate}%**)\n\n`
    if (awayRel) c += `**${awayKo} (원정)**: ${awayRel.wins}승 ${awayRel.draws}무 ${awayRel.losses}패 (승률 **${awayRel.winRate}%**)\n\n`
  }
  
  // ===== 📈 핵심 스탯 비교 =====
  if (homeStats?.recentMatches?.length > 0 && awayStats?.recentMatches?.length > 0) {
    c += `## 📈 핵심 스탯 비교\n\n`
    
    const hL10 = homeStats.recentMatches.slice(0, 10)
    const aL10 = awayStats.recentMatches.slice(0, 10)
    
    const hGF = (hL10.reduce((s: number, m: any) => s + m.goalsFor, 0) / hL10.length).toFixed(1)
    const hGA = (hL10.reduce((s: number, m: any) => s + m.goalsAgainst, 0) / hL10.length).toFixed(1)
    const aGF = (aL10.reduce((s: number, m: any) => s + m.goalsFor, 0) / aL10.length).toFixed(1)
    const aGA = (aL10.reduce((s: number, m: any) => s + m.goalsAgainst, 0) / aL10.length).toFixed(1)
    
    c += `> 최근 10경기 평균 기준\n\n`
    c += `| 지표 | ${homeKo} | ${awayKo} |\n|:---|:---:|:---:|\n`
    c += `| ⚽ 경기당 득점 | **${hGF}** | **${aGF}** |\n`
    c += `| 🛡️ 경기당 실점 | **${hGA}** | **${aGA}** |\n`
    
    if (homeStats.markets && awayStats.markets) {
      c += `| 📊 오버 2.5 | **${homeStats.markets.over25Rate}%** | **${awayStats.markets.over25Rate}%** |\n`
      c += `| 🎯 양팀득점(BTTS) | **${homeStats.markets.bttsRate}%** | **${awayStats.markets.bttsRate}%** |\n`
      c += `| 🧤 클린시트 | **${homeStats.markets.cleanSheetRate}%** | **${awayStats.markets.cleanSheetRate}%** |\n`
    }
    c += '\n'
  }
  
  // ===== ⚔️ 상대 전적 =====
  if (h2h?.overall) {
    c += `## ⚔️ 상대 전적\n\n`
    c += `| ${homeKo} 승 | 무승부 | ${awayKo} 승 | 총 경기 |\n|:---:|:---:|:---:|:---:|\n`
    c += `| **${h2h.overall.homeWins}** | **${h2h.overall.draws}** | **${h2h.overall.awayWins}** | ${h2h.overall.totalMatches} |\n\n`
    
    if (h2h.recentMatches?.length > 0) {
      c += `**최근 맞대결**\n\n`
      h2h.recentMatches.slice(0, 3).forEach((m: any) => {
        const icon = m.result === 'W' ? '🔵' : m.result === 'L' ? '🔴' : '⚪'
        c += `${icon} **${m.homeScore} - ${m.awayScore}**\n\n`
      })
    }
    
    if (h2h.insights?.length > 0) {
      c += `> 💡 ${h2h.insights[0]}\n\n`
    }
  }
  
  // ===== 🎯 전술 포인트 (AI 또는 템플릿) =====
  if (ai?.tacticalKo) {
    c += `## 🎯 전술 포인트\n\n`
    c += ai.tacticalKo + '\n\n'
  } else {
    const hasStrengths = homeStats?.strengths?.length > 0 || awayStats?.strengths?.length > 0
    const hasWeaknesses = homeStats?.weaknesses?.length > 0 || awayStats?.weaknesses?.length > 0
  
    if (hasStrengths || hasWeaknesses) {
      c += `## 🎯 전술 포인트\n\n`
      if (homeStats?.strengths?.length > 0) {
        c += `### ${homeKo}의 강점\n`
        homeStats.strengths.slice(0, 3).forEach((s: string) => { c += `- ${s}\n` })
        c += '\n'
      }
      if (homeStats?.weaknesses?.length > 0) {
        c += `### ${homeKo}의 약점\n`
        homeStats.weaknesses.slice(0, 2).forEach((w: string) => { c += `- ${w}\n` })
        c += '\n'
      }
      if (awayStats?.strengths?.length > 0) {
        c += `### ${awayKo}의 강점\n`
        awayStats.strengths.slice(0, 3).forEach((s: string) => { c += `- ${s}\n` })
        c += '\n'
      }
      if (awayStats?.weaknesses?.length > 0) {
        c += `### ${awayKo}의 약점\n`
        awayStats.weaknesses.slice(0, 2).forEach((w: string) => { c += `- ${w}\n` })
        c += '\n'
      }
    }
  }
  
  // ===== 💡 승부처 (AI 또는 템플릿) =====
  if (ai?.keyFactorsKo) {
    c += `## 💡 승부처\n\n`
    c += ai.keyFactorsKo + '\n\n'
  } else if (prediction.recommendation.reasons?.length > 0) {
    c += `## 💡 승부처\n\n`
    prediction.recommendation.reasons.slice(0, 3).forEach((reason: string, i: number) => {
      c += `**${i + 1}. ${translateReason(reason)}**\n\n`
    })
  }
  
  // ===== 📈 TrendSoccer 예측 =====
  c += `## 📈 TrendSoccer 예측\n\n`
  c += `| | 확률 |\n|:---|:---|\n`
  c += `| ${homeKo} | ${generateProbBar('', homePct)} |\n`
  c += `| 무승부 | ${generateProbBar('', drawPct)} |\n`
  c += `| ${awayKo} | ${generateProbBar('', awayPct)} |\n\n`
  
  c += `| 항목 | 분석 |\n|:---|:---|\n`
  c += `| 🎯 예측 | **${getPickKo(prediction.recommendation.pick)}** |\n`
  c += `| ⭐ 등급 | **${getGradeKo(prediction.recommendation.grade)}** |\n`
  c += `| 💰 배당 | ${match.home_odds} / ${match.draw_odds} / ${match.away_odds} |\n`
  if (prediction.homePower && prediction.awayPower) {
    c += `| ⚡ 파워 지수 | ${homeKo} **${prediction.homePower}** vs ${awayKo} **${prediction.awayPower}** |\n`
  }
  if (prediction.patternStats) {
    c += `| 📊 패턴 | ${prediction.pattern} (${prediction.patternStats.totalMatches}경기 기반) |\n`
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
  const matchDate = new Date(match.commence_time)
  const dateStr = matchDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  
  const homePct = Math.round(prediction.finalProb.home * 100)
  const drawPct = Math.round(prediction.finalProb.draw * 100)
  const awayPct = Math.round(prediction.finalProb.away * 100)
  
  let c = ''
  
  c += `# ${home} vs ${away}: ${leagueInfo.nameEn} Match Preview\n\n`
  if (ai?.introEn) {
    c += ai.introEn + '\n\n'
  } else {
    c += `${home} host ${away} in ${leagueInfo.nameEn} action on ${dateStr}. `
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
  c += `## 📊 Recent Form\n\n`
  if (homeStats?.recentForm) {
    const f5 = homeStats.recentForm.last5?.results || []
    const l10 = homeStats.recentForm.last10
    c += `### ${home}\n\n`
    c += `${formatFormEmoji(f5)} **${formatFormTextEn(f5)}**\n\n`
    if (l10) {
      c += `| Stat | Value |\n|:---|:---|\n`
      c += `| Last 10 | **${l10.wins}W ${l10.draws}D ${l10.losses}L** |\n`
      c += `| Goals / Conceded | **${l10.goalsFor}** / **${l10.goalsAgainst}** |\n`
      const streak = homeStats.recentForm.currentStreak
      if (streak && streak.count >= 2) {
        c += `| Streak | ${streak.type === 'W' ? `🔥 **${streak.count}-game win streak**` : streak.type === 'L' ? `⚠️ **${streak.count}-game losing run**` : `**${streak.count} draws**`} |\n`
      }
      c += '\n'
    }
  }
  if (awayStats?.recentForm) {
    const f5 = awayStats.recentForm.last5?.results || []
    const l10 = awayStats.recentForm.last10
    c += `### ${away}\n\n`
    c += `${formatFormEmoji(f5)} **${formatFormTextEn(f5)}**\n\n`
    if (l10) {
      c += `| Stat | Value |\n|:---|:---|\n`
      c += `| Last 10 | **${l10.wins}W ${l10.draws}D ${l10.losses}L** |\n`
      c += `| Goals / Conceded | **${l10.goalsFor}** / **${l10.goalsAgainst}** |\n`
      const streak = awayStats.recentForm.currentStreak
      if (streak && streak.count >= 2) {
        c += `| Streak | ${streak.type === 'W' ? `🔥 **${streak.count}-game win streak**` : streak.type === 'L' ? `⚠️ **${streak.count}-game losing run**` : `**${streak.count} draws**`} |\n`
      }
      c += '\n'
    }
  }
  
  // Season Record
  const homeRelEn = homeStats?.homeStats
  const awayRelEn = awayStats?.awayStats
  if (homeRelEn && awayRelEn) {
    c += `## 🏆 ${leagueInfo.nameEn} Season Record\n\n`
    c += `| | ${home} (Home) | ${away} (Away) |\n|:---|:---:|:---:|\n`
    c += `| W-D-L | **${homeRelEn.wins}-${homeRelEn.draws}-${homeRelEn.losses}** | **${awayRelEn.wins}-${awayRelEn.draws}-${awayRelEn.losses}** |\n`
    c += `| Win Rate | **${homeRelEn.winRate}%** | **${awayRelEn.winRate}%** |\n\n`
  } else if (homeRelEn || awayRelEn) {
    c += `## 🏆 ${leagueInfo.nameEn} Season Record\n\n`
    if (homeRelEn) c += `**${home} (Home)**: ${homeRelEn.wins}W ${homeRelEn.draws}D ${homeRelEn.losses}L (**${homeRelEn.winRate}%** win rate)\n\n`
    if (awayRelEn) c += `**${away} (Away)**: ${awayRelEn.wins}W ${awayRelEn.draws}D ${awayRelEn.losses}L (**${awayRelEn.winRate}%** win rate)\n\n`
  }
  
  // Key Stats
  if (homeStats?.recentMatches?.length > 0 && awayStats?.recentMatches?.length > 0) {
    c += `## 📈 Key Stats\n\n`
    const hL10 = homeStats.recentMatches.slice(0, 10)
    const aL10 = awayStats.recentMatches.slice(0, 10)
    const hGF = (hL10.reduce((s: number, m: any) => s + m.goalsFor, 0) / hL10.length).toFixed(1)
    const hGA = (hL10.reduce((s: number, m: any) => s + m.goalsAgainst, 0) / hL10.length).toFixed(1)
    const aGF = (aL10.reduce((s: number, m: any) => s + m.goalsFor, 0) / aL10.length).toFixed(1)
    const aGA = (aL10.reduce((s: number, m: any) => s + m.goalsAgainst, 0) / aL10.length).toFixed(1)
    
    c += `> Based on last 10 matches\n\n`
    c += `| Metric | ${home} | ${away} |\n|:---|:---:|:---:|\n`
    c += `| ⚽ Goals/Game | **${hGF}** | **${aGF}** |\n`
    c += `| 🛡️ Conceded/Game | **${hGA}** | **${aGA}** |\n`
    
    if (homeStats.markets && awayStats.markets) {
      c += `| 📊 Over 2.5 | **${homeStats.markets.over25Rate}%** | **${awayStats.markets.over25Rate}%** |\n`
      c += `| 🎯 BTTS | **${homeStats.markets.bttsRate}%** | **${awayStats.markets.bttsRate}%** |\n`
      c += `| 🧤 Clean Sheet | **${homeStats.markets.cleanSheetRate}%** | **${awayStats.markets.cleanSheetRate}%** |\n`
    }
    c += '\n'
  }
  
  // H2H
  if (h2h?.overall) {
    c += `## ⚔️ Head-to-Head\n\n`
    c += `| ${home} Wins | Draws | ${away} Wins | Total |\n|:---:|:---:|:---:|:---:|\n`
    c += `| **${h2h.overall.homeWins}** | **${h2h.overall.draws}** | **${h2h.overall.awayWins}** | ${h2h.overall.totalMatches} |\n\n`
    if (h2h.recentMatches?.length > 0) {
      c += `**Recent Meetings**\n\n`
      h2h.recentMatches.slice(0, 3).forEach((m: any) => {
        const icon = m.result === 'W' ? '🔵' : m.result === 'L' ? '🔴' : '⚪'
        c += `${icon} **${m.homeScore} - ${m.awayScore}**\n\n`
      })
    }
    if (h2h.insights?.length > 0) c += `> 💡 ${h2h.insights[0]}\n\n`
  }
  
  // Tactical (AI or template)
  if (ai?.tacticalEn) {
    c += `## 🎯 Tactical Points\n\n`
    c += ai.tacticalEn + '\n\n'
  } else if (homeStats?.strengths?.length > 0 || awayStats?.strengths?.length > 0) {
    c += `## 🎯 Tactical Points\n\n`
    if (homeStats?.strengths?.length > 0) { c += `### ${home} Strengths\n`; homeStats.strengths.slice(0, 3).forEach((s: string) => { c += `- ${s}\n` }); c += '\n' }
    if (homeStats?.weaknesses?.length > 0) { c += `### ${home} Weaknesses\n`; homeStats.weaknesses.slice(0, 2).forEach((w: string) => { c += `- ${w}\n` }); c += '\n' }
    if (awayStats?.strengths?.length > 0) { c += `### ${away} Strengths\n`; awayStats.strengths.slice(0, 3).forEach((s: string) => { c += `- ${s}\n` }); c += '\n' }
    if (awayStats?.weaknesses?.length > 0) { c += `### ${away} Weaknesses\n`; awayStats.weaknesses.slice(0, 2).forEach((w: string) => { c += `- ${w}\n` }); c += '\n' }
  }
  
  // Key Factors (AI or template)
  if (ai?.keyFactorsEn) {
    c += `## 💡 Key Factors\n\n`
    c += ai.keyFactorsEn + '\n\n'
  } else if (prediction.recommendation.reasons?.length > 0) {
    c += `## 💡 Key Factors\n\n`
    prediction.recommendation.reasons.slice(0, 3).forEach((reason: string, i: number) => {
      c += `**${i + 1}. ${reason}**\n\n`
    })
  }
  
  // Prediction
  c += `## 📈 TrendSoccer Prediction\n\n`
  c += `| | Probability |\n|:---|:---|\n`
  c += `| ${home} | ${generateProbBar('', homePct)} |\n`
  c += `| Draw | ${generateProbBar('', drawPct)} |\n`
  c += `| ${away} | ${generateProbBar('', awayPct)} |\n\n`
  
  c += `| Detail | Analysis |\n|:---|:---|\n`
  c += `| 🎯 Prediction | **${getPickEn(prediction.recommendation.pick)}** |\n`
  c += `| ⭐ Grade | **${prediction.recommendation.grade}** |\n`
  c += `| 💰 Odds | ${match.home_odds} / ${match.draw_odds} / ${match.away_odds} |\n`
  if (prediction.homePower && prediction.awayPower) {
    c += `| ⚡ Power Index | ${home} **${prediction.homePower}** vs ${away} **${prediction.awayPower}** |\n`
  }
  if (prediction.patternStats) {
    c += `| 📊 Pattern | ${prediction.pattern} (${prediction.patternStats.totalMatches} matches) |\n`
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
    
    for (const match of supportedMatches) {
      const leagueInfo = LEAGUE_INFO[match.league_code]
      const slug = generateSlug(match.home_team, match.away_team, match.league_code)
      
      if (existingSlugs.has(slug)) { skipped++; continue }
      
      try {
        // 1. 예측 데이터
        const prediction = await fetchPrediction(match)
        if (!prediction) { failed++; continue }
        
        // 2. 팀 스탯 + H2H
        const [homeStats, awayStats, h2h] = await Promise.all([
          fetchTeamStats(match.home_team, match.league_code),
          fetchTeamStats(match.away_team, match.league_code),
          fetchH2H(match),
        ])
        
        // 3. 데이터 충분성 검증
        if (!hasEnoughData(homeStats, awayStats)) {
          console.log(`⏭️ Insufficient data: ${match.home_team} vs ${match.away_team} (${match.league_code})`)
          noData++
          continue
        }
        
        // 4. AI 섹션 생성 (실패 시 null → 기존 템플릿)
        const homeKo = getTeamNameKo(match.home_team)
        const awayKo = getTeamNameKo(match.away_team)
        let ai: AISections | null = null
        try {
          ai = await generateAISections(match, prediction, homeStats, awayStats, h2h, leagueInfo, homeKo, awayKo)
          if (ai) console.log(`🤖 AI: ${match.home_team} vs ${match.away_team}`)
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
        
        // 6. DB INSERT
        const { error: insertError } = await supabase
          .from('blog_posts')
          .insert({
            slug,
            title: `${match.home_team} vs ${match.away_team}: ${leagueInfo.nameEn} Match Preview & Prediction`,
            title_kr: `${homeKo} vs ${awayKo}: ${leagueInfo.nameKo} 매치 프리뷰 및 예측`,
            excerpt: `${homeKo}와 ${awayKo}의 ${leagueInfo.nameKo} 대결 분석. AI 예측: ${getPickKo(prediction.recommendation.pick)} (${maxProb}%)`,
            excerpt_en: `${match.home_team} vs ${match.away_team} ${leagueInfo.nameEn} analysis. AI Prediction: ${getPickEn(prediction.recommendation.pick)} (${maxProb}%)`,
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
    
    const [homeStats, awayStats, h2h] = await Promise.all([
      fetchTeamStats(match.home_team, match.league_code),
      fetchTeamStats(match.away_team, match.league_code),
      fetchH2H(match),
    ])
    
    if (!hasEnoughData(homeStats, awayStats)) {
      return NextResponse.json({ error: 'Insufficient team data for blog generation' }, { status: 422 })
    }
    
    const homeKo = getTeamNameKo(match.home_team)
    const awayKo = getTeamNameKo(match.away_team)
    const slug = generateSlug(match.home_team, match.away_team, match.league_code)
    
    let ai: AISections | null = null
    try { ai = await generateAISections(match, prediction, homeStats, awayStats, h2h, leagueInfo, homeKo, awayKo) } catch (e) {}
    
    const contentKo = generateContentKo(match, prediction, homeStats, awayStats, h2h, leagueInfo, ai)
    const contentEn = generateContentEn(match, prediction, homeStats, awayStats, h2h, leagueInfo, ai)
    const thumbnailUrl = generateThumbnailUrl(match, prediction, leagueInfo)
    const tags = generateTags(match, leagueInfo)
    const maxProb = Math.max(
      Math.round(prediction.finalProb.home * 100),
      Math.round(prediction.finalProb.draw * 100),
      Math.round(prediction.finalProb.away * 100),
    )
    
    const { error: upsertError } = await supabase
      .from('blog_posts')
      .upsert({
        slug,
        title: `${match.home_team} vs ${match.away_team}: ${leagueInfo.nameEn} Match Preview & Prediction`,
        title_kr: `${homeKo} vs ${awayKo}: ${leagueInfo.nameKo} 매치 프리뷰 및 예측`,
        excerpt: `${homeKo}와 ${awayKo}의 ${leagueInfo.nameKo} 대결 분석. AI 예측: ${getPickKo(prediction.recommendation.pick)} (${maxProb}%)`,
        excerpt_en: `${match.home_team} vs ${match.away_team} analysis. AI: ${getPickEn(prediction.recommendation.pick)} (${maxProb}%)`,
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
        titleKr: `${homeKo} vs ${awayKo}: ${leagueInfo.nameKo} 매치 프리뷰 및 예측`,
        grade: prediction.recommendation.grade,
        pick: prediction.recommendation.pick,
        contentLength: { ko: contentKo.length, en: contentEn.length },
      }
    })
    
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}