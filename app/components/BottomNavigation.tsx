'use client'

import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'

export const MENU_OPEN_EVENT = 'trendsoccer:open-mobile-menu'

interface NavItem {
  href?: string
  label: string
  isHome?: boolean
  matches?: (path: string) => boolean
  onClick?: () => void
}

function emitMenuOpen() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MENU_OPEN_EVENT))
}

export default function BottomNavigation() {
  const pathname = usePathname() || '/'
  const locale = useLocale()
  const isEn = locale === 'en'
  const HIDDEN_ROUTES = ['/login', '/signup-complete']
  if (HIDDEN_ROUTES.some((rp) => pathname === rp || pathname.startsWith(rp + '/'))) return null

  const items: NavItem[] = [
    { href: '/', label: isEn ? 'Home' : '홈', isHome: true, matches: (p) => p === '/' || p === '' },
    { href: '/premium', label: isEn ? 'Football' : '축구 분석', matches: (p) => p.startsWith('/premium') || p.startsWith('/football') || p.startsWith('/results') },
    { href: '/baseball/analysis', label: isEn ? 'Baseball' : '야구 분석', matches: (p) => p.startsWith('/baseball/analysis') || p.startsWith('/baseball/results') },
    { href: '/baseball/multi-match', label: isEn ? 'Multi-Match' : '야구 조합', matches: (p) => p.startsWith('/baseball/multi-match') },
    { label: isEn ? 'Menu' : '메뉴', onClick: emitMenuOpen },
  ]

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 sm:hidden border-t border-gray-800 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(10, 10, 10, 0.94)' }}
      aria-label={isEn ? 'Mobile bottom navigation' : '모바일 하단 네비게이션'}
    >
      <div className="grid grid-cols-5 h-14">
        {items.map((it, idx) => {
          const active = it.matches ? it.matches(pathname) : false

          let labelStyle: React.CSSProperties = {}
          let labelClass = 'text-[12px] font-medium'

          if (it.isHome) {
            labelStyle = { color: '#6dff5c' }
            labelClass = 'text-[12px] font-bold'
          } else if (active) {
            labelClass = 'text-[12px] font-bold text-white'
          } else {
            labelClass = 'text-[12px] font-medium text-gray-400 hover:text-gray-200'
          }

          const indicator = active ? (
            <span
              className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full"
              style={{ background: it.isHome ? '#6dff5c' : '#10b981' }}
            />
          ) : null

          const inner = (
            <span className="relative flex items-center justify-center w-full h-full transition-colors">
              {indicator}
              <span className={labelClass} style={labelStyle}>
                {it.label}
              </span>
            </span>
          )

          if (it.onClick) {
            return (
              <button
                key={idx}
                type="button"
                onClick={it.onClick}
                className="relative flex items-center justify-center"
                aria-label={it.label}
              >
                {inner}
              </button>
            )
          }

          return (
            <Link
              key={idx}
              href={it.href || '/'}
              className="relative flex items-center justify-center"
              aria-label={it.label}
            >
              {inner}
            </Link>
          )
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom,0)]" />
    </nav>
  )
}
