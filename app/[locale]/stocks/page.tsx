'use client'

// app/[locale]/stocks/page.tsx
// 팀 지수(주식화) 보드 — 리그별 실력 레이팅(Elo)을 종목처럼. /api/team-index 연결.
import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Pt = { date: string; v: number; note: string }
type Team = {
  team: string; teamId: number; index: number; lastChange: number
  hi: number; lo: number; played: number; lastResult: string; series: Pt[]
}
type Board = { league: string; leagueCode: string; asOf: string | null; leagueIndex: number | null; teams: Team[] }

const LEAGUES = [
  { code: 'PL', name: '프리미어리그' },
  { code: 'PD', name: '라리가' },
  { code: 'BL1', name: '분데스리가' },
  { code: 'SA', name: '세리에A' },
  { code: 'FL1', name: '리그1' },
]
const logo = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`
const LEAGUE_ID: Record<string, number> = { PL: 39, PD: 140, BL1: 78, SA: 135, FL1: 61 }
const lgLogo = (code: string) => `https://media.api-sports.io/football/leagues/${LEAGUE_ID[code]}.png`
const fmt = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1)
const arrow = (v: number) => (v > 0 ? '▲' : v < 0 ? '▼' : '·')
// 한국 증시 관례: 상승=빨강, 하락=파랑
const UP = '#ff6b78', DOWN = '#5ba0ff', FAINT = '#8a94a5', SUB = '#b4bdca', TEXT = '#eef2f8'
const GOLD = '#f0c65a'
const col = (v: number) => (v > 0 ? UP : v < 0 ? DOWN : FAINT)
const mono = 'ui-monospace,SFMono-Regular,Menlo,monospace'

function Spark({ series }: { series: Pt[] }) {
  const vs = series.map((p) => p.v)
  const n = vs.length
  if (n < 2) return <span style={{ color: FAINT }}>–</span>
  const mn = Math.min(...vs), mx = Math.max(...vs), rg = mx - mn || 1
  const W = 84, H = 26, pad = 2
  const pts = vs.map((v, i) => [pad + (i * (W - 2 * pad)) / (n - 1), H - pad - ((v - mn) / rg) * (H - 2 * pad)])
  const net = vs[n - 1] - vs[0], c = col(net)
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', marginLeft: 'auto' }}>
      <path d={d} fill="none" stroke={c} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[n - 1][0].toFixed(1)} cy={pts[n - 1][1].toFixed(1)} r={2.1} fill={c} />
    </svg>
  )
}

export default function StocksPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'ko'
  const openDetail = (id: number) => router.push(`/${locale}/stocks/${id}`)
  const [league, setLeague] = useState('PL')
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/team-index?league=${league}`, { cache: 'no-store' })
      .then((r) => r.json()).then((d: Board) => setBoard(d))
      .catch(() => setBoard(null)).finally(() => setLoading(false))
  }, [league])

  const movers = useMemo(() => {
    if (!board) return { up: [] as Team[], down: [] as Team[] }
    const s = [...board.teams].sort((a, b) => b.lastChange - a.lastChange)
    return { up: s.slice(0, 5), down: s.slice(-5).reverse() }
  }, [board])

  // 지수 강도 바 스케일 (리그 내 min~max)
  const range = useMemo(() => {
    if (!board || !board.teams.length) return { lo: 0, hi: 1 }
    const vs = board.teams.map((t) => t.index)
    return { lo: Math.min(...vs), hi: Math.max(...vs) }
  }, [board])

  // 리그 경쟁 강도 = 1위 지수 − 최하위 지수 (격차)
  const strength = useMemo(() => {
    const ts = board?.teams || []
    if (!ts.length) return null
    const sorted = [...ts].sort((a, b) => b.index - a.index)
    const top = sorted[0], bot = sorted[sorted.length - 1]
    return { spread: top.index - bot.index, top, bot }
  }, [board])
  const barPct = (v: number) => {
    const r = range.hi - range.lo || 1
    return 12 + ((v - range.lo) / r) * 88 // 12~100%
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d12', color: TEXT }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '18px 14px 60px' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, background: 'linear-gradient(180deg,#151b24,#12161d)', border: '1px solid #2a3340', borderRadius: 16, padding: '20px 22px' }}>
          <img src={lgLogo(league)} width={44} height={44} style={{ objectFit: 'contain', background: '#fff', borderRadius: 8, padding: 3, flexShrink: 0 }} alt="" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: TEXT, lineHeight: 1.1 }}>
              {board?.league || '리그'} <span style={{ color: GOLD }}>INDEX</span>
            </h1>
            <span style={{ fontSize: 12, color: SUB, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: UP }}>■</span> 상승
              <span style={{ color: DOWN, marginLeft: 6 }}>■</span> 하락
              <span style={{ color: FAINT, margin: '0 4px' }}>·</span> 지수 = 실력 레이팅(Elo)
            </span>
          </div>
          <div className="sx-metric" style={{ marginLeft: 'auto', background: '#0f141b', border: '1px solid #222a35', borderRadius: 12, padding: '11px 14px', display: 'flex', flexDirection: 'column', gap: 9, minWidth: 236 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 10.5, letterSpacing: '.11em', color: SUB, fontWeight: 800, textTransform: 'uppercase' }}>리그 경쟁 강도</span>
              <span style={{ fontFamily: mono, fontWeight: 800, fontSize: 24, color: GOLD, lineHeight: 1 }}>{strength ? strength.spread : '–'}</span>
            </div>
            {strength && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <img src={logo(strength.bot.teamId)} width={18} height={18} style={{ objectFit: 'contain', borderRadius: 3, background: '#fff' }} alt="" />
                    <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 800, color: DOWN }}>{strength.bot.index}</span>
                  </span>
                  <span style={{ flex: 1, height: 5, borderRadius: 3, background: `linear-gradient(90deg,${DOWN},${GOLD})` }} />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 800, color: UP }}>{strength.top.index}</span>
                    <img src={logo(strength.top.teamId)} width={18} height={18} style={{ objectFit: 'contain', borderRadius: 3, background: '#fff' }} alt="" />
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: FAINT, letterSpacing: '.04em' }}>
                  <span>최하위</span><span>1위</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 리그 탭 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {LEAGUES.map((l) => (
            <button key={l.code} onClick={() => setLeague(l.code)} className="lg-tab"
              style={{ padding: '8px 16px', borderRadius: 11, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                transition: 'all .16s ease',
                border: '1px solid ' + (league === l.code ? GOLD : '#2a3340'),
                background: league === l.code ? 'rgba(240,198,90,.16)' : '#12161d',
                color: league === l.code ? GOLD : SUB }}>
              {l.name}
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign: 'center', color: SUB, padding: 40 }}>불러오는 중…</div>}

        {!loading && board && board.teams.length > 0 && (
          <>
            {/* 급등/급락 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }} className="mv-grid">
              {([['이번 라운드 급등주', movers.up, UP, '▲'], ['이번 라운드 급락주', movers.down, DOWN, '▼']] as const).map(([title, arr, c, ar]) => (
                <div key={title} style={{ background: '#12161d', border: '1px solid #2a3340', borderRadius: 14, padding: '15px 16px' }}>
                  <h3 style={{ margin: '0 0 11px', fontSize: 12, letterSpacing: '.04em', color: SUB, textTransform: 'uppercase', fontWeight: 800 }}>
                    <span style={{ color: c }}>{ar}</span> {title}
                  </h3>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {arr.map((t) => (
                      <li key={t.teamId} onClick={() => openDetail(t.teamId)} className="mv-row"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer', padding: '6px 8px', margin: '0 -8px', borderRadius: 8, transition: 'background .14s ease' }}>
                        <span style={{ color: c, fontSize: 11 }}>{arrow(t.lastChange)}</span>
                        <img src={logo(t.teamId)} width={20} height={20} style={{ objectFit: 'contain', borderRadius: 3, background: '#fff' }} alt="" />
                        <span style={{ fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: TEXT }}>{t.team}</span>
                        <span style={{ fontFamily: mono, fontWeight: 800, fontSize: 13.5, color: c }}>{fmt(t.lastChange)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* 종목 리스트 (클릭 시 상세 페이지로 이동) */}
            <div style={{ background: '#12161d', border: '1px solid #2a3340', borderRadius: 14, overflow: 'hidden', marginTop: 12 }}>
              <div style={{ padding: '15px 16px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: TEXT }}>종목 리스트</h2>
                <span style={{ fontSize: 11.5, color: SUB, letterSpacing: '.02em' }}>{board.teams.length}팀 · 종목 클릭 시 상세</span>
              </div>
              <div className="tbl-scroll" style={{ overflowX: 'auto' }}>
                <table className="stk-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ color: FAINT, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      <th style={{ textAlign: 'left', padding: '7px 14px', fontWeight: 700 }}>팀</th>
                      <th style={{ textAlign: 'left', padding: '7px 14px', fontWeight: 700, width: '20%' }}>지수</th>
                      <th style={{ textAlign: 'right', padding: '7px 14px', fontWeight: 700 }}>등락</th>
                      <th className="c-spark" style={{ textAlign: 'right', padding: '7px 14px', fontWeight: 700 }}>추이</th>
                      <th className="c-played" style={{ textAlign: 'right', padding: '7px 14px', fontWeight: 700 }}>경기</th>
                      <th style={{ width: 24 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.teams.map((t, i) => (
                      <tr key={t.teamId} onClick={() => openDetail(t.teamId)} className="stock-row"
                        style={{ cursor: 'pointer', borderTop: '1px solid #222a35' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: i < 3 ? GOLD : FAINT, fontFamily: mono, fontSize: 12.5, fontWeight: 700, width: 20, display: 'inline-block' }}>{i + 1}</span>
                            <img src={logo(t.teamId)} width={22} height={22} style={{ objectFit: 'contain', borderRadius: 3, background: '#fff' }} alt="" />
                            <span style={{ fontWeight: 700, color: TEXT }}>{t.team}</span>
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <span style={{ fontFamily: mono, fontWeight: 800, fontSize: 14.5, color: TEXT, minWidth: 38 }}>{t.index}</span>
                            <span style={{ flex: 1, height: 6, background: '#222a35', borderRadius: 4, overflow: 'hidden', minWidth: 44 }}>
                              <span style={{ display: 'block', height: '100%', width: `${barPct(t.index)}%`, borderRadius: 4, transition: 'width .3s ease', background: col(t.lastChange) === FAINT ? 'linear-gradient(90deg,#3f4a58,#7c8797)' : `linear-gradient(90deg,${col(t.lastChange)}55,${col(t.lastChange)})` }} />
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: mono, fontWeight: 800, fontSize: 13, color: col(t.lastChange), whiteSpace: 'nowrap' }}>{arrow(t.lastChange)} {fmt(t.lastChange)}</td>
                        <td className="c-spark" style={{ padding: '12px 14px', textAlign: 'right' }}><Spark series={t.series} /></td>
                        <td className="c-played" style={{ padding: '12px 14px', textAlign: 'right', fontFamily: mono, fontSize: 12, color: SUB }}>{t.played}</td>
                        <td className="chev" style={{ padding: '12px 12px 12px 0', textAlign: 'right', color: FAINT, fontSize: 16, transition: 'transform .14s ease, color .14s ease' }}>›</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: '#12161d', border: '1px solid #2a3340', borderRadius: 14, padding: '16px 18px', marginTop: 16 }}>
              <h3 style={{ margin: '0 0 13px', fontSize: 11.5, letterSpacing: '.12em', textTransform: 'uppercase', color: GOLD, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ display: 'inline-flex', width: 17, height: 17, borderRadius: '50%', border: `1.5px solid ${GOLD}`, alignItems: 'center', justifyContent: 'center', fontSize: 11, fontStyle: 'italic', fontWeight: 700 }}>i</span>
                도움말
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                {[
                  { t: '지수 (Index)', d: <>경기 결과·홈 어드밴티지·득실차를 반영한 실력 레이팅(Elo, 기준 1500). 강팀을 이기거나 대승하면 오르고 약팀에 지면 크게 내립니다.</> },
                  { t: '등락', d: <>직전 경기 대비 지수 변화 (<span style={{ color: UP, fontWeight: 700 }}>빨강=상승</span> / <span style={{ color: DOWN, fontWeight: 700 }}>파랑=하락</span>). 매 라운드 갱신.</> },
                  { t: '리그 경쟁 강도', d: <>1위 팀과 최하위 팀의 지수 격차. 클수록 상위권 독주(top-heavy), 작을수록 춘추전국형 리그입니다.</> },
                ].map((it) => (
                  <div key={it.t} style={{ background: '#0f141b', borderRadius: 10, borderLeft: `3px solid ${GOLD}`, padding: '11px 13px' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: TEXT, marginBottom: 4 }}>{it.t}</div>
                    <div style={{ fontSize: 12, color: SUB, lineHeight: 1.6 }}>{it.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!loading && (!board || board.teams.length === 0) && (
          <div style={{ textAlign: 'center', color: SUB, padding: 50 }}>아직 지수 데이터가 없습니다. 곧 업데이트됩니다.</div>
        )}
      </div>
      <style>{`
        .stock-row{transition:background .14s ease}
        .stock-row:hover{background:rgba(240,198,90,.07)}
        .stock-row:hover .chev{transform:translateX(3px);color:${GOLD}}
        .mv-row:hover{background:rgba(240,198,90,.09)}
        .lg-tab:hover{border-color:${GOLD}!important;color:${GOLD}!important}
        .tbl-scroll{scrollbar-width:none;-ms-overflow-style:none}
        .tbl-scroll::-webkit-scrollbar{display:none}
        @media(max-width:860px){.mv-grid{grid-template-columns:1fr!important}}
        @media(max-width:560px){
          .c-spark,.c-played{display:none}
          .sx-metric{margin-left:0!important;width:100%;margin-top:6px}
          .stk-table th,.stk-table td{padding-left:10px!important;padding-right:10px!important}
        }
      `}</style>
    </div>
  )
}
