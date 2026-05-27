'use client'

import React, { useTransition } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'

/**
 * 언어 토글 (KO / EN)
 *
 * - next-intl navigation을 직접 사용해 현재 경로 유지하며 locale만 전환
 * - useTransition으로 전환 중 disabled 처리 (중복 클릭 방지)
 * - locale 변경 시 자동으로 URL prefix(/en) 추가/제거
 */
export default function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname() // locale prefix가 제거된 경로 (예: '/blog/foo')
  const [isPending, startTransition] = useTransition()

  const switchTo = (target: 'ko' | 'en') => {
    if (target === locale || isPending) return
    // 사용자의 명시적 선택을 NEXT_LOCALE 쿠키에 즉시 저장
    // (next-intl 미들웨어가 다음 요청부터 이 값을 우선 적용)
    if (typeof document !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${target}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    }
    startTransition(() => {
      router.replace(pathname, { locale: target })
    })
  }

  return (
    <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-0.5">
      <button
        onClick={() => switchTo('ko')}
        disabled={isPending}
        aria-label="한국어로 보기"
        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
          locale === 'ko'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
      >
        KO
      </button>
      <button
        onClick={() => switchTo('en')}
        disabled={isPending}
        aria-label="View in English"
        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
          locale === 'en'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        } ${isPending ? 'opacity-50 cursor-wait' : ''}`}
      >
        EN
      </button>
    </div>
  )
}
