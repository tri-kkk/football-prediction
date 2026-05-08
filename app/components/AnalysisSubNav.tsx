// 🔥 분석 페이지 공통 서브 네비 — 모바일/데스크톱 모두 분석 카테고리 빠른 전환
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'

interface SubNavItem {
  href: string
  labelKo: string
  labelEn: string
  matchPaths?: string[]
}

const ANALYSIS_TABS: SubNavItem[] = [
  {
    href: '/premium',
    labelKo: '축구 프리미엄 분석',
    labelEn: 'Football Premium',
  },
  {
    href: '/baseball/analysis',
    labelKo: '야구 분석',
    labelEn: 'Baseball Analysis',
  },
  {
    href: '/baseball/multi-match',
    labelKo: '야구 다경기 분석',
    labelEn: 'Multi-Match Analysis',
  },
]

export default function AnalysisSubNav() {
  const pathname = usePathname()
  const { language } = useLanguage()

  return (
    <div className="hidden md:block sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-gray-800/60">
      <div className="home-container mx-auto px-3 sm:px-6">
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-hide">
          {ANALYSIS_TABS.map((tab) => {
            const active =
              pathname === tab.href ||
              (tab.matchPaths && tab.matchPaths.some((p) => pathname.startsWith(p)))
            const label = language === 'ko' ? tab.labelKo : tab.labelEn
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  'shrink-0 inline-flex items-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap border',
                  active
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
