'use client'

import { useState } from 'react'
import type { Metadata } from 'next'

// Note: Metadata should be in a separate layout.tsx or use generateMetadata for client components
// export const metadata: Metadata = {
//   title: '이용약관 - Trend Soccer',
//   description: 'Trend Soccer 서비스 이용약관',
// }

export default function TermsPage() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko')

  const content = {
    ko: {
      title: '이용약관',
      lastUpdated: '최종 수정일: 2025년 11월 6일',
      sections: [
        {
          title: '1. 약관 동의',
          content: 'Trend Soccer 서비스를 이용함으로써 본 이용약관에 동의하게 됩니다. 약관의 일부 또는 전부에 동의하지 않는 경우 서비스를 이용할 수 없습니다.',
        },
        {
          title: '2. 서비스 이용',
          subsections: [
            {
              subtitle: '2.1 허용되는 사용',
              items: [
                '축구 경기 예측 및 분석 정보 열람',
                '실시간 경기 데이터 및 통계 확인',
                '개인적, 비상업적 목적의 사용',
              ],
            },
            {
              subtitle: '2.2 금지되는 사용',
              items: [
                '불법적인 목적으로 서비스 사용',
                '서비스에 대한 무단 접근 시도',
                '서비스 방해 또는 중단 행위',
                '자동화 도구(봇, 크롤러 등)를 이용한 접근',
                '서비스 콘텐츠의 상업적 재판매',
              ],
            },
          ],
        },
        {
          title: '3. 콘텐츠 및 정확성',
          content: 'Trend Soccer에서 제공하는 정보는 참고용으로만 제공됩니다. 저희는 정확한 정보 제공을 위해 노력하지만, 다음 사항에 대해 보증하지 않습니다:',
          items: [
            '예측의 정확성, 완전성, 신뢰성',
            '서비스의 지속적인 가용성',
            '오류 또는 버그의 부재',
          ],
          warning: {
            label: '중요:',
            text: '본 서비스의 예측은 통계 분석을 기반으로 하며, 베팅이나 재정적 결정의 유일한 근거로 사용되어서는 안 됩니다. 예측을 바탕으로 발생한 손실에 대해 책임지지 않습니다.',
          },
        },
        {
          title: '4. 외부 링크',
          content: '본 서비스는 당사가 소유하거나 통제하지 않는 제3자 웹사이트 링크를 포함할 수 있습니다. 제3자 웹사이트의 콘텐츠, 개인정보 보호정책 또는 관행에 대해 책임을 지지 않습니다.',
        },
        {
          title: '5. 책임의 제한',
          content: '법률이 허용하는 최대 범위 내에서, Trend Soccer는 다음과 같은 손해에 대해 책임을 지지 않습니다:',
          items: [
            '이익 또는 수익의 손실',
            '데이터 손실',
            '사업 기회의 손실',
            '간접적, 부수적, 특별, 결과적 손해',
          ],
        },
        {
          title: '6. 도박 및 베팅 관련 면책',
          isWarning: true,
          warningLabel: '중요한 고지사항:',
          items: [
            '제공되는 예측은 오직 정보 제공 목적입니다',
            '베팅 거래를 수락하거나 처리하지 않습니다',
            '귀하의 지역 도박 관련 법률을 준수할 책임은 사용자에게 있습니다',
            '도박은 중독성이 있을 수 있으니 신중하게 이용하시기 바랍니다',
          ],
        },
        {
          title: '7. 준거법',
          content: '본 약관은 대한민국 법률에 따라 규율되고 해석됩니다.',
        },
        {
          title: '8. 약관의 변경',
          content: '당사는 언제든지 본 약관을 수정하거나 변경할 수 있습니다. 중요한 변경사항이 있을 경우 본 페이지에 새로운 약관을 게시하고 "최종 수정일"을 업데이트하여 공지합니다.',
        },
        {
          title: '9. 문의',
          content: '본 이용약관에 대한 질문이 있으시면 다음으로 연락 주시기 바랍니다:',
          email: 'trikilab2025@gmail.com',
        },
      ],
      agreement: {
        title: '약관 동의',
        text: 'Trend Soccer를 이용함으로써 귀하는 본 이용약관을 읽고 이해했으며, 이에 구속되는 것에 동의함을 확인합니다.',
      },
    },
    en: {
      title: 'Terms of Service',
      lastUpdated: 'Last Updated: November 6, 2025',
      sections: [
        {
          title: '1. Agreement to Terms',
          content: 'By using Trend Soccer services, you agree to these Terms of Service. If you do not agree to any part of these terms, you may not use our services.',
        },
        {
          title: '2. Use of Service',
          subsections: [
            {
              subtitle: '2.1 Permitted Use',
              items: [
                'Viewing football match predictions and analysis',
                'Accessing real-time match data and statistics',
                'Personal, non-commercial use',
              ],
            },
            {
              subtitle: '2.2 Prohibited Use',
              items: [
                'Using the service for illegal purposes',
                'Attempting unauthorized access to the service',
                'Interfering with or disrupting the service',
                'Accessing through automated tools (bots, crawlers, etc.)',
                'Commercial resale of service content',
              ],
            },
          ],
        },
        {
          title: '3. Content and Accuracy',
          content: 'Information provided by Trend Soccer is for reference purposes only. While we strive to provide accurate information, we do not guarantee:',
          items: [
            'Accuracy, completeness, or reliability of predictions',
            'Continuous availability of the service',
            'Absence of errors or bugs',
          ],
          warning: {
            label: 'Important:',
            text: 'Our predictions are based on statistical analysis and should not be used as the sole basis for betting or financial decisions. We are not responsible for any losses incurred based on our predictions.',
          },
        },
        {
          title: '4. External Links',
          content: 'Our service may contain links to third-party websites that we do not own or control. We are not responsible for the content, privacy policies, or practices of any third-party websites.',
        },
        {
          title: '5. Limitation of Liability',
          content: 'To the maximum extent permitted by law, Trend Soccer shall not be liable for:',
          items: [
            'Loss of profits or revenue',
            'Loss of data',
            'Loss of business opportunities',
            'Indirect, incidental, special, or consequential damages',
          ],
        },
        {
          title: '6. Gambling and Betting Disclaimer',
          isWarning: true,
          warningLabel: 'Important Notice:',
          items: [
            'Predictions provided are for informational purposes only',
            'We do not accept or process betting transactions',
            'You are responsible for complying with local gambling laws in your jurisdiction',
            'Gambling can be addictive - please gamble responsibly',
          ],
        },
        {
          title: '7. Governing Law',
          content: 'These terms shall be governed by and construed in accordance with the laws of the Republic of Korea.',
        },
        {
          title: '8. Changes to Terms',
          content: 'We reserve the right to modify or replace these terms at any time. If we make material changes, we will notify you by posting the new terms on this page and updating the "Last Updated" date.',
        },
        {
          title: '9. Contact Us',
          content: 'If you have any questions about these Terms of Service, please contact us at:',
          email: 'trikilab2025@gmail.com',
        },
      ],
      agreement: {
        title: 'Agreement',
        text: 'By using Trend Soccer, you acknowledge that you have read and understood these Terms of Service and agree to be bound by them.',
      },
    },
  }

  const t = content[lang]

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Language Toggle */}
        <div className="flex justify-end mb-6">
          <div className="inline-flex rounded-lg border border-gray-700 p-1 bg-[#1a1a1a]">
            <button
              onClick={() => setLang('ko')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                lang === 'ko'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              한국어
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                lang === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t.title}</h1>
          <p className="text-gray-400">{t.lastUpdated}</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none">
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800 space-y-8">
            {t.sections.map((section, index) => (
              <section key={index}>
                <h2 className="text-2xl font-bold mb-4 text-white">{section.title}</h2>

                {section.content && (
                  <p className="text-gray-300 leading-relaxed mb-3">{section.content}</p>
                )}

                {section.subsections && section.subsections.map((sub, subIndex) => (
                  <div key={subIndex} className={subIndex > 0 ? 'mt-6' : ''}>
                    <h3 className="text-xl font-semibold mb-3 text-blue-400">{sub.subtitle}</h3>
                    <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                      {sub.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}

                {section.items && !section.isWarning && (
                  <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                    {section.items.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                )}

                {section.warning && (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mt-4">
                    <p className="text-gray-300">
                      <strong className="text-blue-400">{section.warning.label}</strong>{' '}
                      {section.warning.text}
                    </p>
                  </div>
                )}

                {section.isWarning && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
                    <p className="text-gray-300 mb-4">
                      <strong className="text-red-400">{section.warningLabel}</strong>
                    </p>
                    <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                      {section.items?.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.email && (
                  <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-700 mt-3">
                    <p className="text-gray-300">
                      {lang === 'ko' ? '이메일: ' : 'Email: '}
                      <a
                        href={`mailto:${section.email}`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {section.email}
                      </a>
                    </p>
                  </div>
                )}
              </section>
            ))}

            {/* Agreement Section */}
            <section className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-white">{t.agreement.title}</h2>
              <p className="text-gray-300">{t.agreement.text}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}