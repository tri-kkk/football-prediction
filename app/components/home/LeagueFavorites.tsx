// 🔥 즐겨찾는 리그 — localStorage 기반 개인화
// Step 2 의 "즐겨찾기" 시작점 (Q4 사이드바 구성)
// 향후 회원 가입시 DB sync 가능
'use client'

import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'trendsoccer_fav_leagues'

// 인기 리그 12개 (축구·야구 통합)
const FEATURED_LEAGUES: { code: string; label: string; icon: string; sport: 'football' | 'baseball' }[] = [
  { code: 'PL', label: '프리미어리그', icon: '⚽', sport: 'football' },
  { code: 'PD', label: '라리가', icon: '⚽', sport: 'football' },
  { code: 'BL1', label: '분데스리가', icon: '⚽', sport: 'football' },
  { code: 'SA', label: '세리에A', icon: '⚽', sport: 'football' },
  { code: 'FL1', label: '리그1', icon: '⚽', sport: 'football' },
  { code: 'CL', label: '챔피언스리그', icon: '🏆', sport: 'football' },
  { code: 'EL', label: '유로파리그', icon: '🏆', sport: 'football' },
  { code: 'KBO', label: 'KBO', icon: '⚾', sport: 'baseball' },
  { code: 'MLB', label: 'MLB', icon: '⚾', sport: 'baseball' },
  { code: 'NPB', label: 'NPB', icon: '⚾', sport: 'baseball' },
]

function readFavs(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeFavs(list: string[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* 무시 */
  }
}

export default function LeagueFavorites() {
  const [favs, setFavs] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setFavs(readFavs())
    setHydrated(true)
  }, [])

  const toggle = (code: string) => {
    const next = favs.includes(code)
      ? favs.filter((c) => c !== code)
      : [...favs, code]
    setFavs(next)
    writeFavs(next)
  }

  const sortedLeagues = useMemo(() => {
    if (!hydrated) return FEATURED_LEAGUES
    return [...FEATURED_LEAGUES].sort((a, b) => {
      const af = favs.includes(a.code) ? 0 : 1
      const bf = favs.includes(b.code) ? 0 : 1
      return af - bf
    })
  }, [favs, hydrated])

  return (
    <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">⭐ 내 리그</h3>
        {hydrated && favs.length > 0 && (
          <span className="text-[10px] text-gray-500">{favs.length}개 즐겨찾기</span>
        )}
      </header>

      <div className="space-y-1.5">
        {sortedLeagues.map((l) => {
          const active = favs.includes(l.code)
          return (
            <button
              key={l.code}
              onClick={() => toggle(l.code)}
              className={[
                'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                  : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200',
              ].join(' ')}
              aria-pressed={active}
            >
              <span className="text-base leading-none">{l.icon}</span>
              <span className="flex-1 text-left truncate">{l.label}</span>
              <span
                className={
                  active
                    ? 'text-amber-300'
                    : 'text-gray-600 group-hover:text-gray-400'
                }
              >
                {active ? '★' : '☆'}
              </span>
            </button>
          )
        })}
      </div>

      {hydrated && favs.length === 0 && (
        <p className="text-[11px] text-gray-600 mt-3 px-1">
          별표를 눌러 즐겨찾는 리그를 저장하세요. 다음에 와도 기억합니다.
        </p>
      )}
    </div>
  )
}

// 외부에서 즐겨찾기 목록 사용
export { readFavs as readFavoriteLeagues }
