'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useLanguage } from '../../contexts/LanguageContext'

// =====================================================
// 타입
// =====================================================
interface PickItem {
  matchId: number
  homeTeam: string
  awayTeam: string
  homeTeamKo: string
  awayTeamKo: string
  homeLogo?: string
  awayLogo?: string
  matchTime: string
  pick: 'home' | 'away'
  pickTeam: string
  pickTeamKo: string
  winProb: number
  odds: number
  reason: string
  // 결과 처리 후 추가되는 필드
  homeScore?: number
  awayScore?: number
  isCorrect?: boolean
  matchStatus?: string
}

interface ComboPick {
  id: number
  league: string
  pick_date: string
  fold_count: number
  picks: PickItem[]
  total_odds: number
  avg_confidence: number
  ai_analysis: string
  result: 'pending' | 'win' | 'lose' | 'partial' | 'cancelled'
  correct_count: number
  created_at: string
}

interface Stats {
  [key: string]: { total: number; wins: number; rate: number }
}

// =====================================================
// 팀 데이터
// =====================================================
const TEAM_COLORS: Record<string, string> = {
  'Hanwha Eagles': '#FF6600', 'LG Twins': '#C30452', 'Kiwoom Heroes': '#570514',
  'Lotte Giants': '#041E42', 'Samsung Lions': '#074CA1', 'Doosan Bears': '#131230',
  'KT Wiz Suwon': '#000', 'KT Wiz': '#000', 'KIA Tigers': '#EA0029',
  'NC Dinos': '#315288', 'SSG Landers': '#CE0E2D',
}

const TEAM_ABBR: Record<string, string> = {
  'Hanwha Eagles': 'HWE', 'LG Twins': 'LG', 'Kiwoom Heroes': 'KWM',
  'Lotte Giants': 'LTG', 'Samsung Lions': 'SSL', 'Doosan Bears': 'DSB',
  'KT Wiz Suwon': 'KT', 'KT Wiz': 'KT', 'KIA Tigers': 'KIA',
  'NC Dinos': 'NC', 'SSG Landers': 'SSG',
}

const LEAGUES = [
  { id: 'ALL', name: '전체', nameEn: 'All' },
  { id: 'KBO', name: 'KBO', nameEn: 'KBO' },
  { id: 'MLB', name: 'MLB', nameEn: 'MLB' },
  { id: 'NPB', name: 'NPB', nameEn: 'NPB' },
]

const LEAGUE_DOT: Record<string, string> = { KBO: '#ef4444', MLB: '#3b82f6', NPB: '#f97316' }

// =====================================================
// 팀 로고
// =====================================================
function TeamLogo({ logo, team, abbr, size = 48, isPicked }: {
  logo?: string; team: string; abbr: string; size?: number; isPicked?: boolean
}) {
  const color = TEAM_COLORS[team] || '#4b5563'
  const ring = isPicked ? '0 0 0 2.5px rgba(245,158,11,0.5), 0 4px 14px rgba(0,0,0,0.3)' : '0 4px 14px rgba(0,0,0,0.25)'
  if (logo) {
    return (
      <div className="rounded-full bg-white/95 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size, padding: size * 0.1, boxShadow: ring }}>
        <img src={logo} alt={abbr} className="w-full h-full object-contain"
          onError={(e) => {
            const el = e.target as HTMLImageElement; el.style.display = 'none'
            el.parentElement!.style.background = color
            el.parentElement!.innerHTML = `<span style="font-size:${size * 0.22}px;font-weight:900;color:#fff">${abbr}</span>`
          }} />
      </div>
    )
  }
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: color, boxShadow: ring, border: '2px solid rgba(255,255,255,0.08)' }}>
      <span style={{ fontSize: size * 0.22, fontWeight: 900, color: '#fff' }}>{abbr}</span>
    </div>
  )
}

// =====================================================
// 메인
// =====================================================
export default function ComboPicksPage() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const t = (ko: string, en: string) => language === 'en' ? en : ko

  const [league, setLeague] = useState('ALL')
  const [picks, setPicks] = useState<ComboPick[]>([])
  const [stats, setStats] = useState<Stats>({})
  const [typeStats, setTypeStats] = useState<{ safe: { total: number; wins: number; rate: number }; high: { total: number; wins: number; rate: number } }>({ safe: { total: 0, wins: 0, rate: 0 }, high: { total: 0, wins: 0, rate: 0 } })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'today' | 'history'>('today')
  const [weekOffset, setWeekOffset] = useState(0) // 0 = 이번주, -1 = 지난주 ...
  const cleanMd = (text: string) => text.replace(/\*\*/g, '')

  const isPremium = (session?.user as any)?.tier === 'premium'

  const getKSTToday = () => {
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
    return now.toISOString().split('T')[0]
  }
  const today = getKSTToday()

  // 주간 날짜 범위 계산 (월~일 기준)
  const getWeekRange = (offset: number) => {
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
    const todayDate = new Date(kstNow.toISOString().split('T')[0] + 'T00:00:00')
    const dayOfWeek = todayDate.getDay() // 0=일 1=월 ... 6=토
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(todayDate)
    monday.setDate(todayDate.getDate() + mondayOffset + offset * 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    return { start: fmt(monday), end: fmt(sunday) }
  }

  const weekRange = getWeekRange(weekOffset)

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    if (language === 'en') return `${d.getMonth() + 1}/${d.getDate()}`
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  const getWeekLabel = () => {
    if (weekOffset === 0) return t('이번 주', 'This Week')
    if (weekOffset === -1) return t('지난 주', 'Last Week')
    return `${formatShortDate(weekRange.start)} ~ ${formatShortDate(weekRange.end)}`
  }

  useEffect(() => { fetchPicks() }, [league, tab, weekOffset])

  const fetchPicks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (league !== 'ALL') params.set('league', league)
      if (tab === 'today') {
        // MLB는 전날 저녁에 다음날 픽을 생성하므로 오늘+내일 범위로 조회
        const kstTomorrow = new Date(Date.now() + 9 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000)
        const tomorrow = kstTomorrow.toISOString().split('T')[0]
        params.set('start_date', today)
        params.set('end_date', tomorrow)
      } else {
        // 히스토리: 주간 범위로 조회 (start_date ~ end_date)
        const range = getWeekRange(weekOffset)
        params.set('start_date', range.start)
        params.set('end_date', range.end)
      }
      const res = await fetch(`/api/baseball/combo-picks?${params}`)
      const data = await res.json()
      setPicks(data.picks || [])
      setStats(data.stats || {})
      setTypeStats(data.typeStats || { safe: { total: 0, wins: 0, rate: 0 }, high: { total: 0, wins: 0, rate: 0 } })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const days = ['일', '월', '화', '수', '목', '금', '토']
    if (language === 'en') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
  }

  const groupedByDate = picks.reduce((acc, p) => {
    if (!acc[p.pick_date]) acc[p.pick_date] = []
    acc[p.pick_date].push(p)
    return acc
  }, {} as Record<string, ComboPick[]>)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  const totalStats = Object.values(stats).reduce(
    (acc, s) => ({ total: acc.total + s.total, wins: acc.wins + s.wins }), { total: 0, wins: 0 }
  )
  const todayCount = tab === 'today' ? picks.length : picks.filter(p => p.pick_date === today).length
  const winRate = totalStats.total > 0 ? Math.round((totalStats.wins / totalStats.total) * 100) : 0
  const avgOdds = picks.length > 0 ? (picks.reduce((s, p) => s + (p.total_odds || 0), 0) / picks.length).toFixed(2) : '-'

  // 안전형/고배당 분리 적중률 (오늘 탭은 API에서 안 내려오므로 picks에서 직접 계산)
  const effectiveTypeStats = (() => {
    if (typeStats.safe.total > 0 || typeStats.high.total > 0) return typeStats
    const safe = { total: 0, wins: 0, rate: 0 }
    const high = { total: 0, wins: 0, rate: 0 }
    for (const p of picks) {
      if (p.result === 'win' || p.result === 'lose') {
        const target = p.fold_count === 2 ? safe : high
        target.total++
        if (p.result === 'win') target.wins++
      }
    }
    safe.rate = safe.total > 0 ? Math.round((safe.wins / safe.total) * 100) : 0
    high.rate = high.total > 0 ? Math.round((high.wins / high.total) * 100) : 0
    return { safe, high }
  })()

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0c1220 0%, #111827 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 pt-5 pb-24">

        {/* ====== 상단 헤더 ====== */}
        <div className="rounded-2xl p-5 mb-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(59,130,246,0.04) 100%)' }}>
          {/* 배경 장식 */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{formatDate(today)}</h2>
              <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                {todayCount > 0
                  ? t(`${todayCount}개 AI 조합 분석 완료`, `${todayCount} AI combos analyzed`)
                  : t('경기 시작 전 분석 예정', 'Analysis pending')}
              </p>
            </div>
            <div className="flex rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['today', 'history'] as const).map(v => (
                <button key={v} onClick={() => { setTab(v); if (v === 'history') setWeekOffset(0) }}
                  className={`px-4 py-2 text-xs font-bold transition-all ${tab === v ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  style={tab === v ? { background: 'rgba(16,185,129,0.2)' } : {}}>
                  {v === 'today' ? t('오늘', 'Today') : t('히스토리', 'History')}
                </button>
              ))}
            </div>
          </div>

          {/* 주간 네비게이션 (히스토리 탭) */}
          {tab === 'history' && (
            <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setWeekOffset(prev => prev - 1)}
                className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:brightness-125 active:scale-95"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div className="text-center">
                <div className="text-[13px] font-bold text-white">
                  {formatShortDate(weekRange.start)} ~ {formatShortDate(weekRange.end)}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: '#10b981' }}>{getWeekLabel()}</div>
              </div>
              <button onClick={() => setWeekOffset(prev => Math.min(prev + 1, 0))}
                disabled={weekOffset >= 0}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${weekOffset >= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:brightness-125 active:scale-95'}`}
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          )}

          {/* 1행: 전체 요약 */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { label: tab === 'history' ? t('주간 조합', 'WEEKLY') : t('오늘 조합', 'COMBOS'), value: tab === 'history' ? String(picks.length) : String(todayCount), color: '#e2e8f0' },
              { label: t('적중률', 'WIN RATE'), value: totalStats.total > 0 ? `${winRate}%` : '-%', color: winRate > 0 ? '#10b981' : '#64748b' },
              { label: t('평균 배당', 'AVG ODDS'), value: String(avgOdds), color: '#fbbf24' },
            ].map((item, i) => (
              <div key={i} className="rounded-xl p-3.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="text-[10px] font-semibold tracking-wider mb-1.5" style={{ color: '#64748b' }}>{item.label}</div>
                <div className="text-2xl font-black" style={{ color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
          {/* 2행: 안전형/고배당 적중률 분리 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>{t('안전형', 'SAFE')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black" style={{ color: '#10b981' }}>
                  {effectiveTypeStats.safe.total > 0 ? `${effectiveTypeStats.safe.rate}%` : '-%'}
                </span>
                <span className="text-[10px]" style={{ color: '#64748b' }}>
                  {effectiveTypeStats.safe.total > 0 ? `${effectiveTypeStats.safe.wins}/${effectiveTypeStats.safe.total}` : ''}
                </span>
              </div>
            </div>
            <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
                <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>{t('고배당', 'HIGH')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black" style={{ color: '#f59e0b' }}>
                  {effectiveTypeStats.high.total > 0 ? `${effectiveTypeStats.high.rate}%` : '-%'}
                </span>
                <span className="text-[10px]" style={{ color: '#64748b' }}>
                  {effectiveTypeStats.high.total > 0 ? `${effectiveTypeStats.high.wins}/${effectiveTypeStats.high.total}` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ====== 리그 필터 ====== */}
        <div className="flex gap-2 mb-5">
          {LEAGUES.map(l => (
            <button key={l.id} onClick={() => setLeague(l.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${league === l.id ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
              style={league === l.id
                ? { background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.25)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }
              }>
              {language === 'en' ? l.nameEn : l.name}
            </button>
          ))}
        </div>

        {/* ====== 로딩 ====== */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ====== 프리미엄 잠금 ====== */}
        {!loading && !isPremium && (
          <div className="rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(15,23,42,0.95) 60%)', border: '1px solid rgba(16,185,129,0.12)' }}>
            {/* 배경 글로우 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #10b981, transparent)' }} />

            <div className="relative px-5 pt-7 pb-6">
              {/* 상단: 리그 로고 쇼케이스 */}
              <div className="relative mb-5 flex justify-center items-center gap-6 py-3">
                {[
                  { src: 'https://media.api-sports.io/baseball/leagues/5.png', name: 'KBO', color: '#ef4444' },
                  { src: 'https://media.api-sports.io/baseball/leagues/1.png', name: 'MLB', color: '#3b82f6' },
                  { src: 'https://media.api-sports.io/baseball/leagues/2.png', name: 'NPB', color: '#f97316' },
                ].map((lg) => (
                  <div key={lg.name} className="flex flex-col items-center gap-1.5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${lg.color}10, ${lg.color}05)`, border: `1px solid ${lg.color}18` }}>
                      <img src={lg.src} alt={lg.name} width={32} height={32} style={{ objectFit: 'contain' }} />
                    </div>
                    <span className="text-[9px] font-bold tracking-wide" style={{ color: lg.color, opacity: 0.6 }}>{lg.name}</span>
                  </div>
                ))}
              </div>

              {/* 텍스트 */}
              <div className="text-center mb-4">
                <h3 className="text-[14px] font-black text-white mb-1">{t('오늘의 AI 조합을 확인하세요', 'Unlock Today\'s AI Combos')}</h3>
                <p className="text-[11.5px]" style={{ color: '#64748b' }}>
                  {t('매일 3대 리그 AI 분석 조합 제공', 'Daily AI combo picks for KBO · MLB · NPB')}
                </p>
              </div>

              {/* 기능 하이라이트 */}
              <div className="flex justify-center gap-1 mb-5">
                {[
                  { label: t('2·3폴드 조합', '2·3 Fold'), color: '#10b981' },
                  { label: t('AI 분석 리포트', 'AI Reports'), color: '#10b981' },
                  { label: t('매일 자동 생성', 'Daily Auto'), color: '#10b981' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2.5 py-1">
                    <div className="w-1 h-1 rounded-full" style={{ background: item.color, opacity: 0.5 }} />
                    <span className="text-[10.5px]" style={{ color: '#94a3b8' }}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* CTA 버튼 */}
              <div className="text-center">
                <Link href="/premium/pricing"
                  className="inline-flex items-center justify-center gap-2 w-full max-w-[280px] py-3 text-[13px] font-bold rounded-xl text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 24px rgba(16,185,129,0.3)' }}
                >
                  {t('프리미엄 시작하기', 'Start Premium')}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ====== 빈 상태 ====== */}
        {!loading && isPremium && picks.length === 0 && (() => {
          const leagueInfo: Record<string, { color: string; gradient: string; time: string; timeEn: string; logo: string }> = {
            KBO: {
              color: '#ef4444', gradient: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)',
              time: '오후 12시 자동 생성', timeEn: 'Daily at 12PM KST',
              logo: 'https://media.api-sports.io/baseball/leagues/5.png',
            },
            MLB: {
              color: '#3b82f6', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.02) 100%)',
              time: '저녁 9시 자동 생성', timeEn: 'Daily at 9PM KST',
              logo: 'https://media.api-sports.io/baseball/leagues/1.png',
            },
            NPB: {
              color: '#f97316', gradient: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(249,115,22,0.02) 100%)',
              time: '오후 12시 자동 생성', timeEn: 'Daily at 12PM KST',
              logo: 'https://media.api-sports.io/baseball/leagues/2.png',
            },
          }
          const activeLeagues = league === 'ALL' ? ['KBO', 'MLB', 'NPB'] : [league]

          if (tab === 'history') {
            return (
              <div className="rounded-xl px-5 py-6 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-sm text-gray-500">{t('아직 히스토리가 없습니다', 'No history yet')}</p>
              </div>
            )
          }

          return (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="px-5 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[12px] font-bold text-emerald-400">{t('AI 조합 대기', 'AI Combo Standby')}</span>
                </div>

                <div className={`grid gap-3 ${activeLeagues.length === 1 ? 'grid-cols-1' : 'grid-cols-3'}`}>
                  {activeLeagues.map(lg => {
                    const info = leagueInfo[lg]
                    if (!info) return null
                    return (
                      <div key={lg} className="rounded-xl px-3 py-3 flex flex-col items-center text-center gap-2"
                        style={{ background: info.gradient, border: `1px solid ${info.color}15` }}>
                        <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
                          style={{ background: `${info.color}10`, border: `1px solid ${info.color}20` }}>
                          <img src={info.logo} alt={lg} width={28} height={28} style={{ objectFit: 'contain' }} />
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[13px] font-black" style={{ color: info.color }}>{lg}</span>
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: `${info.color}12`, color: `${info.color}99` }}>
                              {t('준비중', 'SOON')}
                            </span>
                          </div>
                          <p className="text-[10px] mt-1 whitespace-nowrap" style={{ color: '#64748b' }}>
                            {language === 'en' ? info.timeEn : info.time}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ====== 조합 카드 그리드 ====== */}
        {!loading && isPremium && sortedDates.map(date => (
          <div key={date} className="mb-6">
            {tab === 'history' && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-bold text-white">{formatDate(date)}</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedByDate[date].map(combo => (
                <ComboCard key={combo.id} combo={combo} t={t} language={language} cleanMd={cleanMd} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// =====================================================
// 조합 카드
// =====================================================
function ComboCard({ combo, t, language, cleanMd }: {
  combo: ComboPick; t: (ko: string, en: string) => string; language: string
  cleanMd: (text: string) => string
}) {
  const leagueColor = LEAGUE_DOT[combo.league] || '#6b7280'

  const RS: Record<string, { bg: string; accent: string; badgeBg: string; label: string; border: string }> = {
    pending:   { bg: 'rgba(255,255,255,0.025)', accent: '#94a3b8', badgeBg: 'rgba(148,163,184,0.12)', label: t('진행중', 'LIVE'), border: 'rgba(255,255,255,0.06)' },
    win:       { bg: 'rgba(16,185,129,0.04)', accent: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', label: t('적중', 'WIN'), border: 'rgba(16,185,129,0.15)' },
    lose:      { bg: 'rgba(239,68,68,0.03)', accent: '#ef4444', badgeBg: 'rgba(239,68,68,0.15)', label: t('미적중', 'LOSE'), border: 'rgba(239,68,68,0.12)' },
    partial:   { bg: 'rgba(245,158,11,0.03)', accent: '#f59e0b', badgeBg: 'rgba(245,158,11,0.15)', label: t('부분', 'PARTIAL'), border: 'rgba(245,158,11,0.12)' },
    cancelled: { bg: 'rgba(255,255,255,0.015)', accent: '#4b5563', badgeBg: 'rgba(75,85,99,0.15)', label: t('취소', 'VOID'), border: 'rgba(255,255,255,0.04)' },
  }
  const rs = RS[combo.result] || RS.pending
  const isSafe = combo.fold_count === 2
  const stratColor = isSafe ? '#10b981' : '#f59e0b'

  return (
    <div className="rounded-2xl overflow-hidden transition-all hover:translate-y-[-2px]"
      style={{ background: rs.bg, border: `1px solid ${rs.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>

      {/* 카드 헤더 */}
      <div className="px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2">
          {/* 리그 뱃지 */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md"
            style={{ background: `${leagueColor}15` }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: leagueColor }} />
            <span className="text-[10px] font-black tracking-wide" style={{ color: leagueColor }}>{combo.league}</span>
          </div>
          {/* 콤보 수 */}
          <span className="text-white font-extrabold text-[13px]">{combo.fold_count} COMBO</span>
          {/* 전략 뱃지 */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md"
            style={{ background: `${stratColor}12`, border: `1px solid ${stratColor}25` }}>
            <div className="w-1 h-1 rounded-full" style={{ background: stratColor }} />
            <span className="text-[9px] font-bold" style={{ color: stratColor }}>
              {isSafe ? t('안전형', 'SAFE') : t('고배당', 'HIGH')}
            </span>
          </div>
        </div>
        {/* 결과 뱃지 */}
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md"
          style={{ background: rs.badgeBg, color: rs.accent }}>
          {rs.label}
        </span>
      </div>

      {/* 경기 리스트 */}
      <div className="px-5 py-3 space-y-1">
        {combo.picks.map((pick, i) => (
          <MatchRow key={i} pick={pick} index={i} t={t} isLast={i === combo.picks.length - 1} />
        ))}
      </div>

      {/* 하단 통계 바 */}
      <div className="mx-5 mb-3 rounded-xl px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{t('배당', 'Odds')}</span>
            <span className="text-[15px] font-black text-emerald-400">{combo.total_odds?.toFixed(2)}</span>
          </div>
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{t('신뢰도', 'Conf')}</span>
            <span className="text-[15px] font-black text-white">{combo.avg_confidence?.toFixed(0)}%</span>
          </div>
        </div>
        <Link href={`/baseball/${combo.picks[0]?.matchId}`}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:brightness-125"
          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)' }}>
          {t('상세', 'Detail')}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </Link>
      </div>

      {/* AI 분석 */}
      {combo.ai_analysis && (() => {
        const raw = cleanMd(combo.ai_analysis)
        const tagMap: Record<string, { label: string; color: string; icon: string }> = {
          '총평': { label: t('총평', 'Overview'), color: '#10b981', icon: '◎' },
          '1경기': { label: t('1경기', 'G1'), color: '#3b82f6', icon: '①' },
          '2경기': { label: t('2경기', 'G2'), color: '#3b82f6', icon: '②' },
          '3경기': { label: t('3경기', 'G3'), color: '#3b82f6', icon: '③' },
          '주의': { label: t('주의', 'Note'), color: '#f59e0b', icon: '⚠' },
        }
        const sections: { tag: string; text: string }[] = []
        const tagRegex = /\[(총평|1경기|2경기|3경기|주의)\]\s*/g
        let lastIdx = 0, lastTag = ''
        let m: RegExpExecArray | null
        while ((m = tagRegex.exec(raw)) !== null) {
          if (lastTag && lastIdx < m.index) {
            sections.push({ tag: lastTag, text: raw.slice(lastIdx, m.index).trim() })
          }
          lastTag = m[1]
          lastIdx = m.index + m[0].length
        }
        if (lastTag) sections.push({ tag: lastTag, text: raw.slice(lastIdx).trim() })
        // fallback: 태그 없으면 기존 방식
        if (sections.length === 0) {
          raw.split(/\n/).filter(Boolean).forEach(line => sections.push({ tag: '', text: line.trim() }))
        }

        return (
          <div className="px-5 py-4" style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.04) 0%, rgba(16,185,129,0.01) 100%)', borderTop: '1px solid rgba(16,185,129,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <span className="text-[7px] font-black text-white">AI</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-400">{t('AI 분석 리포트', 'AI Analysis')}</span>
            </div>
            <div className="pl-7">
              {/* 총평 — 별도 박스 */}
              {sections.filter(s => s.tag === '총평').map((s, i) => (
                <div key={`overview-${i}`} className="rounded-lg px-3.5 py-2.5 mb-3"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                  <p className="text-[11.5px] leading-relaxed font-medium" style={{ color: '#a7f3d0' }}>{s.text}</p>
                </div>
              ))}
              {/* 경기별 + 주의 */}
              <div className="space-y-1.5">
              {sections.filter(s => s.tag !== '총평').map((s, i) => {
                const info = tagMap[s.tag]
                if (!info) return <p key={i} className="text-[11px] leading-relaxed" style={{ color: '#94a3b8' }}>{s.text}</p>
                return (
                  <div key={i} className="flex items-baseline gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 relative top-[-0.5px]"
                      style={{ background: `${info.color}15`, color: info.color, border: `1px solid ${info.color}25` }}>
                      {info.label}
                    </span>
                    <p className="text-[11px] leading-relaxed" style={{ color: s.tag === '주의' ? '#fbbf24' : '#cbd5e1' }}>{s.text}</p>
                  </div>
                )
              })}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// =====================================================
// 경기 매치업 행
// =====================================================
function MatchRow({ pick, index, t, isLast }: {
  pick: PickItem; index: number; t: (ko: string, en: string) => string; isLast: boolean
}) {
  const isPickHome = pick.pick === 'home'
  const pickProb = pick.winProb

  const awayAbbr = TEAM_ABBR[pick.awayTeam] || pick.awayTeamKo?.slice(0, 2) || pick.awayTeam?.slice(0, 3)
  const homeAbbr = TEAM_ABBR[pick.homeTeam] || pick.homeTeamKo?.slice(0, 2) || pick.homeTeam?.slice(0, 3)

  const barColor = pickProb >= 65 ? '#10b981' : pickProb >= 55 ? '#f59e0b' : '#6b7280'

  return (
    <div className="py-2">
      {/* 팀 매치업 */}
      <div className="flex items-center">
        {/* 원정 */}
        <div className={`flex-1 flex flex-col items-center gap-1.5 transition-opacity ${!isPickHome ? '' : 'opacity-35'}`}>
          <TeamLogo logo={pick.awayLogo} team={pick.awayTeam} abbr={awayAbbr} size={44} isPicked={!isPickHome} />
          <span className={`text-[11px] font-bold text-center leading-tight ${!isPickHome ? 'text-white' : 'text-gray-600'}`}>
            {pick.awayTeamKo}
          </span>
          {!isPickHome && (
            <span className="text-[8px] font-black px-2.5 py-0.5 rounded-full tracking-wide"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', boxShadow: '0 2px 8px rgba(245,158,11,0.25)' }}>PICK</span>
          )}
        </div>

        {/* VS 디바이더 or 스코어 */}
        <div className="flex flex-col items-center px-3 gap-0.5">
          {pick.matchStatus === 'FT' ? (
            <>
              <span className="text-[8px] font-bold" style={{ color: '#64748b' }}>FT</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[16px] font-black ${pick.pick === 'away' && pick.isCorrect !== undefined ? (pick.isCorrect ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`}>
                  {pick.awayScore}
                </span>
                <span className="text-[10px] font-bold" style={{ color: '#475569' }}>:</span>
                <span className={`text-[16px] font-black ${pick.pick === 'home' && pick.isCorrect !== undefined ? (pick.isCorrect ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`}>
                  {pick.homeScore}
                </span>
              </div>
              {pick.isCorrect !== undefined && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${pick.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}
                  style={{ background: pick.isCorrect ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                  {pick.isCorrect ? t('적중', 'HIT') : t('미적중', 'MISS')}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-[9px] font-medium" style={{ color: '#475569' }}>{pick.matchTime?.slice(0, 5)}</span>
              <div className="relative">
                <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="w-7 h-7 rounded-full flex items-center justify-center -my-0.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-[9px] font-black" style={{ color: '#475569' }}>VS</span>
                </div>
                <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            </>
          )}
        </div>

        {/* 홈 */}
        <div className={`flex-1 flex flex-col items-center gap-1.5 transition-opacity ${isPickHome ? '' : 'opacity-35'}`}>
          <TeamLogo logo={pick.homeLogo} team={pick.homeTeam} abbr={homeAbbr} size={44} isPicked={isPickHome} />
          <span className={`text-[11px] font-bold text-center leading-tight ${isPickHome ? 'text-white' : 'text-gray-600'}`}>
            {pick.homeTeamKo}
          </span>
          {isPickHome && (
            <span className="text-[8px] font-black px-2.5 py-0.5 rounded-full tracking-wide"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', boxShadow: '0 2px 8px rgba(245,158,11,0.25)' }}>PICK</span>
          )}
        </div>
      </div>

      {/* 예측 라인 */}
      <div className="flex items-center justify-between mt-2.5 mx-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium" style={{ color: '#64748b' }}>{t('예측', 'Pick')}</span>
          <span className="text-[10px] font-bold text-amber-400">{pick.pickTeamKo} {t('승', 'W')}</span>
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ background: `${barColor}15` }}>
            <span className="text-[10px] font-black" style={{ color: barColor }}>{pickProb}%</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium" style={{ color: '#64748b' }}>{t('배당', 'Odds')}</span>
          <span className="text-[13px] font-black text-emerald-400">{pick.odds?.toFixed(2)}</span>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="mt-2 mx-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pickProb}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)` }} />
      </div>

      {/* 근거 */}
      {pick.reason && (
        <div className="mt-1.5 mx-1">
          <span className="text-[9px]" style={{ color: '#64748b' }}>{pick.reason}</span>
        </div>
      )}

      {!isLast && <div className="mt-2 mx-4" style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)' }} />}
    </div>
  )
}
