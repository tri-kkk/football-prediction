// 🔥 Hero — 메인 마케팅 카피 (배너 X, 단순 텍스트)
'use client'

import type { UnifiedMatch } from './types'

interface Props {
  matches?: UnifiedMatch[]
}

export default function Hero({ matches = [] }: Props) {
  const total = matches.length

  return (
    <div className="hidden sm:flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-800" style={{ backgroundColor: '#1a1c1d' }}>
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-bold"
          style={{ color: '#6dff5c' }}
        >
          데이터가 답을 안다
        </span>
        <span className="text-gray-500 text-xs">·</span>
        <span className="text-xs text-gray-400">매일 새로운 픽</span>
      </div>
      {total > 0 && (
        <span className="text-[11px] text-gray-500 tabular-nums">
          현재 <span className="text-white font-bold">{total}</span>경기 추적 중
        </span>
      )}
    </div>
  )
}
