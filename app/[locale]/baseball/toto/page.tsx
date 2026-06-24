// app/[locale]/baseball/toto/page.tsx
// 야구토토 승1패 — AI 분석 (승 / 1점차 / 패)  · v2 클린 리디자인
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from '@/i18n/navigation'

// ===== 타입 =====
interface TotoMatch {
  id: number
  match_number: number
  home_team: string
  away_team: string
  home_team_full: string
  away_team_full: string
  home_team_en?: string
  away_team_en?: string
  home_logo?: string | null
  away_logo?: string | null
  league: string
  match_date?: string
  vote_win: number
  vote_one: number
  vote_lose: number
  vote_count_win?: number
  vote_count_one?: number
  vote_count_lose?: number
  vote_total?: number
  ts_win: number
  ts_one: number
  ts_lose: number
  pred_source?: 'model' | 'blend' | 'odds' | 'vote'
  divergence_win: number
  divergence_one: number
  divergence_lose: number
  max_divergence: number
  grade: 'PICK' | 'GOOD' | 'FAIR' | 'PASS'
  primary_pick: 'W' | 'O' | 'L'
  secondary_pick?: 'W' | 'O' | 'L'
  analysis: string
  result?: 'W' | 'O' | 'L'
  is_correct?: boolean
}

interface TotoRound {
  id: number
  year: number
  round_number: number
  total_votes: number
  estimated_prize: number
  status: string
  scraped_at: string
}

interface Strategy {
  budget: number
  label: string
  description: string
  combinations: number
  selections: { match_number: number; picks: string[]; count: number }[]
}

interface TotoData {
  round: TotoRound
  matches: TotoMatch[]
  summary: {
    total_matches: number
    grade_count: Record<string, number>
    difficulty: number
    top_divergence: any[]
  }
  strategies: Strategy[]
}

// ===== 유틸 =====
function fmtDate(d?: string): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  const kst = new Date(dt.getTime() + 9 * 3600 * 1000)  // UTC → KST 벽시계
  const days = ['일','월','화','수','목','금','토']
  const mo = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const da = String(kst.getUTCDate()).padStart(2, '0')
  const hh = String(kst.getUTCHours()).padStart(2, '0')
  const mi = String(kst.getUTCMinutes()).padStart(2, '0')
  return `${mo}.${da}(${days[kst.getUTCDay()]}) ${hh}:${mi}`
}

function fmtVotes(n?: number): string {
  if (!n) return '0'
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억'
  if (n >= 10000) return (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '만'
  return n.toLocaleString()
}

const LEAGUE_MAP: Record<string, { name: string; color: string }> = {
  'KBO':   { name: 'KBO', color: '#34d399' },
  'MLB':   { name: 'MLB', color: '#f87171' },
  'NPB':   { name: 'NPB', color: '#60a5fa' },
  'Other': { name: '기타', color: '#94a3b8' },
}

// 세련된 다크 팔레트
const C = {
  bg: '#0b1118',
  surface: '#121a24',
  surface2: '#0f1620',
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.12)',
  text: '#f1f5f9',
  textSub: '#9aa7b6',
  textMuted: '#5b6776',
  accent: '#34d399',
  win: '#3b82f6',     // 승
  one: '#f59e0b',     // 1점차
  lose: '#ef4444',    // 패
}

const PICK_SHORT: Record<string, string> = { W: '승', O: '1', L: '패' }
const OUTCOME_COLOR: Record<string, string> = { W: C.win, O: C.one, L: C.lose }
const RESULT_LABEL: Record<string, string> = { W: '승', O: '1점차', L: '패', D: '무' }

// ===== 메인 =====
export default function BaseballTotoPage() {
  const [data, setData] = useState<TotoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [league, setLeague] = useState('ALL')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [budgetIdx, setBudgetIdx] = useState(0)
  const [showSlip, setShowSlip] = useState(false)
  const [rounds, setRounds] = useState<{ id: number; year: number; round_number: number; status: string }[]>([])
  const [sel, setSel] = useState<{ year: number; round: number } | null>(null)
  const { data: session } = useSession()
  const router = useRouter()
  const isPremium = (session?.user as any)?.tier === 'premium'

  useEffect(() => {
    fetch('/api/baseball-toto/round?history=true&limit=30')
      .then(r => r.json()).then(d => setRounds(d.rounds || [])).catch(() => {})
  }, [])

  useEffect(() => { load() }, [sel])  // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    try {
      setLoading(true); setError(null)
      const url = sel
        ? `/api/baseball-toto/round?year=${sel.year}&round=${sel.round}`
        : '/api/baseball-toto/round'
      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 404 && !sel) {
          const s = await fetch('/api/baseball-toto/scrape')
          if (s.ok) {
            const r2 = await fetch('/api/baseball-toto/round')
            if (r2.ok) { setData(await r2.json()); return }
          }
        }
        throw new Error('데이터 로드 실패')
      }
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const leagues = useMemo(() => {
    const set = new Set((data?.matches || []).map(m => m.league))
    return ['ALL', ...Array.from(set)]
  }, [data?.matches])

  const matches = useMemo(() => {
    if (!data?.matches) return []
    if (league === 'ALL') return data.matches
    return data.matches.filter(m => m.league === league)
  }, [data?.matches, league])

  const hasVotes = data?.matches?.some(m => (m.vote_total || 0) > 0) ?? false
  const totalVotes = data?.matches?.reduce((s, m) => s + (m.vote_total || 0), 0) ?? 0

  if (loading) return <LoadingUI />
  if (error) return <ErrorUI msg={error} retry={load} />
  if (!data) return null

  const { round, strategies } = data

  if (!isPremium) return <PremiumGate round={round} onUpgrade={() => router.push('/premium/pricing')} />

  // 발매 상태 라이브 판정: 첫 경기 시작 전이면 발매중, 시작 후면 마감, 전부 종료면 종료
  const firstGame = Math.min(...data.matches.map(m => (m.match_date ? new Date(m.match_date).getTime() : Infinity)))
  const liveStatus =
    round.status === 'finished' ? 'finished'
    : (isFinite(firstGame) && Date.now() >= firstGame ? 'closed' : 'upcoming')

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Noto Sans KR', -apple-system, sans-serif" }}>

      {/* ── 헤더 ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(11,17,24,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: C.accent, textTransform: 'uppercase' }}>AI 분석 · 야구</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: C.text, marginTop: 2, letterSpacing: -0.3 }}>
                야구 승1패{' '}
                <RoundSelect rounds={rounds} current={round} onSelect={(y, r) => setSel({ year: y, round: r })} />
              </div>
            </div>
            <StatusPill status={liveStatus} />
          </div>

          {/* 리그 필터 */}
          <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
            {leagues.map(lg => {
              const active = league === lg
              const lc = lg === 'ALL' ? C.accent : (LEAGUE_MAP[lg]?.color || C.textSub)
              return (
                <button key={lg} onClick={() => setLeague(lg)} style={{
                  padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                  background: active ? lc + '22' : 'transparent',
                  color: active ? lc : C.textMuted,
                  border: `1px solid ${active ? lc + '55' : C.border}`,
                  transition: 'all 0.15s',
                }}>
                  {lg === 'ALL' ? '전체' : (LEAGUE_MAP[lg]?.name || lg)}
                </button>
              )
            })}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.textMuted }}>
              {hasVotes && <><span>투표</span><span style={{ color: C.textSub, fontWeight: 700 }}>{fmtVotes(totalVotes)}</span></>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '14px 14px 90px' }}>

        {!hasVotes && (
          <div style={{ margin: '0 0 12px', padding: '10px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, color: C.textSub }}>
            📊 아직 투표가 시작되지 않았습니다
          </div>
        )}

        {(() => {
          const resolved = data.matches.filter(m => m.result)
          const graded = resolved.filter(m => m.is_correct != null)
          const hits = graded.filter(m => m.is_correct).length
          if (resolved.length === 0) return null
          const rate = graded.length ? Math.round((hits / graded.length) * 100) : 0
          return (
            <div style={{ margin: '0 0 12px', padding: '12px 16px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub }}>📊 회차 적중률</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: C.accent }}>{rate}%</span>
                <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{hits} / {graded.length} 적중</span>
              </div>
            </div>
          )
        })()}

        {/* 예산별 추천 조합 (상단 고정) */}
        {strategies && strategies.length > 0 && (
          <StrategyBox strategies={strategies} idx={budgetIdx} setIdx={setBudgetIdx} onShowSlip={() => setShowSlip(true)} />
        )}

        {/* 경기 카드 리스트 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {matches.map(m => (
            <MatchCard
              key={m.match_number}
              m={m}
              expanded={expandedId === m.match_number}
              toggle={() => setExpandedId(expandedId === m.match_number ? null : m.match_number)}
              hasVotes={hasVotes}
            />
          ))}
        </div>
      </div>

      {showSlip && strategies?.[budgetIdx] && (
        <BettingSlipModal round={round} matches={data.matches} strategy={strategies[budgetIdx]} onClose={() => setShowSlip(false)} />
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: ${C.bg}; font-family: 'Noto Sans KR', -apple-system, sans-serif; }
        @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════
//  회차 선택 드롭다운
// ═══════════════════════════════════════════
function RoundSelect({ rounds, current, onSelect }: {
  rounds: { id: number; year: number; round_number: number; status: string }[]
  current: TotoRound
  onSelect: (year: number, round: number) => void
}) {
  const opts = [...rounds]
  if (!opts.some(r => r.year === current.year && r.round_number === current.round_number)) {
    opts.unshift({ id: current.id, year: current.year, round_number: current.round_number, status: current.status })
  }
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={`${current.year}-${current.round_number}`}
        onChange={(e) => { const [y, r] = e.target.value.split('-').map(Number); onSelect(y, r) }}
        style={{
          appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
          background: C.surface, color: C.textSub, fontWeight: 700, fontSize: 14,
          border: `1px solid ${C.borderStrong}`, borderRadius: 9,
          padding: '3px 26px 3px 11px', cursor: 'pointer', outline: 'none',
        }}>
        {opts.map(rd => (
          <option key={`${rd.year}-${rd.round_number}`} value={`${rd.year}-${rd.round_number}`} style={{ background: '#1a2230', color: '#fff' }}>
            {rd.round_number}회차{rd.status === 'finished' ? ' · 마감' : ''}
          </option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 10, pointerEvents: 'none', color: C.textMuted, fontSize: 10 }}>▾</span>
    </span>
  )
}

// ═══════════════════════════════════════════
//  프리미엄 잠금 화면
// ═══════════════════════════════════════════
function PremiumGate({ round, onUpgrade }: { round: TotoRound; onUpgrade: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Noto Sans KR', -apple-system, sans-serif" }}>
      <div style={{ background: 'rgba(11,17,24,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '14px 18px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: C.accent, textTransform: 'uppercase' }}>AI 분석 · 야구</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: C.text, marginTop: 2, letterSpacing: -0.3 }}>
            야구 승1패 <span style={{ color: C.textSub, fontWeight: 600 }}>{round.round_number}회차</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', fontSize: 30 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 10 }}>프리미엄 전용</div>
        <div style={{ fontSize: 13.5, color: C.textSub, lineHeight: 1.75, marginBottom: 22 }}>
          야구 승1패 AI 분석은 프리미엄 회원에게만 제공됩니다.<br />
          모델 + 시장(투표) 블렌딩 예측, 1점차 확률(Skellam), 예산별 추천 조합까지 한 번에 확인하세요.
        </div>

        <div style={{ textAlign: 'left', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 22 }}>
          {[
            '14경기 승/1점차/패 AI 확률',
            '대중 투표 대비 괴리율 분석',
            '예산별 추천 조합표 (복사·캡처)',
            '경기 종료 후 적중 결과 자동 정산',
          ].map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 0', fontSize: 12.5, color: C.textSub }}>
              <span style={{ color: C.accent, fontWeight: 900 }}>✓</span>{t}
            </div>
          ))}
        </div>

        <button onClick={onUpgrade} style={{
          width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: 15, fontWeight: 800, color: '#1a1206',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        }}>
          프리미엄 시작하기 →
        </button>
        <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted }}>
          이미 프리미엄인데 잠겨 보이면 로그인 상태를 확인해 주세요.
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════
//  팀 로고
// ═══════════════════════════════════════════
function TeamLogo({ src, name, size = 46 }: { src?: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false)
  const ok = src && !err
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: ok ? '#fff' : '#1c2632',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
      border: `1px solid ${C.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
    }}>
      {ok ? (
        <img src={src!} alt="" onError={() => setErr(true)}
          style={{ width: '78%', height: '78%', objectFit: 'contain' }} loading="lazy" />
      ) : (
        <span style={{ fontSize: size * 0.4, fontWeight: 800, color: C.textSub }}>{name?.[0] || '?'}</span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
//  경기 카드
// ═══════════════════════════════════════════
function MatchCard({ m, expanded, toggle, hasVotes }: {
  m: TotoMatch; expanded: boolean; toggle: () => void; hasVotes: boolean
}) {
  const league = LEAGUE_MAP[m.league] || LEAGUE_MAP['Other']
  const pick = m.primary_pick
  const pickColor = OUTCOME_COLOR[pick]

  // AI 추천 라벨
  const pickLabel =
    pick === 'W' ? `${m.home_team_full} 승`
    : pick === 'L' ? `${m.away_team_full} 승`
    : '1점차 접전'

  const probs = [
    { k: 'W', v: m.ts_win, c: C.win },
    { k: 'O', v: m.ts_one, c: C.one },
    { k: 'L', v: m.ts_lose, c: C.lose },
  ]

  return (
    <div style={{
      background: C.surface, borderRadius: 16,
      border: `1px solid ${expanded ? C.borderStrong : C.border}`,
      overflow: 'hidden', transition: 'border-color 0.15s',
    }}>
      <div onClick={toggle} style={{ padding: '14px 16px', cursor: 'pointer' }}>

        {/* 상단 메타 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: league.color, background: league.color + '1c', padding: '3px 9px', borderRadius: 6, letterSpacing: 0.5 }}>
              {league.name}
            </span>
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 500 }}>{fmtDate(m.match_date)}</span>
          </div>
          {(m.pred_source === 'model' || m.pred_source === 'blend') && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: C.accent }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent }} />
              AI
            </span>
          )}
        </div>

        {/* 팀 매치업 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <TeamLogo src={m.home_logo} name={m.home_team_full} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.home_team_full}
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>홈</div>
            </div>
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, flexShrink: 0 }}>VS</div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, justifyContent: 'flex-end' }}>
            <div style={{ minWidth: 0, textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.away_team_full}
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>원정</div>
            </div>
            <TeamLogo src={m.away_logo} name={m.away_team_full} />
          </div>
        </div>

        {/* AI 확률 바 */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', background: C.surface2, gap: 2 }}>
            {probs.map(p => (
              <div key={p.k} style={{ width: `${p.v}%`, background: p.c, opacity: pick === p.k ? 1 : 0.4, borderRadius: 99, transition: 'all 0.4s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 11, fontWeight: 600 }}>
            <span style={{ color: pick === 'W' ? C.win : C.textMuted }}>승 {m.ts_win.toFixed(0)}%</span>
            <span style={{ color: pick === 'O' ? C.one : C.textMuted }}>1점차 {m.ts_one.toFixed(0)}%</span>
            <span style={{ color: pick === 'L' ? C.lose : C.textMuted }}>패 {m.ts_lose.toFixed(0)}%</span>
          </div>
        </div>

        {/* AI 추천 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>AI 추천</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 8,
            background: pickColor + '1f', color: pickColor,
            fontSize: 12, fontWeight: 800,
            border: `1px solid ${pickColor}44`,
          }}>
            <span style={{ width: 18, height: 18, borderRadius: 5, background: pickColor, color: '#0b1118', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>
              {PICK_SHORT[pick]}
            </span>
            {pickLabel}
          </span>
          {m.result ? (
            <span style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8,
              background: m.is_correct == null ? 'rgba(148,163,184,0.15)' : m.is_correct ? 'rgba(52,211,153,0.16)' : 'rgba(248,113,113,0.16)',
              color: m.is_correct == null ? C.textSub : m.is_correct ? C.accent : C.lose,
            }}>
              결과 {RESULT_LABEL[m.result]}
              <span>{m.is_correct == null ? '적특' : m.is_correct ? '✓ 적중' : '✕ 미적중'}</span>
            </span>
          ) : <span style={{ marginLeft: 'auto' }} />}
          <span style={{ marginLeft: 8, fontSize: 11, color: C.textMuted, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
        </div>
      </div>

      {/* 상세 */}
      {expanded && (
        <div style={{ padding: '0 16px 16px', animation: 'fadeIn 0.15s ease-out' }}>
          <div style={{ padding: '12px 14px', background: C.surface2, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, marginBottom: 5 }}>🤖 AI 분석</div>
            <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.7 }}>{m.analysis}</div>
          </div>

          {hasVotes && (
            <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.surface2 }}>
                    <th style={th}></th>
                    <th style={{ ...th, color: C.win }}>승</th>
                    <th style={{ ...th, color: C.one }}>1점차</th>
                    <th style={{ ...th, color: C.lose }}>패</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={tdL}>투표</td>
                    <td style={td}>{m.vote_win.toFixed(1)}%</td>
                    <td style={td}>{m.vote_one.toFixed(1)}%</td>
                    <td style={td}>{m.vote_lose.toFixed(1)}%</td>
                  </tr>
                  <tr style={{ background: C.surface2 }}>
                    <td style={tdL}>AI</td>
                    <td style={{ ...td, color: C.accent, fontWeight: 800 }}>{m.ts_win.toFixed(1)}%</td>
                    <td style={{ ...td, color: C.accent, fontWeight: 800 }}>{m.ts_one.toFixed(1)}%</td>
                    <td style={{ ...td, color: C.accent, fontWeight: 800 }}>{m.ts_lose.toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td style={tdL}>괴리</td>
                    {[m.divergence_win, m.divergence_one, m.divergence_lose].map((v, i) => (
                      <td key={i} style={{ ...td, fontWeight: 800, color: Math.abs(v) >= 5 ? (v > 0 ? '#34d399' : '#f87171') : C.textMuted }}>
                        {v > 0 ? '+' : ''}{v.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {hasVotes && m.vote_total && m.vote_total > 0 && (
            <div style={{ textAlign: 'right', fontSize: 10, color: C.textMuted, marginTop: 7 }}>
              투표 {m.vote_total.toLocaleString()}표
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
//  상태 배지
// ═══════════════════════════════════════════
function StatusPill({ status }: { status: string }) {
  const MAP: Record<string, { label: string; color: string; pulse: boolean }> = {
    upcoming: { label: '발매중', color: C.accent,   pulse: true },
    closed:   { label: '마감',   color: C.one,      pulse: false },
    finished: { label: '종료',   color: C.textMuted, pulse: false },
  }
  const s = MAP[status] || MAP.closed
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999,
      background: s.color + '1f', border: `1px solid ${s.color}40`,
      fontSize: 11, fontWeight: 700, color: s.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, animation: s.pulse ? 'pulse2 1.5s infinite' : 'none' }} />
      {s.label}
    </span>
  )
}

// ═══════════════════════════════════════════
//  전략 박스
// ═══════════════════════════════════════════
function StrategyBox({ strategies, idx, setIdx, onShowSlip }: {
  strategies: Strategy[]; idx: number; setIdx: (i: number) => void; onShowSlip: () => void
}) {
  const s = strategies[idx]
  if (!s) return null

  return (
    <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>💰 예산별 추천 조합</span>
        <button onClick={onShowSlip} style={{
          padding: '7px 14px', borderRadius: 9, background: C.accent, color: '#06281d',
          border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer',
        }}>
          조합표 생성
        </button>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {strategies.map((st, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{
              flex: 1, padding: '8px 0', borderRadius: 9, cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
              background: idx === i ? C.accent + '22' : 'transparent',
              color: idx === i ? C.accent : C.textMuted,
              border: `1px solid ${idx === i ? C.accent + '55' : C.border}`,
            }}>
              {st.label.split('·')[0].replace(/[()]/g, '').trim()}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 12, lineHeight: 1.5 }}>{s.description}</div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, textAlign: 'center', padding: 12, background: C.surface2, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.win }}>{s.combinations}</div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>조합 (매)</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: 12, background: C.surface2, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.one }}>₩{s.budget.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>구매 금액</div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 8 }}>경기별 선택</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 6 }}>
          {s.selections?.map(sel => (
            <div key={sel.match_number} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px',
              background: C.surface2, borderRadius: 9, border: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 800 }}>{sel.match_number}</span>
              {sel.picks.map(p => (
                <span key={p} style={{ fontSize: 12, fontWeight: 900, color: OUTCOME_COLOR[p] }}>{PICK_SHORT[p]}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  조합표 모달
// ═══════════════════════════════════════════
function BettingSlipModal({ round, matches, strategy, onClose }: {
  round: TotoRound; matches: TotoMatch[]; strategy: Strategy; onClose: () => void
}) {
  const slipRef = useRef<HTMLDivElement>(null)

  const copySlip = () => {
    let text = `⚾ 야구 승1패 ${round.round_number}회차 AI 추천 조합표\n`
    text += `💰 예산: ₩${strategy.budget.toLocaleString()} (${strategy.combinations}매)\n`
    text += `━━━━━━━━━━━━━━━━━\n`
    matches.forEach(m => {
      const sel = strategy.selections?.find(s => s.match_number === m.match_number)
      const picks = sel?.picks.map(p => PICK_SHORT[p]).join('/') || '-'
      text += `${String(m.match_number).padStart(2, ' ')} ${(m.home_team_full || m.home_team).padEnd(8)} vs ${(m.away_team_full || m.away_team).padEnd(8)} → ${picks}\n`
    })
    text += `━━━━━━━━━━━━━━━━━\n📊 AI 분석 | spolive.com`
    navigator.clipboard.writeText(text).then(() => alert('조합표가 클립보드에 복사되었습니다!')).catch(() => {
      const ta = document.createElement('textarea'); ta.value = text
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
      alert('조합표가 복사되었습니다!')
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', maxWidth: 600, maxHeight: '85vh', background: C.bg,
        borderRadius: '20px 20px 0 0', overflow: 'hidden', animation: 'slideUp 0.25s ease-out',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>📋 AI 추천 조합표</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
              승1패 {round.round_number}회차 · ₩{strategy.budget.toLocaleString()} ({strategy.combinations}매)
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.textSub, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        <div ref={slipRef} style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.surface }}>
                <th style={{ ...slipTh, width: 30, textAlign: 'center' }}>No</th>
                <th style={{ ...slipTh, textAlign: 'left' }}>홈</th>
                <th style={{ ...slipTh, textAlign: 'left' }}>원정</th>
                <th style={{ ...slipTh, width: 64, textAlign: 'center' }}>AI 추천</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((mm, idx) => {
                const sel = strategy.selections?.find(s => s.match_number === mm.match_number)
                return (
                  <tr key={mm.match_number} style={{ background: idx % 2 === 0 ? C.surface2 : C.bg, borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ ...slipTd, textAlign: 'center', fontWeight: 800, color: C.textMuted }}>{mm.match_number}</td>
                    <td style={{ ...slipTd, fontWeight: 600, color: C.text }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <TeamLogo src={mm.home_logo} name={mm.home_team_full} size={22} />
                        <span style={{ fontSize: 12 }}>{mm.home_team_full}</span>
                      </div>
                    </td>
                    <td style={{ ...slipTd, fontWeight: 600, color: C.text }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <TeamLogo src={mm.away_logo} name={mm.away_team_full} size={22} />
                        <span style={{ fontSize: 12 }}>{mm.away_team_full}</span>
                      </div>
                    </td>
                    <td style={{ ...slipTd, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                        {sel?.picks.map(p => (
                          <span key={p} style={{ fontSize: 12, fontWeight: 900, color: OUTCOME_COLOR[p] }}>{PICK_SHORT[p]}</span>
                        )) || <span style={{ color: C.textMuted }}>-</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div style={{ padding: '14px 18px', background: C.surface, borderTop: `1px solid ${C.borderStrong}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>조합 수</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.win }}>{strategy.combinations}매</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>구매 금액</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.one }}>₩{strategy.budget.toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
              ⚾ AI 분석 · spolive.com
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 18px', borderTop: `1px solid ${C.borderStrong}`, display: 'flex', gap: 8, flexShrink: 0, background: C.surface }}>
          <button onClick={copySlip} style={{ flex: 1, padding: '13px 0', background: C.accent, color: '#06281d', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            📋 텍스트 복사
          </button>
          <button onClick={() => alert('화면을 길게 눌러 스크린샷을 저장하세요!')} style={{ flex: 1, padding: '13px 0', background: C.surface2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 11, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
            📷 캡처 저장
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  로딩 / 에러
// ═══════════════════════════════════════════
function LoadingUI() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 38, height: 38, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: C.textSub }}>데이터 로딩중</div>
      <style jsx>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ErrorUI({ msg, retry }: { msg: string; retry: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>데이터를 불러올 수 없습니다</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>{msg}</div>
      <button onClick={retry} style={{ padding: '11px 30px', background: C.accent, color: '#06281d', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
        다시 시도
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════
//  테이블 스타일
// ═══════════════════════════════════════════
const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9aa7b6' }
const td: React.CSSProperties = { padding: '9px 10px', textAlign: 'center', fontWeight: 600, fontSize: 12.5, color: '#f1f5f9', borderTop: '1px solid rgba(255,255,255,0.05)' }
const tdL: React.CSSProperties = { padding: '9px 12px', fontSize: 11, color: '#9aa7b6', fontWeight: 600, borderTop: '1px solid rgba(255,255,255,0.05)' }
const slipTh: React.CSSProperties = { padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#9aa7b6', borderBottom: '1px solid rgba(255,255,255,0.08)' }
const slipTd: React.CSSProperties = { padding: '9px 12px', fontSize: 12, verticalAlign: 'middle' }
