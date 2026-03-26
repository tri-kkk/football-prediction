'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useLanguage } from '../contexts/LanguageContext'

export default function SportSwitch() {
  const router = useRouter()
  const pathname = usePathname()
  const { language } = useLanguage()
  const isBaseball = pathname.startsWith('/baseball')

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
          onClick={() => router.push('/baseball')}
          className={`
            relative px-4 py-2 rounded-lg font-medium transition-all duration-300 overflow-hidden
            ${isBaseball 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50' 
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
            }
          `}
        >
          {isBaseball && (
            <div className="absolute inset-0 bg-blue-400/20 blur-xl animate-pulse" />
          )}
          <span className="relative flex items-center gap-2 text-sm">
            <span className="text-lg">⚾</span>
            <span>{language === 'ko' ? '야구' : 'Baseball'}</span>
            <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-blue-500 text-white rounded font-bold">
              OPEN
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
          onClick={() => router.push('/baseball')}
          className={`
            relative px-3 py-1.5 rounded-md transition-all duration-300 overflow-hidden
            ${isBaseball 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-md shadow-blue-500/50' 
              : 'text-gray-400 hover:bg-gray-800/50'
            }
          `}
        >
          {isBaseball && (
            <div className="absolute inset-0 bg-blue-400/20 blur-lg animate-pulse" />
          )}
          <span className="relative flex items-center gap-1 text-base">
            ⚾
            <span className="text-[8px] font-bold bg-blue-500 text-white px-1 py-0.5 rounded leading-none animate-pulse">
              OPEN
            </span>
          </span>
        </button>
      </div>

    </>
  )
}