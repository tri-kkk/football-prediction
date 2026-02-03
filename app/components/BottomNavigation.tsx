'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'
import { usePWAInstall } from './pwa/PWAInstallContext'
import Image from 'next/image'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { language } = useLanguage()
  const { canInstall, isInstalled, triggerInstall } = usePWAInstall()

  const navItems = [
    {
      href: '/',
      icon: '/preview.svg',
      labelKo: '트렌드',
      labelEn: 'Trend',
      hidden: false
    },
    {
      href: '/premium',
      icon: 'insights',
      labelKo: '예측',
      labelEn: 'Predict',
      badge: 'BETA',
      hidden: false
    },
    {
      href: '/highlights',
      icon: 'play',
      labelKo: '하이라이트',
      labelEn: 'Highlights',
      hidden: false
    },
    {
      href: '/blog',
      icon: '/article.svg',
      labelKo: '리포트',
      labelEn: 'Report',
      hidden: false
    },
    {
      href: '/news',
      icon: 'feed',
      labelKo: '뉴스',
      labelEn: 'News',
      hidden: false
    },
    {
      href: '/dashboard',
      icon: '/dashboard.svg',
      labelKo: '대시보드',
      labelEn: 'Dashboard',
      hidden: true
    }
  ]

  const visibleNavItems = navItems.filter(item => !item.hidden)
  
  // 설치 가능하고 아직 설치 안 했으면 설치 버튼 추가
  const showInstallButton = canInstall && !isInstalled
  const totalColumns = visibleNavItems.length + (showInstallButton ? 1 : 0)

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-gray-800 z-50 safe-area-bottom">
      <div 
        className="grid gap-1 px-2 py-3" 
        style={{ gridTemplateColumns: `repeat(${totalColumns}, 1fr)` }}
      >
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
                ) : item.icon === 'insights' ? (
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className={isActive ? 'brightness-125' : ''}
                  >
                    <path d="M3 3v18h18" stroke={isActive ? '#3b82f6' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 14l4-4 4 4 5-5" stroke={isActive ? '#3b82f6' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="20" cy="9" r="2" fill={isActive ? '#3b82f6' : '#9ca3af'}/>
                  </svg>
                ) : item.icon === 'play' ? (
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className={isActive ? 'brightness-125' : ''}
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke={isActive ? '#3b82f6' : '#9ca3af'} strokeWidth="2"/>
                    <path d="M10 9l5 3-5 3V9z" fill={isActive ? '#3b82f6' : '#9ca3af'}/>
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
              </div>
              <span className="text-[11px] font-medium">
                {language === 'ko' ? item.labelKo : item.labelEn}
              </span>
              {item.badge && (
                <span className="absolute -top-0.5 -right-0.5 px-1 py-0.5 text-[8px] font-bold rounded bg-yellow-400 text-black">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
        
        {/* 앱 설치 버튼 */}
        {showInstallButton && (
          <button
            onClick={() => triggerInstall()}
            className="relative flex flex-col items-center gap-2 py-2 rounded-lg transition-all text-emerald-400 active:bg-emerald-500/10"
          >
            <div className="relative opacity-100">
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" stroke="#34d399" strokeWidth="2"/>
                <path d="M12 7v6m0 0l-2.5-2.5M12 13l2.5-2.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="9" y1="18" x2="15" y2="18" stroke="#34d399" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-[11px] font-medium">
              {language === 'ko' ? '앱설치' : 'Install'}
            </span>
            {/* NEW 뱃지 */}
            <span className="absolute -top-0.5 -right-0.5 px-1 py-0.5 text-[8px] font-bold rounded bg-red-500 text-white">
              NEW
            </span>
          </button>
        )}
      </div>
    </div>
  )
}