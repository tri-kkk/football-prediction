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
    labelKo: '라이브 예측',
    labelEn: 'Live Predictions',
    href: '/', 
    icon: '⚽' 
  },
  { 
    labelKo: '스마트 대시보드',
    labelEn: 'Smart Dashboard',
    href: '/dashboard', 
    icon: '📊' 
  },
  { 
    labelKo: '배당 무브먼트',
    labelEn: 'Odds Movement',
    href: '/movement', 
    icon: '🌊', 
    badge: 'NEW',
  },
  { 
    labelKo: '마켓 웨이브',
    labelEn: 'Market Wave',
    href: '/market-wave', 
    icon: '🎯', 
    badge: 'WAIT',
    disabled: true 
  },
]

export default function Navigation() {
  const pathname = usePathname()
  const { language } = useLanguage()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Desktop Navigation */}
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
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-gray-300 hover:text-white hover:bg-[#222]'
                }
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={(e) => isDisabled && e.preventDefault()}
            >
              <span className="mr-2">{item.icon}</span>
              {language === 'ko' ? item.labelKo : item.labelEn}
              
              {/* Phase Badge */}
              {item.badge && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-bold bg-yellow-500 text-black rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden p-2 rounded-lg bg-slate-700 text-white"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-[#1a1a1a] border-t border-gray-800 shadow-xl z-50">
          <div className="flex flex-col p-4 gap-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              const isDisabled = item.disabled
              
              return (
                <Link
                  key={item.href}
                  href={isDisabled ? '#' : item.href}
                  className={`
                    relative px-4 py-3 rounded-lg font-medium transition-all
                    ${isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-[#222]'
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
                  {language === 'ko' ? item.labelKo : item.labelEn}
                  
                  {/* Phase Badge */}
                  {item.badge && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-yellow-500 text-black rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}