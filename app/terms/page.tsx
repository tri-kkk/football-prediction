'use client'

import { useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

// 버전 히스토리
const VERSIONS = [
  { id: 'v2.0', date: '2026-02-06', label_ko: '2026년 2월 6일 (현재)', label_en: 'February 6, 2026 (Current)' },
  { id: 'v1.1', date: '2025-01-14', label_ko: '2025년 1월 14일', label_en: 'January 14, 2025' },
  { id: 'v1.0', date: '2025-11-06', label_ko: '2025년 11월 6일', label_en: 'November 6, 2025' },
]

export default function TermsPage() {
  const { language } = useLanguage()
  const isKo = language === 'ko'
  const [selectedVersion, setSelectedVersion] = useState('v2.0')

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {isKo ? '이용약관' : 'Terms of Service'}
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
            <TermsV2_0 isKo={isKo} />
          ) : selectedVersion === 'v1.1' ? (
            <TermsV1_1 isKo={isKo} />
          ) : (
            <TermsV1_0 isKo={isKo} />
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

// v2.0 - 2026년 2월 6일 (이용권 모델 전환, PG사 추가)
function TermsV2_0({ isKo }: { isKo: boolean }) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
      
      {/* 1. 약관 동의 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '1. 약관 동의' : '1. Agreement to Terms'}
        </h2>
        <p className="text-gray-300 leading-relaxed">
          {isKo 
            ? 'TrendSoccer(이하 "서비스")를 이용함으로써 본 이용약관에 동의하게 됩니다. 약관의 일부 또는 전부에 동의하지 않는 경우 서비스를 이용할 수 없습니다.'
            : 'By using TrendSoccer (the "Service"), you agree to these Terms of Service. If you do not agree to any part of these terms, you may not use our services.'}
        </p>
      </section>

      {/* 2. 회원가입 및 계정 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '2. 회원가입 및 계정' : '2. Registration and Account'}
        </h2>
        
        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '2.1 회원가입' : '2.1 Registration'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
          <li>{isKo ? '회원가입은 Google 또는 Naver 소셜 로그인을 통해 진행됩니다' : 'Registration is done through Google or Naver social login'}</li>
          <li>{isKo ? '회원가입 시 이용약관 및 개인정보처리방침에 동의해야 합니다' : 'You must agree to the Terms of Service and Privacy Policy when registering'}</li>
          <li>{isKo ? '허위 정보로 가입 시 서비스 이용이 제한될 수 있습니다' : 'Service may be restricted if you register with false information'}</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '2.2 계정 관리' : '2.2 Account Management'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '계정 정보의 보안 유지는 회원의 책임입니다' : 'You are responsible for maintaining the security of your account'}</li>
          <li>{isKo ? '계정의 무단 사용이 발견되면 즉시 알려주시기 바랍니다' : 'Please notify us immediately if you discover unauthorized use of your account'}</li>
          <li>{isKo ? '하나의 계정을 여러 명이 공유하는 것은 금지됩니다' : 'Sharing one account with multiple people is prohibited'}</li>
        </ul>
      </section>

      {/* 3. 회원 등급 및 서비스 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '3. 회원 등급 및 서비스' : '3. Membership Tiers and Services'}
        </h2>
        
        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '3.1 회원 등급' : '3.1 Membership Tiers'}
        </h3>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '서비스는 다음과 같은 회원 등급으로 운영됩니다:'
            : 'The service operates with the following membership tiers:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
          <li><strong>{isKo ? '비회원:' : 'Guest:'}</strong> {isKo ? '경기 1시간 전 예측 열람 (제한적)' : 'View predictions 1 hour before match (limited)'}</li>
          <li><strong>{isKo ? '무료회원:' : 'Free Member:'}</strong> {isKo ? '경기 3시간 전 예측 열람' : 'View predictions 3 hours before match'}</li>
          <li><strong>{isKo ? '프리미엄:' : 'Premium:'}</strong> {isKo ? '이용권 구매를 통해 프리미엄 혜택 이용' : 'Access premium benefits through access pass purchase'}</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '3.2 프리미엄 혜택' : '3.2 Premium Benefits'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '트렌드사커 픽: 엄선된 고확률 경기 추천' : 'TrendSoccer Picks: curated high-probability match recommendations'}</li>
          <li>{isKo ? '경기 24시간 전 예측 선공개' : '24-hour early access to predictions'}</li>
          <li>{isKo ? '광고 완전 제거' : 'Complete ad-free experience'}</li>
          <li>{isKo ? '하이라이트 무제한 시청' : 'Unlimited highlights viewing'}</li>
          <li>{isKo ? '프로토 계산기 무제한 저장' : 'Unlimited Proto calculator saves'}</li>
        </ul>
      </section>

      {/* 4. 이용권 구매 및 결제 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '4. 이용권 구매 및 결제' : '4. Access Pass Purchase and Payment'}
        </h2>
        
        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '4.1 이용권 종류' : '4.1 Access Pass Types'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
          <li><strong>{isKo ? '1개월권:' : '1-Month Pass:'}</strong> {isKo ? '구매일로부터 30일간 프리미엄 혜택 이용' : 'Premium benefits for 30 days from purchase date'}</li>
          <li><strong>{isKo ? '3개월권:' : '3-Month Pass:'}</strong> {isKo ? '구매일로부터 90일간 프리미엄 혜택 이용' : 'Premium benefits for 90 days from purchase date'}</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '4.2 이용권 적용' : '4.2 Pass Activation'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
          <li>{isKo ? '이용권은 결제 완료 즉시 적용됩니다' : 'Access passes are activated immediately upon payment completion'}</li>
          <li>{isKo ? '이용권은 정기결제(자동갱신)가 아닌 일회성 구매입니다' : 'Access passes are one-time purchases, not recurring subscriptions'}</li>
          <li>{isKo ? '이용 기간 만료 후 자동으로 무료회원으로 전환됩니다' : 'After the pass expires, your account automatically reverts to free membership'}</li>
          <li>{isKo ? '이용권을 연장하려면 새로운 이용권을 구매해야 합니다' : 'To extend access, you must purchase a new access pass'}</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '4.3 요금 안내' : '4.3 Pricing'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
          <li>{isKo ? '이용권 요금은 서비스 내 가격표에 명시됩니다' : 'Access pass prices are listed on the service pricing page'}</li>
          <li>{isKo ? '요금은 사전 공지 후 변경될 수 있습니다' : 'Prices may change with prior notice'}</li>
          <li>{isKo ? '모든 요금은 부가가치세(VAT)가 포함된 금액입니다' : 'All prices include VAT'}</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '4.4 결제 방법' : '4.4 Payment Methods'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '결제는 SeedPay 결제대행 서비스를 통해 안전하게 처리됩니다' : 'Payments are securely processed through SeedPay payment gateway'}</li>
          <li>{isKo ? '신용카드, 체크카드 결제를 지원합니다' : 'Credit card and debit card payments are supported'}</li>
          <li>{isKo ? '결제 정보는 PG사에서 안전하게 관리되며, 회사가 카드번호 등 민감 정보를 직접 저장하지 않습니다' : 'Payment information is securely managed by the PG, and the Company does not directly store sensitive information such as card numbers'}</li>
        </ul>
      </section>

      {/* 5. 환불 정책 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '5. 환불 정책' : '5. Refund Policy'}
        </h2>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
          <li>{isKo ? '이용권은 구매 즉시 효력이 발생하는 디지털 서비스입니다' : 'Access passes are digital services that take effect immediately upon purchase'}</li>
          <li>{isKo ? '결제 후 서비스를 이용하지 않은 경우, 구매일로부터 7일 이내에 환불을 요청할 수 있습니다' : 'If you have not used the service, you may request a refund within 7 days of purchase'}</li>
          <li>{isKo ? '서비스 이용 이력이 있는 경우 환불이 제한될 수 있습니다' : 'Refunds may be limited if you have a service usage history'}</li>
          <li>{isKo ? '환불은 고객센터 이메일을 통해 요청할 수 있습니다' : 'Refund requests can be made through customer service email'}</li>
        </ul>
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-gray-300">
            <strong className="text-blue-400">{isKo ? '참고:' : 'Note:'}</strong>{' '}
            {isKo 
              ? '전자상거래법에 따라 디지털 콘텐츠의 환불 규정이 적용됩니다.'
              : 'Refund regulations for digital content apply in accordance with the E-commerce Act.'}
          </p>
        </div>
      </section>

      {/* 6. 프로모션 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '6. 프로모션' : '6. Promotions'}
        </h2>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '프로모션 혜택은 공지된 기간 및 조건 내에서만 유효합니다' : 'Promotional benefits are valid only within the announced period and conditions'}</li>
          <li>{isKo ? '프로모션은 1인 1회만 적용되며, 중복 적용되지 않습니다' : 'Promotions apply once per person and cannot be combined'}</li>
          <li>{isKo ? '프로모션 악용 시 혜택이 취소되고 서비스 이용이 제한될 수 있습니다' : 'Misuse of promotions may result in benefit cancellation and service restriction'}</li>
          <li>{isKo ? '프로모션 조건은 사전 공지 없이 변경되거나 종료될 수 있습니다' : 'Promotion terms may change or end without prior notice'}</li>
        </ul>
      </section>

      {/* 7. 서비스 이용 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '7. 서비스 이용' : '7. Use of Service'}
        </h2>
        
        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '7.1 허용되는 사용' : '7.1 Permitted Use'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
          <li>{isKo ? '축구 경기 예측 및 분석 정보 열람' : 'Viewing football match predictions and analysis'}</li>
          <li>{isKo ? '실시간 경기 데이터 및 통계 확인' : 'Accessing real-time match data and statistics'}</li>
          <li>{isKo ? '개인적, 비상업적 목적의 사용' : 'Personal, non-commercial use'}</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3 text-blue-400">
          {isKo ? '7.2 금지되는 사용' : '7.2 Prohibited Use'}
        </h3>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '불법적인 목적으로 서비스 사용' : 'Using the service for illegal purposes'}</li>
          <li>{isKo ? '서비스에 대한 무단 접근 시도' : 'Attempting unauthorized access to the service'}</li>
          <li>{isKo ? '서비스 방해 또는 중단 행위' : 'Interfering with or disrupting the service'}</li>
          <li>{isKo ? '자동화 도구(봇, 크롤러 등)를 이용한 접근' : 'Accessing through automated tools (bots, crawlers, etc.)'}</li>
          <li>{isKo ? '서비스 콘텐츠의 상업적 재판매' : 'Commercial resale of service content'}</li>
          <li>{isKo ? '계정 공유 또는 양도' : 'Sharing or transferring accounts'}</li>
        </ul>
      </section>

      {/* 8. 콘텐츠 및 정확성 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '8. 콘텐츠 및 정확성' : '8. Content and Accuracy'}
        </h2>
        <p className="text-gray-300 leading-relaxed mb-3">
          {isKo 
            ? 'TrendSoccer에서 제공하는 정보는 참고용으로만 제공됩니다. 저희는 정확한 정보 제공을 위해 노력하지만, 다음 사항에 대해 보증하지 않습니다:'
            : 'Information provided by TrendSoccer is for reference purposes only. While we strive to provide accurate information, we do not guarantee:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mb-4">
          <li>{isKo ? '예측의 정확성, 완전성, 신뢰성' : 'Accuracy, completeness, or reliability of predictions'}</li>
          <li>{isKo ? '서비스의 지속적인 가용성' : 'Continuous availability of the service'}</li>
          <li>{isKo ? '오류 또는 버그의 부재' : 'Absence of errors or bugs'}</li>
        </ul>
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-gray-300">
            <strong className="text-blue-400">{isKo ? '중요:' : 'Important:'}</strong>{' '}
            {isKo 
              ? '본 서비스의 예측은 통계 분석을 기반으로 하며, 베팅이나 재정적 결정의 유일한 근거로 사용되어서는 안 됩니다. 예측을 바탕으로 발생한 손실에 대해 책임지지 않습니다.'
              : 'Our predictions are based on statistical analysis and should not be used as the sole basis for betting or financial decisions. We are not responsible for any losses incurred based on our predictions.'}
          </p>
        </div>
      </section>

      {/* 9. 도박 및 베팅 관련 면책 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '9. 도박 및 베팅 관련 면책' : '9. Gambling and Betting Disclaimer'}
        </h2>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
          <p className="text-gray-300 mb-4">
            <strong className="text-red-400">{isKo ? '중요한 고지사항:' : 'Important Notice:'}</strong>
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
            <li>{isKo ? '제공되는 예측은 오직 정보 제공 목적입니다' : 'Predictions provided are for informational purposes only'}</li>
            <li>{isKo ? '베팅 거래를 수락하거나 처리하지 않습니다' : 'We do not accept or process betting transactions'}</li>
            <li>{isKo ? '귀하의 지역 도박 관련 법률을 준수할 책임은 사용자에게 있습니다' : 'You are responsible for complying with local gambling laws in your jurisdiction'}</li>
            <li>{isKo ? '도박은 중독성이 있을 수 있으니 신중하게 이용하시기 바랍니다' : 'Gambling can be addictive - please gamble responsibly'}</li>
          </ul>
        </div>
      </section>

      {/* 10. 책임의 제한 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '10. 책임의 제한' : '10. Limitation of Liability'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '법률이 허용하는 최대 범위 내에서, TrendSoccer는 다음과 같은 손해에 대해 책임을 지지 않습니다:'
            : 'To the maximum extent permitted by law, TrendSoccer shall not be liable for:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '이익 또는 수익의 손실' : 'Loss of profits or revenue'}</li>
          <li>{isKo ? '데이터 손실' : 'Loss of data'}</li>
          <li>{isKo ? '사업 기회의 손실' : 'Loss of business opportunities'}</li>
          <li>{isKo ? '간접적, 부수적, 특별, 결과적 손해' : 'Indirect, incidental, special, or consequential damages'}</li>
          <li>{isKo ? '예측을 기반으로 한 베팅 또는 투자 손실' : 'Betting or investment losses based on predictions'}</li>
        </ul>
      </section>

      {/* 11. 서비스 중단 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '11. 서비스 중단' : '11. Service Suspension'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '다음의 경우 서비스가 일시적 또는 영구적으로 중단될 수 있습니다:'
            : 'The service may be temporarily or permanently suspended in the following cases:'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '시스템 유지보수 또는 업데이트' : 'System maintenance or updates'}</li>
          <li>{isKo ? '천재지변 또는 불가항력적 상황' : 'Force majeure or unforeseeable circumstances'}</li>
          <li>{isKo ? '외부 API 서비스 장애' : 'External API service disruption'}</li>
          <li>{isKo ? '약관 위반으로 인한 계정 정지' : 'Account suspension due to terms violation'}</li>
        </ul>
      </section>

      {/* 12. 준거법 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '12. 준거법' : '12. Governing Law'}
        </h2>
        <p className="text-gray-300">
          {isKo 
            ? '본 약관은 대한민국 법률에 따라 규율되고 해석됩니다.'
            : 'These terms shall be governed by and construed in accordance with the laws of the Republic of Korea.'}
        </p>
      </section>

      {/* 13. 약관의 변경 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '13. 약관의 변경' : '13. Changes to Terms'}
        </h2>
        <p className="text-gray-300">
          {isKo 
            ? '당사는 언제든지 본 약관을 수정하거나 변경할 수 있습니다. 중요한 변경사항이 있을 경우 본 페이지에 새로운 약관을 게시하고 "최종 수정일"을 업데이트하여 공지합니다. 서비스 내 공지를 통해 별도로 안내할 수도 있습니다.'
            : 'We reserve the right to modify or replace these terms at any time. If we make material changes, we will notify you by posting the new terms on this page and updating the "Last Updated" date. We may also provide in-service notifications.'}
        </p>
      </section>

      {/* 14. 문의 */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '14. 문의' : '14. Contact Us'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '본 이용약관에 대한 질문이 있으시면 다음으로 연락 주시기 바랍니다:'
            : 'If you have any questions about these Terms of Service, please contact us:'}
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

      {/* 약관 동의 */}
      <section className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '약관 동의' : 'Agreement'}
        </h2>
        <p className="text-gray-300">
          {isKo 
            ? 'TrendSoccer를 이용함으로써 귀하는 본 이용약관을 읽고 이해했으며, 이에 구속되는 것에 동의함을 확인합니다.'
            : 'By using TrendSoccer, you acknowledge that you have read and understood these Terms of Service and agree to be bound by them.'}
        </p>
      </section>

    </div>
  )
}

// v1.1 - 2025년 1월 14일 (유료화 업데이트 - 구독 모델)
function TermsV1_1({ isKo }: { isKo: boolean }) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
      
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <p className="text-yellow-400 text-sm">
          {isKo 
            ? '⚠️ 이 버전은 더 이상 유효하지 않습니다. 현재 적용되는 이용약관은 최신 버전(v2.0)을 확인해 주세요.'
            : '⚠️ This version is no longer valid. Please check the latest version (v2.0) for the currently applicable terms.'}
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '1. 약관 동의' : '1. Agreement to Terms'}
        </h2>
        <p className="text-gray-300 leading-relaxed">
          {isKo 
            ? 'TrendSoccer(이하 "서비스") 이용함으로써 본 이용약관에 동의하게 됩니다.'
            : 'By using TrendSoccer (the "Service"), you agree to these Terms of Service.'}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '3. 프리미엄 혜택 (v1.1 기준)' : '3. Premium Benefits (v1.1)'}
        </h2>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '경기 24시간 전 예측 선공개' : '24-hour early access to predictions'}</li>
          <li>{isKo ? '승률 높은 경기 추천 (프리미엄 픽)' : 'High win-rate match recommendations (Premium Picks)'}</li>
          <li>{isKo ? '광고 제거' : 'Ad-free experience'}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '4. 구독 및 결제 (v1.1 기준)' : '4. Subscription and Payment (v1.1)'}
        </h2>
        <p className="text-gray-300 mb-3">
          {isKo 
            ? '이 버전에서는 정기구독(자동갱신) 방식으로 운영되었습니다. 현재는 이용권(1개월권/3개월권) 방식으로 변경되었습니다.'
            : 'This version operated on a recurring subscription (auto-renewal) basis. The current model has been changed to access passes (1-month/3-month).'}
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '구독은 해지하지 않는 한 자동으로 갱신됩니다 (현재 폐지)' : 'Subscriptions auto-renewed unless cancelled (now discontinued)'}</li>
          <li>{isKo ? '구독 해지는 계정 설정에서 가능 (현재 폐지)' : 'Subscription cancellation was available in account settings (now discontinued)'}</li>
        </ul>
      </section>

      <section className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
        <p className="text-gray-300">
          {isKo 
            ? '최신 약관(v2.0)을 확인해 주세요.'
            : 'Please refer to the latest terms (v2.0).'}
        </p>
      </section>
    </div>
  )
}

// v1.0 - 2025년 11월 6일 (초기 버전)
function TermsV1_0({ isKo }: { isKo: boolean }) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
      
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
        <p className="text-yellow-400 text-sm">
          {isKo 
            ? '⚠️ 이 버전은 더 이상 유효하지 않습니다. 현재 적용되는 이용약관은 최신 버전을 확인해 주세요.'
            : '⚠️ This version is no longer valid. Please check the latest version for the currently applicable terms.'}
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '1. 약관 동의' : '1. Agreement to Terms'}
        </h2>
        <p className="text-gray-300 leading-relaxed">
          {isKo 
            ? 'Trend Soccer 서비스를 이용함으로써 본 이용약관에 동의하게 됩니다.'
            : 'By using Trend Soccer services, you agree to these Terms of Service.'}
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '2. 서비스 이용' : '2. Use of Service'}
        </h2>
        <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
          <li>{isKo ? '축구 경기 예측 및 분석 정보 열람' : 'Viewing football match predictions and analysis'}</li>
          <li>{isKo ? '실시간 경기 데이터 및 통계 확인' : 'Accessing real-time match data and statistics'}</li>
          <li>{isKo ? '개인적, 비상업적 목적의 사용' : 'Personal, non-commercial use'}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-white">
          {isKo ? '3. 준거법' : '3. Governing Law'}
        </h2>
        <p className="text-gray-300">
          {isKo 
            ? '본 약관은 대한민국 법률에 따라 규율되고 해석됩니다.'
            : 'These terms shall be governed by and construed in accordance with the laws of the Republic of Korea.'}
        </p>
      </section>

      <section className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
        <p className="text-gray-300">
          {isKo 
            ? 'Trend Soccer를 이용함으로써 귀하는 본 이용약관에 동의함을 확인합니다.'
            : 'By using Trend Soccer, you agree to be bound by these terms.'}
        </p>
      </section>
    </div>
  )
}