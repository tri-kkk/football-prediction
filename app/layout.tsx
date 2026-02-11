import './globals.css'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import Link from 'next/link'
import GoogleTagManager from './GoogleTagManager'
import Navigation from './components/Navigation'
import BottomNavigation from './components/BottomNavigation'
import SportSwitch from './components/SportSwitch'
import { LanguageProvider } from './contexts/LanguageContext'
import LanguageToggle from './components/LanguageToggle'
import HtmlLangUpdater from './components/HtmlLangUpdater'
import { Providers } from './providers'
import AuthButton from './components/AuthButton'
import { PWAInstallProvider } from './components/pwa/PWAInstallContext'
import { IOSInstallGuide } from './components/pwa/IOSInstallGuide'
import InstallBanner from './components/InstallBanner'
import AdSenseLoader from './components/AdSenseLoader'
import TermsGuard from './components/TermsGuard'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.trendsoccer.com'),
  title: '트랜드사커 - TrendSoccer 실시간 해외축구 경기 예측 & AI 분석',
  description: '트랜드사커(TrendSoccer)는 6대 리그 4,800경기 이상의 데이터를 AI로 분석하여 승률 예측을 제공합니다. 실시간 해외축구 배당 분석, 프리미엄 경기 픽, 승무패 예측 정보를 확인하세요.',
  keywords: '트랜드사커, TrendSoccer, 축구 예측, 경기 분석, 승률, 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그, 해외축구, 축구 프리뷰, 경기 프리뷰, AI 축구 분석, 승무패 예측, Soccer Prediction, Football Analysis, EPL Predictions, Match Preview, Live Score',
  authors: [{ name: '트랜드사커 (TrendSoccer)' }],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.trendsoccer.com',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TrendSoccer',
  },
  openGraph: {
    title: '트랜드사커 - 실시간 해외축구 AI 예측',
    description: '데이터가 증명하는 승률. 6대 리그 전 경기 분석 리포트 확인하기.',
    type: 'website',
    locale: 'ko_KR',
    alternateLocale: ['en_US'],
    url: 'https://www.trendsoccer.com',
    siteName: '트랜드사커 (TrendSoccer)',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '트랜드사커 - AI 기반 축구 경기 예측 플랫폼',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '트랜드사커 - 실시간 해외축구 AI 예측',
    description: '데이터가 증명하는 승률. 6대 리그 전 경기 분석 리포트 확인하기.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f0f0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const siteNavigationSchema = {
  "@context": "http://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "SiteNavigationElement",
      "position": 1,
      "name": "프리미엄 경기 예측",
      "alternateName": "Premium Match Predictions",
      "description": "6대 리그, 최근 4시즌 데이터 기반 AI 승률 예측 | AI-powered predictions based on 4 seasons data",
      "url": "https://www.trendsoccer.com/premium"
    },
    {
      "@type": "SiteNavigationElement",
      "position": 2,
      "name": "경기결과",
      "alternateName": "Match Results",
      "description": "경기 스코어 및 하이라이트 제공 | Live scores and highlights",
      "url": "https://www.trendsoccer.com/results"
    },
    {
      "@type": "SiteNavigationElement",
      "position": 3,
      "name": "경기 분석",
      "alternateName": "Match Analysis",
      "description": "주요 리그 경기 심층 분석 리포트 | In-depth match analysis reports",
      "url": "https://www.trendsoccer.com/blog"
    },
    {
      "@type": "SiteNavigationElement",
      "position": 4,
      "name": "최신 축구 뉴스",
      "alternateName": "Latest Football News",
      "description": "최신 국내 및 해외 축구뉴스 | Latest domestic and international football news",
      "url": "https://www.trendsoccer.com/news"
    }
  ]
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "트랜드사커",
  "alternateName": ["TrendSoccer", "Trend Soccer"],
  "url": "https://www.trendsoccer.com",
  "description": "AI 기반 실시간 축구 경기 예측 분석 플랫폼 | AI-powered real-time football match prediction platform",
  "inLanguage": ["ko-KR", "en-US"],
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.trendsoccer.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "트랜드사커",
  "alternateName": ["TrendSoccer", "Trend Soccer"],
  "url": "https://www.trendsoccer.com",
  "logo": "https://www.trendsoccer.com/logo.svg",
  "sameAs": []
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        {/* Facebook 도메인 인증 */}
        <meta name="facebook-domain-verification" content="6jaoly9e4zuusvbebvi6f91jy0pjlv" />
        
        {/* PWA 메타 태그 */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TrendSoccer" />
        
        <Script
          id="site-navigation-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteNavigationSchema)
          }}
        />
        
        <Script
          id="website-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema)
          }}
        />
        
        <Script
          id="organization-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema)
          }}
        />
      </head>
      <body className="bg-[#0f0f0f] text-white">
        <Providers>
        <PWAInstallProvider>
        <LanguageProvider>
        <HtmlLangUpdater />
        
        <GoogleTagManager />

        {/* ============================================
            🛡️ 무효 트래픽 방지 스크립트 (애드센스 보호)
            ============================================
            - 봇/크롤러 감지
            - 비정상적 클릭 패턴 감지  
            - 광고 영역 클릭 추적
            - 의심스러운 활동 시 광고 숨김
        */}
        <Script
          id="adsense-protection"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                'use strict';
                
                var STORAGE_KEY = 'ts_ads_blocked';
                var CLICK_KEY = 'ts_ad_clicks';
                
                // 이미 차단된 세션인지 확인
                function isBlocked() {
                  try {
                    return sessionStorage.getItem(STORAGE_KEY) === 'true';
                  } catch(e) { return false; }
                }
                
                // 광고 차단 설정
                function blockAds(reason) {
                  try {
                    sessionStorage.setItem(STORAGE_KEY, 'true');
                    console.warn('[TrendSoccer] 광고 보호 활성화:', reason);
                    hideAllAds();
                  } catch(e) {}
                }
                
                // 모든 광고 숨기기
                function hideAllAds() {
                  var ads = document.querySelectorAll('.adsbygoogle, ins.adsbygoogle, [data-ad-slot]');
                  ads.forEach(function(ad) {
                    ad.style.display = 'none';
                    ad.style.visibility = 'hidden';
                    ad.style.height = '0';
                    ad.style.overflow = 'hidden';
                  });
                }
                
                // 광고 클릭 추적
                function trackAdClick() {
                  try {
                    var now = Date.now();
                    var clicks = JSON.parse(sessionStorage.getItem(CLICK_KEY) || '[]');
                    
                    // 1분 이내 클릭만 유지
                    clicks = clicks.filter(function(t) { return now - t < 60000; });
                    clicks.push(now);
                    sessionStorage.setItem(CLICK_KEY, JSON.stringify(clicks));
                    
                    // 1분 내 3회 이상 광고 클릭 = 의심
                    if (clicks.length >= 3) {
                      blockAds('광고 과다 클릭 감지');
                    }
                  } catch(e) {}
                }
                
                // 이미 차단된 경우 즉시 숨김
                if (isBlocked()) {
                  hideAllAds();
                  
                  // DOM 변경 감시하여 새 광고도 숨김
                  var observer = new MutationObserver(function() {
                    hideAllAds();
                  });
                  observer.observe(document.body, { childList: true, subtree: true });
                  return;
                }
                
                // 광고 클릭 이벤트 감지
                document.addEventListener('click', function(e) {
                  var target = e.target;
                  
                  // 광고 영역 클릭 감지
                  while (target && target !== document.body) {
                    if (target.classList && 
                        (target.classList.contains('adsbygoogle') || 
                         target.tagName === 'INS' ||
                         target.hasAttribute('data-ad-slot'))) {
                      trackAdClick();
                      break;
                    }
                    target = target.parentElement;
                  }
                }, true);
                
                // 페이지 가시성 변경 감지 (탭 전환 후 광고 클릭 패턴)
                var hiddenCount = 0;
                document.addEventListener('visibilitychange', function() {
                  if (document.hidden) {
                    hiddenCount++;
                    // 짧은 시간 내 너무 많은 탭 전환 = 의심
                    if (hiddenCount > 10) {
                      blockAds('비정상적 탭 전환 패턴');
                    }
                  }
                });
                
                // 5분 후 카운터 리셋
                setTimeout(function() { hiddenCount = 0; }, 300000);
                
                console.log('[TrendSoccer] 광고 보호 스크립트 활성화');
              })();
            `
          }}
        />

        {/* ✅ 프리미엄 사용자 제외 - 조건부 AdSense 로더 */}
        <AdSenseLoader />

        {/* Global Navigation - 모바일 최적화 */}
        <header className="sticky top-0 z-[60] bg-[#1a1a1a] border-b border-gray-800 shadow-lg">
          <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
<div className="flex items-center justify-between">
  {/* 왼쪽: 로고 + 스포츠 전환 */}
  <div className="flex items-center gap-3 md:gap-4">
    <Link href="/" className="flex items-center gap-2 cursor-pointer">
      <img 
        src="/logo.svg" 
        alt="트랜드사커" 
        className="h-8 md:h-12 w-auto"
      />
    </Link>
    
    {/* 스포츠 전환 버튼 */}
    <SportSwitch />
  </div>
              
              <div className="hidden md:block">
                <Navigation />
              </div>
              
              <div className="flex items-center gap-1.5 md:gap-3">
                <LanguageToggle />
                <AuthButton />
              </div>
            </div>
          </div>
        </header>

        {/* ✅ TermsGuard로 감싸서 약관 미동의 시 리다이렉트 */}
        <TermsGuard>
          {/* Main Content */}
<main className="overflow-visible">
  {children}
</main>
        </TermsGuard>

        {/* Footer - 개선된 디자인 */}
        <footer className="border-t border-gray-800 bg-[#111111] mb-16 md:mb-0">
          <div className="container mx-auto px-4">
            
            {/* 상단: 로고 + 네비게이션 링크 */}
            <div className="py-8 border-b border-gray-800">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* 로고 */}
                <Link href="/" className="flex items-center gap-2">
                  <img 
                    src="/logo.svg" 
                    alt="트랜드사커" 
                    className="h-8 w-auto opacity-80"
                  />
                </Link>
                
                {/* 네비게이션 링크 */}
                <div className="flex flex-wrap items-center gap-4 md:gap-6">
                  <Link 
                    href="/about" 
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    About
                  </Link>
                  <Link 
                    href="/advertise" 
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Advertise
                  </Link>
                  <Link 
                    href="/contact" 
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Contact
                  </Link>
                  <Link 
                    href="/privacy" 
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Privacy Policy
                  </Link>
                  <Link 
                    href="/terms" 
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Terms of Service
                  </Link>
                </div>
              </div>
            </div>

            {/* 중단: 고객센터 + 사업자 정보 */}
            <div className="py-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* 고객센터 */}
              <div>
                <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  고객센터
                </h3>
                <div className="space-y-2">
                  <p className="text-gray-400 text-sm">
                    이메일: <a href="mailto:trikilab2025@gmail.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">trikilab2025@gmail.com</a>
                  </p>
                  <p className="text-gray-500 text-xs">
                    운영시간: 평일 10:00 - 17:00 (주말/공휴일 휴무)
                  </p>
                  <p className="text-gray-500 text-xs">
                    문의 접수 후 영업일 기준 1-2일 내 답변드립니다.
                  </p>
                </div>
              </div>

              {/* 사업자 정보 - 2열 레이아웃 */}
              <div>
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  사업자 정보
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-gray-400 text-xs">
                  <p><span className="text-gray-500">상호:</span> 주식회사 트리기</p>
                  <p><span className="text-gray-500">대표자:</span> 김기탁</p>
                  <p><span className="text-gray-500">연락처:</span> 070-5029-3063</p>
                  <p><span className="text-gray-500">사업자등록번호:</span> 406-88-03260</p>
                  <p className="col-span-2"><span className="text-gray-500">통신판매업신고:</span> 제 2025-서울영등포-0011 호</p>
                  <p className="col-span-2"><span className="text-gray-500">주소:</span> 서울특별시 영등포구 국제금융로6길 33, 919호 (여의도동, 맨하탄빌딩)</p>
                </div>
              </div>
            </div>

            {/* 하단: 저작권 + 면책조항 */}
            <div className="py-6 border-t border-gray-800">
              <div className="space-y-3">
 
                
                {/* 저작권 */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pt-2">
                  <p className="text-gray-500 text-xs">
                    © 2025 TrendSoccer (트랜드사커). All rights reserved.
                  </p>
                  <p className="text-gray-600 text-[11px]">
                    AI-powered soccer match prediction and analysis platform
                  </p>
                </div>
              </div>
            </div>
            
          </div>
        </footer>

        {/* 모바일 하단 네비게이션 */}
        <BottomNavigation />
        
        {/* 첫 방문 앱 설치 배너 */}
        <InstallBanner />
        
        {/* iOS PWA 설치 안내 모달 */}
        <IOSInstallGuide />
        
        </LanguageProvider>
        </PWAInstallProvider>
        </Providers>
      </body>
    </html>
  )
}