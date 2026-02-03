'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'
import Image from 'next/image'

interface MenuItem {
  labelKo: string
  labelEn: string
  href: string
  icon: string
  badge?: string
  disabled?: boolean
  hidden?: boolean
}

// ⚽ 축구 메뉴
const footballMenuItems: MenuItem[] = [
  { 
    labelKo: '트렌드',
    labelEn: 'Trend',
    href: '/', 
    icon: '/preview.svg'
  },
  { 
    labelKo: '예측',
    labelEn: 'Predict',
    href: '/premium', 
    icon: 'insights',
    badge: 'BETA',
    hidden: false
  },
  { 
    labelKo: '하이라이트',
    labelEn: 'Highlights',
    href: '/highlights', 
    icon: 'play'
  },
  { 
    labelKo: '대시보드',
    labelEn: 'Dashboard',
    href: '/dashboard', 
    icon: '/dashboard.svg',
    hidden: true
  },
  { 
    labelKo: '리포트',
    labelEn: 'Report',
    href: '/blog', 
    icon: '/article.svg'
  },
  { 
    labelKo: '뉴스',
    labelEn: 'News',
    href: '/news', 
    icon: 'feed',
  },
]

// ⚾ 야구 메뉴
const baseballMenuItems: MenuItem[] = [
  { 
    labelKo: '홈',
    labelEn: 'Home',
    href: '/baseball', 
    icon: '/preview.svg'
  },
  { 
    labelKo: '예측',
    labelEn: 'Predict',
    href: '/baseball/predictions', 
    icon: 'insights'
  },
  { 
    labelKo: '결과',
    labelEn: 'Results',
    href: '/baseball/results', 
    icon: 'play'
  },
  { 
    labelKo: '순위표',
    labelEn: 'Standings',
    href: '/baseball/standings', 
    icon: '/dashboard.svg'
  },
]

export default function Navigation() {
  const pathname = usePathname()
  const { language } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // 현재 스포츠 감지
  const isBaseball = pathname.startsWith('/baseball')
  
  // 스포츠에 맞는 메뉴 선택
  const menuItems = isBaseball ? baseballMenuItems : footballMenuItems
  const visibleMenuItems = menuItems.filter(item => !item.hidden)

  const renderIcon = (item: MenuItem, isActive: boolean, size: number = 20) => {
    if (item.icon === 'feed') {
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className={isActive ? 'brightness-125' : ''}
        >
          <circle cx="6.18" cy="17.82" r="2.18" fill={isActive ? '#ffffff' : '#9ca3af'}/>
          <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" fill={isActive ? '#ffffff' : '#9ca3af'}/>
        </svg>
      )
    }
    
    if (item.icon === 'insights') {
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className={isActive ? 'brightness-125' : ''}
        >
          <path d="M3 3v18h18" stroke={isActive ? '#ffffff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 14l4-4 4 4 5-5" stroke={isActive ? '#ffffff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="20" cy="9" r="2" fill={isActive ? '#ffffff' : '#9ca3af'}/>
        </svg>
      )
    }
    
    if (item.icon === 'play') {
      return (
        <svg 
          width={size} 
          height={size} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className={isActive ? 'brightness-125' : ''}
        >
          <rect x="3" y="5" width="18" height="14" rx="2" stroke={isActive ? '#ffffff' : '#9ca3af'} strokeWidth="2"/>
          <path d="M10 9l5 3-5 3V9z" fill={isActive ? '#ffffff' : '#9ca3af'}/>
        </svg>
      )
    }
    
    return (
      <Image 
        src={item.icon} 
        alt={item.labelEn}
        width={size} 
        height={size}
        className={isActive ? 'brightness-125' : ''}
      />
    )
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-1">


        {/* 메뉴 아이템 */}
        {visibleMenuItems.map((item) => {
          const isActive = pathname === item.href
          const isDisabled = item.disabled
          
          return (
            <Link
              key={item.href}
              href={isDisabled ? '#' : item.href}
              className={`
                relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all
                ${isActive 
                  ? isBaseball 
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-emerald-500 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }
                ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
              `}
              onClick={(e) => isDisabled && e.preventDefault()}
            >
              <div className={`relative ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {renderIcon(item, isActive, 20)}
              </div>
              <span className="text-sm">
                {language === 'ko' ? item.labelKo : item.labelEn}
              </span>
              
              {item.badge && (
                <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full ${
                  item.badge === 'NEW' 
                    ? 'bg-yellow-400 text-black' 
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="메뉴"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#0f0f0f] border-t border-gray-800 shadow-2xl z-50">
          <div className="container mx-auto px-4 py-3">
            {/* 모바일 스포츠 전환 */}
            <div className="flex items-center gap-2 mb-3 p-2 bg-gray-800/50 rounded-lg">
              <Link
                href="/"
                className={`flex-1 py-2 rounded-md text-sm font-medium text-center transition-all ${
                  !isBaseball 
                    ? 'bg-emerald-500 text-white shadow-md' 
                    : 'text-gray-400 hover:bg-gray-700/50'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                ⚽ {language === 'ko' ? '축구' : 'Football'}
              </Link>
              <Link
                href="/baseball"
                className={`flex-1 py-2 rounded-md text-sm font-medium text-center transition-all ${
                  isBaseball 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'text-gray-400 hover:bg-gray-700/50'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                ⚾ {language === 'ko' ? '야구' : 'Baseball'}
              </Link>
            </div>

            <div className="flex flex-col gap-1">
              {visibleMenuItems.map((item) => {
                const isActive = pathname === item.href
                const isDisabled = item.disabled
                
                return (
                  <Link
                    key={item.href}
                    href={isDisabled ? '#' : item.href}
                    className={`
                      relative flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all
                      ${isActive 
                        ? isBaseball
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-emerald-500 text-white shadow-md'
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                      }
                      ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
                    `}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault()
                      } else {
                        setMobileMenuOpen(false)
                      }
                    }}
                  >
                    <div className={`relative ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                      {renderIcon(item, isActive, 20)}
                    </div>
                    <span className="flex-1">{language === 'ko' ? item.labelKo : item.labelEn}</span>
                    
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        item.badge === 'NEW' 
                          ? 'bg-yellow-400 text-black' 
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}