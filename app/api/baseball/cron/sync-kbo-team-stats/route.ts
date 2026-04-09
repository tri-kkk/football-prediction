// app/api/baseball/cron/sync-kbo-team-stats/route.ts
// KBO 팀 시즌 타격/투구 통계 수집 (koreabaseball.com Team 페이지 스크래핑)
//
// GET /api/baseball/cron/sync-kbo-team-stats            → 현재 시즌
// GET /api/baseball/cron/sync-kbo-team-stats?season=2026
// GET /api/baseball/cron/sync-kbo-team-stats?dry=true   → DB 업데이트 안 함
//
// 데이터 소스:
//   - 타격: koreabaseball.com/Record/Team/Hitter.aspx
//   - 투구: koreabaseball.com/Record/Team/Pitcher.aspx
//
// Supabase Cron 추천 스케줄: 매일 05:00 KST (경기 종료 후)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ===================================================================
// 팀 이름 매핑 — 스크래핑 결과(한글 약어/풀네임)를 DB 표준명으로
// ===================================================================
const KBO_TEAM_ALIASES: Record<string, string[]> = {
  '한화': ['한화', '한화 이글스', 'Hanwha Eagles'],
  'KT':   ['KT', 'KT 위즈', 'KT Wiz'],
  'LG':   ['LG', 'LG 트윈스', 'LG Twins'],
  'SSG':  ['SSG', 'SSG 랜더스', 'SSG Landers'],
  '키움': ['키움', '키움 히어로즈', 'Kiwoom Heroes'],
  '롯데': ['롯데', '롯데 자이언츠', 'Lotte Giants'],
  '삼성': ['삼성', '삼성 라이온즈', 'Samsung Lions'],
  '두산': ['두산', '두산 베어스', 'Doosan Bears'],
  'KIA':  ['KIA', 'KIA 타이거즈', 'KIA Tigers'],
  'NC':   ['NC', 'NC 다이노스', 'NC Dinos'],
}

const TEAM_TO_SHORT: Record<string, string> = {}
for (const [short, aliases] of Object.entries(KBO_TEAM_ALIASES)) {
  for (const alias of aliases) TEAM_TO_SHORT[alias.toLowerCase()] = short
  TEAM_TO_SHORT[short.toLowerCase()] = short
}

function normalizeTeamName(name: string): string | null {
  const lower = name.trim().toLowerCase()
  if (!lower) return null
  if (TEAM_TO_SHORT[lower]) return TEAM_TO_SHORT[lower]
  for (const [key, short] of Object.entries(TEAM_TO_SHORT)) {
    if (lower.includes(key) || key.includes(lower)) return short
  }
  // 알 수 없는 팀명(예: 합계 row의 colspan으로 어긋난 값)은 거부
  return null
}

// 행 전체에 '합계' 또는 '합 계' 셀이 있으면 totals row로 간주
function isTotalsRow(cells: string[]): boolean {
  return cells.some(c => c === '합계' || c === '합 계' || c === 'TOTAL' || c === 'Total')
}

// ===================================================================
// HTML 파싱 유틸
// ===================================================================
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

function extractCells(rowHtml: string): string[] {
  const cells: string[] = []
  const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
  let m: RegExpExecArray | null
  while ((m = cellRegex.exec(rowHtml)) !== null) {
    cells.push(m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
  }
  return cells
}

function safeParseFloat(val: string): number | null {
  if (!val || val === '-') return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function safeParseInt(val: string): number | null {
  if (!val || val === '-') return null
  const n = parseInt(val.replace(/,/g, ''), 10)
  return isNaN(n) ? null : n
}

// 헤더(thead) + 바디(tbody) 파싱 → 헤더 키 기반 컬럼 맵 생성
interface ParsedTeamRow {
  byHeader: Record<string, string>
  cells: string[]
}

function parseTeamTable(html: string): ParsedTeamRow[] {
  // thead → 컬럼 헤더 추출
  const theadMatch = html.match(/<thead[\s\S]*?<\/thead>/i)
  let headers: string[] = []
  if (theadMatch) {
    const lastTr = [...theadMatch[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].pop()
    if (lastTr) headers = extractCells(lastTr[1]).map(h => h.toUpperCase())
  }

  // tbody → 각 행 파싱
  const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/i)
  if (!tbodyMatch) return []
  const trs = [...tbodyMatch[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]

  const rows: ParsedTeamRow[] = []
  for (const tr of trs) {
    const cells = extractCells(tr[1])
    if (cells.length < 3) continue
    const byHeader: Record<string, string> = {}
    for (let i = 0; i < cells.length; i++) {
      const key = headers[i] || `col_${i}`
      byHeader[key] = cells[i]
    }
    rows.push({ byHeader, cells })
  }
  return rows
}

// ===================================================================
// Hitter 파싱
// ===================================================================
interface TeamHittingStats {
  teamRaw: string
  team: string     // 정규화된 약어
  avg: number | null
  obp: number | null
  slg: number | null
  ops: number | null
  hr: number | null
  atBats: number | null
  hits: number | null
  runs: number | null
  rbi: number | null
}

async function fetchKboHtml(url: string, label: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://www.koreabaseball.com/',
      'Upgrade-Insecure-Requests': '1',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`${label} page ${res.status}`)
  return res.text()
}

async function fetchTeamHitter(season: string): Promise<TeamHittingStats[]> {
  // Basic1: 순위,팀명,AVG,G,PA,AB,R,H,2B,3B,HR,TB,RBI,SAC,SF
  // Basic2: 순위,팀명,AVG,BB,IBB,HBP,SO,GDP,SLG,OBP,OPS,MH,RISP,PH-BA
  const [html1, html2] = await Promise.all([
    fetchKboHtml('https://www.koreabaseball.com/Record/Team/Hitter/Basic1.aspx', 'Hitter/Basic1'),
    fetchKboHtml('https://www.koreabaseball.com/Record/Team/Hitter/Basic2.aspx', 'Hitter/Basic2').catch(e => {
      console.warn(`  ⚠️ Hitter/Basic2 fetch 실패 (OBP/SLG/OPS는 비어있을 수 있음):`, e.message)
      return ''
    }),
  ])
  const rows1 = parseTeamTable(html1)
  const rows2 = html2 ? parseTeamTable(html2) : []
  console.log(`  📊 [Hitter] parsed ${rows1.length} basic rows + ${rows2.length} extended rows`)
  // Hitter2의 행을 정규화된 팀 키로 인덱싱
  const ext = new Map<string, Record<string, string>>()
  for (const r of rows2) {
    if (isTotalsRow(r.cells)) continue
    const tRaw = r.byHeader['팀명'] || r.byHeader['팀'] || r.byHeader['TEAM'] || r.cells[1] || ''
    const t = normalizeTeamName(tRaw)
    if (t) ext.set(t, r.byHeader)
  }
  const rows = rows1

  const result: TeamHittingStats[] = []
  for (const row of rows) {
    // 합계/Total 행 스킵 (colspan 때문에 byHeader가 어긋날 수 있어 cells 전체 검사)
    if (isTotalsRow(row.cells)) continue
    // 팀명 컬럼: "팀명" 또는 "팀" 또는 "TEAM"
    const teamRaw =
      row.byHeader['팀명'] || row.byHeader['팀'] || row.byHeader['TEAM'] || row.cells[1] || ''
    if (!teamRaw) continue
    const team = normalizeTeamName(teamRaw)
    if (!team) {
      console.log(`  ⚠️ [Hitter] 알 수 없는 팀명 스킵: "${teamRaw}"`)
      continue
    }

    const extRow = ext.get(team) || {}
    const get = (...keys: string[]) => {
      for (const k of keys) {
        if (row.byHeader[k] != null && row.byHeader[k] !== '') return row.byHeader[k]
        if (extRow[k] != null && extRow[k] !== '') return extRow[k]
      }
      return ''
    }

    const obp = safeParseFloat(get('OBP', '출루율'))
    const slg = safeParseFloat(get('SLG', '장타율'))
    let ops = safeParseFloat(get('OPS'))
    if (ops == null && obp != null && slg != null) ops = Math.round((obp + slg) * 1000) / 1000

    result.push({
      teamRaw,
      team,
      avg:     safeParseFloat(get('AVG', '타율')),
      obp,
      slg,
      ops,
      hr:      safeParseInt(get('HR', '홈런')),
      atBats:  safeParseInt(get('AB', '타수')),
      hits:    safeParseInt(get('H', '안타')),
      runs:    safeParseInt(get('R', '득점')),
      rbi:     safeParseInt(get('RBI', '타점')),
    })
  }
  return result
}

// ===================================================================
// Pitcher 파싱
// ===================================================================
interface TeamPitchingStats {
  teamRaw: string
  team: string
  era: number | null
  whip: number | null
  oppAvg: number | null
  ip: string | null
  strikeouts: number | null
  walks: number | null
}

async function fetchTeamPitcher(season: string): Promise<TeamPitchingStats[]> {
  // Basic1: 순위,팀명,ERA,G,W,L,SV,HLD,WPCT,IP,H,HR,BB,HBP,SO,R,ER,WHIP (WHIP 포함!)
  // Basic2: 순위,팀명,ERA,CG,SHO,QS,BSV,TBF,NP,AVG(피안타율),2B,3B,SAC,SF,IBB,WP,BK
  const [html1, html2] = await Promise.all([
    fetchKboHtml('https://www.koreabaseball.com/Record/Team/Pitcher/Basic1.aspx', 'Pitcher/Basic1'),
    fetchKboHtml('https://www.koreabaseball.com/Record/Team/Pitcher/Basic2.aspx', 'Pitcher/Basic2').catch(e => {
      console.warn(`  ⚠️ Pitcher/Basic2 fetch 실패 (피안타율은 비어있을 수 있음):`, e.message)
      return ''
    }),
  ])
  const rows1 = parseTeamTable(html1)
  const rows2 = html2 ? parseTeamTable(html2) : []
  console.log(`  📊 [Pitcher] parsed ${rows1.length} basic rows + ${rows2.length} extended rows`)
  // Pitcher2의 행을 정규화된 팀 키로 인덱싱
  const ext = new Map<string, Record<string, string>>()
  for (const r of rows2) {
    if (isTotalsRow(r.cells)) continue
    const tRaw = r.byHeader['팀명'] || r.byHeader['팀'] || r.byHeader['TEAM'] || r.cells[1] || ''
    const t = normalizeTeamName(tRaw)
    if (t) ext.set(t, r.byHeader)
  }

  const result: TeamPitchingStats[] = []
  for (const row of rows1) {
    if (isTotalsRow(row.cells)) continue
    const teamRaw =
      row.byHeader['팀명'] || row.byHeader['팀'] || row.byHeader['TEAM'] || row.cells[1] || ''
    if (!teamRaw) continue
    const team = normalizeTeamName(teamRaw)
    if (!team) {
      console.log(`  ⚠️ [Pitcher] 알 수 없는 팀명 스킵: "${teamRaw}"`)
      continue
    }

    const extRow = ext.get(team) || {}
    const get = (...keys: string[]) => {
      for (const k of keys) {
        if (row.byHeader[k] != null && row.byHeader[k] !== '') return row.byHeader[k]
        if (extRow[k] != null && extRow[k] !== '') return extRow[k]
      }
      return ''
    }

    // WHIP 직접 못 찾으면 H/IP 비율로 근사 (BB+H)/IP
    let whip = safeParseFloat(get('WHIP'))
    if (whip == null) {
      const ipStr = get('IP', '이닝')
      const hits = safeParseInt(get('H', '피안타'))
      const bb = safeParseInt(get('BB', '볼넷'))
      // KBO IP 형식 "1290.1" = 1290 + 1/3 이닝
      if (ipStr && hits != null && bb != null) {
        const ipParts = ipStr.split('.')
        const fullIp = parseInt(ipParts[0], 10) + (ipParts[1] ? parseInt(ipParts[1], 10) / 3 : 0)
        if (fullIp > 0) whip = Math.round(((bb + hits) / fullIp) * 100) / 100
      }
    }

    result.push({
      teamRaw,
      team,
      era:        safeParseFloat(get('ERA', '방어율')),
      whip,
      // Pitcher2의 'AVG' 컬럼은 피안타율. Pitcher1에는 AVG 컬럼이 없으므로 충돌 없음.
      oppAvg:     safeParseFloat(get('AVG', '피안타율', '피타율', 'OAVG')),
      ip:         get('IP', '이닝') || null,
      strikeouts: safeParseInt(get('SO', 'K', '삼진')),
      walks:      safeParseInt(get('BB', '볼넷')),
    })
  }
  return result
}

// ===================================================================
// DB 저장 — baseball_team_season_stats 테이블에 upsert
// ===================================================================
async function upsertTeamStats(
  league: 'KBO',
  season: string,
  hitting: TeamHittingStats[],
  pitching: TeamPitchingStats[],
) {
  // 팀별로 병합
  const merged = new Map<string, {
    team: string
    hit?: TeamHittingStats
    pit?: TeamPitchingStats
  }>()

  for (const h of hitting) {
    if (!h.team) continue
    merged.set(h.team, { team: h.team, hit: h })
  }
  for (const p of pitching) {
    if (!p.team) continue
    const prev = merged.get(p.team)
    if (prev) prev.pit = p
    else merged.set(p.team, { team: p.team, pit: p })
  }

  let updated = 0
  let errors = 0

  for (const { team, hit, pit } of merged.values()) {
    // 풀네임으로 DB에 저장 (matches 테이블과 매칭하기 위해)
    const aliases = KBO_TEAM_ALIASES[team] || [team]
    const dbTeamName = aliases.find(a => a !== team && a.length > team.length) || team

    const payload: Record<string, any> = {
      team_name: dbTeamName,
      season,
      league,
      team_stats_updated_at: new Date().toISOString(),
    }

    if (hit) {
      payload.team_avg = hit.avg
      payload.team_obp = hit.obp
      payload.team_slg = hit.slg
      payload.team_ops = hit.ops
      payload.team_hr = hit.hr
      payload.team_at_bats = hit.atBats
      payload.team_hits_total = hit.hits
      payload.team_runs_total = hit.runs
      payload.team_rbi = hit.rbi
    }
    if (pit) {
      payload.team_era_real = pit.era
      payload.team_whip = pit.whip
      payload.team_opp_avg = pit.oppAvg
      payload.team_innings_pitched = pit.ip
      payload.team_k = pit.strikeouts
      payload.team_bb = pit.walks
    }

    // 기존 row 확인 (league+season+team_name unique 가정)
    const { data: existing } = await supabase
      .from('baseball_team_season_stats')
      .select('id, team_name')
      .eq('league', league)
      .eq('season', season)
      .in('team_name', aliases)
      .limit(1)
      .maybeSingle()

    let err: any = null
    if (existing) {
      const { error } = await supabase
        .from('baseball_team_season_stats')
        .update(payload)
        .eq('id', existing.id)
      err = error
    } else {
      const { error } = await supabase
        .from('baseball_team_season_stats')
        .insert(payload)
      err = error
    }

    if (err) {
      console.error(`  ❌ ${dbTeamName}:`, err.message)
      errors++
    } else {
      console.log(
        `  ✅ ${dbTeamName}: AVG ${hit?.avg ?? '-'} / OPS ${hit?.ops ?? '-'} / ERA ${pit?.era ?? '-'} / WHIP ${pit?.whip ?? '-'}`,
      )
      updated++
    }
  }

  return { updated, errors, total: merged.size }
}

// ===================================================================
// GET 핸들러
// ===================================================================
export async function GET(request: NextRequest) {
  // ── Cron 인증 (프로덕션에서 CRON_SECRET 설정 시 Bearer 검증) ──
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization') || ''
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const isDry = searchParams.get('dry') === 'true'
  const season = searchParams.get('season') || String(new Date(Date.now() + 9 * 3600 * 1000).getFullYear())

  console.log(`\n⚾ KBO 팀 시즌 스탯 수집 시작 — season=${season}${isDry ? ' (dry)' : ''}`)

  try {
    const [hitting, pitching] = await Promise.all([
      fetchTeamHitter(season).catch(e => {
        console.error('  ❌ Hitter fetch 실패:', e.message)
        return [] as TeamHittingStats[]
      }),
      fetchTeamPitcher(season).catch(e => {
        console.error('  ❌ Pitcher fetch 실패:', e.message)
        return [] as TeamPitchingStats[]
      }),
    ])

    if (hitting.length === 0 && pitching.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data parsed from either Hitter or Pitcher page',
        season,
      }, { status: 502 })
    }

    if (isDry) {
      return NextResponse.json({
        success: true,
        dry: true,
        season,
        hitting,
        pitching,
      })
    }

    const result = await upsertTeamStats('KBO', season, hitting, pitching)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`⏱️ 완료 (${elapsed}s): ${result.updated}/${result.total} 업데이트, 에러 ${result.errors}`)

    return NextResponse.json({
      success: true,
      season,
      hittingRows: hitting.length,
      pitchingRows: pitching.length,
      ...result,
      elapsed: `${elapsed}s`,
    })
  } catch (error: any) {
    console.error('❌ sync-kbo-team-stats 에러:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
