'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import AuthButton from './AuthButton'

interface SubItem { ko: string; href: string; logo?: string }
interface MenuItem { ko: string; href?: string; matchPaths?: string[]; children?: SubItem[] }

const MENU: MenuItem[] = [
  { ko: '홈', href: '/' },
  {
    ko: '경기 일정',
    matchPaths: [],
    children: [
      { ko: '프리미어리그', href: '/?league=PL', logo: 'https://media.api-sports.io/football/leagues/39.png' },
      { ko: '라리가', href: '/?league=PD', logo: 'https://media.api-sports.io/football/leagues/140.png' },
      { ko: '분데스리가', href: '/?league=BL1', logo: 'https://media.api-sports.io/football/leagues/78.png' },
      { ko: '세리에A', href: '/?league=SA', logo: 'https://media.api-sports.io/football/leagues/135.png' },
      { ko: '리그1', href: '/?league=FL1', logo: 'https://media.api-sports.io/football/leagues/61.png' },
      { ko: '챔피언스리그', href: '/?league=CL', logo: 'https://media.api-sports.io/football/leagues/2.png' },
      { ko: 'KBO', href: '/?league=KBO', logo: 'https://media.api-sports.io/baseball/leagues/5.png' },
      { ko: 'MLB', href: '/?league=MLB', logo: 'https://media.api-sports.io/baseball/leagues/1.png' },
      { ko: 'NPB', href: '/?league=NPB', logo: 'https://media.api-sports.io/baseball/leagues/2.png' },
      { ko: '축구 전체', href: '/?sport=football' },
      { ko: '야구 전체', href: '/?sport=baseball' },
    ],
  },
  {
    ko: 'AI 분석',
    matchPaths: ['/premium', '/baseball/analysis', '/baseball/multi-match'],
    children: [
      { ko: '축구 프리미엄', href: '/premium' },
      { ko: '야구 분석', href: '/baseball/analysis' },
      { ko: '야구 다경기 분석', href: '/baseball/multi-match' },
    ],
  },
  {
    ko: '경기 결과',
    matchPaths: ['/results', '/baseball/results'],
    children: [
      { ko: '축구 결과', href: '/results' },
      { ko: '야구 결과', href: '/baseball/results' },
    ],
  },
  { ko: '하이라이트', href: '/highlights' },
  { ko: '리포트', href: '/blog' },
  { ko: '뉴스', href: '/news' },
]

function isSubActive(pathname: string, search: URLSearchParams, href: string): boolean {
  const [path, query] = href.split('?')
  if (pathname !== path) return false
  if (!query) return true
  const want = new URLSearchParams(query)
  for (const [k, v] of want.entries()) {
    if (search.get(k) !== v) return false
  }
  return true
}

function isActive(pathname: string, item: MenuItem): boolean {
  if (item.href) {
    if (item.href === '/') return pathname === '/'
    if (pathname === item.href || pathname.startsWith(item.href + '/')) return true
  }
  if (item.matchPaths?.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true
  if (item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href.split('?')[0] + '/'))) return true
  return false
}

interface DesktopItemProps {
  item: MenuItem
  isOpen: boolean
  onHover: () => void
  onLeave: () => void
  onClickToggle: () => void
}

function DesktopItem({ item, isOpen, onHover, onLeave, onClickToggle }: DesktopItemProps) {
  const pathname = usePathname() || '/'
  const search = useSearchParams() ?? new URLSearchParams()
  const ref = useRef<HTMLDivElement>(null)
  const active = isActive(pathname, item)

  useEffect(() => {
    if (!isOpen) return
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onLeave() }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [isOpen, onLeave])

  if (!item.children) {
    return (
      <Link href={item.href || '#'} className={['px-4 py-2 rounded-md font-bold text-sm uppercase tracking-wide transition-colors', active ? 'text-emerald-400' : 'text-gray-300 hover:text-white'].join(' ')}>
        {item.ko}
      </Link>
    )
  }

  return (
    <div ref={ref} className="relative" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <button type="button" onClick={onClickToggle} aria-expanded={isOpen} className={['flex items-center gap-1 px-4 py-2 rounded-md font-bold text-sm uppercase tracking-wide transition-colors', active ? 'text-emerald-400' : 'text-gray-300 hover:text-white'].join(' ')}>
        <span>{item.ko}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 min-w-[240px] z-[100] rounded-xl bg-[#1a1a1a] border border-gray-800 shadow-2xl overflow-hidden">
          <div className="py-1.5">
            {item.children.map((sub) => {
              const subActive = isSubActive(pathname, search, sub.href)
              return (
                <Link key={sub.href} href={sub.href} onClick={onLeave} className={['flex items-center gap-3 px-4 py-2 text-sm transition-colors', subActive ? 'bg-emerald-500/10 text-emerald-300' : 'text-gray-300 hover:bg-gray-800/70 hover:text-white'].join(' ')}>
                  {sub.logo ? (
                    <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 p-0.5">
                      <img src={sub.logo} alt="" className="max-w-full max-h-full object-contain" loading="lazy" />
                    </span>
                  ) : <span className="w-6" />}
                  <span className="font-medium">{sub.ko}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function NavMenu() {
  const pathname = usePathname() || '/'
  const search = useSearchParams() ?? new URLSearchParams()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setMobileOpen(true)
    if (typeof window !== 'undefined') {
      window.addEventListener('trendsoccer:open-mobile-menu', handler)
      return () => window.removeEventListener('trendsoccer:open-mobile-menu', handler)
    }
  }, [])

  const HIDDEN_ROUTES = ['/login', '/signup-complete', '/premium/pricing']
  if (HIDDEN_ROUTES.some((rp) => pathname === rp || pathname.startsWith(rp + '/'))) return null

  const onHover = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenKey(key)
  }
  const onLeave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenKey(null), 120)
  }
  const onClickToggle = (key: string) => {
    setOpenKey((cur) => (cur === key ? null : key))
  }

  const flat = MENU.filter((m) => !m.children)
  const groups = MENU.filter((m) => m.children)

  return (
    <>
      <header className="md:hidden sticky top-0 z-50 backdrop-blur-md border-b border-gray-800" style={{ backgroundColor: 'rgba(10, 10, 10, 0.92)' }}>
        <div className="flex items-center justify-between px-4 h-12">
          <Link href="/" className="flex items-center" aria-label="TrendSoccer">
            <img src="/logo.svg" alt="TrendSoccer" className="h-7 w-auto" />
          </Link>
          <AuthButton />
        </div>
      </header>

      <header className="hidden md:block sticky top-0 z-50 backdrop-blur-md border-b border-gray-800" style={{ backgroundColor: 'rgba(10, 10, 10, 0.92)' }}>
        <div className="home-container mx-auto flex items-center justify-between px-5 h-14">
          <Link href="/" className="flex items-center" aria-label="TrendSoccer">
            <img src="/logo.svg" alt="TrendSoccer" className="h-9 w-auto" />
          </Link>
          <AuthButton />
        </div>
        <nav className="home-container mx-auto flex items-center gap-1 px-3 h-11 border-t border-gray-800/60" aria-label="주 메뉴">
          {MENU.map((item) => (
            <DesktopItem
              key={item.ko}
              item={item}
              isOpen={openKey === item.ko}
              onHover={() => onHover(item.ko)}
              onLeave={onLeave}
              onClickToggle={() => onClickToggle(item.ko)}
            />
          ))}
        </nav>
      </header>

      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="md:hidden fixed top-0 left-0 right-0 bg-[#0f0f0f] border-b border-gray-800 z-50 max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-200">메뉴</span>
              <button type="button" onClick={() => setMobileOpen(false)} className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium">닫기 ✕</button>
            </div>
            <div className="px-4 py-3 space-y-3">
              {flat.length > 0 && (
                <div className="space-y-1">
                  {flat.map((it) => {
                    const a = isActive(pathname, it)
                    return (
                      <Link key={it.ko} href={it.href || '#'} onClick={() => setMobileOpen(false)} className={['block px-3 py-3 rounded-lg text-sm font-bold border', a ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'text-white hover:bg-gray-800/60 border-transparent'].join(' ')}>{it.ko}</Link>
                    )
                  })}
                </div>
              )}
              {groups.map((g) => {
                const a = isActive(pathname, g)
                return (
                  <div key={g.ko}>
                    <div className={['flex items-center gap-2 px-1 mb-2 pb-1.5 border-b', a ? 'border-emerald-500/30' : 'border-gray-800'].join(' ')}>
                      <span className={['inline-block w-1 h-4 rounded-full', a ? 'bg-emerald-500' : 'bg-gray-600'].join(' ')} />
                      <span className={['text-sm font-bold tracking-wide', a ? 'text-emerald-300' : 'text-white'].join(' ')}>{g.ko}</span>
                    </div>
                    <div className="space-y-0.5">
                      {g.children!.map((sub) => {
                        const subActive = isSubActive(pathname, search, sub.href)
                        return (
                          <Link key={sub.href} href={sub.href} onClick={() => setMobileOpen(false)} className={['flex items-center gap-2.5 px-3 py-2 rounded-md text-sm', subActive ? 'bg-emerald-500/10 text-emerald-300' : 'text-gray-300 hover:bg-gray-800/60'].join(' ')}>
                            {sub.logo ? (
                              <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 p-0.5">
                                <img src={sub.logo} alt="" className="max-w-full max-h-full object-contain" loading="lazy" />
                              </span>
                            ) : <span className="w-6" />}
                            <span>{sub.ko}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}
