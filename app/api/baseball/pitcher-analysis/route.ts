// app/api/baseball/pitcher-analysis/route.ts
// matchId 기준 Supabase 캐싱 - 있으면 재사용, 없을 때만 Claude 호출

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function formatStat(value: any, decimals = 2) {
  const n = parseFloat(value)
  return isNaN(n) ? '-' : n.toFixed(decimals)
}

function buildPitcherBlock(
  label: string,
  name: string | null | undefined,
  stats: any | null
) {
  // Label is already localized ('Home'/'Away' or '홈'/'원정')
  if (!name && !stats) return `[${label}] Starter: TBD`

  const isMLB = stats && ('current' in stats || 'prev' in stats)

  if (isMLB) {
    const displayName = stats?.fullName ?? name
    if (!displayName) return `[${label}] Starter: TBD`
    const s = stats?.current ?? stats?.prev
    const season = stats?.current ? stats.current.season : (stats?.prev?.season ?? 'prev')
    if (!s) return `[${label}] ${displayName} — No stats`
    return `[${label}] ${displayName} — ${season} Season
  ERA ${formatStat(s.era)} | WHIP ${formatStat(s.whip)} | K/9 ${s.strikeoutsPer9Inn ? formatStat(s.strikeoutsPer9Inn, 1) : '-'} | BB/9 ${s.walksPer9Inn ? formatStat(s.walksPer9Inn, 1) : '-'} | K/BB ${s.strikeoutWalkRatio ? formatStat(s.strikeoutWalkRatio, 2) : '-'}
  ${s.wins ?? 0}W ${s.losses ?? 0}L | ${s.gamesStarted ?? '-'} GS | ${formatStat(s.inningsPitched, 1)}IP | ${s.strikeOuts ?? '-'}K | BB ${s.baseOnBalls ?? '-'} | HR ${s.homeRuns ?? '-'}`
  }

  // KBO/NPB flat
  const displayName = stats?.name ?? name
  if (!displayName) return `[${label}] Starter: TBD`

  const isRookie = stats?.is_rookie === true
  const proYears = stats?.pro_years ?? null
  const rookieTag = isRookie
    ? ` (Rookie${proYears ? ` · Pro Year ${proYears}` : ''})`
    : ''

  if (!stats || (stats.era === null && stats.whip === null)) {
    return `[${label}] ${displayName}${rookieTag} — No stats`
  }

  const g = stats.games ?? 0
  const k = stats.strikeouts ?? 0
  const bb = stats.walks ?? 0
  const kPerGame = g > 0 ? formatStat(k / g, 1) : '-'
  const kbb = bb > 0 ? formatStat(k / bb, 2) : '-'

  const smallSampleTag = isRookie && g < 10 ? ' [Small Sample]' : ''

  return `[${label}] ${displayName}${rookieTag}${smallSampleTag} — ${stats.season ?? '2025'} Season
  ERA ${formatStat(stats.era)} | WHIP ${formatStat(stats.whip)} | K/G ${kPerGame} | K/BB ${kbb}
  ${stats.wins ?? 0}W ${stats.losses ?? 0}L | ${g}G | ${k}K | BB ${bb} | HR ${stats.home_runs ?? '-'}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId, homeTeam, awayTeam, homePitcher, awayPitcher, homeStats, awayStats, league, language: uiLang } = body
    const isEnglish = uiLang === 'en'

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ success: false, error: 'homeTeam, awayTeam required' }, { status: 400 })
    }

    // 1. 캐시 확인 (한국어만 캐시 사용, 영어는 매번 생성)
    if (matchId && !isEnglish) {
      const { data: cached } = await supabase
        .from('baseball_matches')
        .select('pitcher_analysis')
        .eq('id', matchId)
        .maybeSingle()

      if (cached?.pitcher_analysis) {
        console.log(`[pitcher-analysis] cache hit: ${matchId}`)
        return NextResponse.json({ success: true, analysis: cached.pitcher_analysis, cached: true })
      }
    }

    // 2. Claude 호출
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
    }

    const homeLabel = isEnglish ? 'Home' : '홈'
    const awayLabel = isEnglish ? 'Away' : '원정'
    const homeBlock = buildPitcherBlock(homeLabel, homePitcher, homeStats)
    const awayBlock = buildPitcherBlock(awayLabel, awayPitcher, awayStats)

    const leagueLabel = league === 'KBO' ? 'KBO Korean Baseball' : league === 'NPB' ? 'NPB Japanese Baseball' : 'MLB Major League Baseball'
    const leagueLabelKo = league === 'KBO' ? 'KBO 한국프로야구' : league === 'NPB' ? 'NPB 일본프로야구' : 'MLB 메이저리그'

    const prompt = isEnglish
      ? `You are a ${leagueLabel} expert analyst. Based on the starting pitcher data below, write a matchup analysis for today's game in English.

Game: ${awayTeam} @ ${homeTeam}

${awayBlock}
${homeBlock}

Writing rules:
- Around 200 words, 3-4 sentences
- Directly cite stat numbers in analysis (ERA, WHIP, K, etc.)
- If a pitcher has "no stats", only mention their name and add "data unavailable"
- "(Rookie)" tagged pitchers: briefly mention limited pro experience, no excessive speculation
- "[Small Sample]" tagged pitchers: must mention low stat reliability due to small sample size
- Compare pitchers' stat-based strengths/weaknesses → today's key matchup factors → variables to watch
- Use baseball terminology naturally (ERA, WHIP, command, strikeouts, home runs allowed, etc.)
- No vague speculation without stat backing
- Do not mention pitch hand (left/right) as data is unverified
- No markdown (#, *, **, -) at all
- Body text only, no titles, no numbering, write naturally flowing sentences`
      : `당신은 ${leagueLabelKo} 전문 분석가입니다. 아래 선발 투수 데이터를 바탕으로 오늘 경기 매치업 분석을 한국어로 작성하세요.

경기: ${awayTeam} @ ${homeTeam}

${awayBlock}
${homeBlock}

작성 규칙:
- 200자 내외, 3~4문장
- 반드시 위 스탯 수치를 직접 인용하여 분석 (ERA, WHIP, K 등 숫자 명시)
- 스탯이 "스탯 없음"인 투수는 수치 언급 없이 이름만 사용하고 "데이터 미확보" 한 마디만 추가
- "(신인)" 태그 투수는 프로 경험이 부족한 점을 짧게 언급하되 과도한 추측 금지
- "[소량 샘플]" 태그 투수는 샘플이 적어 스탯 신뢰도가 낮음을 반드시 언급
- 두 투수의 스탯 기반 강점/약점 비교 → 오늘 승부 포인트 → 주목 변수 순서로
- 야구 전문 용어 자연스럽게 사용 (ERA, WHIP, 제구력, 탈삼진, 피홈런 등)
- 스탯 데이터 없이 막연한 추측성 분석 절대 금지 ("~것으로 예상됩니다" 남발 금지)
- 좌완/우완 등 투구 방향 언급 금지 (데이터 미검증)
- 마크다운(#, *, **, -) 절대 사용 금지
- 제목 없이 본문만, 번호 매기기 없이 자연스럽게 이어 쓰기`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[pitcher-analysis] Anthropic error:', data)
      return NextResponse.json(
        { success: false, error: data.error?.message ?? 'Anthropic API error' },
        { status: res.status }
      )
    }

    const analysis = data.content?.[0]?.text?.trim() ?? null
    if (!analysis) {
      return NextResponse.json({ success: false, error: 'Empty response from Claude' }, { status: 500 })
    }

    // 3. Supabase에 캐시 저장 (한국어만)
    if (matchId && !isEnglish) {
      await supabase
        .from('baseball_matches')
        .update({ pitcher_analysis: analysis })
        .eq('id', matchId)
      console.log(`[pitcher-analysis] cached: ${matchId}`)
    }

    return NextResponse.json({ success: true, analysis, cached: false })

  } catch (error: any) {
    console.error('[pitcher-analysis] error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}