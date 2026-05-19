// 🔥 종목 탭 [전체|⚽|⚾] — 쿠키로 마지막 선택 기억 (Q1=C 결정)
'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import type { SportFilter } from './types'

const COOKIE_NAME = 'trendsoccer_last_sport'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1년

export function readSportCookie(): SportFilter {
  if (typeof document === 'undefined') return 'all'
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)')
  )
  const v = m ? decodeURIComponent(m[1]) : ''
  return v === 'football' || v === 'baseball' || v === 'all' ? v : 'all'
}

export function writeSportCookie(value: SportFilter) {
  if (typeof document === 'undefined') return
  document.cookie =
    `${COOKIE_NAME}=${encodeURIComponent(value)}; ` +
    `path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
}

interface SportTabsProps {
  value: SportFilter
  onChange: (next: SportFilter) => void
  counts?: { all?: number; football?: number; baseball?: number }
}

export default function SportTabs({ value, onChange, counts }: SportTabsProps) {
  const locale = useLocale()
  const isEn = locale === 'en'

  const handle = (next: SportFilter) => {
    writeSportCookie(next)
    onChange(next)
  }

  const tabs: { key: SportFilter; icon: string; label: string }[] = [
    { key: 'all', icon: '🌐', label: isEn ? 'All' : '전체' },
    { key: 'football', icon: '⚽', label: isEn ? 'Football' : '축구' },
    { key: 'baseball', icon: '⚾', label: isEn ? 'Baseball' : '야구' },
  ]

  return (
    <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-gray-900/60 rounded-xl backdrop-blur-sm border border-gray-800 w-fit">
      {tabs.map((t) => {
        const active = value === t.key
        const count = counts?.[t.key]
        return (
          <button
            key={t.key}
            onClick={() => handle(t.key)}
            aria-pressed={active}
            className={[
              'relative px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap shrink-0',
              active
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50',
            ].join(' ')}
          >
            <span className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
              <span className="text-base leading-none">{t.icon}</span>
              <span>{t.label}</span>
              {typeof count === 'number' && count > 0 && (
                <span
                  className={[
                    'ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-bold tabular-nums',
                    active ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-400',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// 외부에서 초기값 읽을 때 사용
export function useInitialSportFilter(): SportFilter {
  const [v, setV] = useState<SportFilter>('all')
  useEffect(() => {
    setV(readSportCookie())
  }, [])
  return v
}
