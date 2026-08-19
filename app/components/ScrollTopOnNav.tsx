'use client'
// 탭/페이지 이동 시 항상 창을 최상단(0,0)으로 리셋.
// Next App Router가 공유 레이아웃 간 이동 시 "세그먼트 최상단"을 뷰포트 top에 맞추면서
// sticky 헤더가 콘텐츠 최상단을 덮어 살짝 짤리는 현상 방지.
import { useEffect } from 'react'
import { usePathname } from '@/i18n/navigation'

export default function ScrollTopOnNav() {
  const pathname = usePathname()
  useEffect(() => {
    if (typeof window === 'undefined') return
    // 해시 앵커로 이동하는 경우는 존중
    if (window.location.hash) return
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
