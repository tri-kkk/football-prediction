'use client'

import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-1">
      <button
        onClick={() => setLanguage('ko')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          language === 'ko'
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }`}
      >
        <img 
          src="https://flagcdn.com/w20/kr.png" 
          srcSet="https://flagcdn.com/w40/kr.png 2x"
          alt="KR"
          className="w-5 h-4 object-cover rounded-sm"
        />
        <span className="hidden sm:inline">한국어</span>
        <span className="sm:hidden">KO</span>
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          language === 'en'
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
        }`}
      >
        <img 
          src="https://flagcdn.com/w20/gb.png" 
          srcSet="https://flagcdn.com/w40/gb.png 2x"
          alt="GB"
          className="w-5 h-4 object-cover rounded-sm"
        />
        <span className="hidden sm:inline">English</span>
        <span className="sm:hidden">EN</span>
      </button>
    </div>
  )
}