import './globals.css'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import Link from 'next/link'
import GoogleTagManager from './GoogleTagManager'
import Navigation from './components/Navigation'
import BottomNavigation from './components/BottomNavigation'
import { LanguageProvider } from './contexts/LanguageContext'
import LanguageToggle from './components/LanguageToggle'
import HtmlLangUpdater from './components/HtmlLangUpdater'
import { Providers } from './providers'
import AuthButton from './components/AuthButton'
import { PWAInstallProvider } from './components/pwa/PWAInstallContext'
import { IOSInstallGuide } from './components/pwa/IOSInstallGuide'
import InstallBanner from './components/InstallBanner'
import FooterBusinessInfo from './components/FooterBusinessInfo'
import AdSenseLoader from './components/AdSenseLoader' // ✅ 추가

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

        {/* ✅ 프리미엄 사용자 제외 - 조건부 AdSense 로더 */}
        {/* 
          기존 코드 (모든 사용자에게 로드):
          <Script
            id="google-adsense"
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7853814871438044"
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        */}
        <AdSenseLoader />

        {/* Global Navigation - 모바일 최적화 */}
        <header className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-gray-800 shadow-lg">
          <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 cursor-pointer">
                <img 
                  src="/logo.svg" 
                  alt="트랜드사커" 
                  className="h-8 md:h-12 w-auto"
                />
              </Link>
              
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

        {/* Main Content */}
        <main>
          {children}
        </main>

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

              {/* 사업자 정보 - 토글 컴포넌트 */}
              <FooterBusinessInfo />
            </div>

            {/* 하단: 저작권 + 면책조항 */}
            <div className="py-6 border-t border-gray-800">
              <div className="space-y-3">
                {/* 면책조항 */}
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  트랜드사커는 스포츠 경기 결과에 대한 통계 분석 및 예측 정보를 제공하는 서비스입니다. 
                  본 사이트에서 제공하는 정보는 참고용이며, 이를 기반으로 한 의사결정에 대한 책임은 전적으로 이용자에게 있습니다. 
                  불법 도박은 법적 처벌의 대상이 됩니다.
                </p>
                
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