// POST /api/admin/blog/baseball-generate
// 야구 경기 데이터 → Claude API → 네이버 블로그용 HTML 콘텐츠 생성
// v2: SEO/AdSense 친화적 다양화 (제목 풀, 동적 태그, 4가지 섹션 패턴, 4가지 컬러 테마)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const CLAUDE_MODEL = 'claude-sonnet-4-6'

// ═══════════════════════════════════════
// 다양화 유틸
// ═══════════════════════════════════════
function hashCode(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0
  return Math.abs(h)
}

function pickByHash<T>(arr: T[], seed: string, offset: number = 0): T {
  return arr[(hashCode(seed) + offset) % arr.length]
}

function sampleByHash<T>(arr: T[], seed: string, n: number): T[] {
  const h = hashCode(seed)
  const result: T[] = []
  const used = new Set<number>()
  for (let i = 0; i < n && used.size < arr.length; i++) {
    let idx = (h + i * 31) % arr.length
    while (used.has(idx)) idx = (idx + 1) % arr.length
    used.add(idx)
    result.push(arr[idx])
  }
  return result
}

function isHomeWin(game: any, homeTeamEn: string): boolean {
  if (game.home_team === homeTeamEn) {
    return game.home_score > game.away_score
  }
  return game.away_score > game.home_score
}

// ═══════════════════════════════════════
// 제목 템플릿 풀 (확장: fallback 14개 + 시그널 기반 추가)
// ═══════════════════════════════════════
function generateTitle(data: any, seed: string): string {
  // 시드에 팀명도 포함하여 같은 날짜 매치들이 다른 결과 내도록
  const richSeed = seed + '-' + (data.homeTeamEn || '') + '-' + (data.awayTeamEn || '')

  const homeTeam = data.homeTeam
  const awayTeam = data.awayTeam
  const league = data.league
  const matchDate = data.matchDate
  const pitcher = data.pitcher
  const odds = data.odds
  const h2h = data.h2h
  const homeRecent = data.homeRecent
  const awayRecent = data.awayRecent
  const homeP = pitcher.home.name
  const awayP = pitcher.away.name
  const homeEra = pitcher.home.era
  const awayEra = pitcher.away.era
  const homeProb = odds && odds.home_win_prob
  const awayProb = odds && odds.away_win_prob
  const homeOdds = odds && odds.home_win_odds
  const awayOdds = odds && odds.away_win_odds
  const dateMD = matchDate.slice(5).replace('-', '월') + '일'

  // 최근 5경기 폼 계산
  const calcForm = (games: any[], teamEn: string) => {
    if (!games || !games.length) return { w: 0, l: 0, streak: '' }
    let w = 0
    let l = 0
    const slice = games.slice(0, 5)
    for (let i = 0; i < slice.length; i++) {
      if (isHomeWin(slice[i], teamEn)) {
        w++
      } else {
        l++
      }
    }
    return { w: w, l: l, streak: w + '승' + l + '패' }
  }
  const homeForm = calcForm(homeRecent, data.homeTeamEn)
  const awayForm = calcForm(awayRecent, data.awayTeamEn)

  const hasOdds = !!odds
  const hasPitcherEra = homeEra != null && awayEra != null
  const isClose = hasOdds && Math.abs((homeProb || 50) - (awayProb || 50)) < 15
  const isPitcherDuel = hasPitcherEra && homeEra < 3.5 && awayEra < 3.5
  const isHomeFavorite = hasOdds && (homeProb || 0) > 60
  const isAwayFavorite = hasOdds && (awayProb || 0) > 60
  const hasH2h = h2h && h2h.length >= 3
  const isWinStreak = homeForm.w >= 4 || awayForm.w >= 4

  const candidates: string[] = []

  if (isPitcherDuel) {
    candidates.push(homeP + '-' + awayP + ' ERA ' + homeEra + '-' + awayEra + ' 선발 대결, ' + homeTeam + ' vs ' + awayTeam + ' 분석')
    candidates.push(dateMD + ' ' + league + ' 에이스 매치업 ' + homeP + ' vs ' + awayP + ', 승부 가를 변수는')
  }
  if (hasPitcherEra) {
    candidates.push(homeTeam + ' ' + homeP + '(ERA ' + homeEra + '), ' + awayTeam + ' 타선 잡을 수 있을까')
  }

  if (isWinStreak) {
    const hotTeam = homeForm.w >= awayForm.w ? homeTeam : awayTeam
    const coldTeam = homeForm.w >= awayForm.w ? awayTeam : homeTeam
    const wins = Math.max(homeForm.w, awayForm.w)
    candidates.push(hotTeam + ' 최근 ' + wins + '경기 ' + wins + '승, ' + coldTeam + '전에서 흐름 이어갈까')
  }
  candidates.push(homeTeam + '(최근 ' + homeForm.streak + ') vs ' + awayTeam + '(' + awayForm.streak + '), ' + dateMD + ' 승부처 분석')

  if (isClose) {
    candidates.push('AI 승률 ' + homeProb + '% vs ' + awayProb + '%, ' + homeTeam + ' vs ' + awayTeam + ' 박빙 승부 예측')
  }
  if (isHomeFavorite) {
    candidates.push(homeTeam + ' 우세 (배당 ' + (homeOdds ? homeOdds.toFixed(2) : '-') + '), ' + awayTeam + ' 이변 가능성은')
  }
  if (isAwayFavorite) {
    candidates.push('원정 ' + awayTeam + '(' + (awayOdds ? awayOdds.toFixed(2) : '-') + ') 강세 전망, ' + homeTeam + ' 홈 이점 통할까')
  }

  if (hasH2h) {
    let homeWins = 0
    let awayWins = 0
    h2h.slice(0, 5).forEach((g: any) => {
      if (isHomeWin(g, data.homeTeamEn)) {
        homeWins++
      } else {
        awayWins++
      }
    })
    candidates.push(homeTeam + ' vs ' + awayTeam + ' 최근 상대전적 ' + homeWins + '승 ' + awayWins + '패, ' + dateMD + ' 결과는')
  }

  // ── 일반/대체 템플릿 (시그널 없어도 항상 다양한 14개)
  candidates.push(dateMD + ' ' + league + ' ' + homeTeam + ' vs ' + awayTeam + ' 프리뷰 | 선발·전적·승률 분석')
  candidates.push(homeTeam + ' vs ' + awayTeam + ', ' + dateMD + ' ' + league + ' 경기 핵심 포인트 3가지')
  candidates.push(dateMD + ' ' + league + ' ' + homeTeam + '-' + awayTeam + ' 매치업, 데이터로 본 승부 예상')
  candidates.push(homeTeam + ' ' + awayTeam + ' ' + dateMD + ' 경기 전망, 양 팀 전력 비교 분석')
  candidates.push(homeTeam + ' vs ' + awayTeam + ' 한판 승부, ' + dateMD + ' ' + league + ' 관전 포인트')
  candidates.push(dateMD + ' ' + league + ', ' + homeTeam + '의 ' + awayTeam + ' 사냥 가능할까')
  candidates.push('홈 ' + homeTeam + ' vs 원정 ' + awayTeam + ', ' + dateMD + ' ' + league + ' 경기 미리보기')
  candidates.push(awayTeam + ', ' + homeTeam + ' 안방서 잠재울 수 있을까 (' + dateMD + ' ' + league + ')')
  candidates.push(dateMD + ' ' + league + ' 빅매치 ' + homeTeam + ' vs ' + awayTeam + ', 누구 손 들어주나')
  candidates.push(homeTeam + ' ' + awayTeam + ' ' + dateMD + ' 맞대결, 승리 공식 파헤치기')
  candidates.push(dateMD + ' ' + league + ' 주목할 경기, ' + homeTeam + '-' + awayTeam + ' 분석 리포트')
  candidates.push(homeTeam + ' vs ' + awayTeam + ' ' + dateMD + ' 한경기, 결과 좌우할 3가지 변수')
  candidates.push(dateMD + ' ' + homeTeam + '-' + awayTeam + ' ' + league + ' 승부 갈림길은 어디')
  candidates.push(homeTeam + ' vs ' + awayTeam + ', ' + dateMD + ' ' + league + ' 데이터로 본 승률 예측')

  // 깨진 템플릿 필터 (빈 streak 등 텍스트가 정상이 아닌 것 제거)
  const validCandidates = candidates.filter(c =>
    !c.includes('(최근 )') &&
    !c.includes('()') &&
    !c.includes('ERA undefined') &&
    !c.includes('ERA null') &&
    c.length > 10
  )

  return pickByHash(validCandidates.length > 0 ? validCandidates : candidates, richSeed)
}

// ═══════════════════════════════════════
// 동적 태그 생성
// ═══════════════════════════════════════
function generateTags(data: any, seed: string): string[] {
  const tags: string[] = []
  const cleanName = (s: string) => s.replace(/\s+/g, '')

  tags.push(cleanName(data.homeTeam))
  tags.push(cleanName(data.awayTeam))
  tags.push(data.league)

  const dyn: string[] = []
  if (data.pitcher.home.era != null && data.pitcher.home.era < 3.0) {
    dyn.push(cleanName(data.pitcher.home.name))
  }
  if (data.pitcher.away.era != null && data.pitcher.away.era < 3.0) {
    dyn.push(cleanName(data.pitcher.away.name))
  }
  if (data.odds && (data.odds.home_win_prob > 60 || data.odds.away_win_prob > 60)) {
    dyn.push('우세경기')
  }
  if (data.odds && Math.abs((data.odds.home_win_prob || 50) - (data.odds.away_win_prob || 50)) < 10) {
    dyn.push('박빙승부')
  }
  if (data.h2h && data.h2h.length >= 3) {
    dyn.push('상대전적')
  }

  const month = parseInt(data.matchDate.slice(5, 7))
  dyn.push(month + '월야구')

  const pool = [
    '프로야구', '야구프리뷰', '경기예측', '스포츠분석', '베이스볼',
    '선발투수', '야구승부예측', '오늘의경기', '야구분석', 'MLB분석',
    'KBO분석', 'NPB분석', '야구중계', '경기전망',
  ]
  const leagueSpecific = pool.filter(t => {
    const isLeagueTag = t.indexOf('MLB') >= 0 || t.indexOf('KBO') >= 0 || t.indexOf('NPB') >= 0
    if (!isLeagueTag) return true
    return t.indexOf(data.league) >= 0
  })
  const sampled = sampleByHash(leagueSpecific, seed, 3)

  return tags.concat(dyn).concat(sampled).slice(0, 10)
}

// ═══════════════════════════════════════
// 컬러 테마 4가지
// ═══════════════════════════════════════
const COLOR_THEMES = [
  { primary: '#d63031', secondary: '#0984e3', bg: '#faf8f3', text: '#2d3436', accentBg: '#fff5f5', accentBg2: '#f0f8ff' },
  { primary: '#e17055', secondary: '#00b894', bg: '#f8fafc', text: '#1e293b', accentBg: '#fff7ed', accentBg2: '#ecfdf5' },
  { primary: '#6c5ce7', secondary: '#fdcb6e', bg: '#fff5e6', text: '#27272a', accentBg: '#f3f0ff', accentBg2: '#fefce8' },
  { primary: '#fd79a8', secondary: '#0984e3', bg: '#f0f4f8', text: '#1f2937', accentBg: '#fdf2f8', accentBg2: '#eff6ff' },
]

// ═══════════════════════════════════════
// 섹션 패턴 4가지
// ═══════════════════════════════════════
const SECTION_PATTERNS = [
  {
    id: 'A',
    sections: [
      { key: 'preview', title: '매치 프리뷰', icon: '⚾', focus: '양 팀 최근 폼과 승률 흐름을 짚어주세요. 어느 팀이 상승세인지, 어떤 분위기로 경기에 임하는지 자연스럽게 풀어주세요.' },
      { key: 'pitcher', title: '선발 투수 매치업', icon: '🏏', focus: '선발 투수의 핵심 지표(ERA, WHIP, K)를 비교 분석하고 누가 더 우위인지 설명해주세요.' },
      { key: 'lineup', title: '팀 전력 분석', icon: '📊', focus: '시즌 스탯을 기반으로 타선의 강약과 핵심 변수를 짚어주세요.' },
      { key: 'forecast', title: 'AI 경기 분석', icon: '🎯', focus: 'AI 승률과 배당을 종합한 최종 분석. 단정짓지 말고 가능성 위주로.' },
    ],
  },
  {
    id: 'B',
    sections: [
      { key: 'season', title: '시즌 흐름과 분위기', icon: '📈', focus: '두 팀의 시즌 흐름, 최근 트렌드, 주요 변화 요소를 짚어주세요.' },
      { key: 'h2h', title: '상대 전적 점검', icon: '⚔️', focus: '두 팀 간 상대 전적을 점검하고 패턴을 찾아주세요.' },
      { key: 'pitcher', title: '선발 투수 맞대결', icon: '🎯', focus: '오늘 선발의 최근 등판과 핵심 지표를 비교해주세요.' },
      { key: 'outlook', title: '경기 전망', icon: '🔮', focus: 'AI 분석과 데이터를 종합한 전망. 변수도 함께 언급.' },
    ],
  },
  {
    id: 'C',
    sections: [
      { key: 'keypoints', title: '오늘 경기의 핵심 포인트', icon: '🔥', focus: '경기를 좌우할 핵심 포인트 3가지를 짚어주세요. 각 포인트마다 데이터 근거 포함.' },
      { key: 'pitchers', title: '선발 매치업 분석', icon: '⚡', focus: '선발 투수의 강점과 약점, 상대 타선 대응법을 분석해주세요.' },
      { key: 'edge', title: '승부 갈림길', icon: '⚖️', focus: '어느 팀이 어떤 부분에서 우위인지, 그리고 그 우위가 결정적인지 풀어주세요.' },
      { key: 'pick', title: '데이터 기반 예측', icon: '🧠', focus: 'AI 승률·배당·시즌 스탯을 종합한 결론. 확정적 표현 피하기.' },
    ],
  },
  {
    id: 'D',
    sections: [
      { key: 'home_strength', title: '{HOME}의 강점', icon: '🏠', focus: '홈팀의 강점과 이번 경기에서 발휘될 만한 무기를 짚어주세요.' },
      { key: 'away_strength', title: '{AWAY}의 무기', icon: '✈️', focus: '원정팀의 강점, 원정 성적, 이변 가능성을 풀어주세요.' },
      { key: 'matchup', title: '핵심 매치업', icon: '🥊', focus: '선발 투수 매치업과 핵심 타자 대결을 분석해주세요.' },
      { key: 'verdict', title: '최종 예측', icon: '🎯', focus: 'AI 분석을 바탕으로 한 최종 결론. 가능성 중심으로.' },
    ],
  },
]

// ═══════════════════════════════════════
// POST: 블로그 생성
// ═══════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const { match_id } = await req.json()
    if (!match_id) {
      return NextResponse.json({ success: false, error: 'match_id 필수' }, { status: 400 })
    }

    const matchData = await collectMatchData(String(match_id))
    if (!matchData) {
      return NextResponse.json({ success: false, error: '경기를 찾을 수 없습니다' }, { status: 404 })
    }

    const blogPost = await generateWithClaude(matchData)

    await supabase.from('baseball_blog_drafts').upsert({
      match_id: String(match_id),
      match_date: matchData.matchDate,
      league: matchData.league,
      title: blogPost.title,
      html_content: blogPost.htmlContent,
      tags: blogPost.tags,
      excerpt: blogPost.excerpt,
      created_at: new Date().toISOString(),
    }, { onConflict: 'match_id' })

    return NextResponse.json({ success: true, data: blogPost })
  } catch (err: any) {
    console.error('[baseball-generate] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════
// GET: 경기 목록 조회
// ═══════════════════════════════════════
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const targetDate = searchParams.get('date') || getTomorrowKST()
  const league = searchParams.get('league') || 'ALL'

  try {
    let query = supabase
      .from('baseball_matches')
      .select('id, api_match_id, home_team, away_team, home_team_ko, away_team_ko, league, match_date, match_time, status, home_pitcher, away_pitcher, home_pitcher_ko, away_pitcher_ko, home_pitcher_era, away_pitcher_era, home_pitcher_whip, away_pitcher_whip, home_pitcher_k, away_pitcher_k')
      .eq('match_date', targetDate)
      .not('status', 'in', '("POST","CANC","PST")')
      .order('league', { ascending: true })
      .order('match_time', { ascending: true })

    if (league !== 'ALL') {
      query = query.eq('league', league)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const grouped: Record<string, any[]> = {}
    ;(data || []).forEach(m => {
      if (!grouped[m.league]) grouped[m.league] = []
      grouped[m.league].push({
        ...m,
        match_id: String(m.api_match_id || m.id),
        display_name: (m.home_team_ko || m.home_team) + ' vs ' + (m.away_team_ko || m.away_team),
        pitcher_display: (m.home_pitcher_ko || m.home_pitcher || '미정') + ' vs ' + (m.away_pitcher_ko || m.away_pitcher || '미정'),
      })
    })

    const { data: savedBlogs } = await supabase
      .from('baseball_blog_drafts')
      .select('match_id, title, html_content, tags, excerpt')
      .eq('match_date', targetDate)

    const savedMap: Record<string, any> = {}
    ;(savedBlogs || []).forEach(b => {
      savedMap[b.match_id] = {
        matchId: b.match_id,
        title: b.title,
        htmlContent: b.html_content,
        tags: b.tags || [],
        excerpt: b.excerpt || '',
      }
    })

    return NextResponse.json({ success: true, data: { date: targetDate, grouped, total: data?.length || 0, savedBlogs: savedMap } })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════
// 데이터 수집
// ═══════════════════════════════════════
async function collectMatchData(matchId: string) {
  const { data: match } = await supabase
    .from('baseball_matches')
    .select('*')
    .or('api_match_id.eq.' + matchId + ',id.eq.' + matchId)
    .single()

  if (!match) return null

  const season = String(new Date(match.match_date).getFullYear())

  const [odds, homeSeason, awaySeason, homeRecent, awayRecent, h2h] = await Promise.all([
    supabase.from('baseball_odds_latest').select('*').eq('api_match_id', match.api_match_id || match.id).single().then(r => r.data),
    supabase.from('baseball_team_season_stats').select('*').eq('team_name', match.home_team).eq('league', match.league).eq('season', season).single().then(r => r.data),
    supabase.from('baseball_team_season_stats').select('*').eq('team_name', match.away_team).eq('league', match.league).eq('season', season).single().then(r => r.data),
    supabase.from('baseball_matches').select('home_team, away_team, home_team_ko, away_team_ko, home_score, away_score, match_date').or('home_team.eq.' + match.home_team + ',away_team.eq.' + match.home_team).lt('match_date', match.match_date).eq('status', 'FT').order('match_date', { ascending: false }).limit(10).then(r => r.data),
    supabase.from('baseball_matches').select('home_team, away_team, home_team_ko, away_team_ko, home_score, away_score, match_date').or('home_team.eq.' + match.away_team + ',away_team.eq.' + match.away_team).lt('match_date', match.match_date).eq('status', 'FT').order('match_date', { ascending: false }).limit(10).then(r => r.data),
    supabase.from('baseball_matches').select('home_team, away_team, home_team_ko, away_team_ko, home_score, away_score, match_date').or('and(home_team.eq.' + match.home_team + ',away_team.eq.' + match.away_team + '),and(home_team.eq.' + match.away_team + ',away_team.eq.' + match.home_team + ')').eq('status', 'FT').order('match_date', { ascending: false }).limit(10).then(r => r.data),
  ])

  let homePitcherStats = { era: match.home_pitcher_era, whip: match.home_pitcher_whip, k: match.home_pitcher_k }
  let awayPitcherStats = { era: match.away_pitcher_era, whip: match.away_pitcher_whip, k: match.away_pitcher_k }

  const needHomeFallback = homePitcherStats.era == null && homePitcherStats.whip == null
  const needAwayFallback = awayPitcherStats.era == null && awayPitcherStats.whip == null

  if (needHomeFallback || needAwayFallback) {
    if (match.league === 'MLB') {
      const fetchMlbPitcherStats = async (pitcherId: number | null) => {
        if (!pitcherId) return null
        try {
          const res = await fetch(
            'https://statsapi.mlb.com/api/v1/people/' + pitcherId + '?hydrate=stats(group=[pitching],type=[season],season=' + season + ')',
            { signal: AbortSignal.timeout(5000) }
          )
          const data = await res.json()
          const stat = data.people?.[0]?.stats?.[0]?.splits?.[0]?.stat
          if (!stat) return null
          return { era: parseFloat(stat.era) || null, whip: parseFloat(stat.whip) || null, k: stat.strikeOuts ?? null }
        } catch { return null }
      }
      const [homeP, awayP] = await Promise.all([
        needHomeFallback ? fetchMlbPitcherStats(match.home_pitcher_id) : null,
        needAwayFallback ? fetchMlbPitcherStats(match.away_pitcher_id) : null,
      ])
      if (homeP) homePitcherStats = homeP
      if (awayP) awayPitcherStats = awayP
    } else if (match.league === 'KBO' || match.league === 'NPB') {
      const pitcherTable = match.league === 'NPB' ? 'npb_pitcher_stats' : 'kbo_pitcher_stats'
      const [homeP, awayP] = await Promise.all([
        needHomeFallback && (match.home_pitcher_ko || match.home_pitcher)
          ? supabase.from(pitcherTable).select('era, whip, strikeouts').eq('season', season).ilike('name', (match.home_pitcher_ko || match.home_pitcher).trim()).maybeSingle().then(r => r.data)
          : null,
        needAwayFallback && (match.away_pitcher_ko || match.away_pitcher)
          ? supabase.from(pitcherTable).select('era, whip, strikeouts').eq('season', season).ilike('name', (match.away_pitcher_ko || match.away_pitcher).trim()).maybeSingle().then(r => r.data)
          : null,
      ])
      if (homeP) homePitcherStats = { era: homeP.era, whip: homeP.whip, k: homeP.strikeouts }
      if (awayP) awayPitcherStats = { era: awayP.era, whip: awayP.whip, k: awayP.strikeouts }
    }
  }

  return {
    matchId: String(match.api_match_id || match.id),
    homeTeam: match.home_team_ko || match.home_team,
    awayTeam: match.away_team_ko || match.away_team,
    homeTeamEn: match.home_team,
    awayTeamEn: match.away_team,
    league: match.league,
    matchDate: match.match_date,
    matchTime: match.match_time || '',
    pitcher: {
      home: { name: match.home_pitcher_ko || match.home_pitcher || '미정', era: homePitcherStats.era, whip: homePitcherStats.whip, k: homePitcherStats.k },
      away: { name: match.away_pitcher_ko || match.away_pitcher || '미정', era: awayPitcherStats.era, whip: awayPitcherStats.whip, k: awayPitcherStats.k },
    },
    odds: odds,
    homeSeason: homeSeason,
    awaySeason: awaySeason,
    homeRecent: homeRecent || [],
    awayRecent: awayRecent || [],
    h2h: h2h || [],
  }
}

// ═══════════════════════════════════════
// Claude API 블로그 생성
// ═══════════════════════════════════════
async function generateWithClaude(data: any) {
  const seed = data.matchId + '-' + data.matchDate

  const title = generateTitle(data, seed)
  const tags = generateTags(data, seed)
  const pattern = pickByHash(SECTION_PATTERNS, seed, 1)
  const theme = pickByHash(COLOR_THEMES, seed, 2)

  const sections = pattern.sections.map((s: any) => ({
    key: s.key,
    title: s.title.replace('{HOME}', data.homeTeam).replace('{AWAY}', data.awayTeam),
    icon: s.icon,
    focus: s.focus,
  }))

  const leagueNames: Record<string, string> = { KBO: 'KBO 리그', MLB: 'MLB', NPB: 'NPB' }

  const calcRecent = (games: any[], teamEn: string) => {
    if (!games || !games.length) return '데이터 없음'
    let w = 0
    let l = 0
    for (let i = 0; i < games.length; i++) {
      if (isHomeWin(games[i], teamEn)) {
        w++
      } else {
        l++
      }
    }
    return w + '승 ' + l + '패'
  }

  const recentStr = (games: any[], teamEn: string) => {
    if (!games || !games.length) return '데이터 없음'
    return games.slice(0, 5).map((g: any) => {
      const r = isHomeWin(g, teamEn) ? '승' : '패'
      return '  ' + g.match_date + ' ' + (g.home_team_ko || g.home_team) + ' ' + g.home_score + '-' + g.away_score + ' ' + (g.away_team_ko || g.away_team) + ' (' + r + ')'
    }).join('\n')
  }

  const seasonStr = (s: any, name: string) => {
    if (!s) return '[' + name + ' 시즌: 데이터 없음]'
    return '[' + name + ' 시즌]\n- 타율 ' + (s.team_avg || 'N/A') + ' / OBP ' + (s.team_obp || 'N/A') + ' / SLG ' + (s.team_slg || 'N/A') + ' / OPS ' + (s.team_ops || 'N/A') + '\n- HR ' + (s.team_hr || 'N/A') + ' / ERA ' + (s.team_era_real || 'N/A') + ' / WHIP ' + (s.team_whip || 'N/A')
  }

  const oddsStr = data.odds
    ? '[배당] ' + data.homeTeam + ' ' + (data.odds.home_win_odds ? data.odds.home_win_odds.toFixed(2) : 'N/A') + ' / ' + data.awayTeam + ' ' + (data.odds.away_win_odds ? data.odds.away_win_odds.toFixed(2) : 'N/A') + '\n[AI 승률] ' + data.homeTeam + ' ' + data.odds.home_win_prob + '% / ' + data.awayTeam + ' ' + data.odds.away_win_prob + '%\n[오버언더] ' + (data.odds.over_under_line || 'N/A')
    : '[배당: 데이터 없음]'

  const h2hStr = (data.h2h && data.h2h.length > 0)
    ? data.h2h.slice(0, 5).map((g: any) => '  ' + g.match_date + ' ' + (g.home_team_ko || g.home_team) + ' ' + g.home_score + '-' + g.away_score + ' ' + (g.away_team_ko || g.away_team)).join('\n')
    : '상대 전적 없음'

  const sectionInstructions = sections.map((s: any, i: number) =>
    '[섹션' + (i + 1) + '] ' + s.title + '\n  - 포커스: ' + s.focus + '\n  - 키: ' + s.key
  ).join('\n')

  const jsonSchema = sections.map((s: any, i: number) =>
    '  "section' + (i + 1) + '_title": "' + s.title + '",\n  "section' + (i + 1) + '": "본문 300~500자, 2~3단락 \\n\\n으로 구분"'
  ).join(',\n')

  const prompt = '당신은 프로야구 전문 블로그 라이터입니다. 아래 데이터를 기반으로 네이버 블로그에 최적화된 포스팅을 작성하세요.\n\n' +
    '⚠️ 중요: 양산형/템플릿형 글 절대 금지. 각 섹션마다 다른 어휘와 표현을 쓰고, 데이터의 구체적인 수치를 자연스럽게 녹여주세요.\n\n' +
    '=== 경기 정보 ===\n' +
    '리그: ' + (leagueNames[data.league] || data.league) + '\n' +
    '대진: ' + data.homeTeam + ' (홈) vs ' + data.awayTeam + ' (원정)\n' +
    '날짜: ' + data.matchDate + ' / 시간: ' + data.matchTime + '\n\n' +
    '[선발 투수]\n' +
    '- ' + data.homeTeam + ': ' + data.pitcher.home.name + ' (ERA ' + (data.pitcher.home.era ?? 'N/A') + ', WHIP ' + (data.pitcher.home.whip ?? 'N/A') + ', K ' + (data.pitcher.home.k ?? 'N/A') + ')\n' +
    '- ' + data.awayTeam + ': ' + data.pitcher.away.name + ' (ERA ' + (data.pitcher.away.era ?? 'N/A') + ', WHIP ' + (data.pitcher.away.whip ?? 'N/A') + ', K ' + (data.pitcher.away.k ?? 'N/A') + ')\n\n' +
    '[최근 10경기] ' + data.homeTeam + ': ' + calcRecent(data.homeRecent, data.homeTeamEn) + ' / ' + data.awayTeam + ': ' + calcRecent(data.awayRecent, data.awayTeamEn) + '\n\n' +
    '[' + data.homeTeam + ' 최근 5경기]\n' +
    recentStr(data.homeRecent, data.homeTeamEn) + '\n\n' +
    '[' + data.awayTeam + ' 최근 5경기]\n' +
    recentStr(data.awayRecent, data.awayTeamEn) + '\n\n' +
    seasonStr(data.homeSeason, data.homeTeam) + '\n' +
    seasonStr(data.awaySeason, data.awayTeam) + '\n\n' +
    '[상대 전적]\n' +
    h2hStr + '\n\n' +
    oddsStr + '\n\n' +
    '=== 작성 섹션 (이 순서대로, 패턴 ' + pattern.id + ') ===\n' +
    sectionInstructions + '\n\n' +
    '=== 작성 규칙 ===\n' +
    '1. "~입니다", "~합니다" 존댓말 (어미 다양화 필수)\n' +
    '2. 각 섹션 300~500자\n' +
    '3. AI 티 제거: 기계적 표현 금지\n' +
    '4. 데이터 없으면 자연스럽게 생략\n' +
    '5. 각 섹션은 2~3개 단락으로 \\n\\n 구분\n' +
    '6. 섹션마다 다른 시작 문장 패턴 사용\n\n' +
    '=== excerpt 작성 규칙 ===\n' +
    '- 120~150자, 핵심 수치 포함\n' +
    '- 클릭 유도형 (의문형/결론 유보형)\n' +
    '- 단정형 어미 금지\n\n' +
    '=== 반드시 아래 JSON으로만 응답 ===\n' +
    '{\n' +
    '  "title": "' + title + '",\n' +
    jsonSchema + ',\n' +
    '  "tags": ' + JSON.stringify(tags) + ',\n' +
    '  "excerpt": "검색 클릭 유도형 120~150자",\n' +
    '  "pattern_id": "' + pattern.id + '"\n' +
    '}\n\n' +
    'JSON만 응답하세요.'

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    temperature: 0.8,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = (response.content[0] as any)?.text || ''
  let jsonStr = rawText.trim()
  const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)```/)
  if (jsonMatch) jsonStr = jsonMatch[1].trim()

  try {
    const parsed = JSON.parse(jsonStr)
    parsed.title = title
    parsed.tags = tags
    const htmlContent = buildNaverHTML(parsed, data, sections, theme)
    return {
      title: title,
      htmlContent: htmlContent,
      plainSections: parsed,
      tags: tags,
      excerpt: parsed.excerpt || '',
    }
  } catch {
    return {
      title: title,
      htmlContent: '<div>' + rawText.replace(/\n/g, '<br>') + '</div>',
      plainSections: null,
      tags: tags,
      excerpt: '',
    }
  }
}

// ═══════════════════════════════════════
// 네이버 블로그 호환 HTML
// ═══════════════════════════════════════
function buildNaverHTML(parsed: any, data: any, sections: any[], theme: typeof COLOR_THEMES[0]) {
  const homeTeam = data.homeTeam
  const awayTeam = data.awayTeam
  const league = data.league
  const matchDate = data.matchDate
  const matchTime = data.matchTime
  const pitcher = data.pitcher
  const odds = data.odds
  const leagueNames: Record<string, string> = { KBO: 'KBO 리그', MLB: 'MLB', NPB: 'NPB' }

  const homeProb = (odds && odds.home_win_prob) || 50
  const awayProb = (odds && odds.away_win_prob) || 50

  const probBar = odds ? (
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;border-collapse:collapse;">' +
    '<tr><td style="text-align:center;padding:8px 0;font-weight:bold;font-size:16px;color:' + theme.text + ';">AI 승률 분석</td></tr>' +
    '<tr><td style="padding:0 0 4px 0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
    '<tr>' +
    '<td width="' + homeProb + '%" style="text-align:left;padding:0 0 3px 0;font-weight:bold;color:' + theme.primary + ';font-size:12px;">' + homeTeam + '</td>' +
    '<td width="' + awayProb + '%" style="text-align:right;padding:0 0 3px 0;font-weight:bold;color:' + theme.secondary + ';font-size:12px;">' + awayTeam + '</td>' +
    '</tr><tr>' +
    '<td width="' + homeProb + '%" style="background-color:' + theme.primary + ';color:#fff;text-align:center;padding:8px 2px;font-weight:bold;font-size:13px;">' + homeProb + '%</td>' +
    '<td width="' + awayProb + '%" style="background-color:' + theme.secondary + ';color:#fff;text-align:center;padding:8px 2px;font-weight:bold;font-size:13px;">' + awayProb + '%</td>' +
    '</tr></table></td></tr>' +
    (odds.over_under_line ? '<tr><td style="text-align:center;padding:6px 0;font-size:13px;color:#888;">오버/언더: ' + odds.over_under_line + '</td></tr>' : '') +
    '</table>'
  ) : ''

  const pitcherCard =
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;border:1px solid #ddd;border-collapse:collapse;table-layout:fixed;">' +
    '<tr><td colspan="3" style="text-align:center;padding:10px;font-weight:bold;font-size:16px;background-color:#f5f5f5;border-bottom:1px solid #ddd;">⚾ 선발 투수 매치업</td></tr>' +
    '<tr>' +
    '<td width="44%" style="text-align:center;padding:12px 6px;background-color:' + theme.accentBg + ';border-right:1px solid #eee;word-break:keep-all;">' +
    '<p style="margin:0 0 4px 0;font-weight:bold;color:' + theme.primary + ';font-size:13px;">' + homeTeam + '</p>' +
    '<p style="margin:0 0 4px 0;font-size:16px;font-weight:bold;">' + pitcher.home.name + '</p>' +
    '<p style="margin:0;font-size:11px;color:#888;">ERA ' + (pitcher.home.era ?? '-') + ' | WHIP ' + (pitcher.home.whip ?? '-') + ' | K ' + (pitcher.home.k ?? '-') + '</p>' +
    '</td>' +
    '<td width="12%" style="text-align:center;font-size:18px;font-weight:bold;color:#ccc;">VS</td>' +
    '<td width="44%" style="text-align:center;padding:12px 6px;background-color:' + theme.accentBg2 + ';border-left:1px solid #eee;word-break:keep-all;">' +
    '<p style="margin:0 0 4px 0;font-weight:bold;color:' + theme.secondary + ';font-size:13px;">' + awayTeam + '</p>' +
    '<p style="margin:0 0 4px 0;font-size:16px;font-weight:bold;">' + pitcher.away.name + '</p>' +
    '<p style="margin:0;font-size:11px;color:#888;">ERA ' + (pitcher.away.era ?? '-') + ' | WHIP ' + (pitcher.away.whip ?? '-') + ' | K ' + (pitcher.away.k ?? '-') + '</p>' +
    '</td></tr></table>'

  const splitLongParagraph = (text: string): string[] => {
    if (text.length < 200) return [text]
    const sentences = text.match(/[^.!?。]+[.!?。]+/g) || [text]
    if (sentences.length <= 2) return [text]
    const groupSize = Math.ceil(sentences.length / Math.min(3, Math.ceil(sentences.length / 2)))
    const groups: string[] = []
    for (let i = 0; i < sentences.length; i += groupSize) {
      groups.push(sentences.slice(i, i + groupSize).join('').trim())
    }
    return groups.filter(g => g.length > 0)
  }

  const section = (title: string, body: string, icon: string) => {
    if (!body) return ''
    let paragraphs = body
      .split(/\n{2,}|\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
    paragraphs = paragraphs.flatMap(p => splitLongParagraph(p))
    const paragraphsHtml = paragraphs
      .map((p, idx) => '<p style="text-align:left;font-size:15px;line-height:1.8;color:' + theme.text + ';margin:0 0 ' + (idx === paragraphs.length - 1 ? '0' : '12') + 'px 0;">' + p + '</p>')
      .join('\n')
    return (
      '<p style="text-align:center;font-size:18px;font-weight:bold;color:' + theme.text + ';margin:24px 0 10px 0;">' + icon + ' ' + title + '</p>' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:' + theme.bg + ';margin:0 0 16px 0;">' +
      '<tr><td style="padding:18px 20px;">' + paragraphsHtml + '</td></tr>' +
      '</table>'
    )
  }

  const adSlot = '\n<!-- AD-SLOT-MID -->\n<p style="text-align:center;font-size:11px;color:#bbb;margin:8px 0;">— 광고 —</p>'

  const sectionRenders: string[] = []
  sections.forEach((s: any, i: number) => {
    const sectionTitle = parsed['section' + (i + 1) + '_title'] || s.title
    const sectionBody = parsed['section' + (i + 1)] || ''
    sectionRenders.push(section(sectionTitle, sectionBody, s.icon))
    if (i === 1) sectionRenders.push(adSlot)
  })

  const tagsHtml = (parsed.tags || []).map((t: string) => '#' + t).join(' ')

  return (
    '<p style="text-align:center;font-size:13px;color:' + theme.secondary + ';font-weight:bold;margin:0 0 2px 0;">' + (leagueNames[league] || league) + ' | ' + matchDate + ' ' + matchTime + '</p>' +
    '<p style="text-align:center;font-size:22px;font-weight:bold;color:' + theme.text + ';margin:0 0 2px 0;">' + homeTeam + ' vs ' + awayTeam + '</p>' +
    '<p style="text-align:center;font-size:14px;color:#999;margin:0 0 12px 0;">' + (parsed.excerpt || 'AI 데이터 기반 경기 분석 프리뷰') + '</p>' +
    probBar +
    pitcherCard +
    sectionRenders.join('\n') +
    '<p style="text-align:center;font-size:14px;color:' + theme.secondary + ';margin:24px 0 0 0;">' + tagsHtml + '</p>' +
    '<p style="text-align:center;margin:12px 0 0 0;"><a href="https://www.trendsoccer.com/baseball" target="_blank"><img src="https://www.trendsoccer.com/1200x200.png" alt="TrendSoccer" style="max-width:100%;" /></a></p>'
  )
}

// ─── 유틸 ───
function getTomorrowKST(): string {
  const now = new Date()
  now.setHours(now.getHours() + 9)
  now.setDate(now.getDate() + 1)
  return now.toISOString().split('T')[0]
}
