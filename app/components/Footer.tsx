'use client'

import Link from 'next/link'
import { useLanguage } from '../contexts/LanguageContext'

export default function Footer() {
  const { language } = useLanguage()
  const t = (ko: string, en: string) => language === 'ko' ? ko : en

  return (
    <footer className="border-t border-gray-800 bg-[#111111] mb-16 md:mb-0">
      <div className="container mx-auto px-4">

        {/* 상단: 로고 + 네비게이션 링크 */}
        <div className="py-8 border-b border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/logo.svg"
                alt="TrendSoccer"
                className="h-8 w-auto opacity-80"
              />
            </Link>

            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              <Link href="/about" className="text-gray-400 hover:text-white transition-colors text-sm">About</Link>
              <Link href="/advertise" className="text-gray-400 hover:text-white transition-colors text-sm">Advertise</Link>
              <Link href="/contact" className="text-gray-400 hover:text-white transition-colors text-sm">Contact</Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy Policy</Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">Terms of Service</Link>
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
              {t('고객센터', 'Customer Support')}
            </h3>
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">
                {t('이메일', 'Email')}: <a href="mailto:trikilab2025@gmail.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">trikilab2025@gmail.com</a>
              </p>
              <p className="text-gray-500 text-xs">
                {t('운영시간: 평일 10:00 - 17:00 (주말/공휴일 휴무)', 'Hours: Mon-Fri 10:00 - 17:00 KST (Closed on weekends/holidays)')}
              </p>
              <p className="text-gray-500 text-xs">
                {t('문의 접수 후 영업일 기준 1-2일 내 답변드립니다.', 'We respond within 1-2 business days.')}
              </p>
            </div>
          </div>

          {/* 사업자 정보 */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {t('사업자 정보', 'Business Information')}
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-gray-400 text-xs">
              <p><span className="text-gray-500">{t('상호', 'Company')}:</span> {t('주식회사 트리기', 'Triki Inc.')}</p>
              <p><span className="text-gray-500">{t('대표자', 'CEO')}:</span> {t('김기탁', 'Gitak Kim')}</p>
              <p><span className="text-gray-500">{t('연락처', 'Phone')}:</span> 070-5029-3063</p>
              <p><span className="text-gray-500">{t('사업자등록번호', 'Business Reg. No.')}:</span> 406-88-03260</p>
              <p className="col-span-2"><span className="text-gray-500">{t('통신판매업신고', 'E-Commerce Reg.')}:</span> {t('제 2025-서울영등포-0011 호', 'No. 2025-Seoul-Yeongdeungpo-0011')}</p>
              <p className="col-span-2"><span className="text-gray-500">{t('주소', 'Address')}:</span> {t('서울특별시 영등포구 국제금융로6길 33, 919호 (여의도동, 맨하탄빌딩)', '33, Gukjegeumyung-ro 6-gil, Yeongdeungpo-gu, Seoul, #919')}</p>
            </div>
          </div>
        </div>

        {/* 하단: 저작권 */}
        <div className="py-6 border-t border-gray-800">
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 pt-2">
              <p className="text-gray-500 text-xs">
                © 2025 TrendSoccer. All rights reserved.
              </p>
              <p className="text-gray-600 text-[11px]">
                AI-powered soccer match prediction and analysis platform
              </p>
            </div>
          </div>
        </div>

      </div>
    </footer>
  )
}
