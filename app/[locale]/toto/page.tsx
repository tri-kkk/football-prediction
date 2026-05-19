// app/toto/page.tsx
// TrendSoccer 프로토 승무패 v5.1
// 수정: 국기 제거, 테이블 가독성 개선, 조합표 생성 기능
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

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
  league: string
  match_date?: string
  vote_win: number
  vote_draw: number
  vote_lose: number
  vote_count_win?: number
  vote_count_draw?: number
  vote_count_lose?: number
  vote_total?: number
  ts_win: number
  ts_draw: number
  ts_lose: number
  divergence_win: number
  divergence_draw: number
  divergence_lose: number
  max_divergence: number
  grade: 'PICK' | 'GOOD' | 'FAIR' | 'PASS'
  primary_pick: 'W' | 'D' | 'L'
  secondary_pick?: 'W' | 'D' | 'L'
  analysis: string
  result?: 'W' | 'D' | 'L'
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
  const m = d.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (m) {
    const days = ['일','월','화','수','목','금','토']
    const dt = new Date(+m[1], +m[2]-1, +m[3])
    return `${m[2]}.${m[3]}(${days[dt.getDay()]}) ${m[4]}:${m[5]}`
  }
  return d
}

function fmtVotes(n?: number): string {
  if (!n) return '0'
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억'
  if (n >= 10000) return (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '만'
  return n.toLocaleString()
}

// ★ 국기 제거 — 리그명만 표시
const LEAGUE_MAP: Record<string, { name: string; color: string }> = {
  'EPL':        { name: 'EPL', color: '#8b5cf6' },
  'La Liga':    { name: '라리가', color: '#f59e0b' },
  'Serie A':    { name: '세리에', color: '#3b82f6' },
  'Bundesliga': { name: '분데스', color: '#ef4444' },
  'Ligue 1':    { name: '리그1', color: '#06b6d4' },
  'K League':   { name: 'K리그', color: '#ec4899' },
  'ACL':        { name: 'ACL', color: '#10b981' },
  'Other':      { name: '기타', color: '#64748b' },
}

// 다크테마 컬러 — 가독성 개선
const C = {
  bg: '#0f1923',
  card: '#1a2332',
  cardAlt: '#162029',     // 교차 행 색상
  border: '#2a3a4a',
  borderBright: '#3a4e60', // 강조 보더
  text: '#e8edf2',
  textSub: '#94a3b8',      // 밝게 올림
  textMuted: '#64748b',    // 밝게 올림
  accent: '#3b82f6',
  win: '#3b82f6',
  draw: '#94a3b8',
  lose: '#ef4444',
}

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PICK: { bg: '#1a3a5c', text: '#60a5fa', border: '#2563eb50' },
  GOOD: { bg: '#1a3a2a', text: '#4ade80', border: '#16a34a50' },
  FAIR: { bg: '#3a2a1a', text: '#fbbf24', border: '#d9770650' },
  PASS: { bg: '#3a1a1a', text: '#f87171', border: '#dc262650' },
}

// ===== 메인 =====
export default function TotoPage() {
  const [data, setData] = useState<TotoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('ALL')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [budgetIdx, setBudgetIdx] = useState(0)
  const [showSlip, setShowSlip] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      setLoading(true); setError(null)
      const res = await fetch('/api/toto/round')
      if (!res.ok) {
        if (res.status === 404) {
          const s = await fetch('/api/toto/scrape')
          if (s.ok) {
            const r2 = await fetch('/api/toto/round')
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

  const matches = useMemo(() => {
    if (!data?.matches) return []
    if (filter === 'PICK') return data.matches.filter(m => m.grade === 'PICK')
    if (filter === 'GOOD') return data.matches.filter(m => m.grade === 'GOOD')
    if (filter === 'CAUTION') return data.matches.filter(m => m.grade === 'FAIR' || m.grade === 'PASS')
    return data.matches
  }, [data?.matches, filter])

  const hasVotes = data?.matches?.some(m => (m.vote_total || 0) > 0) ?? false
  const totalVotes = data?.matches?.reduce((s, m) => s + (m.vote_total || 0), 0) ?? 0

  if (loading) return <LoadingUI />
  if (error) return <ErrorUI msg={error} retry={load} />
  if (!data) return null

  const { round, summary, strategies } = data
  const gc = summary?.grade_count || {}

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Noto Sans KR', -apple-system, sans-serif" }}>

      {/* ── 페이지 헤더 ── */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        background: C.card,
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <a href="/" style={{ color: C.textMuted, textDecoration: 'none', fontSize: 12, fontWeight: 500 }}>
                TrendSoccer
              </a>
              <span style={{ color: C.textMuted, fontSize: 10 }}>›</span>
              <span style={{ color: C.text, fontSize: 15, fontWeight: 800 }}>
                승무패 {round.round_number}회차
              </span>
            </div>
            <StatusPill status={round.status} />
          </div>
        </div>
      </div>

      {/* ── 요약 바 ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '10px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <StatChip label="경기" value={`${data.matches.length}`} />
            <StatChip label="PICK" value={`${gc['PICK'] || 0}`} color="#60a5fa" />
            <StatChip label="GOOD" value={`${gc['GOOD'] || 0}`} color="#4ade80" />
            {hasVotes && <StatChip label="투표" value={fmtVotes(totalVotes)} />}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 0 80px' }}>

        {/* ── 필터 탭 ── */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${C.border}`,
          padding: '0 16px',
        }}>
          {[
            { key: 'ALL', label: '전체', count: data.matches.length },
            { key: 'PICK', label: 'PICK', count: gc['PICK'] || 0 },
            { key: 'GOOD', label: 'GOOD', count: gc['GOOD'] || 0 },
            { key: 'CAUTION', label: '주의', count: (gc['FAIR'] || 0) + (gc['PASS'] || 0) },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{
              flex: 1, padding: '10px 0',
              background: 'transparent', border: 'none',
              borderBottom: filter === t.key ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 13, fontWeight: filter === t.key ? 700 : 500,
              color: filter === t.key ? C.text : C.textMuted,
              textAlign: 'center',
            }}>
              {t.label}
              <span style={{
                marginLeft: 4, fontSize: 11,
                color: filter === t.key ? '#3b82f6' : C.textMuted,
              }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* ── 투표 대기 배너 ── */}
        {!hasVotes && (
          <div style={{
            margin: '10px 16px',
            padding: '8px 12px',
            background: '#1c2a1c',
            border: '1px solid #2a3a2a',
            borderRadius: 6, fontSize: 12, color: '#8bc34a',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            📊 아직 투표가 시작되지 않았습니다
          </div>
        )}

        {/* ── 테이블 헤더 ── */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '8px 16px',
          fontSize: 11, fontWeight: 700, color: C.textSub,
          borderBottom: `1px solid ${C.borderBright}`,
          background: '#131d28',
        }}>
          <span style={{ width: 28 }}>No</span>
          <span style={{ flex: 1 }}>홈</span>
          <span style={{ width: 24, textAlign: 'center' }}></span>
          <span style={{ flex: 1, textAlign: 'right' }}>원정</span>
          <span style={{ width: 48, textAlign: 'right' }}>등급</span>
        </div>

        {/* ── 경기 리스트 ── */}
        {matches.map((m, idx) => (
          <MatchRow
            key={m.match_number}
            m={m}
            idx={idx}
            expanded={expandedId === m.match_number}
            toggle={() => setExpandedId(expandedId === m.match_number ? null : m.match_number)}
            hasVotes={hasVotes}
            strategy={strategies?.[budgetIdx]}
          />
        ))}

        {/* ── 전략 ── */}
        {strategies && strategies.length > 0 && (
          <StrategyBox
            strategies={strategies}
            idx={budgetIdx}
            setIdx={setBudgetIdx}
            onShowSlip={() => setShowSlip(true)}
          />
        )}

        {/* ── 면책 ── */}
        <p style={{ margin: '20px 16px', fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>
          ※ AI 기반 참고 자료입니다. 실제 결과와 다를 수 있으며, 투표 데이터는 wisetoto.com에서 제공됩니다.
        </p>
      </div>

      {/* ── 조합표 모달 ── */}
      {showSlip && strategies?.[budgetIdx] && (
        <BettingSlipModal
          round={round}
          matches={data.matches}
          strategy={strategies[budgetIdx]}
          onClose={() => setShowSlip(false)}
        />
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: ${C.bg}; font-family: 'Noto Sans KR', -apple-system, sans-serif; }
        @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════
//  경기 행 — 가독성 개선
// ═══════════════════════════════════════════
function MatchRow({ m, idx, expanded, toggle, hasVotes, strategy }: {
  m: TotoMatch; idx: number; expanded: boolean; toggle: () => void
  hasVotes: boolean; strategy?: Strategy
}) {
  const league = LEAGUE_MAP[m.league] || LEAGUE_MAP['Other']
  const pickShort: Record<string, string> = { W: '승', D: '무', L: '패' }
  const stratPicks = strategy?.selections?.find(s => s.match_number === m.match_number)
  const gc = GRADE_COLORS[m.grade] || GRADE_COLORS.PASS
  const isOdd = idx % 2 === 1

  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`,
      background: isOdd ? C.cardAlt : 'transparent',
    }}>
      {/* ── 메인 클릭 ── */}
      <div onClick={toggle} style={{ padding: '10px 16px', cursor: 'pointer' }}>

        {/* 리그 + 시간 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: league.color,
              background: league.color + '20',
              padding: '2px 8px', borderRadius: 3,
              letterSpacing: 0.3,
            }}>
              {league.name}
            </span>
            <span style={{ fontSize: 10, color: C.textMuted }}>{fmtDate(m.match_date)}</span>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 800,
            padding: '2px 10px', borderRadius: 4,
            background: gc.bg, color: gc.text,
            border: `1px solid ${gc.border}`,
            letterSpacing: 0.5,
          }}>
            {m.grade === 'PICK' ? 'TOP' : m.grade === 'GOOD' ? 'WATCH' : m.grade}
          </span>
        </div>

        {/* 팀명 행 */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{
            width: 26, fontSize: 13, fontWeight: 800,
            color: C.textMuted, flexShrink: 0,
          }}>
            {m.match_number}
          </span>
          <span style={{
            flex: 1, fontSize: 14, fontWeight: 700, color: C.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {m.home_team_full || m.home_team}
          </span>
          <span style={{
            width: 28, textAlign: 'center',
            fontSize: 10, color: C.textMuted, fontWeight: 500, flexShrink: 0,
          }}>vs</span>
          <span style={{
            flex: 1, fontSize: 14, fontWeight: 700, color: C.text,
            textAlign: 'right',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {m.away_team_full || m.away_team}
          </span>
        </div>

        {/* 투표율 바 — 더 선명하게 */}
        {hasVotes && (
          <div style={{ marginTop: 8, marginLeft: 26 }}>
            <div style={{
              display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden',
              background: '#1e2d3d',
              border: `1px solid ${C.border}`,
            }}>
              <VoteSegment pct={m.vote_win} color="#3b82f6" />
              <VoteSegment pct={m.vote_draw} color="#64748b" />
              <VoteSegment pct={m.vote_lose} color="#ef4444" />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: 3, fontSize: 10, fontWeight: 700,
            }}>
              <span style={{ color: '#60a5fa' }}>승 {m.vote_win.toFixed(1)}%</span>
              <span style={{ color: '#94a3b8' }}>무 {m.vote_draw.toFixed(1)}%</span>
              <span style={{ color: '#f87171' }}>패 {m.vote_lose.toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* AI 추천 + 전략 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginTop: 6, marginLeft: 26,
        }}>
          <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>AI</span>
          <PickTag pick={m.primary_pick} primary grade={m.grade} />
          {m.secondary_pick && <PickTag pick={m.secondary_pick} grade={m.grade} />}
          {stratPicks && (
            <>
              <span style={{ width: 1, height: 12, background: C.border }} />
              <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>전략</span>
              {stratPicks.picks.map(p => (
                <span key={p} style={{
                  fontSize: 10, fontWeight: 800,
                  padding: '2px 7px', borderRadius: 3,
                  background: '#2a2010', color: '#fbbf24',
                  border: '1px solid #3a3020',
                }}>{pickShort[p]}</span>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── 상세 펼침 ── */}
      {expanded && (
        <div style={{
          padding: '0 16px 14px 42px',
          animation: 'fadeIn 0.15s ease-out',
        }}>
          {/* AI 분석 */}
          <div style={{
            padding: '10px 12px',
            background: '#111c28',
            borderRadius: 6,
            border: `1px solid ${C.border}`,
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>
              🤖 AI 분석
            </div>
            <div style={{ fontSize: 12, color: '#b0bec5', lineHeight: 1.7 }}>
              {m.analysis}
            </div>
          </div>

          {/* 비교 테이블 — 가독성 대폭 개선 */}
          {hasVotes && (
            <div style={{
              borderRadius: 6, overflow: 'hidden',
              border: `1px solid ${C.borderBright}`,
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#1a2838' }}>
                    <th style={thStyle}></th>
                    <th style={{ ...thStyle, color: '#60a5fa' }}>승</th>
                    <th style={{ ...thStyle, color: '#94a3b8' }}>무</th>
                    <th style={{ ...thStyle, color: '#f87171' }}>패</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#141f2c' }}>
                    <td style={tdLabel}>투표율</td>
                    <td style={tdVal}>{m.vote_win.toFixed(1)}%</td>
                    <td style={tdVal}>{m.vote_draw.toFixed(1)}%</td>
                    <td style={tdVal}>{m.vote_lose.toFixed(1)}%</td>
                  </tr>
                  <tr style={{ background: '#1a2838' }}>
                    <td style={tdLabel}>AI 분석</td>
                    <td style={{ ...tdVal, color: '#60a5fa', fontWeight: 800 }}>{m.ts_win.toFixed(1)}%</td>
                    <td style={{ ...tdVal, color: '#60a5fa', fontWeight: 800 }}>{m.ts_draw.toFixed(1)}%</td>
                    <td style={{ ...tdVal, color: '#60a5fa', fontWeight: 800 }}>{m.ts_lose.toFixed(1)}%</td>
                  </tr>
                  <tr style={{ background: '#141f2c' }}>
                    <td style={tdLabel}>괴리율</td>
                    {[m.divergence_win, m.divergence_draw, m.divergence_lose].map((v, i) => (
                      <td key={i} style={{
                        ...tdVal,
                        fontWeight: 800,
                        color: Math.abs(v) >= 5 ? (v > 0 ? '#4ade80' : '#f87171') : C.textMuted,
                        background: Math.abs(v) >= 10 ? (v > 0 ? '#0a2a1a' : '#2a0a0a') : 'transparent',
                      }}>
                        {v > 0 ? '+' : ''}{v.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {hasVotes && m.vote_total && m.vote_total > 0 && (
            <div style={{ textAlign: 'right', fontSize: 10, color: C.textMuted, marginTop: 6 }}>
              투표 {m.vote_total.toLocaleString()}표
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
//  서브 컴포넌트
// ═══════════════════════════════════════════
function VoteSegment({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{
      width: `${pct}%`, background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'width 0.4s ease', minWidth: 0,
    }}>
      {pct >= 15 && (
        <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
          {pct.toFixed(0)}
        </span>
      )}
    </div>
  )
}

function PickTag({ pick, primary, grade }: { pick: string; primary?: boolean; grade: string }) {
  const labels: Record<string, string> = { W: '홈승', D: '무', L: '원정승' }
  const g = GRADE_COLORS[grade] || GRADE_COLORS.PASS
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      padding: '2px 8px', borderRadius: 3,
      background: primary ? g.bg : 'transparent',
      color: primary ? g.text : C.textMuted,
      border: primary ? `1px solid ${g.border}` : `1px solid ${C.border}`,
    }}>
      {labels[pick]}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const live = status === 'upcoming'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: live ? '#0d3320' : '#3a1a1a',
      border: `1px solid ${live ? '#16a34a30' : '#dc262630'}`,
      fontSize: 11, fontWeight: 700,
      color: live ? '#4ade80' : '#f87171',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: live ? '#4ade80' : '#f87171',
        animation: live ? 'pulse2 1.5s infinite' : 'none',
      }} />
      {live ? '발매중' : '마감'}
    </span>
  )
}

function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 11, color: C.textMuted }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: color || C.text }}>{value}</span>
    </div>
  )
}

// ═══════════════════════════════════════════
//  전략 박스 — "조합표 생성" 버튼 추가
// ═══════════════════════════════════════════
function StrategyBox({ strategies, idx, setIdx, onShowSlip }: {
  strategies: Strategy[]; idx: number; setIdx: (i: number) => void
  onShowSlip: () => void
}) {
  const s = strategies[idx]
  if (!s) return null
  const pLabel: Record<string, string> = { W: '승', D: '무', L: '패' }

  return (
    <div style={{
      margin: '16px 12px 0',
      background: C.card,
      borderRadius: 8,
      border: `1px solid ${C.border}`,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>
          💰 예산별 추천 조합
        </span>
        {/* ★ 조합표 생성 버튼 */}
        <button onClick={onShowSlip} style={{
          padding: '5px 12px', borderRadius: 5,
          background: '#3b82f6', color: '#fff',
          border: 'none', fontSize: 11, fontWeight: 700,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          📋 조합표 생성
        </button>
      </div>

      <div style={{ padding: 14 }}>
        {/* 탭 */}
        <div style={{
          display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden',
          border: `1px solid ${C.border}`, marginBottom: 12,
        }}>
          {strategies.map((st, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{
              flex: 1, padding: '7px 0', border: 'none',
              borderRight: i < strategies.length - 1 ? `1px solid ${C.border}` : 'none',
              cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: idx === i ? '#3b82f6' : C.card,
              color: idx === i ? '#fff' : C.textMuted,
            }}>
              {st.label.split('·')[0].replace(/[()]/g, '').trim()}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 10, lineHeight: 1.5 }}>
          {s.description}
        </div>

        {/* 숫자 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{
            flex: 1, textAlign: 'center', padding: 10,
            background: '#111c2e', borderRadius: 8, border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#60a5fa' }}>{s.combinations}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>조합 (매)</div>
          </div>
          <div style={{
            flex: 1, textAlign: 'center', padding: 10,
            background: '#1e1a10', borderRadius: 8, border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fbbf24' }}>₩{s.budget.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>구매 금액</div>
          </div>
        </div>

        {/* 그리드 — 가독성 개선 */}
        <div style={{ fontSize: 11, color: C.textSub, fontWeight: 600, marginBottom: 6 }}>
          경기별 선택
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: 6,
        }}>
          {s.selections?.map(sel => (
            <div key={sel.match_number} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 10px',
              background: '#141f2c',
              borderRadius: 5,
              border: `1px solid ${sel.count === 1 ? '#2563eb40' : sel.count === 2 ? '#d9770640' : '#dc262640'}`,
            }}>
              <span style={{ fontSize: 11, color: C.textSub, fontWeight: 800 }}>
                {sel.match_number}
              </span>
              {sel.picks.map(p => (
                <span key={p} style={{
                  fontSize: 11, fontWeight: 800,
                  color: sel.count === 1 ? '#60a5fa' : sel.count === 2 ? '#fbbf24' : '#f87171',
                }}>
                  {pLabel[p]}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  ★★ 조합표 모달 (저장/캡처용)
// ═══════════════════════════════════════════
function BettingSlipModal({ round, matches, strategy, onClose }: {
  round: TotoRound; matches: TotoMatch[]
  strategy: Strategy; onClose: () => void
}) {
  const slipRef = useRef<HTMLDivElement>(null)
  const pLabel: Record<string, string> = { W: '승', D: '무', L: '패' }

  const copySlip = () => {
    // 텍스트 조합표 생성
    let text = `⚽ 승무패 ${round.round_number}회차 AI 추천 조합표\n`
    text += `💰 예산: ₩${strategy.budget.toLocaleString()} (${strategy.combinations}매)\n`
    text += `━━━━━━━━━━━━━━━━━\n`
    
    matches.forEach(m => {
      const sel = strategy.selections?.find(s => s.match_number === m.match_number)
      const picks = sel?.picks.map(p => pLabel[p]).join('/') || '-'
      const grade = m.grade
      text += `${String(m.match_number).padStart(2, ' ')} ${(m.home_team_full || m.home_team).padEnd(8)} vs ${(m.away_team_full || m.away_team).padEnd(8)} → ${picks} [${grade}]\n`
    })

    text += `━━━━━━━━━━━━━━━━━\n`
    text += `📊 TrendSoccer AI 분석 | trendsoccer.com`

    navigator.clipboard.writeText(text).then(() => {
      alert('조합표가 클립보드에 복사되었습니다!')
    }).catch(() => {
      // fallback: textarea 방식
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      alert('조합표가 복사되었습니다!')
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 640, maxHeight: '85vh',
          background: '#0f1923',
          borderRadius: '16px 16px 0 0',
          overflow: 'hidden',
          animation: 'slideUp 0.25s ease-out',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* 모달 헤더 */}
        <div style={{
          padding: '14px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
              📋 AI 추천 조합표
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
              승무패 {round.round_number}회차 · ₩{strategy.budget.toLocaleString()} ({strategy.combinations}매)
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#1a2332', border: `1px solid ${C.border}`,
            color: C.textMuted, fontSize: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* 조합표 본문 */}
        <div ref={slipRef} style={{
          flex: 1, overflowY: 'auto', padding: '0',
          WebkitOverflowScrolling: 'touch',
        }}>
          {/* 테이블 */}
          <table style={{
            width: '100%', borderCollapse: 'collapse', fontSize: 12,
          }}>
            <thead>
              <tr style={{ background: '#1a2838' }}>
                <th style={{ ...slipTh, width: 32, textAlign: 'center' }}>No</th>
                <th style={{ ...slipTh, textAlign: 'left' }}>홈</th>
                <th style={{ ...slipTh, textAlign: 'left' }}>원정</th>
                <th style={{ ...slipTh, width: 56, textAlign: 'center' }}>AI 추천</th>
                <th style={{ ...slipTh, width: 44, textAlign: 'center' }}>등급</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m, idx) => {
                const sel = strategy.selections?.find(s => s.match_number === m.match_number)
                const gc = GRADE_COLORS[m.grade] || GRADE_COLORS.PASS
                return (
                  <tr key={m.match_number} style={{
                    background: idx % 2 === 0 ? '#141f2c' : '#0f1923',
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    <td style={{ ...slipTd, textAlign: 'center', fontWeight: 800, color: C.textMuted }}>
                      {m.match_number}
                    </td>
                    <td style={{ ...slipTd, fontWeight: 600, color: C.text }}>
                      <div style={{ fontSize: 12 }}>{m.home_team_full || m.home_team}</div>
                      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>
                        {(LEAGUE_MAP[m.league] || LEAGUE_MAP['Other']).name}
                      </div>
                    </td>
                    <td style={{ ...slipTd, fontWeight: 600, color: C.text }}>
                      {m.away_team_full || m.away_team}
                    </td>
                    <td style={{ ...slipTd, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        {sel?.picks.map(p => (
                          <span key={p} style={{
                            fontSize: 11, fontWeight: 800,
                            padding: '2px 6px', borderRadius: 3,
                            background: sel.count === 1 ? '#1a3a5c' : '#2a2010',
                            color: sel.count === 1 ? '#60a5fa' : '#fbbf24',
                          }}>
                            {pLabel[p]}
                          </span>
                        )) || <span style={{ color: C.textMuted }}>-</span>}
                      </div>
                    </td>
                    <td style={{ ...slipTd, textAlign: 'center' }}>
                      <span style={{
                        fontSize: 9, fontWeight: 800,
                        padding: '2px 6px', borderRadius: 3,
                        background: gc.bg, color: gc.text,
                      }}>
                        {m.grade === 'PICK' ? 'TOP' : m.grade === 'GOOD' ? 'WATCH' : m.grade}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* 하단 정보 */}
          <div style={{
            padding: '12px 16px',
            background: '#1a2838',
            borderTop: `1px solid ${C.borderBright}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>조합 수</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa' }}>{strategy.combinations}매</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>구매 금액</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24' }}>₩{strategy.budget.toLocaleString()}</span>
            </div>
            <div style={{
              fontSize: 10, color: C.textMuted, textAlign: 'center',
              marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`,
            }}>
              ⚽ TrendSoccer AI 분석 · trendsoccer.com
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={{
          padding: '12px 16px',
          borderTop: `1px solid ${C.borderBright}`,
          display: 'flex', gap: 8,
          flexShrink: 0,
          background: C.card,
        }}>
          <button onClick={copySlip} style={{
            flex: 1, padding: '12px 0',
            background: '#3b82f6', color: '#fff',
            border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            📋 텍스트 복사
          </button>
          <button onClick={() => {
            // 스크린샷 안내
            alert('화면을 길게 눌러 스크린샷을 저장하세요!')
          }} style={{
            flex: 1, padding: '12px 0',
            background: '#1a2332', color: C.text,
            border: `1px solid ${C.border}`, borderRadius: 8,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
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
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 36, height: 36,
        border: `3px solid ${C.border}`,
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: C.text }}>
        데이터 로딩중
      </div>
      <style jsx>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ErrorUI({ msg, retry }: { msg: string; retry: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>
        데이터를 불러올 수 없습니다
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>{msg}</div>
      <button onClick={retry} style={{
        padding: '10px 28px', background: '#3b82f6', color: '#fff',
        border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}>
        다시 시도
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════
//  테이블 스타일
// ═══════════════════════════════════════════
const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  textAlign: 'center',
  fontSize: 11,
  fontWeight: 700,
  color: '#94a3b8',
  borderBottom: `2px solid #3a4e60`,
}

const tdVal: React.CSSProperties = {
  padding: '9px 10px',
  textAlign: 'center',
  fontWeight: 600,
  fontSize: 13,
  color: '#e8edf2',
  borderBottom: `1px solid #2a3a4a`,
}

const tdLabel: React.CSSProperties = {
  padding: '9px 12px',
  fontSize: 11,
  color: '#94a3b8',
  fontWeight: 600,
  borderBottom: `1px solid #2a3a4a`,
}

// 조합표 테이블 스타일
const slipTh: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 10,
  fontWeight: 700,
  color: '#94a3b8',
  borderBottom: `2px solid #3a4e60`,
}

const slipTd: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 12,
  verticalAlign: 'middle',
}
