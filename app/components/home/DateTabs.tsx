// 🔥 날짜 필터 탭 — 어제 / 오늘 / 내일 (BC.game 패턴)
'use client'

import { useLocale } from 'next-intl'

export type DateFilter = 'yesterday' | 'today' | 'tomorrow' | 'all'

interface Props {
  value: DateFilter
  onChange: (next: DateFilter) => void
  counts?: Partial<Record<DateFilter, number>>
}

const TABS: { key: DateFilter; labelKo: string; labelEn: string }[] = [
  { key: 'yesterday', labelKo: '어제', labelEn: 'Yesterday' },
  { key: 'today', labelKo: '오늘', labelEn: 'Today' },
  { key: 'tomorrow', labelKo: '내일', labelEn: 'Tomorrow' },
]

export default function DateTabs({ value, onChange, counts }: Props) {
  const locale = useLocale()
  const isEn = locale === 'en'
  return (
    <div className="flex items-center gap-1 p-0.5 sm:p-1 bg-gray-900/60 rounded-xl border border-gray-800 backdrop-blur-sm w-fit">
      {TABS.map((t) => {
        const active = value === t.key
        const c = counts?.[t.key]
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            aria-pressed={active}
            className={[
              'relative px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0',
              active
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50',
            ].join(' ')}
          >
            <span className="flex items-center gap-1.5">
              <span>{isEn ? t.labelEn : t.labelKo}</span>
              {typeof c === 'number' && c > 0 && (
                <span
                  className={[
                    'text-[10px] tabular-nums px-1.5 py-0.5 rounded-full font-bold',
                    active ? 'bg-white/20 text-white' : 'bg-gray-800 text-gray-400',
                  ].join(' ')}
                >
                  {c}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// 매치의 timestamp 가 yesterday/today/tomorrow 중 어느 쪽인지 판별
export function getDateBucket(timestamp: string | null): DateFilter | null {
  if (!timestamp) return null
  const d = new Date(timestamp)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  const ymd = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  const today = ymd(now)
  const yesterday = new Date(now.getTime() - 86_400_000)
  const tomorrow = new Date(now.getTime() + 86_400_000)
  const k = ymd(d)
  if (k === today) return 'today'
  if (k === ymd(yesterday)) return 'yesterday'
  if (k === ymd(tomorrow)) return 'tomorrow'
  return null
}
