'use client'

import { usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'

export const MENU_OPEN_EVENT = 'trendsoccer:open-mobile-menu'

interface NavItem {
  id: string
  href?: string
  label: string
  matches?: (path: string) => boolean
  onClick?: () => void
}

function emitMenuOpen() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MENU_OPEN_EVENT))
}

function haptic() {
  try { (navigator as any).vibrate?.(6) } catch {}
}

// 소커 메인 컬러(그린) 유지
const ACTIVE = '#6dff5c'
const INACTIVE = '#8b8a84'

const ICON: Record<string, React.ReactNode> = {
  home: <><path d="m3 9.2 9-6.8 9 6.8V20a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 20z" /><path d="M9.2 21.4V13h5.6v8.4" /></>,
  football: <><circle cx="12" cy="12" r="9" /><path d="M12 8.2l2.7 1.95-1.03 3.2h-3.34L9.3 10.15z" /><path d="M12 3.3V8.2M14.7 10.15l3.3-1.05M13.67 13.35l1.95 3.2M10.33 13.35l-1.95 3.2M9.3 10.15 6 9.1" /></>,
  baseball: <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6c3 2 4.8 5.4 4.8 9.4M18.4 5.6c-3 2-4.8 5.4-4.8 9.4" /></>,
  combo: <><rect x="3" y="4" width="8" height="7" rx="1.5" /><rect x="13" y="4" width="8" height="7" rx="1.5" /><rect x="3" y="14" width="8" height="6" rx="1.5" /><rect x="13" y="14" width="8" height="6" rx="1.5" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
}

export default function BottomNavigation() {
  const pathname = usePathname() || '/'
  const locale = useLocale()
  const isEn = locale === 'en'
  const HIDDEN_ROUTES = ['/login', '/signup-complete']
  if (HIDDEN_ROUTES.some((rp) => pathname === rp || pathname.startsWith(rp + '/'))) return null

  const items: NavItem[] = [
    { id: 'home', href: '/', label: isEn ? 'Home' : '홈', matches: (p) => p === '/' || p === '' },
    { id: 'football', href: '/premium', label: isEn ? 'Football' : '축구 분석', matches: (p) => p.startsWith('/premium') || p.startsWith('/football') || p.startsWith('/results') },
    { id: 'baseball', href: '/baseball/analysis', label: isEn ? 'Baseball' : '야구 분석', matches: (p) => p.startsWith('/baseball/analysis') || p.startsWith('/baseball/results') },
    { id: 'combo', href: '/baseball/multi-match', label: isEn ? 'Multi' : '야구 조합', matches: (p) => p.startsWith('/baseball/multi-match') },
    { id: 'menu', label: isEn ? 'Menu' : '메뉴', onClick: emitMenuOpen },
  ]

  const tabInner = (it: NavItem, active: boolean) => (
    <span className="flex flex-col items-center gap-1" style={{ color: active ? ACTIVE : INACTIVE }}>
      <span className="relative grid place-items-center" style={{ width: 46, height: 28 }}>
        <span
          className="absolute inset-0 rounded-[15px] transition-all duration-200"
          style={{ background: 'rgba(109,255,92,.16)', opacity: active ? 1 : 0, transform: active ? 'scale(1)' : 'scale(.8)' }}
        />
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative' }}>
          {ICON[it.id]}
        </svg>
      </span>
      <span className="text-[10px] font-bold">{it.label}</span>
    </span>
  )

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 sm:hidden border-t border-white/10 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(10, 10, 10, 0.94)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label={isEn ? 'Mobile bottom navigation' : '모바일 하단 네비게이션'}
    >
      <div className="grid grid-cols-5 pt-2 pb-2.5 px-1.5">
        {items.map((it) => {
          const active = it.matches ? it.matches(pathname) : false
          if (it.onClick) {
            return (
              <button key={it.id} type="button" onClick={() => { haptic(); it.onClick!() }} className="ts-tab flex items-center justify-center" aria-label={it.label}>
                {tabInner(it, active)}
              </button>
            )
          }
          return (
            <Link
              key={it.id}
              href={it.href || '/'}
              onClick={() => { haptic(); if (active && typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="ts-tab flex items-center justify-center"
              aria-label={it.label}
            >
              {tabInner(it, active)}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
