'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'
import Image from 'next/image'

export default function SportSwitch() {
  const router = useRouter()
  const pathname = usePathname()
  const { language } = useLanguage()
  const [showModal, setShowModal] = useState(false)
  
  const isBaseball = pathname.startsWith('/baseball')

  // API-Football 리그 정보
  const leagues = [
    {
      id: 5,
      name: 'KBO',
      nameKo: '한국 프로야구',
      nameEn: 'Korean Baseball',
      flag: '🇰🇷'
    },
    {
      id: 1,
      name: 'MLB',
      nameKo: '메이저리그',
      nameEn: 'Major League',
      flag: '🇺🇸'
    },
    {
      id: 2,
      name: 'NPB',
      nameKo: '일본 프로야구',
      nameEn: 'Nippon Baseball',
      flag: '🇯🇵'
    },
    {
      id: 29,
      name: 'CPBL',
      nameKo: '대만 프로야구',
      nameEn: 'Chinese Baseball',
      flag: '🇹🇼'
    }
  ]

  return (
    <>
      {/* 데스크톱 버전 */}
      <div className="hidden sm:flex items-center gap-2 p-1 bg-gray-900/50 rounded-xl backdrop-blur-sm border border-gray-800">
        <button
          onClick={() => router.push('/')}
          className={`
            relative px-4 py-2 rounded-lg font-medium transition-all duration-300 overflow-hidden
            ${!isBaseball 
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/50' 
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
            }
          `}
        >
          {!isBaseball && (
            <div className="absolute inset-0 bg-emerald-400/20 blur-xl animate-pulse" />
          )}
          <span className="relative flex items-center gap-2 text-sm">
            <span className={`text-lg ${!isBaseball ? 'animate-bounce-slow' : ''}`}>⚽</span>
            <span>{language === 'ko' ? '축구' : 'Football'}</span>
          </span>
        </button>

        <button
          onClick={() => setShowModal(true)}
          className="relative px-4 py-2 rounded-lg font-medium transition-all duration-300 text-gray-400 hover:text-gray-300 hover:bg-gray-800/50 group"
        >
          <span className="relative flex items-center gap-2 text-sm">
            <span className="text-lg group-hover:scale-110 transition-transform">⚾</span>
            <span>{language === 'ko' ? '야구' : 'Baseball'}</span>
            <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-blue-500/20 text-blue-400 rounded animate-pulse">
              SOON
            </span>
          </span>
        </button>
      </div>

      {/* 모바일 버전 */}
      <div className="flex sm:hidden items-center gap-1 p-1 bg-gray-900/50 rounded-lg backdrop-blur-sm">
        <button
          onClick={() => router.push('/')}
          className={`
            relative px-3 py-1.5 rounded-md transition-all duration-300 overflow-hidden
            ${!isBaseball 
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/50' 
              : 'text-gray-400'
            }
          `}
        >
          {!isBaseball && (
            <div className="absolute inset-0 bg-emerald-400/20 blur-lg animate-pulse" />
          )}
          <span className="relative text-base">⚽</span>
        </button>

        <button
          onClick={() => setShowModal(true)}
          className="relative px-3 py-1.5 rounded-md transition-all duration-300 text-gray-400 hover:bg-gray-800/50"
        >
          <span className="relative text-base">⚾</span>
        </button>
      </div>

      {/* Coming Soon 모달 */}
      {showModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowModal(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          
          <div 
            className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f0f] rounded-3xl p-8 max-w-2xl w-full border border-blue-500/20 shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/5 rounded-3xl blur-3xl" />
            
            <div className="relative space-y-6">
              
              {/* 타이틀 섹션 */}
              <div className="text-center space-y-3">
                <h2 className="text-4xl font-bold">
                  <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                    Baseball
                  </span>
                </h2>
                
                <p className="text-xl font-semibold text-white">
                  {language === 'ko' ? '곧 오픈됩니다' : 'Coming Soon'}
                </p>
                
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  {language === 'ko' 
                    ? 'AI 기반 야구 예측 분석 서비스를 준비하고 있습니다' 
                    : 'Preparing AI-powered baseball prediction service'}
                </p>
              </div>

              {/* 리그 정보 */}
              <div className="bg-gradient-to-r from-blue-500/5 to-blue-600/5 border border-blue-500/10 rounded-2xl p-6">
                <p className="text-xs uppercase tracking-wider text-blue-400 mb-5 font-semibold text-center">
                  {language === 'ko' ? '지원 예정 리그' : 'Upcoming Leagues'}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {leagues.map((league) => (
                    <div 
                      key={league.id}
                      className="group relative bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-blue-500/30 rounded-xl p-5 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/10"
                    >
                      {/* 로고 이미지 */}
                      <div className="flex items-center justify-center mb-3 h-16">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <Image
                            src={`https://media.api-sports.io/baseball/leagues/${league.id}.png`}
                            alt={league.name}
                            width={64}
                            height={64}
                            className="object-contain opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement
                              target.style.display = 'none'
                              const fallback = target.nextElementSibling as HTMLElement
                              if (fallback) fallback.style.display = 'block'
                            }}
                          />
                          <div className="hidden text-5xl">
                            {league.flag}
                          </div>
                        </div>
                      </div>
                      
                      {/* 리그 정보 */}
                      <div className="relative text-center space-y-1">
                        <p className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                          {league.name}
                        </p>
                        <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                          {language === 'ko' ? league.nameKo : league.nameEn}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 확인 버튼 */}
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 text-base"
              >
                {language === 'ko' ? '확인' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}