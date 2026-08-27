'use client'
// app/components/home/LiveHitTicker.tsx
// 메인 상단 "라이브 적중 티커" — 최근 적중 경기(축구+야구)를 팀 엠블럼과 함께 좌→우 롤링.
//   데이터: /api/pick-recommendations(status=correct) + /api/baseball/prediction-results + /api/pick-accuracy
//   실패/표본부족 시 렌더 안 함(비차단). 로고 로드 실패 시 숨김.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getTeamLogo, TEAM_NAME_KR } from '../../teamLogos'

type Hit = { team: string; logo: string | null; league: string; sport: 'soccer' | 'baseball'; ts: number }

export default function LiveHitTicker({ locale = 'ko' }: { locale?: string }) {
  const isKo = locale !== 'en'
  const [hits, setHits] = useState<Hit[] | null>(null)
  const [acc, setAcc] = useState<number | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    const to = setTimeout(() => ctrl.abort(), 6000)
    const opt = { signal: ctrl.signal }

    Promise.allSettled([
      fetch('/api/pick-recommendations?status=correct&period=month&league=ALL', opt).then((r) => r.json()),
      fetch('/api/baseball/prediction-results?days=30&limit=30&league=ALL', opt).then((r) => r.json()),
      fetch('/api/pick-accuracy', opt).then((r) => r.json()),
    ]).then(([soc, bas, socAcc]) => {
      const out: Hit[] = []

      if (soc.status === 'fulfilled' && Array.isArray(soc.value?.picks)) {
        for (const p of soc.value.picks) {
          if (p.is_correct !== true) continue
          const pt = p.pick_result
          if (pt !== 'HOME' && pt !== 'AWAY') continue
          const en = pt === 'HOME' ? p.home_team : p.away_team
          if (!en) continue
          out.push({
            team: isKo ? (TEAM_NAME_KR[en] ?? en) : en,
            logo: (pt === 'HOME' ? p.home_team_logo : p.away_team_logo) || getTeamLogo(en) || null,
            league: p.league_code,
            sport: 'soccer',
            ts: p.commence_time ? Date.parse(p.commence_time) : 0,
          })
        }
      }

      if (bas.status === 'fulfilled' && Array.isArray(bas.value?.recent)) {
        for (const g of bas.value.recent) {
          if (!g.correct) continue
          const isHome = g.pickedTeam === g.homeTeam
          out.push({
            team: g.pickedTeam,
            logo: (isHome ? g.homeTeamLogo : g.awayTeamLogo) || null,
            league: g.league,
            sport: 'baseball',
            ts: g.date ? Date.parse(g.date) : 0,
          })
        }
      }

      out.sort((a, b) => b.ts - a.ts)

      let sc = 0, st = 0
      if (socAcc.status === 'fulfilled' && socAcc.value?.summary) {
        sc += socAcc.value.summary.correct || 0; st += socAcc.value.summary.total || 0
      }
      if (bas.status === 'fulfilled' && typeof bas.value?.total === 'number') {
        sc += bas.value.correct || 0; st += bas.value.total || 0
      }
      setAcc(st > 0 ? Math.round((sc / st) * 100) : null)
      setHits(out.slice(0, 16))
    }).finally(() => clearTimeout(to))

    return () => { clearTimeout(to); ctrl.abort() }
  }, [isKo])

  if (!hits || hits.length < 4) return null

  const loop = [...hits, ...hits]

  const Item = ({ h }: { h: Hit }) => (
    <span className="flex items-center gap-2 flex-shrink-0" style={{ paddingRight: 4 }}>
      <span className="grid place-items-center overflow-hidden flex-shrink-0"
        style={{ width: 20, height: 20, borderRadius: 999, background: 'rgba(255,255,255,.06)' }}>
        {h.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={h.logo} alt="" width={20} height={20} loading="lazy"
            style={{ width: 20, height: 20, objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
        ) : null}
      </span>
      <span style={{ fontSize: 12.5, color: '#d3d7cd', whiteSpace: 'nowrap' }}>{h.team}</span>
      <span style={{ color: '#A3FF4C', fontWeight: 900, fontSize: 12 }}>✓</span>
    </span>
  )

  return (
    <div className="relative mx-4 my-3 overflow-hidden rounded-2xl"
      style={{ background: 'linear-gradient(120deg, rgba(163,255,76,.08), rgba(20,24,20,.35))', border: '1px solid rgba(255,255,255,.09)' }}>
      <style>{`
        @keyframes tsHitScroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .ts-hit-track { animation: tsHitScroll 34s linear infinite; }
        .ts-hit-mask:hover .ts-hit-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .ts-hit-track { animation: none; } }
      `}</style>

      <div className="relative flex items-center gap-3 py-3 pl-4 pr-3">
        <Link href={`/${locale}/premium`} className="flex items-baseline gap-1.5 flex-shrink-0 pr-3.5"
          style={{ borderRight: '1px solid rgba(255,255,255,.1)' }}>
          <span className="tabular-nums" style={{ fontSize: 22, fontWeight: 900, color: '#A3FF4C', letterSpacing: '-.5px' }}>
            {acc ?? '–'}%
          </span>
          <span style={{ fontSize: 10, color: '#9aa093', fontWeight: 700 }}>{isKo ? 'AI 적중률' : 'AI hit rate'}</span>
        </Link>

        <div className="ts-hit-mask relative flex-1 overflow-hidden"
          style={{ maskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 88%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 6%, #000 88%, transparent)' }}>
          <div className="ts-hit-track flex items-center" style={{ width: 'max-content', gap: 18 }}>
            {loop.map((h, i) => <Item key={i} h={h} />)}
          </div>
        </div>

        <Link href={`/${locale}/premium`} className="flex-shrink-0 whitespace-nowrap"
          style={{ fontSize: 12.5, fontWeight: 800, color: '#A3FF4C' }}>
          {isKo ? '전체 성적 →' : 'Track record →'}
        </Link>
      </div>
    </div>
  )
}
