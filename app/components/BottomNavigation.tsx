'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'
import Image from 'next/image'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { language } = useLanguage()

  const navItems = [
    {
      href: '/',
      icon: '/preview.svg',
      labelKo: '프리뷰',
      labelEn: 'Preview'
    },
    {
      href: '/results',
      icon: '/event.svg',
      labelKo: '경기 일정',
      labelEn: 'Schedule'
    },
    {
      href: '/dashboard',
      icon: '/dashboard.svg',
      labelKo: '대시보드',
      labelEn: 'Dashboard'
    },
    {
      href: '/blog',
      icon: '/article.svg',
      labelKo: '아티클',
      labelEn: 'Article'
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
              className={`flex flex-col items-center gap-2 py-2 rounded-lg transition-all ${
                isActive 
                  ? 'text-blue-500' 
                  : 'text-gray-400 active:bg-gray-800/50'
              }`}
            >
              <div className={`relative transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                <Image 
                  src={item.icon} 
                  alt={item.labelEn}
                  width={24} 
                  height={24}
                  className={isActive ? 'brightness-125' : ''}
                />
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