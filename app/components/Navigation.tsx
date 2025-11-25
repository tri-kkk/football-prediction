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

const menuItems: MenuItem[] = [
  { 
    labelKo: '프리뷰',
    labelEn: 'Preview',
    href: '/', 
    icon: '/preview.svg'
  },
  { 
    labelKo: '경기 결과',
    labelEn: 'Results',
    href: '/results', 
    icon: '/event.svg'
  },
  { 
    labelKo: '대시보드',
    labelEn: 'Dashboard',
    href: '/dashboard', 
    icon: '/dashboard.svg',
    hidden: true  // 숨김 처리
  },
  { 
    labelKo: '아티클',
    labelEn: 'Article',
    href: '/blog', 
    icon: '/article.svg'
  },
  { 
    labelKo: '피드',
    labelEn: 'Feed',
    href: '/magazine', 
    icon: 'feed', // inline SVG 사용
    
  },
]

export default function Navigation() {
  const pathname = usePathname()
  const { language } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // 숨김 처리된 메뉴 필터링
  const visibleMenuItems = menuItems.filter(item => !item.hidden)

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-1">
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
                  ? 'bg-blue-500 text-white shadow-md' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }
                ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
              `}
              onClick={(e) => isDisabled && e.preventDefault()}
            >
              <div className={`relative ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.icon === 'feed' ? (
                  // Inline RSS Feed SVG with explicit colors
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={isActive ? 'brightness-125' : ''}
                  >
                    <circle cx="6.18" cy="17.82" r="2.18" fill={isActive ? '#ffffff' : '#9ca3af'}/>
                    <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" fill={isActive ? '#ffffff' : '#9ca3af'}/>
                  </svg>
                ) : (
                  <Image 
                    src={item.icon} 
                    alt={item.labelEn}
                    width={20} 
                    height={20}
                    className={isActive ? 'brightness-125' : ''}
                  />
                )}
              </div>
              <span className="text-sm">
                {language === 'ko' ? item.labelKo : item.labelEn}
              </span>
              
              {/* Badge */}
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
                        ? 'bg-blue-500 text-white shadow-md' 
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
                      {item.icon === 'feed' ? (
                        // Inline RSS Feed SVG with explicit colors
                        <svg 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={isActive ? 'brightness-125' : ''}
                        >
                          <circle cx="6.18" cy="17.82" r="2.18" fill={isActive ? '#ffffff' : '#d1d5db'}/>
                          <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" fill={isActive ? '#ffffff' : '#d1d5db'}/>
                        </svg>
                      ) : (
                        <Image 
                          src={item.icon} 
                          alt={item.labelEn}
                          width={20} 
                          height={20}
                          className={isActive ? 'brightness-125' : ''}
                        />
                      )}
                    </div>
                    <span className="flex-1">{language === 'ko' ? item.labelKo : item.labelEn}</span>
                    
                    {/* Badge */}
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