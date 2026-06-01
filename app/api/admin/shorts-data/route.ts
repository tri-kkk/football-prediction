// app/api/admin/shorts-data/route.ts
// 야구 쇼츠 생성용 데이터 API
// GET /api/admin/shorts-data?league=KBO

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEAM_META: Record<string, { ab: string; c1: string; c2: string }> = {
  'LG':   { ab: 'LG',  c1: '#C30452', c2: '#000000' },
  'KT':   { ab: 'KT',  c1: '#000000', c2: '#EB1C24' },
  'SSG':  { ab: 'SSG', c1: '#CE0E2D', c2: '#FFBD00' },
  '두산': { ab: 'OB',  c1: '#131230', c2: '#FFFFFF' },
  'KIA':  { ab: 'KIA', c1: '#EA0029', c2: '#06141F' },
  '롯데': { ab: 'LT',  c1: '#041E42', c2: '#D00F31' },
  '삼성': { ab: 'SS',  c1: '#074CA1', c2: '#FFFFFF' },
  '한화': { ab: 'HH',  c1: '#FF6600', c2: '#000000' },
  'NC':   { ab: 'NC',  c1: '#315288', c2: '#C8A97E' },
  '키움': { ab: 'KW',  c1: '#820024', c2: '#000000' },
  '요미우리':   { ab: 'YG', c1: '#F97709', c2: '#000000' },
  '한신':       { ab: 'HT', c1: '#FEFC0F', c2: '#000000' },
  '주니치':     { ab: 'CD', c1: '#002A5F', c2: '#FFFFFF' },
  '히로시마':   { ab: 'HC', c1: '#FF2800', c2: '#FFFFFF' },
  '야쿠르트':   { ab: 'YS', c1: '#073190', c2: '#C8C8C8' },
  '요코하마':   { ab: 'YB', c1: '#0055A5', c2: '#FFFFFF' },
  '소프트뱅크': { ab: 'SB', c1: '#FBC600', c2: '#000000' },
  '오릭스':     { ab: 'OB', c1: '#000019', c2: '#B58853' },
  '지바롯데':   { ab: 'CM', c1: '#000000', c2: '#C0C0C0' },
  '라쿠텐':     { ab: 'RE', c1: '#85052F', c2: '#000000' },
  '세이부':     { ab: 'SL', c1: '#1A3F84', c2: '#FFFFFF' },
  '니혼햄':     { ab: 'NH', c1: '#005CA9', c2: '#FFFFFF' },
}

function starsFromGap(gap: number): number {
  if (gap >= 40) return 5
  if (gap >= 25) return 4
  if (gap >= 15) return 3
  if (gap >= 7)  return 2
  return 1
}

function pickWinRate(m: any): { home: number; away: number } | null {
  const cand = m.aiPrediction ?? m.mlPrediction ?? m.odds
  if (cand?.homeWinProb != null && cand?.awayWinProb != null) {
    let h = cand.homeWinProb
    let a = cand.awayWinProb
    if (h <= 1 && a <= 1) { h = h * 100; a = a * 100 }
    return { home: Math.round(h), away: Math.round(a) }
  }
  return null
}

function teamMeta(ko: string) {
  return TEAM_META[ko] ?? { ab: ko.slice(0, 2).toUpperCase(), c1: '#1f2937', c2: '#ffffff' }
}

// MLB statsapi.mlb.com에서 투수 시즌 스탯 조회
// 디테일 페이지(/baseball/[id]/page.tsx)와 동일한 엔드포인트 사용
async function fetchMLBPitcherStat(pitcherId: number, season: number): Promise<any | null> {
  try {
    const r = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${pitcherId}?hydrate=stats(group=[pitching],type=[season],season=${season})`,
      { signal: AbortSignal.timeout(5000), cache: 'no-store' }
    )
    if (!r.ok) return null
    const d = await r.json()
    return d?.people?.[0]?.stats?.[0]?.splits?.[0]?.stat ?? null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const league = (searchParams.get('league') || 'KBO').toUpperCase()

  try {
    const origin = request.nextUrl.origin
    const url = `${origin}/api/baseball/matches?league=${encodeURIComponent(league)}&status=scheduled&limit=50`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `baseball matches API error (${res.status})`, games: [] },
        { status: 500 }
      )
    }
    const json = await res.json()
    const matches: any[] = Array.isArray(json?.matches) ? json.matches : []

    const apiIds = matches.map((m) => m.id).filter((x) => x != null)
    const pitcherMap = new Map<number, any>()
    if (apiIds.length > 0) {
      const { data: rows } = await supabase
        .from('baseball_matches')
        .select(
          'api_match_id, ' +
          'home_pitcher, home_pitcher_ko, home_pitcher_id, home_pitcher_era, home_pitcher_whip, home_pitcher_k, ' +
          'away_pitcher, away_pitcher_ko, away_pitcher_id, away_pitcher_era, away_pitcher_whip, away_pitcher_k'
        )
        .in('api_match_id', apiIds)
      if (rows) {
        for (const r of rows) pitcherMap.set(r.api_match_id, r)
      }
    }

    // MLB 매치인 경우 statsapi.mlb.com에서 투수 스탯 추가 조회
    //  - baseball_matches에 home_pitcher_id가 있지만 ERA 등은 비어있는 경우
    //  - 현재 시즌 → 없으면 전 시즌 fallback
    const mlbStatsMap = new Map<number, { era: number | null; whip: number | null; k: number | null }>()
    if (league === 'MLB') {
      const idSet = new Set<number>()
      for (const m of matches) {
        const pd = pitcherMap.get(m.id)
        const hid = pd?.home_pitcher_id ?? m.homePitcherId ?? null
        const aid = pd?.away_pitcher_id ?? m.awayPitcherId ?? null
        if (typeof hid === 'number') idSet.add(hid)
        if (typeof aid === 'number') idSet.add(aid)
      }
      const ids = Array.from(idSet)
      const currentSeason = new Date().getFullYear()
      const prevSeason = currentSeason - 1
      const fetched = await Promise.all(ids.map(async (id) => {
        let stat = await fetchMLBPitcherStat(id, currentSeason)
        if (!stat || stat.era == null) {
          const prev = await fetchMLBPitcherStat(id, prevSeason)
          if (prev) stat = stat ?? prev
          if (prev && (stat?.era == null)) stat = prev
        }
        return { id, stat }
      }))
      for (const { id, stat } of fetched) {
        if (!stat) continue
        const toNum = (v: any) => v == null || v === '' || v === '-.--' ? null : Number(v)
        mlbStatsMap.set(id, {
          era: toNum(stat.era),
          whip: toNum(stat.whip),
          k: toNum(stat.strikeOuts),
        })
      }
      console.log('[shorts-data] MLB stats fetched:', mlbStatsMap.size, '/', ids.length)
    }

    // baseball_ai_cache에서 Claude 투수 분석 조회 (캐시된 ko 분석)
    const aiAnalysisMap = new Map<number, string>()
    if (apiIds.length > 0) {
      const { data: cacheRows } = await supabase
        .from('baseball_ai_cache')
        .select('match_key, payload, expires_at')
        .eq('kind', 'pitcher_analysis')
        .eq('language', 'ko')
        .in('match_key', apiIds.map(String))
      if (cacheRows) {
        const now = Date.now()
        for (const r of cacheRows) {
          try {
            if (new Date(r.expires_at).getTime() > now) {
              const analysis = r.payload?.analysis
              if (typeof analysis === 'string' && analysis.trim()) {
                aiAnalysisMap.set(Number(r.match_key), analysis)
              }
            }
          } catch {}
        }
      }
    }

    const games = matches
      .map((m) => {
        const winRate = pickWinRate(m)
        if (!winRate) return null

        const gap = Math.abs(winRate.home - winRate.away)
        const stars = starsFromGap(gap)
        const pickSide: 'home' | 'away' = winRate.home >= winRate.away ? 'home' : 'away'
        const homeKo = m.homeTeamKo || m.homeTeam
        const awayKo = m.awayTeamKo || m.awayTeam
        const pickTeam = pickSide === 'home' ? homeKo : awayKo

        const hMeta = teamMeta(homeKo)
        const aMeta = teamMeta(awayKo)

        const pData = pitcherMap.get(m.id)
        const homePitcherName = pData?.home_pitcher_ko || pData?.home_pitcher || m.homePitcherKo || m.homePitcher || null
        const awayPitcherName = pData?.away_pitcher_ko || pData?.away_pitcher || m.awayPitcherKo || m.awayPitcher || null
        // 이름만 있어도 표시 (ERA 없으면 컴포넌트에서 "-" 처리)
        const hasPitchers = !!(homePitcherName && awayPitcherName)

        // MLB는 statsapi에서 가져온 stat을, KBO/NPB는 DB의 매치 컬럼 사용
        const hPid = pData?.home_pitcher_id ?? m.homePitcherId ?? null
        const aPid = pData?.away_pitcher_id ?? m.awayPitcherId ?? null
        const hMLB = (typeof hPid === 'number') ? mlbStatsMap.get(hPid) : null
        const aMLB = (typeof aPid === 'number') ? mlbStatsMap.get(aPid) : null

        const pitchers = hasPitchers
          ? {
              home: {
                name: homePitcherName,
                era:  hMLB?.era  ?? pData?.home_pitcher_era  ?? null,
                whip: hMLB?.whip ?? pData?.home_pitcher_whip ?? null,
                k:    hMLB?.k    ?? pData?.home_pitcher_k    ?? null,
              },
              away: {
                name: awayPitcherName,
                era:  aMLB?.era  ?? pData?.away_pitcher_era  ?? null,
                whip: aMLB?.whip ?? pData?.away_pitcher_whip ?? null,
                k:    aMLB?.k    ?? pData?.away_pitcher_k    ?? null,
              },
            }
          : null

        return {
          id: m.id,
          dbId: m.dbId,
          league: m.league,
          home: {
            ko: homeKo, en: m.homeTeam,
            ab: hMeta.ab, c1: hMeta.c1, c2: hMeta.c2,
            logo: m.homeLogo || '',
          },
          away: {
            ko: awayKo, en: m.awayTeam,
            ab: aMeta.ab, c1: aMeta.c1, c2: aMeta.c2,
            logo: m.awayLogo || '',
          },
          winRate,
          pick: {
            team: pickTeam,
            side: pickSide,
            stars,
            confidence: m.aiPickConfidence ?? null,
            grade: m.aiPrediction?.grade ?? null,
          },
          pitchers,
          aiAnalysis: aiAnalysisMap.get(m.id) || null,
          matchTime: m.timestamp || m.date,
          matchDate: m.date,
          status: m.status,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ success: true, count: games.length, league, games })
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'Unknown error', games: [] },
      { status: 500 }
    )
  }
}
