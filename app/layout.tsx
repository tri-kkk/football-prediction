import './globals.css'
import type { Metadata } from 'next'
import Script from 'next/script'
import Link from 'next/link'
import GoogleTagManager from './GoogleTagManager'
import Navigation from './components/Navigation'
import BottomNavigation from './components/BottomNavigation'
import { LanguageProvider } from './contexts/LanguageContext'
import LanguageToggle from './components/LanguageToggle'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.trendsoccer.com'),
  title: 'Trend Soccer - 실시간 해외축구 경기 예측 & 프리뷰 플랫폼',
  description: '실시간 확률 기반 축구 경기 예측 분석. 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그 승률 및 트렌드 분석 제공',
  keywords: '축구 예측, 경기 분석, 승률, 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그, 해외축구, 축구 프리뷰, 경기 프리뷰',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        {/* HilltopAds 사이트 소유권 확인 */}
        <meta name="c982cca4dc6a1656193e00065dfdc54ab48699769" content="c982cca4dc6a1656193e00065dfdc54ab48699769" />
      </head>
      <body className="bg-[#0f0f0f] text-white">
        <LanguageProvider>
        {/* Google Tag Manager */}
        <GoogleTagManager />

        {/* Google AdSense */}
        <Script
          id="google-adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7858814871438044"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* HilltopAds In-page Push - Desktop Only */}
        <Script
          id="hilltopads-inpage-push"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // 모바일 체크 함수
              function isMobile() {
                return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                  || window.innerWidth < 768;
              }
              
              // PC일 때만 광고 로드
              if (!isMobile()) {
                (function(mvvkk){
                  var d = document,
                      s = d.createElement('script'),
                      l = d.scripts[d.scripts.length - 1];
                  s.settings = mvvkk || {};
                  s.src = "//aggressivestruggle.com/bRXUV/sZd.G/lS0YY/WPcE/ve/m/9nufZHU/l/kePrTrYY2_OYToYY0jNljigktvNvjnYb5TNejpQm2tO-Ql";
                  s.async = true;
                  s.referrerPolicy = 'no-referrer-when-downgrade';
                  l.parentNode.insertBefore(s, l);
                })({})
              } else {
                console.log('📱 모바일 감지: HilltopAds 비활성화');
              }
            `
          }}
        />

        {/* Monetag Vignette Banner - Desktop Only (모바일 비활성화) */}
        <Script
          id="monetag-vignette"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // 모바일 체크 함수
              function isMobileDevice() {
                return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                  || window.innerWidth < 768;
              }
              
              // PC일 때만 Monetag Vignette 로드
              if (!isMobileDevice()) {
                // Monetag Vignette 스크립트
                (function(d,z,s){
                  s.src='https://'+d+'/400/'+z;
                  try{
                    (document.body||document.documentElement).appendChild(s)
                  }catch(e){}
                })('gloaphoo.net',8348835,document.createElement('script'));
                
                console.log('💻 PC 감지: Monetag Vignette 활성화');
              } else {
                console.log('📱 모바일 감지: Monetag Vignette 비활성화');
              }
            `
          }}
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