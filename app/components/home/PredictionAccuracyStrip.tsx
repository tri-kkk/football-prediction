'use client'
// app/components/home/PredictionAccuracyStrip.tsx
// 메인 히어로 아래 축구 AI 예측 성적 어필 스트립 (강점 리드형).
//   - 실제 /api/pick-accuracy 실시간 숫자. 5대 리그 중 최고 적중 리그를 앞세움.
//   - 표본 부족/조회 실패 시 렌더 안 함(비차단).
import { useEffect, useState } from 'react'
import Link from 'next/link'

const MAJOR5 = ['PL', 'PD', 'SA', 'BL1', 'FL1'] as const
const LEAGUE_KO: Record<string, string> = { PL: 'EPL', PD: '라리가', SA: '세리에A', BL1: '분데스', FL1: '리그1', DED: '에레디비시' }
const LEAGUE_EN: Record<string, string> = { PL: 'EPL', PD: 'La Liga', SA: 'Serie A', BL1: 'Bundesliga', FL1: 'Ligue 1', DED: 'Eredivisie' }

type Row = { league: string; total: number; correct: number; accuracy: number }

export default function PredictionAccuracyStrip({ locale = 'ko' }: { locale?: string }) {
  const isKo = locale !== 'en'
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    const c = new AbortController()
    const to = setTimeout(() => c.abort(), 5000)
    fetch('/api/pick-accuracy', { signal: c.signal })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.data)) setRows(d.data as Row[]) })
      .catch(() => {})
      .finally(() => clearTimeout(to))
    return () => { clearTimeout(to); c.abort() }
  }, [])

  if (!rows) return null

  const major = rows
    .filter((r) => (MAJOR5 as readonly string[]).includes(r.league) && r.total >= 20)
    .sort((a, b) => b.accuracy - a.accuracy)

  if (major.length === 0) return null

  const top = major[0]
  const name = (isKo ? LEAGUE_KO : LEAGUE_EN)[top.league] ?? top.league
  const nOf10 = Math.max(1, Math.min(10, Math.round(top.accuracy / 10)))
  const totalC = major.reduce((s, r) => s + r.correct, 0)
  const totalN = major.reduce((s, r) => s + r.total, 0)
  const avg = totalN > 0 ? Math.round((totalC / totalN) * 100) : 0
  const chips = major.slice(1, 3)

  return (
    <Link
      href={`/${locale}/premium`}
      className="relative block overflow-hidden rounded-2xl group mx-4 my-3"
      style={{
        background: 'linear-gradient(120deg, rgba(163,255,76,.11), rgba(98,244,255,.045))',
        border: '1px solid rgba(163,255,76,.24)',
        boxShadow: '0 10px 34px -14px rgba(163,255,76,.45)',
      }}
    >
      <span className="ts-shine" style={{ background: 'linear-gradient(110deg, transparent, rgba(190,255,150,.30), transparent)' }} />
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(163,255,76,.6), transparent)' }} />

      <div className="relative flex items-stretch gap-3 pl-4 pr-3 py-3.5">
        <div className="flex flex-col justify-center flex-shrink-0 pr-3.5" style={{ borderRight: '1px solid rgba(255,255,255,.09)' }}>
          <div className="leading-none font-black tabular-nums" style={{ fontSize: 30, color: '#A3FF4C', letterSpacing: '-1px' }}>
            {top.accuracy}<span style={{ fontSize: 15 }}>%</span>
          </div>
          <div className="mt-1.5 font-bold" style={{ fontSize: 9.5, color: '#9aa093' }}>
            {name} {isKo ? '적중' : 'hit rate'}
          </div>
        </div>

        <div className="flex flex-col justify-center min-w-0 flex-1 gap-1">
          <div className="font-extrabold text-white" style={{ fontSize: 14, lineHeight: 1.32, letterSpacing: '-.2px' }}>
            {isKo ? `10경기 중 ${nOf10}경기, AI가 맞혔습니다` : `AI called ${nOf10} of the last 10 right`}
          </div>
          <div style={{ fontSize: 10.5, color: '#8b9088', lineHeight: 1.4 }}>
            {isKo ? `5대 리그 평균 ${avg}% · 리그가 좁을수록 더 정확` : `Top-5 leagues avg ${avg}% · sharper in tighter leagues`}
          </div>
          {chips.length > 0 && (
            <div className="flex gap-1.5 mt-0.5 flex-wrap">
              {chips.map((r) => (
                <span key={r.league}
                  className="font-bold"
                  style={{ fontSize: 9.5, color: '#cfe8b4', background: 'rgba(163,255,76,.1)', border: '1px solid rgba(163,255,76,.2)', borderRadius: 999, padding: '2px 7px' }}>
                  {(isKo ? LEAGUE_KO : LEAGUE_EN)[r.league] ?? r.league} {r.accuracy}%
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center flex-shrink-0 font-black" style={{ color: '#A3FF4C', fontSize: 20 }}>›</div>
      </div>
    </Link>
  )
}
