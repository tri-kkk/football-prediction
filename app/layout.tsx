import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import Link from 'next/link'
import GoogleTagManager from './GoogleTagManager'
import Navigation from './components/Navigation'
import BottomNavigation from './components/BottomNavigation'
import { LanguageProvider } from './contexts/LanguageContext'
import LanguageToggle from './components/LanguageToggle'
import HtmlLangUpdater from './components/HtmlLangUpdater'  // ✅ 동적 언어 처리

export const metadata: Metadata = {
  metadataBase: new URL('https://www.trendsoccer.com'),
  title: 'Trend Soccer - 실시간 해외축구 경기 예측 & 프리뷰 플랫폼',
  description: '실시간 확률 기반 축구 경기 예측 분석. 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그 승률 및 트렌드 분석 제공',
  keywords: '축구 예측, 경기 분석, 승률, 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그, 해외축구, 축구 프리뷰, 경기 프리뷰, Soccer Prediction, Football Analysis, EPL Predictions, Match Preview, Live Score',
  authors: [{ name: 'Trend Soccer' }],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://www.trendsoccer.com',
  },
  openGraph: {
    title: 'Trend Soccer - 실시간 해외축구 경기 예측 & 프리뷰 플랫폼',
    description: '실시간 확률 기반 축구 경기 예측 분석 플랫폼',
    type: 'website',
    locale: 'ko_KR',
    alternateLocale: ['en_US'],
    url: 'https://www.trendsoccer.com',
    siteName: 'Trend Soccer',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Trend Soccer - 축구 경기 예측 플랫폼',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trend Soccer - 실시간 해외축구 경기 예측',
    description: '실시간 확률 기반 축구 경기 예측 분석 플랫폼',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/logo.svg',
  },
}

// ✅ JSON-LD 구조화 데이터 - 사이트 네비게이션 (Google 사이트링크용) - 한/영 지원
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

// ✅ JSON-LD 구조화 데이터 - 웹사이트 (검색 기능 표시)
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Trend Soccer",
  "alternateName": "트렌드사커",
  "url": "https://www.trendsoccer.com",
  "description": "실시간 확률 기반 축구 경기 예측 분석 플랫폼 | Real-time football match prediction platform",
  "inLanguage": ["ko-KR", "en-US"],
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.trendsoccer.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}

// ✅ JSON-LD 구조화 데이터 - 조직 (브랜드 인식)
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Trend Soccer",
  "alternateName": "트렌드사커",
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
        {/* ✅ JSON-LD 구조화 데이터 - 사이트 네비게이션 */}
        <Script
          id="site-navigation-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteNavigationSchema)
          }}
        />
        
        {/* ✅ JSON-LD 구조화 데이터 - 웹사이트 */}
        <Script
          id="website-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema)
          }}
        />
        
        {/* ✅ JSON-LD 구조화 데이터 - 조직 */}
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
        <LanguageProvider>
        {/* ✅ 동적 html lang 속성 변경 */}
        <HtmlLangUpdater />
        
        {/* Google Tag Manager */}
        <GoogleTagManager />

        {/* Google AdSense */}
        <Script
          id="google-adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7853814871438044"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* Global Navigation */}
        <header className="sticky top-0 z-50 bg-[#1a1a1a] border-b border-gray-800 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* 좌측: Logo */}
              <Link href="/" className="flex items-center gap-3 cursor-pointer">
                <img 
                  src="/logo.svg" 
                  alt="Trend Soccer" 
                  className="h-12 w-auto"
                />
              </Link>
              
              {/* 중앙: Desktop Navigation (PC만) */}
              <div className="hidden md:block">
                <Navigation />
              </div>
              
              {/* 우측: Language Toggle */}
              <div className="flex-shrink-0">
                <LanguageToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pb-20 md:pb-0">
          {children}
        </main>

        {/* 모바일 하단 네비게이션 */}
        <BottomNavigation />

        {/* Footer */}
        <footer className="mt-20 py-12 border-t border-gray-800 bg-[#1a1a1a]">
          <div className="container mx-auto px-4">
            {/* Footer Links */}
            <div className="flex flex-wrap justify-center items-center gap-6 mb-6">
              <Link 
                href="/about" 
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                About
              </Link>
              <span className="text-gray-600">•</span>
              <Link 
                href="/contact" 
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Contact
              </Link>
              <span className="text-gray-600">•</span>
              <Link 
                href="/privacy" 
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Privacy Policy
              </Link>
              <span className="text-gray-600">•</span>
              <Link 
                href="/terms" 
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Terms of Service
              </Link>
            </div>
            
            {/* Copyright */}
            <div className="text-center text-gray-500 text-sm">
              <p>© 2025 Trend Soccer. All rights reserved.</p>
              <p className="mt-2 text-xs text-gray-600">
                Real-time soccer match prediction and analysis platform
              </p>
            </div>
          </div>
        </footer>
        </LanguageProvider>
      </body>
    </html>
  )
}