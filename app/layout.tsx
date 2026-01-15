import './globals.css'
import type { Metadata } from 'next'
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
    apple: '/logo.svg',
  },
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
        <LanguageProvider>
        <HtmlLangUpdater />
        
        <GoogleTagManager />

        <Script
          id="google-adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7853814871438044"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

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

        {/* Footer - 모바일에서 하단 네비 공간 확보 */}
        <footer className="py-12 border-t border-gray-800 bg-[#1a1a1a] mb-16 md:mb-0">
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
                href="/advertise" 
                className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              >
                Advertise
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
              <p>© 2025 TrendSoccer (트랜드사커). All rights reserved.</p>
              <p className="mt-2 text-xs text-gray-600">
                AI-powered soccer match prediction and analysis platform
              </p>
            </div>
          </div>
        </footer>

        {/* 모바일 하단 네비게이션 */}
        <BottomNavigation />
        
        </LanguageProvider>
        </Providers>
      </body>
    </html>
  )
}