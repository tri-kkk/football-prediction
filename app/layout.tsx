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
import Footer from './components/Footer'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.trendsoccer.com'),
  title: '트렌드사커 - 실시간 축구·야구 AI 데이터 분석 플랫폼',
  description: '트렌드사커(TrendSoccer)는 축구 6대 리그 및 프로야구(KBO/MLB/NPB) 데이터를 AI로 정밀 분석하여 심층 데이터 리포트를 제공합니다. 실시간 전력 분석과 정확도 높은 프리미엄 경기 분석 리포트를 지금 확인하세요.',
  keywords: '트랜드사커, TrendSoccer, 축구 분석, 경기 분석, 데이터 분석, 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그, 해외축구, 축구 프리뷰, 경기 프리뷰, AI 축구 분석, 통계 분석, Soccer Analysis, Football Analysis, EPL Analysis, Match Preview, Live Score, 야구 분석, KBO 데이터, 프로야구 통계, MLB 분석, 세이버메트릭스, 경기 분석, KBO 프리뷰, 야구 데이터, NPB 데이터, NPB 분석, NPB 프리뷰, MLB 프리뷰',
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
    title: '트렌드사커 - 실시간 축구·야구 AI 데이터 분석 플랫폼',
    description: '트렌드사커(TrendSoccer)는 축구 6대 리그 및 프로야구(KBO/MLB/NPB) 데이터를 AI로 정밀 분석하여 심층 데이터 리포트를 제공합니다. 실시간 전력 분석과 정확도 높은 프리미엄 경기 분석 리포트를 지금 확인하세요.',
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
        alt: '트렌드사커 - AI 기반 축구·야구 경기 분석 플랫폼',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '트렌드사커 - 실시간 축구·야구 AI 데이터 분석 플랫폼',
    description: '트렌드사커(TrendSoccer)는 축구 6대 리그 및 프로야구(KBO/MLB/NPB) 데이터를 AI로 정밀 분석하여 심층 데이터 리포트를 제공합니다.',
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
      "name": "프리미엄 경기 분석",
      "alternateName": "Premium Match Analysis",
      "description": "6대 리그, 최근 4시즌 데이터 기반 AI 심층 분석 | AI-powered in-depth analysis based on 4 seasons data",
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
    },
    {
      "@type": "SiteNavigationElement",
      "position": 5,
      "name": "야구 AI 분석",
      "alternateName": "Baseball AI Analysis",
      "description": "KBO, NPB, MLB 프로야구 AI 데이터 분석 | AI-powered baseball data analysis",
      "url": "https://www.trendsoccer.com/baseball"
    }
  ]
}

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "트랜드사커",
  "alternateName": ["TrendSoccer", "Trend Soccer"],
  "url": "https://www.trendsoccer.com",
  "description": "AI 기반 실시간 축구·야구 경기 데이터 분석 플랫폼 | AI-powered real-time football & baseball match data analysis platform",
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

        <Footer />

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