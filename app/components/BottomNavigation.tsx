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
      labelEn: 'Preview',
      hidden: false
    },
    {
      href: '/results',
      icon: '/event.svg',
      labelKo: '결과',
      labelEn: 'Results',
      hidden: false
    },
    {
      href: '/blog',
      icon: '/article.svg',
      labelKo: '아티클',
      labelEn: 'Article',
      hidden: false
    },
    {
      href: '/magazine',
      icon: 'feed', // inline SVG 사용
      labelKo: '피드',
      labelEn: 'Feed',
    
      hidden: false
    },
    {
      href: '/dashboard',
      icon: '/dashboard.svg',
      labelKo: '대시보드',
      labelEn: 'Dashboard',
      hidden: true  // 숨김 처리
    }
  ]

  // 숨김 처리된 메뉴 필터링
  const visibleNavItems = navItems.filter(item => !item.hidden)

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-gray-800 z-50 safe-area-bottom">
      <div className={`grid gap-1 px-2 py-3`} style={{ gridTemplateColumns: `repeat(${visibleNavItems.length}, 1fr)` }}>
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center gap-2 py-2 rounded-lg transition-all ${
                isActive 
                  ? 'text-blue-500' 
                  : 'text-gray-400 active:bg-gray-800/50'
              }`}
            >
              <div className={`relative transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.icon === 'feed' ? (
                  // Inline RSS Feed SVG with explicit colors
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={isActive ? 'brightness-125' : ''}
                  >
                    <circle cx="6.18" cy="17.82" r="2.18" fill={isActive ? '#3b82f6' : '#9ca3af'}/>
                    <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" fill={isActive ? '#3b82f6' : '#9ca3af'}/>
                  </svg>
                ) : (
                  <Image 
                    src={item.icon} 
                    alt={item.labelEn}
                    width={24} 
                    height={24}
                    className={isActive ? 'brightness-125' : ''}
                  />
                )}
                {/* NEW Badge */}
                {item.badge && (
                  <span className="absolute -top-1 -right-2 px-1 py-0.5 text-[8px] font-bold rounded-full bg-yellow-400 text-black">
                    {item.badge}
                  </span>
                )}
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