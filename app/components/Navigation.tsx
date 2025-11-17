'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'

interface MenuItem {
  labelKo: string
  labelEn: string
  href: string
  icon: string
  badge?: string
  disabled?: boolean
}

const menuItems: MenuItem[] = [
  { 
    labelKo: '경기 예측',
    labelEn: 'Live Predictions',
    href: '/', 
    icon: '⚽' 
  },
  { 
    labelKo: '경기 결과',
    labelEn: 'Match Results',
    href: '/results', 
    icon: '📋',
    
  },
  { 
    labelKo: '스마트 필터',
    labelEn: 'Smart Dashboard',
    href: '/dashboard', 
    icon: '📊' 
  },

  
]

export default function Navigation() {
  const pathname = usePathname()
  const { language } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Desktop Navigation - 개선된 스타일 */}
      <nav className="hidden md:flex items-center gap-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          const isDisabled = item.disabled
          
          return (
            <Link
              key={item.href}
              href={isDisabled ? '#' : item.href}
              className={`
                relative px-4 py-2 rounded-lg font-medium transition-all
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={(e) => isDisabled && e.preventDefault()}
            >
              <span className="mr-2">{item.icon}</span>
              {language === 'ko' ? item.labelKo : item.labelEn}
              
              {/* Badge */}
              {item.badge && (
                <span className={`absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  item.badge === 'NEW' 
                    ? 'bg-yellow-500 text-black animate-pulse' 
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Mobile Menu Button - 깔끔한 스타일 */}
      <button
        className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
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

      {/* Mobile Menu - 개선된 드롭다운 */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#0f0f0f] border-t border-gray-800 shadow-2xl z-50 animate-slideDown">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col gap-2">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                const isDisabled = item.disabled
                
                return (
                  <Link
                    key={item.href}
                    href={isDisabled ? '#' : item.href}
                    className={`
                      relative flex items-center px-4 py-3 rounded-lg font-medium transition-all
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault()
                      } else {
                        setMobileMenuOpen(false)
                      }
                    }}
                  >
                    <span className="mr-3 text-xl">{item.icon}</span>
                    <span className="flex-1">{language === 'ko' ? item.labelKo : item.labelEn}</span>
                    
                    {/* Badge */}
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        item.badge === 'NEW' 
                          ? 'bg-yellow-500 text-black' 
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