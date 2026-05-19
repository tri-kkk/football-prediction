// POST /api/admin/blog/baseball-result
// 종료된 야구 경기 → 결과 리뷰 글 자동 생성
// 검색 트래픽이 프리뷰 대비 5-10배 큰 키워드 영역 ('XX vs YY 결과', 'XX 점수' 등)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

// ═══════════════════════════════════════
// 다양화 유틸 (baseball-generate와 동일)
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

// ═══════════════════════════════════════
// 결과 글 제목 풀 (10개)
// ═══════════════════════════════════════
function generateResultTitle(data: any, seed: string): string {
  const { homeTeam, awayTeam, league, matchDate, homeScore, awayScore } = data
  const winner = homeScore > awayScore ? homeTeam : awayTeam
  const loser = homeScore > awayScore ? awayTeam : homeTeam
  const winnerScore = Math.max(homeScore, awayScore)
  const loserScore = Math.min(homeScore, awayScore)
  const scoreDiff = winnerScore - loserScore
  const dateMD = matchDate.slice(5).replace('-', '월') + '일'

  const isClose = scoreDiff <= 2
  const isBigWin = scoreDiff >= 5
  const isShutout = loserScore === 0
  const isHighScoring = homeScore + awayScore >= 12

  const candidates: string[] = []

  // 압도적 승리
  if (isBigWin) {
    candidates.push(`${winner} ${winnerScore}-${loserScore} ${loser} 대승, ${dateMD} ${league} 경기 결과`)
    candidates.push(`${dateMD} ${winner}, ${loser}전 ${winnerScore}-${loserScore} 압도적 승리`)
  }

  // 영봉승
  if (isShutout) {
    candidates.push(`${winner} ${winnerScore}-0 ${loser} 영봉승, ${dateMD} 경기 하이라이트`)
    candidates.push(`${dateMD} ${winner} 완봉승 (${winnerScore}-0 ${loser}), 무엇이 통했나`)
  }

  // 박빙
  if (isClose) {
    candidates.push(`${winner} ${winnerScore}-${loserScore} ${loser}, ${dateMD} 박빙 승부 결과`)
    candidates.push(`${dateMD} ${homeTeam} vs ${awayTeam} ${homeScore}-${awayScore}, 1점 차 명승부`)
  }

  // 난타전
  if (isHighScoring) {
    candidates.push(`${homeTeam} ${homeScore}-${awayScore} ${awayTeam} 난타전, ${dateMD} ${league} 결과`)
  }

  // 일반/대체
  candidates.push(`${dateMD} ${league} ${homeTeam} ${homeScore}-${awayScore} ${awayTeam} 경기 결과 정리`)
  candidates.push(`${homeTeam} vs ${awayTeam} ${homeScore}-${awayScore}, ${dateMD} 경기 리뷰`)
  candidates.push(`${winner} 승리 (${homeScore}-${awayScore}), ${dateMD} ${league} ${homeTeam}-${awayTeam} 결과`)
  candidates.push(`${dateMD} ${league} 경기결과 ${homeTeam} vs ${awayTeam} (${homeScore}-${awayScore})`)
  candidates.push(`${homeTeam} ${homeScore}점, ${awayTeam} ${awayScore}점 - ${dateMD} 경기 결과·하이라이트`)

  return pickByHash(candidates, seed)
}

// ═══════════════════════════════════════
// 결과 글 태그 생성
// ═══════════════════════════════════════
function generateResultTags(data: any, seed: string): string[] {
  const cleanName = (s: string) => s.replace(/\s+/g, '')
  const tags: string[] = [
    cleanName(data.homeTeam),
    cleanName(data.awayTeam),
    data.league,
    '경기결과',
    '경기리뷰',
  ]

  if (data.homeScore > data.awayScore) tags.push(`${cleanName(data.homeTeam)}승리`)
  else tags.push(`${cleanName(data.awayTeam)}승리`)

  const month = parseInt(data.matchDate.slice(5, 7))
  tags.push(`${month}월야구`)

  const pool = [
    '프로야구', '경기하이라이트', '베이스볼', '오늘의경기', '야구중계',
    '야구결과', '스포츠뉴스', '경기분석', '야구속보',
  ]
  return [...tags, ...sampleByHash(pool, seed, 2)].slice(0, 10)
}

// ═══════════════════════════════════════
// 컬러 테마 (generate와 동일)
// ═══════════════════════════════════════
const COLOR_THEMES = [
  { primary: '#d63031', secondary: '#0984e3', bg: '#faf8f3', text: '#2d3436', accentBg: '#fff5f5', accentBg2: '#f0f8ff' },
  { primary: '#e17055', secondary: '#00b894', bg: '#f8fafc', text: '#1e293b', accentBg: '#fff7ed', accentBg2: '#ecfdf5' },
  { primary: '#6c5ce7', secondary: '#fdcb6e', bg: '#fff5e6', text: '#27272a', accentBg: '#f3f0ff', accentBg2: '#fefce8' },
  { primary: '#fd79a8', secondary: '#0984e3', bg: '#f0f4f8', text: '#1f2937', accentBg: '#fdf2f8', accentBg2: '#eff6ff' },
]

// ═══════════════════════════════════════
// 결과 글 섹션 패턴 (4개)
// ═══════════════════════════════════════
const RESULT_PATTERNS = [
  {
    id: 'R1',
    sections: [
      { key: 'recap', title: '경기 요약', icon: '📋', focus: '경기 흐름을 간결하게 요약. 어떤 식으로 승부가 갈렸는지.' },
      { key: 'turning', title: '승부처', icon: '⚖️', focus: '경기의 분수령이 된 이닝/장면. 점수 흐름 변화.' },
      { key: 'mvp', title: '오늘의 주역', icon: '⭐', focus: '주요 활약 선수. 투수와 타자 모두 다뤄주세요.' },
      { key: 'next', title: '다음 경기 전망', icon: '🔮', focus: '이번 결과가 다음 경기/시리즈에 미칠 영향.' },
    ],
  },
  {
    id: 'R2',
    sections: [
      { key: 'flow', title: '경기 흐름', icon: '⚾', focus: '이닝별 점수 변화와 분위기. 어디서부터 차이가 벌어졌는지.' },
      { key: 'pitching', title: '투수전 리뷰', icon: '🎯', focus: '양 팀 선발 및 불펜 운영. 누가 좋았고 누가 흔들렸는지.' },
      { key: 'batting', title: '타선 분석', icon: '🏏', focus: '결정적인 타격, 적시타, 홈런 등 타격 포인트.' },
      { key: 'outlook', title: '시즌 흐름과 의미', icon: '📈', focus: '이 경기가 시즌 흐름에서 갖는 의미.' },
    ],
  },
  {
    id: 'R3',
    sections: [
      { key: 'highlight', title: '오늘의 하이라이트', icon: '🔥', focus: '경기의 핵심 장면 3가지. 점수 상황과 함께.' },
      { key: 'analysis', title: '승부 갈림길', icon: '⚖️', focus: '왜 이 결과가 나왔는지 데이터 기반 분석.' },
      { key: 'standing', title: '순위/기록 영향', icon: '🏆', focus: '이번 결과가 팀 순위와 시즌 기록에 미친 영향.' },
      { key: 'preview', title: '내일의 관전 포인트', icon: '👀', focus: '다음 경기 또는 시리즈에서 주목할 점.' },
    ],
  },
  {
    id: 'R4',
    sections: [
      { key: 'score', title: '점수 흐름', icon: '📊', focus: '이닝별 득점, 분위기 변화. 결정적 이닝 짚기.' },
      { key: 'key_play', title: '결정적 장면', icon: '⚡', focus: '경기를 가른 한 장면, 한 타석, 한 투구.' },
      { key: 'verdict', title: '승패 이유', icon: '🧠', focus: '왜 이긴 팀이 이겼고, 진 팀은 어디서 무너졌는지.' },
      { key: 'next_step', title: '앞으로의 과제', icon: '🎯', focus: '양 팀이 다음 경기까지 보완해야 할 점.' },
    ],
  },
]

// ═══════════════════════════════════════
// POST: 결과 글 생성
// ═══════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const { match_id } = await req.json()
    if (!match_id) {
      return NextResponse.json({ success: false, error: 'match_id 필수' }, { status: 400 })
    }

    const matchData = await collectResultData(String(match_id))
    if (!matchData) {
      return NextResponse.json({ success: false, error: '종료된 경기를 찾을 수 없습니다' }, { status: 404 })
    }

    const blogPost = await generateResultBlog(matchData)

    // baseball_blog_drafts에 type=result로 저장
    await supabase.from('baseball_blog_drafts').upsert({
      match_id: `${match_id}-result`,
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
    console.error('[baseball-result] Error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════
// GET: 종료된 경기 목록 조회
// ═══════════════════════════════════════
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  // 기본: 오늘
  const targetDate = searchParams.get('date') || getTodayKST()
  const league = searchParams.get('league') || 'ALL'

  try {
    let query = supabase
      .from('baseball_matches')
      .select('id, api_match_id, home_team, away_team, home_team_ko, away_team_ko, league, match_date, match_time, status, home_score, away_score')
      .eq('match_date', targetDate)
      .eq('status', 'FT')
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
        display_name: `${m.home_team_ko || m.home_team} ${m.home_score}-${m.away_score} ${m.away_team_ko || m.away_team}`,
      })
    })

    // 저장된 결과 글 (match_id에 '-result' suffix)
    const resultIds = (data || []).map(m => `${m.api_match_id || m.id}-result`)
    const { data: savedBlogs } = resultIds.length
      ? await supabase
          .from('baseball_blog_drafts')
          .select('match_id, title, html_content, tags, excerpt')
          .in('match_id', resultIds)
      : { data: [] }

    const savedMap: Record<string, any> = {}
    ;(savedBlogs || []).forEach(b => {
      // -result suffix 제거하여 원본 match_id로 매핑
      const originalId = b.match_id.replace('-result', '')
      savedMap[originalId] = {
        matchId: originalId,
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
// 데이터 수집 (결과 글용)
// ═══════════════════════════════════════
async function collectResultData(matchId: string) {
  const { data: match } = await supabase
    .from('baseball_matches')
    .select('*')
    .or(`api_match_id.eq.${matchId},id.eq.${matchId}`)
    .single()

  if (!match || match.status !== 'FT') return null

  const season = String(new Date(match.match_date).getFullYear())

  const [odds, homeSeason, awaySeason, h2h] = await Promise.all([
    supabase.from('baseball_odds_latest').select('*').eq('api_match_id', match.api_match_id || match.id).single().then(r => r.data),
    supabase.from('baseball_team_season_stats').select('*').eq('team_name', match.home_team).eq('league', match.league).eq('season', season).single().then(r => r.data),
    supabase.from('baseball_team_season_stats').select('*').eq('team_name', match.away_team).eq('league', match.league).eq('season', season).single().then(r => r.data),
    supabase.from('baseball_matches').select('home_team, away_team, home_team_ko, away_team_ko, home_score, away_score, match_date').or(`and(home_team.eq.${match.home_team},away_team.eq.${match.away_team}),and(home_team.eq.${match.away_team},away_team.eq.${match.home_team})`).eq('status', 'FT').lt('match_date', match.match_date).order('match_date', { ascending: false }).limit(5).then(r => r.data),
  ])

  return {
    matchId: String(match.api_match_id || match.id),
    homeTeam: match.home_team_ko || match.home_team,
    awayTeam: match.away_team_ko || match.away_team,
    homeTeamEn: match.home_team,
    awayTeamEn: match.away_team,
    league: match.league,
    matchDate: match.match_date,
    matchTime: match.match_time || '',
    homeScore: match.home_score,
    awayScore: match.away_score,
    homeHits: match.home_hits,
    awayHits: match.away_hits,
    homeErrors: match.home_errors,
    awayErrors: match.away_errors,
    innings: match.inning,
    venue: match.venue,
    homePitcher: match.home_pitcher_ko || match.home_pitcher,
    awayPitcher: match.away_pitcher_ko || match.away_pitcher,
    odds, homeSeason, awaySeason,
    h2h: h2h || [],
  }
}

// ═══════════════════════════════════════
// Claude API 결과 글 생성
// ═══════════════════════════════════════
async function generateResultBlog(data: any) {
  const seed = `result-${data.matchId}-${data.matchDate}`

  const title = generateResultTitle(data, seed)
  const tags = generateResultTags(data, seed)
  const pattern = pickByHash(RESULT_PATTERNS, seed, 1)
  const theme = pickByHash(COLOR_THEMES, seed, 2)

  const sections = pattern.sections
  const leagueNames: Record<string, string> = { KBO: 'KBO 리그', MLB: 'MLB', NPB: 'NPB' }

  const winner = data.homeScore > data.awayScore ? data.homeTeam : data.awayTeam
  const loser = data.homeScore > data.awayScore ? data.awayTeam : data.homeTeam
  const scoreDiff = Math.abs(data.homeScore - data.awayScore)

  const h2hStr = data.h2h?.length > 0
    ? data.h2h.map((g: any) => `  ${g.match_date} ${g.home_team_ko || g.home_team} ${g.home_score}-${g.away_score} ${g.away_team_ko || g.away_team}`).join('\n')
    : '상대 전적 없음'

  const oddsStr = data.odds
    ? `[경기 전 예측] AI 승률 ${data.homeTeam} ${data.odds.home_win_prob}% / ${data.awayTeam} ${data.odds.away_win_prob}% (실제 결과: ${winner} 승)`
    : ''

  const sectionInstructions = sections.map((s, i) =>
    `[섹션${i + 1}] ${s.title}\n  - 포커스: ${s.focus}`
  ).join('\n')

  const jsonSchema = sections.map((s, i) =>
    `  "section${i + 1}_title": "${s.title}",\n  "section${i + 1}": "본문 300~500자, 2~3단락 \\n\\n으로 구분"`
  ).join(',\n')

  const prompt = `당신은 프로야구 전문 블로그 라이터입니다. 종료된 경기의 결과를 분석하는 리뷰 글을 작성하세요.

⚠️ 중요: 양산형 글 금지. 실제 점수와 데이터를 바탕으로 자연스럽고 구체적인 분석을 해주세요.

=== 경기 결과 ===
리그: ${leagueNames[data.league] || data.league}
날짜: ${data.matchDate} / ${data.matchTime}
${data.venue ? `구장: ${typeof data.venue === 'string' ? data.venue : JSON.stringify(data.venue)}` : ''}

【최종 스코어】
${data.homeTeam} (홈) ${data.homeScore} - ${data.awayScore} ${data.awayTeam} (원정)
→ 승리: ${winner} (${scoreDiff}점 차)

[추가 기록]
- 안타: ${data.homeTeam} ${data.homeHits || '?'} / ${data.awayTeam} ${data.awayHits || '?'}
- 실책: ${data.homeTeam} ${data.homeErrors ?? '?'} / ${data.awayTeam} ${data.awayErrors ?? '?'}
- 선발: ${data.homeTeam} ${data.homePitcher || '미상'} / ${data.awayTeam} ${data.awayPitcher || '미상'}

[상대 전적 (이전 경기들)]
${h2hStr}

${oddsStr}

=== 작성 섹션 (이 순서대로, 패턴 ${pattern.id}) ===
${sectionInstructions}

=== 작성 규칙 ===
1. "~입니다", "~했습니다" 존댓말 (어미 다양화)
2. 각 섹션 300~500자
3. AI 티 제거. 실제 야구 칼럼처럼 자연스럽게
4. 가지고 있는 데이터로만 작성 (없는 사실 만들지 마세요)
5. 각 섹션은 2~3개 단락으로 \\n\\n 구분
6. 점수, 이닝 등 구체 수치를 자연스럽게 인용

=== excerpt 규칙 ===
- 120~150자
- 점수 또는 핵심 활약 1가지 포함
- 클릭 유도형 ("어떻게 ~했나", "~의 의미는")

=== 반드시 아래 JSON으로만 응답 ===
{
  "title": "${title}",
${jsonSchema},
  "tags": ${JSON.stringify(tags)},
  "excerpt": "120~150자 클릭 유도형",
  "pattern_id": "${pattern.id}"
}

JSON만 응답하세요.`

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
    const htmlContent = buildResultHTML(parsed, data, sections, theme)
    return {
      title,
      htmlContent,
      plainSections: parsed,
      tags,
      excerpt: parsed.excerpt || '',
    }
  } catch {
    return {
      title,
      htmlContent: `<div>${rawText.replace(/\n/g, '<br>')}</div>`,
      plainSections: null,
      tags,
      excerpt: '',
    }
  }
}

// ═══════════════════════════════════════
// 결과 글 HTML 빌더
// ═══════════════════════════════════════
function buildResultHTML(parsed: any, data: any, sections: any[], theme: typeof COLOR_THEMES[0]) {
  const { homeTeam, awayTeam, league, matchDate, matchTime, homeScore, awayScore } = data
  const leagueNames: Record<string, string> = { KBO: 'KBO 리그', MLB: 'MLB', NPB: 'NPB' }

  const isHomeWin = homeScore > awayScore
  const winnerColor = isHomeWin ? theme.primary : theme.secondary
  const winnerBg = isHomeWin ? theme.accentBg : theme.accentBg2

  // 큰 스코어보드 (결과 글의 핵심 비주얼)
  const scoreBoard = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;border-collapse:collapse;background-color:#f9f9f9;border:2px solid #e0e0e0;">
  <tr><td colspan="3" style="text-align:center;padding:8px 0;background-color:#333;color:#fff;font-weight:bold;font-size:14px;">FINAL</td></tr>
  <tr>
    <td width="40%" style="text-align:center;padding:18px 8px;background-color:${isHomeWin ? winnerBg : '#f5f5f5'};">
      <p style="margin:0 0 6px 0;font-weight:bold;color:${theme.primary};font-size:14px;">${homeTeam}</p>
      <p style="margin:0;font-size:42px;font-weight:bold;color:${isHomeWin ? winnerColor : '#999'};">${homeScore}</p>
      ${isHomeWin ? `<p style="margin:4px 0 0 0;font-size:11px;color:${theme.primary};font-weight:bold;">▲ WIN</p>` : ''}
    </td>
    <td width="20%" style="text-align:center;font-size:18px;color:#bbb;font-weight:bold;">-</td>
    <td width="40%" style="text-align:center;padding:18px 8px;background-color:${!isHomeWin ? winnerBg : '#f5f5f5'};">
      <p style="margin:0 0 6px 0;font-weight:bold;color:${theme.secondary};font-size:14px;">${awayTeam}</p>
      <p style="margin:0;font-size:42px;font-weight:bold;color:${!isHomeWin ? winnerColor : '#999'};">${awayScore}</p>
      ${!isHomeWin ? `<p style="margin:4px 0 0 0;font-size:11px;color:${theme.secondary};font-weight:bold;">▲ WIN</p>` : ''}
    </td>
  </tr>
  ${data.homeHits || data.awayHits ? `
  <tr>
    <td style="text-align:center;padding:6px 0;font-size:12px;color:#666;border-top:1px solid #ddd;">안타 ${data.homeHits || '-'}</td>
    <td></td>
    <td style="text-align:center;padding:6px 0;font-size:12px;color:#666;border-top:1px solid #ddd;">안타 ${data.awayHits || '-'}</td>
  </tr>` : ''}
</table>`

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
    let paragraphs = body.split(/\n{2,}|\n/).map(p => p.trim()).filter(p => p.length > 0)
    paragraphs = paragraphs.flatMap(p => splitLongParagraph(p))
    const paragraphsHtml = paragraphs
      .map((p, idx) => `<p style="text-align:left;font-size:15px;line-height:1.8;color:${theme.text};margin:0 0 ${idx === paragraphs.length - 1 ? '0' : '12'}px 0;">${p}</p>`)
      .join('\n')
    return `
<p style="text-align:center;font-size:18px;font-weight:bold;color:${theme.text};margin:24px 0 10px 0;">${icon} ${title}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:${theme.bg};margin:0 0 16px 0;">
  <tr><td style="padding:18px 20px;">
${paragraphsHtml}
  </td></tr>
</table>`
  }

  const adSlot = `
<!-- AD-SLOT-MID -->
<p style="text-align:center;font-size:11px;color:#bbb;margin:8px 0;">— 광고 —</p>`

  const sectionRenders: string[] = []
  sections.forEach((s, i) => {
    const sectionTitle = parsed[`section${i + 1}_title`] || s.title
    const sectionBody = parsed[`section${i + 1}`] || ''
    sectionRenders.push(section(sectionTitle, sectionBody, s.icon))
    if (i === 1) sectionRenders.push(adSlot)
  })

  return `
<p style="text-align:center;font-size:13px;color:${theme.secondary};font-weight:bold;margin:0 0 2px 0;">${leagueNames[league]||league} | ${matchDate} ${matchTime} 경기 결과</p>
<p style="text-align:center;font-size:22px;font-weight:bold;color:${theme.text};margin:0 0 2px 0;">${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}</p>
<p style="text-align:center;font-size:14px;color:#999;margin:0 0 12px 0;">${parsed.excerpt || '경기 결과 리뷰 및 분석'}</p>
${scoreBoard}
${sectionRenders.join('\n')}
<p style="text-align:center;font-size:14px;color:${theme.secondary};margin:24px 0 0 0;">${(parsed.tags || []).map((t: string) => `#${t}`).join(' ')}</p>
<p style="text-align:center;margin:12px 0 0 0;"><a href="https://www.trendsoccer.com/baseball" target="_blank"><img src="https://www.trendsoccer.com/1200x200.png" alt="TrendSoccer" style="max-width:100%;" /></a></p>
`
}

function getTodayKST(): string {
  const now = new Date()
  now.setHours(now.getHours() + 9)
  return now.toISOString().split('T')[0]
}
