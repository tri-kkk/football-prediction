// 🔥 경기 결과 페이지 공통 서브 네비 (축구/야구 빠른 전환)
'use client'

import { Link } from '@/i18n/navigation'
import { usePathname } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'

interface SubNavItem {
  href: string
  labelKo: string
  labelEn: string
}

const RESULTS_TABS: SubNavItem[] = [
  { href: '/results', labelKo: '축구 결과', labelEn: 'Football Results' },
  { href: '/baseball/results', labelKo: '야구 결과', labelEn: 'Baseball Results' },
]

export default function ResultsSubNav() {
  const pathname = usePathname()
  const { language } = useLanguage()

  return (
    <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-gray-800/60">
      <div className="home-container mx-auto px-3 sm:px-6">
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-hide">
          {RESULTS_TABS.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(tab.href + '/')
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
