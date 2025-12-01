'use client'

import { useLanguage } from '../contexts/LanguageContext'

export default function AboutPage() {
  const { language } = useLanguage()

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {language === 'ko' ? 'Trend Soccer 소개' : 'About Trend Soccer'}
          </h1>
          <p className="text-xl text-gray-400">
            {language === 'ko' 
              ? '실시간 확률 기반 축구 경기 예측 분석 플랫폼'
              : 'Real-time probability-based football match prediction platform'
            }
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {/* Mission */}
          <section className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">🎯</span>
              <h2 className="text-2xl font-bold">
                {language === 'ko' ? '우리의 미션' : 'Our Mission'}
              </h2>
            </div>
            <p className="text-gray-300 leading-relaxed mb-4">
              {language === 'ko' 
                ? 'Trend Soccer는 축구 팬들에게 데이터 기반의 정확한 경기 분석을 제공하여, 더 나은 의사결정을 돕는 것을 목표로 합니다.'
                : 'Trend Soccer aims to provide football fans with accurate data-driven match analysis to help them make better decisions.'
              }
            </p>
            <p className="text-gray-300 leading-relaxed">
              {language === 'ko'
                ? 'Trend Soccer는 실시간 데이터와 고급 분석 알고리즘을 활용하여 경기 결과를 예측하고, 사용자들이 경기를 더 깊이 이해할 수 있도록 돕습니다.'
                : 'We utilize real-time data and advanced analytics algorithms to predict match outcomes and help users understand the game more deeply.'
              }
            </p>
          </section>

          {/* What We Offer */}
          <section className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">⚽</span>
              <h2 className="text-2xl font-bold">
                {language === 'ko' ? '제공 서비스' : 'Our Services'}
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  {language === 'ko' ? '실시간 승률 분석' : 'Real-time Win Rate Analysis'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ko'
                    ? '경기 시작 전부터 진행 중까지 실시간으로 업데이트되는 승률 데이터를 제공합니다.'
                    : 'We provide real-time updated win rate data from before the match starts to during the game.'
                  }
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  {language === 'ko' ? '24시간 트렌드 차트' : '24-Hour Trend Charts'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ko'
                    ? '지난 24시간 동안의 승률 변화를 시각화하여 트렌드를 한눈에 파악할 수 있습니다.'
                    : 'Visualize win rate changes over the past 24 hours to understand trends at a glance.'
                  }
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  {language === 'ko' ? '주요 리그 커버리지' : 'Major League Coverage'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ko'
                    ? '프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 챔피언스리그 등 주요 리그를 모두 지원합니다.'
                    : 'We cover all major leagues including Premier League, La Liga, Bundesliga, Serie A, Ligue 1, and Champions League.'
                  }
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-2">
                  {language === 'ko' ? '직관적인 인터페이스' : 'Intuitive Interface'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {language === 'ko'
                    ? '복잡한 데이터를 쉽고 아름답게 표현하여 누구나 쉽게 이해할 수 있습니다.'
                    : 'We present complex data in a simple and beautiful way that anyone can easily understand.'
                  }
                </p>
              </div>
            </div>
          </section>

          {/* Contact CTA */}
          <section className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-blue-500/30 text-center">
            <h2 className="text-2xl font-bold mb-4">
              {language === 'ko' ? '문의하기' : 'Contact Us'}
            </h2>
            <p className="text-gray-300 mb-6">
              {language === 'ko'
                ? '질문이나 제안사항이 있으시면 언제든지 연락해주세요.'
                : 'If you have any questions or suggestions, please feel free to contact us.'
              }
            </p>
            <a 
              href="/contact"
              className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              {language === 'ko' ? '문의하기' : 'Contact Us'}
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}