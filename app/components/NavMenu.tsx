'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import AuthButton from './AuthButton'
import BrandSwitch from './BrandSwitch'

interface SubItem { ko: string; href: string; logo?: string }
interface MenuItem { ko: string; href?: string; matchPaths?: string[]; children?: SubItem[] }

/**
 * 한국어 라벨 → 영어 라벨 매핑 (NavMenu 전용)
 *
 * NavMenu 데이터는 `ko` 키 기준으로 유지하고, 표시 단계에서 locale에 따라 변환.
 * 새 메뉴 항목 추가 시 여기에도 영어 라벨을 함께 추가하면 됩니다.
 */
const EN_LABELS: Record<string, string> = {
  '홈': 'Home',
  '경기 일정': 'Schedule',
  '프리미어리그': 'Premier League',
  '라리가': 'La Liga',
  '분데스리가': 'Bundesliga',
  '세리에A': 'Serie A',
  '리그1': 'Ligue 1',
  '챔피언스리그': 'Champions League',
  'KBO': 'KBO',
  'MLB': 'MLB',
  'NPB': 'NPB',
  '축구 전체': 'All Football',
  '야구 전체': 'All Baseball',
  'AI 분석': 'AI Analysis',
  '축구 프리미엄': 'Football Premium',
  '야구 분석': 'Baseball Analysis',
  '야구 조합 분석': 'Multi-Match Analysis',
  '야구 승1패': 'Baseball Win/1/Loss',
  '경기 결과': 'Results',
  '축구 결과': 'Football Results',
  '야구 결과': 'Baseball Results',
  '하이라이트': 'Highlights',
  '리포트': 'Reports',
  '뉴스': 'News',
  '메뉴': 'Menu',
  '더보기': 'More',
  '매거진': 'Magazine',
  '소개': 'About',
  '광고 문의': 'Advertise',
  '문의하기': 'Contact',
  '야구 조합': 'Multi-Match',
  '로그인해주세요': 'Sign in',
  '분석': 'Analysis',
  '콘텐츠': 'Content',
  '기타': 'More',
  '닫기 ✕': 'Close ✕',
  '주 메뉴': 'Main menu',
}

// ── 모바일 '더보기' 그리드 (실존 라우트만) ──────────────────────────────
type GridItem = { ko: string; href: string; icon: string }
const MORE_SECTIONS: { title: string; items: GridItem[] }[] = [
  {
    title: '분석',
    items: [
      { ko: '축구 프리미엄', href: '/premium', icon: 'premium' },
      { ko: '야구 분석', href: '/baseball/analysis', icon: 'baseball' },
      { ko: '야구 조합', href: '/baseball/multi-match', icon: 'combo' },
      { ko: '야구 승1패', href: '/baseball/toto', icon: 'toto' },
    ],
  },
  {
    title: '콘텐츠',
    items: [
      { ko: '하이라이트', href: '/highlights', icon: 'highlight' },
      { ko: '리포트', href: '/blog', icon: 'report' },
      { ko: '뉴스', href: '/news', icon: 'news' },
      { ko: '매거진', href: '/magazine', icon: 'magazine' },
    ],
  },
  {
    title: '경기 결과',
    items: [
      { ko: '축구 결과', href: '/results', icon: 'resultF' },
      { ko: '야구 결과', href: '/baseball/results', icon: 'resultB' },
    ],
  },
  {
    title: '기타',
    items: [
      { ko: '소개', href: '/about', icon: 'info' },
      { ko: '광고 문의', href: '/advertise', icon: 'ad' },
      { ko: '문의하기', href: '/contact', icon: 'mail' },
    ],
  },
]

// 아이콘 (line style, viewBox 24). BottomNavigation과 톤 통일.
const GRID_ICON: Record<string, React.ReactNode> = {
  premium: <><path d="M4 8l4 3 4-6 4 6 4-3-1.6 10H5.6z" /><path d="M5 20h14" /></>,
  baseball: <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6c3 2 4.8 5.4 4.8 9.4M18.4 5.6c-3 2-4.8 5.4-4.8 9.4" /></>,
  combo: <><rect x="3" y="4" width="8" height="7" rx="1.5" /><rect x="13" y="4" width="8" height="7" rx="1.5" /><rect x="3" y="14" width="8" height="6" rx="1.5" /><rect x="13" y="14" width="8" height="6" rx="1.5" /></>,
  toto: <><path d="M4 7h16M4 12h16M4 17h16" /><path d="M8 4v16" /></>,
  highlight: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></>,
  report: <><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4" /><path d="M9 12h6M9 16h6" /></>,
  news: <><path d="M4 5h13v14H4z" /><path d="M17 8h3v9a2 2 0 0 1-2 2h-1" /><path d="M7 8h7M7 12h7M7 16h4" /></>,
  magazine: <><path d="M3 5h8v14H3zM13 5h8v14h-8z" /><path d="M6 9h2M6 12h2M16 9h2M16 12h2" /></>,
  resultF: <><circle cx="12" cy="12" r="9" /><path d="M12 8.2l2.7 1.95-1.03 3.2h-3.34L9.3 10.15z" /></>,
  resultB: <><path d="M4 6h16v12H4z" /><path d="M8 6v12M16 6v12" /><path d="M4 12h16" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  ad: <><path d="M3 10v4h4l5 4V6l-5 4z" /><path d="M16 9a4 4 0 0 1 0 6" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
}

function L(ko: string, locale: string): string {
  return locale === 'en' ? (EN_LABELS[ko] ?? ko) : ko
}

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
    matchPaths: ['/premium', '/baseball/analysis', '/baseball/multi-match', '/baseball/toto'],
    children: [
      { ko: '축구 프리미엄', href: '/premium' },
      { ko: '야구 분석', href: '/baseball/analysis' },
      { ko: '야구 조합 분석', href: '/baseball/multi-match' },
      { ko: '야구 승1패', href: '/baseball/toto' },
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
  const locale = useLocale()
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
        {L(item.ko, locale)}
      </Link>
    )
  }

  return (
    <div ref={ref} className="relative" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <button type="button" onClick={onClickToggle} aria-expanded={isOpen} className={['flex items-center gap-1 px-4 py-2 rounded-md font-bold text-sm uppercase tracking-wide transition-colors', active ? 'text-emerald-400' : 'text-gray-300 hover:text-white'].join(' ')}>
        <span>{L(item.ko, locale)}</span>
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
                  <span className="font-medium">{L(sub.ko, locale)}</span>
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
  const locale = useLocale()
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

  // 경로/쿼리 변경 시 모바일 드로어 자동 닫기 (하단 네비 등 외부 이동 대응)
  useEffect(() => {
    setMobileOpen(false)
    setOpenKey(null)
  }, [pathname, search.toString()])

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

  const leagueGroup = MENU.find((m) => m.ko === '경기 일정')

  return (
    <>
      <header className="md:hidden sticky top-0 z-50 backdrop-blur-md border-b border-gray-800" style={{ backgroundColor: 'rgba(10, 10, 10, 0.92)' }}>
        <div className="flex items-center justify-between px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 15px)', paddingBottom: 12 }}>
          <div className="flex items-center gap-0.5">
            <Link href="/" className="flex items-center" aria-label="TrendSoccer">
              <img src="/logo.svg" alt="TrendSoccer" className="h-8 w-auto" />
            </Link>
            <BrandSwitch current="soccer" />
          </div>
          <div className="flex items-center gap-2">
            <AuthButton />
          </div>
        </div>
      </header>

      <header className="hidden md:block sticky top-0 z-50 backdrop-blur-md border-b border-gray-800" style={{ backgroundColor: 'rgba(10, 10, 10, 0.92)' }}>
        <div className="home-container mx-auto flex items-center justify-between px-5 h-14">
          <Link href="/" className="flex items-center" aria-label="TrendSoccer">
            <img src="/logo.svg" alt="TrendSoccer" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <AuthButton />
          </div>
        </div>
        <nav className="home-container mx-auto flex items-center gap-1 px-3 h-11 border-t border-gray-800/60" aria-label={L('주 메뉴', locale)}>
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
          <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[65]" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0e0e0e] border-t border-white/10 rounded-t-2xl z-[70] max-h-[94vh] overflow-y-auto tc-sheet-anim" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
            {/* 헤더 */}
            <div className="sticky top-0 bg-[#0e0e0e]/95 backdrop-blur px-4 pt-2.5 pb-3 border-b border-white/10 z-10">
              <div className="w-9 h-1 rounded-full bg-white/25 mx-auto mb-2.5" />
              <div className="flex items-center justify-between">
                <span className="text-base font-extrabold text-white">{L('더보기', locale)}</span>
                <button type="button" onClick={() => setMobileOpen(false)} aria-label={L('닫기 ✕', locale)} className="ts-press w-8 h-8 grid place-items-center rounded-full bg-white/[0.06] text-gray-300">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
            </div>

            <div className="px-3.5 py-3 space-y-3">
              {/* 프로필/로그인 + 홈 (한 줄) */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-white/[0.06] grid place-items-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" /></svg>
                  </span>
                  <div className="flex-1 min-w-0"><AuthButton /></div>
                </div>
                <Link href="/" onClick={() => setMobileOpen(false)} aria-label={L('홈', locale)} className={['ts-press shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-xl border w-16 py-2', pathname === '/' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'text-white bg-white/[0.03] border-white/[0.06]'].join(' ')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><path d="m3 9.5 9-6.5 9 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20z" /><path d="M9.3 21.5V13h5.4v8.5" /></svg>
                  <span className="text-[10px] font-bold">{L('홈', locale)}</span>
                </Link>
              </div>

              {/* 경기 일정 (리그 칩) */}
              {leagueGroup?.children && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="inline-block w-1 h-3.5 rounded-full bg-emerald-500" />
                    <span className="text-[13px] font-bold text-white">{L('경기 일정', locale)}</span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                    {leagueGroup.children.filter((s) => s.logo).map((sub) => {
                      const a = isSubActive(pathname, search, sub.href)
                      return (
                        <Link key={sub.href} href={sub.href} onClick={() => setMobileOpen(false)} className="ts-press flex flex-col items-center gap-1 shrink-0 w-[52px]">
                          <span className={['w-10 h-10 rounded-full bg-white grid place-items-center p-1 border-2', a ? 'border-emerald-500' : 'border-transparent'].join(' ')}>
                            <img src={sub.logo} alt="" className="max-w-full max-h-full object-contain" loading="lazy" />
                          </span>
                          <span className={['text-[10px] font-medium text-center leading-tight line-clamp-1', a ? 'text-emerald-300' : 'text-gray-300'].join(' ')}>{L(sub.ko, locale)}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 기능 그리드 */}
              {MORE_SECTIONS.map((sec) => (
                <div key={sec.title}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="inline-block w-1 h-3.5 rounded-full bg-gray-600" />
                    <span className="text-[13px] font-bold text-white">{L(sec.title, locale)}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {sec.items.map((it) => {
                      const a = pathname === it.href || pathname.startsWith(it.href + '/')
                      return (
                        <Link key={it.href} href={it.href} onClick={() => setMobileOpen(false)} className="ts-press flex flex-col items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] py-2 px-1 active:bg-white/[0.07]">
                          <span className={['w-9 h-9 rounded-full grid place-items-center', a ? 'bg-emerald-500/15' : 'bg-white/[0.05]'].join(' ')}>
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={a ? '#6dff5c' : '#cbd5e1'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{GRID_ICON[it.icon]}</svg>
                          </span>
                          <span className={['text-[10.5px] font-medium text-center leading-tight', a ? 'text-emerald-300' : 'text-gray-200'].join(' ')}>{L(it.ko, locale)}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
