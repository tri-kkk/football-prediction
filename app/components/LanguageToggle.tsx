// app/components/LanguageToggle.tsx
'use client'

import { useState, useEffect } from 'react'

export default function LanguageToggle() {
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')

  // 브라우저 언어 자동 감지
  useEffect(() => {
    const browserLang = navigator.language.toLowerCase()
    const savedLang = localStorage.getItem('language') as 'ko' | 'en' | null
    
    if (savedLang) {
      setLanguage(savedLang)
    } else if (browserLang.startsWith('ko')) {
      setLanguage('ko')
    } else {
      setLanguage('en')
    }
  }, [])

  // 언어 변경
  const changeLanguage = (lang: 'ko' | 'en') => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
    
    // 전체 앱에 언어 변경 반영하기 위해 CustomEvent 발송
    window.dispatchEvent(new CustomEvent('languageChange', { detail: lang }))
    
    // 또는 페이지 새로고침 (간단한 방법)
    window.location.reload()
  }

  return (
    <div className="flex items-center gap-1 bg-[#0f0f0f] rounded-lg p-1 border border-gray-800">
      <button
        onClick={() => changeLanguage('ko')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          language === 'ko'
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
        title="한국어"
      >
        🇰🇷
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          language === 'en'
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
        title="English"
      >
        🇺🇸
      </button>
    </div>
  )
}
