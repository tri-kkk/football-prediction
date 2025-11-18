'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { language } = useLanguage()

  const navItems = [
    {
      href: '/',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2"/>
          <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      labelKo: '경기 일정',
      labelEn: 'Predictions'
    },
    {
      href: '/results',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 11l3 3L22 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      labelKo: '경기 현황',
      labelEn: 'Results'
    },
    {
      href: '/dashboard',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="14" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="14" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="3" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      labelKo: '대시보드',
      labelEn: 'Dashboard'
    },
    {
      href: '/blog',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 3v18h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18 17V9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13 17v-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 17v-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      labelKo: '리포트',
      labelEn: 'Stats'
    }
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-gray-800 z-50 safe-area-bottom">
      <div className="grid grid-cols-4 gap-1 px-2 py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1.5 py-2 rounded-lg transition-all ${
                isActive 
                  ? 'text-blue-500' 
                  : 'text-gray-400 active:bg-gray-800/50'
              }`}
            >
              <div className={`transition-colors ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                {item.icon}
              </div>
              <span className="text-[11px] font-medium">
                {language === 'ko' ? item.labelKo : item.labelEn}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}