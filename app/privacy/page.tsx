'use client'

import { useLanguage } from '../contexts/LanguageContext'

export default function PrivacyPage() {
  const { language } = useLanguage()
  const isKo = language === 'ko'

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {isKo ? '개인정보 처리방침' : 'Privacy Policy'}
          </h1>
          <p className="text-gray-400">
            {isKo ? '최종 수정일: 2025년 11월 6일' : 'Last Updated: November 6, 2025'}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none">
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
            
            {/* 1. 개요 */}
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

            {/* 2. 수집하는 정보 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                {isKo ? '2. 수집하는 정보' : '2. Information We Collect'}
              </h2>
              
              <h3 className="text-xl font-semibold mb-3 text-blue-400">
                {isKo ? '2.1 자동으로 수집되는 정보' : '2.1 Automatically Collected Information'}
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
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6 text-blue-400">
                {isKo ? '2.2 직접 제공하는 정보' : '2.2 Information You Provide'}
              </h3>
              <p className="text-gray-300 mb-3">
                {isKo 
                  ? '다음과 같은 경우 자발적으로 정보를 제공할 수 있습니다:'
                  : 'You may voluntarily provide information in the following cases:'}
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>{isKo ? '문의 양식 작성 시' : 'When filling out contact forms'}</li>
                <li>{isKo ? '뉴스레터 구독 시' : 'When subscribing to newsletters'}</li>
                <li>{isKo ? '설문조사 참여 시' : 'When participating in surveys'}</li>
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
                <li>{isKo ? '웹사이트 제공, 운영 및 유지' : 'Providing, operating, and maintaining our website'}</li>
                <li>{isKo ? '서비스 개선 및 개인화' : 'Improving and personalizing our services'}</li>
                <li>{isKo ? '사용자 행동 분석 및 이해' : 'Analyzing and understanding user behavior'}</li>
                <li>{isKo ? '고객 지원 및 문의 응답' : 'Customer support and responding to inquiries'}</li>
                <li>{isKo ? '보안 및 사기 방지' : 'Security and fraud prevention'}</li>
              </ul>
            </section>

            {/* 4. 쿠키 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                {isKo ? '4. 쿠키 및 추적 기술' : '4. Cookies and Tracking Technologies'}
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
                  {isKo ? '웹사이트 기능에 필요' : 'Required for website functionality'}
                </li>
                <li>
                  <strong>{isKo ? '분석 쿠키:' : 'Analytics Cookies:'}</strong>{' '}
                  {isKo ? '방문자의 웹사이트 이용 방식 이해' : 'Understanding how visitors use the website'}
                </li>
                <li>
                  <strong>{isKo ? '기능 쿠키:' : 'Functional Cookies:'}</strong>{' '}
                  {isKo ? '설정 및 환경 설정 기억' : 'Remembering settings and preferences'}
                </li>
              </ul>
              <p className="text-gray-300 mt-3 text-sm">
                {isKo 
                  ? '브라우저 설정에서 모든 쿠키를 거부하거나 쿠키 전송 시 알림을 받도록 설정할 수 있습니다.'
                  : 'You can set your browser to refuse all cookies or to notify you when a cookie is being sent.'}
              </p>
            </section>

            {/* 5. 제3자 서비스 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                {isKo ? '5. 제3자 서비스' : '5. Third-Party Services'}
              </h2>
              <p className="text-gray-300 mb-3">
                {isKo 
                  ? '저희는 데이터를 수집하고 분석하는 제3자 서비스를 사용할 수 있습니다:'
                  : 'We may use third-party services that collect and analyze data:'}
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>
                  <strong>Google Analytics:</strong>{' '}
                  {isKo ? '웹사이트 트래픽 및 사용자 행동 분석' : 'Website traffic and user behavior analysis'}
                </li>
                <li>
                  <strong>Google AdSense:</strong>{' '}
                  {isKo ? '광고 표시' : 'Displaying advertisements'}
                </li>
              </ul>
              <p className="text-gray-300 mt-3">
                {isKo 
                  ? '이러한 제3자는 자체 개인정보 보호정책을 가지고 있으며, 해당 정보 사용 방법에 대해 설명합니다.'
                  : 'These third parties have their own privacy policies that explain how they use information.'}
              </p>
            </section>

            {/* 6. 데이터 보안 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                {isKo ? '6. 데이터 보안' : '6. Data Security'}
              </h2>
              <p className="text-gray-300">
                {isKo 
                  ? '저희는 귀하의 개인정보를 보호하기 위해 적절한 기술적 및 조직적 보안 조치를 시행합니다. 그러나 인터넷을 통한 전송 방법이나 전자 저장 방법이 100% 안전하다고 보장할 수 없습니다.'
                  : 'We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure.'}
              </p>
            </section>

            {/* 7. 귀하의 권리 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                {isKo ? '7. 귀하의 권리' : '7. Your Rights'}
              </h2>
              <p className="text-gray-300 mb-3">
                {isKo ? '귀하는 다음과 같은 권리를 가집니다:' : 'You have the following rights:'}
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>{isKo ? '저희가 보유한 개인정보에 대한 열람' : 'Access to personal information we hold about you'}</li>
                <li>{isKo ? '부정확한 정보의 정정 요청' : 'Request correction of inaccurate information'}</li>
                <li>{isKo ? '개인정보 삭제 요청' : 'Request deletion of personal information'}</li>
                <li>{isKo ? '개인정보 처리에 대한 이의 제기' : 'Object to processing of personal information'}</li>
                <li>{isKo ? '개인정보 처리 제한 요청' : 'Request restriction of processing'}</li>
                <li>{isKo ? '언제든지 동의 철회' : 'Withdraw consent at any time'}</li>
              </ul>
            </section>

            {/* 8. 개인정보 처리방침 변경 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                {isKo ? '8. 개인정보 처리방침의 변경' : '8. Changes to This Privacy Policy'}
              </h2>
              <p className="text-gray-300">
                {isKo 
                  ? '저희는 수시로 개인정보 처리방침을 업데이트할 수 있습니다. 변경 사항이 있을 경우 본 페이지에 새로운 개인정보 처리방침을 게시하고 "최종 수정일"을 업데이트하여 알려드립니다.'
                  : 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.'}
              </p>
            </section>

            {/* 9. 연락처 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                {isKo ? '9. 문의' : '9. Contact Us'}
              </h2>
              <p className="text-gray-300 mb-3">
                {isKo 
                  ? '본 개인정보 처리방침에 대한 질문이 있으시면 다음으로 연락 주시기 바랍니다:'
                  : 'If you have any questions about this Privacy Policy, please contact us:'}
              </p>
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
        </div>
      </div>
    </div>
  )
}