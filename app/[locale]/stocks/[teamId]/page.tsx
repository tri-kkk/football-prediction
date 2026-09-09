'use client'

// app/[locale]/stocks/[teamId]/page.tsx
// 팀 종목 상세 — 시세/지수차트(인터랙티브)/펀더멘털/최근실적/팀뉴스. /api/team-index/[teamId] + /api/team-news 연결.
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Pt = { date: string; v: number; note: string }
type Recent = { date: string; opp: string; homeAway: 'H' | 'A'; score: string; result: 'W' | 'D' | 'L'; indexChange: number | null }
type Detail = {
  teamId: number; team: string; leagueCode: string; season: number
  index: number; change: number; hi: number; lo: number; played: number; volatility: number | null
  table: { rank: number | null; points: number; ppg: number | null; wins: number | null; draws: number | null; losses: number | null }
  goals: { gf: number | null; ga: number | null; gd: number; homeGf: number | null; homeGa: number | null; awayGf: number | null; awayGa: number | null }
  traits: { firstGoalWinRate: number | null; firstGoalGames: number; concedeFirstWinRate: number | null; concedeFirstGames: number }
  form: string[]; streak: number; streakType: string | null
  series: Pt[]; recent: Recent[]
}
type Article = { title: string; titleKo?: string; url: string; source: string; imageUrl: string; publishedAt: string }

const logo = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`
const LEAGUE_ID: Record<string, number> = { PL: 39, PD: 140, BL1: 78, SA: 135, FL1: 61, J1: 98 }
const lgLogo = (code: string) => `https://media.api-sports.io/football/leagues/${LEAGUE_ID[code]}.png`
const fmt = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(1)
const arrow = (v: number) => (v > 0 ? '▲' : v < 0 ? '▼' : '·')
// 한국 증시 관례: 상승=빨강, 하락=파랑
const UP = '#ff6b78', DOWN = '#5ba0ff', FAINT = '#8a94a5', SUB = '#b4bdca', TEXT = '#eef2f8'
const GOLD = '#f0c65a'
const col = (v: number) => (v > 0 ? UP : v < 0 ? DOWN : FAINT)
const mono = 'ui-monospace,SFMono-Regular,Menlo,monospace'
const CARD: any = { background: '#12161d', border: '1px solid #2a3340', borderRadius: 14 }
const LNAME: Record<string, string> = { PL: '프리미어리그', PD: '라리가', BL1: '분데스리가', SA: '세리에A', FL1: '리그1', J1: 'J리그' }
const RES_KR: Record<string, string> = { W: '승', D: '무', L: '패' }
const resCol = (r: string) => (r === 'W' ? UP : r === 'L' ? DOWN : FAINT)

function InteractiveChart({ series }: { series: Pt[] }) {
  const [hi, setHi] = useState<number | null>(null)
  const ref = useRef<SVGSVGElement>(null)
  const vs = series.map((p) => p.v), n = vs.length
  const VW = 720, VH = 260, L = 46, R = 18, T = 18, B = 30
  if (n < 2) return <div style={{ padding: 30, color: SUB, textAlign: 'center' }}>경기 데이터 누적 중…</div>
  let mn = Math.min(...vs), mx = Math.max(...vs)
  const pdv = (mx - mn) * 0.18 || 8; mn -= pdv; mx += pdv
  const X = (i: number) => L + (i * (VW - L - R)) / (n - 1)
  const Y = (v: number) => T + (1 - (v - mn) / (mx - mn)) * (VH - T - B)
  const net = vs[n - 1] - vs[0], c = net >= 0 ? UP : DOWN
  const grid: any[] = []
  for (let k = 0; k < 4; k++) {
    const v = mn + ((mx - mn) * k) / 3, y = Y(v)
    grid.push(<line key={'g' + k} x1={L} y1={y.toFixed(1)} x2={VW - R} y2={y.toFixed(1)} stroke="rgba(231,236,243,.08)" strokeWidth={1} />)
    grid.push(<text key={'t' + k} x={L - 8} y={(y + 3).toFixed(1)} textAnchor="end" fontSize={11} fill={FAINT} fontFamily={mono}>{Math.round(v)}</text>)
  }
  const line = vs.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ')
  const area = `M${X(0).toFixed(1)} ${Y(vs[0]).toFixed(1)} ` + vs.map((v, i) => 'L' + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ') +
    ` L${X(n - 1).toFixed(1)} ${(VH - B).toFixed(1)} L${X(0).toFixed(1)} ${(VH - B).toFixed(1)} Z`

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = ref.current; if (!svg) return
    const rect = svg.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const vbx = ((clientX - rect.left) / rect.width) * VW
    const step = (VW - L - R) / (n - 1)
    let i = Math.round((vbx - L) / step)
    i = Math.max(0, Math.min(n - 1, i))
    setHi(i)
  }
  const h = hi
  const chg = h != null && h > 0 ? vs[h] - vs[h - 1] : null

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={ref} viewBox={`0 0 ${VW} ${VH}`} width="100%" preserveAspectRatio="xMidYMid meet"
        onMouseMove={onMove} onMouseLeave={() => setHi(null)} onTouchStart={onMove} onTouchMove={onMove}
        style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}>
        {grid}
        <path d={area} fill={net >= 0 ? 'rgba(255,107,120,.14)' : 'rgba(91,160,255,.14)'} />
        <path d={line} fill="none" stroke={c} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={X(n - 1).toFixed(1)} cy={Y(vs[n - 1]).toFixed(1)} r={3.6} fill={c} />
        <text x={X(0).toFixed(1)} y={VH - 8} textAnchor="start" fontSize={11} fill={FAINT} fontFamily={mono}>{series[0].date?.slice(5)}</text>
        <text x={X(n - 1).toFixed(1)} y={VH - 8} textAnchor="end" fontSize={11} fill={FAINT} fontFamily={mono}>{series[n - 1].date?.slice(5)}</text>
        {h != null && (
          <g>
            <line x1={X(h).toFixed(1)} y1={T} x2={X(h).toFixed(1)} y2={VH - B} stroke={GOLD} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
            <circle cx={X(h).toFixed(1)} cy={Y(vs[h]).toFixed(1)} r={5} fill={GOLD} stroke="#0a0d12" strokeWidth={2} />
          </g>
        )}
      </svg>
      {h != null && (
        <div style={{ position: 'absolute', top: 6, left: `${Math.min(88, Math.max(12, (X(h) / VW) * 100))}%`, transform: 'translateX(-50%)',
          background: '#1c2431', border: '1px solid #3a4656', borderRadius: 8, padding: '6px 10px',
          pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: '0 6px 18px rgba(0,0,0,.4)' }}>
          <div style={{ fontSize: 10.5, color: SUB, fontFamily: mono }}>{series[h].date?.slice(5)} {series[h].note ? '· ' + series[h].note : ''}</div>
          <div style={{ fontSize: 15, fontWeight: 800, fontFamily: mono, color: TEXT }}>
            {vs[h]}{chg != null && <span style={{ color: col(chg), fontSize: 12, marginLeft: 6 }}>{fmt(chg)}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ k, v, sub, color }: { k: string; v: any; sub?: string; color?: string }) {
  return (
    <div className="stat-cell" style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '13px 14px', transition: 'background .14s ease' }}>
      <span style={{ fontSize: 11, color: FAINT, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>{k}</span>
      <span style={{ fontFamily: mono, fontWeight: 800, fontSize: 18, color: color || TEXT }}>{v}</span>
      {sub && <span style={{ fontSize: 11, color: SUB }}>{sub}</span>}
    </div>
  )
}

export default function StockDetailPage() {
  const params = useParams()
  const router = useRouter()
  const locale = (params?.locale as string) || 'ko'
  const teamId = params?.teamId as string
  const [d, setD] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)
  const [news, setNews] = useState<Article[] | null>(null)

  useEffect(() => {
    setLoading(true); setErr(false)
    fetch(`/api/team-index/${teamId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j: Detail) => {
        setD(j)
        fetch(`/api/team-news?team=${encodeURIComponent(j.team)}`)
          .then((r) => r.json()).then((nn) => setNews(nn.articles || [])).catch(() => setNews([]))
      })
      .catch(() => setErr(true)).finally(() => setLoading(false))
  }, [teamId])

  if (loading) return <Shell><div style={{ textAlign: 'center', color: SUB, padding: 60 }}>불러오는 중…</div></Shell>
  if (err || !d) return <Shell><div style={{ textAlign: 'center', color: SUB, padding: 60 }}>종목 정보를 찾을 수 없습니다.</div></Shell>

  const pctChg = d.index ? ((d.change / d.index) * 100).toFixed(2) : '0.00'
  const goto = () => router.push(`/${locale}/stocks`)

  return (
    <Shell>
      <button onClick={goto} className="back-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#12161d', border: '1px solid #2a3340', borderRadius: 10, color: SUB, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '7px 13px', marginBottom: 12, alignSelf: 'flex-start', transition: 'border-color .15s ease, color .15s ease, background .15s ease' }}>
        <span className="back-arrow" style={{ display: 'inline-block', transition: 'transform .15s ease' }}>←</span>
        종목 리스트
      </button>

      {/* 시세 헤더 */}
      <div style={{ ...CARD, background: 'linear-gradient(180deg,#151b24,#12161d)', padding: '20px 22px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
        <img src={logo(d.teamId)} width={56} height={56} style={{ objectFit: 'contain', background: '#fff', borderRadius: 9, padding: 3 }} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontSize: 11, letterSpacing: '.13em', color: GOLD, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {LEAGUE_ID[d.leagueCode] && <img src={lgLogo(d.leagueCode)} width={16} height={16} style={{ objectFit: 'contain', background: '#fff', borderRadius: 3, padding: 1 }} alt="" />}
            {LNAME[d.leagueCode] || d.leagueCode} · 팀 지수
          </span>
          <h1 className="dx-name" style={{ margin: 0, fontSize: 26, fontWeight: 800, color: TEXT }}>{d.team}</h1>
          <span style={{ fontSize: 12.5, color: SUB }}>
            리그 순위 <b style={{ color: GOLD }}>{d.table.rank ? d.table.rank + '위' : '–'}</b> · {d.played}경기 · 시즌 {d.season}
          </span>
        </div>
        <div className="dx-metric" style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: mono, fontWeight: 800, fontSize: 44, lineHeight: 1, color: TEXT }}>{d.index}</div>
          <div style={{ fontFamily: mono, fontWeight: 800, fontSize: 16, color: col(d.change), marginTop: 5 }}>
            {arrow(d.change)} {fmt(d.change)} ({pctChg}%)
          </div>
          <div style={{ fontSize: 11, color: FAINT, marginTop: 2 }}>직전 경기 대비</div>
        </div>
      </div>

      {/* 지수 차트 (인터랙티브) */}
      <div style={{ ...CARD, padding: '16px 12px 10px', marginTop: 12 }}>
        <h2 style={{ margin: '0 0 6px 10px', fontSize: 13.5, fontWeight: 800, color: TEXT }}>지수 추이 <span style={{ color: SUB, fontWeight: 400, fontSize: 11.5 }}>· 시즌 전체 · 그래프에 마우스를 올려보세요</span></h2>
        <InteractiveChart series={d.series} />
      </div>

      {/* 펀더멘털 */}
      <div style={{ ...CARD, marginTop: 12, overflow: 'hidden' }}>
        <h2 style={{ margin: 0, padding: '15px 16px 9px', fontSize: 13.5, fontWeight: 800, color: TEXT }}>펀더멘털</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid #222a35' }} className="fund-grid">
          <Stat k="리그 순위" v={d.table.rank ? d.table.rank + '위' : '–'} sub={`승점 ${d.table.points}`} />
          <Stat k="경기당 승점" v={d.table.ppg ?? '–'} sub={`${d.table.wins ?? 0}승 ${d.table.draws ?? 0}무 ${d.table.losses ?? 0}패`} />
          <Stat k="시즌 高 / 低" v={`${d.hi} / ${d.lo}`} sub={`변동성 ${d.volatility ?? '–'}`} />
          <Stat k="현재 지수" v={d.index} sub={`${fmt(d.change)} (${pctChg}%)`} color={col(d.change)} />
          <Stat k="득점 / 실점" v={`${d.goals.gf ?? '–'} / ${d.goals.ga ?? '–'}`} sub={`득실 ${d.goals.gd >= 0 ? '+' : ''}${d.goals.gd}`} />
          <Stat k="홈 득실" v={`${d.goals.homeGf ?? '–'} / ${d.goals.homeGa ?? '–'}`} sub="득점 / 실점" />
          <Stat k="원정 득실" v={`${d.goals.awayGf ?? '–'} / ${d.goals.awayGa ?? '–'}`} sub="득점 / 실점" />
          <Stat k="선제골 승률" v={d.traits.firstGoalWinRate != null ? d.traits.firstGoalWinRate + '%' : '–'} sub={`선제 ${d.traits.firstGoalGames}경기`} />
        </div>
      </div>

      {/* 최근 실적 */}
      <div style={{ ...CARD, marginTop: 12, overflow: 'hidden' }}>
        <div style={{ padding: '15px 16px 9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: TEXT }}>최근 실적 <span style={{ color: SUB, fontWeight: 400, fontSize: 11.5 }}>· 경기별 지수 등락</span></h2>
          <span style={{ fontFamily: mono, fontSize: 13.5, fontWeight: 800 }}>
            {d.form.map((r, i) => <span key={i} style={{ color: resCol(r), marginLeft: i ? 4 : 0 }}>{RES_KR[r]}</span>)}
            {d.streakType && d.streak > 1 && <span style={{ color: SUB, fontWeight: 400, fontSize: 11.5, marginLeft: 8 }}>{RES_KR[d.streakType]} {d.streak}연속</span>}
          </span>
        </div>
        <div className="tbl-scroll" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ color: FAINT, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                <th style={{ textAlign: 'left', padding: '7px 16px', fontWeight: 700 }}>일자</th>
                <th style={{ textAlign: 'left', padding: '7px 10px', fontWeight: 700 }}>상대</th>
                <th className="c-ha" style={{ textAlign: 'center', padding: '7px 10px', fontWeight: 700 }}>H/A</th>
                <th style={{ textAlign: 'center', padding: '7px 10px', fontWeight: 700 }}>스코어</th>
                <th style={{ textAlign: 'center', padding: '7px 10px', fontWeight: 700 }}>결과</th>
                <th style={{ textAlign: 'right', padding: '7px 16px', fontWeight: 700 }}>지수 등락</th>
              </tr>
            </thead>
            <tbody>
              {d.recent.map((m, i) => (
                <tr key={i} className="rec-row" style={{ borderTop: '1px solid #222a35', transition: 'background .14s ease' }}>
                  <td style={{ padding: '11px 16px', fontFamily: mono, fontSize: 12.5, color: SUB }}>{m.date?.slice(5)}</td>
                  <td style={{ padding: '11px 10px', fontWeight: 700, color: TEXT }}>{m.opp}</td>
                  <td className="c-ha" style={{ padding: '11px 10px', textAlign: 'center', fontSize: 12, color: SUB }}>{m.homeAway}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'center', fontFamily: mono, fontWeight: 800, color: TEXT }}>{m.score}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'center', fontWeight: 800, color: resCol(m.result) }}>{RES_KR[m.result]}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: mono, fontWeight: 800, fontSize: 13, color: col(m.indexChange ?? 0) }}>
                    {m.indexChange != null ? `${arrow(m.indexChange)} ${fmt(m.indexChange)}` : '–'}
                  </td>
                </tr>
              ))}
              {d.recent.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: SUB }}>최근 경기 없음</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* 팀 뉴스 */}
      <div style={{ ...CARD, marginTop: 12, overflow: 'hidden' }}>
        <h2 style={{ margin: 0, padding: '15px 16px 9px', fontSize: 13.5, fontWeight: 800, color: TEXT }}>팀 뉴스</h2>
        {news === null && <div style={{ padding: 20, color: SUB, textAlign: 'center', fontSize: 13 }}>뉴스 불러오는 중…</div>}
        {news && news.length === 0 && <div style={{ padding: 20, color: SUB, textAlign: 'center', fontSize: 13 }}>관련 뉴스가 없습니다.</div>}
        {news && news.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {news.map((a, i) => (
              <li key={i} style={{ borderTop: '1px solid #222a35' }}>
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="news-row"
                  style={{ display: 'flex', gap: 12, padding: '13px 16px', textDecoration: 'none', color: 'inherit', alignItems: 'center', transition: 'background .14s ease' }}>
                  {a.imageUrl
                    ? <img src={a.imageUrl} width={68} height={46} style={{ objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: '#1c222c' }} alt="" />
                    : <div style={{ width: 68, height: 46, borderRadius: 6, flexShrink: 0, background: '#1c222c' }} />}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: TEXT }}>{a.titleKo || a.title}</span>
                    <span style={{ fontSize: 11.5, color: SUB }}>{a.source}{a.publishedAt ? ' · ' + a.publishedAt.slice(0, 10) : ''}</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ ...CARD, padding: '16px 18px', marginTop: 16 }}>
        <h3 style={{ margin: '0 0 13px', fontSize: 11.5, letterSpacing: '.12em', textTransform: 'uppercase', color: GOLD, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ display: 'inline-flex', width: 17, height: 17, borderRadius: '50%', border: `1.5px solid ${GOLD}`, alignItems: 'center', justifyContent: 'center', fontSize: 11, fontStyle: 'italic', fontWeight: 700 }}>i</span>
          도움말
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
          {[
            { t: '지수 (Index)', d: <>경기 결과·홈 어드밴티지·득실차를 반영한 실력 레이팅(Elo, 기준 1500). 강팀을 이기거나 대승하면 오르고 약팀에 지면 크게 내립니다. (<span style={{ color: UP, fontWeight: 700 }}>빨강=상승</span> / <span style={{ color: DOWN, fontWeight: 700 }}>파랑=하락</span>)</> },
            { t: '변동성', d: <>시즌 지수의 표준편차. 값이 클수록 경기마다 지수 등락이 심한, 기복이 큰 팀입니다.</> },
            { t: '선제골 승률', d: <>먼저 득점한 경기에서의 승률. 리드를 지키는 힘을 보여줍니다.</> },
          ].map((it) => (
            <div key={it.t} style={{ background: '#0f141b', borderRadius: 10, borderLeft: `3px solid ${GOLD}`, padding: '11px 13px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: TEXT, marginBottom: 4 }}>{it.t}</div>
              <div style={{ fontSize: 12, color: SUB, lineHeight: 1.6 }}>{it.d}</div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .stat-cell:hover{background:rgba(240,198,90,.06)}
        .rec-row:hover{background:rgba(240,198,90,.06)}
        .news-row:hover{background:rgba(240,198,90,.06)}
        .back-btn:hover{border-color:${GOLD};color:${GOLD};background:rgba(240,198,90,.08)}
        .back-btn:hover .back-arrow{transform:translateX(-3px)}
        .tbl-scroll{scrollbar-width:none;-ms-overflow-style:none}
        .tbl-scroll::-webkit-scrollbar{display:none}
        @media(max-width:720px){.fund-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media(max-width:560px){
          .dx-metric{margin-left:0!important;text-align:left!important;width:100%;border-top:1px solid #2a3340;padding-top:12px;margin-top:8px}
          .dx-name{font-size:22px!important}
          .c-ha{display:none}
        }
      `}</style>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0d12', color: TEXT }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '18px 14px 60px', display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}
