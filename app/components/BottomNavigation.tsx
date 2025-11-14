'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'

interface NavItem {
  labelKo: string
  labelEn: string
  href: string
  icon: string
  badge?: string
  disabled?: boolean
}

const navItems: NavItem[] = [
  { 
    labelKo: '홈',
    labelEn: 'Home',
    href: '/', 
    icon: '🏠'
  },
  { 
    labelKo: '대시보드',
    labelEn: 'Dashboard',
    href: '/dashboard', 
    icon: '📊'
  },
  { 
    labelKo: '무브먼트',
    labelEn: 'Movement',
    href: '/movement', 
    icon: '🌊',
    badge: 'NEW'
  },
  { 
    labelKo: '마켓웨이브',
    labelEn: 'Market',
    href: '/market-wave', 
    icon: '🎯',
    badge: 'WAIT',
    disabled: true
  },
]

export default function BottomNavigation() {
  const pathname = usePathname()
  const { language } = useLanguage()

  return (
    <>
      {/* 모바일 전용 하단 네비게이션 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] bg-[#1a1a1a] border-t border-gray-800 shadow-2xl" style={{ touchAction: 'auto' }}>
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const isDisabled = item.disabled
            
            return (
              <Link
                key={item.href}
                href={isDisabled ? '#' : item.href}
                className={`
                  relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg
                  transition-all duration-200 min-w-[70px]
                  ${isActive 
                    ? 'text-blue-500' 
                    : isDisabled
                      ? 'text-gray-600 opacity-50'
                      : 'text-gray-400 hover:text-white active:scale-95'
                  }
                `}
                onClick={(e) => isDisabled && e.preventDefault()}
              >
                {/* 활성 상태 표시 - 상단 바 */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-b-full" />
                )}
                
                {/* 아이콘 */}
                <span className={`text-2xl transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {item.icon}
                </span>
                
                {/* 라벨 */}
                <span className={`text-[10px] font-medium whitespace-nowrap ${
                  isActive ? 'font-bold' : ''
                }`}>
                  {language === 'ko' ? item.labelKo : item.labelEn}
                </span>
                
                {/* NEW 배지 */}
                {item.badge === 'NEW' && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[8px] font-bold bg-red-500 text-white rounded-full animate-pulse">
                    N
                  </span>
                )}
                
                {/* WAIT 배지 */}
                {item.badge === 'WAIT' && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[8px] font-bold bg-gray-600 text-gray-300 rounded-full">
                    W
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}