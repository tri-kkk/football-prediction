// POST /api/admin/blog/baseball-generate
// 야구 경기 데이터 → Claude API → 네이버 블로그용 HTML 콘텐츠 생성

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

// ─── POST: 블로그 생성 ───
export async function POST(req: NextRequest) {
  try {
    const { match_id } = await req.json()
    if (!match_id) {
      return NextResponse.json({ success: false, error: 'match_id 필수' }, { status: 400 })
    }

    // 1. 경기 데이터 수집
    const matchData = await collectMatchData(String(match_id))
    if (!matchData) {
      return NextResponse.json({ success: false, error: '경기를 찾을 수 없습니다' }, { status: 404 })
    }

    // 2. Claude API로 블로그 생성
    const blogPost = await generateWithClaude(matchData)

    // 3. DB에 저장 (upsert by match_id)
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

// ─── GET: 경기 목록 조회 ───
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

    // 리그별 그룹화
    const grouped: Record<string, any[]> = {}
    ;(data || []).forEach(m => {
      if (!grouped[m.league]) grouped[m.league] = []
      grouped[m.league].push({
        ...m,
        match_id: String(m.api_match_id || m.id),
        display_name: `${m.home_team_ko || m.home_team} vs ${m.away_team_ko || m.away_team}`,
        pitcher_display: `${m.home_pitcher_ko || m.home_pitcher || '미정'} vs ${m.away_pitcher_ko || m.away_pitcher || '미정'}`,
      })
    })

    // 저장된 블로그 조회
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
    .or(`api_match_id.eq.${matchId},id.eq.${matchId}`)
    .single()

  if (!match) return null

  const season = String(new Date(match.match_date).getFullYear())

  const [odds, homeSeason, awaySeason, homeRecent, awayRecent, h2h] = await Promise.all([
    supabase.from('baseball_odds_latest').select('*').eq('api_match_id', match.api_match_id || match.id).single().then(r => r.data),
    supabase.from('baseball_team_season_stats').select('*').eq('team_name', match.home_team).eq('league', match.league).eq('season', season).single().then(r => r.data),
    supabase.from('baseball_team_season_stats').select('*').eq('team_name', match.away_team).eq('league', match.league).eq('season', season).single().then(r => r.data),
    supabase.from('baseball_matches').select('home_team, away_team, home_team_ko, away_team_ko, home_score, away_score, match_date').or(`home_team.eq.${match.home_team},away_team.eq.${match.home_team}`).lt('match_date', match.match_date).eq('status', 'FT').order('match_date', { ascending: false }).limit(10).then(r => r.data),
    supabase.from('baseball_matches').select('home_team, away_team, home_team_ko, away_team_ko, home_score, away_score, match_date').or(`home_team.eq.${match.away_team},away_team.eq.${match.away_team}`).lt('match_date', match.match_date).eq('status', 'FT').order('match_date', { ascending: false }).limit(10).then(r => r.data),
    supabase.from('baseball_matches').select('home_team, away_team, home_team_ko, away_team_ko, home_score, away_score, match_date').or(`and(home_team.eq.${match.home_team},away_team.eq.${match.away_team}),and(home_team.eq.${match.away_team},away_team.eq.${match.home_team})`).eq('status', 'FT').order('match_date', { ascending: false }).limit(10).then(r => r.data),
  ])

  // ── 투수 스탯 보강: baseball_matches 컬럼에 없으면 별도 테이블에서 조회 ──
  let homePitcherStats = { era: match.home_pitcher_era, whip: match.home_pitcher_whip, k: match.home_pitcher_k }
  let awayPitcherStats = { era: match.away_pitcher_era, whip: match.away_pitcher_whip, k: match.away_pitcher_k }

  const needHomeFallback = homePitcherStats.era == null && homePitcherStats.whip == null
  const needAwayFallback = awayPitcherStats.era == null && awayPitcherStats.whip == null

  if (needHomeFallback || needAwayFallback) {
    if (match.league === 'MLB') {
      // MLB: statsapi.mlb.com에서 pitcher_id로 실시간 조회
      const fetchMlbPitcherStats = async (pitcherId: number | null) => {
        if (!pitcherId) return null
        try {
          const res = await fetch(
            `https://statsapi.mlb.com/api/v1/people/${pitcherId}?hydrate=stats(group=[pitching],type=[season],season=${season})`,
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
      // KBO/NPB: 별도 테이블에서 조회
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
    odds, homeSeason, awaySeason,
    homeRecent: homeRecent || [],
    awayRecent: awayRecent || [],
    h2h: h2h || [],
  }
}

// ═══════════════════════════════════════
// Claude API 블로그 생성
// ═══════════════════════════════════════
async function generateWithClaude(data: any) {
  const leagueNames: Record<string, string> = { KBO: 'KBO 리그', MLB: 'MLB', NPB: 'NPB' }
  const calcRecent = (games: any[], teamEn: string) => {
    if (!games?.length) return '데이터 없음'
    let w = 0, l = 0
    games.forEach(g => { (g.home_team === teamEn ? g.home_score > g.away_score : g.away_score > g.home_score) ? w++ : l++ })
    return `${w}승 ${l}패`
  }

  const recentStr = (games: any[], teamEn: string) => {
    if (!games?.length) return '데이터 없음'
    return games.slice(0, 5).map(g => {
      const r = g.home_team === teamEn ? (g.home_score > g.away_score ? '승' : '패') : (g.away_score > g.home_score ? '승' : '패')
      return `  ${g.match_date} ${g.home_team_ko || g.home_team} ${g.home_score}-${g.away_score} ${g.away_team_ko || g.away_team} (${r})`
    }).join('\n')
  }

  const seasonStr = (s: any, name: string) => {
    if (!s) return `[${name} 시즌: 데이터 없음]`
    return `[${name} 시즌]\n- 타율 ${s.team_avg || 'N/A'} / OBP ${s.team_obp || 'N/A'} / SLG ${s.team_slg || 'N/A'} / OPS ${s.team_ops || 'N/A'}\n- HR ${s.team_hr || 'N/A'} / ERA ${s.team_era_real || 'N/A'} / WHIP ${s.team_whip || 'N/A'}`
  }

  const oddsStr = data.odds
    ? `[배당] ${data.homeTeam} ${data.odds.home_win_odds?.toFixed(2) || 'N/A'} / ${data.awayTeam} ${data.odds.away_win_odds?.toFixed(2) || 'N/A'}\n[AI 승률] ${data.homeTeam} ${data.odds.home_win_prob}% / ${data.awayTeam} ${data.odds.away_win_prob}%\n[오버언더] ${data.odds.over_under_line || 'N/A'}`
    : '[배당: 데이터 없음]'

  const h2hStr = data.h2h?.length > 0
    ? data.h2h.slice(0, 5).map((g: any) => `  ${g.match_date} ${g.home_team_ko || g.home_team} ${g.home_score}-${g.away_score} ${g.away_team_ko || g.away_team}`).join('\n')
    : '상대 전적 없음'

  const prompt = `당신은 프로야구 전문 블로그 라이터입니다. 아래 데이터를 기반으로 네이버 블로그에 최적화된 포스팅을 작성해주세요.

=== 경기 정보 ===
리그: ${leagueNames[data.league] || data.league}
대진: ${data.homeTeam} (홈) vs ${data.awayTeam} (원정)
날짜: ${data.matchDate} / 시간: ${data.matchTime}

[선발 투수]
- ${data.homeTeam}: ${data.pitcher.home.name} (ERA ${data.pitcher.home.era ?? 'N/A'}, WHIP ${data.pitcher.home.whip ?? 'N/A'}, K ${data.pitcher.home.k ?? 'N/A'})
- ${data.awayTeam}: ${data.pitcher.away.name} (ERA ${data.pitcher.away.era ?? 'N/A'}, WHIP ${data.pitcher.away.whip ?? 'N/A'}, K ${data.pitcher.away.k ?? 'N/A'})

[최근 10경기] ${data.homeTeam}: ${calcRecent(data.homeRecent, data.homeTeamEn)} / ${data.awayTeam}: ${calcRecent(data.awayRecent, data.awayTeamEn)}

[${data.homeTeam} 최근 5경기]
${recentStr(data.homeRecent, data.homeTeamEn)}

[${data.awayTeam} 최근 5경기]
${recentStr(data.awayRecent, data.awayTeamEn)}

${seasonStr(data.homeSeason, data.homeTeam)}
${seasonStr(data.awaySeason, data.awayTeam)}

[상대 전적]
${h2hStr}

${oddsStr}

=== 작성 규칙 ===
1. "~입니다", "~합니다" 존댓말
2. 각 섹션 300~500자
3. 자연스러운 문체 (AI 티 제거)
4. 데이터 없으면 자연스럽게 생략

=== 반드시 아래 JSON으로만 응답 ===
{
  "title": "${data.matchDate} [${data.league}] ${data.homeTeam} vs ${data.awayTeam} AI 분석 프리뷰",
  "section1_title": "매치 프리뷰",
  "section1": "양 팀 최근 폼, 승률 흐름 기반 프리뷰 (300~500자)",
  "section2_title": "선발 투수 매치업",
  "section2": "선발 투수 핵심 지표 비교 분석 (300~500자)",
  "section3_title": "팀 전력 분석",
  "section3": "시즌 스탯 비교 및 타선 분석 (300~500자)",
  "section4_title": "AI 승부예측",
  "section4": "AI 승률, 배당 기반 최종 예측 (300~500자)",
  "tags": ["${data.league}", "${data.homeTeam}", "${data.awayTeam}", "야구분석", "승부예측", "AI분석"],
  "excerpt": "한줄 요약 50자"
}

JSON만 응답하세요.`

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    temperature: 0.7,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = (response.content[0] as any)?.text || ''
  let jsonStr = rawText.trim()
  const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)```/)
  if (jsonMatch) jsonStr = jsonMatch[1].trim()

  try {
    const parsed = JSON.parse(jsonStr)
    const htmlContent = buildNaverHTML(parsed, data)
    return {
      title: parsed.title || `[${data.league}] ${data.homeTeam} vs ${data.awayTeam}`,
      htmlContent,
      plainSections: parsed,
      tags: parsed.tags || [],
      excerpt: parsed.excerpt || '',
    }
  } catch {
    return {
      title: `[${data.league}] ${data.homeTeam} vs ${data.awayTeam}`,
      htmlContent: `<div>${rawText.replace(/\n/g, '<br>')}</div>`,
      plainSections: null,
      tags: [],
      excerpt: '',
    }
  }
}

// ═══════════════════════════════════════
// 네이버 블로그 호환 HTML (table 기반, 단순 CSS만 사용)
// 네이버 에디터는 flex, grid, gradient, border-radius 등 무시함
// table + background-color + 기본 스타일만 사용
// ═══════════════════════════════════════
function buildNaverHTML(parsed: any, data: any) {
  const { homeTeam, awayTeam, league, matchDate, matchTime, pitcher, odds } = data
  const leagueNames: Record<string, string> = { KBO: 'KBO 리그', MLB: 'MLB', NPB: 'NPB' }

  const homeProb = odds?.home_win_prob || 50
  const awayProb = odds?.away_win_prob || 50

  // 승률 바 (table 기반)
  const probBar = odds ? `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;border-collapse:collapse;">
  <tr><td colspan="3" style="text-align:center;padding:8px 0;font-weight:bold;font-size:16px;color:#333;">AI 승률 분석</td></tr>
  <tr>
    <td width="20%" style="text-align:center;padding:8px;font-weight:bold;color:#d63031;font-size:14px;">${homeTeam}</td>
    <td width="60%" style="padding:4px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td width="${homeProb}%" style="background-color:#d63031;color:#fff;text-align:center;padding:8px 4px;font-weight:bold;font-size:13px;">${homeProb}%</td>
          <td width="${awayProb}%" style="background-color:#0984e3;color:#fff;text-align:center;padding:8px 4px;font-weight:bold;font-size:13px;">${awayProb}%</td>
        </tr>
      </table>
    </td>
    <td width="20%" style="text-align:center;padding:8px;font-weight:bold;color:#0984e3;font-size:14px;">${awayTeam}</td>
  </tr>
  ${odds.over_under_line ? `<tr><td colspan="3" style="text-align:center;padding:8px 0;font-size:13px;color:#888;">오버/언더: ${odds.over_under_line}</td></tr>` : ''}
</table>` : ''

  // 선발 투수 카드 (table 기반)
  const pitcherCard = `
<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;border:1px solid #ddd;border-collapse:collapse;">
  <tr><td colspan="3" style="text-align:center;padding:10px;font-weight:bold;font-size:16px;background-color:#f5f5f5;border-bottom:1px solid #ddd;">⚾ 선발 투수 매치업</td></tr>
  <tr>
    <td width="42%" style="text-align:center;padding:16px 8px;background-color:#fff5f5;border-right:1px solid #eee;">
      <p style="margin:0 0 6px 0;font-weight:bold;color:#d63031;font-size:14px;">${homeTeam}</p>
      <p style="margin:0 0 6px 0;font-size:18px;font-weight:bold;">${pitcher.home.name}</p>
      <p style="margin:0;font-size:12px;color:#888;">ERA ${pitcher.home.era??'-'} | WHIP ${pitcher.home.whip??'-'} | K ${pitcher.home.k??'-'}</p>
    </td>
    <td width="16%" style="text-align:center;font-size:22px;font-weight:bold;color:#ccc;">VS</td>
    <td width="42%" style="text-align:center;padding:16px 8px;background-color:#f0f8ff;border-left:1px solid #eee;">
      <p style="margin:0 0 6px 0;font-weight:bold;color:#0984e3;font-size:14px;">${awayTeam}</p>
      <p style="margin:0 0 6px 0;font-size:18px;font-weight:bold;">${pitcher.away.name}</p>
      <p style="margin:0;font-size:12px;color:#888;">ERA ${pitcher.away.era??'-'} | WHIP ${pitcher.away.whip??'-'} | K ${pitcher.away.k??'-'}</p>
    </td>
  </tr>
</table>`

  // 배당 카드 제거 (사용 안함)

  // 섹션 빌더 — 네이버 블로그 최적화 (div margin 대신 table 구분선 사용)
  const section = (title: string, body: string, icon: string) => {
    if (!body) return ''
    // 연속 줄바꿈을 하나로 축소, 문단 사이만 <br> 하나
    const htmlBody = body.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>')
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0;"><tr><td style="padding:16px 0 6px 0;font-size:17px;font-weight:bold;color:#2d3436;border-bottom:2px solid #eee;">${icon} ${title}</td></tr><tr><td style="padding:10px 0 8px 0;font-size:15px;line-height:1.8;color:#333;">${htmlBody}</td></tr></table>`
  }

  return `<div style="max-width:680px;margin:0 auto;">
<p style="text-align:center;font-size:13px;color:#0984e3;font-weight:bold;margin:0 0 2px 0;">${leagueNames[league]||league} | ${matchDate} ${matchTime}</p>
<p style="text-align:center;font-size:24px;font-weight:bold;color:#2d3436;margin:0 0 2px 0;">${homeTeam} vs ${awayTeam}</p>
<p style="text-align:center;font-size:14px;color:#999;margin:0 0 12px 0;">AI 데이터 기반 경기 분석 프리뷰</p>
${probBar}
${pitcherCard}
${section(parsed.section1_title||'매치 프리뷰', parsed.section1, '⚾')}
${section(parsed.section2_title||'선발 투수 매치업', parsed.section2, '🏏')}
${section(parsed.section3_title||'팀 전력 분석', parsed.section3, '📊')}
${section(parsed.section4_title||'AI 승부예측', parsed.section4, '🎯')}
<p style="font-size:14px;color:#0984e3;margin:16px 0 0 0;">${(parsed.tags || []).map((t: string) => `#${t}`).join(' ')}</p>
<p style="text-align:center;margin:12px 0 0 0;"><a href="https://www.trendsoccer.com/baseball" target="_blank"><img src="https://www.trendsoccer.com/1200x200.png" alt="TrendSoccer" style="max-width:100%;width:680px;" /></a></p>
</div>`
}

// ─── 유틸 ───
function getTomorrowKST(): string {
  const now = new Date()
  now.setHours(now.getHours() + 9)
  now.setDate(now.getDate() + 1)
  return now.toISOString().split('T')[0]
}
