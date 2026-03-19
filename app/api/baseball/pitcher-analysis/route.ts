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
  stats: { current?: any; prev?: any; fullName?: string; pitchHand?: string } | null
) {
  const displayName = stats?.fullName ?? name
  if (!displayName) return `[${label}] 선발: 미정`

  const s = stats?.current ?? stats?.prev
  const season = stats?.current ? stats.current.season : (stats?.prev?.season ?? '전년도')
  if (!s) return `[${label}] ${displayName} — 스탯 없음`

  return `[${label}] ${displayName} — ${season}시즌
  ERA ${formatStat(s.era)} | WHIP ${formatStat(s.whip)} | K/9 ${s.strikeoutsPer9Inn ? formatStat(s.strikeoutsPer9Inn, 1) : '-'} | BB/9 ${s.walksPer9Inn ? formatStat(s.walksPer9Inn, 1) : '-'} | K/BB ${s.strikeoutWalkRatio ? formatStat(s.strikeoutWalkRatio, 2) : '-'}
  ${s.wins ?? 0}승 ${s.losses ?? 0}패 | ${s.gamesStarted ?? '-'}선발 | ${formatStat(s.inningsPitched, 1)}IP | ${s.strikeOuts ?? '-'}K | BB ${s.baseOnBalls ?? '-'} | HR ${s.homeRuns ?? '-'}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { matchId, homeTeam, awayTeam, homePitcher, awayPitcher, homeStats, awayStats } = body

    if (!homeTeam || !awayTeam) {
      return NextResponse.json({ success: false, error: 'homeTeam, awayTeam required' }, { status: 400 })
    }

    // 1. 캐시 확인
    if (matchId) {
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

    const homeBlock = buildPitcherBlock('홈', homePitcher, homeStats)
    const awayBlock = buildPitcherBlock('원정', awayPitcher, awayStats)

    const prompt = `당신은 MLB 야구 전문 분석가입니다. 아래 선발 투수 데이터를 바탕으로 오늘 경기 매치업 분석을 한국어로 작성하세요.

경기: ${awayTeam} @ ${homeTeam}

${awayBlock}
${homeBlock}

작성 규칙:
- 200자 내외, 3~4문장
- 두 투수의 스탯 기반 강점/약점 비교 → 오늘 승부 포인트 → 주목 변수 순서로
- 야구 전문 용어 자연스럽게 사용 (ERA, WHIP, 제구력, 탈삼진, 피홈런 등)
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

    // 3. Supabase에 캐시 저장
    if (matchId) {
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