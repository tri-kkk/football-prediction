import { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'

import GoogleTagManager from '../GoogleTagManager'
import Clarity from '../components/Clarity'
import NavMenu from '../components/NavMenu'
import BottomNavigation from '../components/BottomNavigation'
import { LanguageProvider } from '../contexts/LanguageContext'
import { Providers } from '../providers'
import SignupIncentiveBanner from '../components/SignupIncentiveBanner'
import { PWAInstallProvider } from '../components/pwa/PWAInstallContext'
import { IOSInstallGuide } from '../components/pwa/IOSInstallGuide'
import InstallBanner from '../components/InstallBanner'
import AdSenseLoader from '../components/AdSenseLoader'
import TermsGuard from '../components/TermsGuard'
import Footer from '../components/Footer'

import { routing } from '@/i18n/routing'

const BASE_URL = 'https://www.trendsoccer.com'

/**
 * 정적 빌드 시 모든 locale 페이지 생성을 위한 paramaters 제공
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

/**
 * 언어별 metadata
 *
 * - title / description / keywords / og·twitter / canonical 모두 locale 분기
 * - alternates.languages 로 hreflang 자동 출력 (SEO 핵심)
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const isKo = locale === 'ko'

  // 한국어는 prefix 없음, 영어는 /en
  const localeUrl = isKo ? BASE_URL : `${BASE_URL}/${locale}`

  const title = isKo
    ? '트렌드사커 - 실시간 축구·야구 AI 데이터 분석 플랫폼'
    : 'TrendSoccer - Real-time Football & Baseball AI Data Analytics'

  const description = isKo
    ? '트렌드사커(TrendSoccer)는 축구 6대 리그 및 프로야구(KBO/MLB/NPB) 데이터를 AI로 정밀 분석하여 심층 데이터 리포트를 제공합니다. 실시간 전력 분석과 정확도 높은 프리미엄 경기 분석 리포트를 지금 확인하세요.'
    : 'TrendSoccer provides AI-powered analysis of major football leagues (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League) and pro baseball (KBO/MLB/NPB). Get real-time match insights and premium analytical reports.'

  const keywords = isKo
    ? '트랜드사커, TrendSoccer, 축구 분석, 경기 분석, 데이터 분석, 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그, 해외축구, 축구 프리뷰, 경기 프리뷰, AI 축구 분석, 통계 분석, 야구 분석, KBO 데이터, 프로야구 통계, MLB 분석, 세이버메트릭스'
    : 'TrendSoccer, soccer analysis, football analysis, match preview, EPL analysis, La Liga, Bundesliga, Serie A, Ligue 1, Champions League, AI football analysis, baseball analysis, KBO, MLB, NPB, sabermetrics, match prediction'

  const ogLocale = isKo ? 'ko_KR' : 'en_US'
  const altOgLocale = isKo ? ['en_US'] : ['ko_KR']

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    keywords,
    authors: [{ name: isKo ? '트랜드사커 (TrendSoccer)' : 'TrendSoccer' }],
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: localeUrl,
      languages: {
        'ko-KR': BASE_URL,
        'en-US': `${BASE_URL}/en`,
        'x-default': BASE_URL,
      },
    },
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: 'TrendSoccer',
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: ogLocale,
      alternateLocale: altOgLocale,
      url: localeUrl,
      siteName: isKo ? '트랜드사커 (TrendSoccer)' : 'TrendSoccer',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: isKo
            ? '트렌드사커 - AI 기반 축구·야구 경기 분석 플랫폼'
            : 'TrendSoccer - AI-powered Football & Baseball Analysis',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
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
}

export const viewport: Viewport = {
  themeColor: '#0f0f0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

// 구조화 데이터 스키마들 (검색엔진용 — 양 언어 alternateName 유지)
const siteNavigationSchema = {
  '@context': 'http://schema.org',
  '@type': 'ItemList',
  itemListElement: [
    {
      '@type': 'SiteNavigationElement',
      position: 1,
      name: '프리미엄 경기 분석',
      alternateName: 'Premium Match Analysis',
      description:
        '6대 리그, 최근 4시즌 데이터 기반 AI 심층 분석 | AI-powered in-depth analysis based on 4 seasons data',
      url: 'https://www.trendsoccer.com/premium',
    },
    {
      '@type': 'SiteNavigationElement',
      position: 2,
      name: '경기결과',
      alternateName: 'Match Results',
      description: '경기 스코어 및 하이라이트 제공 | Live scores and highlights',
      url: 'https://www.trendsoccer.com/results',
    },
    {
      '@type': 'SiteNavigationElement',
      position: 3,
      name: '경기 분석',
      alternateName: 'Match Analysis',
      description:
        '주요 리그 경기 심층 분석 리포트 | In-depth match analysis reports',
      url: 'https://www.trendsoccer.com/blog',
    },
    {
      '@type': 'SiteNavigationElement',
      position: 4,
      name: '최신 축구 뉴스',
      alternateName: 'Latest Football News',
      description:
        '최신 국내 및 해외 축구뉴스 | Latest domestic and international football news',
      url: 'https://www.trendsoccer.com/news',
    },
    {
      '@type': 'SiteNavigationElement',
      position: 5,
      name: '야구 AI 분석',
      alternateName: 'Baseball AI Analysis',
      description:
        'KBO, NPB, MLB 프로야구 AI 데이터 분석 | AI-powered baseball data analysis',
      url: 'https://www.trendsoccer.com/baseball',
    },
  ],
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '트랜드사커',
  alternateName: ['TrendSoccer', 'Trend Soccer'],
  url: 'https://www.trendsoccer.com',
  description:
    'AI 기반 실시간 축구·야구 경기 데이터 분석 플랫폼 | AI-powered real-time football & baseball match data analysis platform',
  inLanguage: ['ko-KR', 'en-US'],
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://www.trendsoccer.com/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '트랜드사커',
  alternateName: ['TrendSoccer', 'Trend Soccer'],
  url: 'https://www.trendsoccer.com',
  logo: 'https://www.trendsoccer.com/logo.svg',
  sameAs: [],
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // 지원하지 않는 locale로 접근하면 404
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  // 정적 렌더링을 활성화하기 위해 요청 locale을 명시
  setRequestLocale(locale)

  // 클라이언트 컴포넌트에 메시지 전달
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <head>
        {/* Facebook 도메인 인증 */}
        <meta
          name="facebook-domain-verification"
          content="6jaoly9e4zuusvbebvi6f91jy0pjlv"
        />

        {/* PWA 메타 태그 */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="TrendSoccer" />

        <Script
          id="site-navigation-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(siteNavigationSchema),
          }}
        />

        <Script
          id="website-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />

        <Script
          id="organization-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body className="bg-[#0f0f0f] text-white">
        {/* next-intl 메시지를 Client Components 트리에 주입 */}
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers>
            <PWAInstallProvider>
              {/*
                LanguageProvider는 기존 useLanguage() 호출 페이지들을 위해 일단 유지.
                Phase 3에서 페이지별로 useTranslations()로 교체 후 Phase 4에서 제거.
                내부적으로 next-intl의 locale을 따라가도록 동기화 처리는 Context 쪽에서.
              */}
              <LanguageProvider>
                <GoogleTagManager />

                {/* Microsoft Clarity (히트맵 + 세션 녹화) */}
                <Clarity />

                {/* 🛡️ 무효 트래픽 방지 스크립트 (애드센스 보호) */}
                <Script
                  id="adsense-protection"
                  strategy="afterInteractive"
                  dangerouslySetInnerHTML={{
                    __html: `
                      (function() {
                        'use strict';
                        var STORAGE_KEY = 'ts_ads_blocked';
                        var CLICK_KEY = 'ts_ad_clicks';
                        function isBlocked() {
                          try { return sessionStorage.getItem(STORAGE_KEY) === 'true'; } catch(e) { return false; }
                        }
                        function blockAds(reason) {
                          try {
                            sessionStorage.setItem(STORAGE_KEY, 'true');
                            console.warn('[TrendSoccer] 광고 보호 활성화:', reason);
                            hideAllAds();
                          } catch(e) {}
                        }
                        function hideAllAds() {
                          var ads = document.querySelectorAll('.adsbygoogle, ins.adsbygoogle, [data-ad-slot]');
                          ads.forEach(function(ad) {
                            ad.style.display = 'none';
                            ad.style.visibility = 'hidden';
                            ad.style.height = '0';
                            ad.style.overflow = 'hidden';
                          });
                        }
                        function trackAdClick() {
                          try {
                            var now = Date.now();
                            var clicks = JSON.parse(sessionStorage.getItem(CLICK_KEY) || '[]');
                            clicks = clicks.filter(function(t) { return now - t < 60000; });
                            clicks.push(now);
                            sessionStorage.setItem(CLICK_KEY, JSON.stringify(clicks));
                            if (clicks.length >= 3) { blockAds('광고 과다 클릭 감지'); }
                          } catch(e) {}
                        }
                        if (isBlocked()) {
                          hideAllAds();
                          var observer = new MutationObserver(function() { hideAllAds(); });
                          observer.observe(document.body, { childList: true, subtree: true });
                          return;
                        }
                        document.addEventListener('click', function(e) {
                          var target = e.target;
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
                        var hiddenCount = 0;
                        document.addEventListener('visibilitychange', function() {
                          if (document.hidden) {
                            hiddenCount++;
                            if (hiddenCount > 10) { blockAds('비정상적 탭 전환 패턴'); }
                          }
                        });
                        setTimeout(function() { hiddenCount = 0; }, 300000);
                        console.log('[TrendSoccer] 광고 보호 스크립트 활성화');
                      })();
                    `,
                                }}
                />

                {/* ✅ 프리미엄 사용자 제외 - 조건부 AdSense 로더 */}
                <AdSenseLoader />

                {/* 🔥 통합 GNB - NavMenu */}
                <Suspense fallback={null}>
                  <NavMenu />
                </Suspense>

                {/* 🎯 비회원 가입 유도 배너 (헤더 바로 아래) */}
                <Suspense fallback={null}>
                  <SignupIncentiveBanner />
                </Suspense>

                {/* ✅ TermsGuard로 감싸서 약관 미동의 시 리다이렉트 */}
                <TermsGuard>
                  <main className="overflow-visible">{children}</main>
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
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
