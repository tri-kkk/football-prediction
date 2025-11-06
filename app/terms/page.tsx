import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이용약관 - Trend Soccer',
  description: 'Trend Soccer 서비스 이용약관',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">이용약관</h1>
          <p className="text-gray-400">
            최종 수정일: 2025년 11월 6일
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none">
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
            
            {/* 약관 동의 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">1. 약관 동의</h2>
              <p className="text-gray-300 leading-relaxed">
                Trend Soccer 서비스를 이용함으로써 본 이용약관에 동의하게 됩니다. 
                약관의 일부 또는 전부에 동의하지 않는 경우 서비스를 이용할 수 없습니다.
              </p>
            </section>

            {/* 서비스 이용 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">2. 서비스 이용</h2>
              
              <h3 className="text-xl font-semibold mb-3 text-blue-400">2.1 허용되는 사용</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>축구 경기 예측 및 분석 정보 열람</li>
                <li>실시간 경기 데이터 및 통계 확인</li>
                <li>개인적, 비상업적 목적의 사용</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3 mt-6 text-blue-400">2.2 금지되는 사용</h3>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>불법적인 목적으로 서비스 사용</li>
                <li>서비스에 대한 무단 접근 시도</li>
                <li>서비스 방해 또는 중단 행위</li>
                <li>자동화 도구(봇, 크롤러 등)를 이용한 접근</li>
                <li>서비스 콘텐츠의 상업적 재판매</li>
              </ul>
            </section>

            {/* 콘텐츠 및 정확성 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">3. 콘텐츠 및 정확성</h2>
              <p className="text-gray-300 mb-3">
                Trend Soccer에서 제공하는 정보는 참고용으로만 제공됩니다. 
                저희는 정확한 정보 제공을 위해 노력하지만, 다음 사항에 대해 보증하지 않습니다:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>예측의 정확성, 완전성, 신뢰성</li>
                <li>서비스의 지속적인 가용성</li>
                <li>오류 또는 버그의 부재</li>
              </ul>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mt-4">
                <p className="text-gray-300">
                  <strong className="text-blue-400">중요:</strong> 본 서비스의 예측은 통계 분석을 기반으로 하며, 
                  베팅이나 재정적 결정의 유일한 근거로 사용되어서는 안 됩니다. 
                  예측을 바탕으로 발생한 손실에 대해 책임지지 않습니다.
                </p>
              </div>
            </section>

            {/* 제3자 링크 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">4. 외부 링크</h2>
              <p className="text-gray-300">
                본 서비스는 당사가 소유하거나 통제하지 않는 제3자 웹사이트 링크를 포함할 수 있습니다. 
                제3자 웹사이트의 콘텐츠, 개인정보 보호정책 또는 관행에 대해 책임을 지지 않습니다.
              </p>
            </section>

            {/* 책임의 제한 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">5. 책임의 제한</h2>
              <p className="text-gray-300 mb-3">
                법률이 허용하는 최대 범위 내에서, Trend Soccer는 다음과 같은 손해에 대해 책임을 지지 않습니다:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>이익 또는 수익의 손실</li>
                <li>데이터 손실</li>
                <li>사업 기회의 손실</li>
                <li>간접적, 부수적, 특별, 결과적 손해</li>
              </ul>
            </section>

            {/* 도박 면책 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">6. 도박 및 베팅 관련 면책</h2>
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
                <p className="text-gray-300 mb-4">
                  <strong className="text-red-400">중요한 고지사항:</strong>
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
           
                  <li>제공되는 예측은 오직 정보 제공 목적입니다</li>
                  <li>베팅 거래를 수락하거나 처리하지 않습니다</li>
                 
                  <li>귀하의 지역 도박 관련 법률을 준수할 책임은 사용자에게 있습니다</li>
                  <li>도박은 중독성이 있을 수 있으니 신중하게 이용하시기 바랍니다</li>
                </ul>
              </div>
            </section>

         

            {/* 준거법 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">7. 준거법</h2>
              <p className="text-gray-300">
                본 약관은 대한민국 법률에 따라 규율되고 해석됩니다.
              </p>
            </section>

            {/* 약관 변경 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">8. 약관의 변경</h2>
              <p className="text-gray-300">
                당사는 언제든지 본 약관을 수정하거나 변경할 수 있습니다. 
                중요한 변경사항이 있을 경우 본 페이지에 새로운 약관을 게시하고 
                "최종 수정일"을 업데이트하여 공지합니다.
              </p>
            </section>

            {/* 연락처 */}
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">9. 문의</h2>
              <p className="text-gray-300 mb-3">
                본 이용약관에 대한 질문이 있으시면 다음으로 연락 주시기 바랍니다:
              </p>
              <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-700">
                <p className="text-gray-300">
                  이메일: <a href="mailto:trikilab2025@gmail.com" className="text-blue-400 hover:text-blue-300">trikilab2025@gmail.com</a>
                </p>
              </div>
            </section>

            {/* 약관 동의 */}
            <section className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-white">약관 동의</h2>
              <p className="text-gray-300">
                Trend Soccer를 이용함으로써 귀하는 본 이용약관을 읽고 이해했으며, 
                이에 구속되는 것에 동의함을 확인합니다.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}