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
      icon: '⚽',
      labelKo: '홈',
      labelEn: 'Home'
    },
    {
      href: '/results',
      icon: '📋',
      labelKo: '경기 결과',
      labelEn: 'Results'
    },
    {
      href: '/dashboard',
      icon: '📊',
      labelKo: '대시보드',
      labelEn: 'Dashboard'
    }
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-gray-800 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive 
                  ? 'text-blue-500' 
                  : 'text-gray-400 active:text-gray-300'
              }`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className="text-xs font-medium">
                {language === 'ko' ? item.labelKo : item.labelEn}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}