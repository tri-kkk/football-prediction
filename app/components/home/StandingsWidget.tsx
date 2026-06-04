'use client'

// 순위표 위젯 — /api/standings. 리그 탭(PL/PD/BL1/SA) + 상위 5팀.

import { useEffect, useState } from 'react'

interface Row {
  position: number
  team: { name: string; shortName: string; crest: string }
  playedGames: number
  points: number
}

const LEAGUES: { code: string; label: string }[] = [
  { code: 'PL', label: 'EPL' },
  { code: 'PD', label: 'LaLiga' },
  { code: 'BL1', label: 'BL' },
  { code: 'SA', label: 'SerieA' },
]

export default function StandingsWidget({ locale = 'ko' }: { locale?: string }) {
  const isKo = locale !== 'en'
  const [league, setLeague] = useState('PL')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/standings?league=${league}`).then((r) => r.json())
        const list: Row[] = res?.standings || []
        if (!cancel) setRows(list.slice(0, 5))
      } catch {
        if (!cancel) setRows([])
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => {
      cancel = true
    }
  }, [league])

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{isKo ? '순위표' : 'Standings'}</h3>
        <a href={`/${locale}/football`} className="text-[11px] text-emerald-400 hover:text-emerald-300">
          {isKo ? '전체 ▸' : 'All ▸'}
        </a>
      </div>

      <div className="mb-2 flex gap-1">
        {LEAGUES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLeague(l.code)}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
              league === l.code
                ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-gray-800" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-4 text-center text-xs text-gray-500">{isKo ? '데이터 없음' : 'No data'}</div>
      ) : (
        <table className="w-full text-[12px]">
          <tbody>
            {rows.map((r) => (
              <tr key={r.position} className="border-t border-gray-800/60 first:border-0">
                <td className="w-5 py-1 text-gray-500">{r.position}</td>
                <td className="py-1">
                  <span className="flex items-center gap-1.5">
                    {r.team.crest && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.team.crest} alt="" className="h-4 w-4 object-contain" />
                    )}
                    <span className="truncate text-gray-200">{r.team.shortName || r.team.name}</span>
                  </span>
                </td>
                <td className="w-6 py-1 text-right font-semibold text-white">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
