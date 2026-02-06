'use client'

import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

// 버전 히스토리
const VERSIONS = [
  { id: 'v2.0', date: '2026-02-06', label_ko: '2026년 2월 6일 (현재)', label_en: 'February 6, 2026 (Current)' },
  { id: 'v1.1', date: '2025-01-14', label_ko: '2025년 1월 14일', label_en: 'January 14, 2025' },
  { id: 'v1.0', date: '2025-11-06', label_ko: '2025년 11월 6일', label_en: 'November 6, 2025' },
]

export default function PrivacyPage() {
  const { language } = useLanguage()
  const isKo = language === 'ko'
  const [selectedVersion, setSelectedVersion] = useState('v2.0')

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {isKo ? '개인정보 처리방침' : 'Privacy Policy'}
          </h1>
          
          {/* 버전 선택 */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <label className="text-gray-400 text-sm">
              {isKo ? '버전:' : 'Version:'}
            </label>
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {VERSIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {isKo ? v.label_ko : v.label_en}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none">
          {selectedVersion === 'v2.0' ? (
            <PrivacyV2_0 isKo={isKo} />
          ) : selectedVersion === 'v1.1' ? (
            <PrivacyV1_1 isKo={isKo} />
          ) : (
            <PrivacyV1_0 isKo={isKo} />
          )}
        </div>

        {/* 홈으로 */}
        <div className="text-center mt-8">
          <a href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← {isKo ? '홈으로' : 'Back to Home'}
          </a>
        </div>
      </div>
    </div>
  )
}

// v2.0 - 2026년 2월 6일 (이용권 모델 전환, SeedPay PG 추가)
function PrivacyV2_0({ isKo }: { isKo: boolean }) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
      
      {/* 1. 개요 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '1. 개요' : '1. Overview'}
        </h2>
        <p className="text-gray-300 leading-relaxed">
          {isKo 
            ? 'TrendSoccer(이하 "회사")는 귀하의 개인정보 보호를 중요하게 생각합니다. 본 개인정보 처리방침은 귀하가 저희 웹사이트(trendsoccer.com)를 이용할 때 개인정보를 수집, 사용, 공개 및 보호하는 방법을 설명합니다.'
            : 'TrendSoccer ("Company") values your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our website (trendsoccer.com).'}
        </p>
      </section>

      {/* 2. 수집하는 정보 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '2. 수집하는 정보' : '2. Information We Collect'}
        </h2>
        
        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '2.1 회원가입 시 수집 정보' : '2.1 Information Collected During Registration'}
        </h3>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '소셜 로그인(Google, Naver)을 통해 회원가입 시 다음 정보가 수집됩니다:'
            : 'When you sign up through social login (Google, Naver), the following information is collected:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '이메일 주소' : 'Email address'}</li>
          <li>{isKo ? '이름 (닉네임)' : 'Name (nickname)'}</li>
          <li>{isKo ? '프로필 이미지 (선택)' : 'Profile image (optional)'}</li>
          <li>{isKo ? '소셜 계정 고유 ID' : 'Social account unique ID'}</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3 mt-6 text-blue-400">
          {isKo ? '2.2 이용권 결제 시 수집 정보' : '2.2 Information Collected During Access Pass Payment'}
        </h3>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '프리미엄 이용권 결제 시 다음 정보가 수집됩니다:'
            : 'When purchasing a premium access pass, the following information is collected:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '결제 수단 정보 (카드사명, 카드 종류)' : 'Payment method information (card issuer, card type)'}</li>
          <li>{isKo ? '결제 승인번호' : 'Payment approval number'}</li>
          <li>{isKo ? '결제 금액 및 결제일시' : 'Payment amount and date/time'}</li>
          <li>{isKo ? '이용권 시작일 및 만료일' : 'Access pass start and expiration date'}</li>
          <li>{isKo ? '주문번호 (거래 식별용)' : 'Order number (for transaction identification)'}</li>
        </ul>
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 mt-3">
          <p className="text-gray-300">
            <strong className="text-emerald-400">{isKo ? '안전한 결제 처리:' : 'Secure Payment Processing:'}</strong>{' '}
            {isKo 
              ? '결제는 SeedPay 결제대행 서비스를 통해 처리됩니다. 신용카드 번호, CVC, 비밀번호 등 민감한 결제 정보는 회사가 직접 저장하지 않으며, PG사(결제대행사)에서 안전하게 관리합니다.'
              : 'Payments are processed through SeedPay payment gateway. Sensitive payment information such as credit card numbers, CVC, and passwords are not stored directly by the Company and are securely managed by the payment gateway.'}
          </p>
        </div>

        <h3 className="text-xl font-semibold mb-3 mt-6 text-blue-400">
          {isKo ? '2.3 자동으로 수집되는 정보' : '2.3 Automatically Collected Information'}
        </h3>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '웹사이트 방문 시 다음 정보가 자동으로 수집됩니다:'
            : 'The following information is automatically collected when you visit our website:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '브라우저 종류 및 버전' : 'Browser type and version'}</li>
          <li>{isKo ? 'IP 주소' : 'IP address'}</li>
          <li>{isKo ? '방문 페이지 및 체류 시간' : 'Pages visited and time spent'}</li>
          <li>{isKo ? '운영 체제 정보' : 'Operating system information'}</li>
          <li>{isKo ? '기기 정보 (모바일/데스크톱)' : 'Device information (mobile/desktop)'}</li>
        </ul>
      </section>

      {/* 3. 정보 사용 목적 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '3. 정보 사용 목적' : '3. How We Use Your Information'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '수집된 정보는 다음 목적으로 사용됩니다:'
            : 'The collected information is used for the following purposes:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '회원 식별 및 서비스 제공' : 'Member identification and service provision'}</li>
          <li>{isKo ? '프리미엄 이용권 관리 및 결제 처리' : 'Premium access pass management and payment processing'}</li>
          <li>{isKo ? '이용권 만료 안내 및 서비스 관련 공지사항 전달' : 'Access pass expiration notifications and service-related announcements'}</li>
          <li>{isKo ? '서비스 개선 및 개인화' : 'Improving and personalizing our services'}</li>
          <li>{isKo ? '사용자 행동 분석 및 이해' : 'Analyzing and understanding user behavior'}</li>
          <li>{isKo ? '고객 지원 및 문의 응답' : 'Customer support and responding to inquiries'}</li>
          <li>{isKo ? '보안 및 사기 방지' : 'Security and fraud prevention'}</li>
        </ul>
      </section>

      {/* 4. 개인정보 보관 기간 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '4. 개인정보 보관 기간' : '4. Data Retention Period'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '회원의 개인정보는 다음 기간 동안 보관됩니다:'
            : 'Member personal information is retained for the following periods:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>
            <strong>{isKo ? '회원 정보:' : 'Member information:'}</strong>{' '}
            {isKo ? '회원 탈퇴 시까지 (탈퇴 후 30일 이내 삭제)' : 'Until membership withdrawal (deleted within 30 days after withdrawal)'}
          </li>
          <li>
            <strong>{isKo ? '결제 정보:' : 'Payment information:'}</strong>{' '}
            {isKo ? '전자상거래법에 따라 5년간 보관' : 'Retained for 5 years in accordance with e-commerce law'}
          </li>
          <li>
            <strong>{isKo ? '접속 기록:' : 'Access logs:'}</strong>{' '}
            {isKo ? '통신비밀보호법에 따라 3개월간 보관' : 'Retained for 3 months in accordance with communication privacy law'}
          </li>
        </ul>
      </section>

      {/* 5. 쿠키 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '5. 쿠키 및 추적 기술' : '5. Cookies and Tracking Technologies'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '저희는 쿠키 및 유사한 추적 기술을 사용하여 웹사이트 활동을 추적하고 특정 정보를 저장합니다.'
            : 'We use cookies and similar tracking technologies to track website activity and store certain information.'}
        </p>
        
        <h3 className="text-xl font-semibold mb-3 mt-4 text-blue-400">
          {isKo ? '사용하는 쿠키 유형:' : 'Types of Cookies We Use:'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>
            <strong>{isKo ? '필수 쿠키:' : 'Essential Cookies:'}</strong>{' '}
            {isKo ? '로그인 상태 유지, 웹사이트 기능에 필요' : 'Login session, required for website functionality'}
          </li>
          <li>
            <strong>{isKo ? '분석 쿠키:' : 'Analytics Cookies:'}</strong>{' '}
            {isKo ? '방문자의 웹사이트 이용 방식 이해' : 'Understanding how visitors use the website'}
          </li>
          <li>
            <strong>{isKo ? '기능 쿠키:' : 'Functional Cookies:'}</strong>{' '}
            {isKo ? '언어 설정 등 환경 설정 기억' : 'Remembering settings like language preferences'}
          </li>
        </ul>
        <p className="text-gray-300 mt-3 text-sm">
          {isKo 
            ? '브라우저 설정에서 모든 쿠키를 거부하거나 쿠키 전송 시 알림을 받도록 설정할 수 있습니다.'
            : 'You can set your browser to refuse all cookies or to notify you when a cookie is being sent.'}
        </p>
      </section>

      {/* 6. 제3자 서비스 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '6. 제3자 서비스' : '6. Third-Party Services'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '저희는 다음과 같은 제3자 서비스를 사용합니다:'
            : 'We use the following third-party services:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>
            <strong>Google OAuth:</strong>{' '}
            {isKo ? '소셜 로그인 인증' : 'Social login authentication'}
          </li>
          <li>
            <strong>Naver OAuth:</strong>{' '}
            {isKo ? '소셜 로그인 인증' : 'Social login authentication'}
          </li>
          <li>
            <strong>SeedPay:</strong>{' '}
            {isKo ? '이용권 결제 처리 (신용카드, 체크카드)' : 'Access pass payment processing (credit card, debit card)'}
          </li>
          <li>
            <strong>Google Analytics:</strong>{' '}
            {isKo ? '웹사이트 트래픽 및 사용자 행동 분석' : 'Website traffic and user behavior analysis'}
          </li>
          <li>
            <strong>Google AdSense:</strong>{' '}
            {isKo ? '광고 표시 (무료 회원 대상)' : 'Displaying advertisements (for free members)'}
          </li>
          <li>
            <strong>Supabase:</strong>{' '}
            {isKo ? '사용자 데이터 저장 및 인증 관리' : 'User data storage and authentication management'}
          </li>
        </ul>
        <p className="text-gray-300 mt-3">
          {isKo 
            ? '이러한 제3자는 자체 개인정보 보호정책을 가지고 있으며, 해당 정보 사용 방법에 대해 설명합니다.'
            : 'These third parties have their own privacy policies that explain how they use information.'}
        </p>
      </section>

      {/* 7. 결제 정보 처리 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '7. 결제 정보 처리' : '7. Payment Information Processing'}
        </h2>
        
        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '7.1 회사가 저장하는 정보' : '7.1 Information Stored by the Company'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
          <li>{isKo ? '주문번호 및 거래번호 (TID)' : 'Order number and transaction ID (TID)'}</li>
          <li>{isKo ? '결제 금액 및 결제 상태' : 'Payment amount and payment status'}</li>
          <li>{isKo ? '카드사명 (예: 삼성카드, 현대카드)' : 'Card issuer name (e.g., Samsung Card, Hyundai Card)'}</li>
          <li>{isKo ? '승인번호' : 'Approval number'}</li>
          <li>{isKo ? '결제 일시' : 'Payment date and time'}</li>
          <li>{isKo ? '구매한 이용권 종류 (1개월권/3개월권)' : 'Access pass type purchased (1-month/3-month)'}</li>
        </ul>
        
        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '7.2 회사가 저장하지 않는 정보' : '7.2 Information NOT Stored by the Company'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '신용카드/체크카드 전체 번호' : 'Full credit/debit card number'}</li>
          <li>{isKo ? 'CVC/CVV 보안 코드' : 'CVC/CVV security code'}</li>
          <li>{isKo ? '카드 비밀번호' : 'Card PIN/password'}</li>
          <li>{isKo ? '카드 유효기간' : 'Card expiration date'}</li>
        </ul>
        <p className="text-gray-400 text-sm mt-3">
          {isKo 
            ? '※ 위 민감 정보는 SeedPay PG사에서 PCI-DSS 보안 표준에 따라 안전하게 처리됩니다.'
            : '※ The above sensitive information is securely processed by SeedPay PG in accordance with PCI-DSS security standards.'}
        </p>
      </section>

      {/* 8. 데이터 보안 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '8. 데이터 보안' : '8. Data Security'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '저희는 귀하의 개인정보를 보호하기 위해 다음과 같은 보안 조치를 시행합니다:'
            : 'We implement the following security measures to protect your personal information:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? 'SSL/TLS 암호화를 통한 데이터 전송 보호' : 'Data transmission protection through SSL/TLS encryption'}</li>
          <li>{isKo ? '안전한 서버 환경 (Vercel, Supabase)' : 'Secure server environment (Vercel, Supabase)'}</li>
          <li>{isKo ? '접근 권한 관리 및 인증 시스템' : 'Access control and authentication systems'}</li>
          <li>{isKo ? 'PG사를 통한 결제 정보 분리 관리' : 'Separate payment information management through PG'}</li>
        </ul>
        <p className="text-gray-300 mt-3 text-sm">
          {isKo 
            ? '그러나 인터넷을 통한 전송 방법이나 전자 저장 방법이 100% 안전하다고 보장할 수 없습니다.'
            : 'However, no method of transmission over the Internet or electronic storage is 100% secure.'}
        </p>
      </section>

      {/* 9. 귀하의 권리 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '9. 귀하의 권리' : '9. Your Rights'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo ? '귀하는 다음과 같은 권리를 가집니다:' : 'You have the following rights:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '저희가 보유한 개인정보에 대한 열람' : 'Access to personal information we hold about you'}</li>
          <li>{isKo ? '부정확한 정보의 정정 요청' : 'Request correction of inaccurate information'}</li>
          <li>{isKo ? '개인정보 삭제 요청 (회원 탈퇴)' : 'Request deletion of personal information (membership withdrawal)'}</li>
          <li>{isKo ? '개인정보 처리에 대한 이의 제기' : 'Object to processing of personal information'}</li>
          <li>{isKo ? '결제 내역 확인 요청' : 'Request to view payment history'}</li>
          <li>{isKo ? '언제든지 동의 철회' : 'Withdraw consent at any time'}</li>
        </ul>
        <p className="text-gray-400 text-sm mt-3">
          {isKo 
            ? '※ 위 권리 행사를 원하시면 아래 연락처로 문의해 주세요.'
            : '※ To exercise these rights, please contact us using the information below.'}
        </p>
      </section>

      {/* 10. 개인정보 처리방침 변경 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '10. 개인정보 처리방침의 변경' : '10. Changes to This Privacy Policy'}
        </h2>
        <p className="text-gray-300">
          {isKo 
            ? '저희는 수시로 개인정보 처리방침을 업데이트할 수 있습니다. 변경 사항이 있을 경우 본 페이지에 새로운 개인정보 처리방침을 게시하고 "최종 수정일"을 업데이트하여 알려드립니다. 중요한 변경사항은 서비스 내 공지를 통해 안내드립니다.'
            : 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Significant changes will be announced through in-service notifications.'}
        </p>
      </section>

      {/* 11. 문의 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '11. 문의' : '11. Contact Us'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '본 개인정보 처리방침에 대한 질문이 있으시면 다음으로 연락 주시기 바랍니다:'
            : 'If you have any questions about this Privacy Policy, please contact us:'}
        </p>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-700">
          <p className="text-gray-300 mb-2">
            <strong>{isKo ? '서비스명:' : 'Service:'}</strong> TrendSoccer
          </p>
          <p className="text-gray-300 mb-2">
            <strong>{isKo ? '웹사이트:' : 'Website:'}</strong>{' '}
            <a href="https://trendsoccer.com" className="text-blue-400 hover:text-blue-300">
              https://trendsoccer.com
            </a>
          </p>
          <p className="text-gray-300">
            <strong>{isKo ? '이메일:' : 'Email:'}</strong>{' '}
            <a href="mailto:trikilab2025@gmail.com" className="text-blue-400 hover:text-blue-300">
              trikilab2025@gmail.com
            </a>
          </p>
        </div>
      </section>

    </div>
  )
}

// v1.1 - 2025년 1월 14일 (유료화 업데이트 - 구독 모델)
function PrivacyV1_1({ isKo }: { isKo: boolean }) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
      
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <p className="text-yellow-400 text-sm">
          {isKo 
            ? '⚠️ 이 버전은 더 이상 유효하지 않습니다. 현재 적용되는 개인정보 처리방침은 최신 버전(v2.0)을 확인해 주세요.'
            : '⚠️ This version is no longer valid. Please check the latest version (v2.0) for the currently applicable privacy policy.'}
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '1. 개요' : '1. Overview'}
        </h2>
        <p className="text-gray-300 leading-relaxed">
          {isKo 
            ? 'TrendSoccer(이하 "회사")는 귀하의 개인정보 보호를 중요하게 생각합니다. 본 개인정보 처리방침은 귀하가 저희 웹사이트(trendsoccer.com)를 이용할 때 개인정보를 수집, 사용, 공개 및 보호하는 방법을 설명합니다.'
            : 'TrendSoccer ("Company") values your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our website (trendsoccer.com).'}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '2. 수집하는 정보' : '2. Information We Collect'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '이 버전에서는 정기구독 모델 기준으로 결제 정보를 수집했습니다. PG사는 특정되지 않았습니다.'
            : 'This version collected payment information based on the recurring subscription model. The PG was not specified.'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '이메일, 이름, 프로필 이미지, 소셜 계정 ID' : 'Email, name, profile image, social account ID'}</li>
          <li>{isKo ? '결제 수단 정보 (PG사를 통해 처리)' : 'Payment method information (processed through PG)'}</li>
          <li>{isKo ? '구독 시작일 및 만료일' : 'Subscription start and expiration date'}</li>
          <li>{isKo ? '결제 내역' : 'Payment history'}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '6. 제3자 서비스 (v1.1 기준)' : '6. Third-Party Services (v1.1)'}
        </h2>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li><strong>Google/Naver OAuth</strong> - {isKo ? '소셜 로그인' : 'Social login'}</li>
          <li><strong>Google Analytics</strong> - {isKo ? '트래픽 분석' : 'Traffic analysis'}</li>
          <li><strong>Google AdSense</strong> - {isKo ? '광고 표시' : 'Ad display'}</li>
          <li><strong>{isKo ? '결제대행사 (PG):' : 'PG:'}</strong> {isKo ? '미특정' : 'Not specified'}</li>
        </ul>
      </section>

      <section className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
        <p className="text-gray-300">
          {isKo 
            ? '최신 개인정보 처리방침(v2.0)을 확인해 주세요.'
            : 'Please refer to the latest privacy policy (v2.0).'}
        </p>
      </section>
    </div>
  )
}

// v1.0 - 2025년 11월 6일 (초기 버전)
function PrivacyV1_0({ isKo }: { isKo: boolean }) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
      
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <p className="text-yellow-400 text-sm">
          {isKo 
            ? '⚠️ 이 버전은 더 이상 유효하지 않습니다. 현재 적용되는 개인정보 처리방침은 최신 버전을 확인해 주세요.'
            : '⚠️ This version is no longer valid. Please check the latest version for the currently applicable privacy policy.'}
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '1. 개요' : '1. Overview'}
        </h2>
        <p className="text-gray-300 leading-relaxed">
          {isKo 
            ? 'Trend Soccer는 귀하의 개인정보 보호를 중요하게 생각합니다. 본 개인정보 처리방침은 귀하가 저희 웹사이트를 방문할 때 개인정보를 수집, 사용, 공개 및 보호하는 방법을 설명합니다.'
            : 'Trend Soccer values your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you visit our website.'}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '2. 수집하는 정보' : '2. Information We Collect'}
        </h2>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '브라우저 종류 및 버전' : 'Browser type and version'}</li>
          <li>{isKo ? 'IP 주소' : 'IP address'}</li>
          <li>{isKo ? '방문 페이지 및 체류 시간' : 'Pages visited and time spent'}</li>
          <li>{isKo ? '운영 체제 정보' : 'Operating system information'}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '3. 준거법' : '3. Governing Law'}
        </h2>
        <p className="text-gray-300">
          {isKo 
            ? '본 방침은 대한민국 법률에 따라 규율됩니다.'
            : 'This policy is governed by the laws of the Republic of Korea.'}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '9. 문의' : '9. Contact Us'}
        </h2>
        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-700">
          <p className="text-gray-300">
            {isKo ? '이메일: ' : 'Email: '}
            <a href="mailto:trikilab2025@gmail.com" className="text-blue-400 hover:text-blue-300">
              trikilab2025@gmail.com
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}